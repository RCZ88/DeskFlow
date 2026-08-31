import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const labDir = resolve(__dirname, '..', 'motion-lab');
const vidDir = resolve(labDir, 'videos');
mkdirSync(vidDir, { recursive: true });

const FILES = [
  { name: '01-field.html',   interaction: 'pointer' },
  { name: '02-scrub.html',   interaction: 'scroll' },
  { name: '03-icon-draw.html', interaction: 'none' },
  { name: '04-wake.html',    interaction: 'none' },
  { name: '05-ridgelines.html', interaction: 'scroll' },
  { name: '06-console.html', interaction: 'none' },
];

const MAX_S = 8;
const VP = { width: 1280, height: 800 };

async function record() {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const file of FILES) {
    console.log(`Recording ${file.name}...`);
    const context = await browser.newContext({
      viewport: VP,
      deviceScaleFactor: 1.5,
      recordVideo: { dir: vidDir, size: VP },
    });
    const page = await context.newPage();

    // Performance tracking
    const frameTimes = [];
    await page.exposeFunction('__frameTime', (ms) => { frameTimes.push(ms); });

    await page.addInitScript(() => {
      let last = performance.now();
      function measure() {
        const now = performance.now();
        const dt = now - last;
        last = now;
        if (window.__frameTime) window.__frameTime(dt);
        requestAnimationFrame(measure);
      }
      requestAnimationFrame(measure);
    });

    const url = `file:///${resolve(labDir, file.name).replace(/\\/g, '/')}`;
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    if (file.interaction === 'pointer') {
      // Sweep pointer across canvas
      for (let i = 0; i < 4; i++) {
        const startX = 200 + Math.random() * 400;
        const startY = 200 + Math.random() * 400;
        const endX = startX + (Math.random() - 0.5) * 600;
        const endY = startY + (Math.random() - 0.5) * 400;
        await page.mouse.move(startX, startY);
        await page.mouse.down();
        for (let j = 0; j < 20; j++) {
          await page.mouse.move(
            startX + (endX - startX) * (j / 20),
            startY + (endY - startY) * (j / 20),
            { steps: 2 }
          );
          await page.waitForTimeout(30);
        }
        await page.mouse.up();
        await page.waitForTimeout(200);
      }
      await page.waitForTimeout(Math.max(0, (MAX_S - 3) * 1000));
    } else if (file.interaction === 'scroll') {
      // Scroll pass
      for (let i = 0; i <= 10; i++) {
        await page.evaluate((frac) => {
          const max = document.documentElement.scrollHeight - window.innerHeight;
          window.scrollTo(0, max * frac);
        }, i / 10);
        await page.waitForTimeout(400);
      }
      await page.waitForTimeout(Math.max(0, (MAX_S - 5) * 1000));
    } else {
      await page.waitForTimeout(MAX_S * 1000);
    }

    // Collect frame stats
    const avg = frameTimes.length > 0
      ? frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
      : 0;
    const p95 = frameTimes.length > 0
      ? frameTimes.sort((a, b) => a - b)[Math.floor(frameTimes.length * 0.95)]
      : 0;

    results.push({ file: file.name, avgFrameMs: avg.toFixed(2), p95FrameMs: p95.toFixed(2), frames: frameTimes.length });

    const videoPath = await page.video().path();
    console.log(`  → ${videoPath}`);
    console.log(`  → avg: ${avg.toFixed(2)}ms, p95: ${p95.toFixed(2)}ms, frames: ${frameTimes.length}`);

    await context.close();
  }

  await browser.close();

  console.log('\n=== FRAME TIME SUMMARY ===');
  for (const r of results) {
    console.log(`${r.file}: avg=${r.avgFrameMs}ms p95=${r.p95FrameMs}ms (${r.frames} frames)`);
  }

  return results;
}

record().catch(e => { console.error(e); process.exit(1); });
