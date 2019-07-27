pragma solidity ^0.5.2;

interface ERC780 {
    event ClaimSet(address indexed issuer, address indexed recipient, bytes32 indexed topic, bytes value);
    event ClaimRemoved(address indexed issuer, address indexed recipient, bytes32 indexed topic);

    function setClaim(address _recipient, bytes32 _topic, bytes calldata _data) external;
    function getClaim(address _recipient, address _issuer, bytes32 _topic) external view returns(bytes memory data);
    function removeClaim(address _recipient, bytes32 _topic) external;
}