import React from 'react';
import { Crown, Castle, Circle, Triangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  if (!isOpen) return null;

  const pieces: Array<{ type: 'q' | 'r' | 'b' | 'n'; name: string; icon: React.ReactNode; key: string }> = [
    { type: 'q', name: t('promotion.queen'), icon: <Crown size={48} />, key: 'Q' },
    { type: 'r', name: t('promotion.rook'), icon: <Castle size={48} />, key: 'R' },
    { type: 'b', name: t('promotion.bishop'), icon: <Triangle size={48} />, key: 'B' },
    { type: 'n', name: t('promotion.knight'), icon: <Circle size={48} />, key: 'N' },
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
          {t('promotion.title')}
        </h2>
        <p className="text-white/70 text-sm text-center mb-6">
          {t('promotion.promoting', { color: color === 'w' ? t('colors.white') : t('colors.black') })}
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
                <div className="text-sm text-white/60">{t('promotion.pressKey', { key: piece.key })}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="text-center">
          <p className="text-white/60 text-sm">
            {t('promotion.clickOrPress')}
          </p>
          <button
            onClick={onClose}
            className="mt-4 text-white/40 hover:text-white/80 text-sm transition-colors"
          >
            {t('promotion.esc')}
          </button>
        </div>
      </div>
    </div>
  );
};
