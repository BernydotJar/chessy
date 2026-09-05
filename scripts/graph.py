#!/usr/bin/env python3
"""Thin adapter to the pinned shared Graph Harness; no duplicated engine."""
import os, sys, subprocess
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
HARNESS = Path(os.environ.get('GRAPH_HARNESS_PATH', '/workspace/_shared/Graph-harness-sdlc'))
PIN = '6a5f201e2bc640ac46cc0b4b6a3d11b788555664'
if not HARNESS.is_dir():
    raise SystemExit('Set GRAPH_HARNESS_PATH to a checkout of BernydotJar/Graph-harness-sdlc at ' + PIN)
actual = subprocess.check_output(['git', '-C', str(HARNESS), 'rev-parse', 'HEAD'], text=True).strip()
if actual != PIN:
    raise SystemExit('Harness revision mismatch: ' + actual)
sys.path.insert(0, str(HARNESS))
from graph_harness.cli import main
os.chdir(ROOT)
raise SystemExit(main(['--project', 'graph/project.json', '--events', 'graph/events.jsonl', *sys.argv[1:]]))
