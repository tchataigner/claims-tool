const ClaimHolder = artifacts.require("ClaimHolder");

const truffleAssert = require('truffle-assertions');

const BigNumber = require('bignumber.js');

require('chai').expect();

contract('Claim Holder', ([owner, random]) => {
    let claimHolderInstance;

    describe("Constructor", function () {
        before(async () => {
            claimHolderInstance = await ClaimHolder.new(owner, {from: owner});
        });

        it('Checks that owner value is set', async () => {
            let payload = await claimHolderInstance.owner();
            expect(web3.utils.toChecksumAddress(payload)).to.eq(web3.utils.toChecksumAddress(owner));
        });
    });

    describe("Add Claim", function () {
        beforeEach(async () => {
            claimHolderInstance = await ClaimHolder.new(owner, {from: owner});
        });

        it('Checks that topic is added to existing topics', async () => {
            await claimHolderInstance.addClaim(
                web3.eth.abi.encodeParameter('bytes32', web3.utils.fromAscii('address')),
                1,
                web3.eth.abi.encodeParameter('bytes', web3.utils.fromAscii('2 rue Zuber, 25320, Boussières')),
                "",
                {from: random}
            );

            let topics = await claimHolderInstance.getTopics();

            expect(topics.length).to.eq(1);
            expect(topics[0]).to.eq(web3.eth.abi.encodeParameter('bytes32', web3.utils.fromAscii('address')));

            let exists = await claimHolderInstance.existingTopic(topics[0]);
            expect(exists).to.eq(true);
        });

        it('Checks that claim data are correctly stored', async () => {
            await claimHolderInstance.addClaim(
                web3.eth.abi.encodeParameter('bytes32', web3.utils.fromAscii('address')),
                1,
                web3.eth.abi.encodeParameter('bytes', web3.utils.fromAscii('2 rue Zuber, 25320, Boussières')),
                "uri",
                {from: random}
            );

            let expectedId = web3.utils.soliditySha3(
                {t: 'address', v: random},
                {t: 'address', v: owner},
                {t: 'bytes32', v: web3.utils.fromAscii('address')}
            );
            let payload = await claimHolderInstance.getClaim(expectedId);

            expect(payload.topic).to.eq(web3.eth.abi.encodeParameter('bytes32', web3.utils.fromAscii('address')));
            expect((new BigNumber(payload.scheme)).toNumber()).to.eq(1);
            expect(payload.issuer).to.eq(random);
            expect(payload.data).to.eq(web3.eth.abi.encodeParameter('bytes', web3.utils.fromAscii('2 rue Zuber, 25320, Boussières')));
            expect(payload.uri).to.eq("uri");
        });

        it('Checks that claim is added in claim by topic mapping', async () => {
            await claimHolderInstance.addClaim(
                web3.eth.abi.encodeParameter('bytes32', web3.utils.fromAscii('address')),
                1,
                web3.eth.abi.encodeParameter('bytes', web3.utils.fromAscii('2 rue Zuber, 25320, Boussières')),
                "uri",
                {from: random}
            );

            let payload = await claimHolderInstance.claimsByTopic(
                web3.eth.abi.encodeParameter('bytes32', web3.utils.fromAscii('address')),
                0
            );

            let expectedId = web3.utils.soliditySha3(
                {t: 'address', v: random},
                {t: 'address', v: owner},
                {t: 'bytes32', v: web3.utils.fromAscii('address')}
            );

            expect(payload).to.eq(expectedId);
        });

        it('Checks that ClaimAdded event is fired', async () => {
            let receipt = await claimHolderInstance.addClaim(
                web3.eth.abi.encodeParameter('bytes32', web3.utils.fromAscii('address')),
                1,
                web3.eth.abi.encodeParameter('bytes', web3.utils.fromAscii('2 rue Zuber, 25320, Boussières')),
                "uri",
                {from: random}
            );

            let expectedId = web3.utils.soliditySha3(
                {t: 'address', v: random},
                {t: 'address', v: owner},
                {t: 'bytes32', v: web3.utils.fromAscii('address')}
            );

            receipt.logs.forEach((log) => {
                expect(log.event).to.eq("ClaimAdded");

                expect(log.args.claimId).to.eq(expectedId);
                expect(log.args.topic).to.eq(web3.eth.abi.encodeParameter('bytes32', web3.utils.fromAscii('address')));
                expect((new BigNumber(log.args.scheme)).toNumber()).to.eq(1);
                expect(log.args.data).to.eq(web3.eth.abi.encodeParameter('bytes', web3.utils.fromAscii('2 rue Zuber, 25320, Boussières')));
                expect(log.args.uri).to.eq("uri");
                expect(web3.utils.toChecksumAddress(log.args.issuer)).to.eq(web3.utils.toChecksumAddress(random));
            });
        });
    });

    describe("Change Claim", function () {
        let claimId;

        beforeEach(async () => {
            claimHolderInstance = await ClaimHolder.new(owner, {from: owner});
            await claimHolderInstance.addClaim(
                web3.eth.abi.encodeParameter('bytes32', web3.utils.fromAscii('address')),
                1,
                web3.eth.abi.encodeParameter('bytes', web3.utils.fromAscii('2 rue Zuber, 25320, Boussières')),
                "",
                {from: random}
            );

            claimId = web3.utils.soliditySha3(
                {t: 'address', v: random},
                {t: 'address', v: owner},
                {t: 'bytes32', v: web3.utils.fromAscii('address')}
            );
        });

        it('Checks that only issuer can update claim', async () => {
            await truffleAssert.reverts(
                claimHolderInstance.changeClaim(
                    claimId,
                    1,
                    web3.eth.abi.encodeParameter('bytes', web3.utils.fromAscii('57 rue Daguerre, 75014, Paris')),
                    "uri",
                    {from: owner}
                ),
                "msg.sender should be the claim issuer"
            );
        });

        it('Checks that data are correctly saved', async () => {
            await claimHolderInstance.changeClaim(
                claimId,
                2,
                web3.eth.abi.encodeParameter('bytes', web3.utils.fromAscii('57 rue Daguerre, 75014, Paris')),
                "uri2",
                {from: random}
            );

            let payload = await claimHolderInstance.getClaim(claimId);

            expect(payload.topic).to.eq(web3.eth.abi.encodeParameter('bytes32', web3.utils.fromAscii('address')));
            expect((new BigNumber(payload.scheme)).toNumber()).to.eq(2);
            expect(payload.issuer).to.eq(random);
            expect(payload.data).to.eq(web3.eth.abi.encodeParameter('bytes', web3.utils.fromAscii('57 rue Daguerre, 75014, Paris')));
            expect(payload.uri).to.eq("uri2");
        });

        it('Checks that ClaimChanged event is fired', async () => {
            let receipt = await claimHolderInstance.changeClaim(
                claimId,
                2,
                web3.eth.abi.encodeParameter('bytes', web3.utils.fromAscii('57 rue Daguerre, 75014, Paris')),
                "uri2",
                {from: random}
            );

            receipt.logs.forEach((log) => {
                expect(log.event).to.eq("ClaimChanged");

                expect(log.args.claimId).to.eq(claimId);
                expect(log.args.topic).to.eq(web3.eth.abi.encodeParameter('bytes32', web3.utils.fromAscii('address')));
                expect((new BigNumber(log.args.scheme)).toNumber()).to.eq(2);
                expect(log.args.data).to.eq(web3.eth.abi.encodeParameter('bytes', web3.utils.fromAscii('57 rue Daguerre, 75014, Paris')));
                expect(log.args.uri).to.eq("uri2");
                expect(web3.utils.toChecksumAddress(log.args.issuer)).to.eq(web3.utils.toChecksumAddress(random));
            });
        });
    });

    describe("Unvalid Claim", function () {
        let claimId;

        beforeEach(async () => {
            claimHolderInstance = await ClaimHolder.new(owner, {from: owner});

            await claimHolderInstance.addClaim(
                web3.eth.abi.encodeParameter('bytes32', web3.utils.fromAscii('address')),
                1,
                web3.eth.abi.encodeParameter('bytes', web3.utils.fromAscii('2 rue Zuber, 25320, Boussières')),
                "",
                {from: random}
            );

            claimId = web3.utils.soliditySha3(
                {t: 'address', v: random},
                {t: 'address', v: owner},
                {t: 'bytes32', v: web3.utils.fromAscii('address')}
            );
        });

        it('Checks that only issuer can unvalid claim', async () => {
            await truffleAssert.reverts(
                claimHolderInstance.removeClaim(
                    claimId,
                    {from: owner}
                ),
                "msg.sender should be the claim issuer"
            );
        });

        it('Checks that claim is non valid', async () => {
            claimHolderInstance.removeClaim(
                claimId,
                {from: random}
            );

            let payload = await claimHolderInstance.getClaim(claimId);

            expect(payload.isValid).to.eq(false);
        });

        it('Checks that ClaimRemoved event is fired', async () => {
            let receipt = await claimHolderInstance.removeClaim(
                claimId,
                {from: random}
            );

            receipt.logs.forEach((log) => {
                expect(log.event).to.eq("ClaimRemoved");

                expect(log.args.claimId).to.eq(claimId);
                expect(log.args.topic).to.eq(web3.eth.abi.encodeParameter('bytes32', web3.utils.fromAscii('address')));
                expect((new BigNumber(log.args.scheme)).toNumber()).to.eq(1);
                expect(log.args.data).to.eq(web3.eth.abi.encodeParameter('bytes', web3.utils.fromAscii('2 rue Zuber, 25320, Boussières')));
                expect(log.args.uri).to.eq("");
                expect(web3.utils.toChecksumAddress(log.args.issuer)).to.eq(web3.utils.toChecksumAddress(random));
            });
        });
    });

    describe("Toggle Claim Review", function () {
        let claimId;

        beforeEach(async () => {
            claimHolderInstance = await ClaimHolder.new(owner, {from: owner});

            await claimHolderInstance.addClaim(
                web3.eth.abi.encodeParameter('bytes32', web3.utils.fromAscii('address')),
                1,
                web3.eth.abi.encodeParameter('bytes', web3.utils.fromAscii('2 rue Zuber, 25320, Boussières')),
                "",
                {from: random}
            );

            claimId = web3.utils.soliditySha3(
                {t: 'address', v: random},
                {t: 'address', v: owner},
                {t: 'bytes32', v: web3.utils.fromAscii('address')}
            );
        });

        it('Checks that only owner can toggle', async () => {
            await truffleAssert.reverts(
                claimHolderInstance.toggleReviewClaim(
                    claimId,
                    {from: random}
                ),
                "msg.sender should be the owner"
            );
        });

        it('Checks that claim has review toggled', async () => {
            let oldClaim = await claimHolderInstance.getClaim(claimId);

            await claimHolderInstance.toggleReviewClaim(
                claimId,
                {from: owner}
            );

            let newClaim = await claimHolderInstance.getClaim(claimId);

            expect(newClaim.recipientReview).to.eq(!oldClaim.recipientReview);
        });

        it('Checks that ClaimApprovalToggled event is fired', async () => {
            let receipt = await claimHolderInstance.toggleReviewClaim(
                claimId,
                {from: owner}
            );

            receipt.logs.forEach((log) => {
                expect(log.event).to.eq("ClaimApprovalToggled");

                expect(log.args.claimId).to.eq(claimId);
                expect(log.args.topic).to.eq(web3.eth.abi.encodeParameter('bytes32', web3.utils.fromAscii('address')));
                expect((new BigNumber(log.args.scheme)).toNumber()).to.eq(1);
                expect(log.args.data).to.eq(web3.eth.abi.encodeParameter('bytes', web3.utils.fromAscii('2 rue Zuber, 25320, Boussières')));
                expect(log.args.uri).to.eq("");
                expect(web3.utils.toChecksumAddress(log.args.issuer)).to.eq(web3.utils.toChecksumAddress(random));
            });
        });
    });
});