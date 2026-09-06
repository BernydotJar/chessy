import { useTranslation } from 'react-i18next';
import { ArrowUpRight } from 'lucide-react';
import { ChessyIcon } from '../../design/icons';
import { SectionHeading } from './Shared';
const BOOKS=[
 {title:'Bobby Fischer enseña ajedrez',original:'Bobby Fischer Teaches Chess',author:'Bobby Fischer · Stuart Margulies · Donn Mosenfelder',topic:'basics',mark:'01'},
 {title:'Mi sistema',original:'My System',author:'Aron Nimzowitsch',topic:'strategy',mark:'02'},
 {title:'Cómo repensar tu ajedrez',original:'How to Reassess Your Chess',author:'Jeremy Silman',topic:'strategy',mark:'03'},
 {title:'Mis 60 partidas memorables',original:'My 60 Memorable Games',author:'Bobby Fischer',topic:'games',mark:'04'},
 {title:'Curso completo de finales de Silman',original:"Silman's Complete Endgame Course",author:'Jeremy Silman',topic:'endings',mark:'05'},
 {title:'Piensa como un gran maestro',original:'Think Like a Grandmaster',author:'Alexander Kotov',topic:'thinking',mark:'06'},
];
export function LibraryView() {
 const {t,i18n}=useTranslation();const spanish=i18n.resolvedLanguage?.startsWith('es');
 return <div className="view-enter"><SectionHeading eyebrow={t('studio.library')} title={t('studio.libraryTitle')} subtitle={t('studio.librarySubtitle')}/><div className="library-note"><ChessyIcon name="library" size={19}/><span>{t('studio.referenceOnly')}</span></div><div className="book-grid">{BOOKS.map(book=><article className={`panel book-card book-${book.mark}`} key={book.mark}><div className="book-cover" aria-hidden="true"><span className="book-mark">CHESSY / {t('studio.library')}</span><span className="book-cover-number">{book.mark}</span><span className="book-cover-title">{spanish?book.title:book.original}</span><span className="book-cover-line"/></div><div className="book-info"><span className="eyebrow">{t(`studio.book.${book.topic}`)}</span><h2>{spanish?book.title:book.original}</h2><p>{book.author}</p><a className="text-button" href={`https://search.worldcat.org/search?q=${encodeURIComponent(book.original+' '+book.author.split(' · ')[0])}`} target="_blank" rel="noreferrer">{t('studio.findBook')}<ArrowUpRight size={17}/></a></div></article>)}</div></div>;
}
