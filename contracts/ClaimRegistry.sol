
pragma solidity ^0.5.2;

import './ERC780.sol';

contract ClaimRegistry is ERC780 {

    mapping(address => mapping(address => mapping(bytes32 => bytes))) public registry;

    address[] private recipient;
    mapping(address => address[]) private issuerPerRecipient;
    mapping(address => mapping(address => bytes32[])) private issuerTopicPerRecipient;



    // create or update clams
    function setClaim(address _recipient, bytes32 _topic, bytes calldata _data) external {
        registry[_recipient][msg.sender][_topic] = _data;

        if(!isRecipient(_recipient)) {
            recipient.push(_recipient);
        }

        if(!hasIssuedForRecipient(_recipient, msg.sender)) {
            issuerPerRecipient[_recipient].push(msg.sender);
        }

        if(!hasIssuedTopic(_recipient, msg.sender, _topic)) {
            issuerTopicPerRecipient[_recipient][msg.sender].push(_topic);
        }

        emit ClaimSet(
            msg.sender,
            _recipient,
            _topic,
            _data
        );
    }

    function removeClaim(address _recipient, bytes32 _topic) external {
        delete registry[_recipient][msg.sender][_topic];

        emit ClaimRemoved(
            msg.sender,
            _recipient,
            _topic
        );
    }

    function isRecipient(address _recipient) public view returns(bool alreadyRecipent) {
        uint256 i;
        for(i=0; i<recipient.length; i++){
            if(_recipient == recipient[i]){
                alreadyRecipent = true;
                break;
            }
        }
    }

    function getClaim(address _recipient, address _issuer, bytes32 _topic) external view returns(bytes memory data) {
        return registry[_recipient][_issuer][_topic];
    }

    function getRecipients() external view returns(address[] memory recipients) {
        return recipient;
    }

    function getIssuers() external view returns(address[] memory issuers) {
        uint256 i;
        for (i=0; i<recipient.length; i++) {
            address[] memory perRecipient = getIssuerForRecipient(recipient[i]);
            if (perRecipient.length > 0) {
                address[] memory issuersTmp = new address[](issuers.length + perRecipient.length);
                uint256 countTmp = 0;
                uint256 j;
                for (j=0; j<issuers.length; j++) {
                    issuersTmp[countTmp] = issuers[j];
                    countTmp += 1;
                }
                for (j=0; j<perRecipient.length; j++) {
                    issuersTmp[countTmp] = perRecipient[j];
                    countTmp += 1;
                }
                issuers = issuersTmp;
            }
        }
        return issuers;
    }

    function getTopics() external view returns(bytes32[] memory topics) {
        uint256 i;
        for (i=0; i<recipient.length; i++) {
            address[] memory perRecipient = getIssuerForRecipient(recipient[i]);

            if (perRecipient.length > 0) {
                uint256 j;
                for (j=0; j<perRecipient.length; j++) {
                    bytes32[] memory topicPerIssuer = getIssuerTopicForRecipient(recipient[i], perRecipient[j]);
                    if(topicPerIssuer.length > 0) {
                        bytes32[] memory topicsTmp = new bytes32[](topics.length + topicPerIssuer.length);

                        uint256 countTmp = 0;
                        uint256 k;
                        for (k=0; k<topics.length; k++) {
                            topicsTmp[countTmp] = topics[k];
                            countTmp += 1;
                        }
                        for (k=0; k<perRecipient.length; k++) {
                            topicsTmp[countTmp] = topicPerIssuer[k];
                            countTmp += 1;
                        }
                        topics = topicsTmp;
                    }
                }
            }
        }
        return topics;
    }

    function getIssuerForRecipient(address _recipient) public view returns(address[] memory issuers) {
        address[] memory nonFilteredIssuers = issuerPerRecipient[_recipient];

        uint256[] memory issuersTmp = new uint256[](nonFilteredIssuers.length);
        uint256 count = 0;
        uint256 i;
        for (i=0; i<nonFilteredIssuers.length; i++)
            if (getIssuerTopicForRecipient(_recipient, nonFilteredIssuers[i]).length > 0)
                issuersTmp[count] = i;
        count += 1;
        issuers = new address[](count);
        for (i=0; i<count; i++)
            issuers[i] = nonFilteredIssuers[issuersTmp[i]];
    }

    function getIssuerForRecipientTopic(address _recipient, bytes32 _topic) public view returns(address[] memory issuers) {
        address[] memory nonFilteredRecipientIssuers = getIssuerForRecipient(_recipient);

        uint256[] memory issuersTmp = new uint256[](nonFilteredRecipientIssuers.length);
        uint256 count = 0;
        uint256 i;
        for (i=0; i<nonFilteredRecipientIssuers.length; i++)
            if (hasIssuedTopic(_recipient, nonFilteredRecipientIssuers[i], _topic))
                issuersTmp[count] = i;
        count += 1;
        issuers = new address[](count);
        for (i=0; i<count; i++)
            issuers[i] = nonFilteredRecipientIssuers[issuersTmp[i]];
        return issuers;
    }

    function getIssuerTopicForRecipient(address _recipient, address _issuer) public view returns(bytes32[] memory topics) {
        bytes32[] memory nonFilteredTopics = issuerTopicPerRecipient[_recipient][_issuer];

        uint256[] memory topicsTmp = new uint256[](nonFilteredTopics.length);
        uint256 count = 0;
        uint256 i;
        for (i=0; i<nonFilteredTopics.length; i++) {
            if (hasIssuedTopic(_recipient, _issuer, nonFilteredTopics[i])) {
                topicsTmp[count] = i;
                count += 1;
            }
        }

        topics = new bytes32[](count);
        for (i=0; i<count; i++){
            topics[i] = nonFilteredTopics[topicsTmp[i]];
        }
        return topics;
    }

    function hasIssuedForRecipient(address _recipient, address _issuer) public view returns(bool issued) {
        return getIssuerTopicForRecipient(_recipient, _issuer).length > 0;
    }

    function hasIssuedTopic(address _recipient, address _issuer, bytes32 _topic) public view returns(bool issued) {
        return registry[_recipient][_issuer][_topic].length > 0;
    }

    function getRecipientForIssuerTopic(address _issuer, bytes32 _topic) public view returns(address[] memory recipients) {
        uint256[] memory recipientsTmp = new uint256[](recipient.length);
        uint256 count = 0;
        uint256 i;
        for (i=0; i<recipient.length; i++)
            if (hasIssuedTopic(recipient[i], _issuer, _topic))
                recipientsTmp[count] = i;
        count += 1;
        recipients = new address[](count);
        for (i=0; i<count; i++)
            recipients[i] = recipient[recipientsTmp[i]];
        return recipients;
    }
}