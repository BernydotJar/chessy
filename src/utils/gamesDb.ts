export type GameRecord = {
  id: string;
  opponent: string;
  color: 'white' | 'black';
  result: 'win' | 'loss' | 'draw';
  timeControl: string;
  date: string;
  pgn: string;
  accuracy?: number;
  reviewed?: boolean;
};

const DB_NAME = 'glasschess';
const STORE = 'games';
const VERSION = 1;

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const txComplete = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

export const getAllGames = async (): Promise<GameRecord[]> => {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readonly');
  const store = tx.objectStore(STORE);
  const request = store.getAll();
  const results = await new Promise<GameRecord[]>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as GameRecord[]);
    request.onerror = () => reject(request.error);
  });
  await txComplete(tx);
  return results;
};

export const putGame = async (game: GameRecord) => {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).put(game);
  await txComplete(tx);
};

export const seedGames = async () => {
  const existing = await getAllGames();
  if (existing.length > 0) return existing;

  const seed: GameRecord[] = [
    {
      id: 'seed-1',
      opponent: 'LuciaGM',
      color: 'white',
      result: 'win',
      timeControl: 'Rapid 10|5',
      date: '2026-01-18',
      accuracy: 86,
      reviewed: true,
      pgn: '[Event "Training"]\n[Site "GlassChess"]\n[Date "2026.01.18"]\n[Round "-"]\n[White "You"]\n[Black "LuciaGM"]\n[Result "1-0"]\n\n1. e4 d5 2. exd5 Qxd5 3. Nc3 Qa5 4. d4 Nf6 5. Nf3 Bg4 6. h3 Bxf3 7. Qxf3 c6 8. Bd2 e6 9. Nd5 Qxd5 10. Qxd5 cxd5 11. Bb5+ Nc6 12. O-O-O 1-0',
    },
    {
      id: 'seed-2',
      opponent: 'CoachRafa',
      color: 'black',
      result: 'draw',
      timeControl: 'Blitz 5|0',
      date: '2026-01-22',
      accuracy: 78,
      reviewed: true,
      pgn: '[Event "Blitz"]\n[Site "GlassChess"]\n[Date "2026.01.22"]\n[Round "-"]\n[White "CoachRafa"]\n[Black "You"]\n[Result "1/2-1/2"]\n\n1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. Nf3 O-O 6. Be2 e5 7. O-O Nc6 8. d5 Ne7 9. Ne1 Nd7 10. Be3 f5 11. f3 1/2-1/2',
    },
    {
      id: 'seed-3',
      opponent: 'AnaStudy',
      color: 'white',
      result: 'loss',
      timeControl: 'Classical 30|10',
      date: '2026-01-24',
      accuracy: 62,
      reviewed: false,
      pgn: '[Event "Study"]\n[Site "GlassChess"]\n[Date "2026.01.24"]\n[Round "-"]\n[White "You"]\n[Black "AnaStudy"]\n[Result "0-1"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Nxe4 6. d4 b5 7. Bb3 d5 8. dxe5 Be6 9. c3 Bc5 10. Nbd2 0-1',
    },
  ];

  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  seed.forEach((game) => store.put(game));
  await txComplete(tx);
  return seed;
};
