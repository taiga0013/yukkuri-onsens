import { useEffect, useMemo, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { OwnerApplicationRow } from '../types/database';

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all';

interface AppWithMeta extends OwnerApplicationRow {
  onsen_name: string;
  applicant_name: string;
}

const STATUS_LABEL: Record<OwnerApplicationRow['status'], string> = {
  pending: '審査中',
  approved: '承認済み',
  rejected: '却下済み',
};

export function OwnerApplicationsPage() {
  const [applications, setApplications] = useState<AppWithMeta[]>([]);
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('owner_applications')
      .select('*, onsens(name), profiles(display_name)')
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setApplications(
      (data ?? []).map((row: any) => ({
        ...row,
        onsen_name: row.onsens?.name ?? '(不明な施設)',
        applicant_name: row.profiles?.display_name ?? '(不明なユーザー)',
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () => (filter === 'all' ? applications : applications.filter((a) => a.status === filter)),
    [applications, filter],
  );

  const approve = async (app: AppWithMeta) => {
    setBusyId(app.id);
    const { error } = await supabase.rpc('approve_owner_application', { p_application_id: app.id });
    setBusyId(null);
    if (error) {
      alert(error.message);
      return;
    }
    load();
  };

  const reject = async (app: AppWithMeta) => {
    setBusyId(app.id);
    const { error } = await supabase.rpc('reject_owner_application', { p_application_id: app.id });
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
        <h2>オーナー申請</h2>
      </div>

      <div className="filter-row">
        {(['pending', 'approved', 'rejected', 'all'] as StatusFilter[]).map((f) => (
          <button key={f} className="chip-toggle" data-active={filter === f} onClick={() => setFilter(f)}>
            {f === 'all' ? 'すべて' : STATUS_LABEL[f as OwnerApplicationRow['status']]}
            {f === 'pending' ? `（${applications.filter((a) => a.status === 'pending').length}）` : ''}
          </button>
        ))}
      </div>

      {error ? <p className="error-text">{error}</p> : null}
      {loading ? (
        <p className="muted">読み込み中…</p>
      ) : filtered.length === 0 ? (
        <p className="muted">該当する申請はありません。</p>
      ) : (
        <div className="review-list">
          {filtered.map((a) => (
            <div key={a.id} className="review-card">
              <div className="review-card-header">
                <span>
                  <strong>{a.onsen_name}</strong> ・ 申請者: {a.applicant_name}
                </span>
                <span className={`status-badge status-${a.status === 'approved' ? 'visible' : a.status === 'rejected' ? 'removed' : 'pending'}`}>
                  {STATUS_LABEL[a.status]}
                </span>
              </div>
              {a.message ? <p className="review-comment">{a.message}</p> : <p className="muted">（メッセージなし）</p>}
              <div className="review-card-footer">
                <span className="muted">{new Date(a.created_at).toLocaleString('ja-JP')}</span>
                {a.status === 'pending' ? (
                  <div className="row-actions">
                    <button className="link-button" disabled={busyId === a.id} onClick={() => approve(a)}>
                      承認する
                    </button>
                    <button className="link-button danger" disabled={busyId === a.id} onClick={() => reject(a)}>
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
