import type Database from 'better-sqlite3';
import * as repo from '../db/repo';
import type { LearnPermission, Result } from '../../../shared/learn/types';

const DEFAULT_PERMISSIONS: LearnPermission[] = [
  { resource: 'ai_provider', grant: 'ask', rationale: 'AI provider access requires user confirmation' },
  { resource: 'file_system', grant: 'ask', rationale: 'File system access requires user confirmation' },
  { resource: 'network', grant: 'never', rationale: 'Network access is blocked by default for safety' },
  { resource: 'node_edit', grant: 'ask', rationale: 'Editing node content requires confirmation' },
];

export class PermissionService {
  constructor(private db: Database) {
    this.initDefaults();
  }

  private initDefaults() {
    for (const perm of DEFAULT_PERMISSIONS) {
      const existing = repo.getPermission(this.db, perm.resource);
      if (!existing) {
        repo.upsertPermission(this.db, {
          key: perm.resource, resource: perm.resource,
          grant: perm.grant, rationale: perm.rationale,
        });
      }
    }
  }

  getAll(): Result<LearnPermission[]> {
    try {
      const rows = repo.getAllPermissions(this.db);
      const perms = rows.map((r: any) => ({
        resource: r.resource as LearnPermission['resource'],
        grant: r.grant as LearnPermission['grant'],
        rationale: r.rationale ?? undefined,
      }));
      return { ok: true, data: perms };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  get(resource: string): Result<LearnPermission | null> {
    try {
      const row = repo.getPermission(this.db, resource);
      if (!row) return { ok: true, data: null };
      const r = row as any;
      return {
        ok: true,
        data: {
          resource: r.resource as LearnPermission['resource'],
          grant: r.grant as LearnPermission['grant'],
          rationale: r.rationale ?? undefined,
        },
      };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  set(perm: LearnPermission): Result<{ ok: boolean }> {
    try {
      repo.upsertPermission(this.db, {
        key: perm.resource, resource: perm.resource,
        grant: perm.grant, rationale: perm.rationale,
      });
      return { ok: true, data: { ok: true } };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  check(resource: string): 'ask' | 'always' | 'never' {
    const row = repo.getPermission(this.db, resource);
    if (!row) return 'ask';
    return (row as any).grant as 'ask' | 'always' | 'never';
  }
}
