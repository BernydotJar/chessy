'use strict';
/**
 * Deterministic, pinned server catalogue for Chessy's existing 200 verified puzzles.
 * Keeps the answer key out of learner-readable Firestore documents.
 */
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const Module=require('node:module');
const {Chess}=require('chess.js');
const root=path.resolve(__dirname,'..');
require.extensions['.ts']=(mod,filename)=>{
  const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}
  }).outputText;
  mod._compile(code,filename);
};
const {PUZZLES}=require(path.join(root,'src/learning/puzzles.ts'));
const {orderPracticePuzzles}=require(path.join(root,'src/learning/trainingBlocks.ts'));
const puzzles=orderPracticePuzzles(PUZZLES);
const bank=puzzles.map((item,index)=>{
  if(!/^[a-zA-Z0-9-]{3,70}$/.test(item.id) || !Array.isArray(item.solution) || item.solution.length<1 || item.solution.length>12)
    throw new Error('Invalid exercise identifier or length at '+index);
  const game=new Chess(item.fen);
  for(const uci of item.solution){
    if(!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci))throw new Error('Malformed exercise line '+item.id);
    const move=game.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]});
    if(!move)throw new Error('Illegal exercise line '+item.id);
  }
  return {id:item.id,fen:item.fen,solution:item.solution,block:Math.floor(index/40)+1};
});
if(bank.length!==200||new Set(bank.map(p=>p.id)).size!==200)throw new Error('Expected exactly 200 unique exercises');
const dest=path.join(root,'functions/classroom-exercise-bank.json');
const output=JSON.stringify(bank,null,2)+'\n';
if(process.argv.includes('--check')){
  if(!fs.existsSync(dest)||fs.readFileSync(dest,'utf8')!==output)throw new Error('Server exercise catalogue drift');
  console.log('CHESSY_CLASSROOM_EXERCISES_CHECK=PASS count='+bank.length);
}else{
  fs.writeFileSync(dest,output);
  console.log('CHESSY_CLASSROOM_EXERCISES_WRITTEN count='+bank.length);
}
