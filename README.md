<h1 align="center">
  <br/>
  SyncSpace
  <br/>
</h1>

<p align="center">
  A real-time collaborative code editor and whiteboard for distributed engineering teams.
  <br/>
  Write code and draw diagrams side-by-side — simultaneously — with zero merge conflicts.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Socket.io-4-010101?style=flat-square&logo=socket.io&logoColor=white" />
  <img src="https://img.shields.io/badge/Yjs-CRDTs-FF6B6B?style=flat-square" />
  <img src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=flat-square&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white" />
</p>

---

## What is SyncSpace?

SyncSpace is a full-stack, real-time collaborative workspace. It gives engineering teams a shared environment where multiple developers can edit code and draw architecture diagrams **at the same time**, in the same session, without anyone's work being overwritten.

It solves a genuinely hard problem: how do two people edit the same line of code — or the same canvas shape — at the exact same millisecond, with no lag, no locking, and no silent data loss? The answer is **CRDTs** (Conflict-free Replicated Data Types) via [Yjs](https://yjs.dev/), a mathematically sound approach to distributed state that makes simultaneous edits safe by design.

### Key Features

| Feature | Description |
|---|---|
| 🖊️ **Collaborative Code Editor** | Monaco Editor (the engine behind VS Code) synced across all participants via Yjs |
| 🎨 **Collaborative Whiteboard** | Konva.js canvas with pen, shapes, eraser, and fill tools — all synced live |
| 🗂️ **Virtual File System** | Per-room file tree stored in Yjs, supporting multi-file workspaces |
| 💬 **Live Chat** | In-session chat panel backed by a Yjs shared array, no separate WebSocket needed |
| 🤖 **AI Doubt Box** | Ask Gemini AI questions about your current code — context-aware answers in-editor |
| 🐍 **Python Terminal** | Run Python code directly in the browser via Pyodide (no server execution needed) |
| ⏮️ **Session Replay** | Replay the full edit history of any session, timestamped and buffered to MongoDB |
| 🔐 **Auth & Rooms** | JWT-based auth, email OTP verification, room join-request approval flow |
| 👑 **Admin Controls** | Room admin can approve/deny joins, kick users, and transfer admin on disconnect |
| 🌗 **Theme Toggle** | Light and dark mode support |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CLIENT  (Vite + React)                       │
│                                                                      │
│  ┌─────────────┐  ┌───────────────┐  ┌──────────────┐  ┌─────────┐ │
│  │ Monaco      │  │  Konva.js     │  │  ChatPanel   │  │ Pyodide │ │
│  │ (Code       │  │  (Whiteboard) │  │  (Live Chat) │  │ (Python │ │
│  │  Editor)    │  │               │  │              │  │  WASM)  │ │
│  └──────┬──────┘  └──────┬────────┘  └──────┬───────┘  └─────────┘ │
│         │                │                   │                       │
│         └────────────────┴───────────────────┘                      │
│                               │                                      │
│                         Yjs (CRDT layer)                             │
│              YMap · YText · YArray · Awareness                       │
│                               │                                      │
│                  Socket.io Client  ◄──► Axios (REST)                 │
└───────────────────────────────┼──────────────────────────────────────┘
                                │ WebSocket + HTTP
┌───────────────────────────────┼──────────────────────────────────────┐
│                         SERVER  (Node.js + Express)                  │
│                                                                      │
│  REST API                     │         Socket.io Handlers           │
│  ┌──────────┐  ┌─────────┐   │   ┌──────────────┐  ┌────────────┐  │
│  │ /api/    │  │ /api/   │   │   │ roomHandler  │  │ yjsHandler │  │
│  │  auth    │  │  ai     │   │   │ (join/leave/ │  │ (CRDT sync │  │
│  │          │  │ (Gemini)│   │   │  kick/admin) │  │ /awareness)│  │
│  └──────────┘  └─────────┘   │   └──────────────┘  └────────────┘  │
│  ┌──────────┐  ┌─────────┐   │   ┌──────────────┐  ┌────────────┐  │
│  │ /api/    │  │ /api/   │   │   │ joinRequest  │  │ chatTyping │  │
│  │  rooms   │  │  replay │   │   │ Handler      │  │ Handler    │  │
│  └──────────┘  └─────────┘   │   └──────────────┘  └────────────┘  │
│                               │                                      │
│              In-Memory Room Store (roomStore.js)                     │
│              ┌──────────────────────────────────────┐                │
│              │  Map<roomId, { doc, users, admin,    │                │
│              │               pending, dirty }>      │                │
│              └──────────────────────────────────────┘                │
│                     │ autosave every 15s                              │
│                     ▼                                                │
│              ┌─────────────────────────────────────┐                 │
│              │           MongoDB (Mongoose)         │                 │
│              │  ┌────────┐ ┌───────┐ ┌──────────┐  │                │
│              │  │  User  │ │ Space │ │ Session  │  │                │
│              │  │ (+OTP) │ │ (Yjs │ │ Update   │  │                │
│              │  │        │ │  doc)│ │ (replay) │  │                │
│              │  └────────┘ └───────┘ └──────────┘  │                │
│              └─────────────────────────────────────┘                 │
└──────────────────────────────────────────────────────────────────────┘
```

### How Real-Time Sync Works

1. **Every client holds a local Yjs document** — a replicated data structure containing the file tree (`YMap`), per-file code (`YText`), whiteboard shapes (`YMap`), and chat messages (`YArray`).
2. When a user makes a change, Yjs encodes it as a compact binary **update**.
3. The update is sent via Socket.io (`yjs:update`) to the server.
4. The server applies the update to its **authoritative in-memory Yjs doc** for the room, then broadcasts it to all other connected sockets.
5. Each receiving client applies the update to its local doc — Yjs guarantees the result is **identical on all clients**, regardless of arrival order.
6. The server **autosaves** the Yjs doc state to MongoDB every 15 seconds (only if modified), and **flushes** on graceful shutdown.
7. When a new client joins, the server immediately sends the full **current document state** via `yjs:sync` so they catch up instantly.

> **Cursor awareness** uses Yjs `Awareness` — a lightweight ephemeral protocol that broadcasts each user's cursor position and selection without touching the persistent document.

---

## Tech Stack

### Frontend

| Technology | Role |
|---|---|
| **React 19** | UI framework |
| **Vite 8** | Build tool & dev server |
| **React Router v7** | Client-side routing |
| **Monaco Editor** (`@monaco-editor/react`) | VS Code-grade code editor |
| **Yjs + y-monaco** | CRDT document model & Monaco binding |
| **Konva.js + react-konva** | 2D canvas for the collaborative whiteboard |
| **Socket.io-client** | WebSocket transport for real-time events |
| **Pyodide** | CPython compiled to WebAssembly — runs Python in-browser |
| **Axios** | HTTP client for REST API calls |
| **Tailwind CSS v4** | Utility-first styling |

### Backend

| Technology | Role |
|---|---|
| **Node.js + Express 5** | HTTP server & REST API |
| **Socket.io 4** | WebSocket server for real-time room events and Yjs sync |
| **Yjs** | Server-side CRDT document (authoritative source of truth per room) |
| **Mongoose + MongoDB** | Persistent storage for users, room documents, and session replays |
| **JWT + bcryptjs** | Stateless authentication & password hashing |
| **Nodemailer** | Email delivery (OTP verification, password reset) |
| **@google/genai** | Gemini AI SDK for the in-editor AI Doubt Box |
| **Morgan** | HTTP request logging |

---

## Project Structure

```
SyncSpace-main/
├── server.js               # Express app, Socket.io setup, graceful shutdown
├── package.json            # Server dependencies
├── .env.example            # Environment variable reference
│
├── config/
│   └── db.js               # MongoDB connection
│
├── routes/
│   ├── auth.js             # Register, login, OTP verify, password reset
│   ├── rooms.js            # Room metadata endpoints
│   ├── replay.js           # Session history retrieval
│   └── ai.js               # Gemini AI /ask endpoint
│
├── middleware/
│   ├── authMiddleware.js   # JWT verification
│   └── errorHandler.js     # 404 & global error handler
│
├── models/
│   ├── User.js             # User schema (username, email, OTP)
│   ├── space.js            # Room document schema (Yjs binary state)
│   └── SessionUpdate.js    # Replay log schema (timestamped Yjs updates)
│
├── sockets/
│   ├── index.js            # Socket.io entry
│   ├── roomHandler.js      # Join, leave, kick, admin handoff
│   ├── yjsHandler.js       # Yjs update relay & awareness broadcast
│   ├── joinRequestHandler.js # Approve/deny room entry
│   ├── chatTypingHandler.js  # Typing indicators
│   ├── pingHandler.js      # Latency measurement
│   ├── replayLogger.js     # Buffer & flush Yjs updates for replay
│   ├── persistence.js      # Autosave Yjs doc to MongoDB
│   ├── roomStore.js        # In-memory Map of active rooms
│   └── validators.js       # Input sanitization
│
├── Utils/                  # Shared server utilities
├── scripts/
│   └── seedDevUser.js      # Seeds a test user for local dev
│
└── client/                 # Vite + React frontend
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── App.jsx             # Route definitions
        ├── main.jsx            # React entry point
        │
        ├── pages/
        │   ├── Login.jsx       # Auth pages
        │   ├── Signup.jsx
        │   ├── VerifyOtp.jsx
        │   ├── ForgotPassword.jsx
        │   ├── ResetPassword.jsx
        │   ├── Home.jsx        # Dashboard (create/join room)
        │   ├── CreateRoom.jsx
        │   ├── JoinRoom.jsx
        │   ├── Workspace.jsx   # Main collaborative workspace
        │   └── Settings.jsx
        │
        ├── components/
        │   ├── CodeEditor.jsx      # Monaco + Yjs binding
        │   ├── Whiteboard.jsx      # Konva canvas + Yjs shapes
        │   ├── Toolbar.jsx         # Whiteboard tool controls
        │   ├── ChatPanel.jsx       # Live chat
        │   ├── FileExplorer.jsx    # Virtual file tree
        │   ├── Terminal.jsx        # Pyodide Python terminal
        │   ├── Navbar.jsx          # Top bar (mode toggle, room info)
        │   ├── Sidebar.jsx         # User list & room controls
        │   ├── ReplayPanel.jsx     # Session replay scrubber
        │   ├── AiDoubtBox.jsx      # Gemini AI assistant
        │   ├── JoinRequestBell.jsx # Admin join-request notifications
        │   ├── PingIndicator.jsx   # Latency display
        │   └── ProtectedRoute.jsx  # Auth guard
        │
        ├── hooks/
        │   ├── useSocket.js    # Socket.io connection + room events
        │   ├── useYDoc.js      # Yjs document initialization & sync
        │   └── useFileSystem.js # Virtual file system operations
        │
        ├── lib/
        │   └── yShapes.js      # Yjs helpers for whiteboard shapes
        │
        ├── services/           # Axios API service wrappers
        ├── context/            # React context providers
        └── utils/              # Helper functions
```

---

## Getting Started

### Prerequisites

- **Node.js** v18+
- **MongoDB** (local instance or [MongoDB Atlas](https://www.mongodb.com/atlas))
- *(Optional)* A Gemini API key for the AI Doubt Box
- *(Optional)* A Brevo, Resend, or Gmail account for email OTP delivery

### 1. Clone the repository

```bash
git clone https://github.com/your-account/SyncSpace.git
cd SyncSpace
```

### 2. Set up the backend

```bash
npm install
```

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

```env
PORT=5000
FRONTEND_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/syncspace
JWT_SECRET=replace_with_a_long_random_secret

# Email provider: brevo | resend | gmail | auto
EMAIL_PROVIDER=brevo
EMAIL_USER=your_gmail_address@gmail.com
BREVO_API_KEY=xkeysib-your-brevo-api-key

# Optional — enables the AI Doubt Box
GEMINI_API_KEY=your_gemini_api_key
```

> **Email setup:** For a zero-cost setup, verify your Gmail address as a Brevo Sender, set `EMAIL_PROVIDER=brevo` and `BREVO_API_KEY`. Gmail direct SMTP works locally but is often blocked on cloud hosts.

*(Optional)* Seed a dev user to skip the signup/OTP flow during testing:

```bash
npm run seed:dev
```

Start the backend:

```bash
npm run dev
```

### 3. Set up the frontend

```bash
cd client
npm install
```

Create `client/.env`:

```env
VITE_SOCKET_URL=http://localhost:5000
VITE_API_URL=http://localhost:5000/api
```

Start the frontend:

```bash
npm run dev
```

### 4. Open the app

Visit **http://localhost:5173**, sign up (or use your seeded dev account), then **Create Room** or **Join Room** from the home screen. You will land in `/workspace/<roomId>` — the live collaborative workspace.

---

## API Reference

### Auth — `/api/auth`

| Method | Path | Description |
|---|---|---|
| `POST` | `/register` | Register a new user (sends OTP email) |
| `POST` | `/verify-otp` | Verify email OTP to activate account |
| `POST` | `/login` | Login, returns JWT |
| `POST` | `/forgot-password` | Send password-reset OTP |
| `POST` | `/reset-password` | Reset password with OTP |

### Rooms — `/api/rooms`

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | List available rooms |
| `POST` | `/` | Create a new room |
| `GET` | `/:roomId/replay` | Get timestamped Yjs update history for a room |

### AI — `/api/ai`

| Method | Path | Description |
|---|---|---|
| `POST` | `/ask` | Ask Gemini a question about the current code (rate-limited: 10 req/min/IP) |

---

## Socket.io Events

### Room Management

| Event | Direction | Description |
|---|---|---|
| `room:join` | Client → Server | Join a room by ID |
| `room:leave` | Client → Server | Leave the current room |
| `room:kick` | Client → Server | *(Admin only)* Kick a user by socket ID |
| `room:users` | Server → Client | Updated user list for the room |
| `room:user-joined` | Server → Client | Broadcast when someone joins |
| `room:user-left` | Server → Client | Broadcast when someone leaves |
| `room:kicked` | Server → Client | Notifies the kicked user |

### Join Request Flow

| Event | Direction | Description |
|---|---|---|
| `room:request-join` | Client → Server | Non-admin requests access to a room |
| `room:incoming-join-request` | Server → Admin | Admin receives the pending request |
| `room:approve-join` | Admin → Server | Admin approves the request |
| `room:deny-join` | Admin → Server | Admin denies the request |
| `room:join-approved` | Server → Requester | Access granted |
| `room:join-denied` | Server → Requester | Access denied |

### Yjs Sync

| Event | Direction | Description |
|---|---|---|
| `yjs:sync` | Server → Client | Full document state snapshot on join |
| `yjs:update` | Bidirectional | Binary Yjs update delta |
| `awareness:update` | Bidirectional | Cursor/presence awareness update |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default: `5000`) |
| `FRONTEND_ORIGIN` | Yes | Allowed CORS origin(s), comma-separated |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret for signing JWTs |
| `EMAIL_PROVIDER` | Yes | `brevo`, `resend`, `gmail`, or `auto` |
| `EMAIL_USER` | Yes | Sender email address |
| `BREVO_API_KEY` | Conditional | Required when `EMAIL_PROVIDER=brevo` |
| `RESEND_API_KEY` | Conditional | Required when `EMAIL_PROVIDER=resend` |
| `EMAIL_FROM` | Conditional | Custom sender name/address for Resend |
| `EMAIL_PASS` | Conditional | Google App Password for Gmail SMTP |
| `GEMINI_API_KEY` | No | Enables the AI Doubt Box feature |

---

## License

[MIT](./LICENSE)
