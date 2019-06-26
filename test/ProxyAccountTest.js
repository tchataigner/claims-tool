const ProxyAccount = artifacts.require("ProxyAccount");
const Calle = artifacts.require("Calle");
const truffleAssert = require('truffle-assertions');

const BigNumber = require('bignumber.js');

require('chai').expect();

const DATA_CALL_EXT = "0x7c5075c10000000000000000000000000000000000000000000000000000000000000005";
const DATA_CALL_ERROR = "0xcf50f15f00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002";
const DATA_CREATE = "0x608060405234801561001057600080fd5b5060ba8061001f6000396000f3fe6080604052348015600f57600080fd5b506004361060325760003560e01c806309efb8ff1460375780637c5075c1146053575b600080fd5b603d607e565b6040518082815260200191505060405180910390f35b607c60048036036020811015606757600080fd5b81019080803590602001909291905050506084565b005b60005481565b806000819055505056fea165627a7a72305820bc8ca8fb9c6734ae73689b8009e6d01921ae1073cad43e6bc8d5fd1a8449edfb0029";
const DATA_CREATE_ERROR = "0x5566";

contract('Proxy Account', ([owner, random]) => {
    let proxyAccountInstance;
    let calleInstance;

    describe("Constructor", function () {
        before(async () => {
            proxyAccountInstance = await ProxyAccount.new(owner, {from: owner});
        });

        it('Checks that owner value is set', async () => {
            let payload = await proxyAccountInstance.getData("0x0000000000000000000000000000000000000000000000000000000000000000");
            expect(web3.utils.toChecksumAddress(payload)).to.eq(web3.utils.toChecksumAddress(owner));
        });
    });

    describe("Change Owner", function () {
        beforeEach(async () => {
            proxyAccountInstance = await ProxyAccount.new(owner, {from: owner});
        });

        it('Checks that only current owner can change owner', async () => {
            await truffleAssert.reverts(
                proxyAccountInstance.changeOwner(
                    random,
                    {from: random}
                ),
                "only-owner-allowed"
            );
        });

        it('Checks that owner value is updated', async () => {
            await proxyAccountInstance.changeOwner(
                    random,
                    {from: owner}
                );

            let payload = await proxyAccountInstance.getData("0x0000000000000000000000000000000000000000000000000000000000000000");

            expect(web3.utils.toChecksumAddress(payload)).to.eq(web3.utils.toChecksumAddress(random));

        });

        it('Checks that OwnerChanged event is fired', async () => {
            let receipt = await proxyAccountInstance.changeOwner(
                random,
                {from: owner}
            );

            receipt.logs.forEach((log) => {
                expect(log.event).to.eq("OwnerChanged");

                expect(log.args.ownerAddress).to.eq(random);
            });
        });
    });

    describe("Set Data", function () {
        beforeEach(async () => {
            proxyAccountInstance = await ProxyAccount.new(owner, {from: owner});
        });

        it('Checks that only current owner can set data', async () => {
            await truffleAssert.reverts(
                proxyAccountInstance.setData(
                    web3.utils.sha3('ProxyAccount'),
                    web3.utils.toChecksumAddress(proxyAccountInstance.address),
                    {from: random}
                ),
                "only-owner-allowed"
            );
        });

        it('Checks that data is set', async () => {
            await proxyAccountInstance.setData(
                web3.utils.sha3('ProxyAccount'),
                web3.utils.toChecksumAddress(proxyAccountInstance.address),
                {from: owner}
            );

            let payload = await proxyAccountInstance.getData(web3.utils.sha3('ProxyAccount'));

            expect(web3.utils.toChecksumAddress(payload)).to.eq(web3.utils.toChecksumAddress(proxyAccountInstance.address));

        });

        it('Checks that DataChanged event is fired', async () => {
            let receipt = await proxyAccountInstance.setData(
                web3.utils.sha3('ProxyAccount'),
                web3.utils.toChecksumAddress(proxyAccountInstance.address),
                {from: owner}
            );

            receipt.logs.forEach((log) => {
                expect(log.event).to.eq("DataChanged");

                expect(log.args.key).to.eq(web3.utils.sha3('ProxyAccount'));
                expect(web3.utils.toChecksumAddress(log.args.value)).to.eq(web3.utils.toChecksumAddress(proxyAccountInstance.address));
            });
        });
    });

    describe("Get Data", function () {
        beforeEach(async () => {
            proxyAccountInstance = await ProxyAccount.new(owner, {from: owner});
            calleInstance = await Calle.new({from: owner});
        });

        it('Checks that data is properly fetched', async () => {
            await proxyAccountInstance.setData(
                web3.utils.sha3('ProxyAccount'),
                web3.utils.toChecksumAddress(proxyAccountInstance.address),
                {from: owner}
            );

            let payload = await proxyAccountInstance.getData(web3.utils.sha3('ProxyAccount'));

            expect(web3.utils.toChecksumAddress(payload)).to.eq(web3.utils.toChecksumAddress(proxyAccountInstance.address));
        });
    });

    describe("Execute Call", function () {
        beforeEach(async () => {
            proxyAccountInstance = await ProxyAccount.new(owner, {from: owner});
        });

        it('Checks that only current owner can execute', async () => {
            await truffleAssert.reverts(
                proxyAccountInstance.execute(
                    0,
                    calleInstance.address,
                    0,
                    DATA_CALL_EXT,
                    {from: random}
                ),
                "only-owner-allowed"
            );
        });

        it('Checks that execute revert if type does not exists', async () => {
            await truffleAssert.reverts(
                proxyAccountInstance.execute(
                    4,
                    calleInstance.address,
                    0,
                    DATA_CALL_EXT,
                    {from: owner}
                )
            );
        });

        it('Checks that execute revert if call does not pass', async () => {
            await truffleAssert.reverts(
                proxyAccountInstance.execute(
                    0,
                    calleInstance.address,
                    0,
                    DATA_CALL_ERROR,
                    {from: owner}
                )
            );
        });

        it('Checks that call works', async () => {
            await proxyAccountInstance.execute(
                0,
                calleInstance.address,
                0,
                DATA_CALL_EXT,
                {from: owner}
            );

            let integer = await calleInstance.integer();
            expect((new BigNumber(integer)).toNumber()).to.eq(5);

        });

        it('Checks that ExecutedCall event is fired', async () => {
            let receipt = await proxyAccountInstance.execute(
                0,
                calleInstance.address,
                0,
                DATA_CALL_EXT,
                {from: owner}
            );

            receipt.logs.forEach((log) => {
                expect(log.event).to.eq("ExecutedCall");

                expect((new BigNumber(log.args.value)).toNumber()).to.eq(0);
                expect(log.args.to).to.eq(calleInstance.address);
                expect(log.args.data).to.eq(DATA_CALL_EXT);
            });
        });
    });

    describe("Execute Create", function () {
        beforeEach(async () => {
            proxyAccountInstance = await ProxyAccount.new(owner, {from: owner});
        });

        it('Checks that only current owner can execute', async () => {
            await truffleAssert.reverts(
                proxyAccountInstance.execute(
                    1,
                    calleInstance.address,
                    0,
                    DATA_CREATE,
                    {from: random}
                ),
                "only-owner-allowed"
            );
        });

        it('Checks that execute revert if type does not exists', async () => {
            await truffleAssert.reverts(
                proxyAccountInstance.execute(
                    4,
                    calleInstance.address,
                    0,
                    DATA_CREATE,
                    {from: owner}
                )
            );
        });

        it('Checks that execute revert if create does not pass', async () => {
            await truffleAssert.reverts(
                proxyAccountInstance.execute(
                    1,
                    calleInstance.address,
                    0,
                    DATA_CREATE_ERROR,
                    {from: owner}
                )
            );
        });

        it('Checks that create works', async () => {
            let receipt = await proxyAccountInstance.execute(
                1,
                calleInstance.address,
                0,
                DATA_CREATE,
                {from: owner}
            );

            calleInstance = await Calle.at(receipt.logs[0].args.contractAddress);

            await calleInstance.changeInteger(5);

            let integer = await calleInstance.integer();
            expect((new BigNumber(integer)).toNumber()).to.eq(5);

        });

        it('Checks that ContractCreated event is fired', async () => {
            let receipt = await proxyAccountInstance.execute(
                1,
                calleInstance.address,
                0,
                DATA_CREATE,
                {from: owner}
            );

            receipt.logs.forEach((log) => {
                expect(log.event).to.eq("ContractCreated");

                expect(Object.keys(log.args).filter(key => key === "contractAddress").length).to.eq(1);
            });
        });
    });
});