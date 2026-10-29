#!/usr/bin/env python3
"""Thin, pinned adapter for the LiveKit increment; legacy graph is unchanged."""
import os, sys, subprocess
from pathlib import Path
root = Path(__file__).resolve().parents[1]
harness = Path(os.environ.get('GRAPH_HARNESS_PATH', '/workspace/_shared/Graph-harness-sdlc'))
pin = '168b740045293089720964bdc0d2bda79828b5c8'
if subprocess.check_output(['git','-C',str(harness),'rev-parse','HEAD'],text=True).strip() != pin:
    raise SystemExit('Live increment harness revision mismatch')
sys.path.insert(0,str(harness))
from graph_harness.cli import main
os.chdir(root)
raise SystemExit(main(['--project','graph/livekit.project.json','--events','graph/livekit.events.jsonl',*sys.argv[1:]]))
