import { useEffect, useState } from 'react';

import { recentVisits as mockRecentVisits } from '../constants/mockOnsen';
import { useAuth } from '../context/AuthContext';
import { mapCheckinToVisit, type VisitHistoryItem } from '../lib/mappers';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { CheckinRow } from '../types/database';

export function useRecentVisits(limit = 5) {
  const { session, isMock } = useAuth();
  const [visits, setVisits] = useState<VisitHistoryItem[]>(isMock ? mockRecentVisits : []);
  const [loading, setLoading] = useState(!isMock);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !session) return;
    setLoading(true);
    supabase
      .from('checkins')
      .select('*')
      .eq('user_id', session.user.id)
      .not('checked_out_at', 'is', null)
      .order('checked_out_at', { ascending: false })
      .limit(limit * 4) // 同じ施設への複数回チェックインを除いてもlimit件数を確保できるよう多めに取得
      .then(({ data }) => {
        if (data) {
          const seenOnsenIds = new Set<string>();
          const deduped: VisitHistoryItem[] = [];
          for (const row of data as CheckinRow[]) {
            const visit = mapCheckinToVisit(row);
            if (seenOnsenIds.has(visit.onsenId)) continue;
            seenOnsenIds.add(visit.onsenId);
            deduped.push(visit);
            if (deduped.length >= limit) break;
          }
          setVisits(deduped);
        }
        setLoading(false);
      });
  }, [session, limit]);

  return { visits, loading };
}
