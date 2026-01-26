import React from 'react';
import { Crown, Castle, Circle, Triangle } from 'lucide-react';

interface PromotionDialogProps {
  isOpen: boolean;
  color: 'w' | 'b';
  onSelect: (piece: 'q' | 'r' | 'b' | 'n') => void;
  onClose: () => void;
}

export const PromotionDialog: React.FC<PromotionDialogProps> = ({
  isOpen,
  color,
  onSelect,
  onClose,
}) => {
  if (!isOpen) return null;

  const pieces: Array<{ type: 'q' | 'r' | 'b' | 'n'; name: string; icon: React.ReactNode; key: string }> = [
    { type: 'q', name: 'Queen', icon: <Crown size={48} />, key: 'Q' },
    { type: 'r', name: 'Rook', icon: <Castle size={48} />, key: 'R' },
    { type: 'b', name: 'Bishop', icon: <Triangle size={48} />, key: 'B' },
    { type: 'n', name: 'Knight', icon: <Circle size={48} />, key: 'N' },
  ];

  const handleSelect = (piece: 'q' | 'r' | 'b' | 'n') => {
    onSelect(piece);
    onClose();
  };

  // Keyboard shortcuts
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      const piece = pieces.find(p => p.key === key);
      if (piece) {
        handleSelect(piece.type);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="glass-card rounded-2xl p-8 max-w-lg w-full mx-4 animate-slide-up">
        <h2 className="text-2xl font-bold text-white text-center mb-2">
          Choose Promotion Piece
        </h2>
        <p className="text-white/70 text-sm text-center mb-6">
          Promoting {color === 'w' ? 'White' : 'Black'}
        </p>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          {pieces.map((piece) => (
            <button
              key={piece.type}
              onClick={() => handleSelect(piece.type)}
              className="glass-button p-6 rounded-xl text-white hover:scale-105 transition-all group"
              aria-label={`Promote to ${piece.name}`}
            >
              <div className="flex flex-col items-center gap-3">
                <div className="group-hover:animate-glow">
                  {piece.icon}
                </div>
                <div className="text-lg font-semibold">{piece.name}</div>
                <div className="text-sm text-white/60">Press {piece.key}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="text-center">
          <p className="text-white/60 text-sm">
            Click a piece or press the keyboard shortcut
          </p>
          <button
            onClick={onClose}
            className="mt-4 text-white/40 hover:text-white/80 text-sm transition-colors"
          >
            Press ESC to cancel
          </button>
        </div>
      </div>
    </div>
  );
};
