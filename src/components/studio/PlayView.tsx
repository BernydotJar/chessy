import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChessBoard } from '../ChessBoard';
import { AIOpponent } from '../AIOpponent';
import { GameControls } from '../GameControls';
import { MoveHistory } from '../MoveHistory';
import { CoachInsights } from '../CoachInsights';
import { ChessGlossary } from '../ChessGlossary';
import { BoardSetupPanel } from '../BoardSetupPanel';
import { BoardSetupButton } from '../BoardSetupButton';
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
    if (!game.isAIGame && game.history.length === 1 && !localStarted.current) {
      localStarted.current = true;
      track('game_start', { opponent: 'local' });
    }
    if (game.history.length === 0) localStarted.current = false;
  }, [game.history.length, game.isAIGame, track]);

  useEffect(() => {
    if (!game.isGameOver) { if (game.history.length === 0) completedSignature.current = ''; return; }
    if (game.history.length === 0) return;
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
    });
  }, [game.aiDifficulty, game.chess, game.endReason, game.history.length, game.isAIGame, game.isGameOver, game.playerColor, game.winner, track]);

  const startAI = (difficulty: DifficultyLevel, color: 'white' | 'black' | 'random') => {
    track('game_start', { opponent: 'stockfish', difficulty, player_color: color });
    game.startAIGame(difficulty, color);
  };

  return <div className="view-enter play-view-v2">
    <SectionHeading eyebrow={t('studio.play')} title={t('studio.playTitle')} subtitle={t('studio.playSubtitle')}/>
    <div className={`play-layout ${game.setupMode ? 'setup-layout' : ''}`}>
      <div className="play-board-area">
        <div className="play-board-frame"><ChessBoard/></div>
      </div>
      <div className="play-controls">{game.setupMode ? <BoardSetupPanel/> : <><AIOpponent onStartGame={startAI} isPlaying={game.isAIGame}/><GameControls/></>}</div>
    </div>
    {!game.setupMode && <section className="play-toolbelt" aria-label={t('studio.playTools')}>
      <details className="panel play-tool"><summary><span><ChessyIcon name="games" size={18}/><strong>{t('studio.moveHistory')}</strong></span><small>{game.history.length}</small></summary><div className="play-tool-content"><MoveHistory/></div></details>
      <details className="panel play-tool"><summary><span><ChessyIcon name="settings" size={18}/><strong>{t('studio.gameTools')}</strong></span></summary><div className="play-tool-content play-game-tools"><MoveEntry disabled={game.isGameOver || game.isAIThinking} onMove={move => game.makeMove(move.slice(0,2), move.slice(2,4), move[4])}/><GameFiles/><BoardSetupButton/></div></details>
      <details className="panel play-tool"><summary><span><ChessyIcon name="hint" size={18}/><strong>{t('studio.coachTools')}</strong></span></summary><div className="play-tool-content"><CoachInsights/><ChessGlossary/></div></details>
    </section>}
  </div>;
}
