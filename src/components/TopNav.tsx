import React from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutGrid, ListChecks, BarChart2, PlayCircle } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

const navItems = [
  { id: 'play', icon: PlayCircle, key: 'nav.play' },
  { id: 'games', icon: ListChecks, key: 'nav.games' },
  { id: 'review', icon: BarChart2, key: 'nav.review' },
  { id: 'analysis', icon: LayoutGrid, key: 'nav.analysis' },
] as const;

export const TopNav: React.FC = () => {
  const { t } = useTranslation();
  const { view, setView } = useGameStore();

  return (
    <div className="glass-container rounded-full px-3 py-2 inline-flex items-center gap-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = view === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`glass-button px-3 py-2 rounded-full text-xs font-semibold flex items-center gap-2 ${
              active ? 'bg-white/20 ring-1 ring-white/40' : 'glass-button--subtle'
            }`}
          >
            <Icon size={14} />
            <span>{t(item.key)}</span>
          </button>
        );
      })}
    </div>
  );
};
