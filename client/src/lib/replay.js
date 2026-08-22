import * as Y from "yjs";

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Reconstructs what the room looked like after applying the first
// `uptoIndex + 1` logged updates, in a scratch Y.Doc that never touches
// the live session doc — safe to discard the instant the panel closes.
export function buildSnapshotAt(history, uptoIndex) {
  const doc = new Y.Doc();
  for (let i = 0; i <= uptoIndex && i < history.length; i++) {
    Y.applyUpdate(doc, base64ToUint8Array(history[i].update));
  }

  const fileTreeMap = doc.getMap("fileTree");
  const files = Array.from(fileTreeMap.values())
    .filter((e) => e.type === "file")
    .map((e) => ({
      id: e.id,
      name: e.name,
      language: e.language,
      content: doc.getText(`content:${e.id}`).toString(),
    }));

  const shapes = doc.getArray("shapes").toArray();
  doc.destroy();
  return { files, shapes };
}