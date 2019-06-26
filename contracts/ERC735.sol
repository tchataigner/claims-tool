pragma solidity ^0.5.2;

interface ERC735 {
    event ClaimApprovalToggled(bytes32 indexed claimId, bytes32 indexed topic, uint256 scheme, address indexed issuer, bytes signature, bytes data, string uri);
    event ClaimAdded(bytes32 indexed claimId, bytes32 indexed topic, uint256 scheme, address indexed issuer, bytes signature, bytes data, string uri);
    event ClaimRemoved(bytes32 indexed claimId, bytes32 indexed topic, uint256 scheme, address indexed issuer, bytes signature, bytes data, string uri);
    event ClaimChanged(bytes32 indexed claimId, bytes32 indexed topic, uint256 scheme, address indexed issuer, bytes signature, bytes data, string uri);

    struct Claim {
        bytes32 topic;
        uint256 scheme;
        address issuer; // msg.sender
        bytes signature; // this.address + topic + data
        bytes data;
        string uri;
        bool recipientReview;
        bool isValid;
    }

    function getClaim(bytes32 _claimId) external view returns(bytes32 topic, uint256 scheme, address issuer, bytes memory signature, bytes memory data, string memory uri, bool recipientReview, bool isValid);
    function getClaimIdsByTopic(bytes32 _topic) external view returns(bytes32[] memory claimIds);
    function addClaim(bytes32 _topic, uint256 _scheme, bytes calldata _signature, bytes calldata _data, string calldata _uri) external returns (bytes32 claimRequestId);
    function changeClaim(bytes32 _claimId, uint256 _scheme, bytes calldata _signature, bytes calldata _data, string calldata _uri) external returns (bool success);
    function removeClaim(bytes32 _claimId) external returns (bool success);
    function toggleReviewClaim(bytes32 _claimId) external returns (bool success);
}