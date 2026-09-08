export const TIME_CONTROLS = [
  { id: 'untimed', initialMs: null, incrementMs: 0, labelKey: 'match.timeControls.untimed', compact: '∞' },
  { id: 'rapid10', initialMs: 10 * 60_000, incrementMs: 0, labelKey: 'match.timeControls.rapid10', compact: '10+0' },
  { id: 'blitz5', initialMs: 5 * 60_000, incrementMs: 3_000, labelKey: 'match.timeControls.blitz5', compact: '5+3' },
  { id: 'blitz3', initialMs: 3 * 60_000, incrementMs: 2_000, labelKey: 'match.timeControls.blitz3', compact: '3+2' },
] as const;

export type TimeControlId = (typeof TIME_CONTROLS)[number]['id'];
export type TimeControl = (typeof TIME_CONTROLS)[number];

export const DEFAULT_TIME_CONTROL: TimeControlId = 'untimed';
export const TIME_CONTROL_STORAGE_KEY = 'chessy-time-control-v1';

export function getTimeControl(id: TimeControlId): TimeControl {
  return TIME_CONTROLS.find((control) => control.id === id) ?? TIME_CONTROLS[0];
}

export function isTimeControlId(value: string | null): value is TimeControlId {
  return TIME_CONTROLS.some((control) => control.id === value);
}

export function formatClock(milliseconds: number | null) {
  if (milliseconds === null) return '∞';
  const safe = Math.max(0, milliseconds);
  const totalSeconds = Math.ceil(safe / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (safe < 10_000) {
    const tenths = Math.floor((safe % 1000) / 100);
    return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
