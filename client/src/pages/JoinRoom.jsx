import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Logo from "../components/Logo";
import { getRoom } from "../services/api";
import { getStoredUsername, setStoredUsername, randomGuestName } from "../utils/helper";
import "./Home.css";
import "./RoomAuth.css";

function JoinRoom() {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState(getStoredUsername() || randomGuestName());
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const handleJoin = async () => {
    const id = roomId.trim();
    if (!id || !username.trim()) return;
    setStatus("checking");
    setError("");
    try {
      await getRoom(id).catch(() => null);
      setStoredUsername(username.trim());
      navigate(`/workspace/${id}`);
    } catch (err) {
      setError(err.message || "Could not reach the server.");
      setStatus("error");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleJoin();
    }
  };

  return (
    <div className="home-hero">
      <div className="home-dots" />
      <div className="home-orb home-orb--a" />
      <div className="home-orb home-orb--b" />

      <div className="home-content">
        <div className="home-logo-tile">
          <Logo size={40} />
        </div>

        <span className="home-eyebrow">GOT AN INVITE?</span>

        <h1 className="home-wordmark" style={{ fontSize: 34 }}>Join a room</h1>
        <p className="home-subtitle">The admin will need to approve you in.</p>

        <div className="room-card">
          {error && (
            <div className="room-error">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="room-field">
            <label>Room Code</label>
            <input
              autoFocus
              required
              placeholder="e.g. a3f9c1d2"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{ letterSpacing: "0.04em" }}
            />
          </div>

          <div className="room-field">
            <label>Display Name</label>
            <input
              required
              placeholder="Your name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <button
            type="button"
            className="home-btn home-btn--primary room-submit"
            onClick={handleJoin}
            disabled={status === "checking" || !roomId.trim() || !username.trim()}
          >
            {status === "checking" ? <span className="room-spinner" /> : "Join Room"}
          </button>

          <p className="room-back">
            Don't have a code? <Link to="/create">Create a room instead</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default JoinRoom;