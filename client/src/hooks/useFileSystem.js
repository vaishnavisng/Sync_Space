import { useEffect, useMemo, useRef, useState } from "react";
import { buildTree, createFile, createFolder, deleteEntry, getFileText, moveEntry, renameEntry, seedDefaultTree, ROOT_ID } from "../lib/fileTree";

export function useFileSystem(ydoc, fileTreeMap, synced) {
  const [entries, setEntries] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const hasSeededRef = useRef(false);

  useEffect(() => {
    const sync = () => setEntries(Array.from(fileTreeMap.values()));
    sync();
    fileTreeMap.observe(sync);
    return () => fileTreeMap.unobserve(sync);
  }, [fileTreeMap]);

  useEffect(() => {
    if (!synced || hasSeededRef.current) return;
    hasSeededRef.current = true;
    if (fileTreeMap.size === 0) {
      const id = seedDefaultTree(ydoc, fileTreeMap);
      if (id) setActiveFileId(id);
    }
  }, [synced, ydoc, fileTreeMap]);

  useEffect(() => {
    if (activeFileId && entries.some((e) => e.id === activeFileId && e.type === "file")) return;
    const firstFile = entries.find((e) => e.type === "file");
    setActiveFileId(firstFile ? firstFile.id : null);
  }, [entries, activeFileId]);

  const tree = useMemo(() => buildTree(entries), [entries]);
  const activeFile = useMemo(() => entries.find((e) => e.id === activeFileId) || null, [entries, activeFileId]);
  const activeText = useMemo(() => (activeFileId ? getFileText(ydoc, activeFileId) : null), [ydoc, activeFileId]);

  return {
    entries, tree, activeFile, activeFileId, activeText,
    openFile: (id) => setActiveFileId(id),
    createFile: (parentId, name) => { const id = createFile(ydoc, fileTreeMap, parentId ?? ROOT_ID, name); setActiveFileId(id); return id; },
    createFolder: (parentId, name) => createFolder(ydoc, fileTreeMap, parentId ?? ROOT_ID, name),
    rename: (id, name) => renameEntry(ydoc, fileTreeMap, id, name),
    remove: (id) => { const deleted = deleteEntry(ydoc, fileTreeMap, id); if (deleted.includes(activeFileId)) setActiveFileId(null); },
    move: (id, newParentId) => moveEntry(ydoc, fileTreeMap, id, newParentId ?? ROOT_ID),
  };
}