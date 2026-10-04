import { Text, text as t } from './types';

export type EcoBandId = 'A' | 'B' | 'C' | 'D' | 'E';

export interface EcoBand {
  id: EcoBandId;
  range: string;
  title: Text;
  examples: readonly string[];
}

/**
 * ECO is used as a study index only after piece use, coordination and
 * constrained play. These bands do not claim that any of the 624 source
 * exercises has already been mapped to an opening family.
 */
export const ECO_BANDS: readonly EcoBand[] = [
  {
    id:'A',
    range:'A00-A99',
    title:t('Aperturas de flanco e irregulares','Flank and irregular openings','Aberturas de flanco e irregulares'),
    examples:['English Opening','Dutch Defence','Benoni systems'],
  },
  {
    id:'B',
    range:'B00-B99',
    title:t('Juegos semiabiertos, excepto la Francesa','Semi-open games, except the French','Jogos semiabertos, exceto a Francesa'),
    examples:['Sicilian Defence','Caro-Kann Defence','Pirc / Modern Defence'],
  },
  {
    id:'C',
    range:'C00-C99',
    title:t('Juegos abiertos y Defensa Francesa','Open games and the French Defence','Jogos abertos e Defesa Francesa'),
    examples:['French Defence','Ruy Lopez','Italian Game'],
  },
  {
    id:'D',
    range:'D00-D99',
    title:t('Sistemas cerrados y semicerrados de pe\u00f3n dama','Closed and semi-closed queen-pawn systems','Sistemas fechados e semifechados de pe\u00e3o da dama'),
    examples:['Queen\'s Gambit','Slav Defence','Grunfeld Defence'],
  },
  {
    id:'E',
    range:'E00-E99',
    title:t('Defensas Indias y sistemas Catalanes','Indian defences and Catalan systems','Defesas Indianas e sistemas Catal\u00e3es'),
    examples:['Nimzo-Indian Defence','Queen\'s Indian Defence','King\'s Indian Defence'],
  },
] as const;
