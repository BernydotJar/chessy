export type GameRecord = {
 id:string;opponent:string;color:'white'|'black';result:'win'|'loss'|'draw'|'ongoing';
 timeControl:string;date:string;pgn:string;accuracy?:number;reviewed?:boolean;
};
const DB_NAME='glasschess',STORE='games';
const openDb=():Promise<IDBDatabase>=>new Promise((resolve,reject)=>{
 const request=indexedDB.open(DB_NAME,1);
 request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE,{keyPath:'id'});};
 request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);request.onblocked=()=>reject(new Error('Database blocked'));
});
export async function getAllGames():Promise<GameRecord[]> {
 const db=await openDb();
 return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly');const request=tx.objectStore(STORE).getAll();let games:GameRecord[]=[];
 request.onsuccess=()=>{games=request.result as GameRecord[];};
 tx.oncomplete=()=>{db.close();resolve(games.filter(g=>!/^seed-[123]$/.test(g.id)).sort((a,b)=>b.date.localeCompare(a.date)));};
 tx.onerror=tx.onabort=()=>{db.close();reject(tx.error||new Error('Read failed'));};
 });
}
export async function putGame(game:GameRecord):Promise<void> {
 const db=await openDb();
 return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(game);
 tx.oncomplete=()=>{db.close();resolve();};tx.onerror=tx.onabort=()=>{db.close();reject(tx.error||new Error('Save failed'));};
 });
}
