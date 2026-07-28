import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { useOnsenData } from '../context/OnsenDataContext';
import { registerNearbyGeofences, requestLocationPermissions, stopGeofencing } from '../lib/geofencing';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { distanceKm } from '../utils/geo';

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;
const WEB_CHECKIN_RADIUS_METERS = 100;

// 見た目を持たないサイドエフェクト専用コンポーネント。
// ログイン中（モックモード以外）にプッシュ通知トークン登録・ジオフェンス登録・
// アクティブなチェックインへのハートビート送信を行う。
export function DeviceCapabilities() {
  const { session, profile, isMock } = useAuth();
  const { onsens } = useOnsenData();
  const setupDoneRef = useRef(false);
  const insideOnsenIdsRef = useRef<Set<string>>(new Set());

  // Web版: バックグラウンドジオフェンシングAPIが無いため、フォアグラウンドで
  // 位置情報を継続監視し、半径100m圏内への出入りをchekin/checkout RPCに変換する
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (isMock || !session || !profile || !profile.gps_enabled || onsens.length === 0 || !supabase) return;

    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (cancelled || perm.status !== 'granted') return;

      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 20000, distanceInterval: 20 },
        (position) => {
          if (!supabase) return;
          const here = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          for (const onsen of onsens) {
            const withinRadius = distanceKm(here, onsen) * 1000 <= WEB_CHECKIN_RADIUS_METERS;
            const wasInside = insideOnsenIdsRef.current.has(onsen.id);
            if (withinRadius && !wasInside) {
              insideOnsenIdsRef.current.add(onsen.id);
              supabase.rpc('checkin_onsen', { p_onsen_id: onsen.id, p_source: 'geofence' });
            } else if (!withinRadius && wasInside) {
              insideOnsenIdsRef.current.delete(onsen.id);
              supabase.rpc('checkout_onsen', { p_onsen_id: onsen.id });
            }
          }
        },
      );
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [isMock, session, profile, onsens]);

  useEffect(() => {
    // GPSジオフェンシング（ネイティブAPI）・プッシュ通知トークン取得はネイティブ専用機能のためWebではスキップする
    if (Platform.OS === 'web') return;
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
