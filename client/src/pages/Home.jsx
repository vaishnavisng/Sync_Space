import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import "./Home.css";

function Home() {
  return (
    <div className="home-hero">
      <div className="home-dots" />
      <div className="home-orb home-orb--a" />
      <div className="home-orb home-orb--b" />

      <div className="home-content">
        <div className="home-logo-tile">
          <Logo size={40} />
        </div>

        <span className="home-eyebrow">REAL-TIME COLLABORATION</span>

        <h1 className="home-wordmark">SyncSpace</h1>
        <p className="home-subtitle">
          Real-time collaborative code editor and whiteboard for teams.
        </p>

        <div className="home-features">
          <span className="home-feature">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="4" y="5" width="16" height="14" rx="2" stroke="#3fc6d6" strokeWidth="1.8" /><path d="M8 10h5M8 13h8" stroke="#3fc6d6" strokeWidth="1.8" strokeLinecap="round" /></svg>
            Whiteboard
          </span>
          <span className="home-feature">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 8l-4 4 4 4M15 8l4 4-4 4" stroke="#3ddc97" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Code Editor
          </span>
          <span className="home-feature">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 12a8 8 0 0114-5.3M20 12a8 8 0 01-14 5.3" stroke="#c77dff" strokeWidth="1.8" strokeLinecap="round" /><path d="M18 4v4h-4M6 20v-4h4" stroke="#c77dff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Real-time Sync
          </span>
        </div>

        <div className="home-actions">
          <Link to="/create" className="home-btn home-btn--primary">
            Create Room
          </Link>
          <Link to="/join" className="home-btn home-btn--secondary">
            Join Room
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Home;