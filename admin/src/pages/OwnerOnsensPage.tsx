import { useEffect, useState } from 'react';

import { LodgingPlansEditor } from '../components/LodgingPlansEditor';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { OnsenRow } from '../types/database';

interface EditState {
  hours: string;
  price_adult: string;
  price_child: string;
  price_child_condition: string;
  payment_method: string;
  regular_holiday: string;
  winter_closure_start: string;
  winter_closure_end: string;
  winter_closure_enabled: boolean;
  is_temporarily_closed: boolean;
}

function toEditState(o: OnsenRow): EditState {
  return {
    hours: o.hours ?? '',
    price_adult: String(o.price_adult ?? 0),
    price_child: String(o.price_child ?? 0),
    price_child_condition: o.price_child_condition ?? '',
    payment_method: o.payment_method ?? '',
    regular_holiday: o.regular_holiday ?? '',
    winter_closure_start: o.winter_closure_start ?? '12-01',
    winter_closure_end: o.winter_closure_end ?? '03-31',
    winter_closure_enabled: o.winter_closure_enabled,
    is_temporarily_closed: o.is_temporarily_closed,
  };
}

export function OwnerOnsensPage() {
  const { session } = useAuth();
  const [onsens, setOnsens] = useState<OnsenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!session) return;
    setLoading(true);
    setError(null);

    const { data: links, error: linksError } = await supabase
      .from('owner_onsen_links')
      .select('onsen_id')
      .eq('owner_id', session.user.id);

    if (linksError) {
      setError(linksError.message);
      setLoading(false);
      return;
    }

    const ids = (links ?? []).map((l) => l.onsen_id as string);
    if (ids.length === 0) {
      setOnsens([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.from('onsens').select('*').in('id', ids);
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setOnsens((data as OnsenRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [session]);

  const startEdit = (o: OnsenRow) => {
    setEditingId(o.id);
    setEdit(toEditState(o));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEdit(null);
  };

  const save = async (onsenId: string) => {
    if (!edit) return;
    setSaving(true);
    const { error } = await supabase.rpc('owner_update_onsen', {
      p_onsen_id: onsenId,
      p_hours: edit.hours,
      p_price_adult: Number(edit.price_adult),
      p_price_child: Number(edit.price_child),
      p_price_child_condition: edit.price_child_condition,
      p_payment_method: edit.payment_method,
      p_regular_holiday: edit.regular_holiday,
      p_winter_closure_start: edit.winter_closure_start,
      p_winter_closure_end: edit.winter_closure_end,
      p_winter_closure_enabled: edit.winter_closure_enabled,
      p_is_temporarily_closed: edit.is_temporarily_closed,
    });
    setSaving(false);
    if (error) {
      alert(error.message);
      return;
    }
    cancelEdit();
    load();
  };

  return (
    <div>
      <div className="page-header">
        <h2>自分の施設</h2>
      </div>
      <p className="muted" style={{ marginBottom: 16 }}>
        日帰り入浴の料金・営業時間・休業情報を編集できます。宿泊ありの施設は宿泊プランの追加・編集も可能です。
        その他の情報（説明・写真・設備など）を変更したい場合は、アプリの温泉地詳細画面から「情報を修正する」で管理者に提案してください。
      </p>

      {error ? <p className="error-text">{error}</p> : null}
      {loading ? (
        <p className="muted">読み込み中…</p>
      ) : onsens.length === 0 ? (
        <p className="muted">担当している施設がまだ登録されていません。管理者に確認してください。</p>
      ) : (
        <div className="review-list">
          {onsens.map((o) => (
            <div key={o.id} className="review-card">
              <div className="review-card-header">
                <span>
                  <strong>{o.name}</strong>
                </span>
                {o.is_temporarily_closed ? <span className="status-badge status-removed">休業中</span> : null}
              </div>

              {editingId === o.id && edit ? (
                <div className="onsen-form" style={{ maxWidth: '100%', marginTop: 10 }}>
                  <div className="form-row">
                    <label>
                      日帰り者の入浴時間
                      <input value={edit.hours} onChange={(e) => setEdit({ ...edit, hours: e.target.value })} />
                    </label>
                  </div>
                  <div className="form-row">
                    <label>
                      日帰り入浴 大人料金（円）
                      <input
                        type="number"
                        value={edit.price_adult}
                        onChange={(e) => setEdit({ ...edit, price_adult: e.target.value })}
                      />
                    </label>
                    <label>
                      日帰り入浴 子供料金（円）
                      <input
                        type="number"
                        value={edit.price_child}
                        onChange={(e) => setEdit({ ...edit, price_child: e.target.value })}
                      />
                    </label>
                  </div>
                  <label>
                    子供料金の条件
                    <input
                      value={edit.price_child_condition}
                      onChange={(e) => setEdit({ ...edit, price_child_condition: e.target.value })}
                    />
                  </label>
                  <label>
                    日帰り入浴 決済方法
                    <input
                      value={edit.payment_method}
                      onChange={(e) => setEdit({ ...edit, payment_method: e.target.value })}
                      placeholder="現金・クレジットカード可"
                    />
                  </label>
                  <label>
                    定休日
                    <input
                      value={edit.regular_holiday}
                      onChange={(e) => setEdit({ ...edit, regular_holiday: e.target.value })}
                    />
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={edit.winter_closure_enabled}
                      onChange={(e) => setEdit({ ...edit, winter_closure_enabled: e.target.checked })}
                    />{' '}
                    冬季休業あり
                  </label>
                  {edit.winter_closure_enabled ? (
                    <div className="form-row">
                      <label>
                        開始（MM-DD）
                        <input
                          value={edit.winter_closure_start}
                          onChange={(e) => setEdit({ ...edit, winter_closure_start: e.target.value })}
                        />
                      </label>
                      <label>
                        終了（MM-DD）
                        <input
                          value={edit.winter_closure_end}
                          onChange={(e) => setEdit({ ...edit, winter_closure_end: e.target.value })}
                        />
                      </label>
                    </div>
                  ) : null}
                  <label>
                    <input
                      type="checkbox"
                      checked={edit.is_temporarily_closed}
                      onChange={(e) => setEdit({ ...edit, is_temporarily_closed: e.target.checked })}
                    />{' '}
                    現在臨時休業中
                  </label>
                  <div className="form-actions">
                    <button className="primary-button" disabled={saving} onClick={() => save(o.id)}>
                      {saving ? '保存中…' : '保存する'}
                    </button>
                    <button type="button" onClick={cancelEdit}>
                      キャンセル
                    </button>
                  </div>

                  {o.has_lodging ? <LodgingPlansEditor onsenId={o.id} /> : null}
                </div>
              ) : (
                <>
                  <p className="review-comment">
                    日帰り者の入浴時間: {o.hours ?? '未設定'} ／ 大人 {o.price_adult ?? 0}円・子供 {o.price_child ?? 0}円 ／ 定休日:{' '}
                    {o.regular_holiday ?? '未設定'}
                  </p>
                  <div className="review-card-footer">
                    <span className="muted" />
                    <button className="link-button" onClick={() => startEdit(o)}>
                      編集する
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
