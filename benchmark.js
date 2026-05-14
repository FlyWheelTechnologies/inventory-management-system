const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function mockNetworkCall() {
  await sleep(50); // 50ms latency
}

async function runBenchmark() {
  const numItems = 100;
  console.log(`Running benchmark with ${numItems} items...`);

  // Sequential N+1 calls
  const startSequential = performance.now();
  for (let i = 0; i < numItems; i++) {
    await mockNetworkCall();
  }
  const endSequential = performance.now();
  const timeSequential = endSequential - startSequential;
  console.log(`Sequential N+1 Time: ${timeSequential.toFixed(2)} ms`);

  // Batched call (1 single call)
  const startBatched = performance.now();
  await mockNetworkCall();
  // Assume db takes slightly longer, e.g., 5ms extra for processing batch, but not N * 50
  await sleep(5);
  const endBatched = performance.now();
  const timeBatched = endBatched - startBatched;
  console.log(`Batched Call Time: ${timeBatched.toFixed(2)} ms`);

  console.log(`Improvement: ${(timeSequential / timeBatched).toFixed(2)}x faster`);
}

runBenchmark();
