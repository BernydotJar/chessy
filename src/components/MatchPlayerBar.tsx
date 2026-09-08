import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChessyIcon } from '../design/icons';
import { formatClock } from '../game/timeControls';
import { useGameStore } from '../store/gameStore';

type PlayerColor = 'white' | 'black';

const pieceSymbols: Record<string, string> = { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' };

export function MatchPlayerBar({ color }: { color: PlayerColor }) {
  const { t } = useTranslation();
  const game = useGameStore();
  const side = color === 'white' ? 'w' : 'b';
  const isHuman = game.isAIGame ? game.playerColor === color : true;
  const isEngine = game.isAIGame && !isHuman;
  const active = !game.isGameOver && game.chess.turn() === side;
  const remaining = color === 'white' ? game.whiteTimeMs : game.blackTimeMs;
  const captured = game.capturedPieces[color];
  const low = remaining !== null && remaining <= 30_000;
  const flagged = game.isGameOver && game.endReason === 'timeout' && remaining === 0;
  const thinking = isEngine && game.isAIThinking;
  const name = isEngine
    ? t('match.stockfish', { level: t(`ai.difficultyLevels.${game.aiDifficulty}.label`) })
    : game.isAIGame
      ? t('match.you')
      : t(color === 'white' ? 'match.localWhite' : 'match.localBlack');
  const subtitle = isEngine ? t('match.engine') : game.isAIGame ? t('match.youPlay', { color: t(`colors.${color}`) }) : t(`colors.${color}`);
  const capturedLabel = useMemo(() => captured.map((piece) => pieceSymbols[piece] ?? '').join(' '), [captured]);

  return <div
    className={`match-player-bar ${active ? 'is-active' : ''} ${thinking ? 'is-thinking' : ''}`}
    data-player-color={color}
    data-clock-low={low || undefined}
    data-clock-flagged={flagged || undefined}
  >
    <div className={`match-player-avatar ${color}`} aria-hidden="true">
      {isEngine ? <ChessyIcon name="engine" size={18}/> : <ChessyIcon name="profile" size={18}/>}
    </div>
    <div className="match-player-copy">
      <div className="match-player-name"><strong>{name}</strong>{active && <span className="turn-indicator">{thinking ? t('match.thinking') : t('match.toMove')}</span>}</div>
      <span>{subtitle}</span>
    </div>
    <div className="match-captured" role="img" aria-label={t('match.capturedCount', { count: captured.length })} title={t('match.capturedCount', { count: captured.length })}>
      {capturedLabel || <span aria-hidden="true">—</span>}
    </div>
    <div className={`match-clock ${active ? 'is-active' : ''} ${low ? 'is-low' : ''} ${flagged ? 'is-flagged' : ''}`} aria-label={t('match.clockFor', { player: name, time: formatClock(remaining) })}>
      <ChessyIcon name="timer" size={16}/>
      <span>{formatClock(remaining)}</span>
    </div>
  </div>;
}
