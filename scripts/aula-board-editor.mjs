/**
 * Pure position-editor operations. The draft may lack kings while teaching;
 * only a validated chess.js FEN can return to legal-move mode.
 * The server, not browser data, owns the canonical classroom draft.
 */
import { Chess } from 'chess.js';

const files = 'abcdefgh';
const piecePattern = /^[prnbqkPRNBQK]$/;
const squarePattern = /^[a-h][1-8]$/;

export function parsePlacement(placement) {
  if (typeof placement !== 'string') throw new Error('invalid-placement');
  const rows = placement.split('/');
  if (rows.length !== 8) throw new Error('invalid-placement');
  const board = Object.create(null);
  rows.forEach((row, index) => {
    let file = 0;
    for (const symbol of row) {
      if (/^[1-8]$/.test(symbol)) file += Number(symbol);
      else if (piecePattern.test(symbol) && file < 8) board[files[file++]+(8-index)] = symbol;
      else throw new Error('invalid-placement');
      if (file > 8) throw new Error('invalid-placement');
    }
    if (file !== 8) throw new Error('invalid-placement');
  });
  return board;
}

export function encodePlacement(board) {
  return Array.from({length:8},(_,r) => {
    let empties = 0;
    let result = '';
    for (const file of files) {
      const piece = board[file+(8-r)];
      if (!piece) empties++;
      else {
        if (!piecePattern.test(piece)) throw new Error('invalid-piece');
        if (empties) result += empties;
        result += piece;
        empties = 0;
      }
    }
    return result+(empties||'');
  }).join('/');
}

export function beginPositionEditor(fen) {
  const parts=fen.split(' ');
  const placement=encodePlacement(parsePlacement(parts[0]));
  return {placement,turn:parts[1]==='b'?'b':'w',castling:parts[2]||'-',enPassant:parts[3]||'-',
    half:Number(parts[4]||0),full:Number(parts[5]||1)};
}

export function changePositionDraft(draft,change) {
  if (!draft || !change || typeof change !== 'object') throw new Error('invalid-editor');
  const board=parsePlacement(draft.placement);
  const square=change.square;
  if (change.action==='move') {
    if (!squarePattern.test(change.from) || !squarePattern.test(square) || !board[change.from])
      throw new Error('invalid-editor-move');
    if (change.from===square) return draft;
    board[square]=board[change.from];
    delete board[change.from];
  } else if (change.action==='place') {
    if (!squarePattern.test(square) || !piecePattern.test(change.piece)) throw new Error('invalid-editor-piece');
    board[square]=change.piece;
  } else if (change.action==='remove') {
    if (!squarePattern.test(square)) throw new Error('invalid-editor-square');
    delete board[square];
  } else if (change.action==='clear') {
    return {...draft,placement:'8/8/8/8/8/8/8/8',castling:'-',enPassant:'-'};
  } else if (change.action==='turn') {
    if (change.turn!=='w' && change.turn!=='b') throw new Error('invalid-editor-turn');
    return {...draft,turn:change.turn};
  } else if (change.action==='castling') {
    if (typeof change.castling!=='string' ||
      !/^(?:-|K?Q?k?q?)$/.test(change.castling) || change.castling==='') throw new Error('invalid-editor-castling');
    return {...draft,castling:change.castling};
  } else throw new Error('invalid-editor-action');
  return {...draft,placement:encodePlacement(board),castling:'-',enPassant:'-'};
}

export function validateEditedPosition(draft) {
  // chess.js enforces kings, valid pawn ranks, castling and en-passant syntax.
  const fen=[draft.placement,draft.turn,draft.castling,draft.enPassant,draft.half,draft.full].join(' ');
  return new Chess(fen).fen();
}
