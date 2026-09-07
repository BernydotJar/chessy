import type { BoardTheme } from '../types/chess.types';

export type VisualThemeId =
  | 'forest' | 'ivory' | 'night'
  | 'guatemala' | 'colombia' | 'mexico' | 'brasil'
  | 'usa' | 'argentina' | 'espana' | 'chile';

export type ThemeCollection = 'classic' | 'country';

export interface VisualThemeTokens {
  colorScheme: 'light' | 'dark';
  bg: string;
  sidebar: string;
  surface: string;
  surface2: string;
  raised: string;
  line: string;
  lineStrong: string;
  text: string;
  muted: string;
  subtle: string;
  accent: string;
  accentStrong: string;
  accentSoft: string;
  accentInk: string;
  gold: string;
  goldSoft: string;
  focus: string;
  danger: string;
  shadowSoft: string;
  shadowDeep: string;
  iconOnAccent: string;
  boardSelected: string;
  boardLegal: string;
  boardHint: string;
  heroArt: string;
}

export interface VisualTheme {
  id: VisualThemeId;
  collection: ThemeCollection;
  countryCode?: string;
  labelKey: string;
  descriptionKey: string;
  moodKey: string;
  board: BoardTheme;
  preview: { bg: string; surface: string; light: string; dark: string; accent: string };
  signature: readonly [string, string, string];
  tokens: VisualThemeTokens;
}

export const VISUAL_THEME_STORAGE_KEY = 'chessy-visual-theme-v2';
export const DEFAULT_VISUAL_THEME: VisualThemeId = 'forest';

const forestTokens: VisualThemeTokens = {
  colorScheme: 'dark', bg: '#0b1411', sidebar: '#0d1813', surface: '#122019', surface2: '#17271e', raised: '#1b2d23',
  line: '#2b3d32', lineStrong: '#425847', text: '#f4f1e8', muted: '#9eafa2', subtle: '#75887a',
  accent: '#b9e88f', accentStrong: '#96cf70', accentSoft: '#b9e88f18', accentInk: '#112010',
  gold: '#d7a65d', goldSoft: '#d7a65d1c', focus: '#d0f7a9', danger: '#d39a72',
  shadowSoft: '0 12px 30px rgba(0,0,0,.18)', shadowDeep: '0 28px 70px rgba(0,0,0,.28)', iconOnAccent: '#102012',
  boardSelected: '#d7a65d', boardLegal: '#6ea376', boardHint: '#d7a65d', heroArt: "url('/art/forest-study.svg')",
};

const ivoryTokens: VisualThemeTokens = {
  colorScheme: 'light', bg: '#eee9de', sidebar: '#e5dfd3', surface: '#f8f4eb', surface2: '#f1ebdf', raised: '#fffaf1',
  line: '#c8c0b0', lineStrong: '#9f9685', text: '#17251e', muted: '#46564e', subtle: '#46564e',
  accent: '#345c45', accentStrong: '#284a37', accentSoft: '#345c4518', accentInk: '#fbfff9',
  gold: '#765022', goldSoft: '#76502218', focus: '#284a37', danger: '#7d4937',
  shadowSoft: '0 12px 30px rgba(63,51,35,.10)', shadowDeep: '0 28px 70px rgba(63,51,35,.16)', iconOnAccent: '#f8fff9',
  boardSelected: '#8c6738', boardLegal: '#4f725c', boardHint: '#9d7139', heroArt: "url('/art/ivory-study.svg')",
};

const nightTokens: VisualThemeTokens = {
  colorScheme: 'dark', bg: '#0b1220', sidebar: '#0e1726', surface: '#121d2d', surface2: '#172439', raised: '#1b2b43',
  line: '#2a3d57', lineStrong: '#405a7d', text: '#eff5fb', muted: '#9fb0c4', subtle: '#72869e',
  accent: '#b7d7ff', accentStrong: '#8fbff5', accentSoft: '#b7d7ff18', accentInk: '#0a1a2c',
  gold: '#d5b36a', goldSoft: '#d5b36a1a', focus: '#d6e9ff', danger: '#e19c84',
  shadowSoft: '0 12px 30px rgba(0,0,0,.22)', shadowDeep: '0 28px 70px rgba(0,0,0,.34)', iconOnAccent: '#0a1a2c',
  boardSelected: '#d5b36a', boardLegal: '#8fbff5', boardHint: '#d5b36a', heroArt: "url('/art/night-study.svg')",
};

export const VISUAL_THEMES: readonly VisualTheme[] = [
  {
    id: 'forest', collection: 'classic', labelKey: 'theme.forest', descriptionKey: 'theme.forestDescription', moodKey: 'theme.forestMood',
    board: { lightSquare: '#eee6d6', darkSquare: '#5e8273', glassOpacity: 0.08, glassBlur: 4 },
    preview: { bg: forestTokens.bg, surface: forestTokens.surface, light: '#eee6d6', dark: '#5e8273', accent: forestTokens.accent },
    signature: ['#0b1411', '#5e8273', '#b9e88f'], tokens: forestTokens,
  },
  {
    id: 'ivory', collection: 'classic', labelKey: 'theme.ivory', descriptionKey: 'theme.ivoryDescription', moodKey: 'theme.ivoryMood',
    board: { lightSquare: '#f4efe2', darkSquare: '#9aad93', glassOpacity: 0.04, glassBlur: 2 },
    preview: { bg: ivoryTokens.bg, surface: ivoryTokens.surface, light: '#f4efe2', dark: '#9aad93', accent: ivoryTokens.accent },
    signature: ['#eee9de', '#9aad93', '#345c45'], tokens: ivoryTokens,
  },
  {
    id: 'night', collection: 'classic', labelKey: 'theme.night', descriptionKey: 'theme.nightDescription', moodKey: 'theme.nightMood',
    board: { lightSquare: '#9caec4', darkSquare: '#344b68', glassOpacity: 0.07, glassBlur: 3 },
    preview: { bg: nightTokens.bg, surface: nightTokens.surface, light: '#9caec4', dark: '#344b68', accent: nightTokens.accent },
    signature: ['#0b1220', '#344b68', '#b7d7ff'], tokens: nightTokens,
  },
  {
    id: 'guatemala', collection: 'country', countryCode: 'GT', labelKey: 'theme.guatemala', descriptionKey: 'theme.guatemalaDescription', moodKey: 'theme.guatemalaMood',
    board: { lightSquare: '#eee8da', darkSquare: '#5b8fa3', glassOpacity: 0.05, glassBlur: 3 },
    preview: { bg: '#071719', surface: '#0f2827', light: '#eee8da', dark: '#5b8fa3', accent: '#81c8b4' },
    signature: ['#4997d0', '#f5f1e6', '#438f75'],
    tokens: {
      colorScheme: 'dark', bg: '#071719', sidebar: '#091d1e', surface: '#0f2827', surface2: '#153231', raised: '#193b38',
      line: '#28504b', lineStrong: '#3d6d65', text: '#f4f1e8', muted: '#a5bbb4', subtle: '#718f87', accent: '#81c8b4', accentStrong: '#62b29d', accentSoft: '#81c8b418', accentInk: '#08201a',
      gold: '#d0ad70', goldSoft: '#d0ad701c', focus: '#a9ead8', danger: '#d98e79', shadowSoft: '0 12px 30px rgba(0,0,0,.20)', shadowDeep: '0 28px 70px rgba(0,0,0,.31)', iconOnAccent: '#08201a',
      boardSelected: '#d8ad61', boardLegal: '#55a98d', boardHint: '#d8ad61', heroArt: "url('/art/guatemala-study.svg')",
    },
  },
  {
    id: 'colombia', collection: 'country', countryCode: 'CO', labelKey: 'theme.colombia', descriptionKey: 'theme.colombiaDescription', moodKey: 'theme.colombiaMood',
    board: { lightSquare: '#f2e4c4', darkSquare: '#42658f', glassOpacity: 0.05, glassBlur: 3 },
    preview: { bg: '#0c1522', surface: '#152235', light: '#f2e4c4', dark: '#42658f', accent: '#f2c94c' },
    signature: ['#f2c94c', '#284d83', '#bb5b50'],
    tokens: {
      colorScheme: 'dark', bg: '#0c1522', sidebar: '#0e1827', surface: '#152235', surface2: '#1a2a40', raised: '#20334e',
      line: '#304764', lineStrong: '#496685', text: '#f7f1e5', muted: '#adb9c7', subtle: '#77889d', accent: '#f2c94c', accentStrong: '#d9ad33', accentSoft: '#f2c94c18', accentInk: '#271f06',
      gold: '#e09d55', goldSoft: '#e09d551b', focus: '#ffe18a', danger: '#d77a66', shadowSoft: '0 12px 30px rgba(0,0,0,.22)', shadowDeep: '0 28px 70px rgba(0,0,0,.34)', iconOnAccent: '#271f06',
      boardSelected: '#d79a3b', boardLegal: '#78a382', boardHint: '#f2c94c', heroArt: "url('/art/colombia-study.svg')",
    },
  },
  {
    id: 'mexico', collection: 'country', countryCode: 'MX', labelKey: 'theme.mexico', descriptionKey: 'theme.mexicoDescription', moodKey: 'theme.mexicoMood',
    board: { lightSquare: '#efe4cf', darkSquare: '#4f816b', glassOpacity: 0.05, glassBlur: 3 },
    preview: { bg: '#0b1110', surface: '#15221d', light: '#efe4cf', dark: '#4f816b', accent: '#78c6a0' },
    signature: ['#2c7a58', '#e8dfcd', '#a55b4d'],
    tokens: {
      colorScheme: 'dark', bg: '#0b1110', sidebar: '#0e1714', surface: '#15221d', surface2: '#1b2c25', raised: '#21362d',
      line: '#314c40', lineStrong: '#4a695a', text: '#f6f0e5', muted: '#a8b9ae', subtle: '#758d7e', accent: '#78c6a0', accentStrong: '#58ad83', accentSoft: '#78c6a018', accentInk: '#0c2519',
      gold: '#d2a85e', goldSoft: '#d2a85e1b', focus: '#a8e2bf', danger: '#c86c5c', shadowSoft: '0 12px 30px rgba(0,0,0,.21)', shadowDeep: '0 28px 70px rgba(0,0,0,.32)', iconOnAccent: '#0c2519',
      boardSelected: '#c9855e', boardLegal: '#6fae8c', boardHint: '#d2a85e', heroArt: "url('/art/mexico-study.svg')",
    },
  },
  {
    id: 'brasil', collection: 'country', countryCode: 'BR', labelKey: 'theme.brasil', descriptionKey: 'theme.brasilDescription', moodKey: 'theme.brasilMood',
    board: { lightSquare: '#eee4c2', darkSquare: '#34724f', glassOpacity: 0.05, glassBlur: 3 },
    preview: { bg: '#07150e', surface: '#0f2417', light: '#eee4c2', dark: '#34724f', accent: '#e7c95b' },
    signature: ['#2f7f4f', '#e7c95b', '#4e86b3'],
    tokens: {
      colorScheme: 'dark', bg: '#07150e', sidebar: '#091a11', surface: '#0f2417', surface2: '#16301f', raised: '#1b3a26',
      line: '#2d5038', lineStrong: '#456b50', text: '#f4f0df', muted: '#a6b7a8', subtle: '#738878', accent: '#e7c95b', accentStrong: '#cfb144', accentSoft: '#e7c95b18', accentInk: '#282007',
      gold: '#d5a94e', goldSoft: '#d5a94e1b', focus: '#f8df87', danger: '#d77e66', shadowSoft: '0 12px 30px rgba(0,0,0,.21)', shadowDeep: '0 28px 70px rgba(0,0,0,.33)', iconOnAccent: '#282007',
      boardSelected: '#e0b84e', boardLegal: '#6aa884', boardHint: '#e0b84e', heroArt: "url('/art/brasil-study.svg')",
    },
  },
  {
    id: 'usa', collection: 'country', countryCode: 'US', labelKey: 'theme.usa', descriptionKey: 'theme.usaDescription', moodKey: 'theme.usaMood',
    board: { lightSquare: '#e7e4dc', darkSquare: '#4c6280', glassOpacity: 0.05, glassBlur: 3 },
    preview: { bg: '#0a1320', surface: '#141f2e', light: '#e7e4dc', dark: '#4c6280', accent: '#a8c7e7' },
    signature: ['#355b89', '#eef0ec', '#a95f55'],
    tokens: {
      colorScheme: 'dark', bg: '#0a1320', sidebar: '#0c1725', surface: '#141f2e', surface2: '#1a293a', raised: '#203246',
      line: '#30445b', lineStrong: '#4a617b', text: '#f2f3ef', muted: '#aab7c4', subtle: '#74879a', accent: '#a8c7e7', accentStrong: '#87afd7', accentSoft: '#a8c7e718', accentInk: '#0b1b2d',
      gold: '#d58a6f', goldSoft: '#d58a6f1b', focus: '#d6e8fa', danger: '#d87970', shadowSoft: '0 12px 30px rgba(0,0,0,.22)', shadowDeep: '0 28px 70px rgba(0,0,0,.34)', iconOnAccent: '#0b1b2d',
      boardSelected: '#d58a6f', boardLegal: '#74a08c', boardHint: '#d6a15f', heroArt: "url('/art/usa-study.svg')",
    },
  },
  {
    id: 'argentina', collection: 'country', countryCode: 'AR', labelKey: 'theme.argentina', descriptionKey: 'theme.argentinaDescription', moodKey: 'theme.argentinaMood',
    board: { lightSquare: '#f6f3e8', darkSquare: '#7bb0c6', glassOpacity: 0.03, glassBlur: 2 },
    preview: { bg: '#e9f1f4', surface: '#f8fbfb', light: '#f6f3e8', dark: '#7bb0c6', accent: '#245b75' },
    signature: ['#78b6d0', '#f7f4e8', '#c69a45'],
    tokens: {
      colorScheme: 'light', bg: '#e9f1f4', sidebar: '#dfeaed', surface: '#f8fbfb', surface2: '#edf4f5', raised: '#ffffff',
      line: '#bbcdd2', lineStrong: '#8eabb3', text: '#17313b', muted: '#506b75', subtle: '#465f68', accent: '#245b75', accentStrong: '#1f5067', accentSoft: '#245b7518', accentInk: '#f9ffff',
      gold: '#a9792b', goldSoft: '#a9792b18', focus: '#245f7b', danger: '#87544b', shadowSoft: '0 12px 30px rgba(36,76,89,.09)', shadowDeep: '0 28px 70px rgba(36,76,89,.15)', iconOnAccent: '#f9ffff',
      boardSelected: '#b7863a', boardLegal: '#367a75', boardHint: '#a9792b', heroArt: "url('/art/argentina-study.svg')",
    },
  },
  {
    id: 'espana', collection: 'country', countryCode: 'ES', labelKey: 'theme.espana', descriptionKey: 'theme.espanaDescription', moodKey: 'theme.espanaMood',
    board: { lightSquare: '#efe1c9', darkSquare: '#8b5a53', glassOpacity: 0.05, glassBlur: 3 },
    preview: { bg: '#170f11', surface: '#28171b', light: '#efe1c9', dark: '#8b5a53', accent: '#d7b15a' },
    signature: ['#7d3038', '#d7b15a', '#efe1c9'],
    tokens: {
      colorScheme: 'dark', bg: '#170f11', sidebar: '#1c1114', surface: '#28171b', surface2: '#321d22', raised: '#3a2328',
      line: '#57373d', lineStrong: '#765057', text: '#f7efe4', muted: '#c1aaa8', subtle: '#9a7f7e', accent: '#d7b15a', accentStrong: '#c2983f', accentSoft: '#d7b15a18', accentInk: '#281c09',
      gold: '#d7b15a', goldSoft: '#d7b15a1a', focus: '#f1d48d', danger: '#dc8275', shadowSoft: '0 12px 30px rgba(0,0,0,.22)', shadowDeep: '0 28px 70px rgba(0,0,0,.34)', iconOnAccent: '#281c09',
      boardSelected: '#d4aa52', boardLegal: '#8dad79', boardHint: '#d4aa52', heroArt: "url('/art/espana-study.svg')",
    },
  },
  {
    id: 'chile', collection: 'country', countryCode: 'CL', labelKey: 'theme.chile', descriptionKey: 'theme.chileDescription', moodKey: 'theme.chileMood',
    board: { lightSquare: '#e9e8df', darkSquare: '#547b8d', glassOpacity: 0.05, glassBlur: 3 },
    preview: { bg: '#09131c', surface: '#102230', light: '#e9e8df', dark: '#547b8d', accent: '#7fbad4' },
    signature: ['#3e7394', '#e9e8df', '#b86b55'],
    tokens: {
      colorScheme: 'dark', bg: '#09131c', sidebar: '#0b1721', surface: '#102230', surface2: '#173040', raised: '#1c3a4d',
      line: '#2c4e60', lineStrong: '#45697b', text: '#f1f5f6', muted: '#9fb3bd', subtle: '#708b98', accent: '#7fbad4', accentStrong: '#5aa0c0', accentSoft: '#7fbad418', accentInk: '#071b25',
      gold: '#c28b62', goldSoft: '#c28b621b', focus: '#b8e1f2', danger: '#d77b6d', shadowSoft: '0 12px 30px rgba(0,0,0,.22)', shadowDeep: '0 28px 70px rgba(0,0,0,.34)', iconOnAccent: '#071b25',
      boardSelected: '#c9895e', boardLegal: '#68a18d', boardHint: '#c9895e', heroArt: "url('/art/chile-study.svg')",
    },
  },
] as const;

export const CLASSIC_THEMES = VISUAL_THEMES.filter(theme => theme.collection === 'classic');
export const COUNTRY_THEMES = VISUAL_THEMES.filter(theme => theme.collection === 'country');

export function getVisualTheme(id: VisualThemeId): VisualTheme {
  return VISUAL_THEMES.find(theme => theme.id === id) ?? VISUAL_THEMES[0];
}

export function readVisualTheme(): VisualThemeId {
  try {
    const saved = localStorage.getItem(VISUAL_THEME_STORAGE_KEY);
    return VISUAL_THEMES.some(theme => theme.id === saved) ? saved as VisualThemeId : DEFAULT_VISUAL_THEME;
  } catch {
    return DEFAULT_VISUAL_THEME;
  }
}

const CSS_TOKEN_KEYS: readonly [keyof VisualThemeTokens, string][] = [
  ['bg', '--bg'], ['sidebar', '--sidebar'], ['surface', '--surface'], ['surface2', '--surface-2'], ['raised', '--raised'],
  ['line', '--line'], ['lineStrong', '--line-strong'], ['text', '--text'], ['muted', '--muted'], ['subtle', '--subtle'],
  ['accent', '--accent'], ['accentStrong', '--accent-strong'], ['accentSoft', '--accent-soft'], ['accentInk', '--accent-ink'],
  ['gold', '--gold'], ['goldSoft', '--gold-soft'], ['focus', '--focus'], ['danger', '--danger'], ['shadowSoft', '--shadow-soft'],
  ['shadowDeep', '--shadow-deep'], ['iconOnAccent', '--icon-on-accent'], ['boardSelected', '--board-selected'],
  ['boardLegal', '--board-legal'], ['boardHint', '--board-hint'], ['heroArt', '--hero-art'],
];

export function applyVisualThemeToDocument(id: VisualThemeId) {
  const theme = getVisualTheme(id);
  const root = document.documentElement;
  root.dataset.visualTheme = theme.id;
  root.style.colorScheme = theme.tokens.colorScheme;
  for (const [token, cssVariable] of CSS_TOKEN_KEYS) root.style.setProperty(cssVariable, theme.tokens[token]);
}
