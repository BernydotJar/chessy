import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const phase = process.argv[2] === 'post' ? 'post' : 'baseline';
const outDir = path.join(root, 'progress/evidence/chessy-adversarial-20261009');
fs.mkdirSync(outDir, { recursive: true });
function extract(name, words, lines = 28) {
  const source = fs.readFileSync(path.join(root,name),'utf8').split('\n');
  const index = source.findIndex(line => line.includes(words));
  return {file:name, search:words, excerpt:source.slice(Math.max(index-3,0), Math.min(source.length,index+lines)).join('\n')};
}
const evidence = {
  phase,
  provenance: 'Source code excerpts inspected in this checkout; NOT a live browser verification',
  flows: [
    extract('src/learning/store.ts','const KEY='),
    extract('src/sync/store.ts','unsubscribeAuth ='),
    extract('src/sync/store.ts','syncInFlight = (async'),
    extract('src/sync/store.ts','const result = await syncCloudProgress'),
    extract('src/components/studio/AccountView.tsx','const handleDelete'),
    extract('src/components/studio/ChallengeView.tsx','const [session,setSession]'),
    extract('src/components/studio/ChallengeView.tsx','const reset='),
    extract('src/components/studio/AcademyView.tsx','function LessonReader'),
    extract('firestore.rules','function validProgressDocument')
  ],
  baselineUnitTests:'192/192 PASS before changes; not evidence of identity-isolated local state'
};
fs.writeFileSync(path.join(outDir, phase+'-source-evidence.json'),JSON.stringify(evidence,null,2)+'\n');
const prompt=[
 'You are IBM Granite acting as a skeptical QA adversary: security engineer + parent + novice chess learner + senior chess coach + SaaS architect.',
 'Audit the Chessy implementation using ONLY code excerpts below. Distinguish CONFIRMED bugs from HYPOTHESES and desired product capabilities. No invented runtime test results.',
 'Try adversarial journeys: anonymous lessons then login; A logout then B login on same device; rapid account switching with in-flight sync; move solved during cloud sync; teacher uploads video/live classroom; novice wrong moves/reveals; offline to online.',
 'Grade impact on UI, UX, CX, accessibility, correctness, cloud persistence, privacy and integrity. Do not copy Chess.com visual identity or copyrighted lessons.',
 'Output JSON ONLY: {"verdict":"CHANGES_REQUIRED|PASS_WITH_RISKS|PASS","findings":[{"id":"...", "area":"...", "severity":"CRITICAL|HIGH|MEDIUM|LOW", "classification":"CONFIRMED|HYPOTHESIS|FEATURE", "evidence":"...", "fix":"..."}],"critical_flows_to_test":["..."],"teacher_architecture_boundary":"..."}. Max 8 findings. Be precise and skeptical.',
 JSON.stringify(evidence)
].join('\n\n');
const response = await fetch('http://127.0.0.1:11434/api/generate',{
 method:'POST',headers:{'content-type':'application/json'},signal:AbortSignal.timeout(170000),
 body:JSON.stringify({model:'ibm/granite3.3:2b',prompt,stream:false,format:'json',think:false,options:{temperature:0.05,num_predict:1450,num_ctx:8192}})
});
if (!response.ok) throw new Error('Granite HTTP '+response.status+': '+(await response.text()).slice(0,400));
const raw=await response.json();
fs.writeFileSync(path.join(outDir,phase+'-granite-raw.json'),JSON.stringify(raw,null,2)+'\n');
let parsed;
try{parsed=JSON.parse(raw.response);}catch{parsed={parse_error:true,response:raw.response};}
fs.writeFileSync(path.join(outDir,phase+'-granite-critic.json'),JSON.stringify(parsed,null,2)+'\n');
console.log(JSON.stringify(parsed,null,2));
