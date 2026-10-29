import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff, Users, Radio } from 'lucide-react';
import {
  Room, RoomEvent, Track, ConnectionState, DisconnectReason,
  type Participant, RemoteAudioTrack,
} from 'livekit-client';
import {
  startLiveClass, joinLiveClass, endLiveClass, moderateLiveClass, observeLiveClass, liveErrorKey,
  type LiveSession,
} from '../../rooms/live';
import type { LearningRoom } from '../../rooms/model';
import '../../styles/live-classroom.css';

function CameraTile({participant, screen = false}: {participant: Participant; screen?: boolean}) {
  const {t} = useTranslation();
  const video = useRef<HTMLVideoElement>(null);
  const publication = participant.getTrackPublication(screen ? Track.Source.ScreenShare : Track.Source.Camera);
  const track = publication?.track;
  useEffect(() => {
    const element = video.current;
    if (!element || !track) return;
    track.attach(element);
    return () => { track.detach(element); };
  }, [track]);
  const role = (() => { try { return JSON.parse(participant.metadata || '{}').role; } catch { return ''; } })();
  const label = role === 'coach' ? t('live.coach') : t('live.learner') + ' ' + participant.identity.slice(2,6);
  return <div className={'live-tile' + (screen ? ' live-screen' : '')} data-identity={participant.identity}>
    <video ref={video} autoPlay playsInline muted className={!track || publication?.isMuted ? 'live-video-hidden' : ''}
      aria-label={screen ? t('live.sharedScreen') : label}/>
    {(!track || publication?.isMuted) && <div className="live-avatar" aria-hidden="true">{label.charAt(0)}</div>}
    <span className="live-tile-label">{screen ? t('live.sharedScreen') : label}</span>
  </div>;
}
function AudioTrack({track}: {track: RemoteAudioTrack}) {
  const audio = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const element = audio.current;
    if (!element) return;
    track.attach(element);
    return () => { track.detach(element); };
  }, [track]);
  return <audio ref={audio} autoPlay />;
}
export default function LiveClassroom({room, owns}: {room: LearningRoom; owns: boolean}) {
  const {t} = useTranslation();
  const [session, setSession] = useState<LiveSession | null>(null);
  const [call, setCall] = useState<Room | null>(null);
  const [connection, setConnection] = useState(ConnectionState.Disconnected);
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const callRef = useRef<Room | null>(null);
  const attempt = useRef(0);
  const invalidateAttempt = useCallback(() => { attempt.current++; }, []);
  const joinedSession = useRef<string | null>(null);
  const mounted = useRef(true);
  const refresh = () => setVersion(value => value + 1);
  useEffect(() => {
    mounted.current = true;
    let stop = () => {};
    let alive = true;
    void observeLiveClass(room.id, state => {
      if (!alive) return;
      setSession(state);
      if (state?.status !== 'live' || (joinedSession.current && joinedSession.current !== state.sessionId)) {
        attempt.current++;
        void callRef.current?.disconnect();
        callRef.current = null; setCall(null); setConnection(ConnectionState.Disconnected);
      }
    }, () => {
      if (!alive) return;
      attempt.current++; void callRef.current?.disconnect(); callRef.current = null; setCall(null);
      setConnection(ConnectionState.Disconnected); setError('live.accessDenied');
    }).then(unsubscribe => { if (!alive) unsubscribe(); else stop = unsubscribe; })
      .catch(() => { if (alive) setError('live.error'); });
    return () => {
      alive = false; mounted.current = false; invalidateAttempt();
      stop(); void callRef.current?.disconnect(); callRef.current = null;
    };
  }, [room.id, invalidateAttempt]);
  useEffect(() => {
    if (!session) return;
    const remaining = session.endsAt - Date.now();
    const timer = window.setTimeout(() => {
      attempt.current++; void callRef.current?.disconnect(); callRef.current = null;
      setCall(null); setConnection(ConnectionState.Disconnected); setNotice('live.ended');
    }, Math.max(0, remaining));
    return () => window.clearTimeout(timer);
  }, [session]);
  useEffect(() => {
    if (room.status === 'active') return;
    attempt.current++; void callRef.current?.disconnect(); callRef.current = null; setCall(null);
  }, [room.status]);
  async function connect(sessionId: string) {
    const request = ++attempt.current;
    const credentials = await joinLiveClass(room.id, sessionId);
    if (!mounted.current || request !== attempt.current) return;
    const next = new Room({adaptiveStream: true, dynacast: true, videoCaptureDefaults: {resolution: {width: 640, height: 360, frameRate: 15}}, publishDefaults: {simulcast: false}});
    callRef.current = next; joinedSession.current = sessionId;
    const update = () => { if (mounted.current) setVersion(value => value + 1); };
    next.on(RoomEvent.ConnectionStateChanged, state => { if (mounted.current) setConnection(state); });
    for (const event of [RoomEvent.ParticipantConnected, RoomEvent.ParticipantDisconnected,
      RoomEvent.TrackSubscribed, RoomEvent.TrackUnsubscribed, RoomEvent.TrackMuted, RoomEvent.TrackUnmuted,
      RoomEvent.LocalTrackPublished, RoomEvent.LocalTrackUnpublished, RoomEvent.AudioPlaybackStatusChanged]) {
      next.on(event, update);
    }
    next.on(RoomEvent.Disconnected, reason => {
      if (!mounted.current || callRef.current !== next) return;
      callRef.current = null; setCall(null); setConnection(ConnectionState.Disconnected);
      if (reason === DisconnectReason.PARTICIPANT_REMOVED) setError('live.accessDenied');
      else setNotice('live.disconnected');
    });
    try {
      await next.connect(credentials.serverUrl, credentials.token);
      if (!mounted.current || request !== attempt.current) { await next.disconnect(); return; }
      // Neither device is published until the participant chooses to enable it.
      setCall(next); setConnection(next.state); setNotice('live.joined');
      await next.startAudio().catch(() => { /* The explicit audio-resume button remains available. */ });
    } catch (cause) {
      await next.disconnect();
      if (callRef.current === next) callRef.current = null;
      throw cause;
    }
  }
  async function perform(action: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try { await action(); }
    catch (cause) { if (mounted.current) setError(liveErrorKey(cause)); }
    finally { if (mounted.current) { setBusy(false); refresh(); } }
  }
  const connected = !!call && connection === ConnectionState.Connected;
  // Room/participant instances are mutable; version is advanced by subscribed SDK events.
  void version;
  const people = call ? [call.localParticipant, ...call.remoteParticipants.values()] : [];
  const others = people.filter(person => person.identity !== call?.localParticipant.identity);
  const screen = people.find(person => person.getTrackPublication(Track.Source.ScreenShare)?.isSubscribed ||
    (person === call?.localParticipant && person.getTrackPublication(Track.Source.ScreenShare)?.track));
  const audioTracks = call ? [...call.remoteParticipants.values()].flatMap(person =>
    [...person.audioTrackPublications.values()].flatMap(publication => publication.track instanceof RemoteAudioTrack ? [publication.track] : [])) : [];
  const mic = call?.localParticipant.isMicrophoneEnabled ?? false;
  const camera = call?.localParticipant.isCameraEnabled ?? false;
  const sharing = call?.localParticipant.isScreenShareEnabled ?? false;
  const inProgress = session && ['starting','live','closing'].includes(session.status);
  return <section className="panel live-classroom" aria-labelledby="live-classroom-title" data-testid="live-classroom">
    <div className="live-heading"><div><p className="eyebrow"><Radio size={14} aria-hidden="true"/> {t('live.eyebrow')}</p>
      <h3 id="live-classroom-title">{t('live.title')}</h3></div>
      <span className={'tag' + (connected ? ' live-connected' : '')} role="status" data-testid="live-status">
        {t(connected ? 'live.connected' : connection === ConnectionState.Reconnecting ||
          connection === ConnectionState.SignalReconnecting ? 'live.reconnecting' :
          connection === ConnectionState.Connecting ? 'live.connecting' :
          session?.status === 'closing' ? 'live.closing' : session?.status === 'live' ? 'live.ready' : 'live.waiting')}
      </span></div>
    {!call && <div className="live-lobby">
      <div className="live-lobby-icon"><Video size={28} aria-hidden="true"/></div>
      <p>{t(owns ? 'live.coachIntro' : 'live.learnerIntro')}</p>
      <p className="fine-print">{t('live.devicesOff')}</p>
      <div className="button-row">
        {owns && room.status === 'active' && !inProgress && <button className="btn primary" type="button" disabled={busy}
          onClick={() => void perform(async () => { const result = await startLiveClass(room.id); await connect(result.sessionId); })}>{t('live.start')}</button>}
        {room.status === 'active' && session?.status === 'live' && <button className="btn primary" type="button" disabled={busy}
          onClick={() => void perform(() => connect(session.sessionId))}>{t(busy ? 'live.connecting' : 'live.join')}</button>}
      </div>
    </div>}
    {call && <>
      {screen && <CameraTile participant={screen} screen/>}
      <div className="live-grid" data-testid="live-media-grid">{people.map(person =>
        <CameraTile key={person.identity} participant={person}/>)}</div>
      {audioTracks.map(track => <AudioTrack key={track.sid} track={track}/>)}
      {!call.canPlaybackAudio && <button className="btn secondary" type="button"
        onClick={() => void perform(() => call.startAudio())}>{t('live.resumeAudio')}</button>}
      <div className="live-controls" aria-label={t('live.controls')}>
        <button className="btn secondary" type="button" aria-pressed={mic} disabled={!connected || busy}
          aria-label={t(mic ? 'live.micOff' : 'live.micOn')}
          onClick={() => void perform(() => call.localParticipant.setMicrophoneEnabled(!mic))}>{mic ? <Mic size={18}/> : <MicOff size={18}/>}<span>{t('live.microphone')}</span></button>
        <button className="btn secondary" type="button" aria-pressed={camera} disabled={!connected || busy}
          aria-label={t(camera ? 'live.cameraOff' : 'live.cameraOn')}
          onClick={() => void perform(() => call.localParticipant.setCameraEnabled(!camera))}>{camera ? <Video size={18}/> : <VideoOff size={18}/>}<span>{t('live.camera')}</span></button>
        {owns && <button className="btn secondary" type="button" aria-pressed={sharing} disabled={!connected || busy}
          aria-label={t(sharing ? 'live.stopShare' : 'live.share')}
          onClick={() => void perform(() => call.localParticipant.setScreenShareEnabled(!sharing, {resolution: {width: 1280, height: 720, frameRate: 10}}))}><MonitorUp size={18}/><span>{t('live.screen')}</span></button>}
        <button className="btn quiet" type="button" onClick={() => {
          attempt.current++; void call.disconnect(); callRef.current = null; setCall(null);
          setConnection(ConnectionState.Disconnected); setNotice('live.disconnected');
        }}><PhoneOff size={18}/><span>{t('live.leave')}</span></button>
      </div>
      <details className="live-participants" open={owns}>
        <summary><Users size={16} aria-hidden="true"/> {t('live.participants')} ({people.length})</summary>
        {others.map(person => <div className="live-participant" key={person.identity}>
          <span>{person.name || t('live.learner')}</span>
          {owns && <div className="button-row">
            <button type="button" className="text-button" disabled={busy}
              onClick={() => void perform(() => moderateLiveClass(room.id, session!.sessionId, person.identity, 'mute'))}>{t('live.mute')}</button>
            <button type="button" className="text-button" disabled={busy}
              onClick={() => { if (window.confirm(t('live.removeConfirm'))) void perform(() =>
                moderateLiveClass(room.id, session!.sessionId, person.identity, 'remove')); }}>{t('live.remove')}</button>
          </div>}
        </div>)}
      </details>
    </>}
    {owns && inProgress && <button type="button" className="btn quiet live-end" disabled={busy}
      onClick={() => { if (window.confirm(t('live.endConfirm'))) void perform(() => endLiveClass(room.id, session.sessionId)); }}>
      {t(session.status === 'closing' ? 'live.retryClose' : 'live.end')}</button>}
    {notice && <p role="status" className="live-notice">{t(notice)}</p>}
    {error && <p role="alert" className="feedback wrong">{t(error)}</p>}
  </section>;
}
