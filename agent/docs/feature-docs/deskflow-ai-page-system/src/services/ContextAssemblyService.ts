/**
 * Context Assembly Service — Compose Agent System Prompts
 * 
 * Loads project context, assembles session context from RAG results,
 * respects token budgets, and prepares context blocks for agent prompts.
 * 
 * Location: src/services/ContextAssemblyService.ts
 */

import fs from 'fs';
import path from 'path';
import { RAGService } from './RAGService';
import { ProjectContextService } from './ProjectContextService';
import { ProblemsService } from './ProblemsService';
import { RequestsService } from './RequestsService';

import type {
  AssembledContext,
  ContextAssemblyConfig,
  ContextAssemblyResult,
  RAGSearchResult,
  RAGMessage,
  ContextMetadata,
} from '@/types/context';

// ──────────────────────────────────────────────────────────────
// Context Assembly Service Implementation
// ──────────────────────────────────────────────────────────────

export class ContextAssemblyService {
  private ragService: RAGService;
  private projectContextService: ProjectContextService;
  private projectPath: string;
  private problemsService: ProblemsService;
  private requestsService: RequestsService;

  /**
   * Initialize context assembly service
   */
  constructor(projectPath: string, ragService: RAGService, projectContextService: ProjectContextService) {
    this.projectPath = projectPath;
    this.ragService = ragService;
    this.projectContextService = projectContextService;
    this.problemsService = new ProblemsService(projectPath);
    this.requestsService = new RequestsService(projectPath);
  }

  /**
   * Assemble complete context for agent prompt
   * 
   * Composition:
   * 1. Load enabled project contexts (skills, graphify, wiki, etc.)
   * 2. Query RAG for relevant recent messages
   * 3. Include compaction summaries
   * 4. Respect token budgets
   * 
   * System Prompt Token Budget (7K total):
   * - Core instructions: 1.5K
   * - Design skills: 0.8K
   * - Codebase structure: 2.4K
   * - Project state: 0.6K
   * - **Context maintenance: 1.3K** (this service produces)
   *   - Recent decisions: 0.4K
   *   - Compaction summaries: 0.6K
   *   - RAG search results: 0.3K
   * - Remaining for user prompt
   */
  public async assembleContext(config: ContextAssemblyConfig): Promise<ContextAssemblyResult> {
    try {
      // Validate services are initialized
      if (!this.ragService) {
        return {
          success: false,
          error: 'RAG Service not initialized',
        };
      }

      const warnings: string[] = [];
      let projectContextTokens = 0;
      let sessionContextTokens = 0;
      let ragResultsTokens = 0;

      // ──────────────────────────────────────────────────────────────
      // 1. Load Project Contexts (Enabled)
      // ──────────────────────────────────────────────────────────────

      let projectContextMarkdown = '';

      const manifest = await this.projectContextService.loadProjectContextManifest(config.projectId);
      if (manifest && manifest.contexts && manifest.contexts.length > 0) {
        const enabledContexts = manifest.contexts.filter(ctx => ctx.enabled);

        projectContextMarkdown += '# Project Context\n\n';

        for (const context of enabledContexts) {
          // Check token budget
          if (projectContextTokens + context.tokens > config.maxTokens / 2) {
            warnings.push(
              `Skipped context "${context.name}" (${context.tokens} tokens) - project context token budget exceeded`
            );
            continue;
          }

          projectContextMarkdown += `## ${context.name}\n`;
          projectContextMarkdown += `**Type:** ${context.type} | **Category:** ${context.category}\n`;
          projectContextMarkdown += `**Tokens:** ${context.tokens} | **Last Updated:** ${new Date(context.lastUpdated).toLocaleString()}\n\n`;

          // Load context file
          const contextFilePath = path.resolve(this.projectPath, context.source);
          try {
            if (fs.existsSync(contextFilePath)) {
              const content = fs.readFileSync(contextFilePath, 'utf-8');
              projectContextMarkdown += content + '\n\n';
              projectContextTokens += context.tokens;
            } else {
              warnings.push(`Context file not found: ${contextFilePath}`);
            }
          } catch (err) {
            warnings.push(`Failed to read context file: ${contextFilePath}`);
          }
        }
      }

      // ──────────────────────────────────────────────────────────────
      // 2. Query Recent Messages from RAG
      // ──────────────────────────────────────────────────────────────

      let ragResults: RAGSearchResult[] = [];
      let sessionContextMarkdown = '';

      if (config.includeRAGResults && config.sessionId) {
        // Query recent messages from this session
        const recentMessagesResult = await this.ragService.queryMessages({
          sessionId: config.sessionId,
          limit: 5,
        });

        if (recentMessagesResult.success && recentMessagesResult.data) {
          const recentMessages = recentMessagesResult.data.data;

          if (recentMessages.length > 0) {
            sessionContextMarkdown += '# Recent Session Context\n\n';
            sessionContextMarkdown += '## Recent Messages\n\n';

            for (const msg of recentMessages.reverse()) {
              const timestamp = msg.timestamp.toLocaleTimeString();
              const role = msg.role === 'assistant' ? 'Assistant' : 'User';
              const preview = msg.content.substring(0, 200);
              const ending = msg.content.length > 200 ? '...' : '';

              sessionContextMarkdown += `**[${timestamp}] ${role}:**\n`;
              sessionContextMarkdown += `${preview}${ending}\n\n`;

              ragResultsTokens += Math.ceil(msg.tokens / 2); // Half credit for summaries
            }
          }
        }
      }

      // ──────────────────────────────────────────────────────────────
      // 3. Include Recent Decisions (from state.md or PROBLEMS.md)
      // ──────────────────────────────────────────────────────────────

      let decisionsMarkdown = '';

      try {
        const statePath = path.join(this.projectPath, 'agent', 'state.md');
        if (fs.existsSync(statePath)) {
          const stateContent = fs.readFileSync(statePath, 'utf-8');
          // Extract recent changes section (usually first 1-2K)
          const lines = stateContent.split('\n');
          const recentSection = lines.slice(0, 50).join('\n');

          decisionsMarkdown += '# Recent Decisions\n\n';
          decisionsMarkdown += recentSection + '\n\n';

          ragResultsTokens += 100; // Estimate for decisions
        }
      } catch (err) {
        warnings.push('Failed to load recent decisions from state.md');
      }

      // ──────────────────────────────────────────────────────────────
      // 4. Include Active Problems and Requests
      // ──────────────────────────────────────────────────────────────

      let activeIssuesMarkdown = '';

      try {
        const allProblems = this.problemsService.getProblems();
        const activeProblems = allProblems.filter(p => ['NEW', 'Not Started', 'In Progress', 'AI Attempted Fix', 'User Testing'].includes(p.status));
        const allRequests = this.requestsService.getRequests();
        const activeRequests = allRequests.filter(r => ['Pending', 'In Progress'].includes(r.status));

        if (activeProblems.length > 0 || activeRequests.length > 0) {
          activeIssuesMarkdown += '# Active Problems & Requests\n\n';

          if (activeProblems.length > 0) {
            activeIssuesMarkdown += '## Active Problems\n';
            activeProblems.slice(0, 5).forEach(p => {
              activeIssuesMarkdown += `- **#${p.id}** [${p.priority}] ${p.title} (${p.status})\n`;
            });
            if (activeProblems.length > 5) {
              activeIssuesMarkdown += `  - *...and ${activeProblems.length - 5} more*\n`;
            }
            activeIssuesMarkdown += '\n';
          }

          if (activeRequests.length > 0) {
            activeIssuesMarkdown += '## Active Requests\n';
            activeRequests.slice(0, 5).forEach(r => {
              activeIssuesMarkdown += `- **#${r.id}** [${r.priority}] ${r.title} (${r.status})\n`;
            });
            if (activeRequests.length > 5) {
              activeIssuesMarkdown += `  - *...and ${activeRequests.length - 5} more*\n`;
            }
            activeIssuesMarkdown += '\n';
          }

          ragResultsTokens += 200;
        }
      } catch (err) {
        warnings.push('Failed to load active problems/requests');
      }

      // ──────────────────────────────────────────────────────────────
      // 5. Include Compaction Summaries (last 3 months)
      // ──────────────────────────────────────────────────────────────

      let compactionMarkdown = '';

      if (manifest && manifest.ragIndex && manifest.compactions && manifest.compactions.length > 0) {
        // Get last 3 compactions
        const recent = manifest.compactions.slice(0, 3);

        if (recent.length > 0) {
          compactionMarkdown += '# Historical Context (Compaction Summaries)\n\n';

          for (const comp of recent) {
            compactionMarkdown += `## ${comp.periodStart.toLocaleDateString()} - ${comp.periodEnd.toLocaleDateString()}\n`;
            compactionMarkdown += `**Compression Ratio:** ${comp.compressionRatio.toFixed(1)}x\n\n`;

            if (comp.keyDecisions && comp.keyDecisions.length > 0) {
              compactionMarkdown += '### Key Decisions\n';
              for (const decision of comp.keyDecisions.slice(0, 5)) {
                compactionMarkdown += `- ${decision}\n`;
              }
              compactionMarkdown += '\n';
            }

            if (comp.patterns && comp.patterns.length > 0) {
              compactionMarkdown += '### Patterns\n';
              for (const pattern of comp.patterns.slice(0, 3)) {
                compactionMarkdown += `- ${pattern}\n`;
              }
              compactionMarkdown += '\n';
            }
          }

          ragResultsTokens += 300; // Estimate for summaries
        }
      }

      // ──────────────────────────────────────────────────────────────
      // 6. Assemble Final Context
      // ──────────────────────────────────────────────────────────────

      sessionContextMarkdown += decisionsMarkdown + activeIssuesMarkdown + compactionMarkdown;
      sessionContextTokens = Math.ceil(sessionContextMarkdown.length / 4); // Rough estimate

      const totalTokens = projectContextTokens + sessionContextTokens + ragResultsTokens;

      // Warn if exceeding budget
      if (totalTokens > config.maxTokens) {
        warnings.push(
          `Context exceeds token budget: ${totalTokens} > ${config.maxTokens} tokens`
        );
      }

      const assembledContext: AssembledContext = {
        projectContextTokens,
        sessionContextTokens,
        ragResultsTokens,
        totalTokens,
        projectContext: projectContextMarkdown || '(No project context available)',
        sessionContext: sessionContextMarkdown || '(No session context available)',
        ragResults,
        assembledAt: new Date(),
        contextIds: manifest?.contexts?.map(c => c.id) || [],
      };

      return {
        success: true,
        assembledContext,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      console.error('Context assembly failed:', error);
      return {
        success: false,
        error: `Context assembly failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Format assembled context for system prompt insertion
   * 
   * Returns markdown-formatted context ready to prepend to user prompt
   */
  public formatContextForPrompt(assembledContext: AssembledContext): string {
    const sections: string[] = [];

    // Add project context
    if (assembledContext.projectContext && assembledContext.projectContext.length > 0) {
      sections.push(assembledContext.projectContext);
    }

    // Add session context
    if (assembledContext.sessionContext && assembledContext.sessionContext.length > 0) {
      sections.push(assembledContext.sessionContext);
    }

    // Add metadata footer
    sections.push(`\n---\n`);
    sections.push(`**Context Assembly Time:** ${assembledContext.assembledAt.toISOString()}\n`);
    sections.push(`**Total Context Tokens:** ${assembledContext.totalTokens}\n`);

    return sections.join('\n');
  }

  /**
   * Estimate token count for text (rough approximation)
   * For accurate counting, use a proper tokenizer
   */
  private estimateTokens(text: string): number {
    // Rough: ~4 chars per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Get context assembly statistics
   */
  public getAssemblyStats(assembledContext: AssembledContext): {
    projectPercentage: number;
    sessionPercentage: number;
    ragPercentage: number;
  } {
    const total = assembledContext.totalTokens || 1;

    return {
      projectPercentage: (assembledContext.projectContextTokens / total) * 100,
      sessionPercentage: (assembledContext.sessionContextTokens / total) * 100,
      ragPercentage: (assembledContext.ragResultsTokens / total) * 100,
    };
  }
}

// Export factory function
export function createContextAssemblyService(
  projectPath: string,
  ragService: RAGService,
  projectContextService: ProjectContextService
): ContextAssemblyService {
  return new ContextAssemblyService(projectPath, ragService, projectContextService);
}
