import React, { useMemo, useState } from 'react';
import { X, LayoutGrid, Eraser } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../store/gameStore';

type SetupPiece =
  | 'wK' | 'wQ' | 'wR' | 'wB' | 'wN' | 'wP'
  | 'bK' | 'bQ' | 'bR' | 'bB' | 'bN' | 'bP'
  | null;

const pieceSymbols: Record<Exclude<SetupPiece, null>, string> = {
  wK: '♔',
  wQ: '♕',
  wR: '♖',
  wB: '♗',
  wN: '♘',
  wP: '♙',
  bK: '♚',
  bQ: '♛',
  bR: '♜',
  bB: '♝',
  bN: '♞',
  bP: '♟',
};

export const BoardSetupPanel: React.FC = () => {
  const { t } = useTranslation();
  const {
    setupMode,
    setSetupMode,
    setupSelectedPiece,
    setSetupSelectedPiece,
    setupSideToMove,
    setSetupSideToMove,
    clearSetupBoard,
    applySetupBoard,
    loadSetupExample,
  } = useGameStore();
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const examples = t('setup.examples', { returnObjects: true }) as Array<{ label: string; fen: string }>;

  const palette = useMemo(
    () => (['wK', 'wQ', 'wR', 'wB', 'wN', 'wP', 'bK', 'bQ', 'bR', 'bB', 'bN', 'bP'] as SetupPiece[])
      .filter(Boolean)
      .map((code) => ({
        code: code as Exclude<SetupPiece, null>,
        symbol: pieceSymbols[code as Exclude<SetupPiece, null>],
      })),
    []
  );

  if (!setupMode) return null;

  const handleApply = () => {
    const result = applySetupBoard();
    if (!result.ok) {
      setErrorKey(result.error || 'invalid');
      return;
    }
    setErrorKey(null);
  };

  return (
    <div className="glass-card rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between text-white font-semibold text-lg">
        <div className="flex items-center gap-2">
          <LayoutGrid size={20} />
          <span>{t('setup.title')}</span>
        </div>
        <button
          onClick={() => setSetupMode(false)}
          className="glass-button glass-button--subtle p-2 rounded-lg text-white"
          aria-label={t('setup.close')}
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-white font-semibold mb-2">{t('setup.palette')}</p>
          <div className="grid grid-cols-6 gap-2">
            {palette.map((piece) => (
              <button
                key={piece.code}
                onClick={() => setSetupSelectedPiece(piece.code)}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData('text/plain', piece.code);
                }}
                className={`glass-button glass-button--subtle px-2 py-2 rounded-lg text-lg ${
                  setupSelectedPiece === piece.code ? 'setup-choice-selected' : ''
                }`}
              >
                {piece.symbol}
              </button>
            ))}
            <button
              onClick={() => setSetupSelectedPiece(null)}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData('text/plain', 'erase');
              }}
              className={`glass-button glass-button--subtle px-2 py-2 rounded-lg text-xs text-white ${
                setupSelectedPiece === null ? 'setup-choice-selected' : ''
              }`}
            >
              <span className="flex items-center justify-center gap-1">
                <Eraser size={14} />
                {t('setup.erase')}
              </span>
            </button>
          </div>
          <p className="text-white/70 text-xs mt-2">
            {t('setup.selected', {
              piece: setupSelectedPiece ? pieceSymbols[setupSelectedPiece as Exclude<SetupPiece, null>] : t('setup.erase'),
            })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-white/80 text-sm">{t('setup.side')}</label>
          <select
            value={setupSideToMove}
            onChange={(e) => setSetupSideToMove(e.target.value as 'w' | 'b')}
            className="glass-button glass-button--subtle px-3 py-2 rounded-lg text-white text-sm"
          >
            <option value="w">{t('colors.white')}</option>
            <option value="b">{t('colors.black')}</option>
          </select>
        </div>

        <div className="glass-container rounded-lg p-3 space-y-2">
          <p className="text-white font-semibold">{t('setup.examplesTitle')}</p>
          <div className="space-y-2">
            {examples.map((example) => (
              <button
                key={example.label}
                onClick={() => loadSetupExample(example.fen)}
                className="glass-button glass-button--subtle w-full px-3 py-2 rounded-lg text-white text-sm text-left"
              >
                {example.label}
              </button>
            ))}
          </div>
        </div>

        {errorKey && (
          <p className="setup-error text-sm">
            {t(`setup.errors.${errorKey}`)}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={handleApply}
            className="glass-button w-full px-4 py-3 rounded-lg text-white font-semibold"
          >
            {t('setup.apply')}
          </button>
          <button
            onClick={() => {
              clearSetupBoard();
              setErrorKey(null);
            }}
            className="glass-button glass-button--subtle w-full px-4 py-2 rounded-lg text-white text-sm"
          >
            {t('setup.clear')}
          </button>
          <button
            onClick={() => setSetupMode(false)}
            className="glass-button glass-button--subtle w-full px-4 py-2 rounded-lg text-white text-sm"
          >
            {t('setup.exit')}
          </button>
        </div>
      </div>
    </div>
  );
};
