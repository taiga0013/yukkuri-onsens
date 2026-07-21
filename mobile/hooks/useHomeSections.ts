import { useEffect, useState } from 'react';

import { popularRanking as mockPopular } from '../constants/mockOnsen';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export function useHomeSections() {
  const [popularIds, setPopularIds] = useState<string[]>(isSupabaseConfigured ? [] : mockPopular);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    supabase
      .from('onsen_popularity_7d')
      .select('onsen_id')
      .limit(5)
      .then(({ data }) => {
        if (data) setPopularIds(data.map((r) => r.onsen_id as string));
      });
  }, []);

  return { popularIds };
}
