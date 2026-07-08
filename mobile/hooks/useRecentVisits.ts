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
      .limit(limit)
      .then(({ data }) => {
        if (data) setVisits((data as CheckinRow[]).map(mapCheckinToVisit));
        setLoading(false);
      });
  }, [session, limit]);

  return { visits, loading };
}
