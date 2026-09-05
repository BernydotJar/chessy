from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'src/store/gameStore.ts';s=p.read_text()
s=s.replace('      endReason: null, engineError: false,','      endReason: null, engineError: false, activeGameId: null,')
s=s.replace("    } catch (error) {\n      return false;", "    } catch {\n      return false;")
p.write_text(s)
p=ROOT/'src/components/GamesHub.tsx';s=p.read_text().replace("'all' | 'win' | 'loss' | 'draw'","'all' | 'win' | 'loss' | 'draw' | 'ongoing'")
s=s.replace('  const [games, setGames]', "  const [loadError, setLoadError] = useState(false);\n  const [games, setGames]")
s=s.replace('    void load();','    void load().catch(() => setLoadError(true));')
s=s.replace('    setActiveGameId(game.id);\n    loadPgn(game.pgn);', '    loadPgn(game.pgn);\n    setActiveGameId(game.id);')
s=s.replace('<option value="draw">{t(\'games.results.draw\')}</option>', '<option value="draw">{t(\'games.results.draw\')}</option><option value="ongoing">{t(\'games.results.ongoing\')}</option>')
s=s.replace("        {filtered.length === 0 && (", "        {loadError && <p role=\"status\">{t('studio.saveError')}</p>}\n        {filtered.length === 0 && (")
p.write_text(s)
p=ROOT/'src/App.tsx';s=p.read_text().replace("behavior:'instant'", "behavior:'auto'");p.write_text(s)
p=ROOT/'src/components/studio/LibraryView.tsx';s=p.read_text().replace('CHESSY / READING NOTES',"CHESSY / {t('studio.library')}");p.write_text(s)
rows={'localGame':['Partida local','Local game','Partida local'],'untimed':['Sin reloj','Untimed','Sem relógio'],'reviewReal':['Reproduce las jugadas de tu partida. No mostramos precisión ni errores estimados sin un análisis completo del motor.','Replay the moves from your game. We do not display accuracy or estimated blunders without a complete engine analysis.','Reproduza as jogadas da sua partida. Não exibimos precisão ou erros estimados sem uma análise completa do motor.'],'firstPosition':['Posición inicial','First position','Posição inicial'],'nextPosition':['Siguiente posición','Next position','Próxima posição'],'lastPosition':['Posición final','Last position','Posição final']}
for i,lang in enumerate(['es','en','pt']):
 p=ROOT/'src/locales'/lang/'translation.json';d=json.loads(p.read_text());d['studio'].update({k:v[i] for k,v in rows.items()});d['games']['results']['ongoing']=['En curso','In progress','Em andamento'][i];p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
p=ROOT/'src/styles/studio.css'
s=p.read_text();s+='\n.review-navigation{display:flex;align-items:center;justify-content:space-between;gap:5px;margin-top:18px}.review-navigation .btn{padding:10px;min-height:40px}.review-navigation>span{font-size:12px;color:var(--muted)}.review-moves{display:flex;flex-wrap:wrap;gap:8px;margin-top:25px}.review-moves button{border:1px solid #4b5e3e;border-radius:6px;background:#24321d;color:#d1dfc1;padding:9px 12px;font-size:13px}.review-moves button.active{background:var(--accent);color:#132010}\n';p.write_text(s)
