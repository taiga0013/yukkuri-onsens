// 湯めぐり新潟 — Database Webhookから呼ばれ、Expo Push Notification Serviceへ転送する
// spec.md「プッシュ通知の実装基盤」に準拠
//
// Supabase Dashboard > Database > Webhooks で以下を設定する:
//   - checkins テーブルの INSERT / UPDATE   -> このFunctionを呼ぶ
//   - onsens テーブルの UPDATE (is_temporarily_closed) -> このFunctionを呼ぶ
//
// 必要な環境変数（Function Secretsとして設定）:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'jsr:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: Record<string, unknown>;
  old_record: Record<string, unknown> | null;
}

async function sendExpoPush(tokens: string[], title: string, body: string) {
  const messages = tokens
    .filter((t) => typeof t === 'string' && t.startsWith('ExponentPushToken'))
    .map((to) => ({ to, title, body, sound: 'default' }));

  if (messages.length === 0) return;

  await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });
}

async function pushTokenFor(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('expo_push_token, notifications_enabled')
    .eq('id', userId)
    .single();
  if (!data || !data.notifications_enabled) return null;
  return (data.expo_push_token as string) ?? null;
}

Deno.serve(async (req) => {
  const payload = (await req.json()) as WebhookPayload;

  try {
    if (payload.table === 'checkins') {
      const record = payload.record;
      const isCheckout = payload.type === 'UPDATE' && record.checked_out_at && !payload.old_record?.checked_out_at;
      const isCheckin = payload.type === 'INSERT';

      if (isCheckin || isCheckout) {
        const { data: onsen } = await supabase
          .from('onsens')
          .select('name')
          .eq('id', record.onsen_id as string)
          .single();
        const token = await pushTokenFor(record.user_id as string);
        if (token && onsen) {
          const title = isCheckin ? `${onsen.name}にチェックインしました！` : `${onsen.name}を退場しました`;
          const body = isCheckin ? '快適な温泉時間をお過ごしください。' : 'またのご利用をお待ちしています。';
          await sendExpoPush([token], title, body);
        }
      }
    }

    if (payload.table === 'onsens') {
      const record = payload.record;
      const becameClosed = payload.type === 'UPDATE' && record.is_temporarily_closed && !payload.old_record?.is_temporarily_closed;

      if (becameClosed) {
        const { data: favorites } = await supabase
          .from('favorites')
          .select('user_id')
          .eq('onsen_id', record.id as string);

        const tokens: string[] = [];
        for (const fav of favorites ?? []) {
          const token = await pushTokenFor(fav.user_id as string);
          if (token) tokens.push(token);
        }
        await sendExpoPush(tokens, `${record.name}が臨時休業になりました`, 'お気に入り登録している温泉地の情報が更新されました。');
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ ok: false, error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
