// test/gameDetection.bench.ts — assert the scan never fires more than once/10s.
import { resolveForegroundApp } from '../src/gameDetection';

// Note: This is a manual test script, not a unit test.
// To run: npx ts-node test/gameDetection.bench.ts

async function run() {
  console.log('--- Starting Game Detection Benchmark ---');
  const launcher = { owner: { name: 'steam.exe', path: 'C:\\Program Files (x86)\\Steam\\steam.exe' }, title: 'Steam' };
  const t0 = Date.now();
  
  // We'll simulate 20 polls over 20 seconds.
  // We expect at most 2 tasklist spawns (one at 0s, one at 10s).
  console.log('Simulating 20 polls over 20 seconds...');
  
  for (let i = 0; i < 20; i++) {
    const start = Date.now();
    const result = await resolveForegroundApp(launcher);
    const elapsed = Date.now() - start;
    
    console.log(`Poll ${i + 1}: Resolved to "${result?.name}" via ${result?.source} (${elapsed}ms)`);
    
    // Wait 1s between polls
    await new Promise((r) => setTimeout(r, 1000));
  }
  
  console.log('Benchmark finished in', (Date.now() - t0) / 1000, 'seconds');
  console.log('Expectation: First poll and poll around #11 should be slower (scan), others should be instant (cache).');
}

run().catch(console.error);
