import { useEffect, useMemo, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { OnsenRow, ProfileRow } from '../types/database';

interface LinkRow {
  owner_id: string;
  onsen_id: string;
  created_at: string;
  owner_name: string;
  onsen_name: string;
}

export function OwnerLinksPage() {
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [onsens, setOnsens] = useState<OnsenRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const [newOwnerId, setNewOwnerId] = useState('');
  const [newOnsenId, setNewOnsenId] = useState('');
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);

    const [{ data: linkData, error: linkError }, { data: onsenData }, { data: profileData }] = await Promise.all([
      supabase.from('owner_onsen_links').select('*, profiles(display_name), onsens(name)').order('created_at', { ascending: false }),
      supabase.from('onsens').select('*').order('area_name'),
      supabase.from('profiles').select('*').order('display_name'),
    ]);

    if (linkError) {
      setError(linkError.message);
      setLoading(false);
      return;
    }

    setLinks(
      (linkData ?? []).map((row: any) => ({
        owner_id: row.owner_id,
        onsen_id: row.onsen_id,
        created_at: row.created_at,
        owner_name: row.profiles?.display_name ?? '(不明なユーザー)',
        onsen_name: row.onsens?.name ?? '(不明な施設)',
      })),
    );
    setOnsens((onsenData as OnsenRow[]) ?? []);
    setProfiles((profileData as ProfileRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const ownerCandidates = useMemo(() => profiles.filter((p) => p.role !== 'admin'), [profiles]);

  const removeLink = async (link: LinkRow) => {
    if (!confirm(`「${link.owner_name}」から「${link.onsen_name}」の担当を解除しますか？`)) return;
    const key = `${link.owner_id}-${link.onsen_id}`;
    setBusyKey(key);
    const { error } = await supabase
      .from('owner_onsen_links')
      .delete()
      .eq('owner_id', link.owner_id)
      .eq('onsen_id', link.onsen_id);
    setBusyKey(null);
    if (error) {
      alert(error.message);
      return;
    }
    load();
  };

  const addLink = async () => {
    if (!newOwnerId || !newOnsenId) return;
    setAdding(true);

    const { error: linkError } = await supabase
      .from('owner_onsen_links')
      .insert({ owner_id: newOwnerId, onsen_id: newOnsenId });
    if (linkError) {
      setAdding(false);
      alert(linkError.message);
      return;
    }

    const owner = profiles.find((p) => p.id === newOwnerId);
    if (owner && owner.role === 'user') {
      await supabase.from('profiles').update({ role: 'owner' }).eq('id', newOwnerId);
    }

    setAdding(false);
    setNewOwnerId('');
    setNewOnsenId('');
    load();
  };

  return (
    <div>
      <div className="page-header">
        <h2>オーナー管理</h2>
      </div>

      <div className="onsen-form" style={{ maxWidth: 520, marginBottom: 24 }}>
        <fieldset>
          <legend>オーナーを手動で割り当てる</legend>
          <label>
            ユーザー
            <select value={newOwnerId} onChange={(e) => setNewOwnerId(e.target.value)}>
              <option value="">選択してください</option>
              {ownerCandidates.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name}（{p.role}）
                </option>
              ))}
            </select>
          </label>
          <label>
            担当施設
            <select value={newOnsenId} onChange={(e) => setNewOnsenId(e.target.value)}>
              <option value="">選択してください</option>
              {onsens.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <div className="form-actions">
            <button className="primary-button" disabled={adding || !newOwnerId || !newOnsenId} onClick={addLink}>
              {adding ? '追加中…' : '割り当てる'}
            </button>
          </div>
        </fieldset>
      </div>

      {error ? <p className="error-text">{error}</p> : null}
      {loading ? (
        <p className="muted">読み込み中…</p>
      ) : links.length === 0 ? (
        <p className="muted">オーナー登録されている施設はまだありません。</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>オーナー</th>
                <th>担当施設</th>
                <th>登録日</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {links.map((l) => (
                <tr key={`${l.owner_id}-${l.onsen_id}`}>
                  <td>{l.owner_name}</td>
                  <td>{l.onsen_name}</td>
                  <td>{new Date(l.created_at).toLocaleDateString('ja-JP')}</td>
                  <td>
                    <button
                      className="link-button danger"
                      disabled={busyKey === `${l.owner_id}-${l.onsen_id}`}
                      onClick={() => removeLink(l)}
                    >
                      解除
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
