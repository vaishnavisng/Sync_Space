import { useEffect, useState } from "react";
import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness.js";
import socket from "../services/socket";
import { SOCKET_EVENTS } from "../utils/constants";
import { createUndoManager } from "../lib/yShapes";
import { resolveUserColor } from "../utils/color";
import { useSettings } from "../context/SettingsContext";

// Y.Doc/Awareness are stateful singletons with real side effects (internal
// event emitters, client IDs). They used to be built with useMemo, but
// useMemo isn't a creation guarantee — React may discard/rebuild memoized
// values (e.g. under StrictMode's dev-mode double-invoke of effects), which
// was silently orphaning the awareness listener from the instance later
// effects wrote to, so the local user's own presence (cursor/activity) never
// actually broadcast to other clients. useState's initial value is a real
// once-per-mount guarantee, so we build it there instead, and reset it by
// calling setDocState during render when roomId changes (React's documented
// pattern for keying state off a changed prop without an extra effect).
function buildYDocState() {
  const ydoc = new Y.Doc();
  const yshapes = ydoc.getArray("shapes");
  return {
    ydoc,
    fileTreeMap: ydoc.getMap("fileTree"),
    yshapes,
    ychat: ydoc.getArray("chat"),
    undoManager: createUndoManager(yshapes),
    awareness: new awarenessProtocol.Awareness(ydoc),
  };
}

export function useYDoc(roomId, username) {
  const { settings } = useSettings();
  const cursorColor = settings.cursorColor;

  const [docState, setDocState] = useState(() => ({ roomId, ...buildYDocState() }));
  if (docState.roomId !== roomId) {
    setDocState({ roomId, ...buildYDocState() });
  }
  const { ydoc, fileTreeMap, yshapes, ychat, undoManager, awareness } = docState;

  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (!roomId) return undefined;
    setSynced(false);

    const onSync = (state) => {
      Y.applyUpdate(ydoc, new Uint8Array(state), "remote");
      setSynced(true);
    };
    const onUpdate = (update) => Y.applyUpdate(ydoc, new Uint8Array(update), "remote");
    const onLocalUpdate = (update, origin) => {
      if (origin === "remote") return;
      socket.emit(SOCKET_EVENTS.YJS_UPDATE, { roomId, update });
    };

    const onAwarenessUpdate = (update) => {
      awarenessProtocol.applyAwarenessUpdate(awareness, new Uint8Array(update), "remote");
    };
    const onAwarenessChange = ({ added, updated, removed }, origin) => {
      if (origin === "remote") return;
      const changed = added.concat(updated).concat(removed);
      const update = awarenessProtocol.encodeAwarenessUpdate(awareness, changed);
      socket.emit(SOCKET_EVENTS.AWARENESS_UPDATE, { roomId, update: Array.from(update) });
    };

    socket.on(SOCKET_EVENTS.YJS_SYNC, onSync);
    socket.on(SOCKET_EVENTS.YJS_UPDATE, onUpdate);
    socket.on(SOCKET_EVENTS.AWARENESS_UPDATE, onAwarenessUpdate);
    ydoc.on("update", onLocalUpdate);
    awareness.on("update", onAwarenessChange);

    return () => {
      socket.off(SOCKET_EVENTS.YJS_SYNC, onSync);
      socket.off(SOCKET_EVENTS.YJS_UPDATE, onUpdate);
      socket.off(SOCKET_EVENTS.AWARENESS_UPDATE, onAwarenessUpdate);
      ydoc.off("update", onLocalUpdate);
      awareness.off("update", onAwarenessChange);
      // Reset to {} rather than fully removing (y-protocols' removeAwarenessStates
      // nulls the local state entirely) — awareness.setLocalStateField() silently
      // no-ops once local state is null, which permanently breaks presence
      // broadcasting (cursor/activity/selection, including y-monaco's own internal
      // use of it) on any later re-mount of this same awareness instance, e.g.
      // React StrictMode's dev-mode mount→cleanup→remount check at initial mount.
      awareness.setLocalState({});
    };
  }, [ydoc, roomId, undoManager, awareness, username]);

  useEffect(() => {
    // socket.id is only assigned once the connection handshake completes, which
    // happens asynchronously after this effect's first run — so it's re-applied
    // on "connect" (covers the initial race and any later reconnects) rather
    // than captured once, otherwise it's stuck undefined and anything matching
    // awareness state to the socket users list by socketId (e.g. the sidebar's
    // per-user activity label) never finds a match.
    const setUserField = () => {
      awareness.setLocalStateField("user", {
        name: username || "Anonymous",
        color: resolveUserColor(socket.id || username || "user", cursorColor),
        socketId: socket.id,
      });
    };
    setUserField();
    socket.on("connect", setUserField);
    return () => socket.off("connect", setUserField);
  }, [awareness, username, cursorColor]);

  return { ydoc, fileTreeMap, yshapes, ychat, undoManager, awareness, synced };
}