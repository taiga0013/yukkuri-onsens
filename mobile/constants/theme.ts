import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { createElement } from 'react';

export type ColorScheme = 'light' | 'dark';
export type ThemeOverride = 'system' | ColorScheme;

const dark = {
  bg: '#0d1b2a',
  bgRaised: '#14263a',
  bgInset: '#0a1520',
  bgOverlay: 'rgba(6, 12, 20, 0.72)',
  ink: '#f1ead9',
  inkDim: 'rgba(241, 234, 217, 0.66)',
  inkFaint: 'rgba(241, 234, 217, 0.40)',
  accent: '#c9a668',
  accentStrong: '#e6c48a',
  onAccent: '#0d1b2a',
  rule: 'rgba(241, 234, 217, 0.14)',
  ruleStrong: 'rgba(241, 234, 217, 0.24)',
  tabBarBg: '#0a1622',
  danger: '#e0524f',
} as const;

const light = {
  bg: '#f7f1e3',
  bgRaised: '#ffffff',
  bgInset: '#efe4cd',
  bgOverlay: 'rgba(30, 22, 10, 0.4)',
  ink: '#1d2b3a',
  inkDim: 'rgba(29, 43, 58, 0.68)',
  inkFaint: 'rgba(29, 43, 58, 0.44)',
  accent: '#94672f',
  accentStrong: '#7a531f',
  onAccent: '#fff8ec',
  rule: 'rgba(29, 43, 58, 0.14)',
  ruleStrong: 'rgba(29, 43, 58, 0.24)',
  tabBarBg: '#ffffff',
  danger: '#c23b38',
} as const;

// 混雑度セマンティックカラー（spec.md準拠、両テーマ共通）
export const congestion = {
  empty: '#27AE60',
  normal: '#2980B9',
  busy: '#E67E22',
} as const;

export const palettes = { dark, light };

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;

export const type = {
  display: 28,
  h1: 22,
  h2: 18,
  body: 15,
  small: 13,
  caption: 11,
} as const;

interface ThemeContextValue {
  override: ThemeOverride;
  setOverride: (o: ThemeOverride) => void;
}

const ThemeSettingsContext = createContext<ThemeContextValue | null>(null);

// マイページの「ダークモード」トグルでOS設定を上書きできるようにするプロバイダ。
export function ThemeSettingsProvider({ children }: { children: ReactNode }) {
  const [override, setOverride] = useState<ThemeOverride>('system');
  const value = useMemo(() => ({ override, setOverride }), [override]);
  return createElement(ThemeSettingsContext.Provider, { value }, children);
}

export function useThemeSettings() {
  const ctx = useContext(ThemeSettingsContext);
  if (!ctx) throw new Error('useThemeSettings must be used within ThemeSettingsProvider');
  return ctx;
}

export function useTheme() {
  const systemScheme = useColorScheme();
  const ctx = useContext(ThemeSettingsContext);
  const override = ctx?.override ?? 'system';
  const scheme: ColorScheme = override === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : override;
  const colors = palettes[scheme];
  return { colors, congestion, spacing, radius, type, scheme };
}
