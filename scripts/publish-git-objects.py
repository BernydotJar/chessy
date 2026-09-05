#!/usr/bin/env python3
"""Publish committed Chessy Git objects through the authenticated GitHub API.
No credentials are read or printed. No branches, tags or other refs are changed.
An explicit GitHub connector action must publish the resulting commit as a branch.
"""
import base64
import json
import subprocess
from pathlib import Path

REPO = 'BernydotJar/chessy'
BASE = 'f81813a83484bd6e0046dabb1737a24e7ba18f7b'
OUT = Path('progress/evidence/release/github-object-publication.json')

def git(*args):
    return subprocess.check_output(['git', *args])

def api(endpoint, payload):
    result = subprocess.run(
        ['gh', 'api', f'repos/{REPO}/git/{endpoint}', '--method', 'POST', '--input', '-'],
        input=json.dumps(payload).encode(), capture_output=True, check=True)
    return json.loads(result.stdout)

def tree(commit):
    entries = []
    for entry in git('ls-tree', '-rz', commit).split(b'\0'):
        if not entry:
            continue
        metadata, path = entry.split(b'\t', 1)
        mode, kind, sha = metadata.decode().split()
        name = path.decode()
        if kind != 'blob' or name.startswith(('.git/', 'node_modules/', '.env')):
            raise RuntimeError('Unexpected publication path: ' + name)
        entries.append({'path': name, 'mode': mode, 'type': kind, 'sha': sha})
    return entries

origin = git('remote', 'get-url', 'origin').decode().strip()
if origin != 'https://github.com/BernydotJar/chessy.git':
    raise SystemExit('This publisher is restricted to the authorized Chessy repository.')
branch = git('branch', '--show-current').decode().strip()
if branch != 'graph/premium-academy-v1':
    raise SystemExit('Unexpected branch: ' + branch)
commits = git('rev-list', '--reverse', BASE + '..HEAD').decode().splitlines()
if not commits or len(commits) > 10:
    raise SystemExit('Expected one to ten reviewed release commits.')
known = {entry['sha'] for entry in tree(BASE)}
parents = {BASE: BASE}
receipt = {'repository': REPO, 'base': BASE, 'refsChanged': False, 'commits': []}
for commit in commits:
    entries = tree(commit)
    for entry in entries:
        sha = entry['sha']
        if sha in known:
            continue
        body = git('cat-file', 'blob', sha)
        result = api('blobs', {'content': base64.b64encode(body).decode(), 'encoding': 'base64'})
        if result['sha'] != sha:
            raise RuntimeError('Blob mismatch: ' + entry['path'])
        known.add(sha)
    result = api('trees', {'tree': entries})
    local_tree = git('rev-parse', commit + '^{tree}').decode().strip()
    if result['sha'] != local_tree:
        raise RuntimeError('Published tree differs from the reviewed local tree.')
    details = git('show', '-s', '--format=%an%n%ae%n%aI%n%cn%n%ce%n%cI', commit).decode().splitlines()
    message = git('cat-file', 'commit', commit).decode().split('\n\n', 1)[1]
    local_parents = git('show', '-s', '--format=%P', commit).decode().strip().split()
    payload = {'tree': local_tree, 'message': message, 'parents': [parents.get(p, p) for p in local_parents],
               'author': {'name': details[0], 'email': details[1], 'date': details[2]},
               'committer': {'name': details[3], 'email': details[4], 'date': details[5]}}
    remote = api('commits', payload)['sha']
    parents[commit] = remote
    receipt['commits'].append({'local': commit, 'remote': remote, 'tree': local_tree, 'identicalCommit': remote == commit})
    OUT.write_text(json.dumps(receipt, indent=2) + '\n')
    print(json.dumps(receipt['commits'][-1]), flush=True)
print(json.dumps({'remoteHead': parents[commits[-1]], 'refsChanged': False}), flush=True)
