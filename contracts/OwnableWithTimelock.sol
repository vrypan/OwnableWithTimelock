// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @dev Extension to OpenZeppelin's Ownable that provides 
 * a fallback owner that can be activated after a predefined delay
 * unless the current owner cancels the transfer.
 * 
 * @title OwnableWithTimelock
 * @author Panayotis Vryonis, vrypan.eth
 */

abstract contract OwnableWithTimelock is Ownable {
    address private _fallbackOwner = address(0) ;
    uint _delay = 365; // Delay is expressed in days. Default is 1 year.
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
