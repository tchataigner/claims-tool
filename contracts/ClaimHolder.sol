pragma solidity ^0.5.2;

import './ERC735.sol';

/**
 * @author Thomas Chataigner <Blockchain Partner>
 * @title Proxy Account ERC725 Implementation
 */
contract ClaimHolder is ERC735 {

    address public owner;

    bytes32[] public topics;

    mapping(bytes32 => bool) public existingTopic;

    mapping(bytes32 => Claim) public claims;

    mapping(bytes32 => bytes32[]) public claimsByTopic;

    modifier onlyIssuer(bytes32 _claimId) {
        require(claims[_claimId].issuer == msg.sender, "msg.sender should be the claim issuer");

        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "msg.sender should be the owner");

        _;
    }

    constructor(address _owner) public {
        owner = _owner;
    }

    function getClaim(bytes32 _claimId) external view returns(bytes32 topic, uint256 scheme, address issuer, bytes memory data, string memory uri, bool recipientReview, bool isValid) {
        Claim storage c = claims[_claimId];
        return(c.topic, c.scheme, c.issuer, c.data, c.uri, c.recipientReview, c.isValid);
    }

    function getTopics() external view returns(bytes32[] memory createdTopics) {
        return topics;
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

    function addClaim(bytes32 _topic, uint256 _scheme, bytes calldata _data, string calldata _uri) external returns (bytes32 claimRequestId) {

        claimRequestId = keccak256(abi.encodePacked(msg.sender, owner, _topic));

        if(!existingTopic[_topic]) {
            topics.push(_topic);
            existingTopic[_topic] = true;
        }

        claims[claimRequestId].topic = _topic;
        claims[claimRequestId].scheme = _scheme;
        claims[claimRequestId].issuer = msg.sender;
        claims[claimRequestId].data = _data;
        claims[claimRequestId].uri = _uri;
        claims[claimRequestId].isValid = true;

        claimsByTopic[_topic].push(claimRequestId);

        emit ClaimAdded(
            claimRequestId,
            _topic,
            _scheme,
            msg.sender,
            _data,
            _uri
        );

        return claimRequestId;
    }

    function changeClaim(bytes32 _claimId, uint256 _scheme, bytes calldata _data, string calldata _uri) external onlyIssuer(_claimId) returns (bool success) {

        Claim storage claim = claims[_claimId];

        claim.scheme = _scheme;
        claim.data = _data;
        claim.uri = _uri;
        claim.recipientReview = false;
        claim.isValid = true;

        emit ClaimChanged(
            _claimId,
            claim.topic,
            _scheme,
            claim.issuer,
            _data,
            _uri
        );

        return true;

    }

    function removeClaim(bytes32 _claimId) external onlyIssuer(_claimId) returns (bool success) {
        bytes32 topic = claims[_claimId].topic;
        uint256 scheme = claims[_claimId].scheme;
        address issuer = claims[_claimId].issuer;
        bytes memory data = claims[_claimId].data;
        string memory uri = claims[_claimId].uri;

        claims[_claimId].isValid = false;


        emit ClaimRemoved(
            _claimId,
            topic,
            scheme,
            issuer,
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
            claims[_claimId].data,
            claims[_claimId].uri
        );

        return true;

    }
}