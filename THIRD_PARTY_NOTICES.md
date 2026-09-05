# Third-party notices

## Project source

The existing MIT license in `LICENSE` is retained, including the original copyright notice. This does not relicense third-party components.

## Stockfish JavaScript engine

The application distributes the unmodified `stockfish.js` file from the npm package `stockfish.js@10.0.2`, licensed GPL-3.0. Copyright remains with Stockfish, multi-variant and JavaScript-port contributors listed in its source and license.

- Upstream: https://github.com/niklasf/stockfish.js
- npm release gitHead: `e105072e84cf8ee5dd5219e2c5be29c3b8bf8a5a`
- Distributed worker SHA-256: `723fda70117bfa8d5053a7bc4ae50cdc96dc9e3fd41b57627e4dfa0a0025957a`
- Full license: `public/legal/stockfish-gpl-3.0.txt`
- Corresponding upstream source and build scripts: `public/legal/stockfish-10.0.2-source.tar.gz`
- Source archive SHA-256: `c387792121aec4732a22d2c847e07fe1ab899e02e2f37b071b8c9af3fe3d15c1`

The archive includes the upstream `build.sh`, sources, contributor notices and build documentation. Its presence does not imply that its optional Docker build instructions were executed; no new local container was created for this release.

## Lichess puzzles

The 96 selected source puzzles are from the official Lichess puzzle database, made available under CC0-1.0: https://database.lichess.org/#puzzles. Source URLs, identifiers, themes and difficulty ratings are preserved. The source database FEN precedes the opponent's setup move; Chessy applies that move before presenting the learner position. Difficulty ratings describe source puzzles, not the user's playing strength.

`progress/evidence/baseline/puzzle-provenance.json` records the bounded import and dataset hash. No Lichess account, private data or API key is used.

## Curriculum and reading references

Chessy's 12 lessons and 16 introductory positions are original project material. The library screen contains bibliographic references and catalog links only. Book titles and authors are identified for reference; no book covers, chapters, solutions or PDF copies are distributed.

## Other software

React, React DOM, react-chessboard, Zustand, i18next and the remaining dependencies retain their upstream licenses. chess.js uses BSD-2-Clause; Lucide icons use ISC. Version-pinned dependencies are recorded in `package-lock.json`. License metadata and upstream notices are distributed with their packages; the bundled application does not claim exclusive ownership of these components.
