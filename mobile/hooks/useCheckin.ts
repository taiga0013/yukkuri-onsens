import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export function useCheckin(onsenId: string) {
  const { session, isMock } = useAuth();
  const [activeCheckinId, setActiveCheckinId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase || !session) return;
    const { data } = await supabase
      .from('checkins')
      .select('id')
      .eq('onsen_id', onsenId)
      .eq('user_id', session.user.id)
      .is('checked_out_at', null)
      .maybeSingle();
    setActiveCheckinId((data?.id as string) ?? null);
  }, [onsenId, session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const checkIn = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase || !session) return { error: 'not_available' as const };
    setLoading(true);
    const { error } = await supabase.rpc('checkin_onsen', { p_onsen_id: onsenId, p_source: 'manual' });
    setLoading(false);
    if (!error) await refresh();
    return { error: error?.message ?? null };
  }, [onsenId, session, refresh]);

  const checkOut = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase || !session) return { error: 'not_available' as const };
    setLoading(true);
    const { error } = await supabase.rpc('checkout_onsen', { p_onsen_id: onsenId });
    setLoading(false);
    if (!error) await refresh();
    return { error: error?.message ?? null };
  }, [onsenId, session, refresh]);

  return { isCheckedIn: Boolean(activeCheckinId), loading, checkIn, checkOut, isAvailable: !isMock };
}
