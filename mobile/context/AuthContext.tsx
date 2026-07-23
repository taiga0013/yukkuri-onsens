import { GoogleSignin } from '@react-native-google-signin/google-signin';
import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { ProfileRow } from '../types/database';

interface AuthContextValue {
  isMock: boolean;
  loading: boolean;
  session: Session | null;
  profile: ProfileRow | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const MOCK_PROFILE: ProfileRow = {
  id: 'mock-user',
  display_name: '湯めぐりユーザー',
  avatar_url: null,
  gender: 'unspecified',
  gender_prompted: true,
  role: 'user',
  gps_enabled: true,
  notifications_enabled: true,
  expo_push_token: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

let googleConfigured = false;
function ensureGoogleConfigured() {
  if (googleConfigured) return;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!webClientId) return;
  GoogleSignin.configure({ webClientId, offlineAccess: false });
  googleConfigured = true;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(isSupabaseConfigured ? null : MOCK_PROFILE);

  const fetchProfile = async (userId: string) => {
    if (!supabase) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile((data as ProfileRow) ?? null);
  };

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) fetchProfile(data.session.user.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) fetchProfile(newSession.user.id);
      else setProfile(null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabaseが未設定のためログインできません（SETUP.md参照）');
    }

    // Web版: ネイティブGoogleサインインSDKが使えないため、Supabaseの
    // OAuthリダイレクトフローを使う（ブラウザがGoogleの同意画面へ遷移する）。
    if (Platform.OS === 'web') {
      const origin = (globalThis as any).location?.origin;
      const redirectTo = origin ? `${origin}/auth/callback` : undefined;
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
      if (error) throw error;
      return;
    }

    ensureGoogleConfigured();
    if (!googleConfigured) {
      throw new Error('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID が未設定です（SETUP.md参照）');
    }

    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices();
    }
    const result = await GoogleSignin.signIn();
    const idToken = (result as any).data?.idToken ?? (result as any).idToken;
    if (!idToken) throw new Error('Googleサインインからid_tokenを取得できませんでした');

    const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
    if (error) throw error;
  };

  const signOut = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    await supabase.auth.signOut();
    if (Platform.OS === 'web') return;
    try {
      await GoogleSignin.signOut();
    } catch {
      // ネイティブGoogleセッションが無い場合は無視
    }
  };

  const refreshProfile = async () => {
    if (session) await fetchProfile(session.user.id);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      isMock: !isSupabaseConfigured,
      loading,
      session,
      profile,
      signInWithGoogle,
      signOut,
      refreshProfile,
    }),
    [loading, session, profile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
