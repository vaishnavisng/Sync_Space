import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Logo from "../components/Logo";
import { createRoom } from "../services/api";
import { getStoredUsername, setStoredUsername, randomGuestName } from "../utils/helper";
import "./Home.css";
import "./RoomAuth.css";

export default function CreateRoom() {
  const navigate = useNavigate();
  const [username, setUsername] = useState(getStoredUsername() || randomGuestName());
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const handleCreate = async () => {
    setStatus("creating");
    setError("");
    try {
      setStoredUsername(username);
      const { roomId } = await createRoom();
      navigate(`/workspace/${roomId}`);
    } catch (err) {
      setError(err.message || "Could not create a room. Is the server running?");
      setStatus("error");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreate();
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

        <span className="home-eyebrow">NEW SESSION</span>

        <h1 className="home-wordmark" style={{ fontSize: 34 }}>Create a room</h1>
        <p className="home-subtitle">Pick a display name — you'll be its admin.</p>

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
            <label>Display Name</label>
            <input
              autoFocus
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
            onClick={handleCreate}
            disabled={status === "creating" || !username.trim()}
          >
            {status === "creating" ? <span className="room-spinner" /> : "Create Room"}
          </button>

          <p className="room-back">
            Already have a code? <Link to="/join">Join a room instead</Link>
          </p>
        </div>
      </div>
    </div>
  );
}