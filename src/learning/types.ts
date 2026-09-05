export type Locale = 'es' | 'en' | 'pt';
export type Text = Record<Locale, string>;
export const text = (es: string, en: string, pt: string): Text => ({ es, en, pt });
export const locale = (value?: string): Locale => value?.startsWith('es') ? 'es' : value?.startsWith('pt') ? 'pt' : 'en';
export type Category = 'basics' | 'mate' | 'fork' | 'tactics' | 'endgame' | 'calculation' | 'mixed';
export type Level = 'beginner' | 'easy' | 'intermediate' | 'advanced';
export interface Puzzle {
  id: string; fen: string; solution: string[]; category: Category; level: Level;
  title?: Text; explanation?: Text; rating?: number; source: 'original' | 'lichess'; sourceUrl?: string; tags: string[];
}
export interface Lesson {
  id: string; track: 'fundamentals' | 'tactics' | 'strategy' | 'openings' | 'endgames' | 'calculation';
  level: Level; minutes: number; title: Text; body: Text[]; takeaway: Text;
  question: Text; options: Text[]; answer: number; explanation: Text; practice: Category;
}
