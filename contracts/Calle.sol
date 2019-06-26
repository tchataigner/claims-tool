pragma solidity ^0.5.2;

contract Calle {
    uint256 public integer;

    function changeInteger(uint256 _integer) public {
        integer = _integer;
    }
}