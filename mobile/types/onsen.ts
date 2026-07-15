export type Region = '上越' | '中越' | '下越';

export interface OnsenFeatures {
  rotenburo: boolean;
  sauna: boolean;
  restaurant: boolean;
  parking: boolean;
}

export interface OnsenPrice {
  adult: number;
  child: number;
  childCondition: string;
}

export interface OnsenCapacity {
  total: number;
  male: number;
  female: number;
}

export interface WinterClosure {
  start: string; // "MM-DD"
  end: string; // "MM-DD"
  enabled: boolean;
}

export interface Onsen {
  id: string;
  name: string;
  areaName: string; // 温泉街名（例: 月岡温泉）
  prefecture: string;
  city: string;
  area: string;
  address: string;
  region: Region;
  latitude: number;
  longitude: number;
  hours: string;
  features: OnsenFeatures;
  description: string;
  components: string;
  effects: string;
  price: OnsenPrice;
  capacity: OnsenCapacity;
  phone: string;
  website: string;
  hasLodging: boolean;
  lodgingUrl: string;
  regularHoliday: string;
  winterClosure: WinterClosure;
  isTemporarilyClosed: boolean;
  photos: string[];
}

export interface GenderCongestion {
  usersCount: number;
  congestionRate: number;
}

export interface Congestion {
  onsenId: string;
  timestamp: string;
  usersCount: number;
  groupsCount: number;
  congestionRate: number;
  male: GenderCongestion;
  female: GenderCongestion;
  unknownCount: number;
}

export type CongestionLevel = 'empty' | 'normal' | 'busy';

export function getCongestionLevel(rate: number): CongestionLevel {
  if (rate < 40) return 'empty';
  if (rate < 70) return 'normal';
  return 'busy';
}

export const congestionLabel: Record<CongestionLevel, string> = {
  empty: '空き',
  normal: '普通',
  busy: '混んでいる',
};

export interface Review {
  id: string;
  onsenId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  createdAt: string;
  status: 'visible' | 'pending' | 'removed';
}
