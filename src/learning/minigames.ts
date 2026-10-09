import { Text, text as t } from './types';

export type MiniGamePieceFamily = 'pawns' | 'rooks' | 'bishops' | 'knights' | 'queens';

export interface MiniGamePreset {
  id: string;
  family: MiniGamePieceFamily;
  title: Text;
  purpose: Text;
  fen: string;
}

export const MINI_GAME_PRESETS: readonly MiniGamePreset[] = [
  {
    id:'pawns-kings',
    family:'pawns',
    title:t('8 peones + rey','8 pawns + king','8 peões + rei'),
    purpose:t('Practica estructura, rupturas, oposición y creación de peones pasados.','Practice structure, breaks, opposition and creating passed pawns.','Pratique estrutura, rupturas, oposição e criação de peões passados.'),
    fen:'4k3/pppppppp/8/8/8/8/PPPPPPPP/4K3 w - - 0 1',
  },
  {
    id:'rooks-pawns',
    family:'rooks',
    title:t('Dos torres + peones','Two rooks + pawns','Duas torres + peões'),
    purpose:t('Entrena columnas, actividad de torres y coordinación sin piezas menores.','Train files, rook activity and coordination without minor pieces.','Treine colunas, atividade das torres e coordenação sem peças menores.'),
    fen:'r3k2r/p2p2p1/8/8/8/8/P2P2P1/R3K2R w - - 0 1',
  },
  {
    id:'bishops',
    family:'bishops',
    title:t('Alfiles contra alfiles','Bishops versus bishops','Bispos contra bispos'),
    purpose:t('Lee diagonales, bloqueos y el valor de cada complejo de color.','Read diagonals, blockers and the value of each color complex.','Leia diagonais, bloqueios e o valor de cada complexo de cor.'),
    fen:'2b1kb2/3pp3/8/8/8/8/3PP3/2B1KB2 w - - 0 1',
  },
  {
    id:'knights',
    family:'knights',
    title:t('Caballos contra caballos','Knights versus knights','Cavalos contra cavalos'),
    purpose:t('Compara centro y borde, casillas fuertes, saltos y ataques dobles.','Compare center and rim, strong squares, jumps and double attacks.','Compare centro e borda, casas fortes, saltos e ataques duplos.'),
    fen:'4k3/8/2n2n2/8/8/2N2N2/8/4K3 w - - 0 1',
  },
  {
    id:'queens',
    family:'queens',
    title:t('Dama contra dama','Queen versus queen','Dama contra dama'),
    purpose:t('Practica alcance, jaques, seguridad del rey y cuándo simplificar.','Practice reach, checks, king safety and when to simplify.','Pratique alcance, xeques, segurança do rei e quando simplificar.'),
    fen:'3qk3/8/8/8/8/8/8/3QK3 w - - 0 1',
  },
] as const;
