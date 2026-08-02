import { DataSourceName, DataAdapter, SafeQuery } from './compositionTypes';

const adapters = new Map<DataSourceName, DataAdapter>();

export function registerAdapter(adapter: DataAdapter) {
  adapters.set(adapter.name, adapter);
}

export function getAdapter(name: DataSourceName): DataAdapter | undefined {
  return adapters.get(name);
}

export function querySource(name: DataSourceName, query: SafeQuery): any[] {
  const adapter = adapters.get(name);
  if (!adapter) throw new Error(`Unknown data source: ${name}`);
  return adapter.safeQuery(query);
}

export function listRegisteredSources(): DataSourceName[] {
  return Array.from(adapters.keys());
}

export function listAdapterEvents(name: DataSourceName): string[] {
  const adapter = adapters.get(name);
  return adapter ? adapter.listEvents() : [];
}

export function subscribeSource(name: DataSourceName, topic: string, handler: (event: any) => void): () => void {
  const adapter = adapters.get(name);
  if (!adapter) { return () => {}; }
  return adapter.subscribe(topic, handler);
}
