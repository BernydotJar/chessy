import { Text, text as t } from './types';

export type PieceDomain = 'rook' | 'bishop' | 'queen' | 'knight' | 'pawn' | 'king' | 'coordination';
export type MasteryPhaseId =
  | 'piece-tools'
  | 'piece-coordination'
  | 'thinking-discipline'
  | 'mini-games'
  | 'middlegame'
  | 'openings'
  | 'endgames'
  | 'real-games';

export interface PieceSkill {
  id: string;
  piece: PieceDomain;
  title: Text;
  evidence: readonly string[];
}

export interface MasteryPhase {
  id: MasteryPhaseId;
  order: number;
  title: Text;
  summary: Text;
  marker: Text;
  domains: readonly PieceDomain[];
}

export const PIECE_SKILLS: readonly PieceSkill[] = [
  { id:'rook-lines', piece:'rook', title:t('Líneas, bloqueos y capturas','Lines, blockers and captures','Linhas, bloqueios e capturas'), evidence:['line','block','capture','vision'] },
  { id:'rook-safety', piece:'rook', title:t('Actividad segura de la torre','Safe rook activity','Atividade segura da torre'), evidence:['defense','decision'] },
  { id:'bishop-diagonals', piece:'bishop', title:t('Diagonales y complejos de color','Diagonals and color complexes','Diagonais e complexos de cor'), evidence:['diagonal','block','vision'] },
  { id:'queen-geometry', piece:'queen', title:t('Geometría de dama sin sobreexponerla','Queen geometry without overexposure','Geometria da dama sem superexposição'), evidence:['line','diagonal','safety'] },
  { id:'knight-geometry', piece:'knight', title:t('Saltos, centro y casillas fuertes','Jumps, center and strong squares','Saltos, centro e casas fortes'), evidence:['jump','fork','outpost'] },
  { id:'pawn-structure', piece:'pawn', title:t('Cadenas, rupturas y peones pasados','Chains, breaks and passed pawns','Cadeias, rupturas e peões passados'), evidence:['structure','break','passed-pawn'] },
  { id:'king-role', piece:'king', title:t('Seguridad primero, actividad después','Safety first, activity later','Segurança primeiro, atividade depois'), evidence:['king-safety','opposition','activity'] },
  { id:'piece-coordination', piece:'coordination', title:t('Coordina piezas con funciones distintas','Coordinate pieces with different roles','Coordene peças com funções diferentes'), evidence:['coordination','candidate-moves','threats'] },
] as const;

export const MASTERY_PATH: readonly MasteryPhase[] = [
  {
    id:'piece-tools', order:1,
    title:t('Piezas como herramientas','Pieces as tools','Peças como ferramentas'),
    summary:t('Aprende qué puede lograr cada pieza, qué la bloquea y cuándo una acción es segura.','Learn what each piece can accomplish, what blocks it, and when an action is safe.','Aprenda o que cada peça pode fazer, o que a bloqueia e quando uma ação é segura.'),
    marker:t('Fundamento','Foundation','Fundamento'),
    domains:['rook','bishop','queen','knight','pawn','king'],
  },
  {
    id:'piece-coordination', order:2,
    title:t('Coordina las herramientas','Coordinate the tools','Coordene as ferramentas'),
    summary:t('Combina torre y alfil, dama con piezas menores y finalmente varias funciones a la vez.','Combine rook and bishop, queen with minor pieces, and eventually several roles at once.','Combine torre e bispo, dama com peças menores e depois várias funções ao mesmo tempo.'),
    marker:t('Coordinación','Coordination','Coordenação'),
    domains:['coordination'],
  },
  {
    id:'thinking-discipline', order:3,
    title:t('Disciplina de decisión','Decision discipline','Disciplina de decisão'),
    summary:t('Amenazas, piezas defendidas, candidatos y orden de cálculo antes de mover.','Threats, defended pieces, candidate moves and calculation order before moving.','Ameaças, peças defendidas, lances candidatos e ordem de cálculo antes de mover.'),
    marker:t('Pensamiento','Thinking','Pensamento'),
    domains:['coordination'],
  },
  {
    id:'mini-games', order:4,
    title:t('Minipartidas con propósito','Purposeful mini-games','Minipartidas com propósito'),
    summary:t('Reduce la complejidad del tablero para practicar una sola familia de decisiones.','Reduce board complexity to practice one family of decisions at a time.','Reduza a complexidade do tabuleiro para praticar uma família de decisões por vez.'),
    marker:t('Transferencia','Transfer','Transferência'),
    domains:['pawn','rook','bishop','knight','queen','king'],
  },
  {
    id:'middlegame', order:5,
    title:t('Medio juego como síntesis','Middlegame as synthesis','Meio-jogo como síntese'),
    summary:t('Usa actividad, coordinación, estructura y táctica en posiciones con más piezas.','Use activity, coordination, structure and tactics in richer positions.','Use atividade, coordenação, estrutura e tática em posições mais ricas.'),
    marker:t('Integración','Integration','Integração'),
    domains:['coordination'],
  },
  {
    id:'openings', order:6,
    title:t('Aperturas con intención','Openings with intent','Aberturas com intenção'),
    summary:t('Entiende qué pieza se desarrolla, qué casilla disputa y qué plan prepara antes de memorizar.','Understand which piece develops, which square it contests and which plan it prepares before memorizing.','Entenda qual peça se desenvolve, qual casa disputa e qual plano prepara antes de memorizar.'),
    marker:t('Contexto','Context','Contexto'),
    domains:['coordination'],
  },
  {
    id:'endgames', order:7,
    title:t('Finales para convertir ventajas','Endgames to convert advantages','Finais para converter vantagens'),
    summary:t('Rey activo, peones y técnica con menos piezas y objetivos más claros.','Active king, pawns and technique with fewer pieces and clearer objectives.','Rei ativo, peões e técnica com menos peças e objetivos mais claros.'),
    marker:t('Conversión','Conversion','Conversão'),
    domains:['king','pawn','rook'],
  },
  {
    id:'real-games', order:8,
    title:t('Partida real guiada','Guided real game','Partida real guiada'),
    summary:t('Juega posiciones completas y revisa qué herramientas anteriores aparecieron de verdad.','Play full positions and review which earlier tools actually appeared.','Jogue posições completas e revise quais ferramentas anteriores realmente apareceram.'),
    marker:t('Aplicación','Application','Aplicação'),
    domains:['coordination'],
  },
] as const;
