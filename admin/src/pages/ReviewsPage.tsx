import { useEffect, useMemo, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { ReviewRow } from '../types/database';

type StatusFilter = 'pending' | 'visible' | 'removed' | 'all';

interface ReviewWithMeta extends ReviewRow {
  onsen_name: string;
  report_count: number;
}

const STATUS_LABEL: Record<ReviewRow['status'], string> = {
  visible: '公開中',
  pending: '審査中',
  removed: '削除済み',
};

export function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewWithMeta[]>([]);
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    const [{ data: reviewData, error: reviewError }, { data: reportData, error: reportError }] = await Promise.all([
      supabase.from('reviews').select('*, onsens(name)').order('created_at', { ascending: false }),
      supabase.from('review_reports').select('review_id'),
    ]);

    if (reviewError || reportError) {
      setError(reviewError?.message ?? reportError?.message ?? '読み込みに失敗しました');
      setLoading(false);
      return;
    }

    const reportCounts = new Map<string, number>();
    for (const r of reportData ?? []) {
      const key = r.review_id as string;
      reportCounts.set(key, (reportCounts.get(key) ?? 0) + 1);
    }

    const merged: ReviewWithMeta[] = (reviewData ?? []).map((row: any) => ({
      ...row,
      onsen_name: row.onsens?.name ?? '(不明な施設)',
      report_count: reportCounts.get(row.id) ?? 0,
    }));

    setReviews(merged);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () => (filter === 'all' ? reviews : reviews.filter((r) => r.status === filter)),
    [reviews, filter],
  );

  const updateStatus = async (review: ReviewWithMeta, status: ReviewRow['status']) => {
    const { error } = await supabase.from('reviews').update({ status }).eq('id', review.id);
    if (error) {
      alert(error.message);
      return;
    }
    load();
  };

  return (
    <div>
      <div className="page-header">
        <h2>レビュー管理</h2>
      </div>

      <div className="filter-row">
        {(['pending', 'visible', 'removed', 'all'] as StatusFilter[]).map((f) => (
          <button key={f} className="chip-toggle" data-active={filter === f} onClick={() => setFilter(f)}>
            {f === 'all' ? 'すべて' : STATUS_LABEL[f as ReviewRow['status']]}
            {f === 'pending' ? `（${reviews.filter((r) => r.status === 'pending').length}）` : ''}
          </button>
        ))}
      </div>

      {error ? <p className="error-text">{error}</p> : null}
      {loading ? (
        <p className="muted">読み込み中…</p>
      ) : filtered.length === 0 ? (
        <p className="muted">該当するレビューはありません。</p>
      ) : (
        <div className="review-list">
          {filtered.map((r) => (
            <div key={r.id} className="review-card">
              <div className="review-card-header">
                <span>
                  <strong>{r.onsen_name}</strong> ・ {'★'.repeat(r.rating)}
                  {'☆'.repeat(5 - r.rating)}
                </span>
                <span className={`status-badge status-${r.status}`}>{STATUS_LABEL[r.status]}</span>
              </div>
              <p className="review-comment">{r.comment}</p>
              <div className="review-card-footer">
                <span className="muted">
                  {new Date(r.created_at).toLocaleString('ja-JP')} ・ 通報 {r.report_count}件
                </span>
                <div className="row-actions">
                  {r.status !== 'visible' ? (
                    <button className="link-button" onClick={() => updateStatus(r, 'visible')}>
                      公開する
                    </button>
                  ) : null}
                  {r.status !== 'removed' ? (
                    <button className="link-button danger" onClick={() => updateStatus(r, 'removed')}>
                      削除する
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
