// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract MockERC721 {
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => bool)) private _operatorApprovals;
    mapping(uint256 => address) private _tokenApprovals;
    
    string public name;
    string public symbol;
    
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    
    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
    }
    
    function mint(address to, uint256 tokenId) external {
        _owners[tokenId] = to;
        _balances[to]++;
        emit Transfer(address(0), to, tokenId);
    }
    
    function ownerOf(uint256 tokenId) external view returns (address) {
        return _owners[tokenId];
    }
    
    function balanceOf(address owner) external view returns (uint256) {
        return _balances[owner];
    }
    
    function transferFrom(address from, address to, uint256 tokenId) external {
        require(_owners[tokenId] == from, "Not owner");
        require(msg.sender == from || _operatorApprovals[from][msg.sender] || _tokenApprovals[tokenId] == msg.sender, "Not approved");
        
        _owners[tokenId] = to;
        _balances[from]--;
        _balances[to]++;
        _tokenApprovals[tokenId] = address(0);
        
        emit Transfer(from, to, tokenId);
    }
    
    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        require(_owners[tokenId] == from, "Not owner");
        require(msg.sender == from || _operatorApprovals[from][msg.sender] || _tokenApprovals[tokenId] == msg.sender, "Not approved");
        
        _owners[tokenId] = to;
        _balances[from]--;
        _balances[to]++;
        _tokenApprovals[tokenId] = address(0);
        
        emit Transfer(from, to, tokenId);
    }
    
    function approve(address to, uint256 tokenId) external {
        require(_owners[tokenId] == msg.sender, "Not owner");
        _tokenApprovals[tokenId] = to;
        emit Approval(msg.sender, to, tokenId);
    }
    
    function setApprovalForAll(address operator, bool approved) external {
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }
    
    function getApproved(uint256 tokenId) external view returns (address) {
        return _tokenApprovals[tokenId];
    }
    
    function isApprovedForAll(address owner, address operator) external view returns (bool) {
        return _operatorApprovals[owner][operator];
    }
}