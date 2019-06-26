const KeyManager = artifacts.require("KeyManager");
const Calle = artifacts.require("Calle");
const truffleAssert = require('truffle-assertions');

const BigNumber = require('bignumber.js');

require('chai').expect();

const DATA_CALL_EXT = "0x7c5075c10000000000000000000000000000000000000000000000000000000000000005";
const DATA_CALL_SELF = "0xcf50f15f00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002";

contract('Key Manager', ([owner, random]) => {
    let keyManagerInstance;
    let calleInstance;

    describe("Constructor", function () {
        before(async () => {
            keyManagerInstance = await KeyManager.new({from: owner});
        });

        it('Checks that key is added on key ring', async () => {
            let payload = await keyManagerInstance.keysIds(0);
            expect(payload).to.eq(web3.utils.sha3(owner));
        });

        it('Checks that key has purpose of 3 (1 + 2)', async () => {
            expect(await keyManagerInstance.keyHasPurpose(web3.utils.sha3(owner), 1)).to.eq(true);
            expect(await keyManagerInstance.keyHasPurpose(web3.utils.sha3(owner), 2)).to.eq(true);
        });

        it('Checks that key is of type ECDSA', async () => {
            let payload = await keyManagerInstance.getKey(web3.utils.sha3(owner));
            expect((new BigNumber(payload.keyType)).toNumber()).to.eq(1);
        });
    });

    describe("Get Key", function () {
        before(async () => {
            keyManagerInstance = await KeyManager.new({from: owner});
        });

        it('Checks that correct information are fetched', async () => {
            let payload = await keyManagerInstance.getKey(web3.utils.sha3(owner));
            expect((new BigNumber(payload.keyType)).toNumber()).to.eq(1);
            expect((new BigNumber(payload.purposes)).toNumber()).to.eq(3);
            expect(payload.key).to.eq(web3.utils.sha3(owner));
        });
    });

    describe("Key Has Purpose", function () {
        before(async () => {
            keyManagerInstance = await KeyManager.new({from: owner});
        });

        it('Checks that purpose parameters needs to be a power of 2', async () => {
            await truffleAssert.reverts(
                keyManagerInstance.keyHasPurpose(
                    web3.utils.sha3(owner),
                    0
                ),
                "Purpose must be power of two"
            );

            await truffleAssert.reverts(
                keyManagerInstance.keyHasPurpose(
                    web3.utils.sha3(owner),
                    9
                ),
                "Purpose must be power of two"
            );
        });

        it('Checks that returned boolean is correct', async () => {
            let negative = await keyManagerInstance.keyHasPurpose(web3.utils.sha3(owner), 8);
            let positive = await keyManagerInstance.keyHasPurpose(web3.utils.sha3(owner), 1);

            expect(negative).to.eq(false);
            expect(positive).to.eq(true);
        });
    });

    describe("Add Key", function () {
        beforeEach(async () => {
            keyManagerInstance = await KeyManager.new({from: owner});
        });

        it('Checks that only a management key or owner can add a key', async () => {
            await truffleAssert.reverts(
                keyManagerInstance.addKey(
                    web3.utils.sha3(random),
                    2,
                    1,
                    {from: random}
                ),
                "Only owner or management keys can call this function"
            );
        });

        it('Checks that added key cannot be 0', async () => {
            await truffleAssert.reverts(
                keyManagerInstance.addKey(
                    "0x0000000000000000000000000000000000000000000000000000000000000000",
                    2,
                    1,
                    {from: owner}
                ),
                "Invalid Key"
            );
        });

        it('Checks that key is added on key ring', async () => {
            await keyManagerInstance.addKey(
                web3.utils.sha3(random),
                2,
                1,
                {from: owner}
            );
            let payload = await keyManagerInstance.keysIds(1);

            expect(payload).to.eq(web3.utils.sha3(random));
        });

        it('Checks that key has correct purpose', async () => {
            await keyManagerInstance.addKey(
                web3.utils.sha3(random),
                2,
                1,
                {from: owner}
            );

            expect(await keyManagerInstance.keyHasPurpose(web3.utils.sha3(random), 2)).to.eq(true);
        });

        it('Checks that key is of correct type', async () => {
            await keyManagerInstance.addKey(
                web3.utils.sha3(random),
                2,
                1,
                {from: owner}
            );

            let payload = await keyManagerInstance.getKey(web3.utils.sha3(random));
            expect((new BigNumber(payload.keyType)).toNumber()).to.eq(1);
        });

        it('Checks that KeyAdded event is fired', async () => {
            let receipt = await keyManagerInstance.addKey(
                web3.utils.sha3(random),
                2,
                1,
                {from: owner}
            );

            receipt.logs.forEach((log) => {
                expect(log.event).to.eq("KeyAdded");

                expect(log.args.key).to.eq(web3.utils.sha3(random));
                expect((new BigNumber(log.args.purposes)).toNumber()).to.eq(2);
                expect((new BigNumber(log.args.keyType)).toNumber()).to.eq(1);
            });
        });
    });

    describe("Remove Key", function () {
        beforeEach(async () => {
            keyManagerInstance = await KeyManager.new({from: owner});

            await keyManagerInstance.addKey(
                web3.utils.sha3(random),
                2,
                1,
                {from: owner}
            );
        });

        it('Checks that only a management key or owner can remove a key', async () => {
            await truffleAssert.reverts(
                keyManagerInstance.removeKey(
                    web3.utils.sha3(random),
                    {from: random}
                ),
                "Only owner or management keys can call this function"
            );
        });

        it('Checks that removed key cannot be 0', async () => {
            await truffleAssert.reverts(
                keyManagerInstance.removeKey(
                    "0x0000000000000000000000000000000000000000000000000000000000000000",
                    {from: owner}
                ),
                "Invalid Key"
            );
        });

        it('Checks that key is removed from key ring', async () => {
            await keyManagerInstance.removeKey(
                web3.utils.sha3(random),
                {from: owner}
            );
            let payload = await keyManagerInstance.getKey(web3.utils.sha3(random));

            expect((new BigNumber(payload.keyType)).toNumber()).to.eq(0);
            expect((new BigNumber(payload.purposes)).toNumber()).to.eq(0);
            expect(await keyManagerInstance.keyHasPurpose(web3.utils.sha3(random), 2)).to.eq(false);
        });

        it('Checks that KeyRemoved event is fired', async () => {
            let receipt = await keyManagerInstance.removeKey(
                web3.utils.sha3(random),
                {from: owner}
            );

            receipt.logs.forEach((log) => {
                expect(log.event).to.eq("KeyRemoved");

                expect(log.args.key).to.eq(web3.utils.sha3(random));
                expect((new BigNumber(log.args.purposes)).toNumber()).to.eq(2);
                expect((new BigNumber(log.args.keyType)).toNumber()).to.eq(1);
            });
        });
    });

    describe("Get Key Count", function () {
        beforeEach(async () => {
            keyManagerInstance = await KeyManager.new({from: owner});
        });

        it('Checks that key count is correctly fetched', async () => {
            let oldCount = await keyManagerInstance.getKeyCount();

            await keyManagerInstance.addKey(
                web3.utils.sha3(random),
                2,
                1,
                {from: owner}
            );

            let newCount = await keyManagerInstance.getKeyCount();

            expect((new BigNumber(newCount)).toNumber()).to.eq((new BigNumber(oldCount)).toNumber() + 1);
        });
    });

    describe("Change Keys Required", function () {
        beforeEach(async () => {
            keyManagerInstance = await KeyManager.new({from: owner});
        });

        it('Checks that only a management key or owner can remove a key', async () => {
            await truffleAssert.reverts(
                keyManagerInstance.changeKeysRequired(
                    2,
                    2,
                    {from: random}
                ),
                "Only owner or management keys can call this function"
            );
        });

        it('Checks that required approvals is changed', async () => {
            await keyManagerInstance.changeKeysRequired(
                2,
                2,
                {from: owner}
            );

            let nbrKeys = await keyManagerInstance.getKeysRequired(2);

            expect((new BigNumber(nbrKeys)).toNumber()).to.eq(2);
        });

        it('Checks that KeysRequiredChanged event is fired', async () => {
            let receipt = await keyManagerInstance.changeKeysRequired(
                2,
                2,
                {from: owner}
            );

            receipt.logs.forEach((log) => {
                expect(log.event).to.eq("KeysRequiredChanged");

                expect((new BigNumber(log.args.purpose)).toNumber()).to.eq(2);
                expect((new BigNumber(log.args.number)).toNumber()).to.eq(2);
            });
        });
    });

    describe("Get Keys Required", function () {
        beforeEach(async () => {
            keyManagerInstance = await KeyManager.new({from: owner});
        });

        it('Checks that number returned is ok', async () => {
            let oldNbrKeys = await keyManagerInstance.getKeysRequired(2);

            expect((new BigNumber(oldNbrKeys)).toNumber()).to.eq(0);

            await keyManagerInstance.changeKeysRequired(
                2,
                2,
                {from: owner}
            );

            let newNbrKeys = await keyManagerInstance.getKeysRequired(2);

            expect((new BigNumber(newNbrKeys)).toNumber()).to.eq(2);
        });
    });

    describe("Execute", function () {
        beforeEach(async () => {
            keyManagerInstance = await KeyManager.new({from: owner});
            calleInstance = await Calle.new({from: owner});

            await keyManagerInstance.addKey(
                web3.utils.sha3(random),
                2,
                1,
                {from: owner}
            );
        });

        it('Checks that address can not be 0', async () => {
            await truffleAssert.reverts(
                keyManagerInstance.execute(
                    "0x0000000000000000000000000000000000000000",
                    0,
                    DATA_CALL_EXT,
                    {from: owner}
                ),
                "_to should not be address 0x0"
            );
        });

        it('Checks that transaction cannot be executed if key has not purpose', async () => {
            await truffleAssert.reverts(
                keyManagerInstance.execute(
                    keyManagerInstance.address,
                    0,
                    DATA_CALL_SELF,
                    {from: random}
                ),
                "Purpose can not be approved with this key"
            );
        });

        it('Checks that transaction purpose is 1 if onself', async () => {
            await keyManagerInstance.execute(
                keyManagerInstance.address,
                0,
                DATA_CALL_SELF,
                {from: owner}
            );

            let tx = await keyManagerInstance.transactions(0);

            expect((new BigNumber(tx.purpose)).toNumber()).to.eq(1);
        });

        it('Checks that transaction purpose is 2 if not onself', async () => {
            await keyManagerInstance.execute(
                calleInstance.address,
                0,
                DATA_CALL_EXT,
                {from: owner}
            );

            let tx = await keyManagerInstance.transactions(0);

            expect((new BigNumber(tx.purpose)).toNumber()).to.eq(2);
        });

        it('Checks that transaction data are stored', async () => {
            await keyManagerInstance.execute(
                calleInstance.address,
                0,
                DATA_CALL_EXT,
                {from: owner}
            );

            let tx = await keyManagerInstance.transactions(0);

            expect((new BigNumber(tx.purpose)).toNumber()).to.eq(2);
            expect((new BigNumber(tx.value)).toNumber()).to.eq(0);
            expect(tx.destination).to.eq(calleInstance.address);
            expect(tx.executed).to.eq(true);
        });

        it('Checks that ExecutionRequested event is fired', async () => {
            let receipt = await keyManagerInstance.execute(
                calleInstance.address,
                0,
                DATA_CALL_EXT,
                {from: owner}
            );
            expect(receipt.logs.filter(log => log.event === "ExecutionRequested").length).to.eq(1);
            receipt.logs.forEach((log) => {
                if (log.event === "ExecutionRequested") {
                    expect((new BigNumber(log.args.executionId)).toNumber()).to.eq(0);
                    expect((new BigNumber(log.args.value)).toNumber()).to.eq(0);
                    expect(log.args.to).to.eq(calleInstance.address);
                    expect(log.args.data).to.eq(DATA_CALL_EXT);
                }
            });
        });

        it('Checks that transaction count has incremented', async () => {
            let oldCount = await keyManagerInstance.transactionCount();

            await keyManagerInstance.execute(
                calleInstance.address,
                0,
                DATA_CALL_EXT,
                {from: owner}
            );

            let newCount = await keyManagerInstance.transactionCount();

            expect((new BigNumber(newCount)).toNumber()).to.eq((new BigNumber(oldCount)).toNumber() + 1);
        });

        it('Checks that tx sender confirmation is true', async () => {
            await keyManagerInstance.execute(
                calleInstance.address,
                0,
                DATA_CALL_EXT,
                {from: owner}
            );

            let confirmations = await keyManagerInstance.getConfirmations(0);

            expect(confirmations.filter(address => address === web3.utils.sha3(owner)).length).to.eq(1);
        });

        it('Checks that Approved event is fired', async () => {
            let receipt = await keyManagerInstance.execute(
                calleInstance.address,
                0,
                DATA_CALL_EXT,
                {from: owner}
            );
            expect(receipt.logs.filter(log => log.event === "Approved").length).to.eq(1);
            receipt.logs.forEach((log) => {
                if (log.event === "Approved") {
                    expect((new BigNumber(log.args.executionId)).toNumber()).to.eq(0);
                    expect(log.args.approved).to.eq(true);
                }
            });
        });

        it('Checks that Transaction is not fired if nbr of confirmations is not reached', async () => {
            await keyManagerInstance.changeKeysRequired(
                2,
                2,
                {from: owner}
            );

            let receipt = await keyManagerInstance.execute(
                calleInstance.address,
                0,
                DATA_CALL_EXT,
                {from: owner}
            );

            let tx = await keyManagerInstance.transactions(0);
            let integer = await calleInstance.integer();

            expect(receipt.logs.filter(log => log.event === "Executed").length).to.eq(0);

            expect((new BigNumber(integer)).toNumber()).to.eq(0);
            expect(tx.executed).to.eq(false);

        });

        it('Checks that if is confirmed & wrong data it should revert', async () => {
            await truffleAssert.reverts(
                keyManagerInstance.execute(
                    calleInstance.address,
                    0,
                    "0x000000000000000000000",
                    {from: owner}
                ),
                "External call has failed"
            );
        });

        it('Checks that Executed event is fired', async () => {
            let receipt = await keyManagerInstance.execute(
                calleInstance.address,
                0,
                DATA_CALL_EXT,
                {from: owner}
            );
            expect(receipt.logs.filter(log => log.event === "Executed").length).to.eq(1);
            receipt.logs.forEach((log) => {
                if (log.event === "Executed") {
                    expect((new BigNumber(log.args.executionId)).toNumber()).to.eq(0);
                    expect((new BigNumber(log.args.value)).toNumber()).to.eq(0);
                    expect(log.args.to).to.eq(calleInstance.address);
                    expect(log.args.data).to.eq(DATA_CALL_EXT);
                }
            });

            let integer = await calleInstance.integer();
            expect((new BigNumber(integer)).toNumber()).to.eq(5);
        });
    });
});