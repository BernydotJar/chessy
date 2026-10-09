import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../auth/store';
import { useGameStore } from '../../store/gameStore';
import { LESSONS } from '../../learning/curriculum';
import { locale } from '../../learning/types';
import {
  getCoachPlaybackUrl, isApprovedCoach, listOwnedCoachSessions,
  listPublishedCoachSessions, saveCoachSession, uploadCoachRecording,
} from '../../coach/cloud';
import {
  safeMeetingUrl, validRecording,
  type CoachSession, type CoachSessionInput, type CoachSessionKind,
  type CoachSessionLanguage,
} from '../../coach/model';
import { SectionHeading } from './Shared';

const blank = (): CoachSessionInput => ({
  kind: 'live', title: '', description: '', language: 'es', startsAt: null,
  meetingUrl: null, videoPath: null, relatedLessonId: null,
});

const friendlyTime = (value: string, language: string) =>
  new Intl.DateTimeFormat(language, { dateStyle: 'full', timeStyle: 'short' }).format(new Date(value));

export function CoachClassesView() {
  const { t, i18n } = useTranslation();
  const lang = locale(i18n.resolvedLanguage);
  const user = useAuthStore(state => state.user);
  const signedIn = useAuthStore(state => state.status === 'signed-in');
  const setView = useGameStore(state => state.setView);
  const [items, setItems] = useState<CoachSession[]>([]);
  const [permission, setPermission] = useState(false);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<string | null>(null);
  const [form, setForm] = useState<CoachSessionInput>(blank);
  const [editing, setEditing] = useState<CoachSession | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [playback, setPlayback] = useState<{ id: string; url: string } | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const latestRequest = useRef(0);

  const reload = useCallback(async () => {
    const serial = ++latestRequest.current;
    setLoading(true);
    setProblem(null);
    try {
      const permitted = Boolean(user && await isApprovedCoach());
      const [published, owned] = await Promise.all([
        listPublishedCoachSessions(),
        permitted && user ? listOwnedCoachSessions(user.id) : Promise.resolve([]),
      ]);
      if (serial !== latestRequest.current) return;
      const unique = new Map([...published, ...owned].map(session => [session.id, session]));
      setItems([...unique.values()].sort((a, b) => {
        if (a.kind === 'live' && b.kind === 'live') return (a.startsAt || '').localeCompare(b.startsAt || '');
        return a.kind === 'live' ? -1 : b.kind === 'live' ? 1 : a.title.localeCompare(b.title);
      }));
      setPermission(permitted);
    } catch {
      if (serial === latestRequest.current) {
        setProblem('loadError');
        setPermission(false);
      }
    } finally {
      if (serial === latestRequest.current) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Signed-out UI must never retain a previous owner's draft or playback URL.
    setPermission(false);
    setPlayback(null);
    setItems(current => current.filter(item => item.status === 'published'));
    void reload();
    return () => { latestRequest.current += 1; };
  }, [reload]);

  const set = <K extends keyof CoachSessionInput>(key: K, value: CoachSessionInput[K]) =>
    setForm(current => ({ ...current, [key]: value }));

  const edit = (session: CoachSession) => {
    setEditing(session);
    document.getElementById('coach-author-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setForm({
      kind: session.kind, title: session.title, description: session.description,
      language: session.language, startsAt: session.startsAt, meetingUrl: session.meetingUrl,
      videoPath: session.videoPath, relatedLessonId: session.relatedLessonId,
    });
    setVideoFile(null);
    setProgress(0);
    setFeedback(null);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !permission || busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      const id = await saveCoachSession(user.id, form, editing || undefined);
      const temporary: CoachSession = {
        ...form, id, ownerUid: user.id, status: 'draft',
      };
      setEditing(temporary);
      if (form.kind === 'recorded' && videoFile) {
        if (!validRecording(videoFile)) throw new Error('invalid-video');
        const videoPath = await uploadCoachRecording(user.id, id, videoFile, setProgress);
        await saveCoachSession(user.id, { ...form, videoPath }, temporary);
      }
      setEditing(null);
      setForm(blank());
      setVideoFile(null);
      setProgress(0);
      setFeedback('saved');
      await reload();
    } catch {
      setFeedback('saveError');
    } finally {
      setBusy(false);
    }
  };

  const publish = async (session: CoachSession) => {
    if (!user || !permission || busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      await saveCoachSession(user.id, session, session, 'published');
      setFeedback('published');
      await reload();
    } catch {
      setFeedback('publishError');
    } finally {
      setBusy(false);
    }
  };

  const watch = async (session: CoachSession) => {
    if (!signedIn) { setView('account'); return; }
    setOpening(session.id);
    setPlayback(null);
    setFeedback(null);
    try {
      const url = await getCoachPlaybackUrl(session);
      setPlayback({ id: session.id, url });
    } catch {
      setFeedback('playbackError');
    } finally { setOpening(null); }
  };

  return <div className="view-enter coach-classes">
    <SectionHeading eyebrow={t('classes.eyebrow')} title={t('classes.title')} subtitle={t('classes.subtitle')}/>
    <section className="coach-intro panel" aria-label={t('classes.approach')}>
      <strong>{t('classes.approach')}</strong>
      <p>{t('classes.approachText')}</p>
      <button className="btn secondary" type="button" onClick={() => setView('training')}>{t('classes.practice')}</button>
    </section>
    {loading && <p className="muted" role="status">{t('classes.loading')}</p>}
    {problem && <p className="feedback wrong" role="alert">{t('classes.loadError')}</p>}
    {!loading && !problem && items.filter(item => item.status === 'published').length === 0 &&
      <div className="panel coach-empty"><h2>{t('classes.emptyTitle')}</h2><p>{t('classes.emptyBody')}</p>
        <button className="btn secondary" onClick={() => setView('academy')}>{t('classes.existingAcademy')}</button>
      </div>}
    {items.length > 0 && <div className="coach-class-list">
      {items.map(item => <article className="panel coach-class-card" key={item.id}>
        <div className="coach-class-top">
          <span className="tag">{t(item.kind === 'live' ? 'classes.live' : 'classes.recorded')}</span>
          <span className="fine-print">{item.language.toUpperCase()}</span>
          {item.status === 'draft' && <span className="tag">{t('classes.draft')}</span>}
        </div>
        <h2>{item.title}</h2>
        {item.description && <p>{item.description}</p>}
        {item.kind === 'live' && item.startsAt && <p className="coach-time">
          <time dateTime={item.startsAt}>{friendlyTime(item.startsAt, i18n.resolvedLanguage || 'es')}</time>
        </p>}
        {item.relatedLessonId && <button className="text-button" type="button"
          onClick={() => { window.location.hash = '/academy/' + item.relatedLessonId; setView('academy'); }}>
          {t('classes.relatedLesson')}
        </button>}
        {item.status === 'published' && item.kind === 'live' && item.meetingUrl &&
          (signedIn
            ? <a href={safeMeetingUrl(item.meetingUrl) || undefined} className="btn primary"
                target="_blank" rel="noopener noreferrer">{t('classes.joinLive')}</a>
            : <button className="btn secondary" onClick={() => setView('account')}>{t('classes.signInToJoin')}</button>)}
        {item.status === 'published' && item.kind === 'recorded' &&
          <button className="btn primary" disabled={opening === item.id} onClick={() => void watch(item)}>
            {t(opening === item.id ? 'classes.loading' : signedIn ? 'classes.watch' : 'classes.signInToWatch')}
          </button>}
        {playback?.id === item.id && <video controls playsInline preload="metadata" className="coach-video"
          src={playback.url} aria-label={item.title}/>}
        {permission && item.ownerUid === user?.id && <div className="button-row coach-author-actions">
          <button className="btn secondary" disabled={busy} onClick={() => edit(item)}>{t('classes.edit')}</button>
          {item.status === 'draft' && <button className="btn primary" disabled={busy} onClick={() => void publish(item)}>
            {t('classes.publish')}
          </button>}
        </div>}
      </article>)}
    </div>}
    {permission && <section className="panel coach-author" aria-labelledby="coach-author-title">
      <h2 id="coach-author-title">{t('classes.editor')}</h2>
      <p className="muted">{t('classes.editorNote')}</p>
      <form className="coach-author-form" onSubmit={event => void save(event)}>
        <label>{t('classes.kind')}<select value={form.kind} disabled={busy} onChange={event => {
          setVideoFile(null);
          setForm(current => ({ ...current, kind: event.target.value as CoachSessionKind, videoPath: null, meetingUrl: null, startsAt: null }));
        }}>
          <option value="live">{t('classes.live')}</option><option value="recorded">{t('classes.recorded')}</option>
        </select></label>
        <label>{t('classes.lessonTitle')}<input required minLength={6} maxLength={100} value={form.title} disabled={busy}
          onChange={event => set('title', event.target.value)}/></label>
        <label>{t('classes.description')}<textarea maxLength={500} rows={3} disabled={busy} value={form.description}
          onChange={event => set('description', event.target.value)}/></label>
        <label>{t('classes.language')}<select value={form.language} disabled={busy}
          onChange={event => set('language', event.target.value as CoachSessionLanguage)}>
          <option value="es">Español</option><option value="en">English</option><option value="pt">Português</option>
        </select></label>
        <label>{t('classes.relatedLessonOptional')}<select value={form.relatedLessonId || ''} disabled={busy}
          onChange={event => set('relatedLessonId', event.target.value || null)}>
          <option value="">{t('classes.none')}</option>
          {LESSONS.map(lesson => <option key={lesson.id} value={lesson.id}>{lesson.title[lang]}</option>)}
        </select></label>
        {form.kind === 'live' && <>
          <label>{t('classes.scheduledFor')}<input type="datetime-local" required disabled={busy}
            value={form.startsAt ? new Date(form.startsAt).toLocaleString('sv-SE').replace(' ', 'T').slice(0,16) : ''}
            onChange={event => set('startsAt', event.target.value ? new Date(event.target.value).toISOString() : null)}/></label>
          <label>{t('classes.meetingUrl')}<input type="url" required maxLength={500} disabled={busy}
            placeholder="https://meet.google.com/..." value={form.meetingUrl || ''}
            onChange={event => set('meetingUrl', event.target.value || null)}/></label>
          <p className="fine-print">{t('classes.allowedMeetings')}</p>
        </>}
        {form.kind === 'recorded' && <>
          <label>{t('classes.upload')}<input type="file" accept="video/mp4,.mp4" disabled={busy}
            onChange={event => setVideoFile(event.target.files?.[0] || null)}/></label>
          <p className="fine-print">{t('classes.uploadNote')}</p>
          {form.videoPath && <p className="muted" role="status">{t('classes.videoReady')}</p>}
          {videoFile && !validRecording(videoFile) && <p className="feedback wrong" role="alert">{t('classes.invalidVideo')}</p>}
          {busy && progress > 0 && <progress max={100} value={progress} aria-label={t('classes.uploadProgress')}/>}
        </>}
        <div className="button-row">
          <button className="btn primary" disabled={busy || Boolean(videoFile && !validRecording(videoFile))}>
            {t(busy ? 'classes.saving' : 'classes.saveDraft')}
          </button>
          {editing && <button className="btn secondary" type="button" disabled={busy} onClick={() => {
            setEditing(null); setForm(blank()); setVideoFile(null);
          }}>{t('classes.cancel')}</button>}
        </div>
      </form>
    </section>}
    {feedback && <p className={feedback === 'saved' || feedback === 'published' ? 'feedback success' : 'feedback wrong'}
      role="status">{t('classes.' + feedback)}</p>}
  </div>;
}
