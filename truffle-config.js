require('babel-register');
require('babel-polyfill');

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
        coverage: {
            host: "localhost",
            network_id: "*",
            port: 8545,
            gas: 6721970,
            gasPrice: 0x01
        }
    }
};