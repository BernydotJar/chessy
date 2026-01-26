import React, { useState } from 'react';
import { Bot, Play, Settings, Volume2, VolumeX } from 'lucide-react';
import { DifficultyLevel } from '../utils/stockfishService';

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

  const difficulties: Array<{ value: DifficultyLevel; label: string; description: string }> = [
    { value: 'beginner', label: 'Beginner', description: 'Perfect for learning' },
    { value: 'easy', label: 'Easy', description: 'Casual play' },
    { value: 'medium', label: 'Medium', description: 'Balanced challenge' },
    { value: 'hard', label: 'Hard', description: 'Experienced players' },
    { value: 'master', label: 'Master', description: 'Maximum difficulty' },
  ];

  const handleStartGame = () => {
    onStartGame(difficulty, playerColor);
    setShowSettings(false);
  };

  return (
    <div className="glass-card rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-lg flex items-center gap-2">
          <Bot size={24} />
          AI Opponent
        </h3>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="glass-button p-2 rounded-lg text-white hover:scale-105 transition-transform"
          aria-label="AI settings"
        >
          <Settings size={20} />
        </button>
      </div>

      {showSettings && (
        <div className="space-y-4 animate-slide-up">
          {/* Difficulty Selection */}
          <div>
            <label className="block text-white text-sm font-semibold mb-2">
              Difficulty Level
            </label>
            <div className="space-y-2">
              {difficulties.map((diff) => (
                <button
                  key={diff.value}
                  onClick={() => setDifficulty(diff.value)}
                  className={`w-full glass-button p-3 rounded-lg text-left transition-all ${
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
              Play As
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['white', 'black', 'random'] as const).map((color) => (
                <button
                  key={color}
                  onClick={() => setPlayerColor(color)}
                  className={`glass-button p-3 rounded-lg capitalize transition-all ${
                    playerColor === color
                      ? 'bg-white/20 ring-2 ring-white/40'
                      : 'hover:bg-white/10'
                  }`}
                >
                  <div className="text-white font-medium text-sm">{color}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Sound Toggle */}
          <div>
            <label className="block text-white text-sm font-semibold mb-2">
              Sound Effects
            </label>
            <button
              onClick={onToggleSound}
              className="w-full glass-button p-3 rounded-lg flex items-center justify-between"
            >
              <span className="text-white font-medium">
                {soundEnabled ? 'Enabled' : 'Disabled'}
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
            className="w-full glass-button px-4 py-4 rounded-lg text-white font-semibold flex items-center justify-center gap-2 hover:scale-105 transition-transform bg-gradient-to-r from-blue-500/20 to-purple-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Play size={20} />
            <span>Start Game vs AI</span>
          </button>
        </div>
      )}

      {!showSettings && (
        <div className="glass-container rounded-lg p-4">
          <div className="text-white/80 text-sm">
            <p className="mb-2">
              <strong>Difficulty:</strong> {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
            </p>
            <p className="mb-2">
              <strong>Playing as:</strong> {playerColor === 'random' ? 'Random' : playerColor.charAt(0).toUpperCase() + playerColor.slice(1)}
            </p>
            <p>
              <strong>Sound:</strong> {soundEnabled ? 'On' : 'Off'}
            </p>
          </div>
          {!isPlaying && (
            <button
              onClick={handleStartGame}
              className="w-full mt-3 glass-button px-4 py-3 rounded-lg text-white font-semibold flex items-center justify-center gap-2 hover:scale-105 transition-transform"
            >
              <Play size={20} />
              <span>Start Game</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
