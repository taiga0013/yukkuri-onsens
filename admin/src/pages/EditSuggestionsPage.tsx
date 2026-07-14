import { useEffect, useMemo, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { OnsenEditSuggestionRow } from '../types/database';

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all';

interface SuggestionWithMeta extends OnsenEditSuggestionRow {
  onsen_name: string;
  submitter_name: string;
}

const STATUS_LABEL: Record<OnsenEditSuggestionRow['status'], string> = {
  pending: '審査中',
  approved: '承認済み',
  rejected: '却下済み',
};

const FIELD_LABEL: Record<string, string> = {
  hours: '運営時間',
  price_adult: '大人料金',
  price_child: '子供料金',
  phone: '電話番号',
  website: '参考サイト',
  regular_holiday: '定休日',
};

export function EditSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<SuggestionWithMeta[]>([]);
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('onsen_edit_suggestions')
      .select('*, onsens(name), profiles!onsen_edit_suggestions_user_id_fkey(display_name)')
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuggestions(
      (data ?? []).map((row: any) => ({
        ...row,
        onsen_name: row.onsens?.name ?? '(不明な施設)',
        submitter_name: row.profiles?.display_name ?? '(不明なユーザー)',
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () => (filter === 'all' ? suggestions : suggestions.filter((s) => s.status === filter)),
    [suggestions, filter],
  );

  const approve = async (s: SuggestionWithMeta) => {
    setBusyId(s.id);
    const { error } = await supabase.rpc('approve_edit_suggestion', { p_suggestion_id: s.id });
    setBusyId(null);
    if (error) {
      alert(error.message);
      return;
    }
    load();
  };

  const reject = async (s: SuggestionWithMeta) => {
    setBusyId(s.id);
    const { error } = await supabase.rpc('reject_edit_suggestion', { p_suggestion_id: s.id });
    setBusyId(null);
    if (error) {
      alert(error.message);
      return;
    }
    load();
  };

  return (
    <div>
      <div className="page-header">
        <h2>情報修正提案</h2>
      </div>

      <div className="filter-row">
        {(['pending', 'approved', 'rejected', 'all'] as StatusFilter[]).map((f) => (
          <button key={f} className="chip-toggle" data-active={filter === f} onClick={() => setFilter(f)}>
            {f === 'all' ? 'すべて' : STATUS_LABEL[f as OnsenEditSuggestionRow['status']]}
            {f === 'pending' ? `（${suggestions.filter((s) => s.status === 'pending').length}）` : ''}
          </button>
        ))}
      </div>

      {error ? <p className="error-text">{error}</p> : null}
      {loading ? (
        <p className="muted">読み込み中…</p>
      ) : filtered.length === 0 ? (
        <p className="muted">該当する提案はありません。</p>
      ) : (
        <div className="review-list">
          {filtered.map((s) => (
            <div key={s.id} className="review-card">
              <div className="review-card-header">
                <span>
                  <strong>{s.onsen_name}</strong> ・ 提案者: {s.submitter_name}
                </span>
                <span className={`status-badge status-${s.status === 'approved' ? 'visible' : s.status === 'rejected' ? 'removed' : 'pending'}`}>
                  {STATUS_LABEL[s.status]}
                </span>
              </div>
              <ul style={{ margin: '0 0 10px', paddingLeft: 18, fontSize: 13.5 }}>
                {Object.entries(s.proposed_changes).map(([key, value]) => (
                  <li key={key}>
                    {FIELD_LABEL[key] ?? key}: <strong>{String(value)}</strong>
                  </li>
                ))}
              </ul>
              {s.note ? <p className="review-comment">{s.note}</p> : null}
              <div className="review-card-footer">
                <span className="muted">{new Date(s.created_at).toLocaleString('ja-JP')}</span>
                {s.status === 'pending' ? (
                  <div className="row-actions">
                    <button className="link-button" disabled={busyId === s.id} onClick={() => approve(s)}>
                      承認して反映
                    </button>
                    <button className="link-button danger" disabled={busyId === s.id} onClick={() => reject(s)}>
                      却下する
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
