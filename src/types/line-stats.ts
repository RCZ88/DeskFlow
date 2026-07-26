export interface LineCountResult {
  filePath: string;
  fileType: string;
  totalLines: number;
  blankLines: number;
  commentLines: number;
  codeLines: number;
}

export interface FileTypeSummary {
  count: number;
  totalLines: number;
  codeLines: number;
  commentLines: number;
  blankLines: number;
}

export interface LineStatsData {
  files: LineCountResult[];
  summary: Record<string, FileTypeSummary>;
  scannedAt: string;
  totalFiles: number;
}

export interface ScanOptions {
  excludePatterns?: string[];
  excludeExtensions?: string[];
  includeExtensions?: string[];
  maxFiles?: number;
}
