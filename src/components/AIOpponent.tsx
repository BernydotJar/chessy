import React, { useMemo, useState } from 'react';
import { DifficultyLevel } from '../utils/stockfishService';
import { useTranslation } from 'react-i18next';
import { ChessyIcon } from '../design/icons';
import { TIME_CONTROLS, type TimeControlId } from '../game/timeControls';
import { useGameStore } from '../store/gameStore';

interface AIOpponentProps {
  onStartGame: (difficulty: DifficultyLevel, playerColor: 'white' | 'black' | 'random') => void;
  isPlaying: boolean;
}

export const AIOpponent: React.FC<AIOpponentProps> = ({ onStartGame, isPlaying }) => {
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');
  const [playerColor, setPlayerColor] = useState<'white' | 'black' | 'random'>('white');
  const [showSettings, setShowSettings] = useState(false);
  const { timeControlId, setTimeControl } = useGameStore();
  const { t } = useTranslation();
  const difficulties = useMemo(() => (['beginner','easy','medium','hard','master'] as DifficultyLevel[]).map(value => ({
    value,
    label: t(`ai.difficultyLevels.${value}.label`),
    description: t(`ai.difficultyLevels.${value}.description`),
  })), [t]);
  const selectedDifficulty = difficulties.find(item => item.value === difficulty)!;
  const colorLabel = playerColor === 'random' ? t('ai.random') : t(`colors.${playerColor}`);
  const selectedClock = TIME_CONTROLS.find(control => control.id === timeControlId) ?? TIME_CONTROLS[0];
  const start = () => { onStartGame(difficulty, playerColor); setShowSettings(false); };

  return <section className="panel ai-opponent ai-opponent-v3" aria-labelledby="ai-opponent-title">
    <header className="ai-opponent-header"><span className="icon-tile small"><ChessyIcon name="engine" size={19}/></span><div><p className="eyebrow">{t('ai.opponentLabel')}</p><h2 id="ai-opponent-title">{t('ai.title')}</h2></div><button type="button" className="icon-button ai-configure" onClick={() => setShowSettings(value => !value)} aria-expanded={showSettings} aria-controls="ai-game-setup" aria-label={t('ai.settings')} title={t('ai.settings')}><ChessyIcon name="settings" size={18}/></button></header>
    <div className="ai-current-settings">
      <span><strong>{selectedDifficulty.label}</strong><small>{t('ai.difficultyLabel')}</small></span>
      <span><strong>{colorLabel}</strong><small>{t('ai.playingAsLabel')}</small></span>
      <span><strong>{selectedClock.compact}</strong><small>{t('match.timeControlLabel')}</small></span>
    </div>
    {!isPlaying ? <button onClick={start} className="btn primary full ai-primary-start"><ChessyIcon name="play" size={19}/><span>{t('ai.startGame')}</span></button> : <div className="ai-live-state"><span className="live-dot"/><span>{t('ai.inProgress')}</span></div>}
    {showSettings && <div id="ai-game-setup" className="ai-game-setup" role="group" aria-label={t('ai.settings')}>
      <label>{t('ai.difficulty')}<select value={difficulty} onChange={event => setDifficulty(event.target.value as DifficultyLevel)}>{difficulties.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select><small>{selectedDifficulty.description}</small></label>
      <fieldset><legend>{t('ai.playAs')}</legend><div className="segmented ai-color-segment">{(['white','black','random'] as const).map(color => <button type="button" key={color} aria-pressed={playerColor === color} className={playerColor === color ? 'active' : ''} onClick={() => setPlayerColor(color)}>{color === 'random' ? t('ai.random') : t(`colors.${color}`)}</button>)}</div></fieldset>
      <label>{t('match.timeControlLabel')}<select aria-label={t('match.timeControlLabel')} value={timeControlId} onChange={event => setTimeControl(event.target.value as TimeControlId)} disabled={isPlaying}>{TIME_CONTROLS.map(control => <option key={control.id} value={control.id}>{t(control.labelKey)}</option>)}</select><small>{t('match.clockStartsAfterFirst')}</small></label>
      <p className="fine-print ai-settings-note">{t('ai.globalSettingsHint')}</p>
    </div>}
  </section>;
};
