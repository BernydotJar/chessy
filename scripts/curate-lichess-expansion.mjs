/**
 * Build a bounded, reproducible CC0 Lichess expansion from a locally supplied
 * official CSV extract. Never fetch a database at application runtime.
 *
 * Usage: node scripts/curate-lichess-expansion.mjs /tmp/lichess-extract.csv
 * The source should be a snapshot of https://database.lichess.org/#puzzles .
 *
 * Each selected position is replay-verified with the exact app chess.js rules.
 */
import fs from 'node:fs';
import { Chess } from 'chess.js';

const input=process.argv[2];
if(!input || !fs.existsSync(input)) throw new Error('Provide locally downloaded official Lichess CSV extract');
const rows=fs.readFileSync(input,'utf8').split(/\r?\n/);
if(!rows[0].startsWith('PuzzleId,FEN,Moves,Rating,')) throw new Error('Unexpected Lichess CSV schema');

const original=JSON.parse(fs.readFileSync('src/data/lichess-sample.json','utf8'));
const forbidden=new Set(original.map(item=>item.PuzzleId));
const target={mate:15,fork:20,tactics:20,endgame:15,calculation:10,mixed:8};
const candidates=[];
const motifTags=new Set(['fork','pin','skewer','discoveredAttack','discoveredCheck','deflection','attraction','sacrifice','trappedPiece','hangingPiece','interference','quietMove','clearance','exposedKing']);
let checked=0;
for(const line of rows.slice(1,-1)) {
  const columns=line.split(',');
  if(columns.length!==11)continue;
  const [PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags,DailyDate]=columns;
  const rating=Number(Rating),deviation=Number(RatingDeviation),popularity=Number(Popularity),plays=Number(NbPlays);
  if(forbidden.has(PuzzleId)||!/^\w{5}$/.test(PuzzleId)||!Number.isInteger(rating)
    ||rating<750||rating>2250||deviation>100||popularity<88||plays<500)continue;
  const solution=Moves.trim().split(' ');
  if(solution.length<2 || solution.length>9 || solution.length%2!==0)continue;
  const tags=Themes.trim().split(' ');
  try {
    const game=new Chess(FEN);
    for(const uci of solution) {
      if(!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci))throw new Error('invalid uci');
      game.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]});
    }
    if(tags.some(tag=>/^mateIn\d+$/.test(tag)) && !game.isCheckmate())continue;
    const initial=new Chess(FEN), first=solution.shift();
    initial.move({from:first.slice(0,2),to:first.slice(2,4),promotion:first[4]});
    if(initial.isGameOver())continue;
    const reversed=initial.fen().split(' ');
    reversed[1]=reversed[1]==='w'?'b':'w'; reversed[3]='-';
    if(new Chess(reversed.join(' ')).isCheck())continue;
    checked++;
    const item={PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags,DailyDate};
    const motifs=tags.filter(tag=>motifTags.has(tag)).length;
    const possibilities=[];
    if(tags.some(tag=>/^mateIn\d+$/.test(tag)))possibilities.push('mate');
    if(tags.includes('fork'))possibilities.push('fork');
    if(tags.some(tag=>['pin','skewer','discoveredAttack','attraction','deflection','trappedPiece','hangingPiece','interference'].includes(tag)))possibilities.push('tactics');
    if(tags.includes('endgame'))possibilities.push('endgame');
    if(rating>=1500 && solution.length>=5)possibilities.push('calculation');
    if(motifs>=2)possibilities.push('mixed');
    candidates.push({item,possibilities,theme:tags,fen:initial.fen(),
      score:popularity*100+Math.min(plays,30000)/100-deviation*0.6,
      rating,numberOfMoves:(solution.length+1)/2});
  } catch { /* invalid or truncated puzzle line */ }
}
const selected=[],used=new Set();
const desired=Object.entries(target);
const availability=Object.fromEntries(desired.map(([cat])=>[cat,candidates.filter(c=>c.possibilities.includes(cat)).length]));
console.log(JSON.stringify({csvRows:rows.length-1,validated:checked,candidates:candidates.length,availability},null,2));
for(const [category,count] of desired){
  let available=candidates.filter(c=>c.possibilities.includes(category)&&!used.has(c.item.PuzzleId));
  // Include both simple and advanced tasks; high-popularity, high-traffic and low-deviation first.
  available=available.sort((a,b)=>b.score-a.score||a.rating-b.rating||a.item.PuzzleId.localeCompare(b.item.PuzzleId));
  const byMoves=new Map();
  for(const candidate of available){
    const key=candidate.numberOfMoves;
    const list=byMoves.get(key)||[];
    list.push(candidate);
    byMoves.set(key,list);
  }
  let step=0;
  while(selected.filter(r=>r.category===category).length<count){
    const choices=[1,2,3,4,5].map(k=>byMoves.get(k)||[]).filter(a=>a.length);
    if(!choices.length)throw new Error('Not enough approved '+category+' candidates');
    const pick=choices[step%choices.length].shift();
    step++;
    if(!pick||used.has(pick.item.PuzzleId))continue;
    if(selected.some(s=>s.fen===pick.fen))continue;
    used.add(pick.item.PuzzleId);
    selected.push({...pick.item,category,fen:pick.fen});
  }
}
if(selected.length!==88||selected.some(r=>forbidden.has(r.PuzzleId)))throw new Error('Unexpected selection');
const records=selected.map(({fen,...fields})=>fields);
fs.writeFileSync('src/data/lichess-training-expansion.json',JSON.stringify(records,null,2)+'\n');
console.log('Wrote',records.length,'Lichess CC0 puzzles:',JSON.stringify(target));
console.log('FirstIDs:',records.slice(0,10).map(row=>row.PuzzleId).join(','));
