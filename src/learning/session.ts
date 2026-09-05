import { Chess } from 'chess.js';
import { Puzzle } from './types';
export interface Session { fen:string; ply:number; moves:string[]; solved:boolean; mistakes:number; feedback:'ready'|'wrong'|'illegal'|'continue'|'solved' }
export const startSession=(p:Puzzle):Session=>({fen:p.fen,ply:0,moves:[],solved:false,mistakes:0,feedback:'ready'});
/** Wrong attempts never mutate the accepted position. Opponent replies are validated too. */
export function attempt(puzzle:Puzzle,state:Session,uci:string):Session {
  if(state.solved) return state;
  const game=new Chess(state.fen);
  let move;
  try { move=game.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]}); }
  catch { return {...state,feedback:'illegal'}; }
  const expected=puzzle.solution[state.ply];
  // Any immediate mate is accepted, including equivalent mates omitted from the reference line.
  if(uci!==expected && !game.isCheckmate()) return {...state,mistakes:state.mistakes+1,feedback:'wrong'};
  let ply=state.ply+1; const moves=[...state.moves,move.san];
  if(game.isCheckmate()||ply>=puzzle.solution.length) return {...state,fen:game.fen(),ply,moves,solved:true,feedback:'solved'};
  const reply=puzzle.solution[ply];
  moves.push(game.move({from:reply.slice(0,2),to:reply.slice(2,4),promotion:reply[4]}).san); ply++;
  const solved=ply>=puzzle.solution.length;
  return {...state,fen:game.fen(),ply,moves,solved,feedback:solved?'solved':'continue'};
}
export function solutionSan(puzzle:Puzzle):string[] {
  const game=new Chess(puzzle.fen);
  return puzzle.solution.map(m=>game.move({from:m.slice(0,2),to:m.slice(2,4),promotion:m[4]}).san);
}
