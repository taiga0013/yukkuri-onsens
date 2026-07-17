import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionSheet, type ActionSheetOption } from '../../components/ActionSheet';
import { CongestionBadge } from '../../components/CongestionBadge';
import { PhotoSlider } from '../../components/PhotoSlider';
import { ProgressBar } from '../../components/ProgressBar';
import { useTheme } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useFavorites } from '../../context/FavoritesContext';
import { useOnsenData } from '../../context/OnsenDataContext';
import { useCheckin } from '../../hooks/useCheckin';
import { useOnsenSuggestions } from '../../hooks/useOnsenSuggestions';
import { useReviews } from '../../hooks/useReviews';
import { mapLodgingPlanRow } from '../../lib/mappers';
import { showAlert } from '../../lib/platformAlert';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import type { LodgingPlanRow } from '../../types/database';
import type { LodgingPlan, Review } from '../../types/onsen';
import { getCongestionLevel } from '../../types/onsen';

type SortMode = 'high' | 'low' | 'newest' | 'oldest';
const SORTS: { key: SortMode; label: string }[] = [
  { key: 'high', label: '評価が高い順' },
  { key: 'low', label: '評価が低い順' },
  { key: 'newest', label: '最新のレビュー順' },
  { key: 'oldest', label: '最も古いレビュー順' },
];

const REPORT_CATEGORIES: { label: string; value: 'spam' | 'abusive' | 'irrelevant' | 'other' }[] = [
  { label: 'スパム・宣伝', value: 'spam' },
  { label: '不適切な表現・誹謗中傷', value: 'abusive' },
  { label: '無関係なコンテンツ', value: 'irrelevant' },
  { label: 'その他', value: 'other' },
];

export default function OnsenDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, congestion: semantic, radius, type } = useTheme();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { onsens, getCongestion, loadingOnsens } = useOnsenData();
  const { isMock, session } = useAuth();

  const onsen = onsens.find((o) => o.id === id);
  const {
    reviews: fetchedReviews,
    submitReview: submitReviewRemote,
    reportReview: reportReviewRemote,
    updateReview: updateReviewRemote,
    deleteReview: deleteReviewRemote,
  } = useReviews(id);
  const { isCheckedIn, loading: checkinLoading, checkIn, checkOut, isAvailable: checkinAvailable } = useCheckin(id);
  const { submitEditSuggestion, submitOwnerApplication, isAvailable: suggestionsAvailable } = useOnsenSuggestions(id);
  const [localReviews, setLocalReviews] = useState<Review[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [composing, setComposing] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [draftRating, setDraftRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [draftText, setDraftText] = useState('');
  const [menuReview, setMenuReview] = useState<Review | null>(null);

  const [editingInfo, setEditingInfo] = useState(false);
  const [editHours, setEditHours] = useState('');
  const [editPriceAdult, setEditPriceAdult] = useState('');
  const [editPriceChild, setEditPriceChild] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editNote, setEditNote] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const [applyingOwner, setApplyingOwner] = useState(false);
  const [ownerMessage, setOwnerMessage] = useState('');
  const [submittingOwner, setSubmittingOwner] = useState(false);

  const [lodgingPlans, setLodgingPlans] = useState<LodgingPlan[]>([]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !onsen?.hasLodging) {
      setLodgingPlans([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from('lodging_plans').select('*').eq('onsen_id', onsen.id);
      if (!cancelled && !error && data) {
        setLodgingPlans((data as LodgingPlanRow[]).map(mapLodgingPlanRow));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onsen?.id, onsen?.hasLodging]);

  const congestionData = useMemo(() => (onsen ? getCongestion(onsen.id) : null), [onsen, getCongestion]);
  const allReviews = useMemo(
    () => (isMock ? [...localReviews, ...fetchedReviews] : fetchedReviews),
    [isMock, localReviews, fetchedReviews],
  );
  const sortedReviews = useMemo(() => {
    const list = [...allReviews];
    switch (sortMode) {
      case 'high':
        return list.sort((a, b) => b.rating - a.rating);
      case 'low':
        return list.sort((a, b) => a.rating - b.rating);
      case 'oldest':
        return list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      default:
        return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }, [allReviews, sortMode]);

  if (!onsen || !congestionData) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        {loadingOnsens ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <Text style={{ color: colors.ink }}>温泉地が見つかりませんでした</Text>
        )}
      </View>
    );
  }

  const levelColor = {
    empty: semantic.empty,
    normal: semantic.normal,
    busy: semantic.busy,
  }[getCongestionLevel(congestionData.congestionRate)];

  const MOCK_SELF_USER_ID = 'mock-user';
  const isOwnReview = (review: Review) => review.userId === (isMock ? MOCK_SELF_USER_ID : session?.user.id);

  const closeComposer = () => {
    setComposing(false);
    setEditingReviewId(null);
    setDraftText('');
    setDraftRating(5);
  };

  const startEditReview = (review: Review) => {
    setEditingReviewId(review.id);
    setDraftRating(review.rating);
    setDraftText(review.comment);
    setComposing(true);
  };

  const deleteReviewHandler = async (review: Review) => {
    if (isMock) {
      setLocalReviews((prev) => prev.filter((r) => r.id !== review.id));
      return;
    }
    const { error } = await deleteReviewRemote(review.id);
    if (error) showAlert('削除に失敗しました', error);
  };

  const submitReview = async () => {
    if (!draftText.trim()) return;

    if (editingReviewId) {
      if (isMock) {
        setLocalReviews((prev) =>
          prev.map((r) => (r.id === editingReviewId ? { ...r, rating: draftRating, comment: draftText.trim() } : r)),
        );
      } else {
        const { error } = await updateReviewRemote(editingReviewId, draftRating, draftText.trim());
        if (error) {
          showAlert('更新に失敗しました', error);
          return;
        }
      }
    } else if (isMock) {
      setLocalReviews((prev) => [
        {
          id: `local_${Date.now()}`,
          onsenId: onsen.id,
          userId: MOCK_SELF_USER_ID,
          userName: '湯めぐりユーザー',
          userAvatar: 'https://picsum.photos/seed/avatar-a/100/100',
          rating: draftRating,
          comment: draftText.trim(),
          createdAt: new Date().toISOString(),
          status: 'visible',
        },
        ...prev,
      ]);
    } else {
      const { error } = await submitReviewRemote(draftRating, draftText.trim());
      if (error) {
        showAlert('投稿に失敗しました', error);
        return;
      }
    }
    closeComposer();
  };

  const menuOptions: ActionSheetOption[] = menuReview
    ? isOwnReview(menuReview)
      ? [
          { label: '編集する', onPress: () => startEditReview(menuReview) },
          { label: '削除する', destructive: true, onPress: () => deleteReviewHandler(menuReview) },
        ]
      : REPORT_CATEGORIES.map((c) => ({
          label: c.label,
          onPress: async () => {
            if (!isMock) await reportReviewRemote(menuReview.id, c.value);
            showAlert('通報を受け付けました');
          },
        }))
    : [];

  const submitInfoCorrection = async () => {
    setSubmittingEdit(true);
    const changes: Record<string, string | number> = {};
    if (editHours.trim()) changes.hours = editHours.trim();
    if (editPriceAdult.trim()) changes.price_adult = Number(editPriceAdult);
    if (editPriceChild.trim()) changes.price_child = Number(editPriceChild);
    if (editPhone.trim()) changes.phone = editPhone.trim();

    const { error } = await submitEditSuggestion(changes, editNote);
    setSubmittingEdit(false);
    if (error) {
      showAlert('送信に失敗しました', error);
      return;
    }
    showAlert('ご協力ありがとうございます', '修正提案を受け付けました。管理者の確認後に反映されます。');
    setEditHours('');
    setEditPriceAdult('');
    setEditPriceChild('');
    setEditPhone('');
    setEditNote('');
    setEditingInfo(false);
  };

  const submitOwnerRequest = async () => {
    setSubmittingOwner(true);
    const { error } = await submitOwnerApplication(ownerMessage);
    setSubmittingOwner(false);
    if (error) {
      showAlert('送信に失敗しました', error);
      return;
    }
    showAlert('申請を受け付けました', '管理者の承認をお待ちください。');
    setOwnerMessage('');
    setApplyingOwner(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView bounces={false}>
        <View>
          <PhotoSlider photos={onsen.photos} />
          <Pressable
            onPress={() => router.back()}
            style={[styles.floatBtn, { top: insets.top + 10, left: 14, backgroundColor: colors.bgOverlay }]}
          >
            <Ionicons name="close" size={20} color="#fff" />
          </Pressable>
          <Pressable
            onPress={() => toggleFavorite(onsen.id)}
            style={[styles.floatBtn, { top: insets.top + 10, right: 14, backgroundColor: colors.bgOverlay }]}
          >
            <Ionicons name={isFavorite(onsen.id) ? 'star' : 'star-outline'} size={19} color={colors.accentStrong} />
          </Pressable>
        </View>

        <View style={{ padding: 20, gap: 22 }}>
          {/* 基本情報 */}
          <View style={{ gap: 6 }}>
            <Text style={[styles.name, { color: colors.ink, fontSize: type.display }]}>{onsen.name}</Text>
            <Text style={{ color: colors.inkFaint, fontSize: 12.5 }}>
              {onsen.prefecture}
              {onsen.city}
              {onsen.area}
            </Text>
            {onsen.regularHours ? (
              <Text style={{ color: colors.inkDim, fontSize: 13 }}>電話対応 {onsen.regularHours}</Text>
            ) : null}
            <Text style={{ color: colors.inkDim, fontSize: 13 }}>日帰り者の入浴時間 {onsen.hours}</Text>
            {onsen.lodgerBathHours ? (
              <Text style={{ color: colors.inkDim, fontSize: 13 }}>宿泊者の入浴時間 {onsen.lodgerBathHours}</Text>
            ) : null}
            {onsen.privateBathHours ? (
              <Text style={{ color: colors.inkDim, fontSize: 13 }}>貸し切り風呂の営業時間 {onsen.privateBathHours}</Text>
            ) : null}

            <View style={{ marginTop: 8, gap: 8 }}>
              <View style={styles.rowBetween}>
                <Text style={{ color: colors.inkDim, fontSize: 13 }}>
                  利用人数 <Text style={{ color: colors.ink, fontWeight: '700' }}>{congestionData.usersCount}人</Text> ・ 組数{' '}
                  <Text style={{ color: colors.ink, fontWeight: '700' }}>{congestionData.groupsCount}組</Text>
                </Text>
                <CongestionBadge rate={congestionData.congestionRate} />
              </View>
              <ProgressBar rate={congestionData.congestionRate} color={levelColor} height={7} />

              <View style={[styles.genderCard, { borderColor: colors.rule, backgroundColor: colors.bgRaised, borderRadius: radius.md }]}>
                <GenderStat label="男湯" count={congestionData.male.usersCount} rate={congestionData.male.congestionRate} color={semantic.normal} />
                <View style={[styles.vDivider, { backgroundColor: colors.rule }]} />
                <GenderStat label="女湯" count={congestionData.female.usersCount} rate={congestionData.female.congestionRate} color={semantic.busy} />
              </View>

              {checkinAvailable ? (
                <Pressable
                  disabled={checkinLoading}
                  onPress={async () => {
                    const { error } = isCheckedIn ? await checkOut() : await checkIn();
                    if (error) showAlert('エラー', error);
                  }}
                  style={[
                    styles.checkinBtn,
                    {
                      backgroundColor: isCheckedIn ? colors.bgRaised : colors.accent,
                      borderColor: colors.accent,
                      opacity: checkinLoading ? 0.6 : 1,
                    },
                  ]}
                >
                  <Ionicons name={isCheckedIn ? 'log-out-outline' : 'log-in-outline'} size={17} color={isCheckedIn ? colors.accentStrong : colors.onAccent} />
                  <Text style={{ color: isCheckedIn ? colors.accentStrong : colors.onAccent, fontWeight: '700', fontSize: 13.5 }}>
                    {isCheckedIn ? 'チェックアウトする' : 'チェックインする'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          <Divider />

          {/* 設備情報 */}
          <View>
            <Text style={[styles.sectionTitle, { color: colors.inkFaint }]}>設備情報</Text>
            <View style={styles.featureGrid}>
              <FeatureItem icon="hot-tub" label="露天風呂" on={onsen.features.rotenburo} />
              <FeatureItem icon="fire" label="サウナ" on={onsen.features.sauna} />
              <FeatureItem icon="silverware-fork-knife" label="食事処" on={onsen.features.restaurant} />
              <FeatureItem icon="parking" label="駐車場" on={onsen.features.parking} />
              <FeatureItem icon="bed" label="宿泊" on={onsen.hasLodging} />
            </View>
          </View>

          <Divider />

          {/* 料金・アクセス */}
          <View style={{ gap: 10 }}>
            <Text style={[styles.sectionTitle, { color: colors.inkFaint }]}>料金・アクセス</Text>
            <Text style={{ color: colors.ink, fontSize: 14 }}>
              日帰り入浴料金　大人 {onsen.price.adult}円（税込） / 子供 {onsen.price.child}円（税込）
            </Text>
            {onsen.privateBathPrice ? (
              <Text style={{ color: colors.inkDim, fontSize: 13 }}>貸し切り風呂の料金 {onsen.privateBathPrice}</Text>
            ) : null}
            <Text style={{ color: colors.inkFaint, fontSize: 12 }}>{onsen.price.childCondition}</Text>
            {onsen.price.paymentMethod ? (
              <Text style={{ color: colors.inkDim, fontSize: 13 }}>決済方法：{onsen.price.paymentMethod}</Text>
            ) : null}
            <Text style={{ color: colors.inkDim, fontSize: 13.5 }}>{onsen.address}</Text>
            <Pressable
              style={styles.linkRow}
              onPress={() =>
                Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${onsen.latitude},${onsen.longitude}`)
              }
            >
              <Ionicons name="map-outline" size={16} color={colors.accentStrong} />
              <Text style={{ color: colors.accentStrong, fontSize: 13.5 }}>地図で見る</Text>
            </Pressable>
            {onsen.accessInfo ? (
              <View style={[styles.linkRow, { alignItems: 'flex-start' }]}>
                <Ionicons name="navigate-outline" size={16} color={colors.inkFaint} style={{ marginTop: 1 }} />
                <Text style={{ color: colors.inkDim, fontSize: 13, flex: 1, lineHeight: 19 }}>{onsen.accessInfo}</Text>
              </View>
            ) : null}
            <Pressable style={styles.linkRow} onPress={() => Linking.openURL(`tel:${onsen.phone}`)}>
              <Ionicons name="call-outline" size={16} color={colors.accentStrong} />
              <Text style={{ color: colors.accentStrong, fontSize: 13.5 }}>{onsen.phone}</Text>
            </Pressable>
            <Pressable style={styles.linkRow} onPress={() => Linking.openURL(onsen.website)}>
              <Ionicons name="globe-outline" size={16} color={colors.accentStrong} />
              <Text style={{ color: colors.accentStrong, fontSize: 13.5 }}>参考サイトを開く</Text>
            </Pressable>
            {onsen.hasLodging && onsen.lodgingUrl ? (
              <Pressable style={styles.linkRow} onPress={() => Linking.openURL(onsen.lodgingUrl)}>
                <Ionicons name="bed-outline" size={16} color={colors.accentStrong} />
                <Text style={{ color: colors.accentStrong, fontSize: 13.5 }}>宿泊はこちら</Text>
              </Pressable>
            ) : null}
          </View>

          {onsen.hasLodging && lodgingPlans.length > 0 ? (
            <>
              <Divider />
              <View style={{ gap: 14 }}>
                <Text style={[styles.sectionTitle, { color: colors.inkFaint }]}>おすすめの宿泊プラン</Text>
                {lodgingPlans.map((plan) => (
                  <LodgingPlanCard key={plan.id} plan={plan} />
                ))}
                <Text style={{ color: colors.inkDim, fontSize: 12 }}>
                  その他の宿泊プランは参考サイトまたは宿泊はこちらをご覧ください。
                </Text>
              </View>
            </>
          ) : null}

          <Divider />

          {/* 季節・休業情報 */}
          <View style={{ gap: 8 }}>
            <Text style={[styles.sectionTitle, { color: colors.inkFaint }]}>季節・休業情報</Text>
            {onsen.isTemporarilyClosed ? (
              <View style={[styles.closedBanner, { backgroundColor: colors.danger, borderRadius: radius.md }]}>
                <Text style={styles.closedBannerText}>現在休業中</Text>
              </View>
            ) : null}
            <Text style={{ color: colors.inkDim, fontSize: 13.5 }}>定休日：{onsen.regularHoliday}</Text>
            {onsen.winterClosure.enabled ? (
              <Text style={{ color: colors.inkDim, fontSize: 13.5 }}>
                冬季休業：{onsen.winterClosure.start}〜{onsen.winterClosure.end}
              </Text>
            ) : null}
          </View>

          <Divider />

          {/* 説明欄 */}
          <View style={{ gap: 10 }}>
            <Text style={[styles.sectionTitle, { color: colors.inkFaint }]}>この温泉について</Text>
            <Text style={{ color: colors.inkDim, fontSize: 14, lineHeight: 22 }}>{onsen.description}</Text>
            <Text style={{ color: colors.ink, fontSize: 13 }}>
              泉質・成分：<Text style={{ color: colors.inkDim }}>{onsen.components}</Text>
            </Text>
            <Text style={{ color: colors.ink, fontSize: 13 }}>
              効能・効果：<Text style={{ color: colors.inkDim }}>{onsen.effects}</Text>
            </Text>
          </View>

          {suggestionsAvailable ? (
            <>
              <Divider />
              <View style={{ gap: 12 }}>
                <Text style={[styles.sectionTitle, { color: colors.inkFaint, marginBottom: 0 }]}>この施設について</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable onPress={() => setEditingInfo((v) => !v)}>
                    <Text style={{ color: colors.accentStrong, fontSize: 13, fontWeight: '700' }}>
                      {editingInfo ? '閉じる' : '情報を修正する'}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => setApplyingOwner((v) => !v)}>
                    <Text style={{ color: colors.accentStrong, fontSize: 13, fontWeight: '700' }}>
                      {applyingOwner ? '閉じる' : 'オーナー申請をする'}
                    </Text>
                  </Pressable>
                </View>

                {editingInfo ? (
                  <View style={[styles.composer, { borderColor: colors.rule, backgroundColor: colors.bgRaised, borderRadius: radius.md }]}>
                    <Text style={{ color: colors.inkFaint, fontSize: 12 }}>
                      変更したい項目だけ入力してください。空欄は変更されません。
                    </Text>
                    <TextInput
                      value={editHours}
                      onChangeText={setEditHours}
                      placeholder={`運営時間（現在: ${onsen.hours}）`}
                      placeholderTextColor={colors.inkFaint}
                      style={[styles.composerInput, styles.singleLineInput, { color: colors.ink, borderColor: colors.rule }]}
                    />
                    <TextInput
                      value={editPriceAdult}
                      onChangeText={setEditPriceAdult}
                      placeholder={`大人料金（現在: ${onsen.price.adult}円）`}
                      placeholderTextColor={colors.inkFaint}
                      keyboardType="number-pad"
                      style={[styles.composerInput, styles.singleLineInput, { color: colors.ink, borderColor: colors.rule }]}
                    />
                    <TextInput
                      value={editPriceChild}
                      onChangeText={setEditPriceChild}
                      placeholder={`子供料金（現在: ${onsen.price.child}円）`}
                      placeholderTextColor={colors.inkFaint}
                      keyboardType="number-pad"
                      style={[styles.composerInput, styles.singleLineInput, { color: colors.ink, borderColor: colors.rule }]}
                    />
                    <TextInput
                      value={editPhone}
                      onChangeText={setEditPhone}
                      placeholder={`電話番号（現在: ${onsen.phone}）`}
                      placeholderTextColor={colors.inkFaint}
                      style={[styles.composerInput, styles.singleLineInput, { color: colors.ink, borderColor: colors.rule }]}
                    />
                    <TextInput
                      value={editNote}
                      onChangeText={setEditNote}
                      placeholder="補足があれば自由にご記入ください"
                      placeholderTextColor={colors.inkFaint}
                      multiline
                      style={[styles.composerInput, { color: colors.ink, borderColor: colors.rule }]}
                    />
                    <Pressable
                      onPress={submitInfoCorrection}
                      disabled={submittingEdit}
                      style={[styles.submitBtn, { backgroundColor: colors.accent, opacity: submittingEdit ? 0.6 : 1 }]}
                    >
                      <Text style={{ color: colors.onAccent, fontWeight: '700', fontSize: 13.5 }}>
                        {submittingEdit ? '送信中…' : '修正を提案する'}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}

                {applyingOwner ? (
                  <View style={[styles.composer, { borderColor: colors.rule, backgroundColor: colors.bgRaised, borderRadius: radius.md }]}>
                    <Text style={{ color: colors.inkFaint, fontSize: 12 }}>
                      この施設のオーナー様ですか？申請いただくと管理者確認の上、料金・営業時間・休業情報を編集できるようになります。
                    </Text>
                    <TextInput
                      value={ownerMessage}
                      onChangeText={setOwnerMessage}
                      placeholder="施設名や役職など、確認用の情報をご記入ください"
                      placeholderTextColor={colors.inkFaint}
                      multiline
                      style={[styles.composerInput, { color: colors.ink, borderColor: colors.rule }]}
                    />
                    <Pressable
                      onPress={submitOwnerRequest}
                      disabled={submittingOwner}
                      style={[styles.submitBtn, { backgroundColor: colors.accent, opacity: submittingOwner ? 0.6 : 1 }]}
                    >
                      <Text style={{ color: colors.onAccent, fontWeight: '700', fontSize: 13.5 }}>
                        {submittingOwner ? '送信中…' : '申請する'}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            </>
          ) : null}

          {/* アクションボタン */}
          <View style={styles.actionRow}>
            <Pressable
              onPress={() => toggleFavorite(onsen.id)}
              style={[styles.actionBtn, { backgroundColor: isFavorite(onsen.id) ? colors.accent : colors.bgRaised, borderColor: colors.accent }]}
            >
              <Ionicons name={isFavorite(onsen.id) ? 'star' : 'star-outline'} size={17} color={isFavorite(onsen.id) ? colors.onAccent : colors.accentStrong} />
              <Text style={{ color: isFavorite(onsen.id) ? colors.onAccent : colors.accentStrong, fontWeight: '700', fontSize: 13.5 }}>
                {isFavorite(onsen.id) ? 'お気に入り解除' : 'お気に入り登録'}
              </Text>
            </Pressable>
            <Pressable onPress={() => router.back()} style={[styles.actionBtn, { backgroundColor: colors.bgRaised, borderColor: colors.rule }]}>
              <Ionicons name="close" size={17} color={colors.inkDim} />
              <Text style={{ color: colors.inkDim, fontWeight: '700', fontSize: 13.5 }}>閉じる</Text>
            </Pressable>
          </View>

          <Divider />

          {/* 口コミ */}
          <View style={{ gap: 12 }}>
            <View style={styles.rowBetween}>
              <Text style={[styles.sectionTitle, { color: colors.inkFaint, marginBottom: 0 }]}>口コミ（{allReviews.length}件）</Text>
              <Pressable onPress={() => (composing ? closeComposer() : setComposing(true))}>
                <Text style={{ color: colors.accentStrong, fontSize: 13, fontWeight: '700' }}>
                  {composing ? '閉じる' : '口コミを投稿する'}
                </Text>
              </Pressable>
            </View>

            {composing ? (
              <View style={[styles.composer, { borderColor: colors.rule, backgroundColor: colors.bgRaised, borderRadius: radius.md }]}>
                {editingReviewId ? (
                  <Text style={{ color: colors.inkFaint, fontSize: 12 }}>レビューを編集しています</Text>
                ) : null}
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Pressable key={n} onPress={() => setDraftRating(n as 1 | 2 | 3 | 4 | 5)}>
                      <Ionicons
                        name={n <= draftRating ? 'star' : 'star-outline'}
                        size={22}
                        color={colors.accentStrong}
                      />
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  value={draftText}
                  onChangeText={setDraftText}
                  placeholder="感想を自由に書いてください"
                  placeholderTextColor={colors.inkFaint}
                  multiline
                  style={[styles.composerInput, { color: colors.ink, borderColor: colors.rule }]}
                />
                <Pressable onPress={submitReview} style={[styles.submitBtn, { backgroundColor: colors.accent }]}>
                  <Text style={{ color: colors.onAccent, fontWeight: '700', fontSize: 13.5 }}>
                    {editingReviewId ? '更新する' : '投稿する'}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {SORTS.map((s) => (
                <Pressable
                  key={s.key}
                  onPress={() => setSortMode(s.key)}
                  style={[
                    styles.sortChip,
                    {
                      backgroundColor: sortMode === s.key ? colors.accent : colors.bgInset,
                      borderRadius: radius.pill,
                    },
                  ]}
                >
                  <Text style={{ color: sortMode === s.key ? colors.onAccent : colors.inkDim, fontSize: 11.5, fontWeight: '600' }}>
                    {s.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={{ gap: 12 }}>
              {sortedReviews.map((r) => (
                <ReviewCard key={r.id} review={r} isOwn={isOwnReview(r)} onMenu={() => setMenuReview(r)} />
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <ActionSheet
        visible={!!menuReview}
        title={menuReview && !isOwnReview(menuReview) ? '通報カテゴリを選択' : undefined}
        options={menuOptions}
        onClose={() => setMenuReview(null)}
      />
    </View>
  );
}

function GenderStat({ label, count, rate, color }: { label: string; count: number; rate: number; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={{ color: colors.inkDim, fontSize: 11.5, fontWeight: '600' }}>{label}</Text>
      <Text style={{ color: colors.ink, fontSize: 13, fontWeight: '700' }}>
        {count}人 <Text style={{ color: colors.inkFaint, fontWeight: '400' }}>({rate}%)</Text>
      </Text>
      <ProgressBar rate={rate} color={color} height={4} />
    </View>
  );
}

const PEOPLE_COUNT_LABELS = ['1名利用時', '2名利用時', '3名利用時', '4名以上利用時'];

function LodgingPlanCard({ plan }: { plan: LodgingPlan }) {
  const { colors, radius } = useTheme();
  return (
    <View style={[styles.lodgingPlanCard, { borderColor: colors.rule, backgroundColor: colors.bgRaised, borderRadius: radius.md }]}>
      {plan.photos.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ padding: 10 }} contentContainerStyle={{ gap: 8 }}>
          {plan.photos.map((uri, i) => (
            <Image key={`${uri}-${i}`} source={{ uri }} style={[styles.lodgingPhotoThumb, { borderRadius: radius.md }]} contentFit="cover" />
          ))}
        </ScrollView>
      ) : null}
      <View style={{ padding: 14, paddingTop: plan.photos.length > 0 ? 0 : 14, gap: 8 }}>
        <Text style={{ color: colors.ink, fontSize: 14.5, fontWeight: '700' }}>{plan.name}</Text>
        {plan.mealInfo ? <Text style={{ color: colors.inkDim, fontSize: 13 }}>食事：{plan.mealInfo}</Text> : null}
        {plan.paymentMethod ? (
          <Text style={{ color: colors.inkDim, fontSize: 13 }}>決済方法：{plan.paymentMethod}</Text>
        ) : null}
        {plan.checkInTime || plan.checkOutTime ? (
          <Text style={{ color: colors.inkDim, fontSize: 13 }}>
            チェックイン：{plan.checkInTime || '未設定'} ／ チェックアウト：{plan.checkOutTime || '未設定'}
          </Text>
        ) : null}
        <View style={{ gap: 4, marginTop: 4 }}>
          {plan.pricePerPerson.map((price, i) =>
            price ? (
              <View key={i} style={styles.rowBetween}>
                <Text style={{ color: colors.inkFaint, fontSize: 12.5 }}>{PEOPLE_COUNT_LABELS[i]}</Text>
                <Text style={{ color: colors.ink, fontSize: 13, fontWeight: '700' }}>{price}円 / 人</Text>
              </View>
            ) : null,
          )}
        </View>
      </View>
    </View>
  );
}

function FeatureItem({ icon, label, on }: { icon: string; label: string; on: boolean }) {
  const { colors, radius } = useTheme();
  return (
    <View style={[styles.featureItem, { backgroundColor: colors.bgRaised, borderColor: colors.rule, borderRadius: radius.md, opacity: on ? 1 : 0.35 }]}>
      <MaterialCommunityIcons name={icon as any} size={22} color={on ? colors.accentStrong : colors.inkFaint} />
      <Text style={{ color: on ? colors.ink : colors.inkFaint, fontSize: 11.5, marginTop: 4 }}>{label}</Text>
    </View>
  );
}

function ReviewCard({ review, isOwn, onMenu }: { review: Review; isOwn: boolean; onMenu: () => void }) {
  const { colors, radius } = useTheme();
  return (
    <View style={[styles.reviewCard, { borderColor: colors.rule, backgroundColor: colors.bgRaised, borderRadius: radius.md }]}>
      <View style={styles.rowBetween}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.avatarSmall, { backgroundColor: colors.bgInset }]} />
          <View>
            <Text style={{ color: colors.ink, fontSize: 13, fontWeight: '700' }}>
              {review.userName}
              {isOwn ? <Text style={{ color: colors.accentStrong, fontSize: 11 }}> （あなた）</Text> : null}
            </Text>
            <View style={{ flexDirection: 'row', gap: 1, marginTop: 2 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Ionicons key={n} name={n <= review.rating ? 'star' : 'star-outline'} size={11} color={colors.accentStrong} />
              ))}
            </View>
          </View>
        </View>
        <Pressable onPress={onMenu} hitSlop={10}>
          <Ionicons name="ellipsis-horizontal" size={16} color={colors.inkFaint} />
        </Pressable>
      </View>
      <Text style={{ color: colors.inkDim, fontSize: 13, marginTop: 8, lineHeight: 19 }}>{review.comment}</Text>
      <Text style={{ color: colors.inkFaint, fontSize: 10.5, marginTop: 8 }}>
        {new Date(review.createdAt).toLocaleDateString('ja-JP')}
      </Text>
    </View>
  );
}

function Divider() {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.rule }} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  floatBtn: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontWeight: '800' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  genderCard: { flexDirection: 'row', padding: 12, borderWidth: 1 },
  checkinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  vDivider: { width: 1, marginHorizontal: 14 },
  sectionTitle: { fontSize: 11.5, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: '700', marginBottom: 12 },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  featureItem: { flexBasis: '30%', flexGrow: 1, alignItems: 'center', paddingVertical: 12, borderWidth: 1 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  closedBanner: { paddingVertical: 10, alignItems: 'center' },
  closedBannerText: { color: '#fff', fontWeight: '800', fontSize: 13.5 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1.5,
    borderRadius: 12,
  },
  composer: { padding: 14, borderWidth: 1, gap: 10 },
  composerInput: { minHeight: 70, borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 13.5, textAlignVertical: 'top' },
  singleLineInput: { minHeight: 0, height: 42, textAlignVertical: 'center' },
  submitBtn: { alignSelf: 'flex-end', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10 },
  sortChip: { paddingHorizontal: 12, paddingVertical: 7 },
  reviewCard: { padding: 14, borderWidth: 1 },
  lodgingPlanCard: { borderWidth: 1, overflow: 'hidden' },
  lodgingPhotoThumb: { width: 130, height: 100 },
  avatarSmall: { width: 28, height: 28, borderRadius: 14 },
});
