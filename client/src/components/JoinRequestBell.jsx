import { useEffect, useRef, useState } from "react";

function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 65%, 55%)`;
}

function JoinRequestBell({ requests, onApprove, onDeny }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (requests.length === 0) return null;

  return (
    <div className="join-bell-wrap" ref={wrapRef}>
      <button className="join-bell" onClick={() => setOpen((v) => !v)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>Requests</span>
        <span className="join-bell__badge">{requests.length}</span>
      </button>

      {open && (
        <div className="join-bell__panel">
          <div className="join-bell__caret" />
          <div className="join-bell__header">Waiting to join ({requests.length})</div>
          <div className="join-bell__list">
            {requests.map((r) => (
              <div key={r.requesterId} className="join-bell__row">
                <span className="join-bell__avatar" style={{ background: stringToColor(r.username) }}>
                  {(r.username || "?").slice(0, 1).toUpperCase()}
                </span>
                <span className="join-bell__name">{r.username}</span>
                <div className="join-bell__actions">
                  <button className="join-bell__approve" onClick={() => onApprove(r.requesterId)}>Approve</button>
                  <button className="join-bell__deny" onClick={() => onDeny(r.requesterId)}>Deny</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default JoinRequestBell;