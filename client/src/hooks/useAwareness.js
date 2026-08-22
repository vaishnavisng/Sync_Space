import { useEffect, useState } from "react";

export function useAwareness(awareness) {
  const [states, setStates] = useState([]);

  useEffect(() => {
    if (!awareness) return undefined;

    const sync = () => {
      const list = [];
      awareness.getStates().forEach((state, clientId) => {
        if (state.user) {
          list.push({ clientId, ...state.user, activity: state.activity || "idle", cursor: state.cursor || null });
        }
      });
      setStates(list);
    };

    sync();
    awareness.on("change", sync);
    return () => awareness.off("change", sync);
  }, [awareness]);

  return states;
}