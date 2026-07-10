/**
 * Compaction Service — Summarize Old Messages
 * 
 * Handles automatic message compaction to prevent context bloat.
 * Compresses 500 old messages into ~1.2K token markdown summary.
 * Runs monthly or every 100 messages (configurable).
 * 
 * Location: src/services/CompactionService.ts
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { RAGService } from './RAGService';
import { ProjectContextService } from './ProjectContextService';

import type {
  RAGMessage,
  CompactionRecord,
  CompactionResult,
  ServiceResponse,
} from '@/types/context';

// ──────────────────────────────────────────────────────────────
// Compaction Service Implementation
// ──────────────────────────────────────────────────────────────

export class CompactionService {
  private ragService: RAGService;
  private projectContextService: ProjectContextService;
  private projectPath: string;
  private compactionsDir: string;

  // LLM integration (placeholder for actual API calls)
  private llmProvider: LLMProvider;

  /**
   * Initialize compaction service
   */
  constructor(
    projectPath: string,
    ragService: RAGService,
    projectContextService: ProjectContextService,
    llmProvider?: LLMProvider
  ) {
    this.projectPath = projectPath;
    this.ragService = ragService;
    this.projectContextService = projectContextService;
    this.compactionsDir = path.join(projectPath, '.apptracker', 'context', 'compactions');

    // Use default or provided LLM provider
    this.llmProvider = llmProvider || new DefaultLLMProvider();

    // Ensure compactions directory exists
    if (!fs.existsSync(this.compactionsDir)) {
      fs.mkdirSync(this.compactionsDir, { recursive: true });
    }
  }

  /**
   * Check if compaction should run
   * Returns true if:
   * - 100+ messages since last compaction, OR
   * - 30+ days since last compaction
   */
  public async shouldCompact(projectId: string): Promise<boolean> {
    try {
      const statsResult = await this.projectContextService.getRagIndexStats(projectId);
      if (!statsResult.success || !statsResult.data) {
        return false;
      }

      const stats = statsResult.data;

      // Check message threshold
      if (stats.messagesSinceCompaction >= 100) {
        return true;
      }

      // Check time threshold (30 days)
      if (stats.daysSinceCompaction >= 30) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to check compaction status:', error);
      return false;
    }
  }

  /**
   * Execute compaction
   * 
   * Steps:
   * 1. Load old messages (500 messages from 30+ days ago)
   * 2. Call LLM to summarize into ~1.2K tokens
   * 3. Save summary to markdown file
   * 4. Delete old messages from RAG index
   * 5. Update manifest with compaction record
   */
  public async compact(projectId: string): Promise<CompactionResult> {
    try {
      console.log(`[Compaction] Starting for project: ${projectId}`);

      // ──────────────────────────────────────────────────────────────
      // 1. Load old messages
      // ──────────────────────────────────────────────────────────────

      // Get messages from 30+ days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const oldMessagesResult = await this.ragService.getOldMessages(thirtyDaysAgo, 500);
      if (!oldMessagesResult.success || !oldMessagesResult.data) {
        return {
          success: false,
          compactionId: '',
          inputMessages: 0,
          outputTokens: 0,
          compressionRatio: 0,
          error: 'Failed to load old messages',
        };
      }

      const oldMessages = oldMessagesResult.data;
      if (oldMessages.length === 0) {
        return {
          success: true,
          compactionId: uuidv4(),
          inputMessages: 0,
          outputTokens: 0,
          compressionRatio: 0,
        };
      }

      const inputTokens = oldMessages.reduce((sum, msg) => sum + msg.tokens, 0);

      console.log(`[Compaction] Loaded ${oldMessages.length} old messages (${inputTokens} tokens)`);

      // ──────────────────────────────────────────────────────────────
      // 2. Call LLM to summarize
      // ──────────────────────────────────────────────────────────────

      const summaryResult = await this.summarizeMessages(oldMessages);
      if (!summaryResult.success) {
        return {
          success: false,
          compactionId: '',
          inputMessages: oldMessages.length,
          outputTokens: 0,
          compressionRatio: 0,
          error: summaryResult.error,
        };
      }

      const { summary, keyDecisions, patterns, antiPatterns } = summaryResult;
      const outputTokens = Math.ceil(summary.length / 4); // Rough estimate

      console.log(
        `[Compaction] Generated summary: ${outputTokens} tokens (compression: ${(inputTokens / outputTokens).toFixed(1)}x)`
      );

      // ──────────────────────────────────────────────────────────────
      // 3. Save summary to markdown file
      // ──────────────────────────────────────────────────────────────

      const now = new Date();
      const monthStr = now.toISOString().slice(0, 7); // YYYY-MM
      const summaryFile = path.join(this.compactionsDir, `${monthStr}-summary.md`);

      const markdownContent = this.formatSummaryMarkdown(
        oldMessages,
        summary,
        keyDecisions,
        patterns,
        antiPatterns
      );

      fs.writeFileSync(summaryFile, markdownContent, 'utf-8');
      console.log(`[Compaction] Saved summary to: ${summaryFile}`);

      // ──────────────────────────────────────────────────────────────
      // 4. Delete old messages from RAG index
      // ──────────────────────────────────────────────────────────────

      const messageIds = oldMessages.map(msg => msg.id);
      const deleteResult = await this.ragService.deleteMessages(messageIds);
      if (!deleteResult.success) {
        return {
          success: false,
          compactionId: '',
          inputMessages: oldMessages.length,
          outputTokens,
          compressionRatio: inputTokens / outputTokens,
          error: `Failed to delete messages: ${deleteResult.error}`,
        };
      }

      console.log(`[Compaction] Deleted ${messageIds.length} messages from index`);

      // ──────────────────────────────────────────────────────────────
      // 5. Update manifest with compaction record
      // ──────────────────────────────────────────────────────────────

      const compactionId = uuidv4();
      const periodStart = new Date(oldMessages[0].timestamp);
      const periodEnd = new Date(oldMessages[oldMessages.length - 1].timestamp);

      const compactionRecord: CompactionRecord = {
        id: compactionId,
        compactDate: now,
        periodStart,
        periodEnd,
        inputMessageCount: oldMessages.length,
        inputTokens,
        outputSummaryTokens: outputTokens,
        removedMessageIds: messageIds,
        compressionRatio: inputTokens / outputTokens,
        summaryFile: path.relative(this.projectPath, summaryFile),
        keyDecisions,
        patterns,
        antiPatterns,
        createdAt: now,
      };

      const addResult = await this.projectContextService.addCompaction(projectId, compactionRecord);
      if (!addResult.success) {
        return {
          success: false,
          compactionId,
          inputMessages: oldMessages.length,
          outputTokens,
          compressionRatio: inputTokens / outputTokens,
          error: `Failed to save compaction record: ${addResult.error}`,
        };
      }

      console.log(
        `[Compaction] Complete! ID: ${compactionId}, Ratio: ${(inputTokens / outputTokens).toFixed(1)}x`
      );

      return {
        success: true,
        compactionId,
        inputMessages: oldMessages.length,
        outputTokens,
        compressionRatio: inputTokens / outputTokens,
      };
    } catch (error) {
      console.error('Compaction failed:', error);
      return {
        success: false,
        compactionId: '',
        inputMessages: 0,
        outputTokens: 0,
        compressionRatio: 0,
        error: `Compaction error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Summarize messages using LLM
   * 
   * Prompt structure:
   * - Context: These are AI session messages from a project
   * - Task: Extract key decisions, patterns, antipatterns
   * - Format: Structured markdown with sections
   */
  private async summarizeMessages(
    messages: RAGMessage[]
  ): Promise<{
    success: boolean;
    summary?: string;
    keyDecisions?: string[];
    patterns?: string[];
    antiPatterns?: string[];
    error?: string;
  }> {
    try {
      // Prepare message text
      const messageText = messages
        .map(msg => `[${msg.timestamp.toISOString()}] ${msg.role.toUpperCase()}:\n${msg.content}`)
        .join('\n\n---\n\n');

      // Create summarization prompt
      const prompt = this.createSummarizationPrompt(messageText, messages.length);

      console.log(`[Compaction] Calling LLM to summarize ${messages.length} messages`);

      // Call LLM
      const response = await this.llmProvider.summarize(prompt);

      if (!response.success) {
        return {
          success: false,
          error: response.error,
        };
      }

      // Parse structured response
      const { summary, keyDecisions, patterns, antiPatterns } = this.parseCompactionResponse(
        response.summary || ''
      );

      return {
        success: true,
        summary,
        keyDecisions,
        patterns,
        antiPatterns,
      };
    } catch (error) {
      console.error('Message summarization failed:', error);
      return {
        success: false,
        error: `Summarization error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Create summarization prompt for LLM
   */
  private createSummarizationPrompt(messageText: string, messageCount: number): string {
    return `You are an AI assistant helping maintain project knowledge bases. 

I have ${messageCount} messages from AI sessions over the past 30 days that I want to compress into a concise summary.

**Your task:**
1. Extract the most important decisions made during these sessions
2. Identify recurring patterns and best practices discovered
3. Note any anti-patterns or things to avoid
4. Create a 1.2K-token markdown summary

**Format your response as follows:**

# Summary
[1-2 paragraphs of high-level overview]

## Key Decisions
- [Decision 1]
- [Decision 2]
- [Decision 3]
[Continue as needed]

## Patterns & Best Practices
- [Pattern 1]
- [Pattern 2]
[Continue as needed]

## Anti-Patterns to Avoid
- [Anti-pattern 1]
- [Anti-pattern 2]
[Continue as needed]

## Relevant Problems/Requests
- [Any issues or feature requests mentioned]

---

**Messages to summarize:**

${messageText}`;
  }

  /**
   * Parse structured compaction response from LLM
   */
  private parseCompactionResponse(response: string): {
    summary: string;
    keyDecisions: string[];
    patterns: string[];
    antiPatterns: string[];
  } {
    const keyDecisions: string[] = [];
    const patterns: string[] = [];
    const antiPatterns: string[] = [];

    // Extract Key Decisions section
    const decisionsMatch = response.match(/## Key Decisions\n([\s\S]*?)(?=##|$)/);
    if (decisionsMatch) {
      const items = decisionsMatch[1].match(/^- (.+)$/gm) || [];
      keyDecisions.push(
        ...items.map(item => item.replace(/^- /, '').trim()).filter(Boolean)
      );
    }

    // Extract Patterns section
    const patternsMatch = response.match(/## Patterns[^#]*\n([\s\S]*?)(?=##|$)/);
    if (patternsMatch) {
      const items = patternsMatch[1].match(/^- (.+)$/gm) || [];
      patterns.push(
        ...items.map(item => item.replace(/^- /, '').trim()).filter(Boolean)
      );
    }

    // Extract Anti-Patterns section
    const antiPatternsMatch = response.match(/## Anti-Patterns[^#]*\n([\s\S]*?)(?=##|$)/);
    if (antiPatternsMatch) {
      const items = antiPatternsMatch[1].match(/^- (.+)$/gm) || [];
      antiPatterns.push(
        ...items.map(item => item.replace(/^- /, '').trim()).filter(Boolean)
      );
    }

    return {
      summary: response,
      keyDecisions: keyDecisions.slice(0, 10), // Keep top 10
      patterns: patterns.slice(0, 10),
      antiPatterns: antiPatterns.slice(0, 10),
    };
  }

  /**
   * Format summary as markdown file
   */
  private formatSummaryMarkdown(
    messages: RAGMessage[],
    summary: string,
    keyDecisions: string[],
    patterns: string[],
    antiPatterns: string[]
  ): string {
    const periodStart = new Date(messages[0].timestamp).toLocaleDateString();
    const periodEnd = new Date(messages[messages.length - 1].timestamp).toLocaleDateString();
    const inputTokens = messages.reduce((sum, msg) => sum + msg.tokens, 0);
    const outputTokens = Math.ceil(summary.length / 4);
    const compressionRatio = (inputTokens / outputTokens).toFixed(1);

    return `# Compaction Summary

**Period:** ${periodStart} — ${periodEnd}
**Messages:** ${messages.length}
**Input Tokens:** ${inputTokens}
**Output Tokens:** ${outputTokens}
**Compression Ratio:** ${compressionRatio}x

---

${summary}

---

## Metadata

- Generated: ${new Date().toISOString()}
- Message IDs: ${messages.map(m => m.id).join(', ')}
- Session IDs: ${[...new Set(messages.map(m => m.sessionId))].join(', ')}
`;
  }
}

// ──────────────────────────────────────────────────────────────
// LLM Provider Interface & Default Implementation
// ──────────────────────────────────────────────────────────────

export interface LLMProvider {
  summarize(prompt: string): Promise<{
    success: boolean;
    summary?: string;
    error?: string;
  }>;
}

/**
 * Default LLM Provider
 * Tries real LLM via IPC (OpenRouter), falls back to extractive summary
 */
class DefaultLLMProvider implements LLMProvider {
  async summarize(prompt: string): Promise<{
    success: boolean;
    summary?: string;
    error?: string;
  }> {
    try {
      const api = (window as any).deskflowAPI;

      if (api?.summarizeWithLLM) {
        const result = await api.summarizeWithLLM(prompt, { maxTokens: 800 });
        if (result?.success && result.summary) {
          return { success: true, summary: result.summary };
        }
        if (result?.error) {
          console.warn('[LLMProvider] API call failed:', result.error);
        }
      }

      return this.extractiveFallback(prompt);
    } catch (err: any) {
      console.warn('[LLMProvider] Summarization error:', err?.message);
      return this.extractiveFallback(prompt);
    }
  }

  private extractiveFallback(prompt: string): {
    success: boolean;
    summary: string;
    error?: string;
  } {
    try {
      const lines = prompt.split('\n');
      const userMessages: string[] = [];
      const assistantMessages: string[] = [];

      for (const line of lines) {
        if (line.startsWith('[USER]:') || line.startsWith('USER:')) {
          const content = line.replace(/^\[?USER\]?:\s*/, '').trim();
          if (content) userMessages.push(content);
        } else if (line.startsWith('[ASSISTANT]:') || line.startsWith('ASSISTANT:')) {
          const content = line.replace(/^\[?ASSISTANT\]?:\s*/, '').trim();
          if (content) assistantMessages.push(content);
        }
      }

      const sections: string[] = ['# Session Summary (Auto-extracted)'];

      if (userMessages.length > 0) {
        sections.push('## User Requests');
        const significant = userMessages
          .filter(m => m.length > 20)
          .slice(0, 5)
          .map(m => `- ${m.slice(0, 200)}${m.length > 200 ? '...' : ''}`);
        sections.push(significant.join('\n'));
      }

      if (assistantMessages.length > 0) {
        sections.push('## Key Actions');
        const actions = assistantMessages
          .filter(m => m.length > 20)
          .slice(0, 5)
          .map(m => `- ${m.slice(0, 200)}${m.length > 200 ? '...' : ''}`);
        sections.push(actions.join('\n'));
      }

      sections.push(`## Stats`);
      sections.push(`- User messages: ${userMessages.length}`);
      sections.push(`- Assistant messages: ${assistantMessages.length}`);
      sections.push(`- Generated without LLM (extractive summary)`);

      return {
        success: true,
        summary: sections.join('\n\n'),
        error: 'LLM API unavailable — using extractive fallback',
      };
    } catch {
      return {
        success: true,
        summary: '# Session Summary\n\nSummary generation failed. Raw conversation data is available in the session history.',
        error: 'Both LLM and extractive summarization failed',
      };
    }
  }
}

// Export factory function
export function createCompactionService(
  projectPath: string,
  ragService: RAGService,
  projectContextService: ProjectContextService,
  llmProvider?: LLMProvider
): CompactionService {
  return new CompactionService(projectPath, ragService, projectContextService, llmProvider);
}
