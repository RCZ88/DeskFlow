# CONTEXT_BUNDLE.md - External Provider Research Integration

**Project:** DeskFlow - Electron desktop app for app tracking and AI agent workspaces  
**Date:** 2026-06-07  
**Focus:** External provider integration for research and goal tracking  

---

## 🎯 Current Project State

### Core Architecture
- **Electron App** - Main process (`src/main.ts`), preload bridge (`src/preload.ts`), React renderer (`src/main.tsx`)
- **Data Layer** - SQLite database (`logs`, `daily_stats`, `ai_briefs`, `ai_interests` tables) with JSON fallback
- **AI Integration** - OpenRouter API for daily briefs, weekly reviews, topic digests, anomaly detection
- **Tracking System** - `active-win` for app/window tracking, sleep detection, external activity logging

### Current External Data Capabilities
- **External Page** - Manual activity tracking with timer (`src/pages/ExternalPage.tsx`)
- **External Sessions Table** - `id, activity_id, started_at, ended_at, duration_ms, notes`
- **IPC Endpoints** - `get-external-sessions`, `add-external-session`, `update-external-session`, `delete-external-session`
- **Data Visualization** - Trend charts, distribution views, habit heatmaps per activity

---

## 📊 Existing Data Schema for External Integration

### Core Tables
```typescript
// logs table - app tracking data
interface LogEntry {
  id: number;
  timestamp: Date;
  app: string;
  category: string;
  duration_ms: number;
  title?: string;
  project?: string;
  keystrokes?: number;
  clicks?: number;
  window_switches?: number;
  url?: string;
  domain?: string;
  tab_id?: string;
  is_browser_tracking?: boolean;
}

// external_sessions table - manual activities
interface ExternalSession {
  id: number;
  activity_id: string;
  started_at: Date;
  ended_at?: Date;
  duration_ms: number;
  notes?: string;
}

// ai_interests table - research topics
interface AIInterest {
  id: number;
  topic: string;
  enabled: boolean;
  created_at: Date;
}

// ai_briefs table - cached AI analysis
interface AIBrief {
  id: number;
  type: 'daily' | 'weekly' | 'topic';
  date: string; // YYYY-MM-DD or week key
  content: any; // JSON
  model_used: string;
  tokens_used: number;
  created_at: Date;
}
```

### Current IPC Endpoints for External Data
```typescript
// External session management
'get-external-sessions' - Get all external sessions
'add-external-session' - Create new external session
'update-external-session' - Update existing session
'delete-external-session' - Delete session

// AI features
'get-topic-digest' - Generate research digest from interests
'get-ai-brief' - Daily/weekly AI briefs
'get-interest-topics' - Manage research interests
'add-interest-topic' - Add new research topic
'remove-interest-topic' - Remove research topic
```

---

## 🔗 External Provider Integration Points

### Target Providers
1. **CloudFlayer** - Cloud infrastructure and deployment data
2. **Invilier** - Development workflow and productivity metrics  
3. **Olamah** - Project management and task tracking

### Integration Architecture
```typescript
// Proposed external provider interface
interface ExternalProvider {
  name: string;
  endpoint: string;
  apiKey: string;
  rateLimits: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  dataMapping: {
    [dataType: string]: DataTransformFunction;
  };
}

// Data types to ingest
type ResearchDataType = 
  | 'productivity_metrics'
  | 'deployment_stats' 
  | 'project_progress'
  | 'development_workflow'
  | 'task_completion'
  | 'code_quality';
```

---

## 🎯 Research and Goal Tracking Features

### Current AI Capabilities
- **Daily Briefs** - Productivity summary with trends
- **Weekly Reviews** - Pattern analysis and insights
- **Topic Digests** - Research summaries on user-defined topics
- **Anomaly Detection** - Deviation from baseline patterns

### Proposed Research Integration
```typescript
// Enhanced research functionality
interface ResearchGoal {
  id: string;
  title: string;
  description: string;
  category: 'productivity' | 'development' | 'learning' | 'project';
  priority: 'high' | 'medium' | 'low';
  status: 'active' | 'completed' | 'paused';
  targetDate?: Date;
  milestones: Milestone[];
  relatedTopics: string[];
  externalDataSources: ExternalDataSource[];
}

interface ResearchInsight {
  id: string;
  type: 'pattern' | 'correlation' | 'trend' | 'anomaly';
  title: string;
  description: string;
  confidence: number;
  relatedGoals: string[];
  supportingData: any;
  recommendations: string[];
}
```

### Data Flow for Research Integration
```
External Providers → Data Ingestion Layer → Research Processing → AI Analysis → Goal Tracking → User Interface
```

---

## 🛠️ Implementation Requirements

### Backend Components Needed
1. **External Provider Manager** (`src/services/ExternalProviderService.ts`)
   - Provider authentication and rate limiting
   - Data synchronization scheduling
   - Error handling and retry logic

2. **Research Data Processor** (`src/services/ResearchService.ts`)
   - Data normalization and validation
   - Pattern detection algorithms
   - Correlation analysis with existing tracking data

3. **Goal Management System** (`src/services/GoalService.ts`)
   - CRUD operations for research goals
   - Progress tracking and milestone management
   - Integration with AI recommendations

4. **Enhanced AI Analysis** (`src/services/AIService.ts`)
   - Multi-source data analysis capabilities
   - Cross-provider pattern recognition
   - Goal-based insight generation

### IPC Endpoints to Add
```typescript
// External provider management
'connect-external-provider' - Setup new provider connection
'disconnect-external-provider' - Remove provider
'get-connected-providers' - List active providers
'sync-external-data' - Manual data sync

// Research and goals
'create-research-goal' - Create new research goal
'update-research-goal' - Modify existing goal
'get-research-goals' - Retrieve user's goals
'add-research-insight' - Store new research insight
'get-research-insights' - Get insights for specific goals

// Enhanced AI features
'analyze-multi-source-data' - Cross-provider analysis
'generate-goal-recommendations' - AI-powered goal suggestions
'update-goal-progress' - Progress tracking with AI feedback
```

### Frontend Components Needed
1. **External Providers Dashboard** (`src/pages/ExternalProvidersPage.tsx`)
   - Provider connection management
   - Data sync status monitoring
   - Real-time data visualization

2. **Research Goals Interface** (`src/pages/ResearchGoalsPage.tsx`)
   - Goal creation and management
   - Progress tracking with charts
   - AI-powered recommendations

3. **Enhanced AI Page** (`src/pages/AiPage.tsx`)
   - Multi-source data insights
   - Goal-based analysis
   - Cross-provider pattern visualization

---

## 🎨 Design Integration Points

### Existing UI Components
- **GlassCard** design system for consistent visual style
- **TabBar** navigation pattern for section switching
- **WsEmptyState** for empty states with actionable prompts
- **Toggle** and **Pill** components for selection

### Visual Requirements
- **Provider Status Indicators** - Real-time connection health with visual feedback
- **Progress Visualization** - Circular progress bars, milestone tracking, trend charts
- **Multi-source Data Display** - Unified view of data from all providers
- **AI Insight Cards** - Enhanced pattern cards with cross-source correlations

---

## 🔒 Security and Privacy Considerations

### Data Handling
- External API keys stored securely in encrypted storage
- User consent required for each provider connection
- Data synchronization only with explicit user permission
- All external data processed locally before storage

### Privacy Protection
- No sensitive personal data shared with external providers
- All data processed and anonymized before analysis
- User controls which data is synced and analyzed
- Regular cleanup of cached external data

---

## 📈 Success Metrics

### Technical Metrics
- External provider connection success rate (>95%)
- Data synchronization latency (<5 seconds)
- AI analysis accuracy improvements (>20%)
- System performance impact (<10% overhead)

### User Experience Metrics
- Goal completion rate improvement
- Research insight quality scores
- User satisfaction with multi-source analysis
- Time saved on manual data analysis

---

## 🔄 Integration Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] External provider service architecture
- [ ] Basic provider authentication system
- [ ] Data ingestion pipeline
- [ ] Goal management system

### Phase 2: Core Features (Week 3-4)
- [ ] Three providers implemented (CloudFlayer, Invilier, Olamah)
- [ ] AI analysis integration
- [ ] Frontend dashboard components
- [ ] Multi-source data visualization

### Phase 3: Advanced Features (Week 5-6)
- [ ] Cross-provider pattern analysis
- [ ] AI-powered goal recommendations
- [ ] Advanced insights generation
- [ ] Performance optimization and testing

---

**Note:** This context bundle provides the foundation for designing external provider integration focused on research and goal tracking capabilities. The existing DeskFlow architecture provides strong data foundation and AI integration points to build upon.