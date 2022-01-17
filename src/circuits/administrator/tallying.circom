pragma circom 2.0.0;
include "../../node_modules/circomlib/circuits/babyjub.circom";
include "../Utils/Utils.circom";


template encryptedVotesSum(n){
    
    signal input encVotes[n][2];
    signal output encResults[2];

    component sum  = ecBabyjubArraySum(n);

    for(var i=0; i<n; i++){
        sum.points[i][0] <== encVotes[i][0];
        sum.points[i][1] <== encVotes[i][1];
    }
    
    encResults[0] <== sum._output[0];
    encResults[1] <== sum._output[1];
    
}




template exhaustiveSearch(n){
    signal input in[2];
    signal output res;
    var checkpoint[2] = [0,1];
    var BASE8[2] = [
        5299619240641551281634865583518297030282874472190772894086521144482721001553,
        16950150798460657717958625567821834550301663161624707787222815936182638968203
    ];
    
    component ecCheck[n+1];
    var sum = 0;
    for (var i=0; i<= n; i++){
        ecCheck[i] = ecIsEqual();
        ecCheck[i].in1[0] <== in[0];
        ecCheck[i].in1[1] <== in[1];
        ecCheck[i].in2[0] <== checkpoint[0];
        ecCheck[i].in2[1] <== checkpoint[1];
        sum += i * ecCheck[i].out;
        //Increment the checkpoint
        checkpoint = fBabyAdd(checkpoint[0], checkpoint[1], BASE8[0], BASE8[1]);
    }
    res <== sum;

    component checkExhaustiveSearch = BabyPbk();
    checkExhaustiveSearch.in <== res;
    component checkResult = ecIsEqual();
    checkResult.in1[0] <== in[0];
    checkResult.in1[1] <== in[1];
    checkResult.in2[0] <== checkExhaustiveSearch.Ax;
    checkResult.in2[1] <== checkExhaustiveSearch.Ay;
    checkResult.out === 1;
    
}


template tallying(n){

    signal input encryptedVotesX[n];
    signal input encryptedVotesY[n];
    signal output result;
    signal ecryptedResult[2];

    // Check that the each pair of X and Y is on BabyJub curve
    component checkPoints = BabyCheckArray(n);
    
    for(var i=0; i<n;i++){
        checkPoints.X[i] <== encryptedVotesX[i];
        checkPoints.Y[i] <== encryptedVotesY[i];
    }

    component encTally  = encryptedVotesSum(n);

    for(var i=0; i<n; i++){
        encTally.encVotes[i][0] <== encryptedVotesX[i];
        encTally.encVotes[i][1] <== encryptedVotesY[i];
    }
    
    ecryptedResult[0] <== encTally.encResults[0];
    ecryptedResult[1] <== encTally.encResults[1];

    component exhaustiveSearch = exhaustiveSearch(n);
    exhaustiveSearch.in[0] <== ecryptedResult[0];
    exhaustiveSearch.in[1] <== ecryptedResult[1];
    result <== exhaustiveSearch.res;
    
}




component main{public [encryptedVotesX]} = tallying(__NVOTERS__);