import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { ScreenHeader } from '../../components/ScreenHeader';
import { SectionHeader } from '../../components/SectionHeader';
import { SettingsRow } from '../../components/SettingsRow';
import { useTheme, useThemeSettings } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useFavorites } from '../../context/FavoritesContext';
import { useOnsenData } from '../../context/OnsenDataContext';
import { useRecentVisits } from '../../hooks/useRecentVisits';
import { pickAndUploadAvatar } from '../../lib/avatarUpload';
import { showAlert } from '../../lib/platformAlert';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';

const AVATAR_SEEDS = ['avatar-a', 'avatar-b', 'avatar-c', 'avatar-d'];
const GENDERS: { label: string; value: 'male' | 'female' | 'unspecified' }[] = [
  { label: '男性', value: 'male' },
  { label: '女性', value: 'female' },
  { label: '設定しない', value: 'unspecified' },
];

function formatVisited(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function MyPageScreen() {
  const { colors, spacing, radius, type } = useTheme();
  const { override, setOverride } = useThemeSettings();
  const { favoriteIds } = useFavorites();
  const { onsens } = useOnsenData();
  const { visits } = useRecentVisits();
  const { profile, isMock, session, signOut, refreshProfile } = useAuth();

  const findOnsen = (id: string) => onsens.find((o) => o.id === id);

  const [avatarIndex, setAvatarIndex] = useState(0);
  const [name, setName] = useState(profile?.display_name ?? '湯めぐりユーザー');
  const [editingName, setEditingName] = useState(false);
  const [gender, setGender] = useState<'male' | 'female' | 'unspecified'>(profile?.gender ?? 'unspecified');
  const [gpsEnabled, setGpsEnabled] = useState(profile?.gps_enabled ?? true);
  const [notifEnabled, setNotifEnabled] = useState(profile?.notifications_enabled ?? true);
  const [reviewCount, setReviewCount] = useState(0);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const nameInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.display_name);
      setGender(profile.gender);
      setGpsEnabled(profile.gps_enabled);
      setNotifEnabled(profile.notifications_enabled);
    }
  }, [profile]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !session) return;
    supabase
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .then(({ count }) => setReviewCount(count ?? 0));
  }, [session]);

  const darkModeOn = override === 'dark';

  const persist = async (fields: Record<string, unknown>) => {
    if (!isSupabaseConfigured || !supabase || !session) return;
    await supabase.from('profiles').update(fields).eq('id', session.user.id);
    await refreshProfile();
  };

  const commitName = () => {
    setEditingName(false);
    persist({ display_name: name });
  };

  const cyclePresetAvatar = () => {
    const next = (avatarIndex + 1) % AVATAR_SEEDS.length;
    setAvatarIndex(next);
    persist({ avatar_url: `https://picsum.photos/seed/${AVATAR_SEEDS[next]}/200/200` });
  };

  const uploadFromLibrary = async () => {
    if (!session) return;
    setUploadingAvatar(true);
    const { url, error } = await pickAndUploadAvatar(session.user.id);
    setUploadingAvatar(false);
    if (error) {
      showAlert('アイコンの変更に失敗しました', error);
      return;
    }
    if (url) await persist({ avatar_url: url });
  };

  const onAvatarPress = () => {
    if (isMock) {
      cyclePresetAvatar();
      return;
    }
    // react-native-webはAlert.alertが空実装で選択メニューを出せないため、
    // Webでは確認なしで直接ファイル選択（expo-image-pickerはWeb対応済み）に進む
    if (Platform.OS === 'web') {
      uploadFromLibrary();
      return;
    }
    Alert.alert('アイコンを変更', undefined, [
      { text: '端末の写真から選ぶ', onPress: uploadFromLibrary },
      { text: 'アプリオリジナルアイコンから選ぶ', onPress: cyclePresetAvatar },
      { text: 'キャンセル', style: 'cancel' },
    ]);
  };

  const avatarUri = profile?.avatar_url || `https://picsum.photos/seed/${AVATAR_SEEDS[avatarIndex]}/200/200`;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="マイページ" />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 28, paddingBottom: 48 }}>
        {/* プロフィール */}
        <View style={styles.profileRow}>
          <Pressable onPress={onAvatarPress} disabled={uploadingAvatar}>
            <Image source={{ uri: avatarUri }} style={[styles.avatar, { borderColor: colors.accent }]} />
            <View style={[styles.editBadge, { backgroundColor: '#fff', borderColor: colors.accent }]}>
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color={colors.accentStrong} />
              ) : (
                <Image source={require('../../assets/avatar-edit-badge.png')} style={styles.editBadgeImage} />
              )}
            </View>
          </Pressable>

          {editingName ? (
            <TextInput
              ref={nameInputRef}
              value={name}
              onChangeText={setName}
              onBlur={commitName}
              autoFocus
              style={[styles.nameInput, { color: colors.ink, borderColor: colors.accent }]}
            />
          ) : (
            <Pressable onPress={() => setEditingName(true)}>
              <Text style={[styles.name, { color: colors.ink, fontSize: type.h1 }]}>{name}</Text>
              <Text style={{ color: colors.inkFaint, fontSize: 12, marginTop: 2 }}>タップして名前を変更</Text>
            </Pressable>
          )}
        </View>

        {/* 統計 */}
        <View style={styles.statsRow}>
          <StatTile label="訪問数" value={visits.length} />
          <StatTile label="お気に入り" value={favoriteIds.size} />
          <StatTile label="レビュー投稿" value={isMock ? 3 : reviewCount} />
        </View>

        {/* 最近行った温泉地 */}
        <View>
          <SectionHeader title="最近行った温泉地" />
          <View style={{ gap: spacing.sm }}>
            {visits.map((v) => {
              const o = findOnsen(v.onsenId);
              if (!o) return null;
              return (
                <View key={v.onsenId} style={[styles.visitRow, { borderColor: colors.rule }]}>
                  <Text style={{ color: colors.ink, fontSize: 13.5, flex: 1 }} numberOfLines={1}>
                    {o.name}
                  </Text>
                  <Text style={{ color: colors.inkFaint, fontSize: 12 }}>{formatVisited(v.visitedAt)}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* 設定 */}
        <View>
          <SectionHeader title="設定" />
          <View style={[styles.card, { backgroundColor: colors.bgRaised, borderColor: colors.rule, borderRadius: radius.lg }]}>
            <SettingsRow
              label="GPS"
              right={
                <Switch
                  value={gpsEnabled}
                  onValueChange={(v) => {
                    setGpsEnabled(v);
                    persist({ gps_enabled: v });
                  }}
                  trackColor={{ true: colors.accent }}
                />
              }
            />
            <SettingsRow
              label="プッシュ通知"
              right={
                <Switch
                  value={notifEnabled}
                  onValueChange={(v) => {
                    setNotifEnabled(v);
                    persist({ notifications_enabled: v });
                  }}
                  trackColor={{ true: colors.accent }}
                />
              }
            />
            <SettingsRow
              label="ダークモード"
              right={
                <Switch
                  value={darkModeOn}
                  onValueChange={(v) => setOverride(v ? 'dark' : 'light')}
                  trackColor={{ true: colors.accent }}
                />
              }
            />
          </View>
        </View>

        {/* アカウント設定 */}
        <View>
          <SectionHeader title="アカウント設定" />
          <View style={[styles.card, { backgroundColor: colors.bgRaised, borderColor: colors.rule, borderRadius: radius.lg }]}>
            <SettingsRow label="ログイン方法" value={isMock ? '未連携（モック動作中）' : 'Google 連携済み'} />
            <SettingsRow label="アイコン変更" value="端末の写真 / オリジナル" onPress={onAvatarPress} />
            <SettingsRow label="名前変更" value={name} onPress={() => setEditingName(true)} />
            <View style={{ paddingVertical: 13 }}>
              <Text style={{ color: colors.ink, fontSize: 14.5, fontWeight: '500', marginBottom: 10 }}>性別設定</Text>
              <View style={styles.segment}>
                {GENDERS.map((g) => {
                  const active = gender === g.value;
                  return (
                    <Pressable
                      key={g.value}
                      onPress={() => {
                        setGender(g.value);
                        persist({ gender: g.value });
                      }}
                      style={[
                        styles.segmentItem,
                        {
                          backgroundColor: active ? colors.accent : colors.bgInset,
                          borderRadius: radius.pill,
                        },
                      ]}
                    >
                      <Text style={{ color: active ? colors.onAccent : colors.inkDim, fontSize: 12.5, fontWeight: '600' }}>
                        {g.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            {!isMock ? (
              <SettingsRow label="ログアウト" onPress={signOut} right={<Text style={{ color: colors.danger, fontSize: 13 }}>実行</Text>} />
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  const { colors, radius } = useTheme();
  return (
    <View style={[styles.statTile, { backgroundColor: colors.bgRaised, borderColor: colors.rule, borderRadius: radius.lg }]}>
      <Text style={{ color: colors.accentStrong, fontSize: 22, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: colors.inkFaint, fontSize: 11.5, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 2 },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadgeImage: { width: 16, height: 16, borderRadius: 8 },
  name: { fontWeight: '700' },
  nameInput: { fontSize: 20, fontWeight: '700', borderBottomWidth: 1.5, paddingVertical: 2, minWidth: 160 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statTile: { flex: 1, alignItems: 'center', paddingVertical: 16, borderWidth: 1 },
  visitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  card: { paddingHorizontal: 14, borderWidth: 1 },
  segment: { flexDirection: 'row', gap: 8 },
  segmentItem: { paddingHorizontal: 14, paddingVertical: 7 },
});
