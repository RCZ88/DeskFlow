import { chromium } from 'playwright-core';
const CHROME = 'C:\\Users\\cleme\\AppData\\Local\\ms-playwright\\chromium-1208\\chrome-win64\\chrome.exe';
const URL = 'http://127.0.0.1:5173/';
const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: 'shot-hero.png' });

// scroll to Threads section (where a warp is active + glowing)
const threads = await page.$('#threads');
if (threads) { await threads.scrollIntoViewIfNeeded(); await page.waitForTimeout(1500); }
await page.screenshot({ path: 'shot-threads.png' });

// scroll to Shuttle
const shuttle = await page.evaluate(() => {
  const secs = document.querySelectorAll('section');
  for (const s of secs) { if (s.textContent && s.textContent.includes('Flags a subscription')) { s.scrollIntoView(); return true; } }
  return false;
});
await page.waitForTimeout(1500);
await page.screenshot({ path: 'shot-shuttle.png' });
console.log('done; threads found:', !!threads, 'shuttle scrolled:', shuttle);
await browser.close();
