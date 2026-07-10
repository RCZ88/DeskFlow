/**
 * Project Context Service — Manage Project-Scoped Persistent Memory
 * 
 * Handles loading/saving project context manifests, enabling/disabling contexts,
 * and calculating token usage per context.
 * 
 * Location: src/services/ProjectContextService.ts
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

import type {
  ProjectContextManifest,
  ContextMetadata,
  CompactionRecord,
  ServiceResponse,
  SessionContextEntry,
  ContextType,
  ContextCategory,
} from '@/types/context';

// ──────────────────────────────────────────────────────────────
// Project Context Service Implementation
// ──────────────────────────────────────────────────────────────

export class ProjectContextService {
  private contextDir: string;
  private manifestFile: string;
  private compactionsDir: string;

  /**
   * Initialize project context service
   */
  constructor(projectPath: string) {
    this.contextDir = path.join(projectPath, '.apptracker', 'context');
    this.manifestFile = path.join(this.contextDir, 'project-context.json');
    this.compactionsDir = path.join(this.contextDir, 'compactions');

    // Ensure directories exist
    if (!fs.existsSync(this.contextDir)) {
      fs.mkdirSync(this.contextDir, { recursive: true });
    }
    if (!fs.existsSync(this.compactionsDir)) {
      fs.mkdirSync(this.compactionsDir, { recursive: true });
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Manifest Management
  // ──────────────────────────────────────────────────────────────

  /**
   * Load project context manifest (create if doesn't exist)
   */
  public async loadProjectContextManifest(projectId: string): Promise<ServiceResponse<ProjectContextManifest>> {
    try {
      let manifest: ProjectContextManifest;

      if (fs.existsSync(this.manifestFile)) {
        const data = fs.readFileSync(this.manifestFile, 'utf-8');
        manifest = JSON.parse(data);

        // Convert ISO strings to Date objects
        manifest.createdAt = new Date(manifest.createdAt);
        manifest.updatedAt = new Date(manifest.updatedAt);

        if (manifest.ragIndex?.lastCompacted) {
          manifest.ragIndex.lastCompacted = new Date(manifest.ragIndex.lastCompacted);
        }

        if (manifest.compactions) {
          manifest.compactions = manifest.compactions.map(comp => ({
            ...comp,
            compactDate: new Date(comp.compactDate),
            periodStart: new Date(comp.periodStart),
            periodEnd: new Date(comp.periodEnd),
            createdAt: new Date(comp.createdAt),
          }));
        }

        if (manifest.sessionContexts) {
          manifest.sessionContexts = manifest.sessionContexts.map(ctx => ({
            ...ctx,
            createdAt: new Date(ctx.createdAt),
          }));
        }

        if (manifest.contexts) {
          manifest.contexts = manifest.contexts.map(ctx => ({
            ...ctx,
            lastUpdated: new Date(ctx.lastUpdated),
            createdAt: new Date(ctx.createdAt),
          }));
        }
      } else {
        // Create new manifest
        manifest = {
          id: uuidv4(),
          projectId,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0.0',
          contexts: [],
          ragIndex: {
            totalMessages: 0,
            indexedMessages: 0,
            indexFile: 'rag-index.sqlite',
            lastCompacted: new Date(),
            messagesSinceCompaction: 0,
          },
          compactions: [],
          sessionContexts: [],
        };

        await this.saveProjectContextManifest(manifest);
      }

      return {
        success: true,
        data: manifest,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Failed to load project context manifest:', error);
      return {
        success: false,
        error: `Failed to load manifest: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Save project context manifest
   */
  public async saveProjectContextManifest(manifest: ProjectContextManifest): Promise<ServiceResponse<void>> {
    try {
      const data = JSON.stringify(manifest, null, 2);
      fs.writeFileSync(this.manifestFile, data, 'utf-8');

      return {
        success: true,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Failed to save project context manifest:', error);
      return {
        success: false,
        error: `Failed to save manifest: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Context Management
  // ──────────────────────────────────────────────────────────────

  /**
   * Register a context in the project manifest
   */
  public async registerContext(
    projectId: string,
    name: string,
    category: ContextCategory,
    type: ContextType,
    sourceFile: string,
    tokens: number,
    description?: string
  ): Promise<ServiceResponse<ContextMetadata>> {
    try {
      const manifestResult = await this.loadProjectContextManifest(projectId);
      if (!manifestResult.success || !manifestResult.data) {
        throw new Error('Failed to load manifest');
      }

      const manifest = manifestResult.data;
      const now = new Date();

      // Check if context already exists
      const existing = manifest.contexts.find(c => c.name === name);
      if (existing) {
        // Update existing
        existing.tokens = tokens;
        existing.description = description;
        existing.lastUpdated = now;
        await this.saveProjectContextManifest(manifest);
        return {
          success: true,
          data: existing,
          timestamp: now,
        };
      }

      // Create new context
      const context: ContextMetadata = {
        id: uuidv4(),
        projectId,
        name,
        category,
        type,
        source: sourceFile,
        tokens,
        description,
        enabled: true,
        lastUpdated: now,
        createdAt: now,
      };

      manifest.contexts.push(context);
      manifest.updatedAt = now;

      await this.saveProjectContextManifest(manifest);

      return {
        success: true,
        data: context,
        timestamp: now,
      };
    } catch (error) {
      console.error('Failed to register context:', error);
      return {
        success: false,
        error: `Failed to register context: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Toggle context enabled/disabled
   */
  public async toggleContext(
    projectId: string,
    contextId: string,
    enabled: boolean
  ): Promise<ServiceResponse<void>> {
    try {
      const manifestResult = await this.loadProjectContextManifest(projectId);
      if (!manifestResult.success || !manifestResult.data) {
        throw new Error('Failed to load manifest');
      }

      const manifest = manifestResult.data;
      const context = manifest.contexts.find(c => c.id === contextId);

      if (!context) {
        throw new Error(`Context not found: ${contextId}`);
      }

      context.enabled = enabled;
      manifest.updatedAt = new Date();

      await this.saveProjectContextManifest(manifest);

      return {
        success: true,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Failed to toggle context:', error);
      return {
        success: false,
        error: `Failed to toggle context: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get all enabled contexts
   */
  public async getEnabledContexts(projectId: string): Promise<ServiceResponse<ContextMetadata[]>> {
    try {
      const manifestResult = await this.loadProjectContextManifest(projectId);
      if (!manifestResult.success || !manifestResult.data) {
        throw new Error('Failed to load manifest');
      }

      const manifest = manifestResult.data;
      const enabled = manifest.contexts.filter(c => c.enabled);

      return {
        success: true,
        data: enabled,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Failed to get enabled contexts:', error);
      return {
        success: false,
        error: `Failed to get enabled contexts: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Calculate total tokens for enabled contexts
   */
  public async calculateEnabledTokens(projectId: string): Promise<ServiceResponse<number>> {
    try {
      const enabledResult = await this.getEnabledContexts(projectId);
      if (!enabledResult.success || !enabledResult.data) {
        throw new Error('Failed to get enabled contexts');
      }

      const total = enabledResult.data.reduce((sum, ctx) => sum + ctx.tokens, 0);

      return {
        success: true,
        data: total,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Failed to calculate tokens:', error);
      return {
        success: false,
        error: `Failed to calculate tokens: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Compaction Management
  // ──────────────────────────────────────────────────────────────

  /**
   * Add compaction record to manifest
   */
  public async addCompaction(
    projectId: string,
    compaction: CompactionRecord
  ): Promise<ServiceResponse<void>> {
    try {
      const manifestResult = await this.loadProjectContextManifest(projectId);
      if (!manifestResult.success || !manifestResult.data) {
        throw new Error('Failed to load manifest');
      }

      const manifest = manifestResult.data;
      manifest.compactions.push(compaction);
      manifest.ragIndex.lastCompacted = compaction.compactDate;
      manifest.ragIndex.messagesSinceCompaction = 0;
      manifest.updatedAt = new Date();

      // Keep only last 12 compactions
      if (manifest.compactions.length > 12) {
        manifest.compactions = manifest.compactions.slice(-12);
      }

      await this.saveProjectContextManifest(manifest);

      return {
        success: true,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Failed to add compaction:', error);
      return {
        success: false,
        error: `Failed to add compaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get recent compaction summaries (for context assembly)
   */
  public async getRecentCompactions(
    projectId: string,
    limit: number = 3
  ): Promise<ServiceResponse<CompactionRecord[]>> {
    try {
      const manifestResult = await this.loadProjectContextManifest(projectId);
      if (!manifestResult.success || !manifestResult.data) {
        throw new Error('Failed to load manifest');
      }

      const manifest = manifestResult.data;
      const recent = manifest.compactions.slice(-limit).reverse();

      return {
        success: true,
        data: recent,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Failed to get recent compactions:', error);
      return {
        success: false,
        error: `Failed to get compactions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Session Context Tracking
  // ──────────────────────────────────────────────────────────────

  /**
   * Record which contexts are active in a session
   */
  public async trackSessionContext(
    projectId: string,
    sessionId: string,
    contextIds: string[],
    tokenBudget: number
  ): Promise<ServiceResponse<void>> {
    try {
      const manifestResult = await this.loadProjectContextManifest(projectId);
      if (!manifestResult.success || !manifestResult.data) {
        throw new Error('Failed to load manifest');
      }

      const manifest = manifestResult.data;

      // Remove any existing entry for this session
      manifest.sessionContexts = manifest.sessionContexts.filter(sc => sc.sessionId !== sessionId);

      // Add new entry
      const entry: SessionContextEntry = {
        sessionId,
        createdAt: new Date(),
        contextIds,
        tokenBudget,
        tokensUsed: 0,
      };

      manifest.sessionContexts.push(entry);
      manifest.updatedAt = new Date();

      // Keep only last 100 sessions
      if (manifest.sessionContexts.length > 100) {
        manifest.sessionContexts = manifest.sessionContexts.slice(-100);
      }

      await this.saveProjectContextManifest(manifest);

      return {
        success: true,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Failed to track session context:', error);
      return {
        success: false,
        error: `Failed to track session context: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Utility Methods
  // ──────────────────────────────────────────────────────────────

  /**
   * Get RAG index statistics from manifest
   */
  public async getRagIndexStats(projectId: string): Promise<
    ServiceResponse<{
      totalMessages: number;
      lastCompacted: Date;
      daysSinceCompaction: number;
      messagesSinceCompaction: number;
    } | null>
  > {
    try {
      const manifestResult = await this.loadProjectContextManifest(projectId);
      if (!manifestResult.success || !manifestResult.data) {
        throw new Error('Failed to load manifest');
      }

      const manifest = manifestResult.data;
      const stats = manifest.ragIndex;

      if (!stats) {
        return { success: true, data: null, timestamp: new Date() };
      }

      const now = new Date();
      const daysSinceCompaction = Math.floor(
        (now.getTime() - stats.lastCompacted.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        success: true,
        data: {
          totalMessages: stats.totalMessages,
          lastCompacted: stats.lastCompacted,
          daysSinceCompaction,
          messagesSinceCompaction: stats.messagesSinceCompaction,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Failed to get RAG stats:', error);
      return {
        success: false,
        error: `Failed to get RAG stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Update RAG index message count (called by RAGService)
   */
  public async updateRagMessageCount(projectId: string, totalMessages: number): Promise<ServiceResponse<void>> {
    try {
      const manifestResult = await this.loadProjectContextManifest(projectId);
      if (!manifestResult.success || !manifestResult.data) {
        throw new Error('Failed to load manifest');
      }

      const manifest = manifestResult.data;
      manifest.ragIndex.totalMessages = totalMessages;
      manifest.ragIndex.messagesSinceCompaction = (manifest.ragIndex.messagesSinceCompaction || 0) + 1;
      manifest.updatedAt = new Date();

      await this.saveProjectContextManifest(manifest);

      return {
        success: true,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Failed to update RAG message count:', error);
      return {
        success: false,
        error: `Failed to update message count: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
    }
  }
}

// Export factory function
export function createProjectContextService(projectPath: string): ProjectContextService {
  return new ProjectContextService(projectPath);
}
