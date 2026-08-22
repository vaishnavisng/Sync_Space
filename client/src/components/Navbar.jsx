import { useLayoutEffect, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiSettings } from "react-icons/fi";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import "./Navbar.css";
import PingIndicator from "./PingIndicator";
import JoinRequestBell from "./JoinRequestBell";

const MODES = [
  { key: "editor", label: "Editor" },
  { key: "split", label: "Split" },
  { key: "whiteboard", label: "Whiteboard" },
];

function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 65%, 55%)`;
}

function Navbar({ roomId, mode, onModeChange, onOpenReplay, onOpenSettings, isAdmin, pendingRequests, onApproveJoin, onDenyJoin, users = [] }) {
  const navigate = useNavigate();

  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showPeople, setShowPeople] = useState(false);
  const peopleRef = useRef(null);

  const meetingLink = window.location.href;

  const handleShare = () => setShowShareModal(true);
  const copyMeetingId = () => navigator.clipboard.writeText(roomId);
  const copyMeetingLink = () => {
    navigator.clipboard.writeText(meetingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleLeaveRoom = () => setShowLeaveConfirm(true);
  const confirmLeaveRoom = () => navigate("/home");

  useEffect(() => {
    if (!showPeople) return undefined;
    const handleClick = (e) => {
      if (peopleRef.current && !peopleRef.current.contains(e.target)) setShowPeople(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showPeople]);

  // sliding mode-toggle indicator - measures the actual active button's box
  const modeRefs = useRef({});
  const [indicatorRect, setIndicatorRect] = useState({ left: 3, width: 0 });

  const measureIndicator = () => {
    const btn = modeRefs.current[mode];
    if (btn) setIndicatorRect({ left: btn.offsetLeft, width: btn.offsetWidth });
  };

  useLayoutEffect(measureIndicator, [mode]);
  useEffect(() => {
    window.addEventListener("resize", measureIndicator);
    return () => window.removeEventListener("resize", measureIndicator);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  return (
    <>
      <div className="navbar">
        <Link to="/" className="navbar__brand">
          <div className="navbar__logo-tile">
            <Logo size={22} />
          </div>
          <span className="navbar__wordmark">SyncSpace</span>
        </Link>

        {roomId && onModeChange && (
          <div className="mode-toggle">
            <span
              className="mode-toggle__indicator"
              style={{ left: `${indicatorRect.left}px`, width: `${indicatorRect.width}px` }}
            />
            {MODES.map((m) => (
              <button
                key={m.key}
                ref={(el) => (modeRefs.current[m.key] = el)}
                className={`mode-toggle__btn ${mode === m.key ? "is-active" : ""}`}
                onClick={() => onModeChange(m.key)}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}

        <div className="navbar__actions">
          {isAdmin && pendingRequests && (
            <JoinRequestBell requests={pendingRequests} onApprove={onApproveJoin} onDeny={onDenyJoin} />
          )}

          {roomId && (
            <div className="people-btn-wrap" ref={peopleRef}>
              <button className="people-btn" onClick={() => setShowPeople((v) => !v)} title="People in this room">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M10 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span className="people-btn__count">{users.length}</span>
              </button>

              {showPeople && (
                <div className="people-panel">
                  <div className="people-panel__header">In this room &bull; {users.length}</div>
                  <div className="people-panel__list">
                    {users.map((u) => (
                      <div key={u.socketId} className="people-panel__row">
                        <span className="people-panel__avatar" style={{ background: stringToColor(u.socketId) }}>
                          {(u.username || "?").slice(0, 1).toUpperCase()}
                        </span>
                        <span className="people-panel__name">{u.username}</span>
                        {u.isAdmin && <span className="people-panel__admin">Admin</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="navbar__group">
            <PingIndicator />
            <ThemeToggle />
            <button className="navbar__icon-btn" title="Settings" aria-label="Settings" onClick={() => onOpenSettings?.()}>
              <FiSettings size={15} />
            </button>
          </div>

          <div className="navbar__divider" />

          {roomId && onOpenReplay && (
            <div className="navbar__group">
              <button className="navbar__chip" onClick={onOpenReplay}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M3 12a9 9 0 103-6.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M3 12V6m0 6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Replay
              </button>
            </div>
          )}

          {roomId && (
            <button className="navbar__btn navbar__btn--accent" onClick={handleShare}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4-4 4M12 2v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Share
            </button>
          )}

          {roomId && (
            <button className="navbar__btn navbar__btn--danger" onClick={handleLeaveRoom}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Leave
            </button>
          )}
        </div>
      </div>

      {showShareModal && (
        <div className="share-modal-overlay">
          <div className="share-modal">
            <h2>Share Meeting</h2>

            <label>Room ID</label>
            <div className="share-field">
              <input value={roomId} readOnly />
              <button onClick={copyMeetingId}>Copy</button>
            </div>

            <label>Room Link</label>
            <div className="share-field">
              <input value={meetingLink} readOnly />
              <button onClick={copyMeetingLink}>{copied ? "Copied!" : "Copy"}</button>
            </div>

            <button className="close-btn" onClick={() => setShowShareModal(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {showLeaveConfirm && (
        <div className="confirm-overlay">
          <div className="confirm-card">
            <div className="confirm-card__icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 9v4M12 17h.01" stroke="#ff6b6b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="9" stroke="#ff6b6b" strokeWidth="1.8" />
              </svg>
            </div>
            <h3 className="confirm-card__title">Leave this room?</h3>
            <p className="confirm-card__body">
              You can rejoin anytime with the room ID. Anyone still inside will keep working uninterrupted.
            </p>
            <div className="confirm-card__actions">
              <button className="confirm-card__cancel" onClick={() => setShowLeaveConfirm(false)}>
                Cancel
              </button>
              <button className="confirm-card__confirm" onClick={confirmLeaveRoom}>
                Leave Room
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Navbar;