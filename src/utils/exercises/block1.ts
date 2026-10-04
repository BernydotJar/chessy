import { Text, text as t } from '../../learning/types';

export type Exercise = {
  exercise_id: string;
  title: Text;
  instruction: Text;
  side_to_move: 'white' | 'black';
  difficulty: 'very_easy' | 'easy' | 'medium';
  concepts_trained: string[];
  initial_position: {
    fen: string;
  };
  solution: {
    best_move: string;
    explanation: Text;
  };
  distractors: Array<{ move: string; why_wrong: Text }>;
  validation_rules: {
    only_one_best_move: boolean;
    no_check_in_solution: boolean;
    material_gain: boolean;
  };
};

export const BLOCK1_ROOK: Exercise[] = [
  {
    exercise_id: 'R1-CAP-LINE-VE-01',
    title: t('Captura horizontal','Horizontal capture','Captura horizontal'),
    instruction: t('Captura el pe\u00f3n con la torre.','Capture the pawn with the rook.','Capture o pe\u00e3o com a torre.'),
    side_to_move: 'white',
    difficulty: 'very_easy',
    concepts_trained: ['capture', 'line', 'vision'],
    initial_position: {
      fen: '4k3/8/8/p7/8/8/8/R3K3 w - - 0 1',
    },
    solution: {
      best_move: 'Rxa5',
      explanation: t('La torre se mueve en l\u00ednea recta y captura el pe\u00f3n sin peligro.','The rook moves in a straight line and captures the pawn safely.','A torre se move em linha reta e captura o pe\u00e3o com seguran\u00e7a.'),
    },
    distractors: [
      { move: 'Ra2', why_wrong: t('No captura nada y pierde la oportunidad.','It captures nothing and misses the opportunity.','N\u00e3o captura nada e perde a oportunidade.') },
    ],
    validation_rules: {
      only_one_best_move: true,
      no_check_in_solution: true,
      material_gain: true,
    },
  },
  {
    exercise_id: 'R1-CAP-LINE-VE-02',
    title: t('Captura vertical','Vertical capture','Captura vertical'),
    instruction: t('Captura el pe\u00f3n con la torre.','Capture the pawn with the rook.','Capture o pe\u00e3o com a torre.'),
    side_to_move: 'white',
    difficulty: 'very_easy',
    concepts_trained: ['capture', 'line', 'vision'],
    initial_position: {
      fen: '4k3/3p4/8/8/8/8/8/3RK3 w - - 0 1',
    },
    solution: {
      best_move: 'Rxd7',
      explanation: t('La torre sube por la columna y captura el pe\u00f3n.','The rook travels up the file and captures the pawn.','A torre sobe pela coluna e captura o pe\u00e3o.'),
    },
    distractors: [
      { move: 'Rd2', why_wrong: t('No captura y no mejora la posici\u00f3n.','It does not capture or improve the position.','N\u00e3o captura nem melhora a posi\u00e7\u00e3o.') },
    ],
    validation_rules: {
      only_one_best_move: true,
      no_check_in_solution: true,
      material_gain: true,
    },
  },
  {
    exercise_id: 'R1-CAP-BLK-VE-03',
    title: t('Captura bloqueada','Blocked capture','Captura bloqueada'),
    instruction: t('\u00bfPuede la torre capturar? Encuentra el mejor movimiento.','Can the rook capture? Find the best move.','A torre pode capturar? Encontre o melhor lance.'),
    side_to_move: 'white',
    difficulty: 'very_easy',
    concepts_trained: ['capture', 'block', 'decision'],
    initial_position: {
      fen: '4k3/8/8/p7/8/P7/8/R3K3 w - - 0 1',
    },
    solution: {
      best_move: 'a4',
      explanation: t('La propia pieza bloquea la torre. Avanza el pe\u00f3n para abrir la l\u00ednea.','Your own piece blocks the rook. Advance the pawn to open the line.','A pr\u00f3pria pe\u00e7a bloqueia a torre. Avance o pe\u00e3o para abrir a linha.'),
    },
    distractors: [
      { move: 'Rxa5', why_wrong: t('La torre est\u00e1 bloqueada y no puede capturar.','The rook is blocked and cannot capture.','A torre est\u00e1 bloqueada e n\u00e3o pode capturar.') },
    ],
    validation_rules: {
      only_one_best_move: true,
      no_check_in_solution: true,
      material_gain: false,
    },
  },
  {
    exercise_id: 'R1-CAP-UNG-VE-04',
    title: t('Captura pieza indefensa','Capture an undefended piece','Capture uma pe\u00e7a indefesa'),
    instruction: t('Captura la pieza indefensa.','Capture the undefended piece.','Capture a pe\u00e7a indefesa.'),
    side_to_move: 'white',
    difficulty: 'very_easy',
    concepts_trained: ['capture', 'vision'],
    initial_position: {
      fen: '4k3/8/8/8/8/8/3p4/3RK3 w - - 0 1',
    },
    solution: {
      best_move: 'Rxd2',
      explanation: t('El pe\u00f3n est\u00e1 indefenso. Capturarlo gana material.','The pawn is undefended. Capturing it wins material.','O pe\u00e3o est\u00e1 indefeso. Captur\u00e1-lo ganha material.'),
    },
    distractors: [
      { move: 'Ke2', why_wrong: t('La torre puede capturar de inmediato.','The rook can capture immediately.','A torre pode capturar imediatamente.') },
    ],
    validation_rules: {
      only_one_best_move: true,
      no_check_in_solution: true,
      material_gain: true,
    },
  },
  {
    exercise_id: 'R1-CAP-DEF-E-05',
    title: t('Captura vs. pieza defendida','Capture versus a defended piece','Captura contra pe\u00e7a defendida'),
    instruction: t('Captura con la torre solo si es seguro.','Capture with the rook only when it is safe.','Capture com a torre apenas quando for seguro.'),
    side_to_move: 'white',
    difficulty: 'easy',
    concepts_trained: ['capture', 'defense', 'decision'],
    initial_position: {
      fen: '4k3/8/8/8/8/3p4/4K3/3R4 w - - 0 1',
    },
    solution: {
      best_move: 'Rxd3',
      explanation: t('El pe\u00f3n no est\u00e1 defendido. La torre captura y queda segura.','The pawn is not defended. The rook captures and remains safe.','O pe\u00e3o n\u00e3o est\u00e1 defendido. A torre captura e permanece segura.'),
    },
    distractors: [
      { move: 'Rxd3+', why_wrong: t('No hay jaque; la captura simple es suficiente.','There is no check; the simple capture is enough.','N\u00e3o h\u00e1 xeque; a captura simples \u00e9 suficiente.') },
    ],
    validation_rules: {
      only_one_best_move: true,
      no_check_in_solution: true,
      material_gain: true,
    },
  },
];
