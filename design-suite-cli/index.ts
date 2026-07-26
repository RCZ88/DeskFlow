#!/usr/bin/env node
import { Command } from 'commander';
import * as path from 'path';
import { box, heading, success, error, info, label, dim, divider, colorSwatch } from './tui';

const distElectron = path.resolve(__dirname, '..', 'dist-electron');
const CariScraper = require(path.join(distElectron, 'services', 'design', 'CariScraperService.cjs'));
const FontsInUse = require(path.join(distElectron, 'services', 'design', 'FontsInUseScraperService.cjs'));
const MotionTemplates = require(path.join(distElectron, 'services', 'design', 'MotionTemplates.cjs'));
const CliWrapper = require(path.join(distElectron, 'services', 'design', 'CliWrapperService.cjs'));
const ColorSync = require(path.join(distElectron, 'services', 'design', 'ColorSyncService.cjs'));

const { scrapeAesthetics } = CariScraper;
const { getTypographyPairs } = FontsInUse;
const { getTemplate, listTemplates } = MotionTemplates;
const { installComponent } = CliWrapper;
const { syncTokens, generateCssVariables, generateRealtimeColorsUrl } = ColorSync;

const program = new Command();

program
  .name('deskflow-design')
  .description('DeskFlow Design Co-Pilot CLI — terminal-native design tools')
  .version('1.0.0');

program
  .command('scrape-cari <query>')
  .description('Scrape CARI.institute for aesthetic references')
  .action(async (query: string) => {
    console.log(box([
      heading('Design Suite: CARI.institute'),
      `Query: ${label(query)}`,
      divider(),
    ]));
    try {
      const results = await scrapeAesthetics(query);
      if (results.length === 0) {
        console.log(info('No results found. Try a different aesthetic query.'));
        return;
      }
      console.log(success(`Fetched ${results.length} results`));
      console.log(divider());
      results.forEach((item, i) => {
        console.log(`  ${label(`[${i + 1}]`)} ${item.title}`);
        if (item.description) console.log(`    ${dim(item.description.slice(0, 120))}`);
        console.log(`    ${dim('Image:')} ${item.imageUrl}`);
        console.log('');
      });
      console.log(dim(`Use these image URLs and descriptions as visual context.`));
    } catch (e: any) {
      console.log(error(`Failed: ${e.message}`));
    }
  });

program
  .command('scrape-fonts <mood>')
  .description('Search FontsInUse for typography pairings')
  .action(async (mood: string) => {
    console.log(box([
      heading('Design Suite: FontsInUse'),
      `Mood: ${label(mood)}`,
      divider(),
    ]));
    try {
      const results = await getTypographyPairs(mood);
      if (results.length === 0) {
        console.log(info('No font pairs found. Try a different mood.'));
        return;
      }
      console.log(success(`Found ${results.length} font pairings`));
      console.log(divider());
      results.forEach((pair, i) => {
        console.log(`  ${label(`[${i + 1}]`)} ${pair.headingFont} + ${pair.bodyFont}`);
        console.log(`    ${dim(pair.usageContext)}`);
        console.log(`    ${dim('Source:')} ${pair.sourceUrl}`);
        console.log('');
      });
    } catch (e: any) {
      console.log(error(`Failed: ${e.message}`));
    }
  });

program
  .command('sync-tokens')
  .description('Write CSS variables to project file')
  .option('--bg <hex>', 'Background color')
  .option('--text <hex>', 'Text color')
  .option('--primary <hex>', 'Primary color')
  .option('--secondary <hex>', 'Secondary color')
  .option('--accent <hex>', 'Accent color')
  .option('--target <file>', 'Target file (globals.css or tailwind.config.js)', 'globals.css')
  .option('--project <path>', 'Project root path')
  .action(async (opts) => {
    const colors = [];
    if (opts.bg) colors.push({ role: 'bg', hex: opts.bg });
    if (opts.text) colors.push({ role: 'text', hex: opts.text });
    if (opts.primary) colors.push({ role: 'primary', hex: opts.primary });
    if (opts.secondary) colors.push({ role: 'secondary', hex: opts.secondary });
    if (opts.accent) colors.push({ role: 'accent', hex: opts.accent });

    if (colors.length === 0) {
      console.log(error('Provide at least one color flag (--bg, --text, --primary, etc.)'));
      return;
    }

    const cssVars = generateCssVariables(colors as any);

    console.log(box([
      heading('Design Suite: Token Sync'),
      `Target: ${label(opts.target || 'globals.css')}`,
      divider(),
      cssVars,
    ]));

    if (!opts.project) {
      console.log(dim('\nDry run — pass --project <path> to write to disk.'));
      console.log(dim('Generated CSS:'));
      console.log(cssVars);
      return;
    }

    try {
      const result = await syncTokens({
        cssVariables: cssVars,
        projectPath: opts.project,
        targetFile: opts.target || 'globals.css',
      });
      if (result.success) {
        console.log(success(result.message));
      } else {
        console.log(error(result.message));
      }
    } catch (e: any) {
      console.log(error(`Failed: ${e.message}`));
    }
  });

program
  .command('color-url')
  .description('Generate Realtime Colors URL from color flags')
  .option('--bg <hex>', 'Background color')
  .option('--text <hex>', 'Text color')
  .option('--primary <hex>', 'Primary color')
  .option('--secondary <hex>', 'Secondary color')
  .option('--accent <hex>', 'Accent color')
  .action((opts) => {
    const colors = [];
    if (opts.bg) colors.push({ role: 'bg', hex: opts.bg });
    if (opts.text) colors.push({ role: 'text', hex: opts.text });
    if (opts.primary) colors.push({ role: 'primary', hex: opts.primary });
    if (opts.secondary) colors.push({ role: 'secondary', hex: opts.secondary });
    if (opts.accent) colors.push({ role: 'accent', hex: opts.accent });

    const url = generateRealtimeColorsUrl(colors as any);
    console.log(box([
      heading('Design Suite: Realtime Colors URL'),
      divider(),
      url,
      divider(),
      dim('Open this URL to preview your color scheme live.'),
    ]));
  });

program
  .command('get-motion <id>')
  .description('Get GSAP/Lenis/Vanta motion boilerplate code')
  .action((id: string) => {
    const template = getTemplate(id);
    if (!template) {
      const available = listTemplates().map(t => t.id).join(', ');
      console.log(error(`Template "${id}" not found.`));
      console.log(dim(`Available: ${available}`));
      return;
    }
    console.log(box([
      heading(`Design Suite: ${template.framework} Template`),
      `Name: ${label(template.name)}`,
      divider(),
      template.code,
      divider(),
      dim(`Copy this code into your component. Do not write from scratch.`),
    ]));
  });

program
  .command('list-motion')
  .description('List all available motion templates')
  .action(() => {
    const templates = listTemplates();
    console.log(box([
      heading('Design Suite: Motion Templates'),
      `${label(`${templates.length}`)} templates available`,
      divider(),
    ]));
    const grouped = templates.reduce((acc, t) => {
      if (!acc[t.framework]) acc[t.framework] = [];
      acc[t.framework].push(t);
      return acc;
    }, {} as Record<string, typeof templates>);
    for (const [framework, items] of Object.entries(grouped)) {
      console.log(`  ${label(framework)}`);
      items.forEach(t => {
        console.log(`    ${t.id} — ${dim(t.description)}`);
      });
      console.log('');
    }
  });

program
  .command('install <url>')
  .description('Install a shadcn component from a registry URL')
  .option('--project <path>', 'Project root path', process.cwd())
  .action(async (url: string, opts) => {
    console.log(box([
      heading('Design Suite: Install Component'),
      `URL: ${label(url)}`,
      `Project: ${label(opts.project)}`,
      divider(),
    ]));
    try {
      console.log(info('Installing...'));
      const result = await installComponent(url, opts.project);
      if (result.success) {
        console.log(success('Component installed successfully'));
        if (result.stdout) console.log(dim(result.stdout.slice(0, 500)));
        if (result.installedPaths.length > 0) {
          console.log(dim('\nInstalled files:'));
          result.installedPaths.forEach(p => console.log(`  ${p}`));
        }
      } else {
        console.log(error('Installation failed'));
        if (result.stderr) console.log(dim(result.stderr.slice(0, 500)));
      }
    } catch (e: any) {
      console.log(error(`Failed: ${e.message}`));
    }
  });

program.parse(process.argv);
