import type Database from 'better-sqlite3';
import type { InsightAtom } from '../../shared/insights';
import { mean, zScore, delta } from './detectors';
const { ipcMain } = require('electron');

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };

interface RollupRow { date: string; domain: string; metric: string; value: number; }

export function buildDailyRollup(db: Database, date: string) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO daily_rollup (date, domain, metric, value) VALUES (?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    // App usage from activity logs
    const appRows = db.prepare(`
      SELECT app, SUM(duration_ms) / 60000.0 as minutes
      FROM app_logs WHERE date(timestamp) = ? GROUP BY app
    `).all(date) as any[];
    for (const row of appRows) {
      stmt.run(date, 'apps', `app:${row.app}:min`, row.minutes);
    }

    // Total productive time
    const prodRow = db.prepare(`
      SELECT COALESCE(SUM(duration_ms) / 60000.0, 0) as minutes
      FROM app_logs a LEFT JOIN app_categories c ON a.app = c.app_name
      WHERE date(a.timestamp) = ? AND c.tier = 'productive'
    `).get(date) as any;
    stmt.run(date, 'productivity', 'productive_min', prodRow?.minutes || 0);

    // Total time
    const totalRow = db.prepare(`
      SELECT COALESCE(SUM(duration_ms) / 60000.0, 0) as minutes
      FROM app_logs WHERE date(timestamp) = ?
    `).get(date) as any;
    stmt.run(date, 'productivity', 'total_min', totalRow?.minutes || 0);

    // Git commits
    const commitRow = db.prepare(`
      SELECT COUNT(*) as count FROM commits WHERE date(date) = ?
    `).get(date) as any;
    stmt.run(date, 'git', 'commits', commitRow?.count || 0);

    // AI sessions
    const aiRow = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_tokens), 0) as tokens
      FROM terminal_sessions WHERE date(created_at) = ?
    `).get(date) as any;
    stmt.run(date, 'ai', 'sessions', aiRow?.count || 0);
    stmt.run(date, 'ai', 'tokens', aiRow?.tokens || 0);

    // Sleep
    const sleepRow = db.prepare(`
      SELECT COALESCE(SUM(duration_s) / 3600.0, 0) as hours
      FROM external_sessions WHERE date(start_time) = ? AND activity = 'Sleep'
    `).get(date) as any;
    stmt.run(date, 'sleep', 'hours', sleepRow?.hours || 0);
  });

  tx();
}

export function dailyFunFact(db: Database, date: string): InsightAtom | null {
  const candidates: InsightAtom[] = [];

  // Get historical data for comparison
  const histDates = Array.from({ length: 14 }, (_, i) => daysAgo(i + 1));
  const histProd = histDates.map(d => {
    const row = db.prepare(`SELECT value FROM daily_rollup WHERE date = ? AND domain = 'productivity' AND metric = 'productive_min'`).get(d) as any;
    return row?.value || 0;
  });
  const histTotal = histDates.map(d => {
    const row = db.prepare(`SELECT value FROM daily_rollup WHERE date = ? AND domain = 'productivity' AND metric = 'total_min'`).get(d) as any;
    return row?.value || 0;
  });

  // Today's data
  const todayProd = (db.prepare(`SELECT value FROM daily_rollup WHERE date = ? AND domain = 'productivity' AND metric = 'productive_min'`).get(date) as any)?.value || 0;
  const todayTotal = (db.prepare(`SELECT value FROM daily_rollup WHERE date = ? AND domain = 'productivity' AND metric = 'total_min'`).get(date) as any)?.value || 0;
  const todayCommits = (db.prepare(`SELECT value FROM daily_rollup WHERE date = ? AND domain = 'git' AND metric = 'commits'`).get(date) as any)?.value || 0;
  const todaySleep = (db.prepare(`SELECT value FROM daily_rollup WHERE date = ? AND domain = 'sleep' AND metric = 'hours'`).get(date) as any)?.value || 0;

  // Top app today
  const topApp = db.prepare(`
    SELECT app, SUM(duration_ms) / 60000.0 as minutes
    FROM app_logs WHERE date(timestamp) = ? GROUP BY app ORDER BY minutes DESC LIMIT 1
  `).get(date) as any;

  // Candidate 1: Top app superlative
  if (topApp && topApp.minutes > 30) {
    const histApp = histDates.map(d => {
      const row = db.prepare(`SELECT value FROM daily_rollup WHERE date = ? AND metric = ?`).get(d, `app:${topApp.app}:min`) as any;
      return row?.value || 0;
    });
    const z = zScore(topApp.minutes, histApp);
    const avg = mean(histApp);
    const pct = avg > 0 ? Math.round(((topApp.minutes - avg) / avg) * 100) : 0;
    const direction = pct > 5 ? 'up' : pct < -5 ? 'down' : 'flat';
    candidates.push({
      id: `top_app.day.${date}`,
      kind: 'superlative',
      scope: { period: 'day', start: date, end: date },
      domain: 'apps',
      value: Math.round(topApp.minutes),
      unit: 'min',
      comparison: { baseline: Math.round(avg), deltaPct: pct, direction },
      entities: [{ label: topApp.app, value: Math.round(topApp.minutes) }],
      surprise: Math.min(Math.abs(z) / 3, 1),
      relevance: 0.8,
      confidence: histApp.filter(v => v > 0).length >= 3 ? 0.9 : 0.5,
      novelty: 0.5,
      visual: 'bigNumber',
      copy: {
        headline: `${Math.round(topApp.minutes)} min in ${topApp.app}`,
        subtext: direction === 'up' ? `That's ${pct}% more than your average` : direction === 'down' ? `${pct}% less than usual` : 'Right on your average',
        source: 'template',
      },
      shareable: true,
    });
  }

  // Candidate 2: Productivity ratio
  if (todayTotal > 30) {
    const ratio = todayProd / todayTotal;
    const histRatios = histProd.map((p, i) => histTotal[i] > 0 ? p / histTotal[i] : 0);
    const z = zScore(ratio, histRatios);
    candidates.push({
      id: `ratio.day.${date}`,
      kind: 'ratio',
      scope: { period: 'day', start: date, end: date },
      domain: 'productivity',
      value: Math.round(ratio * 100),
      unit: 'pct',
      surprise: Math.min(Math.abs(z) / 2, 1),
      relevance: 0.9,
      confidence: 0.8,
      novelty: 0.4,
      visual: 'donut',
      copy: {
        headline: `${Math.round(ratio * 100)}% productive today`,
        subtext: ratio > 0.6 ? 'Crushing it!' : ratio > 0.4 ? 'Solid focus time' : 'Room for more deep work',
        source: 'template',
      },
      shareable: true,
    });
  }

  // Candidate 3: Git commits
  if (todayCommits > 0) {
    const histCommits = histDates.map(d => {
      const row = db.prepare(`SELECT value FROM daily_rollup WHERE date = ? AND domain = 'git' AND metric = 'commits'`).get(d) as any;
      return row?.value || 0;
    });
    const z = zScore(todayCommits, histCommits);
    if (Math.abs(z) > 1) {
      candidates.push({
        id: `commits.day.${date}`,
        kind: todayCommits > mean(histCommits) ? 'record' : 'delta',
        scope: { period: 'day', start: date, end: date },
        domain: 'git',
        value: todayCommits,
        unit: 'commits',
        comparison: { baseline: Math.round(mean(histCommits)), deltaPct: Math.round(delta(todayCommits, mean(histCommits))), direction: todayCommits > mean(histCommits) ? 'up' : 'down' },
        surprise: Math.min(Math.abs(z) / 3, 1),
        relevance: 0.7,
        confidence: 0.9,
        novelty: 0.6,
        visual: 'bigNumber',
        copy: {
          headline: `${todayCommits} commits today`,
          subtext: todayCommits > mean(histCommits) ? 'Above your average!' : 'Quieter than usual on the repo',
          source: 'template',
        },
        shareable: true,
      });
    }
  }

  // Candidate 4: Sleep
  if (todaySleep > 0) {
    const histSleep = histDates.map(d => {
      const row = db.prepare(`SELECT value FROM daily_rollup WHERE date = ? AND domain = 'sleep' AND metric = 'hours'`).get(d) as any;
      return row?.value || 0;
    });
    const avgSleep = mean(histSleep.filter(v => v > 0));
    if (avgSleep > 0) {
      candidates.push({
        id: `sleep.day.${date}`,
        kind: 'pattern',
        scope: { period: 'day', start: date, end: date },
        domain: 'sleep',
        value: Math.round(todaySleep * 10) / 10,
        unit: 'hr',
        comparison: { baseline: Math.round(avgSleep * 10) / 10, deltaPct: Math.round(delta(todaySleep, avgSleep)), direction: todaySleep > avgSleep ? 'up' : 'down' },
        surprise: Math.min(Math.abs(zScore(todaySleep, histSleep)) / 2, 1),
        relevance: 0.6,
        confidence: 0.8,
        novelty: 0.3,
        visual: 'bigNumber',
        copy: {
          headline: `${Math.round(todaySleep * 10) / 10}h sleep`,
          subtext: todaySleep >= 7 ? 'Well rested!' : todaySleep >= 6 ? 'Could use a bit more' : 'Sleep debt building up',
          source: 'template',
        },
        shareable: false,
      });
    }
  }

  if (candidates.length === 0) return null;

  // Score: surprise * 0.45 + relevance * 0.25 + confidence * 0.2 + novelty * 0.1
  candidates.sort((a, b) => {
    const scoreA = 0.45 * a.surprise + 0.25 * a.relevance + 0.2 * a.confidence + 0.1 * a.novelty;
    const scoreB = 0.45 * b.surprise + 0.25 * b.relevance + 0.2 * b.confidence + 0.1 * b.novelty;
    return scoreB - scoreA;
  });

  return candidates[0];
}
