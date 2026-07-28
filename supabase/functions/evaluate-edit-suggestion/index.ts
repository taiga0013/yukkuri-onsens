// 湯っくり — ユーザーからの「情報を修正する」提案をAIが自動判定するFunction
// モバイルアプリが onsen_edit_suggestions に INSERT した直後に呼び出す想定。
//
// 必要な環境変数（Function Secretsとして設定）:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
//
// ANTHROPIC_API_KEY が未設定の場合は何もせず終了する（提案はpendingのまま残り、
// 管理者ダッシュボードから従来通り手動で承認/却下できる）。

import { createClient } from 'jsr:@supabase/supabase-js@2';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';

const EDITABLE_FIELDS = ['hours', 'price_adult', 'price_child', 'phone', 'website', 'regular_holiday'] as const;
const FIELD_LABEL: Record<string, string> = {
  hours: '運営時間',
  price_adult: '大人料金',
  price_child: '子供料金',
  phone: '電話番号',
  website: '参考サイト',
  regular_holiday: '定休日',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

interface AiDecision {
  should_apply: boolean;
  reasoning: string;
}

async function askClaude(onsenName: string, current: Record<string, unknown>, proposed: Record<string, unknown>, note: string | null): Promise<AiDecision | null> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return null;

  const lines = Object.keys(proposed).map((key) => {
    const label = FIELD_LABEL[key] ?? key;
    return `- ${label}: 現在の値「${current[key] ?? '(未設定)'}」 → ユーザーの提案「${proposed[key]}」`;
  });

  const prompt = `あなたは温泉施設情報アプリのデータ品質チェック担当です。
施設名: ${onsenName}
ユーザーからの修正提案:
${lines.join('\n')}
ユーザーの補足コメント: ${note?.trim() || '(なし)'}

この提案を反映すべきか判断してください。
- 現在の値が明らかに誤っている（typo、古い情報、単位間違いなど）と判断でき、かつ提案内容が具体的で妥当だと確信できる場合のみ「反映する」と判断してください。
- 少しでも不確か・悪意ある可能性・根拠不足・破壊的な変更（極端な値、無関係な文字列など）の場合は「反映しない」としてください。
- 現在の値が誤っているとは言えない場合も「反映しない」としてください。

必ず以下のJSON形式のみで回答してください（他の文章は一切含めない）:
{"should_apply": true または false, "reasoning": "日本語で1〜2文の判断理由"}`;

  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    console.error('[evaluate-edit-suggestion] Anthropic API error', res.status, await res.text());
    return null;
  }

  const data = await res.json();
  const text: string = data.content?.[0]?.text ?? '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]);
    if (typeof parsed.should_apply !== 'boolean' || typeof parsed.reasoning !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const { suggestion_id } = await req.json();
    if (!suggestion_id) {
      return new Response(JSON.stringify({ ok: false, error: 'suggestion_id is required' }), { status: 400 });
    }

    const { data: suggestion, error: fetchError } = await supabase
      .from('onsen_edit_suggestions')
      .select('*')
      .eq('id', suggestion_id)
      .single();
    if (fetchError || !suggestion) {
      return new Response(JSON.stringify({ ok: false, error: fetchError?.message ?? 'suggestion not found' }), { status: 404 });
    }

    const { data: onsen, error: onsenError } = await supabase
      .from('onsens')
      .select(EDITABLE_FIELDS.join(',') + ',name')
      .eq('id', suggestion.onsen_id)
      .single();
    if (onsenError || !onsen) {
      return new Response(JSON.stringify({ ok: false, error: onsenError?.message ?? 'onsen not found' }), { status: 404 });
    }

    const proposed = suggestion.proposed_changes as Record<string, unknown>;
    const decision = await askClaude(onsen.name as string, onsen as Record<string, unknown>, proposed, suggestion.note);

    if (!decision) {
      // 判定できなかった場合はpendingのまま管理者の手動確認に委ねる
      return new Response(JSON.stringify({ ok: true, skipped: true }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (decision.should_apply) {
      const updates: Record<string, unknown> = {};
      for (const field of EDITABLE_FIELDS) {
        if (field in proposed) updates[field] = proposed[field];
      }
      await supabase.from('onsens').update(updates).eq('id', suggestion.onsen_id);

      await supabase
        .from('onsen_edit_suggestions')
        .update({ status: 'auto_approved', reviewed_at: new Date().toISOString(), ai_reasoning: decision.reasoning })
        .eq('id', suggestion_id);
    } else {
      await supabase
        .from('onsen_edit_suggestions')
        .update({ status: 'auto_rejected', reviewed_at: new Date().toISOString(), ai_reasoning: decision.reasoning })
        .eq('id', suggestion_id);
    }

    return new Response(JSON.stringify({ ok: true, applied: decision.should_apply }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('[evaluate-edit-suggestion] error', error);
    return new Response(JSON.stringify({ ok: false, error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
