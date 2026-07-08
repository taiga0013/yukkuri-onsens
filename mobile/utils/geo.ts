// 現在地取得（expo-location連携）は後続マイルストーンで実装。
// UI先行フェーズでは新潟駅を仮の現在地として距離計算する。
export const MOCK_CURRENT_LOCATION = { latitude: 37.9161, longitude: 139.0364 };

export function distanceKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const R = 6371;
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = (to.latitude * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistance(km: number): string {
  if (km < 1) return `現在地から ${Math.round(km * 1000)}m`;
  return `現在地から ${km.toFixed(1)}km`;
}
