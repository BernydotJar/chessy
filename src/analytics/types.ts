export type AnalyticsEventName =
  | 'screen_view'
  | 'game_start'
  | 'game_complete'
  | 'puzzle_start'
  | 'puzzle_complete'
  | 'lesson_complete'
  | 'auth_success'
  | 'progress_sync_result'
  | 'settings_changed';

export type AnalyticsValue = string | number | boolean;
export type AnalyticsParams = Record<string, AnalyticsValue>;

export interface AnalyticsAdapter {
  setEnabled(enabled: boolean): void;
  track(name: AnalyticsEventName, params?: AnalyticsParams): void;
}

export type AnalyticsStatus = 'disabled' | 'initializing' | 'ready' | 'unavailable';
