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
 * @title TokenSwap
 * @dev A contract that allows users to swap tokens with pre-defined exchange rates.
 */
contract TokenSwap {
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

    // Fee percentage (in basis points, e.g., 30 = 0.3%)
    uint256 public feePercentage = 30;
    uint256 public constant FEE_DENOMINATOR = 10000;
    
    // Mapping of supported tokens
    mapping(address => bool) public supportedTokens;
    
    // Mapping for exchange rates (fromToken => toToken => rate)
    // Rate is represented with 18 decimals (1e18 = 1:1 rate)
    mapping(address => mapping(address => uint256)) public exchangeRates;
    
    // Events
    event SwapExecuted(
        address indexed user,
        address indexed fromToken,
        address indexed toToken,
        uint256 fromAmount,
        uint256 toAmount,
        uint256 timestamp
    );
    
    event ExchangeRateUpdated(
        address indexed fromToken,
        address indexed toToken,
        uint256 rate
    );
    
    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);
    event FeePercentageUpdated(uint256 oldFee, uint256 newFee);
    
    // Constructor is already defined above
    
    /**
     * @dev Add a token to the supported tokens list
     * @param token The address of the token to add
     */
    function addSupportedToken(address token) external onlyOwner {
        require(token != address(0), "Invalid token address");
        require(!supportedTokens[token], "Token already supported");
        
        supportedTokens[token] = true;
        emit TokenAdded(token);
    }
    
    /**
     * @dev Remove a token from the supported tokens list
     * @param token The address of the token to remove
     */
    function removeSupportedToken(address token) external onlyOwner {
        require(supportedTokens[token], "Token not supported");
        
        supportedTokens[token] = false;
        emit TokenRemoved(token);
    }
    
    /**
     * @dev Set the exchange rate between two tokens
     * @param fromToken The source token
     * @param toToken The destination token
     * @param rate The exchange rate with 18 decimals precision
     */
    function setExchangeRate(
        address fromToken,
        address toToken,
        uint256 rate
    ) external onlyOwner {
        require(fromToken != address(0) && toToken != address(0), "Invalid token address");
        require(fromToken != toToken, "Tokens must be different");
        require(rate > 0, "Rate must be greater than 0");
        
        exchangeRates[fromToken][toToken] = rate;
        emit ExchangeRateUpdated(fromToken, toToken, rate);
    }
    
    /**
     * @dev Update the fee percentage
     * @param _feePercentage The new fee percentage in basis points
     */
    function setFeePercentage(uint256 _feePercentage) external onlyOwner {
        require(_feePercentage <= 1000, "Fee too high"); // Max 10%
        
        uint256 oldFee = feePercentage;
        feePercentage = _feePercentage;
        emit FeePercentageUpdated(oldFee, _feePercentage);
    }
    
    /**
     * @dev Calculate the amount of tokens that will be received
     * @param fromToken The source token
     * @param toToken The destination token
     * @param fromAmount The amount of source tokens
     * @return The amount of destination tokens that will be received
     */
    function getSwapAmount(
        address fromToken,
        address toToken,
        uint256 fromAmount
    ) public view returns (uint256) {
        // Validate parameters
        require(fromToken != address(0) && toToken != address(0), "Invalid token address");
        require(fromToken != toToken, "Cannot swap same token");
        require(supportedTokens[fromToken] && supportedTokens[toToken], "Token not supported");
        require(fromAmount > 0, "Amount must be greater than 0");
        
        // Get exchange rate
        uint256 rate = exchangeRates[fromToken][toToken];
        require(rate > 0, "Exchange rate not set");
        
        // Calculate output amount
        uint256 outputAmount = (fromAmount * rate) / 1e18;
        
        // Apply fee
        uint256 fee = (outputAmount * feePercentage) / FEE_DENOMINATOR;
        outputAmount = outputAmount - fee;
        
        return outputAmount;
    }
    
    /**
     * @dev Swap tokens
     * @param fromToken The source token
     * @param toToken The destination token
     * @param fromAmount The amount of source tokens
     * @param minToAmount The minimum amount of destination tokens expected
     * @param deadline The deadline for the swap
     * @return The amount of destination tokens received
     */
    function swap(
        address fromToken,
        address toToken,
        uint256 fromAmount,
        uint256 minToAmount,
        uint256 deadline
    ) external nonReentrant returns (uint256) {
        // Validate parameters
        require(block.timestamp <= deadline, "Deadline expired");
        
        // Calculate output amount
        uint256 outputAmount = getSwapAmount(fromToken, toToken, fromAmount);
        require(outputAmount >= minToAmount, "Insufficient output amount");
        
        // Transfer tokens from sender to this contract
        require(IERC20(fromToken).transferFrom(msg.sender, address(this), fromAmount), "Transfer failed");
        
        // Transfer tokens from contract to sender
        require(IERC20(toToken).transfer(msg.sender, outputAmount), "Transfer failed");
        
        // Emit event
        emit SwapExecuted(
            msg.sender,
            fromToken,
            toToken,
            fromAmount,
            outputAmount,
            block.timestamp
        );
        
        return outputAmount;
    }
    
    /**
     * @dev Withdraw ERC20 tokens accidentally sent to the contract
     * @param token The address of the token
     * @param amount The amount to withdraw
     */
    function withdrawToken(address token, uint256 amount) external onlyOwner {
        require(IERC20(token).transfer(owner, amount), "Transfer failed");
    }
}