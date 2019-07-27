const KeyManager = artifacts.require('./KeyManager.sol');
const ProxyAccount = artifacts.require('./ProxyAccount.sol');
const ClaimHolder = artifacts.require('./ClaimHolder.sol');

module.exports = async function(deployer) {
    await deployer.deploy(KeyManager);

    await deployer.deploy(ProxyAccount, KeyManager.address);

    await deployer.deploy(ClaimHolder, ProxyAccount.address);
};