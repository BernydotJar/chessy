import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../store/gameStore';

type PieceCode = 'wK' | 'wQ' | 'wR' | 'wB' | 'wN' | 'wP' | 'bK' | 'bQ' | 'bR' | 'bB' | 'bN' | 'bP';

const pieceSymbols: Record<PieceCode, string> = {
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

const pieceToFen: Record<PieceCode, string> = {
  wK: 'K',
  wQ: 'Q',
  wR: 'R',
  wB: 'B',
  wN: 'N',
  wP: 'P',
  bK: 'k',
  bQ: 'q',
  bR: 'r',
  bB: 'b',
  bN: 'n',
  bP: 'p',
};

const fenToPiece: Record<string, PieceCode> = {
  K: 'wK',
  Q: 'wQ',
  R: 'wR',
  B: 'wB',
  N: 'wN',
  P: 'wP',
  k: 'bK',
  q: 'bQ',
  r: 'bR',
  b: 'bB',
  n: 'bN',
  p: 'bP',
};

const createEmptyBoard = () => Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null as PieceCode | null));

const parseFenBoard = (fen: string) => {
  const board = createEmptyBoard();
  const boardPart = fen.split(' ')[0];
  const rows = boardPart.split('/');
  rows.forEach((row, rowIndex) => {
    let col = 0;
    for (const char of row) {
      if (/\d/.test(char)) {
        col += parseInt(char, 10);
      } else {
        board[rowIndex][col] = fenToPiece[char];
        col += 1;
      }
    }
  });
  return board;
};

const boardToFen = (board: Array<Array<PieceCode | null>>) => {
  return board
    .map((row) => {
      let empty = 0;
      let fenRow = '';
      row.forEach((cell) => {
        if (!cell) {
          empty += 1;
          return;
        }
        if (empty > 0) {
          fenRow += empty;
          empty = 0;
        }
        fenRow += pieceToFen[cell];
      });
      if (empty > 0) fenRow += empty;
      return fenRow;
    })
    .join('/');
};

export const BoardSetupModal: React.FC = () => {
  const { t } = useTranslation();
  const { fen, loadGame, setupMode, setSetupMode } = useGameStore();
  const [board, setBoard] = useState<Array<Array<PieceCode | null>>>(createEmptyBoard());
  const [selected, setSelected] = useState<PieceCode | null>('wP');
  const [sideToMove, setSideToMove] = useState<'w' | 'b'>('w');
  const [error, setError] = useState('');

  const examples = t('setup.examples', { returnObjects: true }) as Array<{ label: string; fen: string }>;

  useEffect(() => {
    if (!setupMode) return;
    setBoard(parseFenBoard(fen));
    setSideToMove(fen.split(' ')[1] === 'b' ? 'b' : 'w');
    setError('');
  }, [fen, setupMode]);

  const handleSquareClick = (rowIndex: number, colIndex: number) => {
    setBoard((prev) => {
      const next = prev.map((row) => row.slice());
      next[rowIndex][colIndex] = selected;
      return next;
    });
  };

  const handleClear = () => {
    setBoard(createEmptyBoard());
    setError('');
  };

  const handleApply = () => {
    const flat = board.flat();
    const hasWhiteKing = flat.includes('wK');
    const hasBlackKing = flat.includes('bK');
    if (!hasWhiteKing || !hasBlackKing) {
      setError(t('setup.errors.kings'));
      return;
    }
    const boardFen = boardToFen(board);
    const fenString = `${boardFen} ${sideToMove} - - 0 1`;
    try {
      loadGame(fenString);
      setIsOpen(false);
    } catch {
      setError(t('setup.errors.invalid'));
    }
  };

  const palette = useMemo(() => {
    return (['wK', 'wQ', 'wR', 'wB', 'wN', 'wP', 'bK', 'bQ', 'bR', 'bB', 'bN', 'bP'] as PieceCode[])
      .map((code) => ({
        code,
        symbol: pieceSymbols[code],
      }));
  }, []);

  if (!setupMode) return null;

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm rounded-xl">
      <div className="glass-card rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto glass-scrollbar animate-slide-up">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">{t('setup.title')}</h2>
          <button
            onClick={() => setSetupMode(false)}
            className="glass-button p-2 rounded-lg text-white hover:bg-white/20"
            aria-label={t('setup.close')}
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
          <div>
            <div className="board-setup-grid mb-4">
              {board.map((row, rowIndex) =>
                row.map((cell, colIndex) => {
                  const isLight = (rowIndex + colIndex) % 2 === 0;
                  return (
                    <button
                      key={`${rowIndex}-${colIndex}`}
                      onClick={() => handleSquareClick(rowIndex, colIndex)}
                      className={`board-setup-square ${isLight ? 'board-setup-square--light' : 'board-setup-square--dark'}`}
                    >
                      {cell ? pieceSymbols[cell] : ''}
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex items-center gap-3">
              <label className="text-white/80 text-sm">{t('setup.side')}</label>
              <select
                value={sideToMove}
                onChange={(e) => setSideToMove(e.target.value as 'w' | 'b')}
                className="glass-button glass-button--subtle px-3 py-2 rounded-lg text-white text-sm"
              >
                <option value="w">{t('colors.white')}</option>
                <option value="b">{t('colors.black')}</option>
              </select>
            </div>

            {error && <p className="text-red-300 text-sm mt-3">{error}</p>}
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-white font-semibold mb-2">{t('setup.palette')}</p>
              <div className="grid grid-cols-6 gap-2">
                {palette.map((piece) => (
                  <button
                    key={piece.code}
                    onClick={() => setSelected(piece.code)}
                    className={`glass-button glass-button--subtle px-2 py-2 rounded-lg text-lg ${
                      selected === piece.code ? 'ring-2 ring-white/50' : ''
                    }`}
                  >
                    {piece.symbol}
                  </button>
                ))}
                <button
                  onClick={() => setSelected(null)}
                  className={`glass-button glass-button--subtle px-2 py-2 rounded-lg text-xs text-white ${
                    selected === null ? 'ring-2 ring-white/50' : ''
                  }`}
                >
                  {t('setup.erase')}
                </button>
              </div>
            </div>

            <div className="glass-container rounded-lg p-3 space-y-2">
              <p className="text-white font-semibold">{t('setup.examplesTitle')}</p>
              <div className="space-y-2">
                {examples.map((example) => (
                  <button
                    key={example.label}
                    onClick={() => {
                      setBoard(parseFenBoard(example.fen));
                      setSideToMove(example.fen.split(' ')[1] === 'b' ? 'b' : 'w');
                      setError('');
                    }}
                    className="glass-button glass-button--subtle w-full px-3 py-2 rounded-lg text-white text-sm text-left"
                  >
                    {example.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleApply}
                className="glass-button w-full px-4 py-3 rounded-lg text-white font-semibold bg-gradient-to-r from-blue-500/20 to-purple-500/20"
              >
                {t('setup.apply')}
              </button>
              <button
                onClick={handleClear}
                className="glass-button glass-button--subtle w-full px-4 py-2 rounded-lg text-white text-sm"
              >
                {t('setup.clear')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
