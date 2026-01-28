export type Exercise = {
  exercise_id: string;
  title: string;
  instruction: string;
  side_to_move: 'white' | 'black';
  difficulty: 'very_easy' | 'easy' | 'medium';
  concepts_trained: string[];
  initial_position: {
    fen: string;
  };
  solution: {
    best_move: string;
    explanation: string;
  };
  distractors: Array<{ move: string; why_wrong: string }>;
  validation_rules: {
    only_one_best_move: boolean;
    no_check_in_solution: boolean;
    material_gain: boolean;
  };
};

export const BLOCK1_ROOK: Exercise[] = [
  {
    exercise_id: 'R1-CAP-LINE-VE-01',
    title: 'Captura horizontal',
    instruction: 'Captura el peón con la torre.',
    side_to_move: 'white',
    difficulty: 'very_easy',
    concepts_trained: ['capture', 'line', 'vision'],
    initial_position: {
      fen: '4k3/8/8/p7/8/8/8/R3K3 w - - 0 1',
    },
    solution: {
      best_move: 'Rxa5',
      explanation: 'La torre se mueve en línea recta y captura el peón sin peligro.',
    },
    distractors: [
      { move: 'Ra2', why_wrong: 'No captura nada y pierde la oportunidad.' },
    ],
    validation_rules: {
      only_one_best_move: true,
      no_check_in_solution: true,
      material_gain: true,
    },
  },
  {
    exercise_id: 'R1-CAP-LINE-VE-02',
    title: 'Captura vertical',
    instruction: 'Captura el peón con la torre.',
    side_to_move: 'white',
    difficulty: 'very_easy',
    concepts_trained: ['capture', 'line', 'vision'],
    initial_position: {
      fen: '4k3/3p4/8/8/8/8/8/3RK3 w - - 0 1',
    },
    solution: {
      best_move: 'Rxd7',
      explanation: 'La torre sube por la columna y captura el peón.',
    },
    distractors: [
      { move: 'Rd2', why_wrong: 'No captura y no mejora la posición.' },
    ],
    validation_rules: {
      only_one_best_move: true,
      no_check_in_solution: true,
      material_gain: true,
    },
  },
  {
    exercise_id: 'R1-CAP-BLK-VE-03',
    title: 'Captura bloqueada',
    instruction: '¿Puede la torre capturar? Encuentra el mejor movimiento.',
    side_to_move: 'white',
    difficulty: 'very_easy',
    concepts_trained: ['capture', 'block', 'decision'],
    initial_position: {
      fen: '4k3/8/8/p7/8/P7/8/R3K3 w - - 0 1',
    },
    solution: {
      best_move: 'a4',
      explanation: 'La propia pieza bloquea la torre. Avanza el peón para abrir la línea.',
    },
    distractors: [
      { move: 'Rxa5', why_wrong: 'La torre está bloqueada y no puede capturar.' },
    ],
    validation_rules: {
      only_one_best_move: true,
      no_check_in_solution: true,
      material_gain: false,
    },
  },
  {
    exercise_id: 'R1-CAP-UNG-VE-04',
    title: 'Captura pieza indefensa',
    instruction: 'Captura la pieza indefensa.',
    side_to_move: 'white',
    difficulty: 'very_easy',
    concepts_trained: ['capture', 'vision'],
    initial_position: {
      fen: '4k3/8/8/8/8/8/3p4/3RK3 w - - 0 1',
    },
    solution: {
      best_move: 'Rxd2',
      explanation: 'El peón está indefenso. Capturarlo gana material.',
    },
    distractors: [
      { move: 'Ke2', why_wrong: 'La torre puede capturar de inmediato.' },
    ],
    validation_rules: {
      only_one_best_move: true,
      no_check_in_solution: true,
      material_gain: true,
    },
  },
  {
    exercise_id: 'R1-CAP-DEF-E-05',
    title: 'Captura vs pieza defendida',
    instruction: 'Captura con la torre solo si es seguro.',
    side_to_move: 'white',
    difficulty: 'easy',
    concepts_trained: ['capture', 'defense', 'decision'],
    initial_position: {
      fen: '4k3/8/8/8/8/3p4/4K3/3R4 w - - 0 1',
    },
    solution: {
      best_move: 'Rxd3',
      explanation: 'El peón no está defendido. La torre captura y queda segura.',
    },
    distractors: [
      { move: 'Rxd3+', why_wrong: 'No hay jaque; la captura simple es suficiente.' },
    ],
    validation_rules: {
      only_one_best_move: true,
      no_check_in_solution: true,
      material_gain: true,
    },
  },
];
