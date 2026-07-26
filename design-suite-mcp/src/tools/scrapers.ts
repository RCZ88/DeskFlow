import axios from 'axios';
import * as cheerio from 'cheerio';

interface AestheticResult {
  title: string;
  description: string;
  imageUrl: string;
  source: string;
}

const RATE_LIMIT_MS = 6000;
let lastRequestTime = 0;

async function rateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise(r => setTimeout(r, RATE_LIMIT_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

export async function getCariContext(query: string): Promise<string> {
  await rateLimit();
  const url = `https://cari.institute/aesthetics?q=${encodeURIComponent(query)}`;
  const response = await axios.get(url, {
    timeout: 30000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml',
    },
  });

  const $ = cheerio.load(response.data);
  const results: AestheticResult[] = [];

  $('.aesthetic-card, [class*="aesthetic"], [class*="card"]').each((_, el) => {
    const title = $(el).find('h2, h3, [class*="title"]').first().text().trim();
    const description = $(el).find('p, [class*="description"]').first().text().trim();
    const imageUrl = $(el).find('img').first().attr('src') || '';

    if (title || imageUrl) {
      results.push({
        title: title || 'Untitled',
        description: description || '',
        imageUrl: imageUrl.startsWith('http') ? imageUrl : imageUrl ? `https://cari.institute${imageUrl}` : '',
        source: 'CARI',
      });
    }
  });

  return JSON.stringify(results, null, 2);
}

export async function getFontsInUse(mood: string): Promise<string> {
  await rateLimit();
  const url = `https://fontsinuse.com/search?q=${encodeURIComponent(mood)}`;
  const response = await axios.get(url, {
    timeout: 30000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml',
    },
  });

  const $ = cheerio.load(response.data);
  const results: { font: string; context: string; url: string }[] = [];

  $('a[href*="/typeface/"]').each((_, el) => {
    const fontName = $(el).text().trim();
    const href = $(el).attr('href') || '';
    if (fontName) {
      results.push({
        font: fontName,
        context: `Found in search for "${mood}"`,
        url: href.startsWith('http') ? href : `https://fontsinuse.com${href}`,
      });
    }
  });

  return JSON.stringify(results, null, 2);
}
