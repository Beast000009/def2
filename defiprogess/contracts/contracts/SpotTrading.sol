// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title SpotTrading
 * @dev A contract that allows users to create and fulfill buy/sell orders for tokens
 */
contract SpotTrading is Ownable, ReentrancyGuard {
    // Order structure
    struct Order {
        uint256 id;
        address trader;
        address tokenAddress;
        address baseTokenAddress;
        uint256 amount;
        uint256 price;
        uint256 filled;
        uint256 timestamp;
        bool isBuyOrder;
        bool isActive;
    }
    
    // Mapping of order ID to Order
    mapping(uint256 => Order) public orders;
    
    // Mapping of token address to active buy order IDs
    mapping(address => uint256[]) public activeBuyOrders;
    
    // Mapping of token address to active sell order IDs
    mapping(address => uint256[]) public activeSellOrders;
    
    // Mapping of supported tokens
    mapping(address => bool) public supportedTokens;
    
    // Trading fee percentage (in basis points, e.g., 25 = 0.25%)
    uint256 public feePercentage = 25;
    
    // 24-hour volume tracking (token => baseToken => volume)
    mapping(address => mapping(address => uint256)) public volumeLast24Hours;
    
    // Time of last volume update
    mapping(address => mapping(address => uint256)) public lastVolumeUpdate;
    
    // Current order ID
    uint256 private nextOrderId = 1;
    
    // Events
    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);
    event OrderCreated(
        uint256 indexed orderId,
        address indexed trader,
        address indexed tokenAddress,
        address baseTokenAddress,
        uint256 amount,
        uint256 price,
        bool isBuyOrder
    );
    event OrderFilled(
        uint256 indexed orderId,
        address indexed trader,
        address indexed tokenAddress,
        address baseTokenAddress,
        uint256 amount,
        uint256 price,
        bool isBuyOrder,
        bool fullyFilled
    );
    event OrderCancelled(uint256 indexed orderId);
    event FeePercentageUpdated(uint256 oldFee, uint256 newFee);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Add a token to the list of supported tokens
     * @param token Address of the token to add
     */
    function addSupportedToken(address token) external onlyOwner {
        require(token != address(0), "Invalid token address");
        require(!supportedTokens[token], "Token already supported");
        
        supportedTokens[token] = true;
        emit TokenAdded(token);
    }
    
    /**
     * @dev Remove a token from the list of supported tokens
     * @param token Address of the token to remove
     */
    function removeSupportedToken(address token) external onlyOwner {
        require(supportedTokens[token], "Token not supported");
        
        supportedTokens[token] = false;
        emit TokenRemoved(token);
    }
    
    /**
     * @dev Set the fee percentage
     * @param newFeePercentage New fee percentage (in basis points, e.g., 25 = 0.25%)
     */
    function setFeePercentage(uint256 newFeePercentage) external onlyOwner {
        require(newFeePercentage <= 500, "Fee cannot exceed 5%");
        
        uint256 oldFee = feePercentage;
        feePercentage = newFeePercentage;
        emit FeePercentageUpdated(oldFee, newFeePercentage);
    }
    
    /**
     * @dev Get an order by ID
     * @param orderId ID of the order to retrieve
     * @return Order information
     */
    function getOrder(uint256 orderId) external view returns (Order memory) {
        require(orderId > 0 && orderId < nextOrderId, "Invalid order ID");
        return orders[orderId];
    }
    
    /**
     * @dev Get all active buy orders for a token
     * @param tokenAddress Address of the token
     * @return Array of order IDs
     */
    function getActiveBuyOrders(address tokenAddress) external view returns (uint256[] memory) {
        return activeBuyOrders[tokenAddress];
    }
    
    /**
     * @dev Get all active sell orders for a token
     * @param tokenAddress Address of the token
     * @return Array of order IDs
     */
    function getActiveSellOrders(address tokenAddress) external view returns (uint256[] memory) {
        return activeSellOrders[tokenAddress];
    }
    
    /**
     * @dev Get the 24-hour trading volume for a token pair
     * @param tokenAddress Address of the token
     * @param baseTokenAddress Address of the base token
     * @return 24-hour volume in base token units
     */
    function get24HourVolume(address tokenAddress, address baseTokenAddress) external view returns (uint256) {
        // If no update in 24 hours, reset
        if (block.timestamp - lastVolumeUpdate[tokenAddress][baseTokenAddress] > 24 hours) {
            return 0;
        }
        
        return volumeLast24Hours[tokenAddress][baseTokenAddress];
    }
    
    /**
     * @dev Create a buy order
     * @param tokenAddress Address of the token to buy
     * @param baseTokenAddress Address of the token to pay with
     * @param amount Amount of tokens to buy
     * @param price Price per token (in base token units)
     * @return Order ID
     */
    function createBuyOrder(
        address tokenAddress,
        address baseTokenAddress,
        uint256 amount,
        uint256 price
    ) external nonReentrant returns (uint256) {
        require(supportedTokens[tokenAddress], "Token not supported");
        require(supportedTokens[baseTokenAddress], "Base token not supported");
        require(amount > 0, "Amount must be greater than 0");
        require(price > 0, "Price must be greater than 0");
        
        // Calculate total cost in base token
        uint256 totalCost = (amount * price) / 1e18;
        require(totalCost > 0, "Total cost too small");
        
        // Transfer base tokens from buyer to contract
        IERC20(baseTokenAddress).transferFrom(msg.sender, address(this), totalCost);
        
        // Create the order
        uint256 orderId = nextOrderId++;
        
        Order memory newOrder = Order({
            id: orderId,
            trader: msg.sender,
            tokenAddress: tokenAddress,
            baseTokenAddress: baseTokenAddress,
            amount: amount,
            price: price,
            filled: 0,
            timestamp: block.timestamp,
            isBuyOrder: true,
            isActive: true
        });
        
        orders[orderId] = newOrder;
        
        // Add to active buy orders
        activeBuyOrders[tokenAddress].push(orderId);
        
        // Try to match with existing sell orders
        _matchBuyOrder(orderId);
        
        emit OrderCreated(
            orderId,
            msg.sender,
            tokenAddress,
            baseTokenAddress,
            amount,
            price,
            true
        );
        
        return orderId;
    }
    
    /**
     * @dev Create a sell order
     * @param tokenAddress Address of the token to sell
     * @param baseTokenAddress Address of the token to receive
     * @param amount Amount of tokens to sell
     * @param price Price per token (in base token units)
     * @return Order ID
     */
    function createSellOrder(
        address tokenAddress,
        address baseTokenAddress,
        uint256 amount,
        uint256 price
    ) external nonReentrant returns (uint256) {
        require(supportedTokens[tokenAddress], "Token not supported");
        require(supportedTokens[baseTokenAddress], "Base token not supported");
        require(amount > 0, "Amount must be greater than 0");
        require(price > 0, "Price must be greater than 0");
        
        // Transfer tokens from seller to contract
        IERC20(tokenAddress).transferFrom(msg.sender, address(this), amount);
        
        // Create the order
        uint256 orderId = nextOrderId++;
        
        Order memory newOrder = Order({
            id: orderId,
            trader: msg.sender,
            tokenAddress: tokenAddress,
            baseTokenAddress: baseTokenAddress,
            amount: amount,
            price: price,
            filled: 0,
            timestamp: block.timestamp,
            isBuyOrder: false,
            isActive: true
        });
        
        orders[orderId] = newOrder;
        
        // Add to active sell orders
        activeSellOrders[tokenAddress].push(orderId);
        
        // Try to match with existing buy orders
        _matchSellOrder(orderId);
        
        emit OrderCreated(
            orderId,
            msg.sender,
            tokenAddress,
            baseTokenAddress,
            amount,
            price,
            false
        );
        
        return orderId;
    }
    
    /**
     * @dev Cancel an order
     * @param orderId ID of the order to cancel
     */
    function cancelOrder(uint256 orderId) external nonReentrant {
        require(orderId > 0 && orderId < nextOrderId, "Invalid order ID");
        Order storage order = orders[orderId];
        
        require(order.isActive, "Order not active");
        require(order.trader == msg.sender || msg.sender == owner(), "Not authorized");
        
        order.isActive = false;
        
        // Remove from active orders
        if (order.isBuyOrder) {
            _removeFromActiveBuyOrders(order.tokenAddress, orderId);
            
            // Refund remaining base tokens
            uint256 remainingAmount = order.amount - order.filled;
            if (remainingAmount > 0) {
                uint256 refundAmount = (remainingAmount * order.price) / 1e18;
                IERC20(order.baseTokenAddress).transfer(order.trader, refundAmount);
            }
        } else {
            _removeFromActiveSellOrders(order.tokenAddress, orderId);
            
            // Refund remaining tokens
            uint256 remainingAmount = order.amount - order.filled;
            if (remainingAmount > 0) {
                IERC20(order.tokenAddress).transfer(order.trader, remainingAmount);
            }
        }
        
        emit OrderCancelled(orderId);
    }
    
    /**
     * @dev Match a buy order with existing sell orders
     * @param buyOrderId ID of the buy order to match
     */
    function _matchBuyOrder(uint256 buyOrderId) internal {
        Order storage buyOrder = orders[buyOrderId];
        address tokenAddress = buyOrder.tokenAddress;
        address baseTokenAddress = buyOrder.baseTokenAddress;
        
        // Loop through active sell orders for the token
        uint256[] storage sellOrderIds = activeSellOrders[tokenAddress];
        
        for (uint256 i = 0; i < sellOrderIds.length && buyOrder.isActive; i++) {
            uint256 sellOrderId = sellOrderIds[i];
            Order storage sellOrder = orders[sellOrderId];
            
            // Skip if not active or if base token doesn't match
            if (!sellOrder.isActive || sellOrder.baseTokenAddress != baseTokenAddress) {
                continue;
            }
            
            // Match if sell price <= buy price
            if (sellOrder.price <= buyOrder.price) {
                _executeMatch(buyOrder, sellOrder);
                
                // Remove filled orders from active lists
                if (!buyOrder.isActive) {
                    _removeFromActiveBuyOrders(tokenAddress, buyOrderId);
                }
                
                if (!sellOrder.isActive) {
                    // Careful with array indices when removing elements
                    // Since we're modifying the array we're iterating over, 
                    // we need to decrement the index
                    _removeFromActiveSellOrders(tokenAddress, sellOrderId);
                    i--;
                }
                
                // Update 24-hour volume
                uint256 matchedAmountInBaseToken = (sellOrder.price * buyOrder.amount) / 1e18;
                _updateVolume(tokenAddress, baseTokenAddress, matchedAmountInBaseToken);
            }
        }
    }
    
    /**
     * @dev Match a sell order with existing buy orders
     * @param sellOrderId ID of the sell order to match
     */
    function _matchSellOrder(uint256 sellOrderId) internal {
        Order storage sellOrder = orders[sellOrderId];
        address tokenAddress = sellOrder.tokenAddress;
        address baseTokenAddress = sellOrder.baseTokenAddress;
        
        // Loop through active buy orders for the token
        uint256[] storage buyOrderIds = activeBuyOrders[tokenAddress];
        
        for (uint256 i = 0; i < buyOrderIds.length && sellOrder.isActive; i++) {
            uint256 buyOrderId = buyOrderIds[i];
            Order storage buyOrder = orders[buyOrderId];
            
            // Skip if not active or if base token doesn't match
            if (!buyOrder.isActive || buyOrder.baseTokenAddress != baseTokenAddress) {
                continue;
            }
            
            // Match if buy price >= sell price
            if (buyOrder.price >= sellOrder.price) {
                _executeMatch(buyOrder, sellOrder);
                
                // Remove filled orders from active lists
                if (!buyOrder.isActive) {
                    // Careful with array indices when removing elements
                    _removeFromActiveBuyOrders(tokenAddress, buyOrderId);
                    i--;
                }
                
                if (!sellOrder.isActive) {
                    _removeFromActiveSellOrders(tokenAddress, sellOrderId);
                }
                
                // Update 24-hour volume
                uint256 matchedAmountInBaseToken = (sellOrder.price * buyOrder.amount) / 1e18;
                _updateVolume(tokenAddress, baseTokenAddress, matchedAmountInBaseToken);
            }
        }
    }
    
    /**
     * @dev Execute a match between a buy order and a sell order
     * @param buyOrder The buy order
     * @param sellOrder The sell order
     */
    function _executeMatch(Order storage buyOrder, Order storage sellOrder) internal {
        // Calculate how much can be matched
        uint256 buyRemaining = buyOrder.amount - buyOrder.filled;
        uint256 sellRemaining = sellOrder.amount - sellOrder.filled;
        uint256 matchAmount = buyRemaining < sellRemaining ? buyRemaining : sellRemaining;
        
        if (matchAmount == 0) {
            return;
        }
        
        // Calculate payment amount based on sell price (taker price)
        uint256 paymentAmount = (matchAmount * sellOrder.price) / 1e18;
        uint256 fee = (paymentAmount * feePercentage) / 10000;
        uint256 sellerReceives = paymentAmount - fee;
        
        // Update filled amounts
        buyOrder.filled += matchAmount;
        sellOrder.filled += matchAmount;
        
        // Check if orders are fully filled
        bool buyFullyFilled = buyOrder.filled == buyOrder.amount;
        bool sellFullyFilled = sellOrder.filled == sellOrder.amount;
        
        // Set orders inactive if fully filled
        if (buyFullyFilled) {
            buyOrder.isActive = false;
        }
        
        if (sellFullyFilled) {
            sellOrder.isActive = false;
        }
        
        // Calculate refund for buyer if price difference
        uint256 buyerPaid = (matchAmount * buyOrder.price) / 1e18;
        uint256 buyerRefund = 0;
        
        if (buyerPaid > paymentAmount) {
            buyerRefund = buyerPaid - paymentAmount;
        }
        
        // Transfer tokens to buyer
        IERC20(sellOrder.tokenAddress).transfer(buyOrder.trader, matchAmount);
        
        // Transfer payment to seller
        IERC20(buyOrder.baseTokenAddress).transfer(sellOrder.trader, sellerReceives);
        
        // Transfer fee to contract owner
        if (fee > 0) {
            IERC20(buyOrder.baseTokenAddress).transfer(owner(), fee);
        }
        
        // Refund excess to buyer if any
        if (buyerRefund > 0) {
            IERC20(buyOrder.baseTokenAddress).transfer(buyOrder.trader, buyerRefund);
        }
        
        // Emit events
        emit OrderFilled(
            buyOrder.id,
            buyOrder.trader,
            buyOrder.tokenAddress,
            buyOrder.baseTokenAddress,
            matchAmount,
            sellOrder.price, // Use the executed price
            true,
            buyFullyFilled
        );
        
        emit OrderFilled(
            sellOrder.id,
            sellOrder.trader,
            sellOrder.tokenAddress,
            sellOrder.baseTokenAddress,
            matchAmount,
            sellOrder.price,
            false,
            sellFullyFilled
        );
    }
    
    /**
     * @dev Remove an order ID from the active buy orders array
     * @param tokenAddress Address of the token
     * @param orderId ID of the order to remove
     */
    function _removeFromActiveBuyOrders(address tokenAddress, uint256 orderId) internal {
        uint256[] storage orderIds = activeBuyOrders[tokenAddress];
        for (uint256 i = 0; i < orderIds.length; i++) {
            if (orderIds[i] == orderId) {
                // Swap with the last element and pop
                orderIds[i] = orderIds[orderIds.length - 1];
                orderIds.pop();
                break;
            }
        }
    }
    
    /**
     * @dev Remove an order ID from the active sell orders array
     * @param tokenAddress Address of the token
     * @param orderId ID of the order to remove
     */
    function _removeFromActiveSellOrders(address tokenAddress, uint256 orderId) internal {
        uint256[] storage orderIds = activeSellOrders[tokenAddress];
        for (uint256 i = 0; i < orderIds.length; i++) {
            if (orderIds[i] == orderId) {
                // Swap with the last element and pop
                orderIds[i] = orderIds[orderIds.length - 1];
                orderIds.pop();
                break;
            }
        }
    }
    
    /**
     * @dev Update the 24-hour volume for a token pair
     * @param tokenAddress Address of the token
     * @param baseTokenAddress Address of the base token
     * @param amount Amount to add to the volume (in base token units)
     */
    function _updateVolume(address tokenAddress, address baseTokenAddress, uint256 amount) internal {
        uint256 lastUpdate = lastVolumeUpdate[tokenAddress][baseTokenAddress];
        
        // If last update was more than 24 hours ago, reset volume
        if (block.timestamp - lastUpdate > 24 hours) {
            volumeLast24Hours[tokenAddress][baseTokenAddress] = amount;
        } else {
            volumeLast24Hours[tokenAddress][baseTokenAddress] += amount;
        }
        
        lastVolumeUpdate[tokenAddress][baseTokenAddress] = block.timestamp;
    }
    
    /**
     * @dev Withdraw tokens from the contract (for emergency or fee collection)
     * @param token Address of the token to withdraw
     * @param amount Amount of tokens to withdraw
     */
    function withdrawTokens(address token, uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        
        IERC20(token).transfer(owner(), amount);
    }
}