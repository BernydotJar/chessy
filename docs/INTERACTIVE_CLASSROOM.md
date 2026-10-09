# Chessy interactive classroom — next increment

Current implementation on this branch provides a pure, typed instructor-controlled chessboard reducer in `src/coach/classroomBoard.ts`.

## Contract

- `initialClassroomBoard(fen)` starts a legally structured board.
- `applyInstructorCommand(state, command)` accepts `move`, `reset`, `set-position` and `lock` commands.
- Each command carries `expectedRevision`; stale changes are rejected before any mutation.
- Moves use chess.js for legal UCI validation and record SAN history.
- `classroomSnapshotValid(snapshot)` replays the accepted SAN line from its origin and verifies the resulting FEN.
- A pure reducer is **not authorization** and **not real-time multiuser sync**.

## Proposed bounded server progression

1. Store teacher-authored classroom snapshots at `classrooms/{roomId}`. Bind `ownerUid` immutably to a verified, trusted `chessyRole=coach` claim, and reject learner writes.
2. Apply moves inside a Firestore transaction reading `revision`, applying the pure reducer, and incrementing it; reject stale writes.
3. Students subscribe read-only through `onSnapshot`. For a private class, check membership/enrollment in Firestore rules, not just React.
4. Add an explicit practice prompt linked to an existing puzzle ID, without writing solved progress from the teacher's account.
5. Only then render the realtime classroom view, stress-test disconnect/reconnect, teacher account switch, two simultaneous teacher tabs, promotion and rollback.

The previous pilot publishes meeting links in class documents. **Do not deploy or enable paid/private sessions** until meeting credentials are moved behind explicit enrollment entitlement checks. The existing recordings rely on shareable Firebase download tokens and also need an entitlement-gated playback architecture.

The independent Granite adversary is still blocked by local Ollama resource exhaustion. Passing unit tests does not replace this signoff.
