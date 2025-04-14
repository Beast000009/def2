// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TokenSwap
 * @dev A contract for swapping tokens with fixed exchange rates
 */
contract TokenSwap is Ownable {
    // Events
    event SwapExecuted(
        address indexed user,
        address indexed fromToken,
        address indexed toToken,
        uint256 fromAmount,
        uint256 toAmount,
        uint256 timestamp
    );

    // Fees
    uint256 public feePercentage = 30; // 0.3% fee
    uint256 public constant FEE_DENOMINATOR = 10000;

    // Supported token mappings
    mapping(address => bool) public supportedTokens;
    
    // Exchange rates (simplified for demo)
    mapping(address => mapping(address => uint256)) public exchangeRates;

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Add supported token
     * @param token Address of the token to add
     */
    function addSupportedToken(address token) external onlyOwner {
        require(token != address(0), "Invalid token address");
        supportedTokens[token] = true;
    }

    /**
     * @dev Remove supported token
     * @param token Address of the token to remove
     */
    function removeSupportedToken(address token) external onlyOwner {
        supportedTokens[token] = false;
    }

    /**
     * @dev Set exchange rate between two tokens
     * @param fromToken Address of the source token
     * @param toToken Address of the destination token
     * @param rate Exchange rate (price of toToken in terms of fromToken * 10^18)
     */
    function setExchangeRate(
        address fromToken,
        address toToken,
        uint256 rate
    ) external onlyOwner {
        require(fromToken != address(0) && toToken != address(0), "Invalid token address");
        require(rate > 0, "Rate must be greater than zero");
        exchangeRates[fromToken][toToken] = rate;
    }

    /**
     * @dev Set platform fee
     * @param _feePercentage New fee percentage (30 = 0.3%)
     */
    function setFeePercentage(uint256 _feePercentage) external onlyOwner {
        require(_feePercentage <= 500, "Fee too high"); // Max 5%
        feePercentage = _feePercentage;
    }

    /**
     * @dev Get amount of destination tokens for a given amount of source tokens
     * @param fromToken Address of the source token
     * @param toToken Address of the destination token
     * @param fromAmount Amount of source tokens
     * @return toAmount Amount of destination tokens
     */
    function getSwapAmount(
        address fromToken,
        address toToken,
        uint256 fromAmount
    ) public view returns (uint256 toAmount) {
        require(supportedTokens[fromToken] && supportedTokens[toToken], "Unsupported token");
        require(fromAmount > 0, "Amount must be greater than zero");
        require(exchangeRates[fromToken][toToken] > 0, "Exchange rate not set");

        uint256 baseAmount = (fromAmount * exchangeRates[fromToken][toToken]) / 1e18;
        uint256 fee = (baseAmount * feePercentage) / FEE_DENOMINATOR;
        toAmount = baseAmount - fee;
    }

    /**
     * @dev Swap tokens
     * @param fromToken Address of the source token
     * @param toToken Address of the destination token
     * @param fromAmount Amount of source tokens
     * @param minToAmount Minimum amount of destination tokens to receive
     * @param deadline Transaction deadline timestamp
     * @return toAmount Amount of destination tokens received
     */
    function swap(
        address fromToken,
        address toToken,
        uint256 fromAmount,
        uint256 minToAmount,
        uint256 deadline
    ) external returns (uint256 toAmount) {
        require(block.timestamp <= deadline, "Transaction expired");
        require(fromToken != toToken, "Same token");

        toAmount = getSwapAmount(fromToken, toToken, fromAmount);
        require(toAmount >= minToAmount, "Slippage too high");

        // Transfer tokens from user to contract
        IERC20(fromToken).transferFrom(msg.sender, address(this), fromAmount);
        
        // Transfer tokens from contract to user
        IERC20(toToken).transfer(msg.sender, toAmount);

        emit SwapExecuted(
            msg.sender,
            fromToken,
            toToken,
            fromAmount,
            toAmount,
            block.timestamp
        );
    }

    /**
     * @dev Withdraw tokens (emergency function)
     * @param token Address of the token to withdraw
     * @param amount Amount to withdraw
     */
    function withdrawToken(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }
}