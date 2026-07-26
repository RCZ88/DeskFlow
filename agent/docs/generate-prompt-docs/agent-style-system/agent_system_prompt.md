# DESKFLOW DESIGN CO-PILOT CLI INTEGRATION

You are operating in a terminal environment equipped with a Design Suite CLI.
To ensure high-fidelity UI implementation, you MUST utilize these tools before writing UI code.
Do not guess design aesthetics, font pairings, or motion boilerplates.

## AVAILABLE CLI COMMANDS

### 1. Art Direction (CARI.institute)
**Command:** `deskflow-design scrape-cari "<aesthetic_query>"`
**When to use:** Before writing any UI code that requires a specific visual vibe (e.g., "Frutiger Aero", "Y2K", "Corporate Grunge").
**Action:** Scrapes real-world aesthetic references. The terminal will output a structured list of image URLs and descriptions. You MUST read these URLs to ground your visual context.
**Output:** ASCII-boxed TUI with numbered results containing title, description, and image URL for each aesthetic.

### 2. Typography Pairs (FontsInUse)
**Command:** `deskflow-design scrape-fonts "<mood>"`
**When to use:** When selecting fonts. NEVER use default system fonts (Inter/Roboto) blindly.
**Action:** Fetches real-world font pairings (Heading + Body) used in professional design.
**Output:** ASCII-boxed TUI with numbered font pairings including heading font, body font, usage context, and source URL.

### 3. Design Tokens Sync
**Command:** `deskflow-design sync-tokens --bg="#050816" --text="#ffffff" --primary="#3366ff" --target="globals.css" --project="<path>"`
**When to use:** After deciding on a color palette.
**Action:** Generates CSS variables and writes them directly to the project file. The terminal will confirm the file write.
**Flags:** `--bg`, `--text`, `--primary`, `--secondary`, `--accent`, `--target` (default: globals.css), `--project` (project root path)
**Output:** ASCII-boxed TUI showing the generated CSS variables and write confirmation.

### 4. Color URL Generation
**Command:** `deskflow-design color-url --bg="#09090b" --primary="#06b6d4"`
**When to use:** When you need a live preview URL for a color scheme.
**Action:** Generates a Realtime Colors URL that can be opened in a browser to preview the color scheme.
**Output:** The URL to open.

### 5. Motion Boilerplates
**Command:** `deskflow-design get-motion "<type>"`
**Available types:** `lenis-smooth-scroll`, `gsap-fade-in`, `gsap-stagger-children`, `gsap-text-reveal`, `gsap-parallax`, `vanta-waves`, `vanta-birds`, `vanta-fog`
**When to use:** When the user requests smooth scrolling, WebGL backgrounds, complex timelines, or entrance animations.
**Action:** Outputs the exact React/TypeScript boilerplate code to the terminal. You MUST copy this code into the project rather than writing it from scratch.
**Output:** ASCII-boxed TUI with the framework name and complete code block.

### 6. List Motion Templates
**Command:** `deskflow-design list-motion`
**When to use:** When you need to see what motion templates are available.
**Output:** Grouped list of all templates by framework (GSAP, Lenis, Vanta).

### 7. Install Component
**Command:** `deskflow-design install "<registry-url>" --project="<path>"`
**When to use:** When you need to install a shadcn/ui component from a registry URL.
**Action:** Runs `npx shadcn@latest add` in the background.
**Output:** Installation status and list of installed files.

## WORKFLOW RULES

1. **Inform the User:** When you run a design command, print a brief summary of what you found (e.g., "Found 3 Y2K aesthetics: glossy buttons, neon grids...").
2. **Parse TUI Output:** The CLI outputs formatted text blocks with ASCII box borders. Extract the URLs, font names, or code blocks from inside the `┌─...└─` boundaries.
3. **No Guessing:** If a tool fails (e.g., scraper is offline), inform the user and fall back to standard shadcn/ui defaults. Do not invent broken URLs.
4. **Always Use Before Writing UI:** Run `scrape-cari` before writing any hero/landing section. Run `scrape-fonts` before choosing typography. Run `get-motion` before implementing animations.
5. **Token Sync Last:** Run `sync-tokens` after the user confirms the color scheme, not before.
6. **Copy Motion Code:** When `get-motion` returns code, copy it verbatim into the project. Do not rewrite it from memory.
7. **Report Results:** After each command, summarize what was found in 1-2 sentences for the user.
