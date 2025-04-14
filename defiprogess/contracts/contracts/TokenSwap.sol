// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title TokenSwap
 * @dev A contract for swapping between different ERC20 tokens with predefined exchange rates
 */
contract TokenSwap is Ownable {
    using SafeERC20 for IERC20;

    // Maps token addresses to a boolean indicating if they are supported
    mapping(address => bool) public supportedTokens;
    
    // Maps (from token address => to token address) to the exchange rate
    // The rate is expressed with 18 decimals, e.g. 1 ETH = 3000 USDT would be 3000 * 10^18
    mapping(address => mapping(address => uint256)) public exchangeRates;
    
    // Events
    event TokenSwapped(address indexed fromToken, address indexed toToken, address indexed user, uint256 fromAmount, uint256 toAmount);
    event TokenSupported(address indexed token);
    event ExchangeRateSet(address indexed fromToken, address indexed toToken, uint256 rate);

    /**
     * @dev Constructor
     */
    constructor() Ownable(msg.sender) {}

    /**
     * @dev Add a token to the list of supported tokens
     * @param token Address of the token to add
     */
    function addSupportedToken(address token) external onlyOwner {
        require(token != address(0), "TokenSwap: token address cannot be zero");
        require(!supportedTokens[token], "TokenSwap: token already supported");
        
        supportedTokens[token] = true;
        emit TokenSupported(token);
    }
    
    /**
     * @dev Check if a token is supported
     * @param token Address of the token to check
     * @return Boolean indicating if the token is supported
     */
    function isSupportedToken(address token) external view returns (bool) {
        return supportedTokens[token];
    }
    
    /**
     * @dev Set the exchange rate between two tokens
     * @param fromToken Address of the source token
     * @param toToken Address of the destination token
     * @param rate Exchange rate with 18 decimals (rate * 10^18)
     */
    function setExchangeRate(address fromToken, address toToken, uint256 rate) external onlyOwner {
        require(fromToken != address(0), "TokenSwap: fromToken address cannot be zero");
        require(toToken != address(0), "TokenSwap: toToken address cannot be zero");
        require(fromToken != toToken, "TokenSwap: tokens must be different");
        require(supportedTokens[fromToken], "TokenSwap: fromToken not supported");
        require(supportedTokens[toToken], "TokenSwap: toToken not supported");
        require(rate > 0, "TokenSwap: rate must be greater than zero");
        
        exchangeRates[fromToken][toToken] = rate;
        emit ExchangeRateSet(fromToken, toToken, rate);
    }
    
    /**
     * @dev Get the exchange rate between two tokens
     * @param fromToken Address of the source token
     * @param toToken Address of the destination token
     * @return Exchange rate with 18 decimals
     */
    function getExchangeRate(address fromToken, address toToken) external view returns (uint256) {
        require(fromToken != address(0), "TokenSwap: fromToken address cannot be zero");
        require(toToken != address(0), "TokenSwap: toToken address cannot be zero");
        require(supportedTokens[fromToken], "TokenSwap: fromToken not supported");
        require(supportedTokens[toToken], "TokenSwap: toToken not supported");
        
        uint256 rate = exchangeRates[fromToken][toToken];
        require(rate > 0, "TokenSwap: exchange rate not set");
        
        return rate;
    }
    
    /**
     * @dev Calculate the amount of tokens to receive in a swap
     * @param fromToken Address of the source token
     * @param toToken Address of the destination token
     * @param amount Amount of source tokens to swap
     * @return Amount of destination tokens to receive
     */
    function getSwapRate(address fromToken, address toToken, uint256 amount) external view returns (uint256) {
        require(fromToken != address(0), "TokenSwap: fromToken address cannot be zero");
        require(toToken != address(0), "TokenSwap: toToken address cannot be zero");
        require(supportedTokens[fromToken], "TokenSwap: fromToken not supported");
        require(supportedTokens[toToken], "TokenSwap: toToken not supported");
        
        uint256 rate = exchangeRates[fromToken][toToken];
        require(rate > 0, "TokenSwap: exchange rate not set");
        
        // Calculate how many tokens will be received
        // We use 18 decimals for the rate, so divide by 10^18
        return (amount * rate) / 1e18;
    }
    
    /**
     * @dev Swap tokens from one type to another
     * @param fromToken Address of the source token
     * @param toToken Address of the destination token
     * @param amount Amount of source tokens to swap
     * @return Amount of destination tokens received
     */
    function swap(address fromToken, address toToken, uint256 amount) external returns (uint256) {
        require(fromToken != address(0), "TokenSwap: fromToken address cannot be zero");
        require(toToken != address(0), "TokenSwap: toToken address cannot be zero");
        require(amount > 0, "TokenSwap: amount must be greater than zero");
        require(supportedTokens[fromToken], "TokenSwap: fromToken not supported");
        require(supportedTokens[toToken], "TokenSwap: toToken not supported");
        
        uint256 rate = exchangeRates[fromToken][toToken];
        require(rate > 0, "TokenSwap: exchange rate not set");
        
        // Calculate how many tokens will be received
        // We use 18 decimals for the rate, so divide by 10^18
        uint256 toAmount = (amount * rate) / 1e18;
        
        // Transfer tokens from sender to contract
        IERC20(fromToken).safeTransferFrom(msg.sender, address(this), amount);
        
        // Transfer tokens from contract to sender
        IERC20(toToken).safeTransfer(msg.sender, toAmount);
        
        emit TokenSwapped(fromToken, toToken, msg.sender, amount, toAmount);
        
        return toAmount;
    }
}