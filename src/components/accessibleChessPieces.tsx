import { defaultPieces, type PieceRenderObject } from 'react-chessboard';
import type { TFunction } from 'i18next';

const pieceKeys = {
  P: 'pawn',
  N: 'knight',
  B: 'bishop',
  R: 'rook',
  Q: 'queen',
  K: 'king',
} as const;

export function createAccessibleChessPieces(t: TFunction): PieceRenderObject {
  return Object.fromEntries(
    Object.entries(defaultPieces).map(([pieceType, renderPiece]) => {
      const colorKey = pieceType[0] === 'w' ? 'white' : 'black';
      const pieceKey = pieceKeys[pieceType[1] as keyof typeof pieceKeys];

      return [
        pieceType,
        (props?: { fill?: string; square?: string; svgStyle?: React.CSSProperties }) => (
          <span style={{ display: 'block', width: '100%', height: '100%', position: 'relative' }}>
            <span className="sr-only">
              {`${String(t(`pieces.${pieceKey}`))}, ${String(t(`colors.${colorKey}`))}, ${props?.square ?? ''}`}
            </span>
            <span aria-hidden="true" style={{ display: 'block', width: '100%', height: '100%' }}>
              {renderPiece(props)}
            </span>
          </span>
        ),
      ];
    }),
  ) as PieceRenderObject;
}
