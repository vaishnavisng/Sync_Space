import { useCallback, useMemo, useState } from "react";
import { SiJavascript, SiTypescript, SiPython, SiJson, SiMarkdown, SiCss, SiHtml5 } from "react-icons/si";
import { VscFile, VscFolder, VscFolderOpened, VscChevronRight, VscNewFile, VscNewFolder, VscSearch } from "react-icons/vsc";
import "./FileExplorer.css";

const ICONS = {
  js: { Icon: SiJavascript, color: "#f2b134" }, jsx: { Icon: SiJavascript, color: "#f2b134" },
  ts: { Icon: SiTypescript, color: "#3fc6d6" }, tsx: { Icon: SiTypescript, color: "#3fc6d6" },
  py: { Icon: SiPython, color: "#3ddc97" }, json: { Icon: SiJson, color: "#c77dff" },
  md: { Icon: SiMarkdown, color: "#a9b8d4" },css: { Icon: SiCss, color: "#ff6b6b" }, html: { Icon: SiHtml5, color: "#f2b134" },
};

export function FileIcon({ name, size = 18 }) {
  const ext = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
  const entry = ICONS[ext];
  if (entry) return <entry.Icon size={size} color={entry.color} />;
  return <VscFile size={size} color="#6f80a3" />;
}

function matchesFilter(node, filter) {
  if (!filter) return true;
  if (node.name.toLowerCase().includes(filter.toLowerCase())) return true;
  return (node.children || []).some((c) => matchesFilter(c, filter));
}

function InlineCreateRow({ depth, type, onCommit, onCancel }) {
  const [value, setValue] = useState("");
  return (
    <div className="fx-row fx-row--creating" style={{ paddingLeft: 10 + depth * 16 }}>
      <span className="fx-chevron-spacer" />
      {type === "folder" ? <VscFolder size={18} color="#3fc6d6" /> : <VscFile size={18} color="#6f80a3" />}
      <input
        autoFocus
        className="fx-inline-input"
        placeholder={type === "folder" ? "folder-name" : "file-name.js"}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => (value.trim() ? onCommit(value.trim()) : onCancel())}
        onKeyDown={(e) => {
          if (e.key === "Enter") value.trim() ? onCommit(value.trim()) : onCancel();
          if (e.key === "Escape") onCancel();
        }}
      />
    </div>
  );
}

function TreeNode({ node, depth, activeFileId, expanded, onToggle, onOpen, onContextMenu, filter, dragState, setDragState, onDrop, creatingIn, onCommitCreate, onCancelCreate }) {
  if (!matchesFilter(node, filter)) return null;
  const isFolder = node.type === "folder";
  const isOpen = expanded.has(node.id) || !!filter;
  const isCreatingHere = creatingIn?.parentId === node.id;

  return (
    <div className="fx-node">
      <div
        className={`fx-row ${node.type === "file" && node.id === activeFileId ? "is-active" : ""} ${dragState.overId === node.id && isFolder ? "is-drop-target" : ""}`}
        style={{ paddingLeft: 10 + depth * 16 }}
        draggable
        onDragStart={() => setDragState({ draggingId: node.id, overId: null })}
        onDragOver={(e) => { if (isFolder) { e.preventDefault(); setDragState((s) => ({ ...s, overId: node.id })); } }}
        onDragLeave={() => setDragState((s) => (s.overId === node.id ? { ...s, overId: null } : s))}
        onDrop={(e) => { e.preventDefault(); if (isFolder && dragState.draggingId) onDrop(dragState.draggingId, node.id); setDragState({ draggingId: null, overId: null }); }}
        onClick={() => (isFolder ? onToggle(node.id) : onOpen(node.id))}
        onContextMenu={(e) => onContextMenu(e, node)}
      >
        {isFolder ? <VscChevronRight size={14} className={`fx-chevron ${isOpen ? "is-open" : ""}`} /> : <span className="fx-chevron-spacer" />}
        {isFolder ? (isOpen ? <VscFolderOpened size={18} color="#5cd6e4" /> : <VscFolder size={18} color="#3fc6d6" />) : <FileIcon name={node.name} />}
        <span className="fx-name">{node.name}</span>
      </div>
      {isFolder && isOpen && (
        <div className="fx-children">
          {isCreatingHere && <InlineCreateRow depth={depth + 1} type={creatingIn.type} onCommit={onCommitCreate} onCancel={onCancelCreate} />}
          {node.children?.map((c) => (
            <TreeNode key={c.id} node={c} depth={depth + 1} activeFileId={activeFileId} expanded={expanded} onToggle={onToggle} onOpen={onOpen} onContextMenu={onContextMenu} filter={filter} dragState={dragState} setDragState={setDragState} onDrop={onDrop} creatingIn={creatingIn} onCommitCreate={onCommitCreate} onCancelCreate={onCancelCreate} />
          ))}
        </div>
      )}
    </div>
  );
}

function FileExplorer({ fileSystem, onCollapse }) {
  const { tree, activeFileId, openFile, createFile, createFolder, rename, remove, move } = fileSystem;
  const [expanded, setExpanded] = useState(() => new Set());
  const [filter, setFilter] = useState("");
  const [menu, setMenu] = useState(null);
  const [dragState, setDragState] = useState({ draggingId: null, overId: null });
  const [creatingIn, setCreatingIn] = useState(null); // { parentId, type }

  const toggle = useCallback((id) => {
    setExpanded((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }, []);

  const closeMenu = () => setMenu(null);
  const handleContextMenu = (e, node) => { e.preventDefault(); e.stopPropagation(); setMenu({ x: e.clientX, y: e.clientY, node }); };

  const startCreate = (parentId, type) => {
    if (parentId) setExpanded((prev) => new Set(prev).add(parentId));
    setCreatingIn({ parentId, type });
  };
  const commitCreate = (name) => {
    creatingIn.type === "folder" ? createFolder(creatingIn.parentId, name) : createFile(creatingIn.parentId, name);
    setCreatingIn(null);
  };

  const fileCount = useMemo(() => {
    let count = 0;
    const walk = (nodes) => nodes.forEach((n) => (n.type === "file" ? count++ : walk(n.children || [])));
    walk(tree);
    return count;
  }, [tree]);

  return (
    <aside className="file-explorer" onClick={closeMenu}>
      <div className="fx-toolbar">
        <span className="fx-toolbar__title">Explorer <span className="fx-count">{fileCount}</span></span>
        <div className="fx-toolbar__actions">
          <button className="fx-icon-btn" title="New file" onClick={() => startCreate(null, "file")}><VscNewFile size={16} /></button>
          <button className="fx-icon-btn" title="New folder" onClick={() => startCreate(null, "folder")}><VscNewFolder size={16} /></button>
          {onCollapse && (
            <button className="fx-icon-btn" title="Collapse" onClick={onCollapse}>
              <VscChevronRight size={16} style={{ transform: "rotate(180deg)" }} />
            </button>
          )}
        </div>
      </div>

      <div className="fx-search">
        <VscSearch size={13} />
        <input placeholder="Filter files…" value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>

      <div className="fx-tree">
        {tree.length === 0 && !creatingIn && <div className="fx-empty">No files yet — use the toolbar above.</div>}
        {creatingIn?.parentId === null && <InlineCreateRow depth={0} type={creatingIn.type} onCommit={commitCreate} onCancel={() => setCreatingIn(null)} />}
        {tree.map((node) => (
          <TreeNode key={node.id} node={node} depth={0} activeFileId={activeFileId} expanded={expanded} onToggle={toggle} onOpen={openFile} onContextMenu={handleContextMenu} filter={filter} dragState={dragState} setDragState={setDragState} onDrop={move} creatingIn={creatingIn} onCommitCreate={commitCreate} onCancelCreate={() => setCreatingIn(null)} />
        ))}
        <div className="fx-root-drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (dragState.draggingId) move(dragState.draggingId, null); setDragState({ draggingId: null, overId: null }); }} />
      </div>

      {menu && (
        <div className="fx-context-menu" style={{ left: menu.x, top: menu.y }} onClick={(e) => e.stopPropagation()}>
          <button onClick={() => { startCreate(menu.node.type === "folder" ? menu.node.id : null, "file"); closeMenu(); }}>New File</button>
          <button onClick={() => { startCreate(menu.node.type === "folder" ? menu.node.id : null, "folder"); closeMenu(); }}>New Folder</button>
          <button onClick={() => { const n = window.prompt("Rename", menu.node.name); if (n) rename(menu.node.id, n); closeMenu(); }}>Rename</button>
          <div className="fx-context-menu__divider" />
          <button className="is-danger" onClick={() => { if (window.confirm(`Delete "${menu.node.name}"?`)) remove(menu.node.id); closeMenu(); }}>Delete</button>
        </div>
      )}
    </aside>
  );
}

export default FileExplorer;