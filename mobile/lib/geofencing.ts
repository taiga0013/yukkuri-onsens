import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { isSupabaseConfigured, supabase } from './supabase';
import { distanceKm } from '../utils/geo';
import type { Onsen } from '../types/onsen';

export const GEOFENCE_TASK_NAME = 'onsen-geofence-task';

// iOSは1アプリあたり最大20リージョンまでしか同時監視できないため、
// 現在地から近い施設のみを動的に登録する（spec.md「GPS・ジオフェンシング実装方式」）
export const MAX_MONITORED_REGIONS = 20;
const CHECKIN_RADIUS_METERS = 100;

TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('[geofence] task error', error);
    return;
  }
  if (!isSupabaseConfigured || !supabase) return;

  const { eventType, region } = (data ?? {}) as {
    eventType?: Location.GeofencingEventType;
    region?: Location.LocationRegion;
  };
  if (!region?.identifier || eventType == null) return;

  try {
    if (eventType === Location.GeofencingEventType.Enter) {
      await supabase.rpc('checkin_onsen', { p_onsen_id: region.identifier, p_source: 'geofence' });
    } else if (eventType === Location.GeofencingEventType.Exit) {
      await supabase.rpc('checkout_onsen', { p_onsen_id: region.identifier });
    }
  } catch (e) {
    console.error('[geofence] rpc failed', e);
  }
});

export async function requestLocationPermissions(): Promise<{ granted: boolean; background: boolean }> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return { granted: false, background: false };

  const bg = await Location.requestBackgroundPermissionsAsync();
  return { granted: true, background: bg.status === 'granted' };
}

export function pickNearestOnsens(
  onsens: Onsen[],
  from: { latitude: number; longitude: number },
  limit = MAX_MONITORED_REGIONS,
): Onsen[] {
  return [...onsens].sort((a, b) => distanceKm(from, a) - distanceKm(from, b)).slice(0, limit);
}

export async function registerNearbyGeofences(onsens: Onsen[], currentLocation: { latitude: number; longitude: number }) {
  const nearest = pickNearestOnsens(onsens, currentLocation);
  if (nearest.length === 0) return;

  const regions: Location.LocationRegion[] = nearest.map((o) => ({
    identifier: o.id,
    latitude: o.latitude,
    longitude: o.longitude,
    radius: CHECKIN_RADIUS_METERS,
    notifyOnEnter: true,
    notifyOnExit: true,
  }));

  await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, regions);
}

export async function stopGeofencing() {
  const started = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK_NAME).catch(() => false);
  if (started) await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
}
