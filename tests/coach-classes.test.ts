import { describe, expect, it } from 'vitest';
import {
  MAX_COACH_UPLOAD_BYTES, normalizeCoachInput, parseCoachSession,
  recordingPath, safeMeetingUrl, safeStartAt, validRecording,
  type CoachSessionInput,
} from '../src/coach/model';
import { LESSONS } from '../src/learning/curriculum';
import { lessonFromHash } from '../src/learning/lessonNavigation';

const base = (overrides: Partial<CoachSessionInput> = {}): CoachSessionInput => ({
  title: 'Aprender las aperturas',
  description: 'Ejemplos sobre el tablero',
  kind: 'live',
  language: 'es',
  startsAt: '2026-10-15T18:30:00.000Z',
  meetingUrl: 'https://meet.google.com/abc-defg-hij',
  videoPath: null,
  relatedLessonId: LESSONS[0].id,
  ...overrides,
});

describe('coach session creation and publishing integrity', () => {
  it('publishes an authorized live session with a real timestamp and meeting URL', () => {
    expect(normalizeCoachInput(base(), true)).toMatchObject({
      kind: 'live', language: 'es', meetingUrl: 'https://meet.google.com/abc-defg-hij',
    });
  });
  it('denies spoofed meeting providers and unsafe URL schemes', () => {
    for (const value of [
      'http://meet.google.com/abc', 'https://meet.google.com.evil.test/call',
      'https://zoom.us.evil.com/j/123', 'javascript:alert(1)',
      'https://attacker@meet.google.com/abc', 'https://teams.microsoft.com.evil.test/meeting',
    ]) expect(safeMeetingUrl(value)).toBeNull();
  });
  it('accepts approved meeting providers', () => {
    expect(safeMeetingUrl('https://us05web.zoom.us/j/123456')).toBe('https://us05web.zoom.us/j/123456');
    expect(safeMeetingUrl('https://teams.microsoft.com/l/meetup-join/abc')).not.toBeNull();
  });
  it('rejects publishing an incomplete live or recorded class', () => {
    expect(() => normalizeCoachInput(base({ meetingUrl: null }), true)).toThrow('live-not-ready');
    expect(() => normalizeCoachInput(base({ kind: 'recorded', meetingUrl: null, startsAt: null }), true))
      .toThrow('recording-not-ready');
  });
  it('validates MP4 uploads with a bounded file size', () => {
    expect(validRecording({ name: 'lesson.mp4', type: 'video/mp4', size: 1024 })).toBe(true);
    expect(validRecording({ name: 'lesson.exe', type: 'video/mp4', size: 1024 })).toBe(false);
    expect(validRecording({ name: 'lesson.mp4', type: 'application/octet-stream', size: 1024 })).toBe(false);
    expect(validRecording({ name: 'lesson.mp4', type: 'video/mp4', size: MAX_COACH_UPLOAD_BYTES + 1 })).toBe(false);
  });
  it('binds recorded storage paths to a verified owner and document id', () => {
    const path = recordingPath('coach_123', 'DocId12345');
    expect(path).toBe('coach-recordings/coach_123/DocId12345/video.mp4');
    const good = parseCoachSession('DocId12345', {
      ...base({kind:'recorded',startsAt:null,meetingUrl:null,videoPath:path}),
      schemaVersion:1, ownerUid:'coach_123',status:'published',
    });
    expect(good?.videoPath).toBe(path);
    expect(parseCoachSession('DocId12345', {
      ...base({kind:'recorded',startsAt:null,meetingUrl:null,videoPath:'coach-recordings/other/DocId12345/video.mp4'}),
      schemaVersion:1,ownerUid:'coach_123',status:'published',
    })).toBeNull();
  });
  it('rejects forged curriculum IDs and malformed timestamps', () => {
    expect(() => normalizeCoachInput(base({ relatedLessonId: '../admin' }), true)).toThrow('invalid-lesson');
    expect(safeStartAt('2026-02-30T18:30:00.000Z')).toBeNull();
    expect(safeStartAt('2026-10-15T18:30:00.000Z')).toBe('2026-10-15T18:30:00.000Z');
  });
  it('resolves direct lesson URLs without accepting arbitrary routes', () => {
    expect(lessonFromHash('#/academy/' + LESSONS[0].id)?.id).toBe(LESSONS[0].id);
    expect(lessonFromHash('#/academy/not-existent')).toBeNull();
    expect(lessonFromHash('#/academy/' + LESSONS[0].id + '/../../admin')).toBeNull();
  });
});
