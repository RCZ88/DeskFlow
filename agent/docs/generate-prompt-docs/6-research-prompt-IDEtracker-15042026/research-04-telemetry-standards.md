# Research: Developer Tool Telemetry Standards

## Context
Understanding industry standards for developer productivity telemetry, including DORA, SPACE, and OpenTelemetry conventions. Essential for building a metrics framework that's consistent with industry practices.

## Research Objectives

### 1. OpenTelemetry DevEx Extension

**Semantic Conventions:**
- `devex.*` prefix for developer experience metrics
- `cicd.*` attributes for pipeline tracking
- `vcs.*` for version control metadata

**Example Instrument:**
```python
from opentelemetry import metrics

meter = metrics.get_meter("devex.metrics", version="1.0.0")

build_duration = meter.create_histogram(
    name="devex.build.duration",
    unit="s",
    description="Build duration in seconds"
)

deploy_count = meter.create_counter(
    name="devex.deploy.count",
    unit="1",
    description="Total deployments"
)
```

**Collector Pipeline:**
```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s

exporters:
  otlphttp/devex:
    endpoint: https://your-otel-backend.com
```

**Questions to Answer:**
- What's the current state of devenv semantic conventions?
- Are there stable conventions or still evolving?
- How to integrate OTel with desktop/IDE applications?

### 2. DORA Metrics Framework

**The Four Keys:**

| Metric | Elite Performers | High Performers | Medium | Low |
|--------|-----------------|----------------|--------|-----|
| Deployment Frequency | On-demand (multiple/day) | Weekly-Monthly | Monthly-Quarterly | < Monthly |
| Lead Time for Changes | < 1 hour | 1 week | 1-6 months | > 6 months |
| Change Failure Rate | 0-15% | 16-30% | 16-30% | > 30% |
| MTTR | < 1 hour | < 1 day | 1 day - 1 week | > 1 week |

**Limitations:**
- DORA misses ~47% of developer work (meetings, communication, context switching)
- Focuses on deployment pipelines, not local development
- Requires access to production/incident data

**Questions to Answer:**
- How do engineering platforms (LinearB, Faros) calculate DORA automatically?
- What's the minimum data needed for meaningful DORA metrics?
- How to correlate DORA with IDE/tool usage data?

### 3. SPACE Framework

**Dimensions:**

| Dimension | Metrics | Measurement |
|-----------|---------|-------------|
| **S**atisfaction | Survey scores, NPS, flow state | Developer surveys |
| **P**erformance | Throughput, cycle time, bug rates | DORA + code quality |
| **A**ctivity | Commits, PRs, files changed | Git + IDE metrics |
| **C**ommunication | Review time, merge speed | PR/CR analytics |
| **E**fficiency | Build times, test times, deploy freq | CI/CD + local |

**Questions to Answer:**
- How to measure Satisfaction dimension (requires surveys)?
- What IDE-level metrics map to SPACE?
- How to combine SPACE with DORA?

### 4. DX Core 4 Framework

**Four Balanced Dimensions:**
1. **Speed** - DORA velocity metrics
2. **Effectiveness** - Developer Experience Index (14 Likert-scale items)
3. **Quality** - Change failure rate, rework rate, incident frequency
4. **Impact** - Business outcome alignment

**Questions to Answer:**
- How does DX Core 4 improve on DORA/SPACE?
- What data is needed for DXI calculation?
- Is there tooling to measure this automatically?

### 5. Existing Telemetry Implementations

**Supabase CLI Model:**
```typescript
interface TelemetryEvent {
  event_name: string;
  timestamp: ISO8601;
  distinct_id: string;

  environment: {
    os: string;
    arch: string;
    app_version: string;
    ci_detected: boolean;
    tty_detected: boolean;
    agent_detected: boolean;
  };

  properties: {
    command?: string;
    exit_code?: number;
    duration_ms?: number;
  };
}
```

**Key Principles:**
- Anonymous install ID (random UUID)
- IP anonymization
- Flag redaction by default
- Opt-out via environment variable

**Questions to Answer:**
- What's the best open-source telemetry implementation to reference?
- How does Archgate CLI approach differ?

### 6. AI-Specific Metrics (2025-2026)

**Emerging Metrics:**
- **AI Adoption Rate**: % of commits/PRs using AI tools
- **AI vs Non-AI Cycle Time**: Side-by-side comparison
- **Code Survival Rate**: % of accepted AI suggestions remaining
- **AI Technical Debt Signals**: Long-term incident rates for AI-touched code
- **Context Switch Reduction**: IDE exits to external resources

**Questions to Answer:**
- What's the "AI productivity paradox" and how does it affect metrics?
- How do platforms like Faros AI track AI attribution?
- What benchmarks exist for AI-assisted development?

### 7. Engineering Intelligence Platforms

| Platform | Strengths | AI Capabilities |
|----------|-----------|-----------------|
| **Faros AI** | SDLC-wide, code-level | AI commit/PR detection |
| **LinearB** | DORA/Space, CI insights | Process metrics |
| **Jellyfish** | Business alignment | Copilot dashboard |
| **Swarmia** | User-friendly DORA/Space | Metadata only |
| **Exceeds AI** | Commit-level attribution | Multi-tool detection |

**Questions to Answer:**
- How do these platforms collect data?
- What's the pricing model for each?
- Can we replicate any of their approaches?

## Deliverables

1. OTel DevEx semantic conventions documentation
2. DORA metrics calculation methods
3. SPACE framework measurement approach
4. AI-specific metrics taxonomy
5. Reference implementations to learn from

## Success Criteria

- [ ] Understand OTel devenv conventions and applicability
- [ ] Know DORA metrics formulas and benchmarks
- [ ] Have AI-specific metrics taxonomy
- [ ] Understand privacy-first telemetry patterns
- [ ] Reference implementations identified
