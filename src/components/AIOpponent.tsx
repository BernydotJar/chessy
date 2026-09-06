import React, { useState } from 'react';
import { VolumeX } from 'lucide-react';
import { DifficultyLevel } from '../utils/stockfishService';
import { useTranslation } from 'react-i18next';
import { ChessyIcon } from '../design/icons';

interface AIOpponentProps {
  onStartGame: (difficulty: DifficultyLevel, playerColor: 'white' | 'black' | 'random') => void;
  isPlaying: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const AIOpponent: React.FC<AIOpponentProps> = ({ onStartGame, isPlaying, soundEnabled, onToggleSound }) => {
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');
  const [playerColor, setPlayerColor] = useState<'white' | 'black' | 'random'>('white');
  const [showSettings, setShowSettings] = useState(false);
  const { t } = useTranslation();
  const difficulties: Array<{ value: DifficultyLevel; label: string; description: string }> = [
    { value:'beginner', label:t('ai.difficultyLevels.beginner.label'), description:t('ai.difficultyLevels.beginner.description') },
    { value:'easy', label:t('ai.difficultyLevels.easy.label'), description:t('ai.difficultyLevels.easy.description') },
    { value:'medium', label:t('ai.difficultyLevels.medium.label'), description:t('ai.difficultyLevels.medium.description') },
    { value:'hard', label:t('ai.difficultyLevels.hard.label'), description:t('ai.difficultyLevels.hard.description') },
    { value:'master', label:t('ai.difficultyLevels.master.label'), description:t('ai.difficultyLevels.master.description') },
  ];
  const start = () => { onStartGame(difficulty, playerColor); setShowSettings(false); };
  return <div className="glass-card glass-card--subtle rounded-xl p-5 space-y-4 ai-opponent">
    <div className="flex items-center justify-between"><h3 className="text-white font-semibold text-lg flex items-center gap-2"><ChessyIcon name="engine" size={24}/>{t('ai.title')}</h3><button onClick={()=>setShowSettings(!showSettings)} className="glass-button glass-button--subtle p-2 rounded-lg text-white" aria-label={t('ai.settings')}><ChessyIcon name="settings" size={18}/></button></div>
    {showSettings ? <div className="space-y-4 animate-slide-up">
      <div><label className="block text-white text-sm font-semibold mb-2">{t('ai.difficulty')}</label><div className="space-y-2">{difficulties.map(diff=><button key={diff.value} onClick={()=>setDifficulty(diff.value)} aria-pressed={difficulty===diff.value} className={`choice-button ${difficulty===diff.value?'is-selected':''}`}><div className="text-white font-medium">{diff.label}</div><div className="text-white/60 text-sm">{diff.description}</div></button>)}</div></div>
      <div><label className="block text-white text-sm font-semibold mb-2">{t('ai.playAs')}</label><div className="grid grid-cols-3 gap-2">{(['white','black','random'] as const).map(color=><button key={color} onClick={()=>setPlayerColor(color)} aria-pressed={playerColor===color} className={`choice-button choice-button--center ${playerColor===color?'is-selected':''}`}><div className="text-white font-medium text-sm">{color==='random'?t('ai.random'):t(`colors.${color}`)}</div></button>)}</div></div>
      <div><label className="block text-white text-sm font-semibold mb-2">{t('ai.soundEffects')}</label><button onClick={onToggleSound} className="choice-button choice-button--row"><span className="text-white font-medium">{soundEnabled?t('ai.enabled'):t('ai.disabled')}</span>{soundEnabled?<ChessyIcon name="sound" size={20}/>:<VolumeX size={20} className="text-white/60"/>}</button></div>
      <button onClick={start} disabled={isPlaying} className="btn primary full"><ChessyIcon name="play" size={20}/><span>{t('ai.startGameVsAi')}</span></button>
    </div> : <div className="ai-summary"><p><strong>{t('ai.difficultyLabel')}:</strong> {t(`ai.difficultyLevels.${difficulty}.label`)}</p><p><strong>{t('ai.playingAsLabel')}:</strong> {playerColor==='random'?t('ai.random'):t(`colors.${playerColor}`)}</p><p><strong>{t('ai.soundLabel')}:</strong> {soundEnabled?t('ai.enabled'):t('ai.disabled')}</p>{!isPlaying&&<button onClick={start} className="btn primary full"><ChessyIcon name="play" size={20}/><span>{t('ai.startGame')}</span></button>}</div>}
  </div>;
};
