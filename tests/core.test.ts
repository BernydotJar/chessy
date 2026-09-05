import { beforeEach,afterEach,describe,it,expect,vi } from 'vitest';
import { StockfishService } from '../src/utils/stockfishService';
vi.mock('../src/utils/soundManager',()=>({soundManager:{play:vi.fn(),setEnabled:vi.fn()}}));
import { useGameStore } from '../src/store/gameStore';
class FakeWorker {
 static workers:FakeWorker[]=[]; onmessage:((e:{data:string})=>void)|null=null;onerror:(()=>void)|null=null;terminated=false;commands:string[]=[];
 constructor(){FakeWorker.workers.push(this);}
 postMessage(command:string){this.commands.push(command);if(command==='uci')queueMicrotask(()=>this.onmessage?.({data:'uciok'}));if(command==='isready')queueMicrotask(()=>this.onmessage?.({data:'readyok'}));}
 terminate(){this.terminated=true;}
 send(data:string){this.onmessage?.({data});}
}
beforeEach(()=>{vi.stubGlobal('Worker',FakeWorker);FakeWorker.workers=[];});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
const tick=()=>new Promise(r=>setTimeout(r,0));
describe('Isolated UCI requests',()=>{
 it('waits for ready and returns an underpromotion',async()=>{const e=new StockfishService();const result=e.getBestMove('fen');await tick();const w=FakeWorker.workers[0];expect(w.commands).toContain('isready');w.send('bestmove c7c8n');expect(await result).toEqual({from:'c7',to:'c8',promotion:'n'});e.terminate();});
 it('serializes evaluations without overwriting callbacks',async()=>{const e=new StockfishService();const a=e.getBestMove('first');const b=e.getBestMove('second');await tick();const w=FakeWorker.workers[0];expect(w.commands).not.toContain('position fen second');w.send('bestmove e2e4');await a;await tick();expect(w.commands).toContain('position fen second');w.send('bestmove d2d4');expect((await b)?.from).toBe('d2');e.terminate();});
 it('rejects on worker error instead of hanging',async()=>{const e=new StockfishService();const p=e.getBestMove('fen');const rejection=expect(p).rejects.toThrow('worker error');await tick();FakeWorker.workers[0].onerror?.();await rejection;expect(FakeWorker.workers[0].terminated).toBe(true);});
 it('cancel invalidates queued work',async()=>{const e=new StockfishService();const a=e.getBestMove('one'),b=e.getBestMove('two');const ra=expect(a).rejects.toThrow(),rb=expect(b).rejects.toThrow();await tick();e.terminate();await ra;await rb;expect(FakeWorker.workers).toHaveLength(1);});
 it('returns multipv lines in order with mate scores',async()=>{const e=new StockfishService();const p=e.evaluatePositionMultiPV('fen',10,2);await tick();const w=FakeWorker.workers[0];w.send('info depth 8 multipv 2 score cp 25 pv a2a4');w.send('info depth 8 multipv 1 score mate 2 pv e2e4');w.send('bestmove e2e4');const lines=await p;expect(lines[0].mate).toBe(2);expect(lines[1].score).toBe(25);e.terminate();});
});
describe('Core legal game state',()=>{
 beforeEach(()=>useGameStore.getState().resetGame());
 it('rejects illegal moves',()=>{const s=useGameStore.getState();expect(s.makeMove('e2','e5')).toBe(false);expect(useGameStore.getState().history).toHaveLength(0);});
 it('resignation ends the game without erasing history',()=>{useGameStore.getState().makeMove('e2','e4');useGameStore.getState().resignGame();expect(useGameStore.getState().history).toEqual(['e4']);expect(useGameStore.getState().winner).toBe('white');expect(useGameStore.getState().makeMove('e7','e5')).toBe(false);});
 it('keeps an explicit underpromotion',()=>{useGameStore.getState().loadGame('8/k1P5/2K5/8/8/8/8/8 w - - 0 1');expect(useGameStore.getState().makeMove('c7','c8','r')).toBe(true);expect(useGameStore.getState().chess.get('c8').type).toBe('r');});
 it('loading a position cancels AI state',()=>{useGameStore.setState({isAIGame:true,isAIThinking:true});useGameStore.getState().loadGame('4k3/8/8/8/8/8/4P3/4K3 w - - 0 1');expect(useGameStore.getState().isAIGame).toBe(false);expect(useGameStore.getState().isAIThinking).toBe(false);});
 it('undo is blocked during AI thinking',()=>{useGameStore.getState().makeMove('e2','e4');useGameStore.setState({isAIThinking:true});useGameStore.getState().undoMove();expect(useGameStore.getState().history).toHaveLength(1);});
});
