---
id: deep-research-prompt
name: Deep Research Prompt
category: research
applicable_to: [research, prompt-generation]
version: 1.0.0
created: 2026-04-19
tags: [research, prompts, qwen]
---

# 📝 Deep Research Prompt

**Purpose:** Comprehensive prompt for deep research tasks using Qwen CLI.

---

## 🎯 Deep Research Prompt Template

```markdown
# Deep Research: [Research Topic]

## Context
[Provide background and motivation for this research]

## Research Questions
1. [Primary question]
2. [Secondary question]
3. [Tertiary question]

## Scope
- **Include:** [What should be covered]
- **Exclude:** [What should not be covered]
- **Depth:** [Shallow overview / Medium depth / Deep dive]

## Expected Deliverables
- [ ] Comprehensive analysis document
- [ ] Code examples (if applicable)
- [ ] Comparison table (if applicable)
- [ ] Actionable recommendations
- [ ] Risk assessment

## Constraints
- Time limit: [X hours/days]
- Technical constraints: [List any]
- Resource constraints: [List any]

## Success Criteria
- All research questions answered
- Recommendations are actionable
- Code examples are tested and working
- Sources are cited and verified

## Research Process
1. **Phase 1: Discovery** - Gather all relevant information
2. **Phase 2: Analysis** - Analyze findings and identify patterns
3. **Phase 3: Synthesis** - Combine insights into coherent report
4. **Phase 4: Validation** - Verify all findings and test examples
5. **Phase 5: Delivery** - Present final report with recommendations

## Notes
[Additional context, preferences, or requirements]
```

---

## 💡 Usage Examples

### Example 1: Technology Research
```
# Deep Research: Modern State Management in React 19

## Context
We need to choose a state management solution for our React 19 app.

## Research Questions
1. What are the best state management options for React 19?
2. How do they compare in performance?
3. What is the learning curve for each?

## Scope
- Include: Zustand, Jotai, Redux Toolkit, React Context
- Exclude: MobX, Recoil (deprecated)
- Depth: Deep dive with benchmarks

## Expected Deliverables
- Comparison table
- Code examples for each
- Performance benchmarks
- Recommendation

## Constraints
- Must work with React 19
- Must support TypeScript
- Team size: 5 developers

## Success Criteria
- Clear recommendation with justification
- Working code examples
- Performance data
```

### Example 2: Codebase Analysis
```
# Deep Research: DeskFlow Performance Optimization

## Context
The solar system view is dropping below 60 FPS with 12 planets.

## Research Questions
1. What causes the FPS drops?
2. Which components are most expensive?
3. What optimizations are possible?

## Scope
- Include: OrbitSystem.tsx, texture generation, lighting
- Exclude: Backend, database
- Depth: Deep dive with profiling

## Expected Deliverables
- Performance profile
- Bottleneck identification
- Optimization recommendations
- Code changes

## Constraints
- Must maintain visual quality
- Cannot remove features
- Must work on mid-range GPUs

## Success Criteria
- 60 FPS with 12 planets
- Visual quality maintained
- Actionable optimization list
```

### Example 3: Architecture Decision
```
# Deep Research: Database Strategy for DeskFlow

## Context
We need a reliable data storage solution that works across all platforms.

## Research Questions
1. SQLite vs IndexedDB vs JSON?
2. What are the trade-offs?
3. What is the migration path?

## Scope
- Include: All three options
- Exclude: Cloud databases
- Depth: Medium depth with proof of concept

## Expected Deliverables
- Comparison matrix
- Migration plan
- Code examples
- Risk assessment

## Constraints
- Must work offline
- Must support Electron
- Must be cross-platform

## Success Criteria
- Clear recommendation
- Working proof of concept
- Migration strategy
```

---

## 🔧 Research Tools

### Code Analysis
```bash
# Find all instances of a pattern
grep_search pattern="useState" path="src/"

# Read specific file
read_file file_path="src/components/OrbitSystem.tsx"

# List directory structure
list_directory path="src/"
```

### Profiling
```bash
# Chrome DevTools Performance tab
# React DevTools Profiler
# Electron process monitoring
```

### Documentation
```bash
# Search documentation
web_search query="React 19 state management"

# Read external resources
web_fetch url="https://react.dev" prompt="Summarize state management"
```

---

## 📊 Research Output Format

```markdown
# Research Report: [Topic]

## Executive Summary
- Key finding 1
- Key finding 2
- Key finding 3

## Detailed Findings
### Finding 1
- Description
- Evidence
- Implications

### Finding 2
- Description
- Evidence
- Implications

## Comparisons
| Option | Pros | Cons | Score |
|--------|------|------|-------|
| A      |      |      |       |
| B      |      |      |       |

## Recommendations
1. [Priority 1]
2. [Priority 2]
3. [Priority 3]

## Next Steps
- [ ] Action item 1
- [ ] Action item 2

## References
1. [Source 1]
2. [Source 2]
```

---

## ⚠️ Research Best Practices

### Do:
- ✅ Define clear research questions
- ✅ Set scope boundaries
- ✅ Verify all sources
- ✅ Test code examples
- ✅ Document uncertainties

### Don't:
- ❌ Research without a question
- ❌ Go beyond scope
- ❌ Trust unverified sources
- ❌ Skip testing
- ❌ Ignore edge cases

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-04 | Initial creation |

---

**Last Updated:** 2026-04-04
**Maintained By:** AI Development Team
