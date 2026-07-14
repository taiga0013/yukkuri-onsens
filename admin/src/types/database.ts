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
  region: '上越' | '中越' | '下越';
  latitude: number;
  longitude: number;
  hours: string | null;
  rotenburo: boolean;
  sauna: boolean;
  restaurant: boolean;
  parking: boolean;
  description: string | null;
  components: string | null;
  effects: string | null;
  price_adult: number | null;
  price_child: number | null;
  price_child_condition: string | null;
  capacity_total: number;
  capacity_male: number;
  capacity_female: number;
  phone: string | null;
  website: string | null;
  regular_holiday: string | null;
  winter_closure_start: string | null;
  winter_closure_end: string | null;
  winter_closure_enabled: boolean;
  is_temporarily_closed: boolean;
  photos: string[];
  is_recommended: boolean;
  created_at: string;
  updated_at: string;
}

export type OnsenFormValues = Omit<OnsenRow, 'id' | 'created_at' | 'updated_at'>;

export interface ReviewRow {
  id: string;
  onsen_id: string;
  user_id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  status: 'visible' | 'pending' | 'removed';
  created_at: string;
  updated_at: string;
}

export interface ReviewReportRow {
  id: string;
  review_id: string;
  reporter_id: string;
  category: 'spam' | 'abusive' | 'irrelevant' | 'other';
  created_at: string;
}
