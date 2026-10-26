import type { Progress } from '../learning/progress';

export type AgeBand = '6-9' | '10-12' | '13-17' | 'adult';
export type RoomAudience = 'children' | 'adults' | 'mixed';
export type LearningGoal = 'discover' | 'family' | 'compete';
export type Language = 'es' | 'en' | 'pt';
export type Localized = Record<Language, string>;
export type Answers = Record<'q1' | 'q2' | 'q3' | 'q4' | 'q5', 'a' | 'b' | 'c'>;

export interface LearningRoom {
  id: string;
  ownerUid: string;
  title: string;
  audience: RoomAudience;
  language: Language;
  status: 'active' | 'closed';
}
export interface RoomInvitation {
  id: string;
  roomId: string;
  ownerUid: string;
  expiresAt: Date;
}
export interface RoomDiagnostic {
  uid: string;
  ageBand: AgeBand;
  guardianConfirmed: boolean;
  goal: LearningGoal;
  answers: Answers;
}
export interface Question {
  id: keyof Answers;
  prompt: Localized;
  options: readonly [Localized, Localized, Localized];
  correct: 'a' | 'b' | 'c';
}

const words = (es: string, en: string, pt: string): Localized => ({ es, en, pt });
const q = (id: keyof Answers, prompt: Localized, options: [Localized, Localized, Localized], correct: Question['correct']): Question =>
  ({ id, prompt, options, correct });

/** Original diagnostic questions. Never treat self-reported answers as a certified skill level. */
export const CHILD_QUESTIONS: readonly Question[] = [
  q('q1', words('¿Cuántas casillas hay en cada lado del tablero?', 'How many squares are on each side of the board?', 'Quantas casas há em cada lado do tabuleiro?'),
    [words('6', '6', '6'), words('8', '8', '8'), words('10', '10', '10')], 'b'),
  q('q2', words('¿Qué pieza salta en forma de L?', 'Which piece jumps in an L shape?', 'Qual peça salta em forma de L?'),
    [words('El caballo', 'Knight', 'Cavalo'), words('La torre', 'Rook', 'Torre'), words('El alfil', 'Bishop', 'Bispo')], 'a'),
  q('q3', words('¿Cómo camina una torre?', 'How does a rook move?', 'Como a torre se move?'),
    [words('Solo en diagonal', 'Only diagonally', 'Só na diagonal'), words('Saltando en L', 'In an L', 'Em L'), words('En línea recta', 'In straight lines', 'Em linha reta')], 'c'),
  q('q4', words('Si atacan a tu rey, ¿qué haces?', 'What do you do when your king is in check?', 'O que fazer quando seu rei está em xeque?'),
    [words('Lo protejo con una jugada legal', 'Find a legal move to protect it', 'Faço uma jogada legal para protegê-lo'), words('Sigo con cualquier pieza', 'Play any piece', 'Jogo qualquer peça'), words('Ignoro el ataque', 'Ignore the attack', 'Ignoro o ataque')], 'a'),
  q('q5', words('¿Qué significa dar jaque mate?', 'What does checkmate mean?', 'O que significa xeque-mate?'),
    [words('Capturar un peón', 'Capture a pawn', 'Capturar um peão'), words('El rey está atacado y no puede escapar legalmente', 'The king is in check with no legal escape', 'O rei está em xeque sem saída legal'), words('Mover la dama', 'Move the queen', 'Mover a dama')], 'b'),
];

export const ADULT_QUESTIONS: readonly Question[] = [
  q('q1', words('En la coordenada e4, ¿qué representa la letra?', 'In the square e4, what does the letter represent?', 'Na casa e4, o que representa a letra?'),
    [words('La fila', 'The rank', 'A fileira'), words('La columna', 'The file', 'A coluna'), words('El turno', 'The turn', 'O turno')], 'b'),
  q('q2', words('¿Qué pieza puede recorrer filas y columnas sin saltar?', 'Which piece moves along ranks and files without jumping?', 'Qual peça percorre fileiras e colunas sem saltar?'),
    [words('La torre', 'Rook', 'Torre'), words('El alfil', 'Bishop', 'Bispo'), words('El caballo', 'Knight', 'Cavalo')], 'a'),
  q('q3', words('¿Cómo se desplaza un alfil?', 'How does a bishop move?', 'Como o bispo se move?'),
    [words('En L', 'In an L', 'Em L'), words('Solo en línea recta', 'Only in straight ranks/files', 'Só em fileiras/colunas'), words('En diagonales', 'Diagonally', 'Nas diagonais')], 'c'),
  q('q4', words('¿Cuál es la obligación cuando tu rey está en jaque?', 'What is required when your king is in check?', 'O que é obrigatório quando seu rei está em xeque?'),
    [words('Responder con una jugada legal que elimine el jaque', 'Make a legal move that ends check', 'Fazer uma jogada legal que elimine o xeque'), words('Capturar cualquier peón', 'Capture any pawn', 'Capturar qualquer peão'), words('Ofrecer tablas', 'Offer a draw', 'Oferecer empate')], 'a'),
  q('q5', words('¿Cuándo se termina una partida por jaque mate?', 'When does a game end in checkmate?', 'Quando uma partida acaba em xeque-mate?'),
    [words('Cuando se pierde la dama', 'When the queen is lost', 'Quando a dama é perdida'), words('Cuando el rey está en jaque y no existe respuesta legal', 'When the king is checked and has no legal response', 'Quando o rei está em xeque sem resposta legal'), words('Cuando se acaban los peones', 'When all pawns are gone', 'Quando acabam os peões')], 'b'),
];

export const AGE_BANDS: readonly AgeBand[] = ['6-9', '10-12', '13-17', 'adult'];
export const isChild = (age: AgeBand) => age !== 'adult';
export const questionsForAge = (age: AgeBand): readonly Question[] =>
  age === '6-9' || age === '10-12' ? CHILD_QUESTIONS : ADULT_QUESTIONS;

export function gradeDiagnostic(age: AgeBand, answers: Partial<Answers>): { score: number; total: number; route: 'zero' | 'bridge' } {
  const questions = questionsForAge(age);
  const score = questions.reduce((total, question) => total + Number(answers[question.id] === question.correct), 0);
  return { score, total: questions.length, route: score >= 4 ? 'bridge' : 'zero' };
}

const required = ['q1', 'q2', 'q3', 'q4', 'q5'] as const;
export function validDiagnostic(input: unknown): input is RoomDiagnostic {
  if (!input || typeof input !== 'object') return false;
  const d = input as Partial<RoomDiagnostic>;
  return typeof d.uid === 'string' && d.uid.length > 0 &&
    AGE_BANDS.includes(d.ageBand as AgeBand) &&
    d.guardianConfirmed === isChild(d.ageBand as AgeBand) &&
    ['discover','family','compete'].includes(d.goal as string) &&
    !!d.answers && typeof d.answers === 'object' &&
    Object.keys(d.answers).length === 5 &&
    required.every(id => ['a','b','c'].includes(d.answers![id]));
}
export function roomAllowsAge(audience: RoomAudience, age: AgeBand): boolean {
  return audience === 'mixed' || (audience === 'children') === isChild(age);
}
export function safeRoomTitle(raw: string): string {
  const value = raw.trim().replace(/\s+/g, ' ');
  if (value.length < 6 || value.length > 80) throw new Error('invalid-title');
  return value;
}
export function parseRoom(id: string, raw: unknown): LearningRoom | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  if (d.schemaVersion !== 1 || typeof d.ownerUid !== 'string' ||
    typeof d.title !== 'string' || d.title.length < 6 || d.title.length > 80 ||
    !['children','adults','mixed'].includes(d.audience as string) ||
    !['es','en','pt'].includes(d.language as string) ||
    !['active','closed'].includes(d.status as string)) return null;
  return {id,ownerUid:d.ownerUid,title:d.title,audience:d.audience as RoomAudience,language:d.language as Language,status:d.status as LearningRoom['status']};
}

export interface StarterMilestone {
  id: string;
  title: Localized;
  practice: { kind: 'lesson' | 'puzzle'; id: string };
  done: boolean;
}
export function zeroToOneMilestones(progress: Progress): StarterMilestone[] {
  const specs: Array<{id:string;title:Localized; practice: StarterMilestone['practice']; required: string[]}> = [
    {id:'board', title: words('Reconozco el tablero', 'I know the board', 'Reconheço o tabuleiro'),practice:{kind:'lesson',id:'board-vision'},required:['lesson:board-vision']},
    {id:'straight',title:words('Muevo la torre y el alfil', 'I can move rook and bishop', 'Movimento torre e bispo'),practice:{kind:'puzzle',id:'rook-file'},required:['puzzle:rook-file','puzzle:bishop-diagonal']},
    {id:'jump',title:words('Muevo caballo y peón', 'I can move knight and pawn', 'Movimento cavalo e peão'),practice:{kind:'puzzle',id:'knight-jump'},required:['puzzle:knight-jump','puzzle:pawn-capture']},
    {id:'king',title:words('Protejo a mi rey', 'I can protect my king', 'Protejo meu rei'),practice:{kind:'lesson',id:'king-safety'},required:['lesson:king-safety']},
    {id:'mate',title:words('Resuelvo mi primer mate', 'I solve my first checkmate', 'Resolvo meu primeiro mate'),practice:{kind:'puzzle',id:'back-rank'},required:['puzzle:back-rank']},
  ];
  const achieved=new Set([...progress.lessons.map(id=>'lesson:'+id),...progress.solved.map(id=>'puzzle:'+id)]);
  return specs.map(({required,...spec})=>{
    const done=required.every(item=>achieved.has(item));
    const next=required.find(item=>!achieved.has(item));
    const [kind,id]=(next||spec.practice.kind+':'+spec.practice.id).split(':');
    return {...spec,practice:{kind:kind as 'lesson'|'puzzle',id},done};
  });
}
