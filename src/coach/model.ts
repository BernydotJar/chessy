import { LESSONS } from '../learning/curriculum';

export type CoachSessionKind = 'live' | 'recorded';
export type CoachSessionStatus = 'draft' | 'published';
export type CoachSessionLanguage = 'es' | 'en' | 'pt';

export interface CoachSessionInput {
  title: string;
  description: string;
  kind: CoachSessionKind;
  language: CoachSessionLanguage;
  startsAt: string | null;
  meetingUrl: string | null;
  videoPath: string | null;
  relatedLessonId: string | null;
}

export interface CoachSession extends CoachSessionInput {
  id: string;
  ownerUid: string;
  status: CoachSessionStatus;
}

const RELATED_LESSONS = new Set(LESSONS.map(lesson => lesson.id));
export const MAX_COACH_UPLOAD_BYTES = 100 * 1024 * 1024;

export function safeMeetingUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || url.username || url.password ||
        (url.port && url.port !== '443') || url.hash) return null;
    const permitted = host === 'meet.google.com' || host === 'teams.microsoft.com' ||
      host === 'zoom.us' || host.endsWith('.zoom.us');
    if (!permitted || url.pathname === '/') return null;
    return url.href;
  } catch { return null; }
}

export function safeStartAt(raw: string): string | null {
  if (!raw || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(raw)) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) || date.toISOString() !== raw ? null : raw;
}

export function validRecording(file: Pick<File, 'name' | 'size' | 'type'>): boolean {
  return file.size > 0 && file.size <= MAX_COACH_UPLOAD_BYTES &&
    file.type === 'video/mp4' && file.name.toLowerCase().endsWith('.mp4');
}

export function recordingPath(ownerUid: string, sessionId: string): string {
  if (!/^[a-zA-Z0-9_-]{3,128}$/.test(ownerUid) || !/^[a-zA-Z0-9]{5,64}$/.test(sessionId)) {
    throw new Error('Invalid recording destination');
  }
  return 'coach-recordings/' + ownerUid + '/' + sessionId + '/video.mp4';
}

export function normalizeCoachInput(value: CoachSessionInput, publish = false): CoachSessionInput {
  const title = value.title.trim();
  const description = value.description.trim();
  if (title.length < 6 || title.length > 100 || description.length > 500) throw new Error('invalid-title');
  if (!['es', 'en', 'pt'].includes(value.language)) throw new Error('invalid-language');
  if (value.kind !== 'live' && value.kind !== 'recorded') throw new Error('invalid-kind');
  const relatedLessonId = value.relatedLessonId || null;
  if (relatedLessonId && !RELATED_LESSONS.has(relatedLessonId)) throw new Error('invalid-lesson');
  const startsAt = value.startsAt ? safeStartAt(value.startsAt) : null;
  const meetingUrl = value.meetingUrl ? safeMeetingUrl(value.meetingUrl) : null;
  if (value.startsAt && !startsAt) throw new Error('invalid-date');
  if (value.meetingUrl && !meetingUrl) throw new Error('invalid-url');
  const videoPath = value.videoPath || null;
  if (videoPath && !/^coach-recordings\/[A-Za-z0-9_-]{3,128}\/[A-Za-z0-9]{5,64}\/video\.mp4$/.test(videoPath)) {
    throw new Error('invalid-video-path');
  }
  if (publish && value.kind === 'live' && (!startsAt || !meetingUrl)) throw new Error('live-not-ready');
  if (publish && value.kind === 'recorded' && !videoPath) throw new Error('recording-not-ready');
  return {
    title, description, kind: value.kind, language: value.language,
    startsAt: value.kind === 'live' ? startsAt : null,
    meetingUrl: value.kind === 'live' ? meetingUrl : null,
    videoPath: value.kind === 'recorded' ? videoPath : null,
    relatedLessonId,
  };
}

export function parseCoachSession(id: string, data: Record<string, unknown>): CoachSession | null {
  if (!/^[A-Za-z0-9]{5,64}$/.test(id) || data.schemaVersion !== 1 ||
    typeof data.ownerUid !== 'string' || !/^[a-zA-Z0-9_-]{3,128}$/.test(data.ownerUid) ||
    (data.status !== 'draft' && data.status !== 'published') ||
    data.meetingUrl !== null) return null;
  try {
    const session = normalizeCoachInput({
      title: String(data.title ?? ''),
      description: String(data.description ?? ''),
      kind: data.kind as CoachSessionKind,
      language: data.language as CoachSessionLanguage,
      startsAt: typeof data.startsAt === 'string' ? data.startsAt : null,
      meetingUrl: typeof data.meetingUrl === 'string' ? data.meetingUrl : null,
      videoPath: typeof data.videoPath === 'string' ? data.videoPath : null,
      relatedLessonId: typeof data.relatedLessonId === 'string' ? data.relatedLessonId : null,
    }, data.status === 'published' && data.kind === 'recorded');
    if (data.status === 'published' && data.kind === 'live' && !session.startsAt) return null;
    if (session.videoPath && session.videoPath !== recordingPath(data.ownerUid, id)) return null;
    return { ...session, id, ownerUid: data.ownerUid, status: data.status };
  } catch { return null; }
}
