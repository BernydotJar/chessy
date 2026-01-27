import React from 'react';
import { LayoutGrid } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../store/gameStore';

export const BoardSetupButton: React.FC = () => {
  const { t } = useTranslation();
  const { setSetupMode } = useGameStore();

  return (
    <button
      onClick={() => setSetupMode(true)}
      className="glass-button glass-button--subtle w-full px-4 py-3 rounded-lg text-white font-medium flex items-center justify-center gap-2"
    >
      <LayoutGrid size={18} />
      <span>{t('setup.button')}</span>
    </button>
  );
};
