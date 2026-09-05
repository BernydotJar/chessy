export type DifficultyLevel = 'beginner' | 'easy' | 'medium' | 'hard' | 'master';
export interface AIMove { from: string; to: string; promotion?: string }
export interface EngineEvaluation { score: number; mate?: number; bestMove?: string; depth: number }
export interface MultiPVLine { multipv: number; score?: number; mate?: number; pv?: string }
/** One request at a time per worker; no stale timers or overwritten message handlers. */
export class StockfishService {
  private engine: Worker | null = null;
  private initializing: Promise<void> | null = null;
  private cancel: (() => void) | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private generation = 0;
  private settings = {beginner:[1,2,150],easy:[5,5,500],medium:[10,10,1000],hard:[15,15,2000],master:[20,18,3000]} as const;
  initialize(): Promise<void> {
    if (this.initializing) return this.initializing;
    if (this.engine) return Promise.resolve();
    this.initializing = new Promise<void>((resolve,reject) => {
      const worker = new Worker(`${import.meta.env.BASE_URL}stockfish.js`);
      this.engine = worker;
      const finish = (error?: Error) => {
        clearTimeout(timer); worker.onmessage = null; worker.onerror = null; this.cancel = null;
        if (error) { worker.terminate(); if (this.engine === worker) this.engine = null; reject(error); } else resolve();
      };
      const timer = setTimeout(() => finish(new Error('Engine initialization timeout')),8000);
      this.cancel = () => finish(new Error('Engine cancelled'));
      worker.onmessage = e => { if (e.data === 'uciok') worker.postMessage('isready'); if (e.data === 'readyok') finish(); };
      worker.onerror = () => finish(new Error('Engine could not load'));
      worker.postMessage('uci');
    }).finally(() => { this.initializing = null; });
    return this.initializing;
  }
  private search(fen: string, depth: number, ms: number, skill: number, count: number): Promise<{move: AIMove | null; lines: MultiPVLine[]; depth: number}> {
    const generation = this.generation;
    const run = async () => {
      if (generation !== this.generation) throw new Error('Engine cancelled');
      await this.initialize();
      if (generation !== this.generation || !this.engine) throw new Error('Engine cancelled');
      const worker = this.engine;
      return new Promise<{move:AIMove|null;lines:MultiPVLine[];depth:number}>((resolve,reject) => {
        const lines = new Map<number,MultiPVLine>(); let reached = 0;
        const finish = (move: AIMove | null, error?: Error) => {
          clearTimeout(timer); worker.onmessage = null; worker.onerror = null; this.cancel = null;
          if (error) { worker.terminate(); if (this.engine === worker) this.engine = null; reject(error); }
          else resolve({move,lines:[...lines.values()].sort((a,b)=>a.multipv-b.multipv),depth:reached});
        };
        const timer = setTimeout(() => finish(null,new Error('Engine search timeout')),ms+4000);
        this.cancel = () => finish(null,new Error('Engine cancelled'));
        worker.onerror = () => finish(null,new Error('Engine worker error'));
        worker.onmessage = event => {
          const text=String(event.data);
          if (text.startsWith('info ') && text.includes('score ')) {
            const index=Number(text.match(/\bmultipv (\d+)/)?.[1] || 1);
            const cp=text.match(/\bscore cp (-?\d+)/), mate=text.match(/\bscore mate (-?\d+)/);
            reached=Number(text.match(/\bdepth (\d+)/)?.[1] || reached);
            lines.set(index,{multipv:index,score:cp?Number(cp[1]):undefined,mate:mate?Number(mate[1]):undefined,pv:text.match(/\bpv (.+)$/)?.[1]});
          }
          if (text.startsWith('bestmove ')) {
            const m=text.match(/^bestmove ([a-h][1-8])([a-h][1-8])([qrbn])?/);
            finish(m?{from:m[1],to:m[2],promotion:m[3]}:null);
          }
        };
        worker.postMessage(`setoption name Skill Level value ${skill}`);
        worker.postMessage(`setoption name MultiPV value ${count}`);
        worker.postMessage(`position fen ${fen}`);
        worker.postMessage(`go depth ${depth} movetime ${ms}`);
      });
    };
    const result=this.queue.then(run,run); this.queue=result.catch(()=>undefined); return result;
  }
  async getBestMove(fen:string,difficulty:DifficultyLevel='medium'):Promise<AIMove|null> {
    const [skill,depth,ms]=this.settings[difficulty]; return (await this.search(fen,depth,ms,skill,1)).move;
  }
  async evaluatePosition(fen:string,depth=15):Promise<EngineEvaluation> {
    const r=await this.search(fen,depth,2500,20,1), best=r.lines[0];
    return {score:best?.score ?? 0,mate:best?.mate,depth:r.depth,bestMove:r.move?`${r.move.from}${r.move.to}${r.move.promotion||''}`:undefined};
  }
  async evaluatePositionMultiPV(fen:string,depth=15,lines=2):Promise<MultiPVLine[]> {
    return (await this.search(fen,depth,3000,20,Math.max(1,Math.min(5,lines)))).lines;
  }
  terminate():void { this.generation++; this.cancel?.(); this.engine?.terminate(); this.engine=null; this.initializing=null; }
}
export const stockfishService = new StockfishService();
