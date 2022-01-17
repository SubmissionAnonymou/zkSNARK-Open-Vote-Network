pragma circom 2.0.0;
include "../../node_modules/circomlib/circuits/babyjub.circom";


template PublicKeyGen(){
    signal input privateKey;
    signal output publicKey[2];

    component publicKeyGen = BabyPbk();
    publicKeyGen.in <== privateKey;
    publicKey[0] <== publicKeyGen.Ax;
    publicKey[1] <== publicKeyGen.Ay;

}


component main = PublicKeyGen();