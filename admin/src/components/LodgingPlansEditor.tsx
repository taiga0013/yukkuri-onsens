import { useEffect, useRef, useState } from 'react';

import { supabase } from '../lib/supabase';
import { uploadLodgingPlanPhoto } from '../lib/photoUpload';
import type { LodgingPlanRow } from '../types/database';

const PEOPLE_COUNT_FIELDS = [
  { key: 'price_per_person_1', label: '1名利用時（円/人）' },
  { key: 'price_per_person_2', label: '2名利用時（円/人）' },
  { key: 'price_per_person_3', label: '3名利用時（円/人）' },
  { key: 'price_per_person_4', label: '4名以上利用時（円/人）' },
] as const;

export function LodgingPlansEditor({ onsenId }: { onsenId: string }) {
  const [plans, setPlans] = useState<LodgingPlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('lodging_plans')
      .select('*')
      .eq('onsen_id', onsenId)
      .order('created_at', { ascending: true });
    if (error) {
      setError(error.message);
    } else {
      setPlans((data as LodgingPlanRow[]) ?? []);
      setError(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [onsenId]);

  const updatePlan = <K extends keyof LodgingPlanRow>(id: string, key: K, value: LodgingPlanRow[K]) => {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, [key]: value } : p)));
  };

  const addPlan = async () => {
    const { error } = await supabase
      .from('lodging_plans')
      .insert({ onsen_id: onsenId, name: '新しいプラン' });
    if (error) {
      setError(error.message);
      return;
    }
    load();
  };

  const savePlan = async (plan: LodgingPlanRow) => {
    setSavingId(plan.id);
    const { error } = await supabase
      .from('lodging_plans')
      .update({
        name: plan.name,
        meal_info: plan.meal_info,
        payment_method: plan.payment_method,
        price_per_person_1: plan.price_per_person_1,
        price_per_person_2: plan.price_per_person_2,
        price_per_person_3: plan.price_per_person_3,
        price_per_person_4: plan.price_per_person_4,
        photos: plan.photos,
      })
      .eq('id', plan.id);
    setSavingId(null);
    if (error) {
      setError(error.message);
      return;
    }
    load();
  };

  const deletePlan = async (id: string) => {
    if (!confirm('この宿泊プランを削除しますか？')) return;
    const { error } = await supabase.from('lodging_plans').delete().eq('id', id);
    if (error) {
      setError(error.message);
      return;
    }
    load();
  };

  const onFilesSelected = async (plan: LodgingPlanRow, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingId(plan.id);
    let photos = plan.photos;
    for (const file of Array.from(files)) {
      const { url, error } = await uploadLodgingPlanPhoto(onsenId, file);
      if (error) {
        alert(`${file.name}: ${error}`);
        continue;
      }
      if (url) photos = [...photos, url];
    }
    updatePlan(plan.id, 'photos', photos);
    setUploadingId(null);
    const input = fileInputRefs.current[plan.id];
    if (input) input.value = '';
  };

  const removePhoto = (plan: LodgingPlanRow, url: string) => {
    updatePlan(
      plan.id,
      'photos',
      plan.photos.filter((p) => p !== url),
    );
  };

  return (
    <fieldset>
      <legend>宿泊プラン</legend>
      {error ? <p className="error-text">{error}</p> : null}
      {loading ? (
        <p className="muted">読み込み中…</p>
      ) : plans.length === 0 ? (
        <p className="muted">宿泊プランはまだ登録されていません。</p>
      ) : (
        <div className="review-list">
          {plans.map((plan) => (
            <div key={plan.id} className="review-card">
              <label>
                プラン名
                <input value={plan.name} onChange={(e) => updatePlan(plan.id, 'name', e.target.value)} />
              </label>
              <label>
                食事内容
                <input
                  value={plan.meal_info ?? ''}
                  onChange={(e) => updatePlan(plan.id, 'meal_info', e.target.value)}
                  placeholder="夕食・朝食付き（会席料理）"
                />
              </label>
              <label>
                決済方法
                <input
                  value={plan.payment_method ?? ''}
                  onChange={(e) => updatePlan(plan.id, 'payment_method', e.target.value)}
                  placeholder="現金・クレジットカード可"
                />
              </label>
              <div className="form-row">
                {PEOPLE_COUNT_FIELDS.map((f) => (
                  <label key={f.key}>
                    {f.label}
                    <input
                      type="number"
                      value={plan[f.key] ?? ''}
                      onChange={(e) =>
                        updatePlan(plan.id, f.key, e.target.value === '' ? null : Number(e.target.value))
                      }
                    />
                  </label>
                ))}
              </div>
              <label>
                写真
                <div className="photo-grid">
                  {plan.photos.map((url) => (
                    <div key={url} className="photo-thumb">
                      <img src={url} alt="" />
                      <button type="button" className="photo-remove" onClick={() => removePhoto(plan, url)}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <input
                  ref={(el) => {
                    fileInputRefs.current[plan.id] = el;
                  }}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => onFilesSelected(plan, e.target.files)}
                  disabled={uploadingId === plan.id}
                />
                {uploadingId === plan.id ? (
                  <span className="muted">アップロード中…（最大1280px・品質80%に自動圧縮しています）</span>
                ) : null}
              </label>
              <div className="row-actions">
                <button
                  type="button"
                  className="primary-button"
                  disabled={savingId === plan.id}
                  onClick={() => savePlan(plan)}
                >
                  {savingId === plan.id ? '保存中…' : 'プランを保存'}
                </button>
                <button type="button" className="link-button danger" onClick={() => deletePlan(plan.id)}>
                  削除する
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <button type="button" onClick={addPlan}>
        + プランを追加
      </button>
    </fieldset>
  );
}
