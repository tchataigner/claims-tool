pragma solidity ^0.5.8;

contract ERC734 {
    event KeyAdded(bytes32 indexed key, uint256 indexed purposes, uint256 indexed keyType);
    event KeyRemoved(bytes32 indexed key, uint256 indexed purposes, uint256 indexed keyType);
    event ExecutionRequested(uint256 indexed executionId, address indexed to, uint256 indexed value, bytes data);
    event ExecutionFailure(uint256 indexed executionId, address indexed to, uint256 indexed value, bytes data);
    event Executed(uint256 indexed executionId, address indexed to, uint256 indexed value, bytes data);
    event Approved(uint256 indexed executionId, bool approved);
    event KeysRequiredChanged(uint256 purpose, uint256 number);
    struct Key {
        // Purposes are represented via bitmasks
        // Maximum number of purposes is 256 and must be integers that are power of 2 e.g.:
        // 1, 2, 4, 8, 16, 32, 64 ...
        // All other integers represent multiple purposes e.g:
        // Integer 3 (011) represent both 1 (001) and 2 (010) purpose
        uint256 purposes;
        uint256 keyType; // e.g. 1 = ECDSA, 2 = RSA, etc.
    }
    function getKey(bytes32 _key) external view returns(uint256 purposes, uint256 keyType, bytes32 key);
    function keyHasPurpose(bytes32 _key, uint256 _purpose) public view returns (bool exists);
    function addKey(bytes32 _key, uint256 _purposes, uint256 _keyType) external returns (bool success);
    function removeKey(bytes32 _key) external returns (bool success);
    function changeKeysRequired(uint256 _purpose, uint256 _number) external;
    function getKeysRequired(uint256 _purpose) external view returns(uint256 count);
    function execute(address _to, uint256 _value, bytes calldata _data) external returns (uint256 executionId);
    function approve(uint256 _executionId, bool _approve) public returns (bool success);
}