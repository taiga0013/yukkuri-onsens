import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../constants/theme';
import { showAlert } from '../lib/platformAlert';

type PlanId = 'yukkuri' | 'sauna' | 'both';

interface Plan {
  id: PlanId;
  icon: keyof typeof Ionicons.glyphMap;
  name: string;
  tagline: string;
  price: number;
  benefits: string[];
}

const PLANS: Plan[] = [
  {
    id: 'yukkuri',
    icon: 'sparkles',
    name: '湯っくりプラン',
    tagline: '新潟県内すべての温泉地が見放題に',
    price: 300,
    benefits: [
      '新潟県内すべての温泉地を制限なく閲覧',
      'すべての宿泊プランの詳細を表示',
      '広告非表示',
      '新着温泉地をいち早く通知',
    ],
  },
  {
    id: 'sauna',
    icon: 'flame',
    name: 'サウナ特化プラン',
    tagline: '新潟県内のサウナ施設が見放題に',
    price: 300,
    benefits: [
      '新潟県内のサウナ施設を制限なく閲覧',
      'サウナ施設の混雑状況を優先表示',
      '広告非表示',
      '新着サウナ施設をいち早く通知',
    ],
  },
  {
    id: 'both',
    icon: 'ribbon',
    name: '両方セット',
    tagline: '温泉地・サウナ施設どちらも見放題に',
    price: 500,
    benefits: [
      '新潟県内すべての温泉地・サウナ施設を制限なく閲覧',
      'すべての宿泊プランの詳細を表示',
      'サウナ施設の混雑状況を優先表示',
      '広告非表示・新着施設をいち早く通知',
    ],
  },
];

export default function SubscriptionScreen() {
  const { colors, radius, type } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>('yukkuri');
  const [submitting, setSubmitting] = useState(false);

  const selectedPlan = PLANS.find((p) => p.id === selectedPlanId)!;

  const onSubscribe = async () => {
    setSubmitting(true);
    // デモ画面のため実際の決済は行わない
    await new Promise((r) => setTimeout(r, 600));
    setSubmitting(false);
    showAlert('これはデモ画面です', '実際の決済は行われません。');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: insets.top + 16, gap: 24 }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ alignSelf: 'flex-start' }}>
          <Ionicons name="close" size={26} color={colors.inkDim} />
        </Pressable>

        <View style={{ alignItems: 'center', gap: 8 }}>
          <Text style={{ color: colors.ink, fontSize: type.display, fontWeight: '800' }}>プランを選ぶ</Text>
          <Text style={{ color: colors.inkDim, fontSize: 13.5, textAlign: 'center' }}>
            目的に合わせて3つのプランからお選びいただけます
          </Text>
        </View>

        <View style={{ gap: 10 }}>
          {PLANS.map((plan) => {
            const selected = plan.id === selectedPlanId;
            return (
              <Pressable
                key={plan.id}
                onPress={() => setSelectedPlanId(plan.id)}
                style={[
                  styles.planRow,
                  {
                    borderColor: selected ? colors.accent : colors.rule,
                    backgroundColor: selected ? colors.bgRaised : colors.bg,
                    borderRadius: radius.md,
                    borderWidth: selected ? 2 : 1,
                  },
                ]}
              >
                <Ionicons name={plan.icon} size={24} color={colors.accentStrong} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 14.5 }}>{plan.name}</Text>
                  <Text style={{ color: colors.inkDim, fontSize: 11.5 }}>{plan.tagline}</Text>
                </View>
                <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 16 }}>
                  ¥{plan.price}
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.inkDim }}> /月</Text>
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.card, { borderColor: colors.rule, backgroundColor: colors.bgRaised, borderRadius: radius.md }]}>
          {selectedPlan.benefits.map((b) => (
            <View key={b} style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.accentStrong} />
              <Text style={{ color: colors.ink, fontSize: 14, flex: 1 }}>{b}</Text>
            </View>
          ))}
        </View>

        <View style={{ alignItems: 'center', gap: 4 }}>
          <Text style={{ color: colors.ink, fontSize: 30, fontWeight: '800' }}>
            ¥{selectedPlan.price} <Text style={{ fontSize: 14, fontWeight: '600', color: colors.inkDim }}>/ 月</Text>
          </Text>
          <Text style={{ color: colors.inkFaint, fontSize: 11.5 }}>いつでも解約できます</Text>
        </View>

        <Pressable
          onPress={onSubscribe}
          disabled={submitting}
          style={[styles.subscribeBtn, { backgroundColor: colors.accent, borderRadius: radius.lg, opacity: submitting ? 0.7 : 1 }]}
        >
          <Text style={{ color: colors.onAccent, fontWeight: '700', fontSize: 15 }}>
            {submitting ? '処理中…' : `${selectedPlan.name}に登録する`}
          </Text>
        </Pressable>

        <Text style={{ color: colors.inkFaint, fontSize: 10.5, textAlign: 'center' }}>
          ※ これはデモ画面です。実際の決済・課金は発生しません。
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  planRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  card: { padding: 18, borderWidth: 1, gap: 14 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  subscribeBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 15 },
});
