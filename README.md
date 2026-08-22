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

## Status

🚧 In active development — Week 1 of a 4-week build. See [Issues](../../issues)
and [Projects](../../projects) for current progress.

## Tech Stack

`React` · `Node.js` · `Express` · `Socket.io` · `Yjs` · `Konva.js` · `Monaco Editor` · `MongoDB` (persistence, Week 3+) · `JWT` (auth, Week 4)
## 🚀 Getting Started
Prerequisites
Node.js
A MongoDB instance (local or Atlas)
1. Clone and set up the backend
bash
git clone https://github.com/Sandip1230/SyncSpace.git
cd SyncSpace
npm install

Create a .env file in the project root:

env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
EMAIL_USER=your_smtp_email
EMAIL_PASS=your_smtp_app_password
PORT=5000

(Optional) seed a dev user to skip the signup/OTP flow while testing:

#bash
npm run seed:dev

#Start the backend:

##bash
npm run dev
#2. Set up the frontend
bash
cd client
npm install

Create client/.env:

env
VITE_SOCKET_URL=http://localhost:5000
VITE_API_URL=http://localhost:5000/api

#Start the frontend:

##bash
npm run dev
#3. Open it

#Visit http://localhost:5173, sign up (or log in with your seeded dev user), then Create Room or Join Room from the home screen. You'll land in /workspace/<roomId> — the live split-view whiteboard + code editor.
