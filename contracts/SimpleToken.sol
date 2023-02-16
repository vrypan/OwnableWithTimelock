// contracts/GLDToken.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./OwnableWithTimelock.sol";

contract SimpleToken is ERC20, OwnableWithTimelock {
    constructor(uint256 initialSupply) ERC20("SimpleToken", "SIMPLE") {
        _mint(msg.sender, initialSupply);
    }
}