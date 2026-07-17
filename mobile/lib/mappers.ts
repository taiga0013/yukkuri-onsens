import type { CheckinRow, LodgingPlanRow, OnsenLiveStatusRow, OnsenRow, PublicReviewRow } from '../types/database';
import type { Congestion, LodgingPlan, Onsen, Review } from '../types/onsen';

export function mapOnsenRow(row: OnsenRow): Onsen {
  return {
    id: row.id,
    name: row.name,
    areaName: row.area_name,
    prefecture: row.prefecture,
    city: row.city,
    area: row.area,
    address: row.address ?? `${row.prefecture}${row.city}${row.area}`,
    region: row.region,
    latitude: row.latitude,
    longitude: row.longitude,
    hours: row.hours ?? '',
    regularHours: row.regular_hours ?? '',
    lodgerBathHours: row.lodger_bath_hours ?? '',
    privateBathHours: row.private_bath_hours ?? '',
    privateBathPrice: row.private_bath_price ?? '',
    features: {
      rotenburo: row.rotenburo,
      sauna: row.sauna,
      restaurant: row.restaurant,
      parking: row.parking,
    },
    description: row.description ?? '',
    components: row.components ?? '',
    effects: row.effects ?? '',
    price: {
      adult: row.price_adult ?? 0,
      child: row.price_child ?? 0,
      childCondition: row.price_child_condition ?? '',
      paymentMethod: row.payment_method ?? '',
    },
    capacity: {
      total: row.capacity_total,
      male: row.capacity_male,
      female: row.capacity_female,
    },
    phone: row.phone ?? '',
    website: row.website ?? '',
    accessInfo: row.access_info ?? '',
    hasLodging: row.has_lodging,
    lodgingUrl: row.lodging_url ?? '',
    regularHoliday: row.regular_holiday ?? '',
    winterClosure: {
      start: row.winter_closure_start ?? '12-01',
      end: row.winter_closure_end ?? '03-31',
      enabled: row.winter_closure_enabled,
    },
    isTemporarilyClosed: row.is_temporarily_closed,
    photos: row.photos.length > 0 ? row.photos : [`https://picsum.photos/seed/${row.id}/900/650`],
  };
}

export function mapLodgingPlanRow(row: LodgingPlanRow): LodgingPlan {
  return {
    id: row.id,
    name: row.name,
    mealInfo: row.meal_info ?? '',
    paymentMethod: row.payment_method ?? '',
    pricePerPerson: [row.price_per_person_1, row.price_per_person_2, row.price_per_person_3, row.price_per_person_4],
    checkInTime: row.check_in_time ?? '',
    checkOutTime: row.check_out_time ?? '',
    photos: row.photos,
  };
}

export function mapCongestionRow(row: OnsenLiveStatusRow): Congestion {
  return {
    onsenId: row.onsen_id,
    timestamp: row.updated_at,
    usersCount: row.users_count,
    groupsCount: row.groups_count,
    congestionRate: row.congestion_rate,
    male: { usersCount: row.male_count, congestionRate: row.male_congestion_rate },
    female: { usersCount: row.female_count, congestionRate: row.female_congestion_rate },
    unknownCount: row.unknown_count,
  };
}

export function mapReviewRow(row: PublicReviewRow, userName: string, userAvatar: string): Review {
  return {
    id: row.id,
    onsenId: row.onsen_id,
    userId: row.user_id,
    userName,
    userAvatar,
    rating: row.rating,
    comment: row.comment ?? (row.status === 'pending' ? 'このレビューは内容を確認中です' : 'このレビューは削除されました'),
    createdAt: row.created_at,
    status: row.status,
  };
}

export function zeroCongestion(onsenId: string): Congestion {
  return {
    onsenId,
    timestamp: new Date().toISOString(),
    usersCount: 0,
    groupsCount: 0,
    congestionRate: 0,
    male: { usersCount: 0, congestionRate: 0 },
    female: { usersCount: 0, congestionRate: 0 },
    unknownCount: 0,
  };
}

export interface VisitHistoryItem {
  onsenId: string;
  visitedAt: string;
}

export function mapCheckinToVisit(row: CheckinRow): VisitHistoryItem {
  return { onsenId: row.onsen_id, visitedAt: row.checked_out_at ?? row.checked_in_at };
}
