import { useCallback } from 'react';

import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export interface EditSuggestionFields {
  hours?: string;
  price_adult?: number;
  price_child?: number;
  phone?: string;
  website?: string;
  regular_holiday?: string;
}

export function useOnsenSuggestions(onsenId: string) {
  const { session } = useAuth();

  const submitEditSuggestion = useCallback(
    async (changes: EditSuggestionFields, note: string) => {
      if (!isSupabaseConfigured || !supabase || !session) return { error: 'ログインが必要です' };
      const { data, error } = await supabase
        .from('onsen_edit_suggestions')
        .insert({
          onsen_id: onsenId,
          user_id: session.user.id,
          proposed_changes: changes,
          note: note.trim() || null,
        })
        .select('id')
        .single();
      if (error) return { error: error.message };

      // AIが現在の情報が本当に間違っているかを判断し、間違っていれば自動的に反映する。
      // 判断できない場合（鍵未設定など）はpendingのまま管理者の手動確認に委ねる。
      supabase.functions.invoke('evaluate-edit-suggestion', { body: { suggestion_id: data.id } }).catch(() => {});

      return { error: null };
    },
    [onsenId, session],
  );

  return { submitEditSuggestion, isAvailable: isSupabaseConfigured };
}
