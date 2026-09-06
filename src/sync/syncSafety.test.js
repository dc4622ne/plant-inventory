import assert from 'node:assert/strict'; import test from 'node:test';
import { createCircuitBreaker, createSingleFlight, isInfrastructureFailure, retryDelay } from './syncSafety.js';

test('single flight coalesces 100 overlapping triggers into one run plus one follow-up', async () => {
  let release; const gate = new Promise((resolve) => { release = resolve; }); let runs = 0;
  const flight = createSingleFlight({id:()=>`run-${runs+1}`}); const first = flight.run('focus', async()=>{runs += 1;if(runs===1)await gate;});
  for(let i=0;i<100;i+=1) flight.run('visibility',async()=>{runs += 1;}); release(); await first;
  assert.equal(runs,2); assert.equal(flight.diagnostics().overlappingAttemptsPrevented,100);
});
test('infrastructure failures open a bounded circuit and manual sync allows one probe',()=>{
  let clock=1000; const circuit=createCircuitBreaker({now:()=>clock}); const error={code:'PGRST003'};
  circuit.failure(error); circuit.failure(error); assert.equal(circuit.snapshot().state,'closed'); circuit.failure(error); assert.equal(circuit.snapshot().state,'open');
  assert.equal(circuit.canRun(),false); assert.equal(circuit.canRun({manual:true}),true); assert.equal(circuit.canRun({manual:true}),false); circuit.success(); assert.equal(circuit.snapshot().state,'closed');
});
test('retry policy has jittered minimum and cap and classifies overload errors',()=>{
  assert.equal(retryDelay(1,()=>0),4000); assert.ok(retryDelay(99,()=>1)<=360000); for(const code of ['PGRST002','PGRST003','429','503']) assert.equal(isInfrastructureFailure({code}),true);
});
