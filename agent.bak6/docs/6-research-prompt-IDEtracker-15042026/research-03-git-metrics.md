# Research: Git & Version Control Metrics

## Context
Extracting developer productivity metrics from version control systems, including commit frequency, code churn, and AI attribution. Essential for DORA metrics and project health tracking.

## Research Objectives

### 1. GitHub REST API

**Core Endpoints:**

| Endpoint | Purpose | Rate Limit |
|----------|---------|------------|
| `/repos/{owner}/{repo}/commits` | List commits with stats | 5,000/hr authenticated |
| `/repos/{owner}/{repo}/stats/code_frequency` | Weekly additions/deletions | 2,000/hr |
| `/repos/{owner}/{repo}/stats/commit_activity` | Last 52 weeks activity | 2,000/hr |
| `/repos/{owner}/{repo}/compare/{base}...{head}` | Diff between commits | 5,000/hr |
| `/repos/{owner}/{repo}/stats/contributors` | Contributor commit counts | 2,000/hr |
| `/repos/{owner}/{repo}/stats/participation` | Weekly commit counts | 2,000/hr |

**Commit Response Structure:**
```json
{
  "sha": "abc123...",
  "commit": {
    "author": { "name": "...", "date": "2026-01-01T00:00:00Z" },
    "message": "commit message"
  },
  "stats": {
    "additions": 150,
    "deletions": 50,
    "total": 200
  },
  "files": [
    {
      "filename": "src/index.js",
      "additions": 10,
      "deletions": 5,
      "changes": 15
    }
  ]
}
```

**Questions to Answer:**
- How to handle pagination for large repositories?
- What's the difference between unauthenticated (60/hr) vs authenticated (5,000/hr)?
- How to efficiently batch requests?

### 2. GitLab API

**Investigate:**
- `/projects/{id}/repository/commits` - Commit list
- `/projects/{id}/statistics` - Project statistics
- `/groups/{id}/analytics` - Group-level analytics

**Questions to Answer:**
- What metrics are available at group/project level?
- How do GitLab analytics compare to GitHub?
- Authentication flow differences?

### 3. Bitbucket API

**Investigate:**
- `/repositories/{workspace}/{repo}/commits`
- `/repositories/{workspace}/{repo}/statistics`

### 4. Local Git Analysis

**Node.js Library: simple-git**
```javascript
const simpleGit = require('simple-git');

const git = simpleGit(repoPath);

// Get commit log with stats
const log = await git.log({
  from: 'v1.0.0',
  to: 'v1.1.0',
  format: { hash: '%H', date: '%ai', message: '%s' }
});

// Get diff summary
const diff = await git.diffSummary({
  options: ['--stat', 'HEAD~10..HEAD']
});
```

**Python Library: GitPython**
```python
import git

repo = git.Repo(path)

for commit in repo.iter_commits('HEAD~100..HEAD'):
    print(f"Commit: {commit.hexsha}")
    print(f"Message: {commit.message}")
    print(f"Date: {commit.authored_datetime}")
```

**Questions to Answer:**
- Which library has better performance for large repositories?
- Can we efficiently detect commit metadata without full clone?
- How to handle shallow clones and sparse checkout?

### 5. DORA Metrics Calculation

**Deployment Frequency:**
- How to detect: git tags, releases, merges to main branch
- Formula: `deploys_count / time_period`

**Lead Time for Changes:**
- First commit in release → deploy commit
- Formula: `deploy_time - first_commit_time`

**Change Failure Rate:**
- % of deployments causing production failures
- Requires: incident data integration
- Formula: `failed_deploys / total_deploys`

**Mean Time to Recovery (MTTR):**
- Incident detection → service restoration
- Requires: incident tracking integration

**Questions to Answer:**
- How do engineering intelligence platforms calculate DORA automatically?
- What's the minimum data needed for meaningful DORA metrics?
- How to handle monorepos vs multiple services?

### 6. AI Attribution in Commits

**Cursor AI Code Tracking:**
- `/analytics/ai-code/commits` endpoint
- Fields: `tabLinesAdded`, `composerLinesAdded`, `nonAiLinesAdded`

**Co-Authored-By Detection:**
```bash
git log --format="%ae" --grep="Co-Authored-By" --all
```

**Commit Message Patterns:**
- "[AI]", "[Cursor]", "[Copilot]" prefixes
- Claude Code session markers
- Pattern matching on commit messages

**Questions to Answer:**
- How reliable is Co-Authored-By detection across tools?
- Are there other commit metadata fields for AI attribution?
- What's the accuracy of Cursor's AI Code Tracking?

### 7. Metrics to Extract

| Metric | Source | Use Case |
|--------|--------|----------|
| Commit frequency | GitHub API, local git | Velocity tracking |
| Lines changed (add/del) | commit.stats | Code churn analysis |
| Files touched per commit | commit.files | Change scope |
| Commit size distribution | commit.stats.total | Review complexity |
| Time between commits | commit.author.date | Work patterns |
| Author distribution | commit.author | Contribution equity |
| Branch merge frequency | merge commits | Integration cadence |

## Deliverables

1. API documentation for GitHub, GitLab, Bitbucket
2. Library recommendations (simple-git vs GitPython)
3. DORA metrics calculation formulas
4. AI attribution strategies
5. Pagination and rate limit handling approach

## Success Criteria

- [ ] Know all relevant GitHub API endpoints and their limits
- [ ] Have working examples for local git analysis
- [ ] Understand DORA metrics calculation methods
- [ ] Have AI attribution strategy documented
- [ ] Rate limit handling approach defined
