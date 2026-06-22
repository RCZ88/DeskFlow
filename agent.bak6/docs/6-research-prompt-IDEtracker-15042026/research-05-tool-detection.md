# Research: Tool Detection & Project Environment Scanning

## Context
Detecting installed developer tools across the system to understand a developer's complete toolchain. Critical for the "what's installed" aspect of IDE Projects feature.

## Research Objectives

### 1. Package Manager Detection

**Cross-Platform Detection:**

| Manager | Command | Cross-Platform? |
|---------|---------|-----------------|
| npm | `npm list -g --depth=0 --json` | Yes |
| pip | `importlib.metadata.distributions()` | Yes |
| cargo | `cargo install --list` | Yes |
| brew | `brew list --formulae` | macOS/Linux |
| choco | `choco list --local-only` | Windows |
| winget | `winget list` | Windows |

**npm Global Packages:**
```bash
npm list -g --depth=0 --json
npm config get prefix  # Get global modules path
```

**Python Packages:**
```python
from importlib.metadata import distributions
for dist in distributions():
    print(f"{dist.metadata['Name']}=={dist.version}")
```

**Cargo Crates:**
```bash
cargo install --list
ls ~/.cargo/bin/
```

**Questions to Answer:**
- What's the most efficient way to query multiple package managers?
- Should we cache results and refresh periodically?
- How to detect CLI tools specifically (not GUI packages)?

### 2. PATH-Based Detection

**Core Approach:**
```bash
# POSIX
command -v git
which git

# Windows
where.exe git
```

**Node.js Library:**
```javascript
const which = require('which');
const gitPath = which.sync('git', { nothrow: true });
```

**Common Development Tools List:**
- Version Control: git, hg, svn
- Runtimes: node, python, python3, ruby, go, java
- Editors: code, vim, nano, emacs, subl
- Containers: docker, podman, kubectl
- Infrastructure: terraform, ansible, puppet
- Cloud: aws, gcloud, az, kubectl

**Questions to Answer:**
- What common tools should we prioritize detecting?
- How to verify tool is actually installed (not just in PATH)?
- Should we track version numbers?

### 3. Project-Specific Tooling

**JavaScript/TypeScript:**
```javascript
// From package.json
const pkg = require('./package.json');
const devTools = Object.keys(pkg.devDependencies || {});

// Config files to detect
.eslintrc*
.prettierrc*
biome.json
tsconfig.json
```

**Python:**
```python
import tomllib
with open('pyproject.toml', 'rb') as f:
    config = tomllib.load(f)
    tools = config.get('tool', {})
```

**Detect by File Patterns:**
```bash
find . -maxdepth 3 -type f \( \
  -name ".eslintrc*" -o \
  -name ".prettierrc*" -o \
  -name "biome.json" -o \
  -name "ruff.toml" -o \
  -name "pyproject.toml" -o \
  -name ".editorconfig" \
\) 2>/dev/null
```

**Questions to Answer:**
- How to detect the full toolchain from a project?
- Should we recommend tool installations based on project type?
- How to handle monorepos with multiple package managers?

### 4. Tool Taxonomy

**Primary Categories:**

```typescript
interface ToolCategory {
  id: string;
  name: string;
  subcategories: SubCategory[];
}

const TOOL_TAXONOMY: ToolCategory[] = [
  {
    id: "package-managers",
    name: "Package Managers",
    subcategories: [
      { id: "npm", name: "npm", commands: ["npm", "npx"] },
      { id: "pip", name: "pip", commands: ["pip", "pip3"] },
      { id: "cargo", name: "Cargo", commands: ["cargo"] },
      { id: "brew", name: "Homebrew", commands: ["brew"] },
      { id: "choco", name: "Chocolatey", commands: ["choco"] },
    ]
  },
  {
    id: "build-tools",
    name: "Build Tools",
    subcategories: [
      { id: "bundlers", tools: ["webpack", "vite", "rollup", "esbuild"] },
      { id: "compilers", tools: ["tsc", "babel", "swc"] },
      { id: "task-runners", tools: ["grunt", "gulp", "make"] },
      { id: "containers", tools: ["docker", "podman"] },
    ]
  },
  {
    id: "code-quality",
    name: "Code Quality",
    subcategories: [
      { id: "linters", tools: ["eslint", "ruff", "flake8", "golangci-lint"] },
      { id: "formatters", tools: ["prettier", "black", "rustfmt", "gofmt"] },
      { id: "type-checkers", tools: ["mypy", "typescript", "flow"] },
      { id: "testing", tools: ["jest", "pytest", "vitest"] },
    ]
  },
  {
    id: "ai-assistants",
    name: "AI Assistants",
    subcategories: [
      { id: "copilot", tools: ["copilot"] },
      { id: "cursor", tools: ["cursor"] },
      { id: "claude-code", tools: ["claude"] },
      { id: "continue", tools: ["continue"] },
    ]
  }
];
```

**Questions to Answer:**
- What categories are most valuable for vibe coding workflows?
- Should we track tool versions?
- How to handle tool aliases (npm vs yarn vs pnpm)?

### 5. Cross-Platform Considerations

**Windows:**
- `%USERPROFILE%` → `C:\Users\{username}`
- `%APPDATA%` → `C:\Users\{username}\AppData\Roaming`
- `%LOCALAPPDATA%` → `C:\Users\{username}\AppData\Local`
- Registry: `HKLM\SOFTWARE`, `HKCU\SOFTWARE`

**macOS:**
- `~/Library/Application Support/`
- `~/Library/Preferences/`
- `~/.config/` (if XDG enabled)
- Homebrew: `/usr/local/bin`, `/opt/homebrew/bin`

**Linux:**
- `~/.config/`
- `~/.local/share/`
- `/usr/local/bin/`
- Flatpak: `~/.var/app/`

**Questions to Answer:**
- What's the most reliable cross-platform detection strategy?
- Should we use native APIs or shell commands?
- How to handle WSL vs native Windows development?

### 6. Tool Usage Tracking

**Shell History Analysis:**
```bash
# Bash/Zsh
history | awk '{print $2}' | sort | uniq -c | sort -rn | head -20

# Fish
string split0 --allow-empty < ~/.local/share/fish/fish_history
```

**Process Monitoring (Privacy-Conscious):**
- Only track if user opts in
- Store locally, never transmit
- Aggregate statistics only

**Questions to Answer:**
- What usage data should we track (frequency, recency)?
- How to handle privacy concerns?
- Should we track how often tools are used or just what's installed?

## Deliverables

1. Detection methods for each package manager
2. Tool taxonomy with categories and examples
3. Cross-platform path mappings
4. Project environment scanning approach
5. Privacy-conscious usage tracking strategy

## Success Criteria

- [ ] Know how to detect npm, pip, cargo, brew, choco
- [ ] Have comprehensive tool taxonomy
- [ ] Cross-platform paths documented
- [ ] Project scanning approach defined
- [ ] Usage tracking privacy model established
