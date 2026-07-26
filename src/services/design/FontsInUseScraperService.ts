import axios from 'axios';
import * as cheerio from 'cheerio';

export interface FontPair {
  headingFont: string;
  bodyFont: string;
  usageContext: string;
  sourceUrl: string;
}

interface CacheEntry {
  mood: string;
  result: FontPair[];
  createdAt: number;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];
const RATE_LIMIT_MS = 6000;
const REQUEST_TIMEOUT_MS = 30000;

let lastRequestTime = 0;
const cache = new Map<string, CacheEntry>();

function getCached(mood: string): FontPair[] | null {
  const entry = cache.get(mood.toLowerCase().trim());
  if (entry && Date.now() - entry.createdAt < CACHE_TTL_MS) {
    return entry.result;
  }
  cache.delete(mood.toLowerCase().trim());
  return null;
}

function setCache(mood: string, result: FontPair[]): void {
  cache.set(mood.toLowerCase().trim(), {
    mood,
    result,
    createdAt: Date.now(),
  });
}

function getStaleCache(mood: string): FontPair[] | null {
  const entry = cache.get(mood.toLowerCase().trim());
  return entry ? entry.result : null;
}

async function rateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

async function scrapeFontsInUsePage(mood: string): Promise<FontPair[]> {
  await rateLimit();

  const url = `https://fontsinuse.com/search?q=${encodeURIComponent(mood)}`;
  const response = await axios.get(url, {
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  const $ = cheerio.load(response.data);
  const results: FontPair[] = [];

  $('.use-card, [class*="use"], [class*="specimen"], article').each((_, el) => {
    const headingFont = $(el).find('[class*="heading"], [class*="display"], h2, h3').first().text().trim();
    const bodyFont = $(el).find('[class*="body"], [class*="text"], p').first().text().trim();
    const usageContext = $(el).find('[class*="context"], [class*="description"], [class*="info"]').first().text().trim();
    const link = $(el).find('a').first().attr('href') || '';

    if (headingFont || bodyFont) {
      results.push({
        headingFont: headingFont || 'Unknown',
        bodyFont: bodyFont || 'Unknown',
        usageContext: usageContext || mood,
        sourceUrl: link.startsWith('http') ? link : link ? `https://fontsinuse.com${link}` : url,
      });
    }
  });

  if (results.length === 0) {
    $('a[href*="/typeface/"]').each((_, el) => {
      const fontName = $(el).text().trim();
      const href = $(el).attr('href') || '';
      if (fontName) {
        results.push({
          headingFont: fontName,
          bodyFont: 'See source',
          usageContext: `Found in search for "${mood}"`,
          sourceUrl: href.startsWith('http') ? href : `https://fontsinuse.com${href}`,
        });
      }
    });
  }

  return results.slice(0, 10);
}

export async function getTypographyPairs(mood: string): Promise<FontPair[]> {
  const normalizedMood = mood.toLowerCase().trim();
  if (!normalizedMood) return [];

  const cached = getCached(normalizedMood);
  if (cached) return cached;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const results = await scrapeFontsInUsePage(mood);
      if (results.length > 0) {
        setCache(normalizedMood, results);
        return results;
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
      }
    }
  }

  const stale = getStaleCache(normalizedMood);
  if (stale) return stale;

  throw new Error(`Failed to scrape FontsInUse after ${MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`);
}
