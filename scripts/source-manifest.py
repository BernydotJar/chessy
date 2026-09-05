"""Hash only application inputs, so evidence-only commits do not change release identity."""
import hashlib
import json
from pathlib import Path
files = []
for folder in ['src', 'public']:
    files.extend(path for path in Path(folder).rglob('*') if path.is_file())
files.extend(Path(name) for name in ['index.html', 'package.json', 'package-lock.json', 'vite.config.ts'])
hashes = {str(path): hashlib.sha256(path.read_bytes()).hexdigest() for path in sorted(files)}
fingerprint = hashlib.sha256(json.dumps(hashes, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
report = {'algorithm': 'SHA-256 of canonical sorted application-input hash map', 'appSourceFingerprint': fingerprint, 'files': hashes}
folder = Path('progress/evidence/release')
folder.mkdir(parents=True, exist_ok=True)
(folder / 'source-manifest.json').write_text(json.dumps(report, indent=2) + '\n')
print('APP_SOURCE_FINGERPRINT=' + fingerprint)
