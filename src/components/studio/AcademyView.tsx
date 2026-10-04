import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { LESSONS, TRACKS } from '../../learning/curriculum';
import { MINI_GAME_PRESETS, type MiniGamePreset } from '../../learning/minigames';
import { MASTERY_PATH, PIECE_DOMAIN_ROUTES, type PieceDomain, type PieceDomainRoute } from '../../learning/masteryPath';
import { ECO_BANDS } from '../../learning/openingTaxonomy';
import { Lesson, locale } from '../../learning/types';
import { useLearningStore } from '../../learning/store';
import { useGameStore } from '../../store/gameStore';
import { BLOCK1_ROOK } from '../../utils/exercises/block1';
import { SectionHeading } from './Shared';
import { ChessyIcon, type ChessyIconName } from '../../design/icons';
import { useAnalyticsStore } from '../../analytics/store';

const icons: Record<(typeof TRACKS)[number], ChessyIconName> = {
  fundamentals: 'academy', tactics: 'target', strategy: 'hint', openings: 'shield', endgames: 'achievement', calculation: 'analysis',
};
const miniGameIcons: Record<MiniGamePreset['family'], ChessyIconName> = {
  pawns: 'target', rooks: 'analysis', bishops: 'hint', knights: 'challenges', queens: 'achievement',
};
const pieceIcons: Record<PieceDomain, ChessyIconName> = {
  rook: 'analysis', bishop: 'hint', queen: 'achievement', knight: 'challenges', pawn: 'target', king: 'shield', coordination: 'academy',
};

function LessonReader({ lesson, onBack }: { lesson: Lesson; onBack: () => void }) {
  const { t, i18n } = useTranslation();
  const lang = locale(i18n.resolvedLanguage);
  const [answer, setAnswer] = useState<number | null>(null);
  const { progress, complete, configure } = useLearningStore();
  const setView = useGameStore((state) => state.setView);
  const track = useAnalyticsStore((state) => state.track);
  const heading = useRef<HTMLHeadingElement>(null);
  const correct = answer === lesson.answer;
  const done = progress.lessons.includes(lesson.id);

  useEffect(() => { heading.current?.focus(); }, []);

  return <article className="lesson-reader view-enter">
    <button className="text-button back-link" onClick={onBack}><ArrowLeft size={17}/>{t('studio.backAcademy')}</button>
    <div className="lesson-meta"><span className="tag">{t(`studio.track.${lesson.track}`)}</span><span><Clock size={15}/>{t('studio.minutes', { count: lesson.minutes })}</span>{done && <CheckCircle2 size={19} className="accent"/>}</div>
    <h1 ref={heading} tabIndex={-1}>{lesson.title[lang]}</h1>
    <div className="lesson-body">{lesson.body.map((paragraph, index) => <p key={index}>{paragraph[lang]}</p>)}</div>
    <aside className="takeaway"><ChessyIcon name="hint" size={24}/><div><h2>{t('studio.keyIdea')}</h2><p>{lesson.takeaway[lang]}</p></div></aside>
    <section className="panel quiz" aria-labelledby="quiz-heading">
      <p className="eyebrow">{t('studio.checkUnderstanding')}</p>
      <h2 id="quiz-heading">{lesson.question[lang]}</h2>
      <div className="quiz-options">{lesson.options.map((option, index) => <button
        key={index}
        aria-pressed={answer === index}
        className={`quiz-option ${answer === index ? (correct ? 'correct' : 'incorrect') : ''}`}
        disabled={correct}
        onClick={() => {
          setAnswer(index);
          if (index === lesson.answer) {
            if (!done) track('lesson_complete', { track: lesson.track, level: lesson.level });
            complete('lesson', lesson.id);
          }
        }}
      ><span className="option-letter">{String.fromCharCode(65 + index)}</span>{option[lang]}{answer === index && correct && <ChessyIcon name="check" size={20}/>}</button>)}</div>
      {answer !== null && <div className={`feedback ${correct ? 'success' : 'wrong'}`} role="status"><div><strong>{t(correct ? 'studio.answerCorrect' : 'studio.answerWrong')}</strong>{correct && <p>{lesson.explanation[lang]}</p>}</div></div>}
    </section>
    <div className="button-row"><button className="btn primary" onClick={() => { configure('practice', lesson.practice); setView('training'); }}>{t('studio.practiceIdea')}<ChessyIcon name="arrow" size={18}/></button><button className="btn secondary" onClick={onBack}>{t('studio.backAcademy')}</button></div>
  </article>;
}

export function AcademyView() {
  const { t, i18n } = useTranslation();
  const lang = locale(i18n.resolvedLanguage);
  const { progress } = useLearningStore();
  const startCurriculumSession = useGameStore((state) => state.startCurriculumSession);
  const [selected, setSelected] = useState<Lesson | null>(null);

  const launchMiniGame = (preset: MiniGamePreset) => {
    startCurriculumSession({ kind: 'mini-game', id: preset.id }, preset.fen);
  };
  const launchDomain = (route: PieceDomainRoute) => {
    if (route.activity.kind === 'piece-exercises') {
      const first = BLOCK1_ROOK[0];
      startCurriculumSession({ kind: 'piece-exercise', domain: 'rook', step: 0 }, first.initial_position.fen);
      return;
    }
    const preset = MINI_GAME_PRESETS.find((candidate) => candidate.id === route.activity.id);
    if (preset) launchMiniGame(preset);
  };

  if (selected) return <LessonReader key={selected.id} lesson={selected} onBack={() => setSelected(null)}/>;

  return <div className="view-enter">
    <SectionHeading eyebrow={t('studio.academyEyebrow')} title={t('studio.academyTitle')} subtitle={t('studio.academySubtitle')}/>
    <div className="academy-summary"><ChessyIcon name="academy" size={18}/><span>{t('studio.lessonCount', { count: LESSONS.length })}</span><span className="divider-dot"/><span>{progress.lessons.length} / {LESSONS.length} - {t('studio.completed')}</span></div>

    <section className="mastery-path-section" aria-labelledby="mastery-path-title">
      <div className="home-section-title"><div><p className="eyebrow">{t('studio.masteryEyebrow')}</p><h2 id="mastery-path-title">{t('studio.masteryTitle')}</h2><p className="section-description">{t('studio.masterySubtitle')}</p></div></div>
      <ol className="mastery-path-grid">{MASTERY_PATH.map((phase) => <li className="panel mastery-phase-card" key={phase.id}><div className="mastery-phase-top"><span className="mastery-order">{String(phase.order).padStart(2, '0')}</span><span className="tag">{phase.marker[lang]}</span></div><h3>{phase.title[lang]}</h3><p>{phase.summary[lang]}</p></li>)}</ol>
    </section>

    <section className="piece-domain-section" aria-labelledby="piece-domain-title">
      <div className="home-section-title"><div><p className="eyebrow">{t('curriculum.pieceDomainsEyebrow')}</p><h2 id="piece-domain-title">{t('curriculum.pieceDomainsTitle')}</h2><p className="section-description">{t('curriculum.pieceDomainsSubtitle')}</p></div></div>
      <div className="piece-domain-grid">{PIECE_DOMAIN_ROUTES.map((route) => <article className="panel piece-domain-card" key={route.piece}>
        <div className="piece-domain-card-top"><span className="icon-tile small"><ChessyIcon name={pieceIcons[route.piece]} size={20}/></span><span className="tag">{route.evidenceLabel[lang]}</span></div>
        <div><h3>{route.title[lang]}</h3><p>{route.summary[lang]}</p></div>
        <button className="btn secondary" onClick={() => launchDomain(route)}>{t('curriculum.openDomain')}<ChessyIcon name="arrow" size={17}/></button>
      </article>)}</div>
    </section>

    <section className="mini-game-section" aria-labelledby="mini-games-title">
      <div className="home-section-title"><div><p className="eyebrow">{t('studio.miniGamesEyebrow')}</p><h2 id="mini-games-title">{t('studio.miniGamesTitle')}</h2><p className="section-description">{t('studio.miniGamesSubtitle')}</p></div></div>
      <div className="mini-game-grid">{MINI_GAME_PRESETS.map((preset) => <article className="panel mini-game-card" key={preset.id}><span className="icon-tile small"><ChessyIcon name={miniGameIcons[preset.family]} size={20}/></span><div><h3>{preset.title[lang]}</h3><p>{preset.purpose[lang]}</p></div><button className="btn secondary" onClick={() => launchMiniGame(preset)}>{t('studio.startMiniGame')}<ChessyIcon name="arrow" size={17}/></button></article>)}</div>
    </section>

    <section className="academy-lessons-section" aria-labelledby="academy-lessons-title">
      <div className="home-section-title"><div><p className="eyebrow">{t('studio.lessonsEyebrow')}</p><h2 id="academy-lessons-title">{t('studio.lessonsTitle')}</h2></div></div>
      <div className="track-grid">{TRACKS.map((track, index) => {
        const icon = icons[track];
        const lessons = LESSONS.filter((lesson) => lesson.track === track);
        const count = lessons.filter((lesson) => progress.lessons.includes(lesson.id)).length;
        return <section className={`panel track-card track-${track}`} key={track}><div className="track-card-top"><div className="icon-tile"><ChessyIcon name={icon} size={26}/></div><span className="track-number">0{index + 1}</span></div><h2>{t(`studio.track.${track}`)}</h2><div className="track-progress"><span style={{ width: `${count / lessons.length * 100}%` }}/></div><div className="lesson-list">{lessons.map((lesson) => <button key={lesson.id} className="lesson-link" onClick={() => setSelected(lesson)}><span>{progress.lessons.includes(lesson.id) ? <ChessyIcon name="check" size={18} className="accent"/> : <ChessyIcon name="library" size={18}/>}</span><span><strong>{lesson.title[lang]}</strong><small>{t(`studio.level.${lesson.level}`)} - {t('studio.minutes', { count: lesson.minutes })}</small></span><ArrowRight size={17}/></button>)}</div></section>;
      })}</div>
    </section>

    <details className="panel eco-reference">
      <summary><span><p className="eyebrow">{t('curriculum.ecoEyebrow')}</p><strong>{t('curriculum.ecoTitle')}</strong></span><ChessyIcon name="arrow" size={18}/></summary>
      <div className="eco-reference-content">
        <p className="section-description">{t('curriculum.ecoSubtitle')}</p>
        <p className="eco-disclaimer"><ChessyIcon name="shield" size={18}/>{t('curriculum.ecoDisclaimer')}</p>
        <div className="eco-band-grid">{ECO_BANDS.map((band) => <article className="eco-band-card" key={band.id}><span className="eco-code">{band.range}</span><h3>{band.title[lang]}</h3><p><strong>{t('curriculum.ecoExamples')}:</strong> {band.examples.join(' - ')}</p></article>)}</div>
      </div>
    </details>
  </div>;
}
