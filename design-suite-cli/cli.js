#!/usr/bin/env node
const path = require('path');
const { scrapeAesthetics } = require(path.join(__dirname, '..', 'dist-electron', 'services', 'design', 'CariScraperService.cjs'));
const { getTypographyPairs } = require(path.join(__dirname, '..', 'dist-electron', 'services', 'design', 'FontsInUseScraperService.cjs'));
const { getTemplate, listTemplates } = require(path.join(__dirname, '..', 'dist-electron', 'services', 'design', 'MotionTemplates.cjs'));
const { installComponent } = require(path.join(__dirname, '..', 'dist-electron', 'services', 'design', 'CliWrapperService.cjs'));
const { syncTokens, generateCssVariables, generateRealtimeColorsUrl } = require(path.join(__dirname, '..', 'dist-electron', 'services', 'design', 'ColorSyncService.cjs'));

const W = 58;
const C = { reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m', cyan: '\x1b[36m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', white: '\x1b[37m', gray: '\x1b[90m' };

function box(lines) {
  const top = `${C.cyan}┌${'─'.repeat(W - 2)}┐${C.reset}`;
  const bottom = `${C.cyan}└${'─'.repeat(W - 2)}┘${C.reset}`;
  const body = lines.map(line => {
    const stripped = line.replace(/\x1b\[[0-9;]*m/g, '');
    const pad = Math.max(0, W - 4 - stripped.length);
    return `${C.cyan}│${C.reset}  ${line}${' '.repeat(pad)}${C.cyan}│${C.reset}`;
  }).join('\n');
  return `${top}\n${body}\n${bottom}`;
}
const heading = t => `${C.bold}${C.cyan}${t}${C.reset}`;
const success = t => `${C.green}✓ ${t}${C.reset}`;
const error = t => `${C.red}✗ ${t}${C.reset}`;
const info = t => `${C.yellow}→ ${t}${C.reset}`;
const label = t => `${C.bold}${C.white}${t}${C.reset}`;
const dim = t => `${C.dim}${t}${C.reset}`;
const divider = () => `${C.gray}${'─'.repeat(W - 4)}${C.reset}`;

const args = process.argv.slice(2);
const cmd = args[0];
const subcmd = args[1];

async function main() {
  switch (cmd) {
    case 'scrape-cari': {
      const query = subcmd || args.slice(1).join(' ');
      if (!query) { console.log(error('Usage: deskflow-design scrape-cari <query>')); return; }
      console.log(box([heading('Design Suite: CARI.institute'), `Query: ${label(query)}`, divider()]));
      try {
        const results = await scrapeAesthetics(query);
        if (results.length === 0) { console.log(info('No results found.')); return; }
        console.log(success(`Fetched ${results.length} results`));
        console.log(divider());
        results.forEach((item, i) => {
          console.log(`  ${label(`[${i + 1}]`)} ${item.title}`);
          if (item.description) console.log(`    ${dim(item.description.slice(0, 120))}`);
          console.log(`    ${dim('Image:')} ${item.imageUrl}`);
          console.log('');
        });
      } catch (e) { console.log(error(`Failed: ${e.message}`)); }
      break;
    }
    case 'scrape-fonts': {
      const mood = subcmd || args.slice(1).join(' ');
      if (!mood) { console.log(error('Usage: deskflow-design scrape-fonts <mood>')); return; }
      console.log(box([heading('Design Suite: FontsInUse'), `Mood: ${label(mood)}`, divider()]));
      try {
        const results = await getTypographyPairs(mood);
        if (results.length === 0) { console.log(info('No font pairs found.')); return; }
        console.log(success(`Found ${results.length} font pairings`));
        console.log(divider());
        results.forEach((pair, i) => {
          console.log(`  ${label(`[${i + 1}]`)} ${pair.headingFont} + ${pair.bodyFont}`);
          console.log(`    ${dim(pair.usageContext)}`);
          console.log('');
        });
      } catch (e) { console.log(error(`Failed: ${e.message}`)); }
      break;
    }
    case 'sync-tokens': {
      const flags = {};
      for (let i = 2; i < args.length; i++) {
        if (args[i] === '--bg') flags.bg = args[++i];
        else if (args[i] === '--text') flags.text = args[++i];
        else if (args[i] === '--primary') flags.primary = args[++i];
        else if (args[i] === '--secondary') flags.secondary = args[++i];
        else if (args[i] === '--accent') flags.accent = args[++i];
        else if (args[i] === '--target') flags.target = args[++i];
        else if (args[i] === '--project') flags.project = args[++i];
      }
      const colors = [];
      if (flags.bg) colors.push({ role: 'bg', hex: flags.bg });
      if (flags.text) colors.push({ role: 'text', hex: flags.text });
      if (flags.primary) colors.push({ role: 'primary', hex: flags.primary });
      if (flags.secondary) colors.push({ role: 'secondary', hex: flags.secondary });
      if (flags.accent) colors.push({ role: 'accent', hex: flags.accent });
      if (colors.length === 0) { console.log(error('Provide at least one color flag.')); return; }
      const css = generateCssVariables(colors);
      console.log(box([heading('Design Suite: Token Sync'), `Target: ${label(flags.target || 'globals.css')}`, divider(), css]));
      if (!flags.project) { console.log(dim('\nDry run — pass --project <path> to write.')); return; }
      try {
        const result = await syncTokens({ cssVariables: css, projectPath: flags.project, targetFile: flags.target || 'globals.css' });
        console.log(result.success ? success(result.message) : error(result.message));
      } catch (e) { console.log(error(`Failed: ${e.message}`)); }
      break;
    }
    case 'color-url': {
      const flags = {};
      for (let i = 2; i < args.length; i++) {
        if (args[i] === '--bg') flags.bg = args[++i];
        else if (args[i] === '--text') flags.text = args[++i];
        else if (args[i] === '--primary') flags.primary = args[++i];
        else if (args[i] === '--secondary') flags.secondary = args[++i];
        else if (args[i] === '--accent') flags.accent = args[++i];
      }
      const colors = [];
      if (flags.bg) colors.push({ role: 'bg', hex: flags.bg });
      if (flags.text) colors.push({ role: 'text', hex: flags.text });
      if (flags.primary) colors.push({ role: 'primary', hex: flags.primary });
      if (flags.secondary) colors.push({ role: 'secondary', hex: flags.secondary });
      if (flags.accent) colors.push({ role: 'accent', hex: flags.accent });
      const url = generateRealtimeColorsUrl(colors);
      console.log(box([heading('Design Suite: Realtime Colors URL'), divider(), url, divider(), dim('Open this URL to preview your color scheme.')]));
      break;
    }
    case 'get-motion': {
      const id = subcmd;
      if (!id) { console.log(error('Usage: deskflow-design get-motion <id>')); return; }
      const template = getTemplate(id);
      if (!template) {
        const available = listTemplates().map(t => t.id).join(', ');
        console.log(error(`Template "${id}" not found.`));
        console.log(dim(`Available: ${available}`));
        return;
      }
      console.log(box([heading(`Design Suite: ${template.framework} Template`), `Name: ${label(template.name)}`, divider(), template.code, divider(), dim('Copy this code into your component.')]));
      break;
    }
    case 'list-motion': {
      const templates = listTemplates();
      console.log(box([heading('Design Suite: Motion Templates'), `${label(`${templates.length}`)} templates available`, divider()]));
      const grouped = {};
      templates.forEach(t => { if (!grouped[t.framework]) grouped[t.framework] = []; grouped[t.framework].push(t); });
      for (const [fw, items] of Object.entries(grouped)) {
        console.log(`  ${label(fw)}`);
        items.forEach(t => console.log(`    ${t.id} — ${dim(t.description)}`));
        console.log('');
      }
      break;
    }
    case 'install': {
      const url = subcmd;
      const projectIdx = args.indexOf('--project');
      const project = projectIdx >= 0 ? args[projectIdx + 1] : process.cwd();
      if (!url) { console.log(error('Usage: deskflow-design install <url> [--project <path>]')); return; }
      console.log(box([heading('Design Suite: Install Component'), `URL: ${label(url)}`, divider()]));
      try {
        console.log(info('Installing...'));
        const result = await installComponent(url, project);
        if (result.success) {
          console.log(success('Installed successfully'));
          if (result.installedPaths.length > 0) result.installedPaths.forEach(p => console.log(`  ${p}`));
        } else {
          console.log(error('Installation failed'));
          if (result.stderr) console.log(dim(result.stderr.slice(0, 300)));
        }
      } catch (e) { console.log(error(`Failed: ${e.message}`)); }
      break;
    }
    default:
      console.log(box([
        heading('DeskFlow Design Co-Pilot CLI'),
        divider(),
        `Usage: ${label('deskflow-design <command> [args]')}`,
        '',
        'Commands:',
        `  ${label('scrape-cari')} <query>     Fetch aesthetic references from CARI`,
        `  ${label('scrape-fonts')} <mood>     Fetch typography pairings from FontsInUse`,
        `  ${label('sync-tokens')}             Write CSS variables to project file`,
        `  ${label('color-url')}               Generate Realtime Colors preview URL`,
        `  ${label('get-motion')} <id>         Get motion boilerplate code`,
        `  ${label('list-motion')}             List available motion templates`,
        `  ${label('install')} <url>           Install shadcn component`,
        '',
        dim('Run deskflow-design <command> --help for command-specific options.'),
      ]));
  }
}

main().catch(e => { console.error(error(e.message)); process.exit(1); });
