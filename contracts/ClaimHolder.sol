pragma solidity ^0.5.2;

import './ERC735.sol';
import "github.com/OpenZeppelin/openzeppelin-solidity/contracts/cryptography/ECDSA.sol";

/**
 * @author Thomas Chataigner <Blockchain Partner>
 * @title Proxy Account ERC725 Implementation
 */
contract ClaimHolder is ERC735 {
    using ECDSA for bytes32;

    address public owner;

    bytes32[] public topics;

    mapping(bytes32 => bool) existingTopic;

    mapping(bytes32 => Claim) public claims;

    mapping(bytes32 => bytes32[]) public claimsByTopic;

    modifier onlyIssuer(bytes32 _claimId) {
        require(claims[_claimId].issuer != msg.sender, "msg.sender should be the claim issuer");

        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "msg.sender should be the owner");

        _;
    }

    constructor(address _owner) public {
        owner = _owner;
    }

    function getClaim(bytes32 _claimId) external view returns(bytes32 topic, uint256 scheme, address issuer, bytes memory signature, bytes memory data, string memory uri) {
        return(claims[_claimId].topic, claims[_claimId].scheme, claims[_claimId].issuer, claims[_claimId].signature, claims[_claimId].data, claims[_claimId].uri);
    }

    function getClaimIdsByTopic(bytes32 _topic) external view returns(bytes32[] memory claimIds) {
        bytes32[] memory nonFilteredClaimIds = claimsByTopic[_topic];

        uint256[] memory claimsIdsTemp = new uint256[](nonFilteredClaimIds.length);
        uint256 count = 0;
        uint256 i;
        for (i=0; i<nonFilteredClaimIds.length; i++)
            if (claims[nonFilteredClaimIds[i]].isValid)
                claimsIdsTemp[count] = i;
        count += 1;
        claimIds = new bytes32[](count);
        for (i=0; i<count; i++)
            claimIds[i] = nonFilteredClaimIds[claimsIdsTemp[i]];
    }

    function addClaim(bytes32 _topic, uint256 _scheme, bytes calldata _signature, bytes calldata _data, string calldata _uri) external returns (bytes32 claimId) {
        address who = keccak256(abi.encodePacked(msg.sender, address(this), _topic, _data)).toEthSignedMessageHash().recover(_signature);
        require(who == msg.sender, "Claims sender does not seem to be msg.sender");

        claimId = keccak256(abi.encodePacked(msg.sender, owner, _topic));

        if(!existingTopic[_topic]) {
            topics.push(_topic);
            existingTopic[_topic] = true;
        }

        claims[claimId].topic = _topic;
        claims[claimId].scheme = _scheme;
        claims[claimId].issuer = msg.sender;
        claims[claimId].signature = _signature;
        claims[claimId].data = _data;
        claims[claimId].uri = _uri;
        claims[claimId].isValid = true;

        claimsByTopic[_topic].push(claimId);

        emit ClaimAdded(
            claimId,
            _topic,
            _scheme,
            msg.sender,
            _signature,
            _data,
            _uri
        );

        return claimId;
    }

    function changeClaim(bytes32 _claimId, uint256 _scheme, address _issuer, bytes calldata _signature, bytes calldata _data, string calldata _uri) external onlyIssuer(_claimId) returns (bool success) {
        address who = keccak256(abi.encodePacked(msg.sender, address(this), claims[_claimId].topic, _data)).toEthSignedMessageHash().recover(_signature);
        require(who == msg.sender, "Claims sender does not seem to be msg.sender");

        claims[_claimId].scheme = _scheme;
        claims[_claimId].issuer = _issuer;
        claims[_claimId].signature = _signature;
        claims[_claimId].data = _data;
        claims[_claimId].uri = _uri;
        claims[_claimId].recipientReview = false;
        claims[_claimId].isValid = true;

        emit ClaimChanged(
            _claimId,
            claims[_claimId].topic,
            _scheme,
            _issuer,
            _signature,
            _data,
            _uri
        );

        return true;

    }

    function removeClaim(bytes32 _claimId) external onlyIssuer(_claimId) returns (bool success) {
        require(claims[_claimId].issuer != msg.sender, "msg.sender should be the claim issuer");

        bytes32 topic = claims[_claimId].topic;
        uint256 scheme = claims[_claimId].scheme;
        address issuer = claims[_claimId].issuer;
        bytes memory signature = claims[_claimId].signature;
        bytes memory data = claims[_claimId].data;
        string memory uri = claims[_claimId].uri;

        claims[_claimId].isValid = false;


        emit ClaimRemoved(
            _claimId,
            topic,
            scheme,
            issuer,
            signature,
            data,
            uri
        );

        return true;
    }

    function toggleReviewClaim(bytes32 _claimId) external onlyOwner returns (bool success) {

        claims[_claimId].recipientReview = !claims[_claimId].recipientReview;

        emit ClaimApprovalToggled(
            _claimId,
            claims[_claimId].topic,
            claims[_claimId].scheme,
            claims[_claimId].issuer,
            claims[_claimId].signature,
            claims[_claimId].data,
            claims[_claimId].uri
        );

        return true;

    }
}