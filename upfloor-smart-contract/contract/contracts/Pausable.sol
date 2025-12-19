// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

abstract contract Pausable {
    bool private _paused;
    
    error Paused();
    error NotPaused();

    event PausedEvent(address account);
    event UnpausedEvent(address account);

    modifier whenNotPaused() {
        if (paused()) revert Paused();
        _;
    }

    modifier whenPaused() {
        if (!paused()) revert NotPaused();
        _;
    }

    constructor() {
        _paused = false;
    }

    function paused() public view virtual returns (bool) {
        return _paused;
    }

    function _pause() internal virtual whenNotPaused {
        _paused = true;
        emit PausedEvent(msg.sender);
    }

    function _unpause() internal virtual whenPaused {
        _paused = false;
        emit UnpausedEvent(msg.sender);
    }
}