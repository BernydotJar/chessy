import { FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CoachSession } from '../../coach/model';
import {
  initializeClassroomBoard, submitInstructorBoardCommand,
  subscribeToClassroomBoard, type ClassroomBoardSnapshot,
} from '../../coach/liveBoardCloud';
import { applyInstructorCommand, type ClassroomCommand } from '../../coach/classroomBoard';
import { PositionBoard } from './Shared';

type BoardCommand = ClassroomCommand extends infer C
  ? C extends { expectedRevision: number } ? Omit<C, 'expectedRevision'> : never
  : never;

export function CoachLiveBoard({
  session, canTeach, userUid,
}: {
  session: CoachSession;
  canTeach: boolean;
  userUid: string | null;
}) {
  const { t } = useTranslation();
  const [board, setBoard] = useState<ClassroomBoardSnapshot | null>(null);
  const [loading, setLoading] = useState(Boolean(userUid));
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [move, setMove] = useState('');
  const [fen, setFen] = useState('');

  useEffect(() => {
    let active = true;
    let dispose: (() => void) | null = null;
    setBoard(null);
    setProblem(null);
    setLoading(Boolean(userUid));
    if (userUid) {
      void subscribeToClassroomBoard(session.id, snapshot => {
        if (!active) return;
        setBoard(snapshot);
        setLoading(false);
        setProblem(null);
      }, error => {
        if (!active) return;
        // Do not retain previously received class positions after access revocation.
        setBoard(null);
        setLoading(false);
        setProblem((error as { code?: string }).code === 'permission-denied'
          ? 'boardAccessDenied' : 'boardError');
      }).then(unsubscribe => {
        if (active) dispose = unsubscribe;
        else unsubscribe();
      }).catch(() => {
        if (active) { setLoading(false); setProblem('boardError'); }
      });
    }
    return () => { active = false; dispose?.(); };
  }, [session.id, userUid]);

  const execute = async (partial: BoardCommand) => {
    if (!board || !userUid || !canTeach || busy) return false;
    const command = { ...partial, expectedRevision: board.revision } as ClassroomCommand;
    try {
      // Validate locally before sending; Firestore is still the commit authority.
      applyInstructorCommand(board, command);
      setBusy(true);
      setProblem(null);
      await submitInstructorBoardCommand(userUid, session.id, command);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      setProblem(message.includes('revision') || message.includes('conflict')
        ? 'boardStale' : message.includes('illegal') || message.includes('invalid')
        ? 'boardInvalidMove' : 'boardError');
      return false;
    } finally { setBusy(false); }
  };

  const submitMove = async (event: FormEvent) => {
    event.preventDefault();
    if (await execute({ type:'move', uci:move.toLowerCase().trim() })) setMove('');
  };

  const initialize = async () => {
    if (!canTeach || !userUid || busy) return;
    setBusy(true);
    setProblem(null);
    try { await initializeClassroomBoard(userUid, session.id); }
    catch { setProblem('boardError'); }
    finally { setBusy(false); }
  };

  return <section className="coach-live-board" aria-label={t('classes.boardTitle')}>
    <div className="coach-live-board-head">
      <h3>{t('classes.boardTitle')}</h3>
      <span className="tag">{t(canTeach ? 'classes.boardInstructor' : 'classes.boardObserver')}</span>
    </div>
    {!userUid && <p className="muted" role="status">{t('classes.signInToJoin')}</p>}
    {loading && <p className="muted" role="status">{t('classes.loading')}</p>}
    {problem && <p className="feedback wrong" role="alert">{t('classes.' + problem)}</p>}
    {userUid && !loading && !board && !problem && <div className="coach-board-empty">
      <p className="muted">{t('classes.boardWaiting')}</p>
      {canTeach && <button type="button" className="btn primary" disabled={busy}
        onClick={() => void initialize()}>{t('classes.boardStart')}</button>}
    </div>}
    {board && <div className="coach-board-layout">
      <div className="coach-board-stage">
        <PositionBoard fen={board.fen} readOnly={!canTeach || busy || board.locked}
          onMove={uci => {
            if (canTeach && !busy && !board.locked) {
              void execute({ type:'move', uci });
            }
            return false; // No optimistic mutation; remote transaction is authoritative.
          }}/>
        <div className="coach-board-facts">
          <span>{t('classes.boardRevision')}: {board.revision}</span>
          <span>{t(board.locked ? 'classes.boardLocked' : 'classes.boardOpen')}</span>
        </div>
      </div>
      <div className="coach-board-controls">
        <p className="muted">{t('classes.boardMoveHistory')}</p>
        <p className="coach-board-notation">{board.moves.length ? board.moves.slice(-18).join(' · ') : '—'}</p>
        {canTeach && <>
          <form onSubmit={event => void submitMove(event)} className="coach-board-move-form">
            <label htmlFor={'coach-uci-'+session.id}>{t('classes.boardMoveInput')}</label>
            <div className="button-row">
              <input id={'coach-uci-'+session.id} value={move} onChange={event => setMove(event.target.value)}
                maxLength={5} placeholder="e2e4" autoComplete="off" disabled={busy || board.locked}/>
              <button className="btn primary" disabled={busy || board.locked || move.trim().length < 4}>
                {t('studio.submit')}
              </button>
            </div>
          </form>
          <div className="button-row">
            <button type="button" className="btn secondary" disabled={busy}
              onClick={() => void execute({ type:'lock', locked:!board.locked })}>
              {t(board.locked ? 'classes.boardUnlock' : 'classes.boardLock')}
            </button>
            <button type="button" className="btn secondary" disabled={busy}
              onClick={() => void execute({ type:'reset' })}>{t('classes.boardReset')}</button>
          </div>
          <form className="coach-board-position-form" onSubmit={event => {
            event.preventDefault();
            void execute({ type:'set-position', fen:fen.trim() }).then(ok => { if (ok) setFen(''); });
          }}>
            <label htmlFor={'coach-fen-'+session.id}>{t('classes.boardSetPosition')}</label>
            <input id={'coach-fen-'+session.id} value={fen} maxLength={100} disabled={busy}
              onChange={event => setFen(event.target.value)} placeholder="FEN"/>
            <button className="btn secondary" disabled={busy || fen.trim().length < 12}>
              {t('classes.boardApplyPosition')}
            </button>
          </form>
        </>}
      </div>
    </div>}
  </section>;
}
