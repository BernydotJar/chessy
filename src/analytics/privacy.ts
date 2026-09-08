import type { AnalyticsEventName, AnalyticsParams } from './types';

export const ANALYTICS_CONSENT_STORAGE_KEY = 'chessy-analytics-consent-v1';

const ALLOWED_PARAMS: Record<AnalyticsEventName, readonly string[]> = {
  screen_view: ['screen_name'],
  game_start: ['opponent', 'difficulty', 'player_color', 'time_control'],
  game_complete: ['opponent', 'difficulty', 'result', 'move_count', 'end_reason', 'time_control'],
  puzzle_start: ['mode', 'category', 'level'],
  puzzle_complete: ['mode', 'category', 'level', 'assisted', 'mistake_count'],
  lesson_complete: ['track', 'level'],
  auth_success: ['provider', 'method'],
  progress_sync_result: ['result'],
  settings_changed: ['setting', 'value'],
};

const safeString = (value: string) => /^[a-z0-9_-]{1,40}$/i.test(value);

export function sanitizeAnalyticsParams(name: AnalyticsEventName, params: AnalyticsParams = {}): AnalyticsParams {
  const allowed = new Set(ALLOWED_PARAMS[name]);
  const clean: AnalyticsParams = {};
  for (const [key, value] of Object.entries(params)) {
    if (!allowed.has(key)) continue;
    if (typeof value === 'string') {
      if (safeString(value)) clean[key] = value;
      continue;
    }
    if (typeof value === 'number' && Number.isFinite(value)) clean[key] = value;
    if (typeof value === 'boolean') clean[key] = value;
  }
  return clean;
}

export function readAnalyticsConsent(): boolean {
  try { return localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY) === 'granted'; }
  catch { return false; }
}

export function writeAnalyticsConsent(enabled: boolean) {
  try { localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, enabled ? 'granted' : 'denied'); }
  catch { /* local preference is best effort */ }
}
