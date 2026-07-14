import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { supabase } from '../lib/supabase';
import { uploadOnsenPhoto } from '../lib/photoUpload';
import type { OnsenFormValues, OnsenRow } from '../types/database';

const emptyForm: OnsenFormValues = {
  name: '',
  area_name: '',
  prefecture: '新潟県',
  city: '',
  area: '',
  address: '',
  region: '下越',
  latitude: 0,
  longitude: 0,
  hours: '',
  rotenburo: false,
  sauna: false,
  restaurant: false,
  parking: false,
  description: '',
  components: '',
  effects: '',
  price_adult: 0,
  price_child: 0,
  price_child_condition: '',
  capacity_total: 0,
  capacity_male: 0,
  capacity_female: 0,
  phone: '',
  website: '',
  regular_holiday: '',
  winter_closure_start: '12-01',
  winter_closure_end: '03-31',
  winter_closure_enabled: false,
  is_temporarily_closed: false,
  photos: [],
  is_recommended: false,
};

export function OnsenFormPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();

  const [form, setForm] = useState<OnsenFormValues>(emptyForm);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const { data, error } = await supabase.from('onsens').select('*').eq('id', id).single();
      if (error) {
        setError(error.message);
      } else if (data) {
        const row = data as OnsenRow;
        const { id: _id, created_at, updated_at, ...rest } = row;
        setForm(rest);
      }
      setLoading(false);
    })();
  }, [id, isNew]);

  const set = <K extends keyof OnsenFormValues>(key: K, value: OnsenFormValues[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingPhoto(true);
    for (const file of Array.from(files)) {
      const { url, error } = await uploadOnsenPhoto(file);
      if (error) {
        alert(`${file.name}: ${error}`);
        continue;
      }
      if (url) set('photos', [...form.photos, url]);
    }
    setUploadingPhoto(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (url: string) => {
    set(
      'photos',
      form.photos.filter((p) => p !== url),
    );
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = { ...form };

    const result = isNew
      ? await supabase.from('onsens').insert(payload)
      : await supabase.from('onsens').update(payload).eq('id', id);

    setSaving(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    navigate('/onsens');
  };

  if (loading) return <p className="muted">読み込み中…</p>;

  return (
    <div>
      <h2>{isNew ? '温泉地を新規追加' : `編集: ${form.name}`}</h2>
      {error ? <p className="error-text">{error}</p> : null}

      <form className="onsen-form" onSubmit={onSubmit}>
        <fieldset>
          <legend>基本情報</legend>
          <label>
            施設名
            <input value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </label>
          <label>
            エリア名（温泉街）
            <input value={form.area_name} onChange={(e) => set('area_name', e.target.value)} required />
          </label>
          <div className="form-row">
            <label>
              都道府県
              <input value={form.prefecture} onChange={(e) => set('prefecture', e.target.value)} required />
            </label>
            <label>
              市区町村
              <input value={form.city} onChange={(e) => set('city', e.target.value)} required />
            </label>
            <label>
              地区
              <input value={form.area} onChange={(e) => set('area', e.target.value)} required />
            </label>
          </div>
          <label>
            住所（詳細画面に表示される全文）
            <input
              value={form.address ?? ''}
              onChange={(e) => set('address', e.target.value)}
              placeholder="新潟県新発田市月岡温泉123-45"
            />
          </label>
          <label>
            地域
            <select value={form.region} onChange={(e) => set('region', e.target.value as OnsenFormValues['region'])}>
              <option value="上越">上越</option>
              <option value="中越">中越</option>
              <option value="下越">下越</option>
            </select>
          </label>
          <div className="form-row">
            <label>
              緯度
              <input
                type="number"
                step="0.0001"
                value={form.latitude}
                onChange={(e) => set('latitude', Number(e.target.value))}
                required
              />
            </label>
            <label>
              経度
              <input
                type="number"
                step="0.0001"
                value={form.longitude}
                onChange={(e) => set('longitude', Number(e.target.value))}
                required
              />
            </label>
          </div>
          <label>
            運営時間
            <input value={form.hours ?? ''} onChange={(e) => set('hours', e.target.value)} placeholder="10:00〜21:00" />
          </label>
        </fieldset>

        <fieldset>
          <legend>設備</legend>
          <div className="checkbox-row">
            <label>
              <input type="checkbox" checked={form.rotenburo} onChange={(e) => set('rotenburo', e.target.checked)} /> 露天風呂
            </label>
            <label>
              <input type="checkbox" checked={form.sauna} onChange={(e) => set('sauna', e.target.checked)} /> サウナ
            </label>
            <label>
              <input type="checkbox" checked={form.restaurant} onChange={(e) => set('restaurant', e.target.checked)} /> 食事処
            </label>
            <label>
              <input type="checkbox" checked={form.parking} onChange={(e) => set('parking', e.target.checked)} /> 駐車場
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>料金・定員</legend>
          <div className="form-row">
            <label>
              大人料金（円）
              <input type="number" value={form.price_adult ?? 0} onChange={(e) => set('price_adult', Number(e.target.value))} />
            </label>
            <label>
              子供料金（円）
              <input type="number" value={form.price_child ?? 0} onChange={(e) => set('price_child', Number(e.target.value))} />
            </label>
          </div>
          <label>
            子供料金の条件
            <input
              value={form.price_child_condition ?? ''}
              onChange={(e) => set('price_child_condition', e.target.value)}
              placeholder="小学生（6〜12歳）。未就学児は無料"
            />
          </label>
          <div className="form-row">
            <label>
              定員（合計）
              <input
                type="number"
                value={form.capacity_total}
                onChange={(e) => set('capacity_total', Number(e.target.value))}
                required
              />
            </label>
            <label>
              定員（男湯）
              <input
                type="number"
                value={form.capacity_male}
                onChange={(e) => set('capacity_male', Number(e.target.value))}
                required
              />
            </label>
            <label>
              定員（女湯）
              <input
                type="number"
                value={form.capacity_female}
                onChange={(e) => set('capacity_female', Number(e.target.value))}
                required
              />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>連絡先・アクセス</legend>
          <div className="form-row">
            <label>
              電話番号
              <input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
            </label>
            <label>
              参考サイト
              <input value={form.website ?? ''} onChange={(e) => set('website', e.target.value)} />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>休業情報</legend>
          <label>
            定休日
            <input value={form.regular_holiday ?? ''} onChange={(e) => set('regular_holiday', e.target.value)} placeholder="毎週火曜日" />
          </label>
          <label>
            <input
              type="checkbox"
              checked={form.winter_closure_enabled}
              onChange={(e) => set('winter_closure_enabled', e.target.checked)}
            />{' '}
            冬季休業あり
          </label>
          {form.winter_closure_enabled ? (
            <div className="form-row">
              <label>
                開始（MM-DD）
                <input value={form.winter_closure_start ?? ''} onChange={(e) => set('winter_closure_start', e.target.value)} />
              </label>
              <label>
                終了（MM-DD）
                <input value={form.winter_closure_end ?? ''} onChange={(e) => set('winter_closure_end', e.target.value)} />
              </label>
            </div>
          ) : null}
          <label>
            <input
              type="checkbox"
              checked={form.is_temporarily_closed}
              onChange={(e) => set('is_temporarily_closed', e.target.checked)}
            />{' '}
            現在臨時休業中
          </label>
          <label>
            <input type="checkbox" checked={form.is_recommended} onChange={(e) => set('is_recommended', e.target.checked)} />{' '}
            ホーム画面の「おすすめ」に表示する
          </label>
        </fieldset>

        <fieldset>
          <legend>説明・写真</legend>
          <label>
            温泉の特徴
            <textarea value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} rows={3} />
          </label>
          <div className="form-row">
            <label>
              泉質・成分
              <input value={form.components ?? ''} onChange={(e) => set('components', e.target.value)} />
            </label>
            <label>
              効能・効果
              <input value={form.effects ?? ''} onChange={(e) => set('effects', e.target.value)} />
            </label>
          </div>
          <label>
            写真
            <div className="photo-grid">
              {form.photos.map((url) => (
                <div key={url} className="photo-thumb">
                  <img src={url} alt="" />
                  <button type="button" className="photo-remove" onClick={() => removePhoto(url)}>
                    ×
                  </button>
                </div>
              ))}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => onFilesSelected(e.target.files)}
              disabled={uploadingPhoto}
            />
            {uploadingPhoto ? <span className="muted">アップロード中…（最大1280px・品質80%に自動圧縮しています）</span> : null}
          </label>
        </fieldset>

        <div className="form-actions">
          <button type="submit" className="primary-button" disabled={saving}>
            {saving ? '保存中…' : '保存する'}
          </button>
          <button type="button" onClick={() => navigate('/onsens')}>
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
}
