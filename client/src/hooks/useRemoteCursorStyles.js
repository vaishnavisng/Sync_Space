import { useEffect } from "react";

const STYLE_TAG_ID = "remote-cursor-styles";

function escapeForCssString(str) {
  return String(str).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function useRemoteCursorStyles(awareness, localClientId) {
  useEffect(() => {
    if (!awareness) return undefined;

    let styleEl = document.getElementById(STYLE_TAG_ID);
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = STYLE_TAG_ID;
      document.head.appendChild(styleEl);
    }

    const rebuild = () => {
      const rules = [];
      awareness.getStates().forEach((state, clientId) => {
        if (clientId === localClientId || !state.user) return;
        const color = state.user.color || "#328993";
        const name = escapeForCssString(state.user.name || "Anonymous");
        rules.push(`
          .yRemoteSelection-${clientId} { background-color: ${color}33; }
          .yRemoteSelectionHead-${clientId} {
            position: relative;
            border-left: 2px solid ${color};
          }
          .yRemoteSelectionHead-${clientId}::after {
            content: "${name}";
            position: absolute;
            top: 1.1em;
            left: 4px;
            background: ${color};
            color: #fff;
            font-size: 11px;
            font-weight: 600;
            line-height: 1.4;
            padding: 1px 5px;
            border-radius: 3px;
            white-space: nowrap;
            pointer-events: none;
            z-index: 20;
          }
        `);
      });
      styleEl.textContent = rules.join("\n");
    };

    rebuild();
    awareness.on("change", rebuild);
    return () => awareness.off("change", rebuild);
  }, [awareness, localClientId]);
}
