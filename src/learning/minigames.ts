import { Text, text as t } from './types';

export type MiniGamePieceFamily = 'pawns' | 'rooks' | 'bishops' | 'knights' | 'queens';

export interface MiniGamePreset {
  id: string;
  family: MiniGamePieceFamily;
  title: Text;
  purpose: Text;
  goal: Text;
  focus: readonly Text[];
  fen: string;
}

export const MINI_GAME_PRESETS: readonly MiniGamePreset[] = [
  {
    id:'pawns-kings',
    family:'pawns',
    title:t('8 peones + rey','8 pawns + king','8 pe\u00f5es + rei'),
    purpose:t('Practica estructura, rupturas, oposici\u00f3n y creaci\u00f3n de peones pasados.','Practice structure, breaks, opposition and creating passed pawns.','Pratique estrutura, rupturas, oposi\u00e7\u00e3o e cria\u00e7\u00e3o de pe\u00f5es passados.'),
    goal:t('Crea un pe\u00f3n pasado y ll\u00e9valo a promoci\u00f3n sin regalar la oposici\u00f3n.','Create a passed pawn and promote it without giving away the opposition.','Crie um pe\u00e3o passado e promova-o sem ceder a oposi\u00e7\u00e3o.'),
    focus:[
      t('Estructura antes de avanzar','Structure before advancing','Estrutura antes de avan\u00e7ar'),
      t('Rey activo','Active king','Rei ativo'),
      t('Rupturas y peones pasados','Breaks and passed pawns','Rupturas e pe\u00f5es passados'),
    ],
    fen:'4k3/pppppppp/8/8/8/8/PPPPPPPP/4K3 w - - 0 1',
  },
  {
    id:'rooks-pawns',
    family:'rooks',
    title:t('Dos torres + peones','Two rooks + pawns','Duas torres + pe\u00f5es'),
    purpose:t('Entrena columnas, actividad de torres y coordinaci\u00f3n sin piezas menores.','Train files, rook activity and coordination without minor pieces.','Treine colunas, atividade das torres e coordena\u00e7\u00e3o sem pe\u00e7as menores.'),
    goal:t('Activa ambas torres, disputa una columna y convierte una ventaja material o de actividad.','Activate both rooks, contest a file and convert a material or activity edge.','Ative as duas torres, dispute uma coluna e converta uma vantagem material ou de atividade.'),
    focus:[
      t('Columnas abiertas','Open files','Colunas abertas'),
      t('Torres conectadas','Connected rooks','Torres conectadas'),
      t('Capturas seguras','Safe captures','Capturas seguras'),
    ],
    fen:'r3k2r/p2p2p1/8/8/8/8/P2P2P1/R3K2R w - - 0 1',
  },
  {
    id:'bishops',
    family:'bishops',
    title:t('Alfiles contra alfiles','Bishops versus bishops','Bispos contra bispos'),
    purpose:t('Lee diagonales, bloqueos y el valor de cada complejo de color.','Read diagonals, blockers and the value of each color complex.','Leia diagonais, bloqueios e o valor de cada complexo de cor.'),
    goal:t('Mejora tu alfil antes de abrir la posici\u00f3n y gana un pe\u00f3n sin perder el control de su color.','Improve your bishop before opening the position and win a pawn without losing control of its color complex.','Melhore o bispo antes de abrir a posi\u00e7\u00e3o e ganhe um pe\u00e3o sem perder o controle do complexo de cor.'),
    focus:[
      t('Diagonales largas','Long diagonals','Diagonais longas'),
      t('Peones que bloquean','Blocking pawns','Pe\u00f5es que bloqueiam'),
      t('Complejos de color','Color complexes','Complexos de cor'),
    ],
    fen:'2b1kb2/3pp3/8/8/8/8/3PP3/2B1KB2 w - - 0 1',
  },
  {
    id:'knights',
    family:'knights',
    title:t('Caballos contra caballos','Knights versus knights','Cavalos contra cavalos'),
    purpose:t('Compara centro y borde, casillas fuertes, saltos y ataques dobles.','Compare center and rim, strong squares, jumps and double attacks.','Compare centro e borda, casas fortes, saltos e ataques duplos.'),
    goal:t('Centraliza un caballo y crea una amenaza doble antes de buscar material.','Centralize a knight and create a double threat before hunting material.','Centralize um cavalo e crie uma amea\u00e7a dupla antes de buscar material.'),
    focus:[
      t('Centro contra borde','Center versus rim','Centro contra borda'),
      t('Casillas fuertes','Strong squares','Casas fortes'),
      t('Ataques dobles','Double attacks','Ataques duplos'),
    ],
    fen:'4k3/8/2n2n2/8/8/2N2N2/8/4K3 w - - 0 1',
  },
  {
    id:'queens',
    family:'queens',
    title:t('Dama contra dama','Queen versus queen','Dama contra dama'),
    purpose:t('Practica alcance, jaques, seguridad del rey y cu\u00e1ndo simplificar.','Practice reach, checks, king safety and when to simplify.','Pratique alcance, xeques, seguran\u00e7a do rei e quando simplificar.'),
    goal:t('Mant\u00e9n tu rey seguro, limita los jaques rivales y fuerza un cambio favorable o mate.','Keep your king safe, limit opposing checks and force a favorable trade or mate.','Mantenha o rei seguro, limite os xeques advers\u00e1rios e force uma troca favor\u00e1vel ou mate.'),
    focus:[
      t('Seguridad del rey','King safety','Seguran\u00e7a do rei'),
      t('Jaques con prop\u00f3sito','Purposeful checks','Xeques com prop\u00f3sito'),
      t('Simplificaci\u00f3n favorable','Favorable simplification','Simplifica\u00e7\u00e3o favor\u00e1vel'),
    ],
    fen:'3qk3/8/8/8/8/8/8/3QK3 w - - 0 1',
  },
] as const;
