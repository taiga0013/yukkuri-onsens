import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { favoriteOnsenIds } from '../constants/mockOnsen';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface FavoritesContextValue {
  favoriteIds: Set<string>;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { session, isMock } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set(isMock ? favoriteOnsenIds : []));

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !session) return;
    supabase
      .from('favorites')
      .select('onsen_id')
      .eq('user_id', session.user.id)
      .then(({ data }) => {
        if (data) setFavoriteIds(new Set(data.map((r) => r.onsen_id as string)));
      });
  }, [session]);

  const value = useMemo<FavoritesContextValue>(
    () => ({
      favoriteIds,
      isFavorite: (id: string) => favoriteIds.has(id),
      toggleFavorite: (id: string) => {
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          const willAdd = !next.has(id);
          if (willAdd) next.add(id);
          else next.delete(id);

          if (isSupabaseConfigured && supabase && session) {
            if (willAdd) {
              supabase.from('favorites').insert({ user_id: session.user.id, onsen_id: id }).then();
            } else {
              supabase.from('favorites').delete().eq('user_id', session.user.id).eq('onsen_id', id).then();
            }
          }

          return next;
        });
      },
    }),
    [favoriteIds, session],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
