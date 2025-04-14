// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TestToken is ERC20, Ownable {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) Ownable(msg.sender) {
        // Mint 1 million tokens to the deployer
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    // Function to mint more tokens - only owner can call this
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}