"""Bounded build-time import from the official CC0 puzzle database.
Run: uv run --with zstandard python scripts/import-lichess.py
No runtime network dependency. Cap compressed download to 8 MiB.
"""
import csv, io, json, urllib.request, hashlib
from pathlib import Path
import zstandard
URL='https://database.lichess.org/lichess_db_puzzle.csv.zst'
class Bounded:
 def __init__(self,source): self.source=source; self.total=0
 def read(self,size=-1):
  size=min(size if size>0 else 65536,65536)
  if self.total+size>8*1024*1024: raise RuntimeError('Download cap exceeded')
  data=self.source.read(size); self.total+=len(data); return data
buckets={k:[] for k in ['mate','fork','tactics','endgame','calculation','mixed']}
with urllib.request.urlopen(urllib.request.Request(URL,headers={'User-Agent':'Chessy/1.0 educational CC0 sample'}),timeout=30) as response:
 source=Bounded(response)
 with zstandard.ZstdDecompressor().stream_reader(source) as reader:
  rows=csv.DictReader(io.TextIOWrapper(reader,encoding='utf-8'))
  for index,row in enumerate(rows):
   tags=row['Themes'].split(); rating=int(row['Rating'])
   if int(row['Popularity'])<80 or int(row['NbPlays'])<100 or rating>2500: continue
   category='mate' if any(t.startswith('mateIn') for t in tags) else 'fork' if 'fork' in tags else 'tactics' if any(t in tags for t in ['pin','skewer','discoveredAttack','attraction','deflection']) else 'endgame' if any('Endgame' in t or t=='endgame' for t in tags) else 'calculation' if rating>=1700 else 'mixed'
   if len(buckets[category])<16: buckets[category].append(row)
   if all(len(v)==16 for v in buckets.values()): break
   if index>15000: break
Path('src/data/lichess-sample.json').write_text(json.dumps([dict(r,category=k) for k,rows in buckets.items() for r in rows],ensure_ascii=False,indent=2)+'\n')
Path('progress/evidence/baseline/puzzle-provenance.json').write_text(json.dumps({'source':URL,'license':'CC0-1.0','licenseReference':'https://database.lichess.org/#puzzles','compressedBytesRead':source.total,'counts':{k:len(v) for k,v in buckets.items()},'sampleSHA256':hashlib.sha256(Path('src/data/lichess-sample.json').read_bytes()).hexdigest()},indent=2)+'\n')
print({k:len(v) for k,v in buckets.items()}); print('Compressed bytes read:',source.total)
