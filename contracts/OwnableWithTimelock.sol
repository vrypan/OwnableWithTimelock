// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @dev Contract module which provides access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * By default, the owner account will be the one that deploys the contract. This
 * can later be changed with {transferOwnership} and {acceptOwnership}.
 *
 * This module is used through inheritance. It will make available all functions
 * from parent (Ownable).
 */

abstract contract OwnableWithTimelock is Ownable {
    address private _fallbackOwner = address(0) ;
    uint _delay = 365;
    // uint _timelockInit = type(uint).max;
    uint _timelockInit = 0;

    event TimelockInitiated(address fallbackOwner) ;
    event TimelockCanceled() ;
    
    function _resetTimelock() private {
        _timelockInit = 0;
    }

    function setOwnerTimelock(address newFallbackOwner, uint delayDays) public virtual onlyOwner {
        /*  Delay is expressed in days, as this is closer to the expected use
            and it will make it more clear for users to check the timelock status
            compared to using large numbers indicating seconds.
        */
        _fallbackOwner = newFallbackOwner ;
        _delay = delayDays;
        _resetTimelock();
    }

    function getOwnerTimelock() public view virtual returns (address, uint, uint) {
        return (_fallbackOwner, _delay, _timelockInit) ;
    }

    function initOwnerUnlock() public virtual {
        require(
            _msgSender() == _fallbackOwner, 
            "Address denied"
        );
        _timelockInit = block.timestamp;
        emit TimelockInitiated(_msgSender());
    }

    function cancelOwnerUnlock() public virtual {
        require(
            (_msgSender() == owner()) || (_msgSender() == _fallbackOwner),
            "Address denied"
        );
        _resetTimelock();
        emit TimelockCanceled();
    }

    function completeOwnerUnlock() public virtual {
        require(_timelockInit>0, "Not initialized");
        require(_msgSender() == _fallbackOwner, "Address denied");
        require( block.timestamp > _timelockInit + _delay*60*60*24, "Not yet");
        _resetTimelock();
        super._transferOwnership( _fallbackOwner );
    }
}
