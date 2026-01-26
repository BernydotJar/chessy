declare module 'stockfish.js' {
  type StockfishInstance = {
    postMessage: (command: string) => void;
    onmessage: ((event: MessageEvent | string) => void) | null;
    terminate?: () => void;
  };

  const Stockfish: () => StockfishInstance;
  export default Stockfish;
}
