# OwnableWithTimelock

## Overview

OwnableWithTimelock is an extension to Openzeppelin's Ownable.
It provides a fallback owner that can be activated after a predefined delay
unless the current owner cancels the transfer.

It is intended to solve two problems:

- What happens to the contract ownership if the owner "is hit by a bus".
- What happens to the contract ownership if the owner wallet becomes unusable (i.e. lost keys).

Expected use:

1. The contract owner calls `setOwnerTimelock(fallbackOwner, delay)`
to define the fallback owner address.

2. The fallback owner address can call `initOwnerUnlock()` at any time,
but they have to wait for `delay` days before they call `completeOwnerUnlock()`
to complete the transfer.

3. The owner can call `cancelOwnerUnlock()` at any time to cancel an initiated
transfer.

## Example usage

As you can see in `contracts/SimpleToken.sol`, using `OwnableWithTimelock` is as simple as using
`Ownable`. 

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./OwnableWithTimelock.sol";

contract SimpleToken is ERC20, OwnableWithTimelock {
    constructor(uint256 initialSupply) ERC20("SimpleToken", "SIMPLE") {
        _mint(msg.sender, initialSupply);
    }
}
```

The `tests` folder contains a number of thests including two end-to-end
scenarios.

## Contribute

Feel free to open an issue or submit a PR. 

Visit [github.com/vrypan/OwnableWithTimelock](https://github.com/vrypan/OwnableWithTimelock).

## License

OwnableWithTimelock is released under the [MIT License](LICENSE).