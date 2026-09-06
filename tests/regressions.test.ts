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

describe('Icon System v3 and mobile delivery contracts', () => {
 it('renders every primary icon at the four optical sizes plus selected state', async () => {
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { IconGallery } = await import('../src/design/IconGallery');
  const markup = renderToStaticMarkup(IconGallery());
  expect(markup).toContain('Chessy Icon System v3');
  for (const name of ['home','play','challenges','academy','progress','library','games','analysis','review']) expect(markup).toContain(`data-icon="${name}"`);
  expect((markup.match(/aria-label="play /g)||[]).length).toBe(5);
 });
 it('ships an installable manifest and versioned offline worker contract', async () => {
  const { readFile } = await import('node:fs/promises');
  const manifest = JSON.parse(await readFile(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.some((icon:{sizes:string,type:string,purpose:string})=>icon.sizes==='any'&&icon.type==='image/svg+xml'&&icon.purpose==='any')).toBe(true);
  expect(manifest.icons.some((icon:{sizes:string,type:string,purpose:string})=>icon.sizes==='any'&&icon.type==='image/svg+xml'&&icon.purpose==='maskable')).toBe(true);
  const worker = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
  expect(worker).toContain("const CACHE='chessy-mobile-v1-20260906'");
  expect(worker).toContain("'/stockfish.js'");
  expect(worker).toContain("request.mode==='navigate'");
 });
});
