import { useState, useCallback, useRef } from 'react';
import type { ViewState } from '../components/ai/StateShell';

interface ConnectorItemsOpts {
  limit?: number;
  offset?: number;
  itemType?: 'email' | 'event' | 'reminder';
  search?: string;
  unreadOnly?: boolean;
}

interface ConnectorItem {
  id: string;
  subject: string;
  summary?: string;
  itemType: string;
  date: string;
  is_read?: boolean;
}

interface ConnectorItemsState {
  items: ConnectorItem[];
  offset: number;
  hasMore: boolean;
}

const cache = new Map<string, ConnectorItemsState>();

function cacheKey(connectorId: string, opts: ConnectorItemsOpts): string {
  return `${connectorId}|${opts.itemType ?? ''}|${opts.search ?? ''}|${!!opts.unreadOnly}`;
}

export function useConnectorItems(connectorId: string) {
  const [state, setState] = useState<ViewState<ConnectorItemsState>>({ status: 'loading' });

  const load = useCallback(async (opts: ConnectorItemsOpts = {}) => {
    const key = cacheKey(connectorId, opts);
    const cached = cache.get(key);
    if (cached && !opts.offset) {
      setState({ status: 'ready', data: cached });
      return;
    }

    setState({ status: 'loading' });
    try {
      const r = await window.deskflowAPI!.connectors.items(connectorId, {
        limit: opts.limit ?? 20,
        offset: opts.offset ?? 0,
        type: opts.itemType,
        search: opts.search,
        unreadOnly: opts.unreadOnly,
      });
      if (r.success) {
        const data: ConnectorItemsState = {
          items: r.items ?? [],
          offset: (opts.offset ?? 0) + (r.items?.length ?? 0),
          hasMore: (r.items?.length ?? 0) >= (opts.limit ?? 20),
        };
        if (!opts.offset) cache.set(key, data);
        setState({ status: 'ready', data });
      } else {
        setState({ status: 'error', message: r.error ?? 'Failed to load items', retry: () => load(opts) });
      }
    } catch (err: unknown) {
      setState({ status: 'error', message: err instanceof Error ? err.message : 'Failed to load items', retry: () => load(opts) });
    }
  }, [connectorId]);

  const invalidate = useCallback(() => {
    for (const k of cache.keys()) {
      if (k.startsWith(connectorId + '|')) cache.delete(k);
    }
  }, [connectorId]);

  return { state, load, invalidate };
}
