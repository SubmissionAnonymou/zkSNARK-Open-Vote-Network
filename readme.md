# Dispute-free Scalable Open Vote Network using zk-SNARKs
Paper: 
# Installation 

 1. Install Nodejs > 16.0 from [https://nodejs.org/en/](https://nodejs.org/)
 2. Install Circom 2.0 from [https://docs.circom.io/getting-started/installation/](https://docs.circom.io/getting-started/installation/)
 3. Install Snarkjs package: `npm install -g snarkjs`
 4. Install Truffle Framework:  `npm install -g truffle`
 5. Install Ganache-cli: `npm install -g ganache-cli`
 5. Clone this repository and change directory to its path
 6. Install the required packages `npm i`


# Execution
 1. `cd build` then run `chmod +x setup.sh`
 2. Run `./setup.sh [[nVoters]]` where $nVoters is the number for voters
 3. Check the test code in the file `test\completeTest.js`
 4. Run the local Ethereum node: `ganache-cli -l 30e6 -a [[nVoters + 2]]` 
 5. Run the command `truffle test` to view the result and the gas cost of each transaction

