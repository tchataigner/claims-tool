pragma solidity ^0.5.2;

import "./ERC725.sol";
/**
 * @author Thomas Chataigner <Blockchain Partner>
 * @title Proxy Account ERC725 Implementation
 */
contract ProxyAccount is ERC725 {
    /*
     *  Storage
     */
    uint256 constant OPERATION_CALL = 0;
    uint256 constant OPERATION_CREATE = 1;
    bytes32 constant KEY_OWNER = 0x0000000000000000000000000000000000000000000000000000000000000000;

    mapping(bytes32 => bytes) public store;


    event DataChanged(bytes32 indexed key, bytes value);
    event OwnerChanged(address indexed ownerAddress);
    event ContractCreated(address indexed contractAddress);

    /**
     * @dev Contract constructor set _owner parameter as owner
     * @param _owner the owner of the proxy account
     */
    constructor(address _owner) public {
        store[KEY_OWNER] = toBytes(_owner);
    }

    /**
     * @dev Checks that msg sender is owner
     */
    modifier onlyOwner() {
        require(msg.sender == toAddress(store[KEY_OWNER]), "only-owner-allowed");
        _;
    }

    /**
     * @dev Converts bytes to address type
     * @param _b the bytes to convert
     * @return address a is the address that got converted
     */
    function toAddress(bytes memory _b) internal pure returns (address a){
        assembly {
            a := mload(add(_b, 20))
        }
        return a;
    }

    /**
     * @dev Converts address to bytes type
     * @param _a the address to convert
     * @return bytes memory b are the bytes that got converted
     */
    function toBytes(address _a) internal pure returns (bytes memory b){
        return abi.encodePacked(_a);
    }

    /*
     *  Public Functions
     */

    /**
     * @dev Changes the owner address of the contract
     * @param _owner the new owner address
     */
    function changeOwner(address _owner) external onlyOwner {
        store[KEY_OWNER] = toBytes(_owner);

        emit OwnerChanged(_owner);
    }

    /**
     * @dev Get bytes data stored on the proxy account
     * @param _key The key of the data we are looking for
     * @return bytes memory _value is the value at the given _key
     */
    function getData(bytes32 _key) external view returns (bytes memory _value) {
        return store[_key];
    }

    /**
     * @dev Set bytes data stored on the proxy account
     * @param _key The key of the data we wish to set
     * @param _value The value at the given _key
     */
    function setData(bytes32 _key, bytes calldata _value) external onlyOwner {
        store[_key] = _value;
        emit DataChanged(_key, _value);
    }

    /**
     * @dev Function to execute a given operation. Ad of now can either be a call or a contract creation
     * @param _operationType Operation we wish to accomplish
     * @param _to Transaction target address.
     * @param _value Transaction ether value.
     * @param _data Transaction data payload.
     */
    function execute(uint256 _operationType, address _to, uint256 _value, bytes calldata _data) external onlyOwner {
        if (_operationType == OPERATION_CALL) {
            executeCall(_to, _value, _data);
        } else if (_operationType == OPERATION_CREATE) {
            address newContract = executeCreate(_data);
            emit ContractCreated(newContract);
        } else {
            // We don't want to spend users gas if parameters are wrong
            revert();
        }
    }

    // copied from GnosisSafe
    // https://github.com/gnosis/MultiSigWallet/blob/master/contracts/MultiSigWallet.sol
    function executeCall(address to, uint256 value, bytes memory data)
    internal
    returns (bool success)
    {
        uint dataLength = data.length;
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            let x := mload(0x40)    // "Allocate" memory for output (0x40 is where "free memory" pointer is stored by convention)
            let d := add(data, 32)  // First 32 bytes are the padded length of data, so exclude that
            success := call(
            sub(gas, 34710),      // 34710 is the value that solidity is currently emitting
            // It includes callGas (700) + callVeryLow (3, to pay for SUB) + callValueTransferGas (9000) +
            // callNewAccountGas (25000, in case the destination address does not exist and needs creating)
            to,
            value,
            d,
            dataLength,           // Size of the input (in bytes) - this is what fixes the padding problem
            x,
            0                     // Output is ignored, therefore the output size is zero
            )
            switch success
            case 0 { revert(x, dataLength) }
            case 1 { return(x, dataLength) }
        }
    }

    function executeCreate(bytes memory data)
    internal
    returns (address newContract)
    {
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            newContract := create(0, add(data, 0x20), mload(data))
        }
    }
}