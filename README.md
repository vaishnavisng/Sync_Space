# SyncSpace

A real-time collaborative whiteboard and code editor for distributed engineering
teams — draw architecture diagrams and write code side by side, live, with
multiple people editing at once.

Built on the MERN stack, SyncSpace goes beyond standard CRUD apps by solving a
harder problem: how do you let two people edit the same canvas or the same line
of code at the exact same millisecond, without lag, race conditions, or one
person's work silently overwriting the other's?

## How it works

- **Socket.io** keeps a persistent, low-latency connection open between every
  client and the server, with room-based isolation so separate sessions never
  cross-broadcast.
- **Yjs (CRDTs)** merges simultaneous edits mathematically — no locking, no
  "last write wins," no lost work.
- **Konva.js** powers the interactive drawing canvas.
- **Monaco Editor** — the same editor engine behind VS Code — powers the code
  pane, synced through Yjs.



## Tech Stack

`React` · `Node.js` · `Express` · `Socket.io` · `Yjs` · `Konva.js` · `Monaco Editor` · `MongoDB` (persistence, Week 3+) · `JWT` (auth, Week 4)


