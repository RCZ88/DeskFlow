export interface ConnectorConfig {
  id: string;
  type: 'email' | 'calendar';
  provider: 'imap' | 'caldav';
  displayName: string;
  config: ImapConfig | CalDavConfig;
  status: 'connected' | 'error' | 'disconnected';
  lastSync?: string;
  errorMessage?: string;
}

export interface ImapConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  tls: boolean;
  folder?: string;
}

export interface CalDavConfig {
  url: string;
  username: string;
  password: string;
  calendarName?: string;
}

export interface ConnectorItem {
  id: string;
  connectorId: string;
  itemType: 'email' | 'event' | 'reminder';
  subject?: string;
  summary?: string;
  date: string;
  read: boolean;
  metadata?: Record<string, any>;
}

export interface ConnectorTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
}

export interface ConnectorSyncResult {
  success: boolean;
  itemsAdded: number;
  itemsUpdated: number;
  error?: string;
}
