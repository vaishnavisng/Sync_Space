import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "syncspace-settings";

const DEFAULTS = {
  fontSize: 14,
  fontFamily: "Monospace", // key into FONT_FAMILY_STACKS below
  wordWrap: false,
  lineNumbers: true,
  minimap: true,
  showOnlineUsers: true,
  showGrid: true,
  cursorColor: null, // null = auto-generated from socket id/username
};

export const FONT_FAMILY_STACKS = {
  Monospace: "ui-monospace, Menlo, Consolas, monospace",
  "Fira Code": "'Fira Code', monospace",
  "JetBrains Mono": "'JetBrains Mono', monospace",
  Consolas: "Consolas, monospace",
};

const SettingsContext = createContext(null);

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    // Only pull known keys forward — drops any leftover username/theme
    // fields from the old localStorage shape without erroring on them.
    return { ...DEFAULTS, ...Object.fromEntries(Object.keys(DEFAULTS).map((k) => [k, parsed[k] ?? DEFAULTS[k]])) };
  } catch {
    return DEFAULTS;
  }
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // storage unavailable — settings just won't persist across reloads
    }
  }, [settings]);

  const updateSetting = (key, value) => setSettings((prev) => ({ ...prev, [key]: value }));
  const resetSettings = () => setSettings(DEFAULTS);

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}