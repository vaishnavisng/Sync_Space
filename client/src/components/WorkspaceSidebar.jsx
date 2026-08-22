import Sidebar from "./Sidebar";
import FileExplorer from "./FileExplorer";
import "./WorkspaceSidebar.css";

function WorkspaceSidebar({ roomId, users, connected, fileSystem, awareness, isAdmin, onKickUser }) {
  return (
    <div className="workspace-sidebar">
      <div className="workspace-sidebar__pane workspace-sidebar__pane--room">
        <Sidebar roomId={roomId} users={users} connected={connected} isAdmin={isAdmin} onKickUser={onKickUser} awareness={awareness} />
      </div>
      <div className="workspace-sidebar__pane workspace-sidebar__pane--explorer">
        <FileExplorer fileSystem={fileSystem} />
      </div>
    </div>
  );
}
export default WorkspaceSidebar;