import { useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import WorkspaceSidebar from "../components/WorkspaceSidebar";
import Toolbar from "../components/Toolbar";
import Whiteboard from "../components/Whiteboard";
import CodeEditor from "../components/CodeEditor";
import Toast from "../components/Toast";
import ChatPanel from "../components/ChatPanel";
import Settings from "./Settings";
import { useSocket } from "../hooks/useSocket";
import { useYDoc } from "../hooks/useYDoc";
import { useFileSystem } from "../hooks/useFileSystem";
import { clearShapes } from "../lib/yShapes";
import { getStoredUsername, randomGuestName } from "../utils/helper";
import "../components/Navbar.css";
import ReplayPanel from "../components/ReplayPanel";
import { useEffect, useRef, useState } from "react";

function Workspace() {
  const { roomId } = useParams();
  const [username] = useState(getStoredUsername() || randomGuestName());

  const {
    connecting,
    users,
    error,
    joinStatus,
    isAdmin,
    pendingRequests,
    approveJoin,
    denyJoin,
    kickUser,
  } = useSocket(roomId, username);
  const { ydoc, fileTreeMap, yshapes, ychat, undoManager, awareness, synced } = useYDoc(roomId, username);
  const fileSystem = useFileSystem(ydoc, fileTreeMap, synced);

  const [mode, setMode] = useState("split");
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#3fc6d6");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [autoShape, setAutoShape] = useState(false);
  const [fillEnabled, setFillEnabled] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const [dismissedError, setDismissedError] = useState(false);
  const [undoState, setUndoState] = useState({ canUndo: false, canRedo: false });
  const [replayOpen, setReplayOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const splitAreaRef = useRef(null);
  const [splitRatio, setSplitRatio] = useState(50); // % width given to the editor panel
  const [isResizing, setIsResizing] = useState(false);

  const clampRatio = (val) => Math.min(80, Math.max(20, val));

  const handleSplitterPointerDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return undefined;

    const handlePointerMove = (e) => {
      const area = splitAreaRef.current;
      if (!area) return;
      const rect = area.getBoundingClientRect();
      // supports the mobile breakpoint where the stage stacks vertically
      const isColumn = getComputedStyle(area).flexDirection === "column";
      const point = e.touches ? e.touches[0] : e;
      const ratio = isColumn
        ? ((point.clientY - rect.top) / rect.height) * 100
        : ((point.clientX - rect.left) / rect.width) * 100;
      setSplitRatio(clampRatio(ratio));
    };

    const handlePointerUp = () => setIsResizing(false);

    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);
    window.addEventListener("touchmove", handlePointerMove, { passive: false });
    window.addEventListener("touchend", handlePointerUp);

    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("touchend", handlePointerUp);
    };
  }, [isResizing]);

  useEffect(() => {
    if (!undoManager) return undefined;
    const refresh = () => setUndoState({ canUndo: undoManager.canUndo(), canRedo: undoManager.canRedo() });
    refresh();
    undoManager.on("stack-item-added", refresh);
    undoManager.on("stack-item-popped", refresh);
    undoManager.on("stack-cleared", refresh);
    return () => {
      undoManager.off("stack-item-added", refresh);
      undoManager.off("stack-item-popped", refresh);
      undoManager.off("stack-cleared", refresh);
    };
  }, [undoManager]);

  if (joinStatus === "pending" || joinStatus === "idle") {
    return (
      <div className="waiting-approval-overlay">
        <div className="waiting-approval-card">
          <div className="waiting-approval__beacon">
            <div className="beacon-ring beacon-ring--1" />
            <div className="beacon-ring beacon-ring--2" />
            <div className="beacon-core">
              <span className="beacon-icon">🔒</span>
            </div>
          </div>

          <div className="waiting-approval__badge">
            ROOM ID &bull; <span>{roomId}</span>
          </div>

          <h2 className="waiting-approval__title">Waiting for Access</h2>
          <p className="waiting-approval__subtitle">
            We&apos;ve sent a request to the room admin. You&apos;ll be brought into the workspace automatically once approved.
          </p>

          <div className="waiting-approval__user">
            <span className="user-label">Joining as</span>
            <span className="user-name">{username}</span>
          </div>
        </div>
      </div>
    );
  }

  if (joinStatus === "denied" || joinStatus === "kicked") {
    return (
      <div className="waiting-approval-overlay">
        <div className="waiting-approval-card waiting-approval-card--denied">
          <div className="waiting-approval__beacon waiting-approval__beacon--denied">
            <div className="beacon-core">
              <span className="beacon-icon">✕</span>
            </div>
          </div>

          <h2 className="waiting-approval__title">
            {joinStatus === "kicked" ? "Removed from Room" : "Access Denied"}
          </h2>
          <p className="waiting-approval__subtitle">
            {joinStatus === "kicked" ? (
              "The room admin removed you from this session."
            ) : (
              <>The room admin declined your request to join room <strong>{roomId}</strong>.</>
            )}
          </p>

          <button
            className="waiting-approval__btn"
            onClick={() => (window.location.href = "/home")}
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar
        roomId={roomId}
        mode={mode}
        onModeChange={setMode}
        onOpenReplay={() => setReplayOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        isAdmin={isAdmin}
        pendingRequests={pendingRequests}
        onApproveJoin={approveJoin}
        onDenyJoin={denyJoin}
        users={users}
      />

      {connecting ? (
        <div className="workspace-skeleton">
          <div className="workspace-skeleton__bar" />
          <div className="workspace-skeleton__panels">
            <div className="workspace-skeleton__panel" />
            <div className="workspace-skeleton__panel" />
          </div>
        </div>
      ) : (
        <div className={`workspace-stage stage--${mode}`}>
          <WorkspaceSidebar
            roomId={roomId}
            users={users}
            connected={!connecting}
            fileSystem={fileSystem}
            awareness={awareness}
            isAdmin={isAdmin}
            onKickUser={kickUser}
          />
          <div
            ref={splitAreaRef}
            className={`workspace-split-area${isResizing ? " is-resizing" : ""}`}
          >
            <div
              className="workspace-panel workspace-panel--editor"
              style={mode === "split" ? { flexBasis: `${splitRatio}%` } : undefined}
            >
              <CodeEditor ydoc={ydoc} fileSystem={fileSystem} awareness={awareness} />
            </div>

            {mode === "split" && (
              <div
                className="workspace-splitter"
                onMouseDown={handleSplitterPointerDown}
                onTouchStart={handleSplitterPointerDown}
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize editor and whiteboard panels"
              />
            )}

            <div
              className="workspace-panel workspace-panel--whiteboard"
              style={mode === "split" ? { flexBasis: `${100 - splitRatio}%` } : undefined}
            >
              <Toolbar
                tool={tool}
                onToolChange={setTool}
                color={color}
                onColorChange={setColor}
                strokeWidth={strokeWidth}
                onStrokeWidthChange={setStrokeWidth}
                autoShape={autoShape}
                onAutoShapeChange={setAutoShape}
                fillEnabled={fillEnabled}
                onFillToggle={setFillEnabled}
                opacity={opacity}
                onOpacityChange={setOpacity}
                onUndo={() => undoManager.undo()}
                onRedo={() => undoManager.redo()}
                canUndo={undoState.canUndo}
                canRedo={undoState.canRedo}
                onClear={() => clearShapes(yshapes)}
                onClose={() => setMode("editor")}
              />
              <Whiteboard
                yshapes={yshapes}
                tool={tool}
                color={color}
                strokeWidth={strokeWidth}
                onToolChange={setTool}
                autoShape={autoShape}
                fillEnabled={fillEnabled}
                opacity={opacity}
                awareness={awareness}
                ydoc={ydoc}
              />
            </div>
          </div>
        </div>
      )}

      {replayOpen && <ReplayPanel roomId={roomId} onClose={() => setReplayOpen(false)} />}

      {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}

      {!dismissedError && <Toast message={error} tone="error" onDismiss={() => setDismissedError(true)} />}

      <ChatPanel ychat={ychat} username={username} roomId={roomId} />
    </>
  );
}

export default Workspace;