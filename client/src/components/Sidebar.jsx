import { useState } from "react";
import socket from "../services/socket";
import { resolveUserColor } from "../utils/color";
import { useSettings } from "../context/SettingsContext";
import { useAwareness } from "../hooks/useAwareness";
import "./Sidebar.css";

const ACTIVITY_LABELS = { editing: "Editing", drawing: "Drawing" };

function Sidebar({ roomId, users = [], connected, isAdmin, onKickUser, awareness }) {
  const [copied, setCopied] = useState(false);
  const [kickTarget, setKickTarget] = useState(null); // { socketId, username } | null
  const { settings } = useSettings();
  const awarenessStates = useAwareness(awareness);

  const copyRoomId = () => {
    navigator.clipboard?.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="sidebar">
      <div className="sidebar__card">
        <div className="sidebar__card-header">
          <span className="sidebar__section-label">Room</span>
          <span className="sidebar__status">
            <span className={`sidebar__status-dot ${connected ? "is-live" : "is-offline"}`} />
            {connected ? "Live" : "Offline"}
          </span>
        </div>
        <div className="sidebar__room-row">
          <code className="sidebar__room-id">{roomId}</code>
          <button className={`sidebar__copy-btn ${copied ? "is-copied" : ""}`} onClick={copyRoomId} title="Copy room ID">
            {copied ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Copied
              </>
            ) : "Copy"}
          </button>
        </div>
      </div>

      {settings.showOnlineUsers && (
        <div className="sidebar__card sidebar__card--users">
          <div className="sidebar__card-header">
            <span className="sidebar__section-label">Online</span>
            <span className="sidebar__count-badge">{users.length}</span>
          </div>
          {users.length === 0 && <div className="sidebar__empty">Just you, for now.</div>}
          <div className="sidebar__users">
            {users.map((u) => {
              const activity = awarenessStates.find((a) => a.socketId === u.socketId)?.activity;
              const activityLabel = ACTIVITY_LABELS[activity];
              return (
              <div key={u.socketId} className={`sidebar__user fade-in ${u.isAdmin ? "sidebar__user--admin" : ""}`}>
                <span
                  className="sidebar__avatar"
                  style={{ background: resolveUserColor(u.socketId, u.socketId === socket.id ? settings.cursorColor : null) }}
                >
                  {(u.username || "?").slice(0, 1).toUpperCase()}
                </span>
                <span className="sidebar__user-info">
                  <span className="sidebar__username">{u.username}</span>
                  {activityLabel && <span className="sidebar__activity">{activityLabel}</span>}
                </span>
                {u.isAdmin && <span className="sidebar__admin-badge">Admin</span>}
                {isAdmin && !u.isAdmin && u.socketId !== socket.id && (
                  <button
                    className="sidebar__kick-btn"
                    title={`Remove ${u.username}`}
                    aria-label={`Remove ${u.username}`}
                    onClick={() => setKickTarget(u)}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                  </button>
                )}
              </div>
              );
            })}
          </div>
        </div>
      )}

      {kickTarget && (
        <div className="confirm-overlay">
          <div className="confirm-card">
            <div className="confirm-card__icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 9v4M12 17h.01" stroke="#ff6b6b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="9" stroke="#ff6b6b" strokeWidth="1.8" />
              </svg>
            </div>
            <h3 className="confirm-card__title">Remove {kickTarget.username}?</h3>
            <p className="confirm-card__body">
              They'll be disconnected from this room immediately and can only rejoin with a new request.
            </p>
            <div className="confirm-card__actions">
              <button className="confirm-card__cancel" onClick={() => setKickTarget(null)}>Cancel</button>
              <button
                className="confirm-card__confirm"
                onClick={() => {
                  onKickUser(kickTarget.socketId);
                  setKickTarget(null);
                }}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sidebar;