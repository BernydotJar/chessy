import React, { useEffect, useMemo, useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { ChessyIcon } from '../design/icons';
import { useTranslation } from 'react-i18next';
import { GameRecord, getAllGames } from '../utils/gamesDb';
import { useGameStore } from '../store/gameStore';

const resultColor = (result: GameRecord['result']) => `game-result game-result--${result}`;

export const GamesHub: React.FC = () => {
  const { t } = useTranslation();
  const { setView, setActiveGameId, loadPgn } = useGameStore();
  const [loadError, setLoadError] = useState(false);
  const [games, setGames] = useState<GameRecord[]>([]);
  const [query, setQuery] = useState('');
  const [color, setColor] = useState<'all' | 'white' | 'black'>('all');
  const [result, setResult] = useState<'all' | 'win' | 'loss' | 'draw' | 'ongoing'>('all');
  const [timeControl, setTimeControl] = useState<'all' | 'Blitz' | 'Rapid' | 'Classical'>('all');

  useEffect(() => {
    const load = async () => {
      const existing = await getAllGames();
      setGames(existing);
    };
    void load().catch(() => setLoadError(true));
  }, []);

  const filtered = useMemo(() => {
    return games.filter((game) => {
      if (color !== 'all' && game.color !== color) return false;
      if (result !== 'all' && game.result !== result) return false;
      if (timeControl !== 'all' && !game.timeControl.startsWith(timeControl)) return false;
      if (query && !`${game.opponent} ${game.timeControl}`.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [games, color, result, timeControl, query]);

  const openGame = (game: GameRecord, target: 'review' | 'analysis' | 'play') => {
    loadPgn(game.pgn);
    setActiveGameId(game.id);
    setView(target);
  };

  return (
    <div className="glass-card rounded-xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-lg">{t('games.title')}</h3>
        <span className="text-white/60 text-xs">{t('games.count', { count: filtered.length })}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_1fr_1fr] gap-3">
        <div className="glass-input flex items-center gap-2 px-3 py-2 rounded-lg">
          <Search size={16} className="text-white/60" />
          <input
            aria-label={t('games.search')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('games.search')}
            className="bg-transparent text-white text-sm w-full outline-none"
          />
        </div>
        <div className="glass-input flex items-center gap-2 px-3 py-2 rounded-lg">
          <Filter size={16} className="text-white/60" />
          <select
            aria-label={t('games.colorLabel')}
            value={color}
            onChange={(event) => setColor(event.target.value as typeof color)}
            className="bg-transparent text-white text-sm w-full outline-none"
          >
            <option value="all">{t('games.filters.all')}</option>
            <option value="white">{t('colors.white')}</option>
            <option value="black">{t('colors.black')}</option>
          </select>
        </div>
        <div className="glass-input flex items-center gap-2 px-3 py-2 rounded-lg">
          <Filter size={16} className="text-white/60" />
          <select
            aria-label={t('games.resultLabel')}
            value={result}
            onChange={(event) => setResult(event.target.value as typeof result)}
            className="bg-transparent text-white text-sm w-full outline-none"
          >
            <option value="all">{t('games.filters.all')}</option>
            <option value="win">{t('games.results.win')}</option>
            <option value="loss">{t('games.results.loss')}</option>
            <option value="draw">{t('games.results.draw')}</option><option value="ongoing">{t('games.results.ongoing')}</option>
          </select>
        </div>
        <div className="glass-input flex items-center gap-2 px-3 py-2 rounded-lg">
          <Filter size={16} className="text-white/60" />
          <select
            aria-label={t('games.timeControlLabel')}
            value={timeControl}
            onChange={(event) => setTimeControl(event.target.value as typeof timeControl)}
            className="bg-transparent text-white text-sm w-full outline-none"
          >
            <option value="all">{t('games.filters.all')}</option>
            <option value="Blitz">Blitz</option>
            <option value="Rapid">Rapid</option>
            <option value="Classical">Classical</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((game) => (
          <div key={game.id} className="glass-container rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">{game.opponent}</span>
                {game.reviewed && <ChessyIcon name="check" size={14} className="accent"/>}
              </div>
              <div className="text-white/60 text-xs">
                {game.date} · {game.timeControl} · {t(`games.color.${game.color}`)}
              </div>
              <div className={`text-xs font-semibold ${resultColor(game.result)}`}>
                {t(`games.results.${game.result}`)}
                {typeof game.accuracy === 'number' && ` · ${t('games.accuracy', { value: game.accuracy })}`}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => openGame(game, 'review')}
                className="glass-button glass-button--subtle px-4 py-2 rounded-lg text-white text-xs font-semibold"
              >
                {t('games.actions.review')}
              </button>
              <button
                onClick={() => openGame(game, 'analysis')}
                className="glass-button glass-button--subtle px-4 py-2 rounded-lg text-white text-xs font-semibold"
              >
                {t('games.actions.analyze')}
              </button>
              <button
                onClick={() => openGame(game, 'play')}
                className="glass-button glass-button--subtle px-4 py-2 rounded-lg text-white text-xs font-semibold"
              >
                {t('games.actions.continue')}
              </button>
            </div>
          </div>
        ))}
        {loadError && <p role="status">{t('studio.saveError')}</p>}
        {filtered.length === 0 && (
          <p className="text-white/60 text-sm">{t('games.empty')}</p>
        )}
      </div>
    </div>
  );
};
