import type { VisualTheme, VisualThemeTokens } from './themes';

// Offline-first palettes: no external assets, fonts, networks or runtimes.
type Palette = Omit<VisualThemeTokens, 'colorScheme' | 'accentSoft' | 'goldSoft' | 'shadowSoft' | 'shadowDeep' | 'iconOnAccent' | 'heroArt'>;
type ThemeSeed = {
  id: VisualTheme['id'];
  collection: 'country' | 'premium';
  countryCode?: string;
  mode: 'dark' | 'light';
  light: string;
  dark: string;
  signature: readonly [string, string, string];
  palette: Partial<Palette>;
};

const darkBase: Palette = {
  bg: '#10151a', sidebar: '#111b21', surface: '#1b272e', surface2: '#233139', raised: '#2c3a43',
  line: '#3a4b53', lineStrong: '#536974', text: '#f3f0e9', muted: '#b7c1be', subtle: '#889c9b',
  accent: '#d1c48f', accentStrong: '#e3d49c', accentInk: '#161b19', gold: '#e5be73',
  focus: '#f5e3ac', danger: '#e79a8b', boardSelected: '#e8ba63',
  boardLegal: '#80b4a1', boardHint: '#e8ba63',
};
const lightBase: Palette = {
  bg: '#eae9e4', sidebar: '#e1e2dd', surface: '#f8f7f2', surface2: '#f0f0e9', raised: '#ffffff',
  line: '#c4c8c0', lineStrong: '#9daaa2', text: '#17272b', muted: '#4a6266', subtle: '#5d7071',
  accent: '#315a65', accentStrong: '#234851', accentInk: '#f9fcfb', gold: '#936a32',
  focus: '#245b69', danger: '#985c52', boardSelected: '#ae873d',
  boardLegal: '#477b66', boardHint: '#ae873d',
};

function makeTheme(seed: ThemeSeed): VisualTheme {
  const palette = { ...(seed.mode === 'light' ? lightBase : darkBase), ...seed.palette };
  const darkMode = seed.mode === 'dark';
  const tokens: VisualThemeTokens = {
    ...palette,
    colorScheme: seed.mode,
    accentSoft: `${palette.accent}18`,
    goldSoft: `${palette.gold}1c`,
    shadowSoft: darkMode ? '0 12px 30px rgba(0,0,0,.22)' : '0 12px 30px rgba(40,50,45,.10)',
    shadowDeep: darkMode ? '0 28px 70px rgba(0,0,0,.34)' : '0 28px 70px rgba(40,50,45,.17)',
    iconOnAccent: palette.accentInk,
    heroArt: `url('/art/${seed.id}-study.svg')`,
  };
  return {
    id: seed.id, collection: seed.collection, countryCode: seed.countryCode,
    labelKey: `theme.${seed.id}`, descriptionKey: `theme.${seed.id}Description`, moodKey: `theme.${seed.id}Mood`,
    board: { lightSquare: seed.light, darkSquare: seed.dark, glassOpacity: darkMode ? .05 : .035, glassBlur: darkMode ? 3 : 2 },
    preview: { bg: palette.bg, surface: palette.surface, light: seed.light, dark: seed.dark, accent: palette.accent },
    signature: seed.signature, tokens,
  };
}

export const EXPANDED_THEMES: readonly VisualTheme[] = [
  makeTheme({
    id: 'peru', collection: 'country', countryCode: 'PE', mode: 'light',
    light: '#f7ebd8', dark: '#a86d5d', signature: ['#a94446', '#efe4d2', '#b58958'],
    palette: {
      bg: '#eee7dd', sidebar: '#e6dbce', surface: '#faf3e8', surface2: '#f0e7d9', raised: '#fff9f1',
      line: '#d3bcab', lineStrong: '#ae8d79', text: '#352423', muted: '#735c54', subtle: '#5d4d44',
      accent: '#8b3e3e', accentStrong: '#782f32', accentInk: '#fff7eb', gold: '#89613d',
      focus: '#8b3e3e', danger: '#a33631', boardSelected: '#bf8d3b', boardLegal: '#607f62', boardHint: '#bf8d3b',
    },
  }),
  makeTheme({
    id: 'costarica', collection: 'country', countryCode: 'CR', mode: 'dark',
    light: '#e9edda', dark: '#5d9782', signature: ['#2e765a', '#b1d9c0', '#8bb2b9'],
    palette: {
      bg: '#091916', sidebar: '#0d211c', surface: '#153129', surface2: '#1c4034', raised: '#234b3c',
      line: '#326452', lineStrong: '#4a8067', text: '#f1f7ee', muted: '#b0cfc0', subtle: '#86a99a',
      accent: '#b4e3b3', accentStrong: '#d1f0c7', accentInk: '#132817', gold: '#c2b17b',
      focus: '#ddf9d5', danger: '#e49684', boardSelected: '#d6bd72', boardLegal: '#8fd5a9', boardHint: '#d6bd72',
    },
  }),
  makeTheme({
    id: 'japon', collection: 'country', countryCode: 'JP', mode: 'light',
    light: '#f3eee5', dark: '#737f95', signature: ['#e5dfd2', '#344a69', '#af5751'],
    palette: {
      bg: '#e8e7e2', sidebar: '#e2e3e0', surface: '#f8f7f2', surface2: '#edeee9', raised: '#fffefa',
      line: '#c3c8c7', lineStrong: '#97a5ab', text: '#1a2e44', muted: '#4e6375', subtle: '#4c5e6c',
      accent: '#2d4b6c', accentStrong: '#213b57', accentInk: '#f9fbfa', gold: '#886a4f',
      focus: '#2d4b6c', danger: '#a94d4b', boardSelected: '#b15b53', boardLegal: '#427a72', boardHint: '#ad5d55',
    },
  }),
  makeTheme({
    id: 'obsidian', collection: 'premium', mode: 'dark',
    light: '#e4d6bb', dark: '#52565a', signature: ['#11161a', '#c7a878', '#8d9397'],
    palette: {
      bg: '#0c1014', sidebar: '#111417', surface: '#1a1f22', surface2: '#22292d', raised: '#2c3338',
      line: '#3d464b', lineStrong: '#626e73', text: '#f6f0e5', muted: '#bdc2c1', subtle: '#919b9d',
      accent: '#e0c392', accentStrong: '#f2d9aa', accentInk: '#292016', gold: '#e0c392',
      focus: '#ffe0ad', danger: '#da9688', boardSelected: '#e3be78', boardLegal: '#94b5a8', boardHint: '#e3be78',
    },
  }),
  makeTheme({
    id: 'porcelain', collection: 'premium', mode: 'light',
    light: '#fcf8f0', dark: '#91aaa9', signature: ['#f1eee7', '#81a5a8', '#356368'],
    palette: {
      bg: '#e9eeeb', sidebar: '#e0e7e4', surface: '#fbfcf9', surface2: '#f0f5f2', raised: '#ffffff',
      line: '#c1d1cd', lineStrong: '#98b3ac', text: '#203734', muted: '#4e6763', subtle: '#48605a',
      accent: '#225f62', accentStrong: '#174f52', accentInk: '#f6fffa', gold: '#836c4b',
      focus: '#225f62', danger: '#9c5d50', boardSelected: '#aa7f4b', boardLegal: '#447c70', boardHint: '#aa7f4b',
    },
  }),
  makeTheme({
    id: 'midnight', collection: 'premium', mode: 'dark',
    light: '#c4cad6', dark: '#394a72', signature: ['#101629', '#6979b0', '#d1d5e5'],
    palette: {
      bg: '#0b1020', sidebar: '#10172b', surface: '#19233b', surface2: '#202d48', raised: '#293654',
      line: '#344562', lineStrong: '#506888', text: '#f1f3fb', muted: '#adbdd6', subtle: '#8295b4',
      accent: '#c9d7f8', accentStrong: '#e4eafb', accentInk: '#162039', gold: '#d8b57b',
      focus: '#f1e5f9', danger: '#e9a4a1', boardSelected: '#d8b57b', boardLegal: '#8db9ad', boardHint: '#d8b57b',
    },
  }),
  makeTheme({
    id: 'walnut', collection: 'premium', mode: 'dark',
    light: '#f0dcc0', dark: '#805d48', signature: ['#251915', '#9e7054', '#c6a47a'],
    palette: {
      bg: '#1c1411', sidebar: '#231914', surface: '#30221b', surface2: '#3c2c22', raised: '#48352a',
      line: '#634c3e', lineStrong: '#886c59', text: '#f6eee1', muted: '#d0b9a7', subtle: '#b39b86',
      accent: '#edcd9e', accentStrong: '#f6dcb1', accentInk: '#35251a', gold: '#edcd9e',
      focus: '#ffdfac', danger: '#e5a28a', boardSelected: '#dbaa69', boardLegal: '#b3bb88', boardHint: '#dbaa69',
    },
  }),
];
