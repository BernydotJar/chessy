import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../store/gameStore';
import { EXERCISES, CHESS_CAMP_VOL1_ORDERED } from '../utils/exercises';
import { CheckCircle2, XCircle, Lightbulb } from 'lucide-react';

const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const ExerciseView: React.FC = () => {
  const { t } = useTranslation();
  const {
    chess,
    history,
    loadGame,
    setTrainingMode,
    setView,
  } = useGameStore();
  const [source, setSource] = useState<'block1' | 'camp'>('block1');
  const [index, setIndex] = useState(0);
  const [campIndex, setCampIndex] = useState(0);
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [message, setMessage] = useState('');

  const exercise = EXERCISES[index];
  const campExercise = CHESS_CAMP_VOL1_ORDERED.exercises[campIndex];

  useEffect(() => {
    setTrainingMode(true);
    if (source === 'block1') {
      loadGame(exercise.initial_position.fen);
      setStatus('idle');
      setMessage('');
    } else {
      loadGame(DEFAULT_FEN);
      setStatus('idle');
      setMessage('');
    }
    return () => {
      setTrainingMode(false);
    };
  }, [exercise, loadGame, setTrainingMode, source]);

  useEffect(() => {
    if (source !== 'block1') return;
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
  }, [history, chess, exercise, t, source]);

  const progress = useMemo(() => {
    if (source === 'camp') {
      return `${campIndex + 1}/${CHESS_CAMP_VOL1_ORDERED.exercises.length}`;
    }
    return `${index + 1}/${EXERCISES.length}`;
  }, [index, campIndex, source]);

  const handleRetry = () => {
    if (source === 'block1') {
      loadGame(exercise.initial_position.fen);
      setStatus('idle');
      setMessage('');
    } else {
      loadGame(DEFAULT_FEN);
    }
  };

  const handleNext = () => {
    if (source === 'camp') {
      if (campIndex + 1 >= CHESS_CAMP_VOL1_ORDERED.exercises.length) {
        setView('play');
        return;
      }
      setCampIndex(campIndex + 1);
      return;
    }
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
          <h3 className="text-white font-semibold text-lg">
            {source === 'camp' ? t('exercise.campTitle') : exercise.title}
          </h3>
        </div>
        <span className="glass-container px-3 py-1 rounded-full text-white text-xs">
          {source === 'camp' ? campExercise.exercise_id : exercise.exercise_id}
        </span>
      </div>

      <div className="glass-container rounded-lg p-3">
        <div className="flex items-center justify-between gap-3 text-white/80 text-sm">
          <span>{t('exercise.sourceLabel')}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setSource('block1')}
              className={`glass-button px-3 py-1 rounded-full text-xs ${
                source === 'block1' ? 'bg-white/15 text-white' : 'text-white/60'
              }`}
            >
              {t('exercise.sourceBlock1')}
            </button>
            <button
              onClick={() => setSource('camp')}
              className={`glass-button px-3 py-1 rounded-full text-xs ${
                source === 'camp' ? 'bg-white/15 text-white' : 'text-white/60'
              }`}
            >
              {t('exercise.sourceCamp')}
            </button>
          </div>
        </div>
      </div>

      {source === 'camp' ? (
        <div className="glass-container rounded-lg p-4 text-white/80 text-sm space-y-2">
          <p>{t('exercise.campHint')}</p>
          <div className="text-white/60 text-xs">
            <span>{t('exercise.campStatus', { value: campExercise.status })}</span>
          </div>
        </div>
      ) : (
        <div className="glass-container rounded-lg p-4 text-white/80 text-sm">
          {exercise.instruction}
        </div>
      )}

      {source === 'block1' && (
        <div className="glass-container rounded-lg p-4 flex items-center gap-3 text-white/70 text-sm">
          <Lightbulb size={16} />
          <span>{t('exercise.tip')}</span>
        </div>
      )}

      {source === 'block1' && status !== 'idle' && (
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
