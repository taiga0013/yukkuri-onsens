import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { congestions as mockCongestions, onsens as mockOnsens } from '../constants/mockOnsen';
import { mapCongestionRow, mapOnsenRow, zeroCongestion } from '../lib/mappers';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { OnsenLiveStatusRow, OnsenRow } from '../types/database';
import type { Congestion, Onsen } from '../types/onsen';

const CONGESTION_POLL_INTERVAL_MS = 5 * 60 * 1000; // spec.md: 5分ごとに自動更新

interface OnsenDataContextValue {
  onsens: Onsen[];
  loadingOnsens: boolean;
  congestionById: Map<string, Congestion>;
  getCongestion: (onsenId: string) => Congestion;
  lastUpdated: Date | null;
  refetchCongestion: () => Promise<void>;
}

const OnsenDataContext = createContext<OnsenDataContextValue | null>(null);

export function OnsenDataProvider({ children }: { children: ReactNode }) {
  const [onsens, setOnsens] = useState<Onsen[]>(isSupabaseConfigured ? [] : mockOnsens);
  const [loadingOnsens, setLoadingOnsens] = useState(isSupabaseConfigured);
  const [congestionById, setCongestionById] = useState<Map<string, Congestion>>(
    isSupabaseConfigured ? new Map() : new Map(mockCongestions.map((c) => [c.onsenId, c])),
  );
  const [lastUpdated, setLastUpdated] = useState<Date | null>(isSupabaseConfigured ? null : new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOnsens = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    const { data, error } = await supabase.from('onsens').select('*');
    if (!error && data) {
      setOnsens((data as OnsenRow[]).map(mapOnsenRow));
    }
    setLoadingOnsens(false);
  }, []);

  const fetchCongestion = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    const { data, error } = await supabase.from('onsen_live_status').select('*');
    if (!error && data) {
      const map = new Map<string, Congestion>();
      for (const row of data as OnsenLiveStatusRow[]) {
        map.set(row.onsen_id, mapCongestionRow(row));
      }
      setCongestionById(map);
      setLastUpdated(new Date());
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    fetchOnsens();
    fetchCongestion();
    intervalRef.current = setInterval(fetchCongestion, CONGESTION_POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchOnsens, fetchCongestion]);

  const getCongestion = useCallback(
    (onsenId: string) => congestionById.get(onsenId) ?? zeroCongestion(onsenId),
    [congestionById],
  );

  const value = useMemo<OnsenDataContextValue>(
    () => ({ onsens, loadingOnsens, congestionById, getCongestion, lastUpdated, refetchCongestion: fetchCongestion }),
    [onsens, loadingOnsens, congestionById, getCongestion, lastUpdated, fetchCongestion],
  );

  return <OnsenDataContext.Provider value={value}>{children}</OnsenDataContext.Provider>;
}

export function useOnsenData() {
  const ctx = useContext(OnsenDataContext);
  if (!ctx) throw new Error('useOnsenData must be used within OnsenDataProvider');
  return ctx;
}
