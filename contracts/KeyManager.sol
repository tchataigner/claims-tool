pragma solidity ^0.5.8;
import "./ERC734.sol";
/**
 * @author Thomas Chataigner <Blockchain Partner>
 * @title Key Manager ERC734 Implementation
 */
contract KeyManager is ERC734 {
    /*
     *  Storage
     */
    uint256 constant MANAGEMENT_KEY = 1;
    uint256 constant EXECUTION_KEY = 2;

    mapping(bytes32 => Key) public keyRing;
    bytes32[] public keysIds;

    mapping(uint256 => uint256) requiredApproval; // purpose => nbrApproval
    mapping(uint256 => Transaction) public transactions; // txID => Tx
    mapping (uint256 => mapping(bytes32 => bool)) public confirmations; // confID => keccak256(address) => confirmation
    mapping (uint256 => uint256) public confirmationCount; // // txID => confCount
    uint256 public transactionCount; // nbrTx
    struct Transaction {
        uint256 purpose;
        address destination;
        uint256 value;
        bytes data;
        bool executed;
    }

    /*
     *  Modifiers
     */
    modifier onlyManagementKeyOrSelf() {
        if (msg.sender != address(this)) {
            require(keyHasPurpose(keccak256(abi.encodePacked(msg.sender)), MANAGEMENT_KEY), "Only owner or management keys can call this function");
        }
        _;
    }
    /**
     * @dev Contract constructor set message sender as manager and executioner
     */
    constructor() public {
        bytes32 key = keccak256(abi.encodePacked(msg.sender));
        keyRing[key].keyType = 1; // ECDSA_TYPE
        keyRing[key].purposes = 3; // MANAGEMENT_KEY + EXECUTION_KEY
        keysIds.push(key);
    }

    /*
     *  Public Functions
     */

    /**
     * @dev Return key data
     * @param _key the key we are looking for
     * @return uint256 purposes purposes of the key represented by bitmask
     * @return uint256 keyType type of the key (ECDSA, RSA)
     * @return bytes32 key the key itself
     */
    function getKey(bytes32 _key) external view returns(uint256 purposes, uint256 keyType, bytes32 key) {
        return (keyRing[_key].purposes, keyRing[_key].keyType, _key);
    }
    /**
     * @dev Return if the key has a designated purpose
     * @param _key the key we are checking
     * @param _purpose the purpose that we want to verify. Should be a power of 2
     * @return bool exists reflect if the key has the designated purpose
     */
    function keyHasPurpose(bytes32 _key, uint256 _purpose) public view returns (bool exists) {
        require(_purpose != 0 && (_purpose & (_purpose - uint256(1))) == 0, "Purpose must be power of two");
        return (keyRing[_key].purposes & _purpose) != 0;
    }
    /**
     * @dev Add a new key to the key manager
     * @param _key the key we are adding
     * @param _purposes the bitmask of the purposes of the key
     * @param _keyType the type of key associated to _key
     * @return bool success reflects if the key has been correctly added
     */
    function addKey(bytes32 _key, uint256 _purposes, uint256 _keyType) external onlyManagementKeyOrSelf() returns (bool success) {
        require(_key != 0x0, "Invalid Key");
        keyRing[_key].purposes = _purposes;
        keyRing[_key].keyType = _keyType;
        keysIds.push(_key);
        emit KeyAdded(_key,  _purposes, _keyType);
        return true;
    }
    /**
     * @dev Remove a key to the key manager
     * @param _key the key we are removing
     * @return bool success reflects if the key has been correctly removed
     */
    function removeKey(bytes32 _key) external onlyManagementKeyOrSelf() returns (bool success) {
        require(_key != 0x0, "Invalid Key");
        Key memory key = keyRing[_key];
        delete keyRing[_key];
        emit KeyRemoved(_key, key.purposes, key.keyType);
        return true;
    }
    /**
     * @dev Return number of keys added in the manager
     * @return uint256 count number of keys added to the manager
     */
    function getKeyCount() public view returns (uint256 count) {
        return keysIds.length;
    }
    /**
     * @dev Change the number of keys needed to execute a transaction
     * @param _purpose purpose to be affected by the change
     * @param _number new number of keys needed to execute the transaction
     */
    function changeKeysRequired(uint256 _purpose, uint256 _number) external onlyManagementKeyOrSelf {
        requiredApproval[_purpose] = _number;
        emit KeysRequiredChanged(_purpose, _number);
    }
    /**
     * @dev Return the number of  approval needed for a given purpose
     * @param _purpose purpose to be checked
     * @return count number of keys needed to execute the transaction
     */
    function getKeysRequired(uint256 _purpose) external view returns(uint256 count) {
        return requiredApproval[_purpose];
    }

    /**
     * @dev Change the number of keys needed to execute a transaction
     * @param _to address to send transaction to
     * @param _value value to send with the transaction
     * @param _data data to pass with the transaction
     * @return uint256 executionId is the transaction key in the storage mapping
     */
    function execute(address _to, uint256 _value, bytes calldata _data) external returns (uint256 executionId) {
        require(_to != address(0), "_to should not be address 0x0");

        uint256 purpose = _to == address(this) ? MANAGEMENT_KEY : EXECUTION_KEY;

        executionId = addTransaction(_to, _value, _data, purpose);

        approve(executionId, true);

        return executionId;
    }

    /**
     * @dev Approve for a transaction execution
     * @param _executionId execution id to approve
     * @param _approve boolean that represent the approval
     * @return bool success reflects if the approval process has been completed
     */
    function approve(uint256 _executionId, bool _approve) public returns (bool success) {
        require(
            keyHasPurpose(keccak256(abi.encodePacked(msg.sender)), transactions[_executionId].purpose),
            "Purpose can not be approved with this key"
        );
        confirmations[_executionId][keccak256(abi.encodePacked(msg.sender))] = _approve;
        emit Approved(_executionId, _approve);
        executeTransaction(_executionId);
        return true;
    }

    /*
     * Internal Functions to handle multisig
     */

    /**
     * @dev Adds a new transaction to the transaction mapping, if transaction does not exist yet.
     * @param _to Transaction target address.
     * @param _value Transaction ether value.
     * @param _data Transaction data payload.
     * @param _purpose Purpose of the TX, 1 if destination is self, otherwise 2.
     * @return uint256 executionId Returns transaction ID.
     */
    function addTransaction(address _to, uint256 _value, bytes memory _data, uint256 _purpose)
    internal
    returns (uint256 executionId)
    {
        executionId = transactionCount;
        transactions[executionId] = Transaction({
            purpose: _purpose,
            destination: _to,
            value: _value,
            data: _data,
            executed: false
            });
        transactionCount += 1;
        emit ExecutionRequested(executionId, _to, _value, _data);
    }

    /**
     * @dev Allows anyone to execute a confirmed transaction.
     * @param _executionId Transaction Transaction ID to execute.
     */
    function executeTransaction(uint256 _executionId)
    public
    {
        if (isConfirmed(_executionId)) {
            Transaction storage txn = transactions[_executionId];
            txn.executed = true;
            require (external_call(txn.destination, txn.value, txn.data.length, txn.data), "External call has failed");
            emit Executed(_executionId, txn.destination, txn.value, txn.data);
        }
    }

    /**
     * @dev Checks if a Transaction has enough approvals to execute.
     * @param _executionId Transaction Transaction ID to execute.
     * @return bool succes Returns if the Transaction can be executed.
     */
    function isConfirmed(uint256 _executionId)
    public
    view
    returns (bool succes)
    {
        Transaction storage txn = transactions[_executionId];
        uint256 count = 0;
        for (uint256 i=0; i<keysIds.length; i++) {
            if (keyHasPurpose(keysIds[i], txn.purpose) && confirmations[_executionId][keysIds[i]])
                count += 1;
            if (count >= requiredApproval[txn.purpose])
                succes = true;
        }
    }

    // copied from GnosisSafe
    // https://github.com/gnosis/MultiSigWallet/blob/master/contracts/MultiSigWallet.sol
    function external_call(address _to, uint256 _value, uint256 _dataLength, bytes memory _data) internal returns (bool) {
        bool result;
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            let x := mload(0x40)   // "Allocate" memory for output (0x40 is where "free memory" pointer is stored by convention)
            let d := add(_data, 32) // First 32 bytes are the padded length of data, so exclude that
            result := call(
            sub(gas, 34710),   // 34710 is the value that solidity is currently emitting
            // It includes callGas (700) + callVeryLow (3, to pay for SUB) + callValueTransferGas (9000) +
            // callNewAccountGas (25000, in case the destination address does not exist and needs creating)
            _to,
            _value,
            d,
            _dataLength,        // Size of the input (in bytes) - this is what fixes the padding problem
            x,
            0                  // Output is ignored, therefore the output size is zero
            )
        }
        return result;
    }

    /**
     * @dev Returns number of confirmations of a transaction.
     * @param _executionId Transaction ID.
     * @return uint256 count Number of confirmations.
     */
    function getConfirmationCount(uint256 _executionId)
    public
    view
    returns (uint256 count)
    {
        Transaction storage txn = transactions[_executionId];
        for (uint256 i=0; i<keysIds.length; i++) {
            if (keyHasPurpose(keysIds[i], txn.purpose) && confirmations[_executionId][keysIds[i]])
                count += 1;
        }
    }

    /**
     * @dev Returns total number of transactions after filers are applied.
     * @param _pending Include pending transactions.
     * @param _executed Include executed transactions.
     * @return uint256 count Total number of transactions after filters are applied.
     */
    function getTransactionCount(bool _pending, bool _executed)
    public
    view
    returns (uint256 count)
    {
        for (uint256 i=0; i<transactionCount; i++)
            if (   _pending && !transactions[i].executed
            || _executed && transactions[i].executed)
                count += 1;
    }


    /**
     * @dev Returns array with owner addresses, which confirmed transaction.
     * @param _executionId Transaction ID.
     * @return bytes32[] memory _confirmations Returns array of owner addresses.
     */
    function getConfirmations(uint256 _executionId)
    public
    view
    returns (bytes32[] memory _confirmations)
    {
        Transaction storage txn = transactions[_executionId];
        bytes32[] memory confirmationsTemp = new bytes32[](keysIds.length);
        uint256 count = 0;
        uint256 i;
        for (i=0; i<keysIds.length; i++)
            if (keyHasPurpose(keysIds[i], txn.purpose) && confirmations[_executionId][keysIds[i]]) {
                confirmationsTemp[count] = keysIds[i];
                count += 1;
            }
        _confirmations = new bytes32[](count);
        for (i=0; i<count; i++)
            _confirmations[i] = confirmationsTemp[i];
    }

    /**
     * @dev Returns list of transaction IDs in defined range.
     * @param _from Index start position of transaction array.
     * @param _to Index end position of transaction array.
     * @param _pending Include pending transactions.
     * @param _executed Include executed transactions.
     * @return uint256[] memory _executionsIds Returns array of transaction IDs.
     */
    function getTransactionIds(uint256 _from, uint256 _to, bool _pending, bool _executed)
    public
    view
    returns (uint256[] memory _executionsIds)
    {
        uint256[] memory executionsIdsTemp = new uint256[](transactionCount);
        uint256 count = 0;
        uint256 i;
        for (i=0; i<transactionCount; i++)
            if (   _pending && !transactions[i].executed
            || _executed && transactions[i].executed)
            {
                executionsIdsTemp[count] = i;
                count += 1;
            }
        _executionsIds = new uint[](_to - _from);
        for (i=_from; i<_to; i++)
            _executionsIds[i - _from] = executionsIdsTemp[i];
    }

    function getKeysByPurpose(uint256 _purpose)
    public
    view
    returns (bytes32[] memory _keys)
    {
        uint256[] memory keysIdsTmp = new uint256[](keysIds.length);
        uint256 count = 0;
        uint256 i;
        for (i=0; i<keysIds.length; i++)
            if (keyHasPurpose(keysIds[i], _purpose))
            {
                keysIdsTmp[count] = i;
                count += 1;
            }
        _keys = new bytes32[](count);
        for (i=0; i<count; i++)
            _keys[i] = keysIds[keysIdsTmp[i]];
    }
}