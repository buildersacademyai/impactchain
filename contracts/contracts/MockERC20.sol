// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockERC20
 * @notice Minimal ERC20 used ONLY for local Hardhat network testing.
 *         Never deployed on any live network — deploy script only uses
 *         this when network === "hardhat".
 */
contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        // Mint 1,000,000 tokens to deployer for testing
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }

    /// @notice Faucet function so test accounts can get tokens
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
