import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { supabase } from '../lib/supabase';
import type { OnsenRow } from '../types/database';

export function OnsensPage() {
  const [onsens, setOnsens] = useState<OnsenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('onsens').select('*').order('area_name');
    if (error) setError(error.message);
    else setOnsens((data as OnsenRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleClosed = async (onsen: OnsenRow) => {
    const { error } = await supabase
      .from('onsens')
      .update({ is_temporarily_closed: !onsen.is_temporarily_closed })
      .eq('id', onsen.id);
    if (error) {
      alert(error.message);
      return;
    }
    load();
  };

  const toggleRecommended = async (onsen: OnsenRow) => {
    const { error } = await supabase
      .from('onsens')
      .update({ is_recommended: !onsen.is_recommended })
      .eq('id', onsen.id);
    if (error) {
      alert(error.message);
      return;
    }
    load();
  };

  const remove = async (onsen: OnsenRow) => {
    if (!confirm(`「${onsen.name}」を削除しますか？この操作は取り消せません。`)) return;
    const { error } = await supabase.from('onsens').delete().eq('id', onsen.id);
    if (error) {
      alert(error.message);
      return;
    }
    load();
  };

  return (
    <div>
      <div className="page-header">
        <h2>温泉地管理（{onsens.length}件）</h2>
        <Link to="/onsens/new" className="primary-button">
          + 新規追加
        </Link>
      </div>

      {error ? <p className="error-text">{error}</p> : null}
      {loading ? (
        <p className="muted">読み込み中…</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>施設名</th>
                <th>エリア</th>
                <th>地域</th>
                <th>おすすめ</th>
                <th>休業中</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {onsens.map((o) => (
                <tr key={o.id}>
                  <td>{o.name}</td>
                  <td>{o.area_name}</td>
                  <td>{o.region}</td>
                  <td>
                    <button className="chip-toggle" data-active={o.is_recommended} onClick={() => toggleRecommended(o)}>
                      {o.is_recommended ? 'ON' : 'OFF'}
                    </button>
                  </td>
                  <td>
                    <button className="chip-toggle" data-active={o.is_temporarily_closed} onClick={() => toggleClosed(o)}>
                      {o.is_temporarily_closed ? '休業中' : '営業中'}
                    </button>
                  </td>
                  <td className="row-actions">
                    <Link to={`/onsens/${o.id}`}>編集</Link>
                    <button className="link-button danger" onClick={() => remove(o)}>
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
