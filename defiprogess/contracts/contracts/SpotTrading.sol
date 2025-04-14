// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title SpotTrading
 * @dev A contract for executing spot trades between tokens at a specified price
 */
contract SpotTrading is Ownable {
    using SafeERC20 for IERC20;

    // Maps token addresses to a boolean indicating if they are supported
    mapping(address => bool) public supportedTokens;
    
    // Events
    event TradeExecuted(
        address indexed token,
        address indexed baseToken,
        address indexed trader,
        uint256 amount,
        uint256 price,
        bool isBuy,
        uint256 totalCost
    );
    event TokenSupported(address indexed token);

    /**
     * @dev Constructor
     */
    constructor() Ownable(msg.sender) {}

    /**
     * @dev Add a token to the list of supported tokens
     * @param token Address of the token to add
     */
    function addSupportedToken(address token) external onlyOwner {
        require(token != address(0), "SpotTrading: token address cannot be zero");
        require(!supportedTokens[token], "SpotTrading: token already supported");
        
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
     * @dev Execute a spot trade between two tokens
     * @param token Address of the token being traded
     * @param baseToken Address of the base token (typically a stablecoin)
     * @param amount Amount of tokens to buy or sell
     * @param price Price per token in base token units with the same decimals as the base token
     * @param isBuy Whether this is a buy (true) or sell (false) order
     * @return The total cost or proceeds of the trade
     */
    function executeTrade(
        address token,
        address baseToken,
        uint256 amount,
        uint256 price,
        bool isBuy
    ) external returns (uint256) {
        require(token != address(0), "SpotTrading: token address cannot be zero");
        require(baseToken != address(0), "SpotTrading: baseToken address cannot be zero");
        require(token != baseToken, "SpotTrading: token and baseToken must be different");
        require(amount > 0, "SpotTrading: amount must be greater than zero");
        require(price > 0, "SpotTrading: price must be greater than zero");
        require(supportedTokens[token], "SpotTrading: token not supported");
        require(supportedTokens[baseToken], "SpotTrading: baseToken not supported");
        
        // Calculate total cost/proceeds
        uint256 totalCost = amount * price;
        
        if (isBuy) {
            // For a buy: transfer base tokens from user to contract
            IERC20(baseToken).safeTransferFrom(msg.sender, address(this), totalCost);
            
            // Then transfer tokens to user
            IERC20(token).safeTransfer(msg.sender, amount);
        } else {
            // For a sell: transfer tokens from user to contract
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
            
            // Then transfer base tokens to user
            IERC20(baseToken).safeTransfer(msg.sender, totalCost);
        }
        
        emit TradeExecuted(token, baseToken, msg.sender, amount, price, isBuy, totalCost);
        
        return totalCost;
    }
}