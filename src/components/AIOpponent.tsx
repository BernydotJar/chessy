import React, { useState } from 'react';
import { Bot, Play, Settings, Volume2, VolumeX } from 'lucide-react';
import { DifficultyLevel } from '../utils/stockfishService';
import { useTranslation } from 'react-i18next';

interface AIOpponentProps {
  onStartGame: (difficulty: DifficultyLevel, playerColor: 'white' | 'black' | 'random') => void;
  isPlaying: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const AIOpponent: React.FC<AIOpponentProps> = ({
  onStartGame,
  isPlaying,
  soundEnabled,
  onToggleSound,
}) => {
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');
  const [playerColor, setPlayerColor] = useState<'white' | 'black' | 'random'>('white');
  const [showSettings, setShowSettings] = useState(false);
  const { t } = useTranslation();

  const difficulties: Array<{ value: DifficultyLevel; label: string; description: string }> = [
    {
      value: 'beginner',
      label: t('ai.difficultyLevels.beginner.label'),
      description: t('ai.difficultyLevels.beginner.description'),
    },
    {
      value: 'easy',
      label: t('ai.difficultyLevels.easy.label'),
      description: t('ai.difficultyLevels.easy.description'),
    },
    {
      value: 'medium',
      label: t('ai.difficultyLevels.medium.label'),
      description: t('ai.difficultyLevels.medium.description'),
    },
    {
      value: 'hard',
      label: t('ai.difficultyLevels.hard.label'),
      description: t('ai.difficultyLevels.hard.description'),
    },
    {
      value: 'master',
      label: t('ai.difficultyLevels.master.label'),
      description: t('ai.difficultyLevels.master.description'),
    },
  ];

  const handleStartGame = () => {
    onStartGame(difficulty, playerColor);
    setShowSettings(false);
  };

  return (
    <div className="glass-card glass-card--subtle rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-lg flex items-center gap-2">
          <Bot size={24} />
          {t('ai.title')}
        </h3>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="glass-button glass-button--subtle p-2 rounded-lg text-white hover:scale-105 transition-transform"
          aria-label={t('ai.settings')}
        >
          <Settings size={18} />
        </button>
      </div>

      {showSettings && (
        <div className="space-y-4 animate-slide-up">
          {/* Difficulty Selection */}
          <div>
            <label className="block text-white text-sm font-semibold mb-2">
              {t('ai.difficulty')}
            </label>
            <div className="space-y-2">
              {difficulties.map((diff) => (
                <button
                  key={diff.value}
                  onClick={() => setDifficulty(diff.value)}
                  className={`w-full glass-button glass-button--subtle p-3 rounded-lg text-left transition-all ${
                    difficulty === diff.value
                      ? 'bg-white/20 ring-2 ring-white/40'
                      : 'hover:bg-white/10'
                  }`}
                >
                  <div className="text-white font-medium">{diff.label}</div>
                  <div className="text-white/60 text-sm">{diff.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-white text-sm font-semibold mb-2">
              {t('ai.playAs')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['white', 'black', 'random'] as const).map((color) => (
                <button
                  key={color}
                  onClick={() => setPlayerColor(color)}
                  className={`glass-button glass-button--subtle p-3 rounded-lg capitalize transition-all ${
                    playerColor === color
                      ? 'bg-white/20 ring-2 ring-white/40'
                      : 'hover:bg-white/10'
                  }`}
                >
                  <div className="text-white font-medium text-sm">
                    {color === 'random' ? t('ai.random') : t(`colors.${color}`)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Sound Toggle */}
          <div>
            <label className="block text-white text-sm font-semibold mb-2">
              {t('ai.soundEffects')}
            </label>
            <button
              onClick={onToggleSound}
              className="w-full glass-button glass-button--subtle p-3 rounded-lg flex items-center justify-between"
            >
              <span className="text-white font-medium">
                {soundEnabled ? t('ai.enabled') : t('ai.disabled')}
              </span>
              {soundEnabled ? (
                <Volume2 size={20} className="text-white" />
              ) : (
                <VolumeX size={20} className="text-white/60" />
              )}
            </button>
          </div>

          {/* Start Button */}
          <button
            onClick={handleStartGame}
            disabled={isPlaying}
            className="w-full glass-button glass-button--subtle px-4 py-4 rounded-lg text-white font-semibold flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Play size={20} />
            <span>{t('ai.startGameVsAi')}</span>
          </button>
        </div>
      )}

      {!showSettings && (
        <div className="glass-container rounded-lg p-4">
          <div className="text-white/80 text-sm">
            <p className="mb-2">
              <strong>{t('ai.difficultyLabel')}:</strong> {t(`ai.difficultyLevels.${difficulty}.label`)}
            </p>
            <p className="mb-2">
              <strong>{t('ai.playingAsLabel')}:</strong>{' '}
              {playerColor === 'random' ? t('ai.random') : t(`colors.${playerColor}`)}
            </p>
            <p>
              <strong>{t('ai.soundLabel')}:</strong> {soundEnabled ? t('ai.enabled') : t('ai.disabled')}
            </p>
          </div>
          {!isPlaying && (
            <button
              onClick={handleStartGame}
              className="w-full mt-3 glass-button glass-button--subtle px-4 py-3 rounded-lg text-white font-semibold flex items-center justify-center gap-2"
            >
              <Play size={20} />
              <span>{t('ai.startGame')}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
