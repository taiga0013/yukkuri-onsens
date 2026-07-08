import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';

import { useAuth } from '../context/AuthContext';
import { useOnsenData } from '../context/OnsenDataContext';
import { registerNearbyGeofences, requestLocationPermissions, stopGeofencing } from '../lib/geofencing';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;

// 見た目を持たないサイドエフェクト専用コンポーネント。
// ログイン中（モックモード以外）にプッシュ通知トークン登録・ジオフェンス登録・
// アクティブなチェックインへのハートビート送信を行う。
export function DeviceCapabilities() {
  const { session, profile, isMock } = useAuth();
  const { onsens } = useOnsenData();
  const setupDoneRef = useRef(false);

  useEffect(() => {
    if (isMock || !session || !profile || onsens.length === 0 || setupDoneRef.current) return;
    setupDoneRef.current = true;

    (async () => {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted' && supabase) {
          const token = (await Notifications.getExpoPushTokenAsync()).data;
          await supabase.from('profiles').update({ expo_push_token: token }).eq('id', session.user.id);
        }
      } catch (e) {
        console.warn('[push] token registration skipped', e);
      }

      if (!profile.gps_enabled) {
        await stopGeofencing();
        return;
      }

      const { granted, background } = await requestLocationPermissions();
      if (!granted || !background) {
        console.warn('[geofence] permission not granted — falling back to manual check-in');
        return;
      }

      try {
        const position = await Location.getCurrentPositionAsync({});
        await registerNearbyGeofences(onsens, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      } catch (e) {
        console.warn('[geofence] registration failed', e);
      }
    })();
  }, [isMock, session, profile, onsens]);

  useEffect(() => {
    if (isMock || !session || !isSupabaseConfigured || !supabase) return;
    const client = supabase;

    const beat = async () => {
      const { data } = await client
        .from('checkins')
        .select('onsen_id')
        .eq('user_id', session.user.id)
        .is('checked_out_at', null);
      for (const row of data ?? []) {
        await client.rpc('heartbeat_checkin', { p_onsen_id: row.onsen_id as string });
      }
    };

    const interval = setInterval(beat, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isMock, session]);

  return null;
}
