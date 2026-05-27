import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Table2, Download, Database, Loader2 } from 'lucide-react';

export default function DatabasePage() {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableSchema, setTableSchema] = useState<any[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [tableSearch, setTableSearch] = useState('');
  const [tableLoading, setTableLoading] = useState(false);
  const [tableDataPage, setTableDataPage] = useState(0);
  const TABLE_PAGE_SIZE = 50;

  const api = (window as any).deskflowAPI;

  const fetchTables = useCallback(async () => {
    if (!api?.getDatabaseTables) return;
    try {
      const res = await api.getDatabaseTables();
      if (res?.tables) setTables(res.tables);
    } catch {}
  }, [api]);

  const fetchTableSchema = useCallback(async (tableName: string) => {
    if (!api?.getTableSchema) return;
    try {
      const schema = await api.getTableSchema(tableName);
      setTableSchema(schema || []);
    } catch { setTableSchema([]); }
  }, [api]);

  const fetchTableData = useCallback(async (tableName: string, page = 0) => {
    if (!api?.getTableData) return;
    setTableLoading(true);
    try {
      const offset = page * TABLE_PAGE_SIZE;
      const data = await api.getTableData(tableName, TABLE_PAGE_SIZE + 1, offset);
      setTableData(data || []);
      setTableDataPage(page);
    } catch { setTableData([]); }
    finally { setTableLoading(false); }
  }, [api]);

  useEffect(() => { fetchTables(); }, [fetchTables]);
  useEffect(() => {
    if (selectedTable) {
      fetchTableSchema(selectedTable);
      fetchTableData(selectedTable);
    }
  }, [selectedTable, fetchTableSchema, fetchTableData]);

  const filteredTables = useMemo(() => {
    if (!tableSearch) return tables;
    const q = tableSearch.toLowerCase();
    return tables.filter(t => t.toLowerCase().includes(q));
  }, [tables, tableSearch]);

  const hasNextPage = tableData.length > TABLE_PAGE_SIZE;
  const displayRows = hasNextPage ? tableData.slice(0, TABLE_PAGE_SIZE) : tableData;

  const exportCSV = useCallback(() => {
    if (!selectedTable || !displayRows.length) return;
    const cols = Object.keys(displayRows[0]);
    const csv = [
      cols.join(','),
      ...displayRows.map(row =>
        cols.map(c => {
          const val = String(row[c] ?? '');
          return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
        }).join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${selectedTable}.csv`; a.click();
    URL.revokeObjectURL(url);
  }, [selectedTable, displayRows]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      <div className="flex-shrink-0 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl">
        <div className="px-6 py-4 flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Database className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Database</h1>
            <p className="text-xs text-zinc-500">{tables.length} tables</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="flex gap-4 h-full">
          <div className="w-64 flex-shrink-0 glass rounded-2xl p-3 overflow-auto">
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <input
                type="text" placeholder="Filter tables..." value={tableSearch}
                onChange={e => setTableSearch(e.target.value)}
                className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
              />
            </div>
            <div className="space-y-0.5">
              {filteredTables.map(table => (
                <button key={table} onClick={() => setSelectedTable(table)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    selectedTable === table ? 'bg-purple-500/15 text-purple-300' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Table2 className="w-3 h-3 flex-shrink-0 opacity-50" />
                    <span className="truncate">{table}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 glass rounded-2xl p-4 overflow-auto">
            {selectedTable ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-semibold text-white">{selectedTable}</h2>
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      {tableSchema.length} columns
                      {tableData.length > 0 && ` · ${tableDataPage * TABLE_PAGE_SIZE + 1}–${Math.min((tableDataPage + 1) * TABLE_PAGE_SIZE, tableDataPage * TABLE_PAGE_SIZE + displayRows.length)} rows`}
                    </p>
                  </div>
                  <button onClick={exportCSV} disabled={!displayRows.length}
                    className="px-2.5 py-1 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-xs text-zinc-400 hover:text-white hover:border-zinc-600 transition-all disabled:opacity-30 flex items-center gap-1.5"
                  >
                    <Download className="w-3 h-3" /> Export CSV
                  </button>
                </div>
                {tableSchema.length > 0 && (
                  <div className="mb-4 overflow-x-auto">
                    <div className="flex gap-1.5 flex-wrap">
                      {tableSchema.map((col: any, i: number) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800/50 border border-zinc-700/30 text-[10px]">
                          <span className="text-zinc-300 font-mono">{col.name || col.column_name}</span>
                          <span className="text-zinc-600">{col.type || col.data_type}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {tableLoading ? (
                  <div className="flex items-center justify-center py-12 text-zinc-500">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                ) : displayRows.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-zinc-800/60">
                            {Object.keys(displayRows[0]).map(col => (
                              <th key={col} className="text-left text-zinc-500 font-medium py-2 pr-4 whitespace-nowrap">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {displayRows.map((row, i) => (
                            <tr key={i} className="border-b border-zinc-800/30 hover:bg-zinc-800/20">
                              {Object.entries(row).map(([col, val], j) => (
                                <td key={j} className="py-1.5 pr-4 text-zinc-400 max-w-[200px] truncate">
                                  {val === null ? <span className="text-zinc-700 italic">null</span> : String(val)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-800/40">
                      <button onClick={() => fetchTableData(selectedTable, tableDataPage - 1)} disabled={tableDataPage === 0}
                        className="px-3 py-1 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-xs text-zinc-400 hover:text-white disabled:opacity-30 transition-all"
                      >Previous</button>
                      <span className="text-xs text-zinc-600">Page {tableDataPage + 1}</span>
                      <button onClick={() => fetchTableData(selectedTable, tableDataPage + 1)} disabled={!hasNextPage}
                        className="px-3 py-1 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-xs text-zinc-400 hover:text-white disabled:opacity-30 transition-all"
                      >Next</button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-zinc-600 text-xs">No data in this table</div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                <Database className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-xs">Select a table to browse</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
