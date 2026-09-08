import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ANALYTICS_CONSENT_STORAGE_KEY, readAnalyticsConsent, sanitizeAnalyticsParams, writeAnalyticsConsent } from '../src/analytics/privacy';
import { readFirebaseClientConfig } from '../src/auth/config';

describe('Chessy analytics privacy boundary', () => {
  const values = new Map<string,string>();
  beforeAll(() => Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key:string) => values.get(key) ?? null,
    setItem: (key:string, value:string) => { values.set(key, String(value)); },
    removeItem: (key:string) => { values.delete(key); },
    clear: () => values.clear(),
  }}));
  beforeEach(() => localStorage.clear());

  it('defaults to no analytics consent and persists explicit choice only', () => {
    expect(readAnalyticsConsent()).toBe(false);
    writeAnalyticsConsent(true);
    expect(localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY)).toBe('granted');
    expect(readAnalyticsConsent()).toBe(true);
    writeAnalyticsConsent(false);
    expect(localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY)).toBe('denied');
    expect(readAnalyticsConsent()).toBe(false);
  });

  it('drops chess content, identity fields, free text, and unknown parameters', () => {
    expect(sanitizeAnalyticsParams('game_start', {
      opponent: 'stockfish', difficulty: 'medium', player_color: 'white', time_control: 'blitz3',
      fen: 'rnbqkbnr', pgn: '1. e4', move: 'e2e4', email: 'user@example.com', display_name: 'Player', note: 'free text',
    })).toEqual({ opponent: 'stockfish', difficulty: 'medium', player_color: 'white', time_control: 'blitz3' });
    expect(sanitizeAnalyticsParams('puzzle_complete', {
      mode: 'practice', category: 'fork', level: 'easy', assisted: false, mistake_count: 2, answer: 'g1g8', puzzle_id: 'private-id',
    })).toEqual({ mode: 'practice', category: 'fork', level: 'easy', assisted: false, mistake_count: 2 });
  });

  it('rejects unsafe free-form strings even on allowed parameter names', () => {
    expect(sanitizeAnalyticsParams('settings_changed', { setting: 'theme', value: 'forest<script>' })).toEqual({ setting: 'theme' });
    expect(sanitizeAnalyticsParams('screen_view', { screen_name: 'play' })).toEqual({ screen_name: 'play' });
  });
});

describe('Firebase analytics web configuration', () => {
  it('accepts measurementId as optional public web config', () => {
    const config = readFirebaseClientConfig({
      VITE_FIREBASE_API_KEY: 'key',
      VITE_FIREBASE_AUTH_DOMAIN: 'chessy.firebaseapp.com',
      VITE_FIREBASE_PROJECT_ID: 'chessy-prod',
      VITE_FIREBASE_APP_ID: '1:123:web:abc',
      VITE_FIREBASE_MEASUREMENT_ID: ' G-ABC123 ',
    });
    expect(config?.measurementId).toBe('G-ABC123');
  });
});
