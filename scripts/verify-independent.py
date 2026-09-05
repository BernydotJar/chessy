"""Validate Chessy's exported puzzle fixtures using python-chess, not chess.js."""
import json
from pathlib import Path
import chess
folder = Path('progress/evidence/release')
puzzles = json.loads((folder / 'puzzle-fixtures.json').read_text())
passed = []
for puzzle in puzzles:
    board = chess.Board(puzzle['fen'])
    assert board.is_valid(), puzzle['id']
    for uci in puzzle['solution']:
        move = chess.Move.from_uci(uci)
        assert move in board.legal_moves, (puzzle['id'], uci)
        board.push(move)
    if any(tag.startswith('mateIn') for tag in puzzle['tags']):
        assert board.is_checkmate(), puzzle['id']
    passed.append(puzzle['id'])
report = {'verifier': 'python-chess', 'version': chess.__version__, 'passed': len(passed), 'failed': 0, 'scope': 'Separate rules implementation: FEN validity, legal solution moves and claimed checkmates. Not a human or model review.', 'ids': passed}
(folder / 'independent-chess.json').write_text(json.dumps(report, indent=2) + '\n')
print(f'python-chess {chess.__version__}: {len(passed)} puzzles verified')
