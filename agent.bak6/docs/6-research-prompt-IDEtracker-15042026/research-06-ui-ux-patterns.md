# Research: UI/UX Patterns for Developer Dashboards

## Context
Understanding existing UI/UX patterns for developer productivity dashboards to inform the design of the IDE Projects feature's user interface.

## Research Objectives

### 1. Existing Products to Study

**Engineering Intelligence Platforms:**

| Platform | URL | Key Features |
|----------|-----|--------------|
| LinearB | linearb.io | DORA/Space metrics, CI insights, Slackbot |
| Jellyfish | jellyfish.co | Business alignment, Copilot dashboard |
| Faros AI | faros.ai | SDLC-wide, AI commit detection |
| Swarmia | swarmia.com | User-friendly DORA/Space |
| Exceeds AI | exceeds.ai | Multi-tool AI attribution |

**Built-in Dashboards:**
- GitHub Copilot metrics dashboard
- VS Code extension marketplace stats
- Cursor Analytics (Enterprise)
- JetBrains Toolbox statistics

**Questions to Answer:**
- What makes these dashboards effective or ineffective?
- What's the information hierarchy in each?
- How do they handle data density?

### 2. Metric Visualization Patterns

**Time Series:**
- Commit frequency over time (line chart)
- Token usage trends (area chart)
- Deployment frequency (bar chart)
- Example: GitHub's contribution graph

**Funnel Visualizations:**
- DORA metrics conversion
- PR lifecycle stages
- Build pipeline success rates

**Distribution Charts:**
- Tool usage distribution (pie/bar)
- File change distribution (treemap)
- Language breakdown (horizontal bar)

**Heatmaps:**
- Activity patterns (hour/day/week)
- Focus time visualization
- Keyboard/mouse usage (like InputMetrics)

**Questions to Answer:**
- What chart types work best for developer metrics?
- How to handle data with multiple dimensions?
- What's the right granularity for time-based views?

### 3. Vibe Coding Context UI

**Specific UI Elements Needed:**

```
┌─────────────────────────────────────────┐
│ AI Tool Usage This Month                │
├─────────────────────────────────────────┤
│ Tokens: 1.2M          Cost: $12.47      │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 85%    │
│ vs last month: +23%                     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ AI vs Human Contribution                │
├─────────────────────────────────────────┤
│ [████████████░░░░░░] 67% AI            │
│ Cursor: 12,450 lines                    │
│ Copilot: 3,200 lines                   │
│ Claude: 890 lines                       │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Tool Setup Score                        │
├─────────────────────────────────────────┤
│ ● IDE: VS Code + Cursor ✓              │
│ ● Linters: ESLint, Prettier ✓          │
│ ● AI: Copilot ✓, Claude Code ✓        │
│ ○ Missing: Docker configured           │
│ Score: 85/100                           │
└─────────────────────────────────────────┘
```

**Questions to Answer:**
- How should we display "setup completeness"?
- What's the best way to show AI attribution?
- How to visualize token budgets and alerts?

### 4. Information Architecture

**Dashboard Sections:**

1. **Overview** - High-level metrics cards
   - Total tokens used
   - Commits this week
   - Tool setup score
   - Active projects

2. **AI Tools** - Detailed AI usage
   - Token breakdown by tool
   - Cost tracking
   - AI vs human lines
   - Model usage distribution

3. **Projects** - Per-project metrics
   - Tools used per project
   - Commit activity
   - Code churn

4. **Tools** - Installed tools inventory
   - What's installed
   - Versions
   - Recommendations

5. **Trends** - Longitudinal analysis
   - Week-over-week
   - Month-over-month
   - DORA metrics

**Questions to Answer:**
- What's the right information hierarchy?
- Should we have tabs, sidebar, or dashboard layout?
- How to handle mobile vs desktop viewing?

### 5. CLI vs GUI Considerations

**CLI Tool:**
- `app-tracker stats` - Quick token counts
- `app-tracker tools` - Installed tools list
- `app-tracker sync` - Sync with IDE data

**GUI Dashboard:**
- Visual charts and graphs
- Interactive filtering
- Detailed breakdowns
- Settings and configuration

**Companion App:**
- Quick stats on mobile
- Notifications for budget alerts
- Link to full dashboard

**Questions to Answer:**
- Should the IDE Projects feature be CLI-first, GUI-first, or hybrid?
- How should CLI and GUI share data?
- What's the mobile experience?

### 6. Notification & Alerting

**Alert Triggers:**
- Token usage exceeds budget threshold
- New AI tool detected
- Tool setup incomplete
- DORA metrics declining

**Notification Types:**
- In-app badges
- System notifications
- Email summaries
- Slack/Discord integrations

**Weekly Summary Example:**
```
📊 Your Week in Code

AI Usage: 450K tokens ($4.50)
Top AI: Cursor (78%), Copilot (22%)

Commits: 23 (↑ 15% vs avg)
Top project: app-tracker

Tools: 12 installed, 3 new this week
Setup score: 85/100
```

**Questions to Answer:**
- What alerts are most valuable?
- How to avoid notification fatigue?
- Should notifications be opt-in or default?

### 7. Design System Considerations

**Color Palette Ideas:**
- AI metrics: Purple/violet tones
- Human metrics: Green/teal tones
- Alerts: Orange/red tones
- Neutrals: Dark mode friendly

**Component Patterns:**
- Metric cards with sparklines
- Progress bars for budgets
- Chip/tag components for tools
- Expandable sections for details

**Questions to Answer:**
- Should we use an existing design system (Material, Chakra, etc.)?
- What's our dark/light mode strategy?
- How to handle accessibility?

## Deliverables

1. Reference implementations with screenshots/features
2. Recommended chart types for each metric
3. Dashboard wireframe ideas
4. Notification/alerting strategy
5. Design system recommendations

## Success Criteria

- [ ] Have studied 3+ existing dashboard implementations
- [ ] Know best chart types for developer metrics
- [ ] Have wireframe ideas for key screens
- [ ] Notification strategy defined
- [ ] Design system approach established
