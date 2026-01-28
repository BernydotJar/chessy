import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../store/gameStore';
import { EXERCISES } from '../utils/exercises';
import { CheckCircle2, XCircle, Lightbulb } from 'lucide-react';

export const ExerciseView: React.FC = () => {
  const { t } = useTranslation();
  const {
    chess,
    history,
    loadGame,
    setTrainingMode,
    setView,
  } = useGameStore();
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [message, setMessage] = useState('');

  const exercise = EXERCISES[index];

  useEffect(() => {
    setTrainingMode(true);
    loadGame(exercise.initial_position.fen);
    setStatus('idle');
    setMessage('');
    return () => {
      setTrainingMode(false);
    };
  }, [exercise, loadGame, setTrainingMode]);

  useEffect(() => {
    if (history.length === 0) return;
    const last = chess.history().slice(-1)[0];
    if (!last) return;
    if (last === exercise.solution.best_move) {
      setStatus('correct');
      setMessage(t('exercise.correct', { explanation: exercise.solution.explanation }));
    } else {
      setStatus('wrong');
      setMessage(t('exercise.wrong'));
    }
  }, [history, chess, exercise, t]);

  const progress = useMemo(() => `${index + 1}/${EXERCISES.length}`, [index]);

  const handleRetry = () => {
    loadGame(exercise.initial_position.fen);
    setStatus('idle');
    setMessage('');
  };

  const handleNext = () => {
    if (index + 1 >= EXERCISES.length) {
      setView('play');
      return;
    }
    setIndex(index + 1);
  };

  return (
    <div className="glass-card rounded-xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/60 text-xs">{t('exercise.progress', { value: progress })}</p>
          <h3 className="text-white font-semibold text-lg">{exercise.title}</h3>
        </div>
        <span className="glass-container px-3 py-1 rounded-full text-white text-xs">
          {exercise.exercise_id}
        </span>
      </div>

      <div className="glass-container rounded-lg p-4 text-white/80 text-sm">
        {exercise.instruction}
      </div>

      <div className="glass-container rounded-lg p-4 flex items-center gap-3 text-white/70 text-sm">
        <Lightbulb size={16} />
        <span>{t('exercise.tip')}</span>
      </div>

      {status !== 'idle' && (
        <div className={`glass-container rounded-lg p-4 text-sm flex items-center gap-2 ${
          status === 'correct' ? 'text-emerald-300' : 'text-red-300'
        }`}>
          {status === 'correct' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          <span>{message}</span>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleRetry}
          className="glass-button glass-button--subtle px-4 py-2 rounded-lg text-white text-sm"
        >
          {t('exercise.retry')}
        </button>
        <button
          onClick={handleNext}
          className="glass-button px-4 py-2 rounded-lg text-white text-sm bg-gradient-to-r from-blue-500/20 to-purple-500/20"
        >
          {t('exercise.next')}
        </button>
      </div>
    </div>
  );
};
