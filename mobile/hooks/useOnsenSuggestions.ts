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
      const { error } = await supabase.from('onsen_edit_suggestions').insert({
        onsen_id: onsenId,
        user_id: session.user.id,
        proposed_changes: changes,
        note: note.trim() || null,
      });
      return { error: error?.message ?? null };
    },
    [onsenId, session],
  );

  const submitOwnerApplication = useCallback(
    async (message: string) => {
      if (!isSupabaseConfigured || !supabase || !session) return { error: 'ログインが必要です' };
      const { error } = await supabase.from('owner_applications').insert({
        onsen_id: onsenId,
        user_id: session.user.id,
        message: message.trim() || null,
      });
      return { error: error?.message ?? null };
    },
    [onsenId, session],
  );

  return { submitEditSuggestion, submitOwnerApplication, isAvailable: isSupabaseConfigured };
}
