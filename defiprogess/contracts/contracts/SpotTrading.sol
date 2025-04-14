// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IERC20
 * @dev Interface for the ERC20 standard token.
 */
interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
}

/**
 * @title SpotTrading
 * @dev A contract for spot trading of ERC20 tokens
 */
contract SpotTrading {
    address public owner;
    
    constructor() {
        owner = msg.sender;
    }
    
    // Modifier to restrict functions to the owner
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    // Reentrancy guard
    bool private locked;
    modifier nonReentrant() {
        require(!locked, "Reentrant call");
        locked = true;
        _;
        locked = false;
    }

    // Struct for orders
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

    uint256 public feePercentage = 30; // 0.3%
    uint256 public constant FEE_DENOMINATOR = 10000;

    mapping(uint256 => Order) public orders;
    uint256 public nextOrderId = 1;

    // Mapping to track active orders
    mapping(address => uint256[]) public activeBuyOrders;
    mapping(address => uint256[]) public activeSellOrders;

    // 24-hour volume tracking
    struct VolumeRecord {
        uint256 timestamp;
        uint256 volume;
    }
    
    mapping(address => mapping(address => VolumeRecord[])) private volumeRecords;

    // Token whitelist for security
    mapping(address => bool) public supportedTokens;

    // Events
    event OrderCreated(
        uint256 indexed orderId,
        address indexed trader,
        address tokenAddress,
        address baseTokenAddress,
        uint256 amount,
        uint256 price,
        bool isBuyOrder,
        uint256 timestamp
    );

    event OrderFilled(
        uint256 indexed orderId,
        address indexed trader,
        address tokenAddress,
        address baseTokenAddress,
        uint256 amountFilled,
        uint256 price,
        uint256 fee,
        bool isBuyOrder,
        uint256 timestamp
    );

    event OrderCancelled(
        uint256 indexed orderId,
        address indexed trader,
        uint256 timestamp
    );

    // Modifiers
    modifier validOrder(uint256 orderId) {
        require(orderId > 0 && orderId < nextOrderId, "Invalid order ID");
        require(orders[orderId].isActive, "Order is not active");
        _;
    }

    modifier onlySupportedTokens(address tokenAddress, address baseTokenAddress) {
        require(supportedTokens[tokenAddress], "Token not supported");
        require(supportedTokens[baseTokenAddress], "Base token not supported");
        _;
    }

    // Constructor was already defined above

    /**
     * @dev Add a token to the supported tokens list
     * @param tokenAddress The address of the token to add
     */
    function addSupportedToken(address tokenAddress) external onlyOwner {
        require(tokenAddress != address(0), "Invalid token address");
        supportedTokens[tokenAddress] = true;
    }

    /**
     * @dev Remove a token from the supported tokens list
     * @param tokenAddress The address of the token to remove
     */
    function removeSupportedToken(address tokenAddress) external onlyOwner {
        require(tokenAddress != address(0), "Invalid token address");
        supportedTokens[tokenAddress] = false;
    }

    /**
     * @dev Set the fee percentage
     * @param _feePercentage The new fee percentage
     */
    function setFeePercentage(uint256 _feePercentage) external onlyOwner {
        require(_feePercentage <= 100, "Fee percentage too high");
        feePercentage = _feePercentage;
    }

    /**
     * @dev Create a buy order
     * @param tokenAddress The address of the token to buy
     * @param baseTokenAddress The address of the token used for payment
     * @param amount The amount of tokens to buy
     * @param price The price per token in base token units
     * @return orderId The ID of the created order
     */
    function createBuyOrder(
        address tokenAddress,
        address baseTokenAddress,
        uint256 amount,
        uint256 price
    ) 
        external 
        nonReentrant 
        onlySupportedTokens(tokenAddress, baseTokenAddress) 
        returns (uint256) 
    {
        require(amount > 0, "Amount must be greater than 0");
        require(price > 0, "Price must be greater than 0");

        // Calculate total cost in base tokens
        uint256 totalCost = amount * price;
        
        // Transfer base tokens from the buyer to this contract
        require(IERC20(baseTokenAddress).transferFrom(msg.sender, address(this), totalCost), "Transfer failed");

        // Create the order
        Order memory order = Order({
            id: nextOrderId,
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

        orders[nextOrderId] = order;
        activeBuyOrders[tokenAddress].push(nextOrderId);

        emit OrderCreated(
            nextOrderId,
            msg.sender,
            tokenAddress,
            baseTokenAddress,
            amount,
            price,
            true,
            block.timestamp
        );

        return nextOrderId++;
    }

    /**
     * @dev Create a sell order
     * @param tokenAddress The address of the token to sell
     * @param baseTokenAddress The address of the token to receive as payment
     * @param amount The amount of tokens to sell
     * @param price The price per token in base token units
     * @return orderId The ID of the created order
     */
    function createSellOrder(
        address tokenAddress,
        address baseTokenAddress,
        uint256 amount,
        uint256 price
    ) 
        external 
        nonReentrant 
        onlySupportedTokens(tokenAddress, baseTokenAddress) 
        returns (uint256) 
    {
        require(amount > 0, "Amount must be greater than 0");
        require(price > 0, "Price must be greater than 0");

        // Transfer tokens from the seller to this contract
        IERC20(tokenAddress).safeTransferFrom(msg.sender, address(this), amount);

        // Create the order
        Order memory order = Order({
            id: nextOrderId,
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

        orders[nextOrderId] = order;
        activeSellOrders[tokenAddress].push(nextOrderId);

        emit OrderCreated(
            nextOrderId,
            msg.sender,
            tokenAddress,
            baseTokenAddress,
            amount,
            price,
            false,
            block.timestamp
        );

        return nextOrderId++;
    }

    /**
     * @dev Cancel an order
     * @param orderId The ID of the order to cancel
     */
    function cancelOrder(uint256 orderId) external nonReentrant validOrder(orderId) {
        Order storage order = orders[orderId];
        require(order.trader == msg.sender, "Not order owner");

        order.isActive = false;

        // Refund tokens
        if (order.isBuyOrder) {
            uint256 refundAmount = (order.amount - order.filled) * order.price;
            if (refundAmount > 0) {
                IERC20(order.baseTokenAddress).safeTransfer(order.trader, refundAmount);
            }
            
            // Remove from active buy orders
            removeFromActiveOrders(activeBuyOrders[order.tokenAddress], orderId);
        } else {
            uint256 refundAmount = order.amount - order.filled;
            if (refundAmount > 0) {
                IERC20(order.tokenAddress).safeTransfer(order.trader, refundAmount);
            }
            
            // Remove from active sell orders
            removeFromActiveOrders(activeSellOrders[order.tokenAddress], orderId);
        }

        emit OrderCancelled(orderId, msg.sender, block.timestamp);
    }

    /**
     * @dev Fill a buy order
     * @param orderId The ID of the order to fill
     * @param amount The amount to fill
     */
    function fillBuyOrder(uint256 orderId, uint256 amount) external nonReentrant validOrder(orderId) {
        Order storage order = orders[orderId];
        require(order.isBuyOrder, "Not a buy order");
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= (order.amount - order.filled), "Insufficient remaining amount");

        // Transfer tokens from seller to buyer
        IERC20(order.tokenAddress).safeTransferFrom(msg.sender, order.trader, amount);

        // Calculate payment and fee
        uint256 payment = amount * order.price;
        uint256 fee = (payment * feePercentage) / FEE_DENOMINATOR;
        uint256 netPayment = payment - fee;

        // Transfer payment from contract to seller
        IERC20(order.baseTokenAddress).safeTransfer(msg.sender, netPayment);
        
        // Transfer fee to contract owner
        if (fee > 0) {
            IERC20(order.baseTokenAddress).safeTransfer(owner(), fee);
        }

        // Update order
        order.filled += amount;
        
        // Update volume record
        recordVolume(order.tokenAddress, order.baseTokenAddress, payment);

        // Check if order is completely filled
        if (order.filled == order.amount) {
            order.isActive = false;
            removeFromActiveOrders(activeBuyOrders[order.tokenAddress], orderId);
        }

        emit OrderFilled(
            orderId,
            msg.sender,
            order.tokenAddress,
            order.baseTokenAddress,
            amount,
            order.price,
            fee,
            true,
            block.timestamp
        );
    }

    /**
     * @dev Fill a sell order
     * @param orderId The ID of the order to fill
     * @param amount The amount to fill
     */
    function fillSellOrder(uint256 orderId, uint256 amount) external nonReentrant validOrder(orderId) {
        Order storage order = orders[orderId];
        require(!order.isBuyOrder, "Not a sell order");
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= (order.amount - order.filled), "Insufficient remaining amount");

        // Calculate payment and fee
        uint256 payment = amount * order.price;
        uint256 fee = (payment * feePercentage) / FEE_DENOMINATOR;
        uint256 netPayment = payment - fee;

        // Transfer payment from buyer to contract
        IERC20(order.baseTokenAddress).safeTransferFrom(msg.sender, address(this), payment);

        // Transfer tokens from contract to buyer
        IERC20(order.tokenAddress).safeTransfer(msg.sender, amount);
        
        // Transfer payment from contract to seller
        IERC20(order.baseTokenAddress).safeTransfer(order.trader, netPayment);
        
        // Transfer fee to contract owner
        if (fee > 0) {
            IERC20(order.baseTokenAddress).safeTransfer(owner(), fee);
        }

        // Update order
        order.filled += amount;
        
        // Update volume record
        recordVolume(order.tokenAddress, order.baseTokenAddress, payment);

        // Check if order is completely filled
        if (order.filled == order.amount) {
            order.isActive = false;
            removeFromActiveOrders(activeSellOrders[order.tokenAddress], orderId);
        }

        emit OrderFilled(
            orderId,
            msg.sender,
            order.tokenAddress,
            order.baseTokenAddress,
            amount,
            order.price,
            fee,
            false,
            block.timestamp
        );
    }

    /**
     * @dev Get the order details
     * @param orderId The ID of the order
     * @return The order details
     */
    function getOrder(uint256 orderId) external view returns (Order memory) {
        require(orderId > 0 && orderId < nextOrderId, "Invalid order ID");
        return orders[orderId];
    }

    /**
     * @dev Get active buy orders for a token
     * @param tokenAddress The address of the token
     * @return Array of order IDs
     */
    function getActiveBuyOrders(address tokenAddress) external view returns (uint256[] memory) {
        return activeBuyOrders[tokenAddress];
    }

    /**
     * @dev Get active sell orders for a token
     * @param tokenAddress The address of the token
     * @return Array of order IDs
     */
    function getActiveSellOrders(address tokenAddress) external view returns (uint256[] memory) {
        return activeSellOrders[tokenAddress];
    }

    /**
     * @dev Get 24-hour volume for a token pair
     * @param tokenAddress The address of the token
     * @param baseTokenAddress The address of the base token
     * @return The 24-hour volume in base token units
     */
    function get24HourVolume(address tokenAddress, address baseTokenAddress) external view returns (uint256) {
        VolumeRecord[] memory records = volumeRecords[tokenAddress][baseTokenAddress];
        uint256 volume = 0;
        uint256 cutoffTime = block.timestamp - 24 hours;
        
        for (uint256 i = 0; i < records.length; i++) {
            if (records[i].timestamp >= cutoffTime) {
                volume += records[i].volume;
            }
        }
        
        return volume;
    }

    /**
     * @dev Record volume for a token pair
     * @param tokenAddress The address of the token
     * @param baseTokenAddress The address of the base token
     * @param amount The amount of volume to record (in base token units)
     */
    function recordVolume(address tokenAddress, address baseTokenAddress, uint256 amount) internal {
        volumeRecords[tokenAddress][baseTokenAddress].push(VolumeRecord({
            timestamp: block.timestamp,
            volume: amount
        }));
    }

    /**
     * @dev Remove an order ID from an active orders array
     * @param activeOrders The array of active order IDs
     * @param orderId The order ID to remove
     */
    function removeFromActiveOrders(uint256[] storage activeOrders, uint256 orderId) internal {
        for (uint256 i = 0; i < activeOrders.length; i++) {
            if (activeOrders[i] == orderId) {
                // Swap with the last element and then pop
                if (i < activeOrders.length - 1) {
                    activeOrders[i] = activeOrders[activeOrders.length - 1];
                }
                activeOrders.pop();
                break;
            }
        }
    }

    /**
     * @dev Withdraw ERC20 tokens accidentally sent to this contract
     * @param tokenAddress The address of the token to withdraw
     * @param amount The amount to withdraw
     */
    function emergencyWithdraw(address tokenAddress, uint256 amount) external onlyOwner {
        IERC20(tokenAddress).safeTransfer(owner(), amount);
    }
}