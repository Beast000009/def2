// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title TokenSwap
 * @dev A contract that allows swapping between different ERC20 tokens
 */
contract TokenSwap is Ownable, ReentrancyGuard {
    // Mapping of supported tokens
    mapping(address => bool) public supportedTokens;
    
    // Mapping of exchange rates between tokens (fromToken => toToken => rate)
    // Rate is in wei with 18 decimals of precision (1e18 = 1:1 rate)
    mapping(address => mapping(address => uint256)) public exchangeRates;
    
    // Fee percentage (e.g., 30 = 0.3%)
    uint256 public feePercentage = 30;
    
    // Events
    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);
    event ExchangeRateSet(address indexed fromToken, address indexed toToken, uint256 rate);
    event FeePercentageUpdated(uint256 oldFee, uint256 newFee);
    event SwapExecuted(
        address indexed user,
        address indexed fromToken,
        address indexed toToken,
        uint256 fromAmount,
        uint256 toAmount,
        uint256 timestamp
    );

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
     * @dev Set the exchange rate between two tokens
     * @param fromToken Address of the source token
     * @param toToken Address of the destination token
     * @param rate Exchange rate (1e18 = 1:1)
     */
    function setExchangeRate(
        address fromToken,
        address toToken,
        uint256 rate
    ) external onlyOwner {
        require(fromToken != address(0) && toToken != address(0), "Invalid token address");
        require(fromToken != toToken, "Same token addresses");
        require(rate > 0, "Rate must be greater than 0");
        
        exchangeRates[fromToken][toToken] = rate;
        emit ExchangeRateSet(fromToken, toToken, rate);
    }
    
    /**
     * @dev Set the fee percentage
     * @param newFeePercentage New fee percentage (in basis points, e.g., 30 = 0.3%)
     */
    function setFeePercentage(uint256 newFeePercentage) external onlyOwner {
        require(newFeePercentage <= 500, "Fee cannot exceed 5%");
        
        uint256 oldFee = feePercentage;
        feePercentage = newFeePercentage;
        emit FeePercentageUpdated(oldFee, newFeePercentage);
    }
    
    /**
     * @dev Calculate the amount of tokens to be received in a swap
     * @param fromToken Source token address
     * @param toToken Destination token address
     * @param fromAmount Amount of source tokens
     * @return Amount of destination tokens to be received
     */
    function getSwapAmount(
        address fromToken,
        address toToken,
        uint256 fromAmount
    ) public view returns (uint256) {
        require(supportedTokens[fromToken], "Source token not supported");
        require(supportedTokens[toToken], "Destination token not supported");
        require(exchangeRates[fromToken][toToken] > 0, "Exchange rate not set");
        
        // Calculate base amount
        uint256 baseAmount = (fromAmount * exchangeRates[fromToken][toToken]) / 1e18;
        
        // Apply fee
        uint256 fee = (baseAmount * feePercentage) / 10000;
        
        return baseAmount - fee;
    }
    
    /**
     * @dev Swap tokens
     * @param fromToken Source token address
     * @param toToken Destination token address
     * @param fromAmount Amount of source tokens
     * @param minToAmount Minimum amount of destination tokens to receive
     * @param deadline Deadline timestamp for the swap
     * @return Amount of destination tokens received
     */
    function swap(
        address fromToken,
        address toToken,
        uint256 fromAmount,
        uint256 minToAmount,
        uint256 deadline
    ) external nonReentrant returns (uint256) {
        require(block.timestamp <= deadline, "Transaction expired");
        require(fromAmount > 0, "Amount must be greater than 0");
        
        uint256 toAmount = getSwapAmount(fromToken, toToken, fromAmount);
        require(toAmount >= minToAmount, "Slippage exceeded");
        
        // Transfer tokens from sender to contract
        IERC20(fromToken).transferFrom(msg.sender, address(this), fromAmount);
        
        // Transfer tokens from contract to sender
        IERC20(toToken).transfer(msg.sender, toAmount);
        
        // Emit swap event
        emit SwapExecuted(msg.sender, fromToken, toToken, fromAmount, toAmount, block.timestamp);
        
        return toAmount;
    }
    
    /**
     * @dev Withdraw tokens from the contract (for emergency or rebalancing)
     * @param token Address of the token to withdraw
     * @param amount Amount of tokens to withdraw
     */
    function withdrawTokens(address token, uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        
        IERC20(token).transfer(owner(), amount);
    }
}