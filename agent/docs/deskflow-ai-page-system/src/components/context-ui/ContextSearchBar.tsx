/**
 * Context Search Bar — Semantic + Full-Text Search Interface
 * 
 * Provides search input with toggle between:
 * - Semantic search (vector embeddings)
 * - Full-text search (keyword matching)
 * 
 * Location: src/components/context-ui/ContextSearchBar.tsx
 */

import React, { useState } from 'react';
import { Search, X, Zap, FileText } from 'lucide-react';

import type { ContextSearchBarProps, RAGSearchResult } from '@/types/context';

// ──────────────────────────────────────────────────────────────
// Search Result Item Component
// ──────────────────────────────────────────────────────────────

interface SearchResultItemProps {
  result: RAGSearchResult;
  onSelect: (result: RAGSearchResult) => void;
}

const SearchResultItem: React.FC<SearchResultItemProps> = ({ result, onSelect }) => {
  const scorePercent = Math.round(result.score * 100);
  const scoreColor = scorePercent >= 80 ? 'text-emerald-400' : scorePercent >= 60 ? 'text-amber-400' : 'text-gray-400';

  return (
    <button
      onClick={() => onSelect(result)}
      className="w-full text-left p-3 hover:bg-gray-700 border-b border-gray-700 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-gray-300 truncate">
              {result.message.timestamp.toLocaleTimeString()}
            </span>
            <span className={`text-xs font-mono ${scoreColor}`}>{scorePercent}%</span>
            {result.type === 'semantic' ? (
              <Zap size={12} className="text-blue-400" title="Semantic match" />
            ) : (
              <FileText size={12} className="text-amber-400" title="Full-text match" />
            )}
          </div>
          <p className="text-xs text-gray-300 line-clamp-2">{result.message.content.substring(0, 200)}</p>
          {result.matchedText && (
            <p className="text-xs text-gray-500 mt-1">Match: "{result.matchedText}"</p>
          )}
        </div>
      </div>
    </button>
  );
};

// ──────────────────────────────────────────────────────────────
// Context Search Bar Component
// ──────────────────────────────────────────────────────────────

export const ContextSearchBar: React.FC<ContextSearchBarProps> = ({
  onSemanticSearch,
  onFullTextSearch,
  onSelectResult,
}) => {
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'semantic' | 'fulltext' | 'both'>('both');
  const [results, setResults] = useState<RAGSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (q: string) => {
    if (q.trim().length === 0) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      let searchResults: RAGSearchResult[] = [];

      if (searchMode === 'semantic' || searchMode === 'both') {
        // Parse query as embedding (in real app, this would be vectorized)
        const semanticResults = await onSemanticSearch(q);
        searchResults = [...searchResults, ...semanticResults];
      }

      if (searchMode === 'fulltext' || searchMode === 'both') {
        const ftResults = await onFullTextSearch(q);
        searchResults = [...searchResults, ...ftResults];
      }

      // Deduplicate and sort by score
      const unique = Array.from(
        new Map(searchResults.map(r => [r.message.id, r])).values()
      ).sort((a, b) => b.score - a.score);

      setResults(unique);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectResult = (result: RAGSearchResult) => {
    onSelectResult(result);
    setQuery('');
    setResults([]);
    setHasSearched(false);
  };

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus-within:border-emerald-500 transition-colors">
          <Search size={16} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              handleSearch(e.target.value);
            }}
            placeholder="Search context history..."
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
                setHasSearched(false);
              }}
              className="p-1 hover:bg-gray-600 rounded transition-colors"
            >
              <X size={14} className="text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Search mode selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setSearchMode('semantic')}
          className={`flex-1 px-3 py-2 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1 ${
            searchMode === 'semantic' || searchMode === 'both'
              ? 'bg-blue-900/50 text-blue-300 border border-blue-700/50'
              : 'bg-gray-700 text-gray-400 border border-gray-600'
          }`}
        >
          <Zap size={12} />
          Semantic
        </button>
        <button
          onClick={() => setSearchMode('fulltext')}
          className={`flex-1 px-3 py-2 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1 ${
            searchMode === 'fulltext' || searchMode === 'both'
              ? 'bg-amber-900/50 text-amber-300 border border-amber-700/50'
              : 'bg-gray-700 text-gray-400 border border-gray-600'
          }`}
        >
          <FileText size={12} />
          Full-Text
        </button>
        <button
          onClick={() => setSearchMode('both')}
          className={`flex-1 px-3 py-2 text-xs font-medium rounded transition-colors ${
            searchMode === 'both'
              ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50'
              : 'bg-gray-700 text-gray-400 border border-gray-600'
          }`}
        >
          Both
        </button>
      </div>

      {/* Results */}
      {loading && (
        <div className="flex items-center justify-center py-6 text-gray-400">
          <Search size={16} className="animate-spin" />
          <span className="text-xs ml-2">Searching...</span>
        </div>
      )}

      {hasSearched && !loading && results.length === 0 && query.trim() && (
        <div className="flex items-center justify-center py-6 text-center">
          <div>
            <p className="text-xs text-gray-400">No results found</p>
            <p className="text-xs text-gray-600 mt-1">Try a different search query</p>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="border border-gray-700 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
          <div className="bg-gray-800 px-3 py-2 border-b border-gray-700">
            <p className="text-xs text-gray-400">
              Found <span className="font-semibold text-emerald-400">{results.length}</span> results
            </p>
          </div>
          <div>
            {results.map(result => (
              <SearchResultItem
                key={result.message.id}
                result={result}
                onSelect={handleSelectResult}
              />
            ))}
          </div>
        </div>
      )}

      {!hasSearched && (
        <div className="p-6 text-center text-gray-500 text-xs">
          <Search size={20} className="mx-auto mb-2 opacity-50" />
          <p>Enter a search query to find messages</p>
          <p className="text-gray-600 mt-1">Searches both semantic and full-text indices</p>
        </div>
      )}
    </div>
  );
};

export default ContextSearchBar;
