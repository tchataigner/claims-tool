require('babel-register');
require('babel-polyfill');
const HDWalletProvider = require('truffle-hdwallet-provider');

module.exports = {
    compilers: {
        solc: {
            version: "0.5.8",
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    },
    networks: {
        development: {
            host: 'localhost',
            port: 8545,
            network_id: '*',
            gas: 6721970,
            gasPrice: 1
        },
        ropsten: {
            provider: function() {
                return new HDWalletProvider(
                    process.env.MNEMONIC,
                    `https://ropsten.infura.io/v3/${process.env.ROPSTEN_INFURA_API_KEY}`
                )
            },
            network_id: '3',
        },
    }
};