const snarkjs = require('snarkjs')
const fs = require('fs')

const WITNESS_FILE = '/tmp/witness'

const generateWitness = async (inputs, wasm, witness_calculator) => {
  const wc = require(witness_calculator)
  const buffer = fs.readFileSync(wasm);
  const witnessCalculator = await wc(buffer)
  const buff = await witnessCalculator.calculateWTNSBin(inputs, 0);
  fs.writeFileSync(WITNESS_FILE, buff)
}

/*
alternative to snarkjs.groth16.fullProve because it produces an error with circom 2
https://github.com/iden3/snarkjs/issues/107
*/
const FullProve = async (inputSignals, wasm, zkey, witness_calculator) => {
    await generateWitness(inputSignals, wasm, witness_calculator)
    return await snarkjs.groth16.prove(zkey, WITNESS_FILE);
}

module.exports =  {
    FullProve 

}
