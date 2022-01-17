// const snarkjs = require("snarkjs");

const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
const assert = require('assert')
const eVote = artifacts.require("eVote.sol")
const verifierZKSNARK = artifacts.require("verifierZKSNARK")
const { MerkleTree } = require('../helper/merkletree.js')
const { genTestData } = require('../helper/voters.js')
const { tallying } = require('../helper/administrator.js')
const {mineToBlockNumber, takeSnapshot,revertToSnapshot} = require('../helper/truffleHelper.js')
const { getVerificationKeys } = require('../helper/verificationKeys.js')
contract('eVote', async (accounts) => {
    let admin = accounts[0]
    log = ''
    let eVoteInstance
    let verifierZKSNARKInstance;
    let data;
    let usersMerkleTree;
    let _tallyingResult;
    let _tallyingProof;
    let nVoters = __NVOTERS__
    
    it('Generate Testing Data', async ()=> {
        data = await genTestData(nVoters)
        let encryptedVotes = [];
        let expectedTallyingResult = 0;    
    for (i=0; i<data.length;i++){
        encryptedVotes.push(data[i].encryptedVote);
        expectedTallyingResult += data[i].Vote;
        }
        const { tallyingProof, tallyingResult } = await tallying(encryptedVotes)
        assert(expectedTallyingResult == tallyingResult, "Error: Tallying Result provided by the Tallying circuit is not equal to the expected Tallying result")
        _tallyingProof = tallyingProof
        _tallyingResult = tallyingResult

        usersMerkleTree = new MerkleTree(accounts.slice(1,accounts.length-1)) 
    }).timeout(50000 * nVoters);
    
    it('Deploy the contracts', async ()=> {
        verifierZKSNARKInstance = await verifierZKSNARK.deployed();
        eVoteInstance = await eVote.deployed()
    }).timeout(50000 * nVoters);

    it('Set Verification keys', async ()=> {
        let cost = 0;
        let cost_s = '';
        const verifierPublicKeyVkey = getVerificationKeys('../build/verifier_PublicKey.json')
        tx = await verifierZKSNARKInstance.setVerifyingKey(verifierPublicKeyVkey, 0);
        cost_s += tx.receipt.gasUsed.toString();
        cost += tx.receipt.gasUsed
        
        const verifierEncrpytedVoteVkey = getVerificationKeys('../build/verifier_EncrpytedVote.json')
        tx = await verifierZKSNARKInstance.setVerifyingKey(verifierEncrpytedVoteVkey, 1);
        cost_s += ' + ' + tx.receipt.gasUsed.toString();
        cost += tx.receipt.gasUsed
        
        const verifierTallyingVkey = getVerificationKeys('../build/verifier_tallying.json')
        tx = await verifierZKSNARKInstance.setVerifyingKey(verifierTallyingVkey, 2);
        cost_s += ' + ' + tx.receipt.gasUsed.toString();
        cost += tx.receipt.gasUsed
        cost_s += ' = ' + cost.toString();
        log+=`SetVerificationkeys: ${cost_s.toString()}\n`         

    }).timeout(5000 * nVoters);

    it('Register public keys for elligable users except the last one', async() => {
        for(let i =0; i< data.length -1; i++) {
            _merkleProof = usersMerkleTree.getHexProof(accounts[i+1])                      
            tx = await eVoteInstance.registerVoter(data[i].publicKey, data[i].publicKeyProof.a, data[i].publicKeyProof.b, data[i].publicKeyProof.c, _merkleProof, {from:accounts[i+1], value:web3.utils.toWei("1","ether")})
        }         
    }).timeout(50000 * nVoters);

   it('Throw an error if non-elligable user tries to vote', async() =>{
        snapShot = await takeSnapshot()
        snapshotId = snapShot['result']
        _merkleProof = usersMerkleTree.getHexProof(accounts[accounts.length-2])            
        try{
            await eVoteInstance.registerVoter(data[0].publicKey, data[0].publicKeyProof.a, data[0].publicKeyProof.b, data[0].publicKeyProof.c, _merkleProof, {from:accounts[accounts.length-1], value:web3.utils.toWei("1","ether")})
        } catch(err) {
           assert(String(err).includes("Invalid Merkle proof"), "error in verifying invalid user")
        }
        await revertToSnapshot(snapshotId) 
    })

    it('Throw an error if elligable user provides invalid DL proof to vote', async() =>{
        snapShot = await takeSnapshot()
        snapshotId = snapShot['result']
        _merkleProof = usersMerkleTree.getHexProof(accounts[1])        
        try{
            await eVoteInstance.registerVoter(data[0].publicKey, data[0].publicKeyProof.a, data[0].publicKeyProof.b, data[0].publicKeyProof.c, _merkleProof, {from:accounts[1], value:web3.utils.toWei("1","ether")})
        } catch(err) {
            assert(String(err).includes("Invalid DL proof"), "error in verifying invalid user")
        }
        await revertToSnapshot(snapshotId)
    })

    it('Register public key of the last voter', async() => {
        i = data.length -1
        _merkleProof = usersMerkleTree.getHexProof(accounts[i+1])                      
        tx = await eVoteInstance.registerVoter(data[i].publicKey, data[i].publicKeyProof.a, data[i].publicKeyProof.b, data[i].publicKeyProof.c, _merkleProof, {from:accounts[i+1], value:web3.utils.toWei("1","ether")})
        log+=`RegisterVote: ${tx.receipt.gasUsed.toString()}\n`         
    }).timeout(50000 * nVoters);

    it('Throw an error if an user tries to register but Max number of voters is reached', async() =>{
        snapShot = await takeSnapshot()
        snapshotId = snapShot['result']
        _merkleProof = usersMerkleTree.getHexProof(accounts[accounts.length-2])            
        try{
            await eVoteInstance.registerVoter(data[0].publicKey, data[0].publicKeyProof.a, data[0].publicKeyProof.b, data[0].publicKeyProof.c, _merkleProof, {from:accounts[accounts.length-1], value:web3.utils.toWei("1","ether")})
        } catch(err) {
           assert(String(err).includes("Max number of voters is reached"), "error in verifying max number of voters")
        }
        await revertToSnapshot(snapshotId)
    })


    it('Cast valid encrypted votes', async() => {
        beginVote = (await eVoteInstance.finishRegistartionBlockNumber.call()).toNumber()
        await mineToBlockNumber(beginVote)
        for(let i=0; i<data.length; i++){
            tx = await eVoteInstance.castVote(data[i].encryptedVote, data[i].Idx, data[i].encryptedVoteProof.a, data[i].encryptedVoteProof.b, data[i].encryptedVoteProof.c, {from:accounts[i+1]})
        }
        log+=`CastVote: ${tx.receipt.gasUsed.toString()}\n`
    }).timeout(100000 * nVoters);

    it('Throw an error if elligable user provides invalid encrypted vote', async() => {       
        try{
            await await await eVoteInstance.castVote(data[0].encryptedVote, data[1].Idx, data[1].encryptedVoteProof.a, data[1].encryptedVoteProof.b, data[1].encryptedVoteProof.c, {from:accounts[2]})
        } catch(err) {
            assert(String(err).includes("Invalid encrypted vote"), "error in verifying invalid encrypted")
        }    
    })

    it('Malicious Administrator', async() => {
        snapShot = await takeSnapshot();
        snapshotId = snapShot['result'];

        beginTally = (await eVoteInstance.finishVotingBlockNumber.call()).toNumber()
        await mineToBlockNumber(beginTally)        
        try{
            await await eVoteInstance.setTallyResult(_tallyingResult + 1, _tallyingProof.a, _tallyingProof.b, _tallyingProof.c,{from:admin});
        } catch(err) {
            assert(String(err).includes("Invalid Tallying Result"), "error in verifying Malicious Administrator")
        }
        await revertToSnapshot(snapshotId)
    
    })
    it('Honst Administrator', async() => {
        beginTally = (await eVoteInstance.finishVotingBlockNumber.call()).toNumber()
        await mineToBlockNumber(beginTally)
        tx = await eVoteInstance.setTallyResult(_tallyingResult, _tallyingProof.a, _tallyingProof.b, _tallyingProof.c,{from:admin});
        log+=`SetTallyResult: ${tx.receipt.gasUsed.toString()}\n`
    }).timeout(100000 * nVoters);

    it('Refund deposits for all', async () => {
        beginRefund = (await eVoteInstance.finishTallyBlockNumber.call()).toNumber()
        await mineToBlockNumber(beginRefund)
        for(let i =0; i< accounts.length-1; i++) {
            try{
                tx = await eVoteInstance.reclaimDeposit({from:accounts[i]})
            } catch(err) {}
        }
        log+=`Refund: ${tx.receipt.gasUsed.toString()}\n`
        console.log(log)  
    }).timeout(50000 * nVoters);
    
})

