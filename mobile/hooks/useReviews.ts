import { useCallback, useEffect, useState } from 'react';

import { reviews as mockReviews } from '../constants/mockOnsen';
import { useAuth } from '../context/AuthContext';
import { mapReviewRow } from '../lib/mappers';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { PublicProfileRow, PublicReviewRow } from '../types/database';
import type { Review } from '../types/onsen';

export function useReviews(onsenId: string) {
  const { session, isMock } = useAuth();
  const [reviews, setReviews] = useState<Review[]>(isMock ? mockReviews.filter((r) => r.onsenId === onsenId) : []);
  const [loading, setLoading] = useState(!isMock);

  const fetchReviews = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    setLoading(true);
    const { data } = await supabase
      .from('public_reviews')
      .select('*')
      .eq('onsen_id', onsenId)
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      const rows = data as PublicReviewRow[];
      const userIds = [...new Set(rows.map((r) => r.user_id))];
      const { data: profiles } = await supabase.from('public_profiles').select('*').in('id', userIds);
      const profileMap = new Map((profiles as PublicProfileRow[] | null ?? []).map((p) => [p.id, p]));

      setReviews(
        rows.map((row) => {
          const author = profileMap.get(row.user_id);
          return mapReviewRow(row, author?.display_name ?? '匿名ユーザー', author?.avatar_url ?? '');
        }),
      );
    } else {
      setReviews([]);
    }
    setLoading(false);
  }, [onsenId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const submitReview = useCallback(
    async (rating: 1 | 2 | 3 | 4 | 5, comment: string) => {
      if (!isSupabaseConfigured || !supabase || !session) return { error: 'not_available' as const };
      const { error } = await supabase
        .from('reviews')
        .insert({ onsen_id: onsenId, user_id: session.user.id, rating, comment });
      if (!error) await fetchReviews();
      return { error: error?.message ?? null };
    },
    [onsenId, session, fetchReviews],
  );

  const reportReview = useCallback(
    async (reviewId: string, category: 'spam' | 'abusive' | 'irrelevant' | 'other') => {
      if (!isSupabaseConfigured || !supabase || !session) return { error: 'not_available' as const };
      const { error } = await supabase
        .from('review_reports')
        .insert({ review_id: reviewId, reporter_id: session.user.id, category });
      return { error: error?.message ?? null };
    },
    [session],
  );

  return { reviews, loading, submitReview, reportReview, refetch: fetchReviews };
}
