#!/usr/bin/env python3
"""Insert Daily Recap tab into InsightsPage.tsx before the closing </PageShell>."""

import os

path = "src/pages/InsightsPage.tsx"
with open(path, "rb") as f:
    content = f.read()

# Verify file end
old_end = b"        )}\r\n      </div>\r\n      </div>\r\n    </PageShell>\r\n  );\r\n}"
assert old_end in content, "File ending not found. Last 80 bytes: " + repr(content[-80:])

recap_block = b"""        )}

        {activeTab === 'recap' && (
          <motion.div
            data-section="insights.recap"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Daily Recap: Grouped breakdown */}
            <div className="space-y-5">
              {/* Date header strip */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <Sun className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-zinc-100">
                      {dateOffset === 0 ? (parentPeriod === 'today' ? 'Today' : parentPeriod === 'week' ? 'This Week' : parentPeriod === '7day' ? 'Last 7 Days' : parentPeriod === 'month' ? 'This Month' : parentPeriod === '30day' ? 'Last 30 Days' : 'All Time') : parentPeriod.charAt(0).toUpperCase() + parentPeriod.slice(1) + ' \u2014' + dateOffset + 'd'}
                    </h2>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Period breakdown \u2014 grouped by category, app, activity, and sleep
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-800/60 rounded-full border border-zinc-700/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {stats.total_seconds > 0 ? formatHours(stats.total_seconds) : 'No data yet'}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-800/60 rounded-full border border-zinc-700/40">
                    <span className={"w-1.5 h-1.5 rounded-full " + (consistency.score >= 70 ? 'bg-emerald-400' : consistency.score >= 40 ? 'bg-amber-400' : 'bg-rose-400')} />
                    {consistency.score.toFixed(0)}% score
                  </span>
                </div>
              </div>

              {/* Top Apps + Category Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <GlassCard>
                  <div className="flex items-center justify-between mb-3">
                    <SectionHeader title="Top Apps" icon={<Monitor className="w-4 h-4" />} />
                    <span className="text-[10px] text-zinc-600 bg-zinc-800/50 px-2 py-0.5 rounded-full border border-zinc-700/30">{topApps.length > 0 ? topApps.length + ' tracked' : 'none'}</span>
                  </div>
                  <div className="space-y-2">
                    {topApps.length > 0 ? topApps.map((app, i) => {
                      const maxSec = topApps[0]?.seconds || 1;
                      const pct = (app.seconds / maxSec) * 100;
                      const catColor = CATEGORY_COLORS[app.name] || '#6366f1';
                      return (
                        <div key={i} className="flex items-center gap-2 py-1 group">
                          <span className="text-[10px] text-zinc-600 w-4 text-right font-mono">{i+1}</span>
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: catColor }} />
                          <span className="text-xs text-zinc-300 flex-1 truncate group-hover:text-zinc-100 transition-colors">{app.name}</span>
                          <div className="flex-1 max-w-[120px] h-2 bg-zinc-800/60 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: pct + '%' }} transition={{ duration: 0.5, delay: i*0.04 }} className="h-full rounded-full" style={{ backgroundColor: catColor+'88' }} />
                          </div>
                          <span className="text-[10px] text-zinc-500 w-12 text-right font-mono">{formatDuration(app.seconds)}</span>
                        </div>
                      );
                    }) : <div className="text-xs text-zinc-600 py-6 text-center">No app data for this period</div>}
                  </div>
                </GlassCard>

                <GlassCard>
                  <div className="flex items-center justify-between mb-3">
                    <SectionHeader title="Category Distribution" icon={<PieChart className="w-4 h-4" />} />
                    <span className="text-[10px] text-zinc-600 bg-zinc-800/50 px-2 py-0.5 rounded-full border border-zinc-700/30">by time</span>
                  </div>
                  <div className="space-y-2">
                    {Object.keys(stats.byActivity).length > 0 ? Object.entries(stats.byActivity).sort(([,a],[,b]) => b.total_seconds - a.total_seconds).map(([name, data], i) => {
                      const maxSec = maxBy(Object.values(stats.byActivity), v => v.total_seconds, 1);
                      const pct = (data.total_seconds / stats.total_seconds) * 100;
                      const widthPct = (data.total_seconds / maxSec) * 100;
                      const catColor = CATEGORY_COLORS[name] || '#64748b';
                      return (
                        <div key={name} className="flex items-center gap-2 py-1 group">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: catColor }} />
                          <span className="text-xs text-zinc-300 w-24 truncate group-hover:text-zinc-100 transition-colors">{name}</span>
                          <div className="flex-1 h-2 bg-zinc-800/60 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: widthPct + '%' }} transition={{ duration: 0.5, delay: i*0.04 }} className="h-full rounded-full" style={{ backgroundColor: catColor+'88' }} />
                          </div>
                          <span className="text-[10px] text-zinc-500 w-12 text-right font-mono">{formatHours(data.total_seconds)}</span>
                          <span className="text-[10px] text-zinc-600 w-8 text-right">{pct.toFixed(0)}%</span>
                        </div>
                      );
                    }) : <div className="text-xs text-zinc-600 py-6 text-center">No category data yet</div>}
                  </div>
                </GlassCard>
              </div>

              {/* Productivity Split + Sleep */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <GlassCard>
                  <div className="flex items-center justify-between mb-3">
                    <SectionHeader title="Productivity Split" icon={<Zap className="w-4 h-4" />} />
                    <span className="text-[10px] text-zinc-600 bg-zinc-800/50 px-2 py-0.5 rounded-full border border-zinc-700/30">by tier</span>
                  </div>
                  <div className="space-y-2">
                    {tierDistribution.total > 0 ? [
                      { label: 'Productive', color: '#34d399', value: tierDistribution.productive, pct: Math.round((tierDistribution.productive/tierDistribution.total)*100) },
                      { label: 'Neutral', color: '#60a5fa', value: tierDistribution.neutral, pct: Math.round((tierDistribution.neutral/tierDistribution.total)*100) },
                      { label: 'Distracting', color: '#f43f5e', value: tierDistribution.distracting, pct: Math.round((tierDistribution.distracting/tierDistribution.total)*100) },
                    ].map((tier, i) => (
                      <motion.div key={tier.label} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i*0.06 }} className="group">
                        <div className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: tier.color }} />
                          <span className="text-xs text-zinc-400 w-20">{tier.label}</span>
                          <div className="flex-1 h-4 bg-zinc-800/60 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: tier.pct + '%' }} transition={{ duration: 0.6, delay: i*0.06 }} className="h-full rounded-full" style={{ backgroundColor: tier.color+'66' }} />
                          </div>
                          <span className="text-xs font-medium w-16 text-right tabular-nums" style={{ color: tier.color }}>{formatDuration(tier.value)}</span>
                          <span className="text-[10px] text-zinc-600 w-8 text-right">{tier.pct}%</span>
                        </div>
                      </motion.div>
                    )) : <div className="py-6 text-center"><div className="w-8 h-8 mx-auto mb-2 rounded-full bg-zinc-800/50 flex items-center justify-center"><Zap className="w-4 h-4 text-zinc-600" /></div><p className="text-xs text-zinc-600">No productivity data for this period</p></div>}
                    {tierDistribution.total > 0 && <div className="border-t border-zinc-800/40 pt-2 mt-2 flex items-center gap-3 text-[10px] text-zinc-600"><span>Total tracked</span><span className="font-mono font-medium text-zinc-400">{formatDuration(tierDistribution.total)}</span></div>}
                  </div>
                </GlassCard>

                <GlassCard>
                  <div className="flex items-center justify-between mb-3">
                    <SectionHeader title="Sleep Overview" icon={<Moon className="w-4 h-4" />} />
                    <span className="text-[10px] text-zinc-600 bg-zinc-800/50 px-2 py-0.5 rounded-full border border-zinc-700/30">period summary</span>
                  </div>
                  <div className="space-y-2">
                    {sleepTrends.daily.length > 0 ? [
                      <div key="summary" className="flex items-center justify-between py-2 px-3 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20"><Moon className="w-3.5 h-3.5 text-indigo-400" /></div>
                          <div><div className="text-xs text-zinc-500">Avg sleep</div><div className="text-sm font-semibold text-zinc-200">{stats.average_sleep_hours?.toFixed(1) || '--'}h</div></div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-zinc-500">Avg deficit</div>
                          <div className={"text-sm font-semibold " + (stats.sleep_deficit_seconds > 0 ? 'text-rose-300' : 'text-emerald-300')}>{stats.sleep_deficit_seconds > 0 ? '-' + formatHours(stats.sleep_deficit_seconds) : '0h'}</div>
                        </div>
                      </div>,
                      ...Object.entries(sleepTrends.daily).sort(([,a],[,b]) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0,7).map(([date, data]) => {
                        const sleepH = data.sleep_seconds / 3600;
                        const deficitH = data.deficit_seconds / 3600;
                        const hasDeficit = deficitH > 0;
                        return (
                          <div key={date} className="flex items-center gap-2 py-1 group">
                            <span className="text-[10px] text-zinc-600 w-16 font-mono">{format(new Date(date), 'MMM d')}</span>
                            <div className="flex-1 h-2 bg-zinc-800/60 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: Math.min(100, (sleepH/8)*100) + '%', backgroundColor: hasDeficit ? '#f43f5e66' : '#34d39966' }} /></div>
                            <span className={"text-[10px] font-mono w-16 text-right " + (hasDeficit ? 'text-rose-300' : 'text-emerald-300')}>{sleepH.toFixed(1)}h</span>
                            {hasDeficit && <span className="text-[10px] text-rose-400 w-12 text-right">-{deficitH.toFixed(1)}h</span>}
                          </div>
                        );
                      })
                    ] : <div className="py-6 text-center"><div className="w-8 h-8 mx-auto mb-2 rounded-full bg-zinc-800/50 flex items-center justify-center"><Moon className="w-4 h-4 text-zinc-600" /></div><p className="text-xs text-zinc-600">No sleep data for this period</p></div>}
                  </div>
                </GlassCard>
              </div>

              {/* Browser + External */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <GlassCard>
                  <div className="flex items-center justify-between mb-3">
                    <SectionHeader title="Browser Activity" icon={<Globe className="w-4 h-4" />} />
                    <span className="text-[10px] text-zinc-600 bg-zinc-800/50 px-2 py-0.5 rounded-full border border-zinc-700/30">by category</span>
                  </div>
                  <div className="space-y-2">
                    {browserCategoryData.data.length > 0 ? browserCategoryData.data.map((cat, i) => {
                      const maxMs = browserCategoryData.data[0]?.total_ms || 1;
                      const widthPct = (cat.total_ms / maxMs) * 100;
                      const catColor = CATEGORY_COLORS[cat.category] || '#64748b';
                      const hours = cat.total_ms / 3600000;
                      return (
                        <div key={i} className="flex items-center gap-2 py-1 group">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: catColor }} />
                          <span className="text-xs text-zinc-300 w-24 truncate group-hover:text-zinc-100 transition-colors">{cat.category}</span>
                          <div className="flex-1 h-2 bg-zinc-800/60 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: widthPct + '%' }} transition={{ duration: 0.5, delay: i*0.04 }} className="h-full rounded-full" style={{ backgroundColor: catColor+'88' }} />
                          </div>
                          <span className="text-[10px] text-zinc-500 w-12 text-right font-mono">{hours.toFixed(1)}h</span>
                        </div>
                      );
                    }) : <div className="text-xs text-zinc-600 py-6 text-center">No browser data for this period</div>}
                  </div>
                </GlassCard>

                <GlassCard>
                  <div className="flex items-center justify-between mb-3">
                    <SectionHeader title="External Tracking" icon={<Clock className="w-4 h-4" />} />
                    <span className="text-[10px] text-zinc-600 bg-zinc-800/50 px-2 py-0.5 rounded-full border border-zinc-700/30">{Object.keys(stats.byActivity).length > 0 ? Object.keys(stats.byActivity).length + ' activities' : 'none'}</span>
                  </div>
                  <div className="space-y-2">
                    {Object.keys(stats.byActivity).length > 0 ? Object.entries(stats.byActivity).sort(([,a],[,b]) => b.total_seconds - a.total_seconds).slice(0,8).map(([name, data], i) => {
                      const maxSeconds = maxBy(Object.values(stats.byActivity), v => v.total_seconds, 1);
                      const widthPct = (data.total_seconds / maxSeconds) * 100;
                      return (
                        <div key={name} className="flex items-center gap-2 py-1 group">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: breakdownColors[i % breakdownColors.length] }} />
                          <span className="text-xs text-zinc-300 w-28 truncate group-hover:text-zinc-100 transition-colors">{name}</span>
                          <div className="flex-1 h-2 bg-zinc-800/60 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: widthPct + '%' }} transition={{ duration: 0.5, delay: i*0.04 }} className="h-full rounded-full" style={{ backgroundColor: breakdownColors[i % breakdownColors.length] }} />
                          </div>
                          <span className="text-[10px] text-zinc-500 w-14 text-right font-mono">{formatHours(data.total_seconds)}</span>
                          <span className="text-[10px] text-zinc-600 w-8 text-right">{data.session_count} ses</span>
                        </div>
                      );
                    }) : <div className="text-xs text-zinc-600 py-6 text-center">No external tracking data</div>}
                  </div>
                </GlassCard>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <GlassCard>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20"><Target className="w-4 h-4 text-purple-400" /></div>
                    <div><h3 className="text-sm font-semibold text-zinc-200">Consistency Score</h3><p className="text-[10px] text-zinc-500">Overall productivity rating</p></div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="relative" style={{ width: 72, height: 72 }}>
                      <svg width={72} height={72} className="transform -rotate-90">
                        <circle cx={36} cy={36} r={30} stroke="rgba(39,39,42,0.6)" strokeWidth={6} fill="none" />
                        <motion.circle cx={36} cy={36} r={30} stroke={consistency.score >= 70 ? '#34d399' : consistency.score >= 40 ? '#f59e0b' : '#f43f5e'} strokeWidth={6} fill="none" strokeLinecap="round" strokeDasharray={188.5} initial={{ strokeDashoffset: 188.5 }} animate={{ strokeDashoffset: 188.5 - (consistency.score/100)*188.5 }} transition={{ duration: 1.2, ease: 'easeOut' }} />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={"text-xl font-bold tabular-nums " + (consistency.score >= 70 ? 'text-emerald-300' : consistency.score >= 40 ? 'text-amber-300' : 'text-rose-300')}>{consistency.score.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="text-xs text-zinc-500">Score</div>
                      <div className="text-lg font-bold tabular-nums" style={{ color: consistency.score >= 70 ? '#34d399' : consistency.score >= 40 ? '#f59e0b' : '#f43f5e' }}>{consistency.score.toFixed(0)}%</div>
                      <div className="text-[10px] text-zinc-600 mt-1">{consistency.weekly_comparison.length > 0 ? 'vs ' + formatHours(consistency.weekly_comparison[0]?.total_seconds || 0) + ' best week' : 'No comparison data'}</div>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20"><Zap className="w-4 h-4 text-amber-400" /></div>
                    <div><h3 className="text-sm font-semibold text-zinc-200">Current Streak</h3><p className="text-[10px] text-zinc-500">Consecutive weeks on track</p></div>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="relative" style={{ width: 64, height: 64 }}>
                      <div className="absolute inset-0 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center"><span className="text-2xl font-bold text-amber-300">{consistency.streak}</span></div>
                      <div className="absolute inset-0 rounded-full bg-amber-500/5" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="text-sm font-bold text-amber-300">{consistency.streak}w</div>
                      <div className="text-[10px] text-zinc-600">weeks on track</div>
                      <div className="text-[10px] text-zinc-500 mt-2">{consistency.this_week ? formatHours(consistency.this_week) + ' this week' : 'No data yet'}</div>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20"><Activity className="w-4 h-4 text-sky-400" /></div>
                    <div><h3 className="text-sm font-semibold text-zinc-200">Best Day</h3><p className="text-[10px] text-zinc-500">Most productive day of week</p></div>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/30"><span className="text-2xl font-bold text-sky-200">{DAY_LABELS[bestDays.bestDay]}</span><span className="text-xs text-zinc-500 block mt-0.5">Best day</span></div>
                    <div className="flex flex-col gap-1">
                      <div className="text-xs text-zinc-500">Avg hours</div>
                      <div className="text-sm font-semibold text-zinc-300">{bestDays.averages[DAY_LABELS[bestDays.bestDay]] ? bestDays.averages[DAY_LABELS[bestDays.bestDay]].toFixed(1) + 'h' : '--'}</div>
                      <div className="text-[10px] text-zinc-600 mt-1">Worst: {DAY_LABELS[bestDays.worstDay]}</div>
                    </div>
                  </div>
                </GlassCard>
              </div>

              {/* Sleep Trend Chart */}
              {sleepTrendData.labels.length > 0 && (
                <GlassCard>
                  <div className="flex items-center justify-between mb-3">
                    <div><h3 className="text-sm font-semibold text-zinc-200">Sleep Trend</h3><p className="text-[10px] text-zinc-500 mt-0.5">Daily sleep hours over the selected period</p></div>
                    <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                      <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-indigo-400" />Sleep</span>
                      <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-rose-400" />Deficit</span>
                    </div>
                  </div>
                  <div className="h-40">
                    <Bar data={{ labels: sleepTrendData.labels, datasets: [{ label: 'Sleep (h)', data: sleepTrendData.sleepData, backgroundColor: '#6366f180', borderColor: '#6366f1', borderWidth: 1, borderRadius: 3, borderSkipped: false }, { label: 'Deficit (h)', data: sleepTrendData.deficitData, backgroundColor: '#f43f5e60', borderColor: '#f43f5e', borderWidth: 1, borderRadius: 3, borderSkipped: false }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: '#18181b', borderColor: '#3f3f46', borderWidth: 1, titleColor: '#e4e4e7', bodyColor: '#a1a1aa', padding: 8, cornerRadius: 6 } }, scales: { x: { grid: { display: false }, ticks: { color: '#71717a', font: { size: 9 } } }, y: { grid: { color: '#27272a' }, ticks: { color: '#71717a', font: { size: 9 } }, beginAtZero: true, suggestedMax: 10 } } }} />
                  </div>
                </GlassCard>
              )}

              {/* Empty State */}
              {stats.total_seconds === 0 && (
                <div className="py-16 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-full bg-zinc-800/50 border border-zinc-700/30 flex items-center justify-center mb-4"><Sun className="w-6 h-6 text-zinc-600" /></div>
                  <h3 className="text-sm font-semibold text-zinc-300 mb-1">No data for this period yet</h3>
                  <p className="text-xs text-zinc-600 max-w-xs">Start tracking your activity to see the period breakdown. The recap updates automatically as you use your apps, browse the web, and track external activities.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
      </div>
    </PageShell>
  );
}"""

new_content = content.replace(old_end, recap_block)
assert new_content != content, "Replacement failed"

with open(path, "wb") as f:
    f.write(new_content)

with open(path, "rb") as f:
    v = f.read()
assert b"activeTab === 'recap'" in v, "Marker not found"

lines = v.count(b"\r\n")
print("OK - inserted Daily Recap tab. Lines: " + str(lines))
