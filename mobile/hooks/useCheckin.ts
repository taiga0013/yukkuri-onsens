import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { distanceKm } from '../utils/geo';

const CHECKIN_RADIUS_METERS = 100;

export function useCheckin(onsenId: string, onsenLocation?: { latitude: number; longitude: number }) {
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

    if (onsenLocation) {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        return { error: '位置情報の利用を許可すると、チェックインできます。' };
      }
      try {
        const pos = await Location.getCurrentPositionAsync({});
        const km = distanceKm({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }, onsenLocation);
        if (km * 1000 > CHECKIN_RADIUS_METERS) {
          return { error: 'あなたは温泉地範囲外です。' };
        }
      } catch {
        return { error: '現在地を取得できませんでした。' };
      }
    }

    setLoading(true);
    const { error } = await supabase.rpc('checkin_onsen', { p_onsen_id: onsenId, p_source: 'manual' });
    setLoading(false);
    if (!error) await refresh();
    return { error: error?.message ?? null };
  }, [onsenId, session, refresh, onsenLocation]);

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
