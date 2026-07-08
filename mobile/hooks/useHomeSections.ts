import { useEffect, useState } from 'react';

import { popularRanking as mockPopular, recommended as mockRecommended } from '../constants/mockOnsen';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export function useHomeSections() {
  const [recommendedIds, setRecommendedIds] = useState<string[]>(isSupabaseConfigured ? [] : mockRecommended);
  const [popularIds, setPopularIds] = useState<string[]>(isSupabaseConfigured ? [] : mockPopular);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    supabase
      .from('onsens')
      .select('id')
      .eq('is_recommended', true)
      .limit(5)
      .then(({ data }) => {
        if (data) setRecommendedIds(data.map((r) => r.id as string));
      });

    supabase
      .from('onsen_popularity_7d')
      .select('onsen_id')
      .limit(5)
      .then(({ data }) => {
        if (data) setPopularIds(data.map((r) => r.onsen_id as string));
      });
  }, []);

  return { recommendedIds, popularIds };
}
