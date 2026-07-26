import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getCariContext, getFontsInUse } from './tools/scrapers.js';
import { installShadcnComponent } from './tools/cli.js';
import { getMotionSetup, listMotionTemplates } from './tools/templates.js';

const server = new Server(
  { name: 'design-suite', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_aesthetic_context',
      description: 'Scrape CARI.institute for visual aesthetics and design history context based on a vibe or era.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: "E.g., 'Frutiger Aero', 'Y2K', 'Corporate Grunge'" },
        },
        required: ['query'],
      },
    },
    {
      name: 'get_typography_pairs',
      description: 'Search FontsInUse for font pairings matching a mood or style.',
      inputSchema: {
        type: 'object',
        properties: {
          mood: { type: 'string', description: "E.g., 'sporty', 'elegant', 'retro'" },
        },
        required: ['mood'],
      },
    },
    {
      name: 'install_component',
      description: 'Install a shadcn/ui component from a registry URL.',
      inputSchema: {
        type: 'object',
        properties: {
          registryUrl: { type: 'string', description: 'Full registry URL or component name' },
          projectPath: { type: 'string', description: 'Path to the project root' },
        },
        required: ['registryUrl', 'projectPath'],
      },
    },
    {
      name: 'get_motion_boilerplate',
      description: 'Get motion/animation boilerplate code (GSAP, Lenis, Vanta).',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: "Template ID: 'lenis-smooth-scroll', 'gsap-fade-in', 'vanta-waves', 'vanta-birds', 'vanta-fog'" },
        },
        required: ['id'],
      },
    },
    {
      name: 'list_motion_templates',
      description: 'List all available motion/animation templates.',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_aesthetic_context': {
        const result = await getCariContext((args as any).query);
        return { content: [{ type: 'text', text: result }] };
      }
      case 'get_typography_pairs': {
        const result = await getFontsInUse((args as any).mood);
        return { content: [{ type: 'text', text: result }] };
      }
      case 'install_component': {
        const result = await installShadcnComponent(
          (args as any).registryUrl,
          (args as any).projectPath
        );
        return { content: [{ type: 'text', text: result }] };
      }
      case 'get_motion_boilerplate': {
        const result = getMotionSetup((args as any).id);
        return { content: [{ type: 'text', text: result }] };
      }
      case 'list_motion_templates': {
        const result = listMotionTemplates();
        return { content: [{ type: 'text', text: result }] };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Design Suite MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
