// AI Opponent Service using Stockfish
// This provides chess engine capabilities with multiple difficulty levels


export type DifficultyLevel = 'beginner' | 'easy' | 'medium' | 'hard' | 'master';

export interface AIMove {
  from: string;
  to: string;
  promotion?: string;
}

export interface EngineEvaluation {
  score: number; // Centipawns (100 = 1 pawn advantage)
  mate?: number; // Moves to mate (if applicable)
  bestMove?: string;
  depth: number;
}

type EngineLike = {
  postMessage: (command: string) => void;
  onmessage: ((event: MessageEvent | string) => void) | null;
  terminate?: () => void;
};

class StockfishService {
  private engine: EngineLike | null = null;
  private isReady: boolean = false;
  private pendingCallback: ((result: any) => void) | null = null;

  // Difficulty settings map to Stockfish skill level (0-20)
  private difficultySettings: Record<DifficultyLevel, { skillLevel: number; depth: number; thinkTime: number }> = {
    beginner: { skillLevel: 1, depth: 1, thinkTime: 100 },
    easy: { skillLevel: 5, depth: 3, thinkTime: 500 },
    medium: { skillLevel: 10, depth: 8, thinkTime: 1000 },
    hard: { skillLevel: 15, depth: 13, thinkTime: 2000 },
    master: { skillLevel: 20, depth: 18, thinkTime: 3000 },
  };

  async initialize(): Promise<void> {
    if (this.engine) {
      return; // Already initialized
    }

    return new Promise((resolve, reject) => {
      try {
        const stockfishUrl = `${import.meta.env.BASE_URL}stockfish.js`;
        this.engine = new Worker(stockfishUrl) as unknown as EngineLike;

        this.engine.onmessage = (event) => {
          const message = typeof event === 'string' ? event : event.data;

          if (!this.isReady && (message === 'uciok' || message === 'readyok')) {
            this.isReady = true;
            resolve();
          } else if (this.pendingCallback && message.startsWith('bestmove')) {
            const move = this.parseBestMove(message);
            this.pendingCallback(move);
            this.pendingCallback = null;
          }
        };

        // Initialize UCI protocol
        this.sendCommand('uci');
        this.sendCommand('isready');
      } catch (error) {
        this.engine = null;
        reject(error);
      }
    });
  }

  private sendCommand(command: string): void {
    if (this.engine) {
      this.engine.postMessage(command);
    }
  }

  private parseBestMove(message: string): AIMove | null {
    // Parse "bestmove e2e4" format
    const match = message.match(/bestmove ([a-h][1-8])([a-h][1-8])([qrbn])?/);
    if (match) {
      return {
        from: match[1],
        to: match[2],
        promotion: match[3],
      };
    }
    return null;
  }

  async getBestMove(fen: string, difficulty: DifficultyLevel = 'medium'): Promise<AIMove | null> {
    if (!this.isReady) {
      await this.initialize();
    }

    const settings = this.difficultySettings[difficulty];

    return new Promise((resolve) => {
      this.pendingCallback = resolve;

      // Set position
      this.sendCommand(`position fen ${fen}`);
      
      // Set skill level
      this.sendCommand(`setoption name Skill Level value ${settings.skillLevel}`);
      
      // Calculate best move
      this.sendCommand(`go depth ${settings.depth} movetime ${settings.thinkTime}`);
      
      // Timeout fallback
      setTimeout(() => {
        if (this.pendingCallback) {
          this.pendingCallback(null);
          this.pendingCallback = null;
        }
      }, settings.thinkTime + 2000);
    });
  }

  async evaluatePosition(fen: string, depth: number = 15): Promise<EngineEvaluation> {
    if (!this.isReady) {
      await this.initialize();
    }

    return new Promise((resolve) => {
      let evaluation: Partial<EngineEvaluation> = { depth: 0, score: 0 };

      const handleMessage = (message: string) => {
        if (message.startsWith('info') && message.includes('score')) {
          // Parse evaluation
          const depthMatch = message.match(/depth (\d+)/);
          const scoreMatch = message.match(/score cp (-?\d+)/);
          const mateMatch = message.match(/score mate (-?\d+)/);
          
          if (depthMatch) {
            evaluation.depth = parseInt(depthMatch[1]);
          }
          
          if (scoreMatch) {
            evaluation.score = parseInt(scoreMatch[1]);
          }
          
          if (mateMatch) {
            evaluation.mate = parseInt(mateMatch[1]);
          }
        }
        
        if (message.startsWith('bestmove')) {
          const move = this.parseBestMove(message);
          evaluation.bestMove = move ? `${move.from}${move.to}` : undefined;

          // Restore original handler if we replaced it
          if (this.engine) {
            this.engine.onmessage = baseHandler;
          }
          resolve(evaluation as EngineEvaluation);
        }
      };

      const baseHandler = this.engine?.onmessage || null;
      if (this.engine) {
        this.engine.onmessage = (event) => {
          const message = typeof event === 'string' ? event : event.data;
          handleMessage(message);
          if (baseHandler) {
            baseHandler(event);
          }
        };
      }
      
      this.sendCommand(`position fen ${fen}`);
      this.sendCommand(`go depth ${depth}`);
      
      // Timeout
      setTimeout(() => {
        if (this.engine) {
          this.engine.onmessage = baseHandler;
        }
        resolve(evaluation as EngineEvaluation);
      }, 5000);
    });
  }

  terminate(): void {
    if (this.engine) {
      this.sendCommand('quit');
      this.engine.terminate?.();
      this.engine = null;
      this.isReady = false;
    }
  }
}

// Singleton instance
export const stockfishService = new StockfishService();
