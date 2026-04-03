import { useState, useRef, useEffect, useCallback } from 'react';
import { tomtomService, type LocationSearchResult } from '@/lib/tomtom';

interface UseLocationSearchOptions {
  debounceMs?: number;
  minChars?: number;
}

export function useLocationSearch(options: UseLocationSearchOptions = {}) {
  const { debounceMs = 400, minChars = 2 } = options;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = useRef(0);

  const search = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (trimmed.length < minChars) {
        setResults([]);
        setSearching(false);
        return;
      }

      const seq = seqRef.current + 1;
      seqRef.current = seq;
      setSearching(true);
      try {
        const res = await tomtomService.searchLocations(trimmed);
        if (seqRef.current === seq) setResults(res);
      } catch {
        if (seqRef.current === seq) setResults([]);
      } finally {
        if (seqRef.current === seq) setSearching(false);
      }
    },
    [minChars],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < minChars) {
      setResults([]);
      setSearching(false);
      return;
    }
    debounceRef.current = setTimeout(() => search(q), debounceMs);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search, debounceMs, minChars]);

  const clear = useCallback(() => {
    seqRef.current += 1;
    setResults([]);
    setSearching(false);
  }, []);

  const setQueryAndClear = useCallback((text: string) => {
    seqRef.current += 1;
    setQuery(text);
    setResults([]);
    setSearching(false);
  }, []);

  return { query, setQuery, results, searching, clear, setQueryAndClear };
}
