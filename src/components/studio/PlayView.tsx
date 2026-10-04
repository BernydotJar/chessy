import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChessBoard } from '../ChessBoard';
import { AIOpponent } from '../AIOpponent';
import { GameControls } from '../GameControls';
import { MoveHistory } from '../MoveHistory';
import { MatchPlayerBar } from '../MatchPlayerBar';
import { CoachInsights } from '../CoachInsights';
import { ChessGlossary } from '../ChessGlossary';
import { BoardSetupPanel } from '../BoardSetupPanel';
import { BoardSetupButton } from '../BoardSetupButton';
import { ExerciseView } from '../ExerciseView';
import { GameFiles } from './GameFiles';
import { MoveEntry, SectionHeading } from './Shared';
import { ChessyIcon } from '../../design/icons';
import { useGameStore } from '../../store/gameStore';
import { useAnalyticsStore } from '../../analytics/store';
import type { DifficultyLevel } from '../../utils/stockfishService';

export function PlayView() {
  const { t } = useTranslation();
  const game = useGameStore();
  const track = useAnalyticsStore((state) => state.track);
  const localStarted = useRef(false);
  const completedSignature = useRef('');

  useEffect(() => {
    if (!game.clockStarted || game.isGameOver) return;
    const timer = window.setInterval(() => useGameStore.getState().tickClock(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [game.clockStarted, game.isGameOver]);

  useEffect(() => {
    if (!game.curriculumSession && !game.isAIGame && game.history.length === 1 && !localStarted.current) {
      localStarted.current = true;
      track('game_start', { opponent: 'local', time_control: game.timeControlId });
    }
    if (game.history.length === 0) localStarted.current = false;
  }, [game.curriculumSession, game.history.length, game.isAIGame, game.timeControlId, track]);

  useEffect(() => {
    if (game.curriculumSession) return;
    if (!game.isGameOver) { if (game.history.length === 0) completedSignature.current = ''; return; }
    if (game.history.length === 0 && game.endReason !== 'timeout') return;
    const signature = `${game.history.length}:${game.winner}:${game.endReason ?? 'board'}`;
    if (completedSignature.current === signature) return;
    completedSignature.current = signature;
    const result = game.isAIGame
      ? game.winner === 'draw' ? 'draw' : game.winner === game.playerColor ? 'win' : 'loss'
      : game.winner === 'draw' ? 'draw' : `${game.winner}_win`;
    track('game_complete', {
      opponent: game.isAIGame ? 'stockfish' : 'local',
      ...(game.isAIGame ? { difficulty: game.aiDifficulty } : {}),
      result,
      move_count: game.history.length,
      end_reason: game.endReason ?? (game.chess.isCheckmate() ? 'checkmate' : 'board'),
      time_control: game.timeControlId,
    });
  }, [game.aiDifficulty, game.chess, game.curriculumSession, game.endReason, game.history.length, game.isAIGame, game.isGameOver, game.playerColor, game.timeControlId, game.winner, track]);

  const startAI = (difficulty: DifficultyLevel, color: 'white' | 'black' | 'random') => {
    track('game_start', { opponent: 'stockfish', difficulty, player_color: color, time_control: game.timeControlId });
    game.startAIGame(difficulty, color);
  };
  const bottomColor: 'white' | 'black' = game.isAIGame ? game.playerColor : 'white';
  const topColor: 'white' | 'black' = bottomColor === 'white' ? 'black' : 'white';

  return <div className="view-enter play-view-v3">
    <SectionHeading eyebrow={t(game.curriculumSession ? 'curriculum.eyebrow' : 'studio.play')} title={t(game.curriculumSession ? 'curriculum.playTitle' : 'studio.playTitle')} subtitle={t(game.curriculumSession ? 'curriculum.playSubtitle' : 'studio.playSubtitle')}/>
    <div className={`match-cockpit ${game.setupMode ? 'setup-layout' : ''}`}>
      <section className="match-stage" aria-label={t('match.boardStage')}>
        {!game.setupMode && <MatchPlayerBar color={topColor}/>}
        <div className="play-board-frame"><ChessBoard/></div>
        {!game.setupMode && <MatchPlayerBar color={bottomColor}/>}
      </section>
      <aside className="match-rail" aria-label={t('match.matchRail')}>
        {game.setupMode ? <BoardSetupPanel/> : <>
          {game.curriculumSession ? <ExerciseView/> : <>
            {!game.isGameOver && (game.history.length === 0 || game.isAIGame) && <AIOpponent onStartGame={startAI} isPlaying={game.isAIGame}/>}
            <GameControls/>
          </>}
          <section className="panel match-moves-panel" aria-labelledby="match-moves-title">
            <header><div><p className="eyebrow">{t('match.scoreSheet')}</p><h2 id="match-moves-title">{t('studio.moveHistory')}</h2></div><span className="move-count">{game.history.length}</span></header>
            <MoveHistory/>
          </section>
          {game.isGameOver && !game.curriculumSession && <section className="panel match-result-files" aria-label={t('match.keepGame')}><p className="eyebrow">{t('match.keepGame')}</p><GameFiles/></section>}
        </>}
      </aside>
    </div>
    {!game.setupMode && !game.curriculumSession && <section className="play-toolbelt play-toolbelt-v3" aria-label={t('studio.playTools')}>
      <details className="panel play-tool"><summary><span><ChessyIcon name="settings" size={18}/><strong>{t('studio.gameTools')}</strong></span></summary><div className="play-tool-content play-game-tools"><MoveEntry disabled={game.isGameOver || game.isAIThinking} onMove={move => game.makeMove(move.slice(0,2), move.slice(2,4), move[4])}/><GameFiles/><BoardSetupButton/></div></details>
      <details className="panel play-tool"><summary><span><ChessyIcon name="hint" size={18}/><strong>{t('studio.coachTools')}</strong></span></summary><div className="play-tool-content"><CoachInsights/><ChessGlossary/></div></details>
    </section>}
  </div>;
}
