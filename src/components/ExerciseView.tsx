import { CheckCircle2, Lightbulb, RotateCcw, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MINI_GAME_PRESETS } from '../learning/minigames';
import { locale } from '../learning/types';
import { useGameStore } from '../store/gameStore';
import { BLOCK1_ROOK } from '../utils/exercises/block1';
import { ChessyIcon } from '../design/icons';

const normalizeSan = (move: string) => move.replace(/[+#]$/u, '');

export const ExerciseView = () => {
  const { t, i18n } = useTranslation();
  const lang = locale(i18n.resolvedLanguage);
  const game = useGameStore();
  const session = game.curriculumSession;

  if (!session) return null;

  const leavePractice = () => {
    game.clearCurriculumSession();
    game.setView('academy');
  };

  if (session.kind === 'mini-game') {
    const preset = MINI_GAME_PRESETS.find((candidate) => candidate.id === session.id);
    if (!preset) return null;
    return <section className="panel curriculum-session-card" aria-labelledby="curriculum-session-title">
      <header className="curriculum-session-header">
        <span className="icon-tile small"><ChessyIcon name="academy" size={20}/></span>
        <div>
          <p className="eyebrow">{t('curriculum.miniGameSession')}</p>
          <h2 id="curriculum-session-title">{preset.title[lang]}</h2>
        </div>
      </header>
      <p className="curriculum-session-purpose">{preset.purpose[lang]}</p>
      <div className="curriculum-goal">
        <Lightbulb size={18}/>
        <div><strong>{t('curriculum.goal')}</strong><p>{preset.goal[lang]}</p></div>
      </div>
      <ul className="curriculum-focus-list" aria-label={t('curriculum.focus')}>
        {preset.focus.map((item) => <li key={item[lang]}>{item[lang]}</li>)}
      </ul>
      {game.isGameOver && <div className="feedback success" role="status"><CheckCircle2 size={18}/><div><strong>{t('curriculum.miniGameFinished')}</strong><p>{t('curriculum.reviewTransfer')}</p></div></div>}
      <div className="button-row curriculum-session-actions">
        <button className="btn secondary" onClick={() => game.restartCurriculumPosition(preset.fen)}><RotateCcw size={17}/>{t('curriculum.restartPosition')}</button>
        <button className="btn quiet" onClick={leavePractice}>{t('curriculum.backToPath')}</button>
      </div>
    </section>;
  }

  const step = Math.min(Math.max(0, session.step), BLOCK1_ROOK.length - 1);
  const exercise = BLOCK1_ROOK[step];
  const moves = game.chess.history();
  const lastMove = moves.length ? moves[moves.length - 1] : '';
  const answered = game.history.length > 0;
  const correct = answered && normalizeSan(lastMove) === normalizeSan(exercise.solution.best_move);
  const distractor = exercise.distractors.find((item) => normalizeSan(item.move) === normalizeSan(lastMove));

  const nextExercise = () => {
    if (!correct) return;
    const nextStep = step + 1;
    if (nextStep >= BLOCK1_ROOK.length) {
      leavePractice();
      return;
    }
    const next = BLOCK1_ROOK[nextStep];
    game.setCurriculumSession({ kind: 'piece-exercise', domain: 'rook', step: nextStep });
    game.restartCurriculumPosition(next.initial_position.fen);
  };

  return <section className="panel curriculum-session-card" aria-labelledby="curriculum-session-title">
    <header className="curriculum-session-header">
      <span className="icon-tile small"><ChessyIcon name="analysis" size={20}/></span>
      <div>
        <p className="eyebrow">{t('curriculum.rookPilot')} · {t('exercise.progress', { value: `${step + 1}/${BLOCK1_ROOK.length}` })}</p>
        <h2 id="curriculum-session-title">{exercise.title[lang]}</h2>
      </div>
      <span className="tag curriculum-exercise-id">{exercise.exercise_id}</span>
    </header>
    <p className="curriculum-session-purpose">{exercise.instruction[lang]}</p>
    <div className="curriculum-goal">
      <Lightbulb size={18}/>
      <div><strong>{t('curriculum.thinkBeforeMove')}</strong><p>{t('curriculum.rookPrompt')}</p></div>
    </div>
    <ul className="curriculum-focus-list" aria-label={t('curriculum.focus')}>
      {exercise.concepts_trained.map((concept) => <li key={concept}>{t(`curriculum.concepts.${concept}`)}</li>)}
    </ul>
    {answered && <div className={`feedback ${correct ? 'success' : 'wrong'}`} role="status">
      {correct ? <CheckCircle2 size={18}/> : <XCircle size={18}/>}
      <div>
        <strong>{t(correct ? 'curriculum.correctMove' : 'curriculum.tryAgain')}</strong>
        <p>{correct ? exercise.solution.explanation[lang] : distractor?.why_wrong[lang] ?? t('curriculum.wrongMoveDetail')}</p>
      </div>
    </div>}
    <div className="button-row curriculum-session-actions">
      <button className="btn secondary" onClick={() => game.restartCurriculumPosition(exercise.initial_position.fen)}><RotateCcw size={17}/>{t('exercise.retry')}</button>
      {correct && <button className="btn primary" onClick={nextExercise}>{step + 1 === BLOCK1_ROOK.length ? t('curriculum.finishPilot') : t('exercise.next')}<ChessyIcon name="arrow" size={17}/></button>}
      <button className="btn quiet" onClick={leavePractice}>{t('curriculum.backToPath')}</button>
    </div>
  </section>;
};
