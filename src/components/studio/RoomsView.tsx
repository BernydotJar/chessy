import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Mail, Share2, Users, CheckCircle2, ShieldCheck, LockKeyhole } from 'lucide-react';
import { useAuthStore } from '../../auth/store';
import { useGameStore } from '../../store/gameStore';
import { useLearningStore } from '../../learning/store';
import { locale } from '../../learning/types';
import { PositionBoard, SectionHeading } from './Shared';
import {
  closeRoom, createInvite, createRoom, getMyDiagnostic, getMyMembership, getRoom, leaveRoom, revokeInvite,
  invitationUrl, isRoomHost, joinRoom, listInvites, listMyRooms, observeRoomRoster,
  redeemInfo, roomBoardCommand, sendDiagnostic, watchRoomBoard,
} from '../../rooms/cloud';
import type { ClassroomBoard, ClassroomCommand } from '../../coach/classroomBoard';
import {
  AGE_BANDS, gradeDiagnostic, isChild, questionsForAge, roomAllowsAge, validDiagnostic,
  zeroToOneMilestones, type AgeBand, type Answers, type Language, type LearningGoal,
  type LearningRoom, type RoomAudience, type RoomDiagnostic, type RoomInvitation,
} from '../../rooms/model';

const PENDING_KEY = 'chessy-pending-room-invitation-v1';
const inviteFromHash = (): string | null => {
  const match = window.location.hash.match(/^#\/rooms\/([A-Za-z0-9]{20})$/);
  return match ? match[1] : null;
};
const roomFromHash = (): string | null => {
  const match = window.location.hash.match(/^#\/rooms\/open\/([A-Za-z0-9]{20})$/);
  return match ? match[1] : null;
};
const pendingInvite = () => {
  try {
    const value = sessionStorage.getItem(PENDING_KEY);
    return value && /^[A-Za-z0-9]{20}$/.test(value) ? value : null;
  } catch { return null; }
};
const savePending = (id: string | null) => {
  try { if (id) sessionStorage.setItem(PENDING_KEY, id); else sessionStorage.removeItem(PENDING_KEY); }
  catch { /* Session storage can be unavailable in private browsing. */ }
};

function FirstSteps() {
  const { t, i18n } = useTranslation();
  const lang = locale(i18n.resolvedLanguage);
  const progress = useLearningStore(s => s.progress);
  const configure = useLearningStore(s => s.configure);
  const setView = useGameStore(s => s.setView);
  const milestones = useMemo(() => zeroToOneMilestones(progress), [progress]);
  const done = milestones.filter(item => item.done).length;
  const launch = (kind: 'lesson' | 'puzzle', id: string) => {
    if (kind === 'lesson') {
      window.location.hash = '/academy/' + id;
      setView('academy');
    } else {
      configure('practice', id === 'back-rank' ? 'mate' : 'basics');
      window.location.hash = '/training/' + id;
      setView('training');
    }
  };
  return <section className="panel zero-path" aria-label={t('rooms.zeroTitle')}>
    <div className="zero-path-heading">
      <div><p className="eyebrow">{t('rooms.welcome')}</p><h2>{t('rooms.zeroTitle')}</h2><p className="muted">{t('rooms.zeroSubtitle')}</p></div>
      <span className="tag">{done} / {milestones.length}</span>
    </div>
    <progress aria-label={t('rooms.zeroTitle')} max={milestones.length} value={done}/>
    <p className="zero-level" role="status">{t(done === milestones.length ? 'rooms.levelReady' : 'rooms.levelPending')}</p>
    <ol className="zero-milestones">{milestones.map((item,index) => <li key={item.id} className={item.done ? 'done' : ''}>
      <span className="zero-count">{item.done ? <CheckCircle2 size={18}/> : index + 1}</span>
      <div><strong>{item.title[lang]}</strong><span>{t(item.done ? 'rooms.done' : 'rooms.pending')}</span></div>
      {!item.done && <button className="btn secondary" type="button" onClick={() => launch(item.practice.kind,item.practice.id)}>{t('rooms.start')}</button>}
    </li>)}</ol>
  </section>;
}

interface InvitationDetails {
  invitation: RoomInvitation;
  roomTitle: string;
  audience: RoomAudience;
}
interface Membership {
  ageBand: AgeBand;
  guardianConfirmed: boolean;
}

export function RoomsView() {
  const { t, i18n } = useTranslation();
  const lang = locale(i18n.resolvedLanguage);
  const user = useAuthStore(s => s.user);
  const authStatus = useAuthStore(s => s.status);
  const verified = authStatus === 'signed-in' && Boolean(user?.emailVerified);
  const setView = useGameStore(s => s.setView);

  const [inviteId, setInviteId] = useState<string | null>(() => inviteFromHash() || pendingInvite());
  const [activeRoomId, setActiveRoomId] = useState<string | null>(() => roomFromHash());
  const [available, setAvailable] = useState<LearningRoom[]>([]);
  const [canTeach, setCanTeach] = useState(false);
  const [details, setDetails] = useState<InvitationDetails | null>(null);
  const [room, setRoom] = useState<LearningRoom | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [diagnostic, setDiagnostic] = useState<RoomDiagnostic | null>(null);
  const [board, setBoard] = useState<ClassroomBoard | null>(null);
  const [invites, setInvites] = useState<RoomInvitation[]>([]);
  const [diagnostics, setDiagnostics] = useState<RoomDiagnostic[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [title, setTitle] = useState('');
  const [audience, setAudience] = useState<RoomAudience>('children');
  const [language, setLanguage] = useState<Language>(lang);
  const [ageBand, setAgeBand] = useState<AgeBand>('adult');
  const [guardian, setGuardian] = useState(false);
  const [goal, setGoal] = useState<LearningGoal>('discover');
  const [answers, setAnswers] = useState<Partial<Answers>>({});
  const [share, setShare] = useState<RoomInvitation | null>(null);
  const [recipient, setRecipient] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  const refresh = useCallback(() => setRevision(old => old + 1), []);
  const clearInvitation = () => {
    savePending(null);
    setInviteId(null);
    setDetails(null);
    window.location.hash = '/rooms';
  };
  const openRoom = (id: string) => {
    savePending(null);
    setInviteId(null);
    setDetails(null);
    setActiveRoomId(id);
    window.location.hash = '/rooms/open/' + id;
  };
  const toAccount = () => {
    setView('account');
    window.location.hash = '/account';
  };

  useEffect(() => {
    const handleHash = () => {
      const fromUrl = inviteFromHash();
      const fromRoom = roomFromHash();
      if (fromUrl) {
        savePending(fromUrl);
        setActiveRoomId(null);
        setInviteId(fromUrl);
      } else if (fromRoom) {
        setActiveRoomId(fromRoom);
        setInviteId(null);
      } else if (window.location.hash === '#/rooms') {
        setActiveRoomId(null);
        setInviteId(pendingInvite());
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  useEffect(() => {
    let current = true;
    setCanTeach(false);
    setAvailable([]);
    if (!verified) return;
    Promise.all([listMyRooms(), isRoomHost()]).then(([list, teacher]) => {
      if (current) { setAvailable(list); setCanTeach(teacher); }
    }).catch(() => { if (current) setError('rooms.error'); });
    return () => { current = false; };
  }, [verified, user?.id, revision]);

  useEffect(() => {
    let current = true;
    setDetails(null);
    if (!inviteId || !verified || activeRoomId) return;
    setLoading(true);
    redeemInfo(inviteId).then(data => {
      if (current) { setDetails(data); setError(null); }
    }).catch(() => {
      if (current) setError('rooms.inviteExpired');
    }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [inviteId, verified, activeRoomId]);

  useEffect(() => {
    let current = true;
    let unsubscribe = () => {};
    let stopRoster = () => {};
    setRoom(null); setBoard(null); setMembership(null); setDiagnostic(null);
    setInvites([]); setDiagnostics([]); setMemberCount(0); setShare(null);
    if (!activeRoomId || !verified) return;
    setLoading(true);
    Promise.all([getRoom(activeRoomId),getMyMembership(activeRoomId),getMyDiagnostic(activeRoomId)])
      .then(async ([nextRoom, nextMembership, nextDiagnostic]) => {
        if (!current) return;
        setRoom(nextRoom); setMembership(nextMembership); setDiagnostic(nextDiagnostic);
        if (nextRoom.ownerUid === user?.id) {
          const [allInvites, unsubscribeRoster] = await Promise.all([
            listInvites(user.id),
            observeRoomRoster(nextRoom.id,
              value=>{if(current)setDiagnostics(value);},
              value=>{if(current)setMemberCount(value);},
              ()=>{if(current)setError('rooms.error');}),
          ]);
          if (!current) {unsubscribeRoster();return;}
          stopRoster=unsubscribeRoster;
          setInvites(allInvites.filter(item => item.roomId === nextRoom.id && item.expiresAt.getTime() > Date.now()));
        }
      }).catch(() => { if (current) setError('rooms.error'); })
      .finally(() => { if (current) setLoading(false); });
    void watchRoomBoard(activeRoomId, next => { if (current) setBoard(next); })
      .then(stop => { if (!current) stop(); else unsubscribe = stop; })
      .catch(() => { if (current) setBoard(null); });
    return () => { current = false; unsubscribe(); stopRoster(); };
  }, [activeRoomId, verified, user?.id, revision]);

  useEffect(() => {
    // A direct room link must survive Firebase's asynchronous session restoration.
    // Only erase private data after a confirmed sign-out or disabled cloud config.
    if (authStatus !== 'signed-out' && authStatus !== 'unconfigured') return;
    setAvailable([]); setRoom(null); setBoard(null);
    setDiagnostic(null); setDiagnostics([]);
  }, [authStatus, user?.id]);

  const onCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!canTeach || busy) return;
    setBusy(true); setError(null); setMessage(null);
    try {
      const created = await createRoom({title,audience,language});
      setTitle(''); openRoom(created.id); refresh();
    } catch { setError('rooms.error'); }
    finally { setBusy(false); }
  };
  const onInvite = async () => {
    if (!room || busy) return;
    setBusy(true); setError(null);
    try { const next = await createInvite(room); setShare(next); refresh(); }
    catch { setError('rooms.error'); }
    finally { setBusy(false); }
  };
  const onJoin = async (event: FormEvent) => {
    event.preventDefault();
    if (!inviteId || !details || busy) return;
    if (!roomAllowsAge(details.audience,ageBand) || (isChild(ageBand) && !guardian)) {
      setError('rooms.ageRequired'); return;
    }
    setBusy(true); setError(null);
    try {
      const roomId = await joinRoom(inviteId,ageBand,isChild(ageBand) && guardian);
      openRoom(roomId); refresh();
    } catch { setError('rooms.error'); }
    finally { setBusy(false); }
  };
  const onDiagnostic = async (event: FormEvent) => {
    event.preventDefault();
    if (!room || !membership || busy) return;
    if (Object.keys(answers).length !== 5 || !validDiagnostic({
      uid:user?.id,ageBand:membership.ageBand,guardianConfirmed:membership.guardianConfirmed,goal,answers,
    })) {
      setError('rooms.completeQuestions'); return;
    }
    setBusy(true); setError(null);
    try {
      const saved = await sendDiagnostic(room.id,membership.ageBand,membership.guardianConfirmed,goal,answers as Answers);
      setDiagnostic(saved); setMessage('rooms.diagnosticDone');
    } catch { setError('rooms.error'); }
    finally { setBusy(false); }
  };
  const onRevokeInvite = (id: string) => {
    if (busy) return;
    setBusy(true); setError(null);
    void revokeInvite(id).then(() => {
      setShare(current => current?.id === id ? null : current);
      setInvites(current => current.filter(item => item.id !== id));
    }).catch(() => setError('rooms.error')).finally(() => setBusy(false));
  };
  const onLeave = () => {
    if (!room || busy || !window.confirm(t('rooms.leaveConfirm'))) return;
    setBusy(true); setError(null);
    void leaveRoom(room.id).then(() => exitRoom())
      .catch(() => setError('rooms.error')).finally(() => setBusy(false));
  };
  const command = (cmd: ClassroomCommand) => {
    if (!room || busy) return;
    setBusy(true); setError(null);
    void roomBoardCommand(room.id,cmd).catch(() => setError('rooms.error'))
      .finally(() => setBusy(false));
  };
  const copy = async (token: string) => {
    try { await navigator.clipboard.writeText(invitationUrl(token)); setMessage('rooms.copied'); }
    catch { setError('rooms.error'); }
  };
  const shareInvite = async (token: string) => {
    if (!room) return;
    const url=invitationUrl(token);
    if (!navigator.share) {await copy(token);return;}
    try {
      await navigator.share({title:room.title,text:t('rooms.inviteTitle'),url});
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) setError('rooms.error');
    }
  };
  const exitRoom = () => {
    setActiveRoomId(null); setError(null); setMessage(null);
    window.location.hash = '/rooms'; refresh();
  };
  const owns = Boolean(room && user?.id === room.ownerUid && canTeach);
  const questions = membership ? questionsForAge(membership.ageBand) : [];
  const score = diagnostic ? gradeDiagnostic(diagnostic.ageBand, diagnostic.answers) : null;
  const latestShare = share || (invites.find(item => item.roomId === room?.id) ?? null);
  const safeRecipient = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(recipient.trim())
    ? encodeURIComponent(recipient.trim()) : '';
  const mail = latestShare && room ? 'mailto:' + safeRecipient + '?subject=' +
    encodeURIComponent(room.title + ' · Chessy') + '&body=' +
    encodeURIComponent(t('rooms.inviteTitle') + ': ' + invitationUrl(latestShare.id)) : null;

  return <div className="view-enter rooms-view">
    <SectionHeading eyebrow={t('rooms.eyebrow')} title={t('rooms.title')} subtitle={t('rooms.subtitle')}/>
    {!activeRoomId && <FirstSteps/>}
    {authStatus !== 'signed-in' && <section className="panel room-auth" aria-labelledby="room-auth-heading">
      <LockKeyhole size={24}/><div><h2 id="room-auth-heading">{t('rooms.loginTitle')}</h2><p>{t('rooms.loginBody')}</p></div>
      <button className="btn primary" type="button" onClick={toAccount}>{t('rooms.loginButton')}</button>
    </section>}
    {authStatus === 'signed-in' && !verified && <section className="panel room-auth" role="status">
      <ShieldCheck size={24}/><div><h2>{t('rooms.verifyTitle')}</h2><p>{t('rooms.verifyBody')}</p></div>
      <button className="btn secondary" type="button" onClick={toAccount}>{t('rooms.loginButton')}</button>
    </section>}
    {verified && !activeRoomId && inviteId && <section className="panel room-accept" aria-labelledby="invite-heading">
      <p className="eyebrow">{t('rooms.inviteTitle')}</p>
      <h2 id="invite-heading">{details?.roomTitle || t('rooms.loading')}</h2>
      {loading && <p role="status">{t('rooms.loading')}</p>}
      {details && <form className="room-form" onSubmit={event => void onJoin(event)}>
        <label>{t('rooms.age')}
          <select value={ageBand} onChange={e => {setAgeBand(e.target.value as AgeBand);setGuardian(false);}}>
            {AGE_BANDS.map(age => <option key={age} value={age}>{age === 'adult' ? t('rooms.ageAdult') : t('rooms.ageRange',{range:age})}</option>)}
          </select>
        </label>
        {!roomAllowsAge(details.audience,ageBand) && <p className="feedback wrong">{t('rooms.differentAudience')}</p>}
        {isChild(ageBand) && <><p className="fine-print">{t('rooms.guardianPrivacy')}</p>
          <label className="room-consent"><input type="checkbox" checked={guardian} onChange={e => setGuardian(e.target.checked)} required/>{t('rooms.guardian')}</label></>}
        <div className="button-row"><button className="btn primary" disabled={busy || !roomAllowsAge(details.audience,ageBand) || (isChild(ageBand) && !guardian)}>{t('rooms.join')}</button>
          <button className="btn secondary" type="button" onClick={clearInvitation}>{t('rooms.leave')}</button></div>
      </form>}
    </section>}
    {verified && !activeRoomId && !inviteId && <>
      <section className="room-list-section" aria-label={t('rooms.yourRooms')}>
        <h2>{t('rooms.yourRooms')}</h2>
        {available.length === 0 ? <p className="muted">{t('rooms.emptyRooms')}</p> : <div className="room-card-grid">
          {available.map(item => <article className="panel room-card" key={item.id}>
            <div className="room-card-top"><span className="tag">{t('rooms.' + item.audience)}</span><span className="fine-print">{item.language.toUpperCase()}</span></div>
            <h3>{item.title}</h3><p className="muted">{t('rooms.' + item.status)}</p>
            <button className="btn secondary" type="button" onClick={() => openRoom(item.id)}>{t('rooms.open')}</button>
          </article>)}
        </div>}
      </section>
      <section className="panel room-author" aria-labelledby="new-room-heading">
        <div className="room-author-header"><Users size={23}/><h2 id="new-room-heading">{t('rooms.newRoom')}</h2></div>
        {!canTeach ? <p className="muted">{t('rooms.teacherOnly')}</p> : <form className="room-form" onSubmit={event => void onCreate(event)}>
          <label>{t('rooms.roomTitle')}<input required minLength={6} maxLength={80} placeholder={t('rooms.roomTitlePlaceholder')}
            value={title} onChange={e => setTitle(e.target.value)} /></label>
          <div className="room-form-row"><label>{t('rooms.audience')}<select value={audience} onChange={e => setAudience(e.target.value as RoomAudience)}>
            <option value="children">{t('rooms.children')}</option><option value="adults">{t('rooms.adults')}</option><option value="mixed">{t('rooms.mixed')}</option>
          </select></label><label>{t('rooms.language')}<select value={language} onChange={e => setLanguage(e.target.value as Language)}>
            <option value="es">Español</option><option value="en">English</option><option value="pt">Português</option>
          </select></label></div>
          <button className="btn primary" disabled={busy || title.trim().length < 6}>{t(busy ? 'rooms.creating' : 'rooms.create')}</button>
        </form>}
      </section>
    </>}
    {verified && activeRoomId && <>
      <button className="text-button room-back" type="button" onClick={exitRoom}>{t('rooms.leave')}</button>
      {loading && <p data-testid="room-loading-state" role="status">{t('rooms.loading')}</p>}
      {room && <><section className="panel room-heading-panel">
        <div><p className="eyebrow">{t('rooms.' + room.audience)} · {room.language.toUpperCase()}</p><h2>{room.title}</h2><span className="tag">{t('rooms.' + room.status)}</span></div>
        {membership && !owns && <button className="btn quiet" type="button" disabled={busy}
          onClick={onLeave}>{t('rooms.withdraw')}</button>}
        {owns && room.status === 'active' && <button className="btn quiet" type="button" disabled={busy} onClick={() => {
          if (!window.confirm(t('rooms.closeConfirm'))) return;
          setBusy(true);
          void closeRoom(room.id).then(refresh).catch(() => setError('rooms.error')).finally(() => setBusy(false));
        }}>{t('rooms.close')}</button>}
      </section>
      {owns && room.status === 'active' && <section className="panel room-invitations">
        <h3>{t('rooms.shareLabel')}</h3><p className="muted">{t('rooms.inviteInfo')}</p>
        <button className="btn secondary" type="button" disabled={busy} onClick={() => void onInvite()}>{t(busy ? 'rooms.inviting' : 'rooms.invite')}</button>
        {latestShare && <div className="room-share-actions">
          <label>{t('rooms.shareLabel')}<input readOnly value={invitationUrl(latestShare.id)} onFocus={event => event.target.select()}/></label>
          <div className="button-row">
            <button className="btn primary" type="button" onClick={() => void shareInvite(latestShare.id)}><Share2 size={16}/>{t('rooms.shareAction')}</button>
            <button className="btn secondary" type="button" onClick={() => void copy(latestShare.id)}><Copy size={16}/>{t('rooms.copy')}</button>
          </div>
          <label>{t('rooms.emailRecipient')}<input type="email" value={recipient} placeholder="tutor@example.com" onChange={e => setRecipient(e.target.value)} /></label>
          {mail && <a className="btn secondary" href={mail}><Mail size={16}/>{t('rooms.sendEmail')}</a>}
          <p className="fine-print">{t('rooms.emailHint')}</p>
        </div>}
        {invites.length > 0 && <details className="room-existing-invites"><summary>{t('rooms.existingInvites')} ({invites.length})</summary>
          {invites.map(item => <div key={item.id} className="room-invite-entry"><span>{t('rooms.expires')}: {item.expiresAt.toLocaleDateString(lang)}</span>
            <div className="button-row"><button className="text-button" type="button" onClick={() => void copy(item.id)}>{t('rooms.copy')}</button>
            <button className="text-button" type="button" disabled={busy} onClick={() => onRevokeInvite(item.id)}>{t('rooms.revoke')}</button></div></div>)}
        </details>}
      </section>}
      {owns && <section className="panel room-results"><h3>{t('rooms.teacherResults')} ({memberCount})</h3>
        <p className="muted">{t('rooms.teacherResultsHint')}</p>
        {diagnostics.map(item => { const value = gradeDiagnostic(item.ageBand,item.answers); return <div key={item.uid} className="room-result-row">
          <span>{t('rooms.learner')}: {item.uid.slice(0,6)}…</span><span>{item.ageBand}</span><strong>{value.score} / {value.total}</strong>
        </div>; })}
      </section>}
      <section className="panel room-board" aria-labelledby="room-board-title">
        <div className="room-board-heading"><h3 id="room-board-title">{t('rooms.board')}</h3><p className="muted">{t('rooms.boardDescription')}</p></div>
        {board ? <>
          <div className="room-board-layout"><div className="room-position">
            <PositionBoard fen={board.fen} readOnly={!owns || busy || board.locked || room.status !== 'active'}
              onMove={move => { command({type:'move',uci:move,expectedRevision:board.revision}); return true; }} />
          </div><div className="room-board-side"><span className="tag">{t(board.locked ? 'rooms.boardLocked' : 'rooms.boardUnlocked')}</span>
            <h4>{t('rooms.moves')}</h4><p className="room-moves" aria-live="polite">{board.moves.join(' · ') || '—'}</p>
            {owns && room.status === 'active' && <div className="button-row room-board-controls">
              <button className="btn secondary" type="button" disabled={busy} onClick={() => command({type:'lock',locked:!board.locked,expectedRevision:board.revision})}>{t(board.locked ? 'rooms.unlock' : 'rooms.lock')}</button>
              <button className="btn secondary" type="button" disabled={busy} onClick={() => command({type:'reset',expectedRevision:board.revision})}>{t('rooms.reset')}</button>
            </div>}</div></div>
        </> : <p role="status">{t('rooms.loading')}</p>}
        <p className="fine-print">{t('rooms.notVideo')}</p>
      </section>
      {membership && room.status === 'active' && (!diagnostic ? <section className="panel room-quiz" aria-labelledby="room-quiz-title">
        <p className="eyebrow">{t('rooms.welcome')}</p><h3 id="room-quiz-title">{t('rooms.diagnosticTitle')}</h3><p>{t('rooms.diagnosticIntro')}</p>
        <form onSubmit={event => void onDiagnostic(event)} className="room-form">
          <fieldset className="room-goals"><legend>{t('rooms.goal')}</legend>
            {(['discover','family','compete'] as const).map(value => <label key={value} className="room-radio">
              <input type="radio" name="learning-goal" value={value} checked={goal === value} onChange={() => setGoal(value)}/>{t('rooms.goal' + value.charAt(0).toUpperCase() + value.slice(1))}
            </label>)}
          </fieldset>
          {questions.map((question,index) => <fieldset className="room-question" key={question.id}>
            <legend>{t('rooms.question')} {index+1} {t('rooms.of')} {questions.length}. {question.prompt[lang]}</legend>
            {question.options.map((option,i) => { const value = (['a','b','c'] as const)[i]; return <label key={value} className="room-radio">
              <input type="radio" name={'diagnostic-' + question.id} value={value} checked={answers[question.id] === value}
                onChange={() => setAnswers(previous => ({...previous,[question.id]:value}))}/>{option[lang]}
            </label>; })}
          </fieldset>)}
          <p className="fine-print">{t('rooms.diagnosticNote')}</p>
          <button className="btn primary" disabled={busy || Object.keys(answers).length !== questions.length}>{t('rooms.submitDiagnostic')}</button>
        </form>
      </section> : <section className="panel room-diagnostic-done" role="status">
        <CheckCircle2 size={26}/><div><h3>{t('rooms.diagnosticDone')}</h3>
          <p>{t('rooms.score')}: {score?.score} / {score?.total}</p>
          <p>{t(score?.route === 'bridge' ? 'rooms.bridge' : 'rooms.foundation')}</p>
          <p className="fine-print">{t('rooms.diagnosticNote')}</p></div>
      </section>)}
      </>}
    </>}
    {error && <p role="alert" className="feedback wrong">{t(error)}</p>}
    {message && <p role="status" className="feedback success">{t(message)}</p>}
  </div>;
}
