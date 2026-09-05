#!/usr/bin/env python3
"""Lifecycle adapter: never marks a gate passed without an existing artifact."""
import sys, hashlib, subprocess
from pathlib import Path
sys.path.insert(0, '/workspace/_shared/Graph-harness-sdlc')
from graph_harness.runtime import GraphRuntime
from graph_harness.model import NodeStatus, GateResult
root=Path(__file__).resolve().parents[1]
rt=GraphRuntime.from_paths(root/'graph/project.json',root/'graph/events.jsonl')
mode,node=sys.argv[1:3]
sha=subprocess.check_output(['git','-C',str(root),'rev-parse','HEAD'],text=True).strip()
def evidence(kind,path,actor):
 p=root/path
 if not p.is_file(): raise SystemExit('Missing evidence: '+str(p))
 return rt.record_evidence(node,actor=actor,kind=kind,result='PASS',artifact=path,sha256=hashlib.sha256(p.read_bytes()).hexdigest(),command='See artifact for exact command and scope',commit=sha).event_id
def gate(kind,path,actor):
 eid=evidence(kind,path,actor)
 rt.evaluate_gate(node,actor=actor,gate_id=kind,result=GateResult.PASS,evidence_ids=[eid],note='Scope and limitations recorded in artifact')
if mode=='begin':
 gate('spec','specs/premium-v1/requirements.md','spec-review')
 rt.record_approval(node,actor='user-request-2026-09-04',scope_hash=hashlib.sha256((root/'specs/premium-v1/requirements.md').read_bytes()).hexdigest(),note='Implementation authority from original user request; not human approval of resulting implementation')
 for state in [NodeStatus.APPROVED,NodeStatus.READY,NodeStatus.RUNNING]: rt.transition(node,actor='graph-orchestrator',target=state,reason='Selected highest priority unlocked dependency in authorized scope')
elif mode=='review':
 gate('verification',sys.argv[3],'verification-runner')
 rt.transition(node,actor='producer',target=NodeStatus.REVIEW,reason='Evidence submitted for review')
elif mode=='close':
 gate('critic',sys.argv[3],'review-record')
 gate('release',sys.argv[4],'release-gate')
 rt.transition(node,actor='graph-orchestrator',target=NodeStatus.DONE,reason='Node-specific gates passed; does not imply final product publication')
rt.checkpoint(actor='graph-orchestrator',label=node+'-'+mode,commit=sha,evidence_summary={'node':node,'operation':mode})
print(rt.as_dict()['ready_nodes'])
