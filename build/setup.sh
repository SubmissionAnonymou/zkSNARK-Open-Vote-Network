#! /bin/bash

if [ $# != 1 ]; then
    echo "Useage: ./setup.sh NUMBER_of_VOTERS"
    exit -1
fi
nVoters=$1

if [ ! -d "../node_modules" ]; then
    cd ../
    npm i
    cd build
fi

if [ ! -f "potfinal.ptau" ]; then
snarkjs powersoftau new bn128 16 pot0.ptau -v
snarkjs powersoftau contribute pot0.ptau pot1.ptau --name="First contribution" -v -e="random text"
snarkjs powersoftau contribute pot1.ptau pot2.ptau --name="Second contribution" -v -e="some random text"
snarkjs powersoftau beacon pot2.ptau potbeacon.ptau 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon"
snarkjs powersoftau prepare phase2 potbeacon.ptau potfinal.ptau -v
fi

cp -r ../src/circuits/* ../circuits/

sed -i "s/__NVOTERS__/$nVoters/g" ../circuits/administrator/tallying.circom
circom ../circuits/administrator/tallying.circom --r1cs --wasm
snarkjs groth16 setup tallying.r1cs potfinal.ptau tallying000.zkey
snarkjs zkey contribute tallying000.zkey tallying001.zkey --name="1st Contributor Name" -v -e="more random text"
snarkjs zkey contribute tallying001.zkey tallying002.zkey --name="Second contribution Name" -v -e="Another random entropy"
snarkjs zkey beacon tallying002.zkey tallyingFinal.zkey 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon phase2"
snarkjs zkey export verificationkey tallyingFinal.zkey verifier_tallying.json
# snarkjs zkey export solidityverifier tallyingFinal.zkey verifier_tallying.sol

sed -i "s/__NVOTERS__/$nVoters/g" ../circuits/voter/encryptedVoteGen.circom
circom ../circuits/voter/encryptedVoteGen.circom --r1cs --wasm
snarkjs groth16 setup encryptedVoteGen.r1cs potfinal.ptau encryptedVoteGen000.zkey
snarkjs zkey contribute encryptedVoteGen000.zkey encryptedVoteGen001.zkey --name="1st Contributor Name" -v -e="more random text"
snarkjs zkey contribute encryptedVoteGen001.zkey encryptedVoteGen002.zkey --name="Second contribution Name" -v -e="Another random entropy"
snarkjs zkey beacon encryptedVoteGen002.zkey encryptedVoteGenFinal.zkey 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon phase2"
snarkjs zkey export verificationkey encryptedVoteGenFinal.zkey verifier_EncrpytedVote.json
# snarkjs zkey export solidityverifier encryptedVoteGenFinal.zkey verifier_EncrpytedVote.sol


circom ../circuits/voter/PublicKeyGen.circom --r1cs --wasm
snarkjs groth16 setup PublicKeyGen.r1cs potfinal.ptau PublicKeyGen000.zkey
snarkjs zkey contribute PublicKeyGen000.zkey PublicKeyGen001.zkey --name="1st Contributor Name" -v -e="more random text"
snarkjs zkey contribute PublicKeyGen001.zkey PublicKeyGen002.zkey --name="Second contribution Name" -v -e="Another random entropy"
snarkjs zkey beacon PublicKeyGen002.zkey PublicKeyGenFinal.zkey 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon phase2"
snarkjs zkey export verificationkey PublicKeyGenFinal.zkey verifier_PublicKey.json
# snarkjs zkey export solidityverifier PublicKeyGenFinal.zkey verifier_PublicKey.sol


cp -r ../src/contracts/* ../contracts/
sed -i "s/__NVOTERS__/$nVoters/g" ../contracts/eVote.sol

cp -r ../src/test/* ../test/
sed -i "s/__NVOTERS__/$nVoters/g" ../test/completeTest.js

echo """
To test, run the following commands in two different terminals:
terminal 1:
            ganache-cli -l 30e6 -a $((nVoters+2)) 
terminal 2:
            cd ../test
            truffle test
"""



