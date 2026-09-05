import { afterEach, describe, expect, it, vi } from 'vitest';
import { Chess } from 'chess.js';
import { StockfishService } from '../src/utils/stockfishService';
import { getCoachInsightWithEval } from '../src/utils/coach';
vi.mock('../src/utils/soundManager', () => ({ soundManager: { play: vi.fn(), setEnabled: vi.fn() } }));
import { useGameStore } from '../src/store/gameStore';
afterEach(() => { vi.restoreAllMocks(); useGameStore.getState().resetGame(); });
describe('Coach score perspective', () => {
 for (const moves of [['e4'], ['e4', 'e5']]) it(`preserves equal evaluation after ${moves.join(' ')}`, async () => {
  const board = new Chess(); moves.forEach(move => board.move(move));
  vi.spyOn(StockfishService.prototype, 'evaluatePosition')
   .mockResolvedValueOnce({ score: 100, depth: 12 })
   .mockResolvedValueOnce({ score: -100, depth: 12 });
  const insight = await getCoachInsightWithEval(board);
  expect(insight?.evaluation?.delta).toBe(0);
 });
});
it('custom positions do not invent captured pieces', () => {
 useGameStore.getState().loadGame('8/k1P5/2K5/8/8/8/8/8 w - - 0 1');
 expect(useGameStore.getState().capturedPieces).toEqual({ white: [], black: [] });
 useGameStore.getState().makeMove('c7', 'c8', 'r');
 expect(useGameStore.getState().capturedPieces).toEqual({ white: [], black: [] });
});
it('records an actual capture from move history', () => {
 const game = useGameStore.getState(); game.resetGame();
 game.makeMove('e2', 'e4'); game.makeMove('d7', 'd5'); game.makeMove('e4', 'd5');
 expect(useGameStore.getState().capturedPieces).toEqual({ white: ['p'], black: [] });
});
it('resigned AI games preserve opponent identity and never restart an engine move', async () => {
 useGameStore.getState().resetGame();
 useGameStore.setState({ isAIGame: true, playerColor: 'white' });
 useGameStore.getState().resignGame();
 await useGameStore.getState().makeAIMove();
 expect(useGameStore.getState().isAIGame).toBe(true);
 expect(useGameStore.getState().isAIThinking).toBe(false);
 expect(useGameStore.getState().history).toEqual([]);
});
it('undo as Black never removes the engine opening before Black has moved', () => {
 useGameStore.getState().resetGame();
 useGameStore.setState({ isAIGame: true, playerColor: 'black', trainingMode: true });
 useGameStore.getState().makeMove('e2', 'e4', undefined, true);
 useGameStore.getState().undoMove();
 expect(useGameStore.getState().history).toEqual(['e4']);
});
it('undo as Black removes the last human/engine pair but preserves the opening', () => {
 useGameStore.getState().resetGame();
 useGameStore.setState({ isAIGame: true, playerColor: 'black', trainingMode: true });
 useGameStore.getState().makeMove('e2', 'e4', undefined, true);
 useGameStore.getState().makeMove('e7', 'e5');
 useGameStore.getState().makeMove('g1', 'f3', undefined, true);
 useGameStore.getState().undoMove();
 expect(useGameStore.getState().history).toEqual(['e4']);
});
