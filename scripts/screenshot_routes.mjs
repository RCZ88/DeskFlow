import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const BASE = 'http://localhost:38123';
const ROUTES = [
  'dashboard','activity','ai','learn','resume','ide','finance','insights',
  'life','settings','guide','studio','agentic','terminal','external','database',
  'rankings','documentation'
];
const OUT = join(process.cwd(), 'design/audit/shots');
mkdirSync(OUT, { recursive: true });

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  const results = [];

  for (const route of ROUTES) {
    const url = route === 'dashboard' ? BASE : `${BASE}/${route}`;
    const safe = route.replace(/[^a-z0-9]/g, '_');
    const path = join(OUT, `${safe}.png`);
    // Open a fresh page for each route
    const page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });
    try {
      console.log(`NAV ${route} -> ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path, fullPage: false });
      const title = await page.title();
      const dp = await page.evaluate(() => document.documentElement.getAttribute('data-page') || '(none)');
      results.push({ route, status: 'OK', title, dataPage: dp, file: path });
      console.log(`OK   ${route} -> ${safe}.png (title: ${title}, data-page: ${dp})`);
      await page.close();
    } catch (e) {
      results.push({ route, status: 'ERR', error: String(e).slice(0, 200) });
      console.log(`ERR  ${route}: ${String(e).slice(0, 150)}`);
      try { await page.close(); } catch(_) {}
    }
  }
  await browser.close();
  writeFileSync(join(OUT, '_census.json'), JSON.stringify(results, null, 2));
  const ok = results.filter(r => r.status === 'OK').length;
  console.log(`\nCENSUS DONE: ${results.length} routes, ${ok} OK, ${results.length - ok} ERR`);
}
main().catch(e => { console.error(e); process.exit(1); });