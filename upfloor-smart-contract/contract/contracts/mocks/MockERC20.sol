// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
/**
//  _        ___  ___ ___   ___   ____       _____  __ __  ____  
// | |      /  _]|   |   | /   \ |    \     |     ||  |  ||    \ 
// | |     /  [_ | _   _ ||     ||  _  |    |   __||  |  ||  _  |
// | |___ |    _]|  \_/  ||  O  ||  |  |    |  |_  |  |  ||  |  |
// |     ||   [_ |   |   ||     ||  |  |    |   _] |  :  ||  |  |
// |     ||     ||   |   ||     ||  |  |    |  |   |     ||  |  |
// |_____||_____||___|___| \___/ |__|__|    |__|    \__,_||__|__|

 */
contract MockERC20 {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    
    uint256 private _totalSupply;
    string public name;
    string public symbol;
    uint8 public decimals = 18;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
    }
    
    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }
    
    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }
    
    function allowance(address owner, address spender) external view returns (uint256) {
        return _allowances[owner][spender];
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 currentAllowance = _allowances[from][msg.sender];
        require(currentAllowance >= amount, "ERC20: insufficient allowance");
        
        _transfer(from, to, amount);
        _approve(from, msg.sender, currentAllowance - amount);
        
        return true;
    }
    
    function mint(address to, uint256 amount) external {
        _totalSupply += amount;
        _balances[to] += amount;
        emit Transfer(address(0), to, amount);
    }
    
    function _transfer(address from, address to, uint256 amount) internal {
        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");
        
        uint256 fromBalance = _balances[from];
        require(fromBalance >= amount, "ERC20: transfer amount exceeds balance");
        
        _balances[from] = fromBalance - amount;
        _balances[to] += amount;
        
        emit Transfer(from, to, amount);
    }
    
    function _approve(address owner, address spender, uint256 amount) internal {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");
        
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
}
