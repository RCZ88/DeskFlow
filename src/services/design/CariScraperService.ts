import axios from 'axios';
import * as cheerio from 'cheerio';

export interface AestheticResult {
  title: string;
  description: string;
  imageUrl: string;
  source: string;
}

interface CacheEntry {
  query: string;
  result: AestheticResult[];
  createdAt: number;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];
const RATE_LIMIT_MS = 6000; // 10 requests per minute
const REQUEST_TIMEOUT_MS = 30000;

let lastRequestTime = 0;
const cache = new Map<string, CacheEntry>();

function getCached(query: string): AestheticResult[] | null {
  const entry = cache.get(query.toLowerCase().trim());
  if (entry && Date.now() - entry.createdAt < CACHE_TTL_MS) {
    return entry.result;
  }
  cache.delete(query.toLowerCase().trim());
  return null;
}

function setCache(query: string, result: AestheticResult[]): void {
  cache.set(query.toLowerCase().trim(), {
    query,
    result,
    createdAt: Date.now(),
  });
}

function getStaleCache(query: string): AestheticResult[] | null {
  const entry = cache.get(query.toLowerCase().trim());
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

async function scrapeCariPage(query: string): Promise<AestheticResult[]> {
  await rateLimit();

  const url = `https://cari.institute/aesthetics?q=${encodeURIComponent(query)}`;
  const response = await axios.get(url, {
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  const $ = cheerio.load(response.data);
  const results: AestheticResult[] = [];

  $('.aesthetic-card, [class*="aesthetic"], [class*="card"]').each((_, el) => {
    const title = $(el).find('h2, h3, [class*="title"]').first().text().trim();
    const description = $(el).find('p, [class*="description"], [class*="desc"]').first().text().trim();
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

  if (results.length === 0) {
    $('img').each((_, el) => {
      const src = $(el).attr('src') || '';
      const alt = $(el).attr('alt') || '';
      const closest = $(el).closest('a, div, section');
      const nearbyText = closest.find('h2, h3, p').first().text().trim() || alt;

      if (src && nearbyText) {
        results.push({
          title: nearbyText.slice(0, 100),
          description: '',
          imageUrl: src.startsWith('http') ? src : `https://cari.institute${src}`,
          source: 'CARI',
        });
      }
    });
  }

  return results.slice(0, 20);
}

export async function scrapeAesthetics(query: string): Promise<AestheticResult[]> {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return [];

  const cached = getCached(normalizedQuery);
  if (cached) return cached;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const results = await scrapeCariPage(query);
      if (results.length > 0) {
        setCache(normalizedQuery, results);
        return results;
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
      }
    }
  }

  const stale = getStaleCache(normalizedQuery);
  if (stale) return stale;

  throw new Error(`Failed to scrape CARI after ${MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`);
}
