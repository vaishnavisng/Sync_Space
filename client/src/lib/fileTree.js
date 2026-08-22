export const ROOT_ID = null;

const EXTENSION_LANGUAGE = {
  js: "javascript", jsx: "javascript", mjs: "javascript",
  ts: "typescript", tsx: "typescript",
  py: "python", json: "json", md: "markdown",
  css: "css", html: "html", txt: "plaintext",
};

export function languageForName(name) {
  const ext = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
  return EXTENSION_LANGUAGE[ext] || "plaintext";
}

export function isRunnable(language) {
  return language === "javascript" || language === "typescript" || language === "python";
}

function genId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getFileText(ydoc, fileId) {
  return ydoc.getText(`content:${fileId}`);
}

function nextOrder(fileTreeMap, parentId) {
  let max = -1;
  fileTreeMap.forEach((e) => { if (e.parentId === parentId && e.order > max) max = e.order; });
  return max + 1;
}

export function seedDefaultTree(ydoc, fileTreeMap) {
  if (fileTreeMap.size > 0) return null;
  const id = genId("file");
  ydoc.transact(() => {
    fileTreeMap.set(id, { id, name: "main.js", type: "file", parentId: ROOT_ID, language: "javascript", order: 0 });
  });
  getFileText(ydoc, id).insert(0, "console.log(\"Hello from SyncSpace\");\n");
  return id;
}

export function createFile(ydoc, fileTreeMap, parentId, name) {
  const id = genId("file");
  ydoc.transact(() => {
    fileTreeMap.set(id, { id, name, type: "file", parentId, language: languageForName(name), order: nextOrder(fileTreeMap, parentId) });
  });
  return id;
}

export function createFolder(ydoc, fileTreeMap, parentId, name) {
  const id = genId("folder");
  ydoc.transact(() => {
    fileTreeMap.set(id, { id, name, type: "folder", parentId, order: nextOrder(fileTreeMap, parentId) });
  });
  return id;
}

export function renameEntry(ydoc, fileTreeMap, id, name) {
  const entry = fileTreeMap.get(id);
  if (!entry) return;
  ydoc.transact(() => {
    fileTreeMap.set(id, { ...entry, name, language: entry.type === "file" ? languageForName(name) : undefined });
  });
}

function collectDescendants(fileTreeMap, id, acc) {
  fileTreeMap.forEach((e) => {
    if (e.parentId === id) {
      acc.push(e.id);
      if (e.type === "folder") collectDescendants(fileTreeMap, e.id, acc);
    }
  });
  return acc;
}

export function deleteEntry(ydoc, fileTreeMap, id) {
  const entry = fileTreeMap.get(id);
  if (!entry) return [];
  const toDelete = entry.type === "folder" ? [id, ...collectDescendants(fileTreeMap, id, [])] : [id];
  ydoc.transact(() => {
    toDelete.forEach((entryId) => {
      const e = fileTreeMap.get(entryId);
      fileTreeMap.delete(entryId);
      if (e && e.type === "file") {
        const text = getFileText(ydoc, entryId);
        if (text.length) text.delete(0, text.length);
      }
    });
  });
  return toDelete;
}

export function moveEntry(ydoc, fileTreeMap, id, newParentId) {
  const entry = fileTreeMap.get(id);
  if (!entry) return;
  if (entry.type === "folder") {
    const descendants = new Set(collectDescendants(fileTreeMap, id, []));
    if (descendants.has(newParentId)) return; // can't drop a folder into itself
  }
  ydoc.transact(() => {
    fileTreeMap.set(id, { ...entry, parentId: newParentId, order: nextOrder(fileTreeMap, newParentId) });
  });
}

export function buildTree(entries) {
  const byParent = new Map();
  entries.forEach((e) => {
    const list = byParent.get(e.parentId) || [];
    list.push(e);
    byParent.set(e.parentId, list);
  });
  byParent.forEach((list) => list.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)));
  const attach = (parentId) =>
    (byParent.get(parentId) || []).map((e) => ({ ...e, children: e.type === "folder" ? attach(e.id) : undefined }));
  return attach(ROOT_ID);
}