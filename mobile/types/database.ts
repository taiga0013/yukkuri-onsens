export interface ProfileRow {
  id: string;
  display_name: string;
  avatar_url: string | null;
  gender: 'male' | 'female' | 'unspecified';
  role: 'user' | 'owner' | 'admin';
  gps_enabled: boolean;
  notifications_enabled: boolean;
  expo_push_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface OnsenRow {
  id: string;
  name: string;
  area_name: string;
  prefecture: string;
  city: string;
  area: string;
  address: string | null;
  region: '上越' | '中越' | '下越';
  latitude: number;
  longitude: number;
  hours: string | null;
  rotenburo: boolean;
  sauna: boolean;
  restaurant: boolean;
  parking: boolean;
  has_lodging: boolean;
  lodging_url: string | null;
  description: string | null;
  components: string | null;
  effects: string | null;
  price_adult: number | null;
  price_child: number | null;
  price_child_condition: string | null;
  payment_method: string | null;
  capacity_total: number;
  capacity_male: number;
  capacity_female: number;
  phone: string | null;
  website: string | null;
  access_info: string | null;
  regular_holiday: string | null;
  winter_closure_start: string | null;
  winter_closure_end: string | null;
  winter_closure_enabled: boolean;
  is_temporarily_closed: boolean;
  photos: string[];
  created_at: string;
  updated_at: string;
}

export interface LodgingPlanRow {
  id: string;
  onsen_id: string;
  name: string;
  meal_info: string | null;
  payment_method: string | null;
  price_per_person_1: string | null;
  price_per_person_2: string | null;
  price_per_person_3: string | null;
  price_per_person_4: string | null;
  photos: string[];
  created_at: string;
  updated_at: string;
}

export interface OnsenLiveStatusRow {
  onsen_id: string;
  capacity_total: number;
  capacity_male: number;
  capacity_female: number;
  users_count: number;
  groups_count: number;
  male_count: number;
  female_count: number;
  unknown_count: number;
  congestion_rate: number;
  male_congestion_rate: number;
  female_congestion_rate: number;
  updated_at: string;
}

export interface CheckinRow {
  id: string;
  user_id: string;
  onsen_id: string;
  source: 'geofence' | 'manual';
  checked_in_at: string;
  checked_out_at: string | null;
  last_heartbeat_at: string;
}

export interface FavoriteRow {
  user_id: string;
  onsen_id: string;
  created_at: string;
}

export interface PublicReviewRow {
  id: string;
  onsen_id: string;
  user_id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string | null; // pending/removedで本人・管理者以外はnull
  status: 'visible' | 'pending' | 'removed';
  created_at: string;
  updated_at: string;
}

export interface PublicProfileRow {
  id: string;
  display_name: string;
  avatar_url: string | null;
}
