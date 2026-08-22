import { useNavigate } from "react-router-dom";
import { useSettings, FONT_FAMILY_STACKS } from "../context/SettingsContext";
import ThemeToggle from "../components/ThemeToggle";
import socket from "../services/socket";
import { stringToColor } from "../utils/color";
import "./Settings.css";

export default function Settings({ onClose }) {
  const navigate = useNavigate();
  const { settings, updateSetting, resetSettings } = useSettings();

  return (
    <div className="settings">
      <div className="settings-card">
        <button className="back-btn" type="button" onClick={() => (onClose ? onClose() : navigate(-1))}>
          ← Back to Editor
        </button>

        <div className="settings-header">
          <p className="settings-eyebrow">Preferences</p>
          <h1>Settings</h1>
          <p className="settings-description">Changes apply instantly across the workspace.</p>
        </div>

        <div className="settings-form">
          <h2>Appearance</h2>
          <div className="settings-group settings-group--row">
            <div>
              <label>Theme</label>
              <small>Switch between light and dark mode.</small>
            </div>
            <ThemeToggle />
          </div>

          <h2>Editor</h2>

          <div className="settings-group">
            <label>Font Size</label>
            <input
              type="range"
              min="12"
              max="24"
              value={settings.fontSize}
              onChange={(e) => updateSetting("fontSize", Number(e.target.value))}
            />
            <small>{settings.fontSize}px</small>
          </div>

          <div className="settings-group">
            <label>Font Family</label>
            <select value={settings.fontFamily} onChange={(e) => updateSetting("fontFamily", e.target.value)}>
              {Object.keys(FONT_FAMILY_STACKS).map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </div>

          <div className="settings-group toggle-group">
            <label className="toggle-item">
              <input type="checkbox" checked={settings.wordWrap} onChange={() => updateSetting("wordWrap", !settings.wordWrap)} />
              <span>
                <strong>Word Wrap</strong>
                <small>Wrap long lines in the editor.</small>
              </span>
            </label>
          </div>

          <div className="settings-group toggle-group">
            <label className="toggle-item">
              <input type="checkbox" checked={settings.lineNumbers} onChange={() => updateSetting("lineNumbers", !settings.lineNumbers)} />
              <span>
                <strong>Show Line Numbers</strong>
                <small>Display editor line numbers.</small>
              </span>
            </label>
          </div>

          <div className="settings-group toggle-group">
            <label className="toggle-item">
              <input type="checkbox" checked={settings.minimap} onChange={() => updateSetting("minimap", !settings.minimap)} />
              <span>
                <strong>Show Minimap</strong>
                <small>Display the Monaco editor minimap.</small>
              </span>
            </label>
          </div>

          <h2>Workspace</h2>

          <div className="settings-group toggle-group">
            <label className="toggle-item">
              <input type="checkbox" checked={settings.showOnlineUsers} onChange={() => updateSetting("showOnlineUsers", !settings.showOnlineUsers)} />
              <span>
                <strong>Show Online Users</strong>
                <small>Display the connected collaborators list.</small>
              </span>
            </label>
          </div>

          <div className="settings-group toggle-group">
            <label className="toggle-item">
              <input type="checkbox" checked={settings.showGrid} onChange={() => updateSetting("showGrid", !settings.showGrid)} />
              <span>
                <strong>Show Whiteboard Grid</strong>
                <small>Display the dotted background on the whiteboard.</small>
              </span>
            </label>
          </div>

          <h2>Collaboration</h2>

          <div className="settings-group settings-group--row">
            <div>
              <label>Cursor Color</label>
              <small>Shown to others on your editor cursor and whiteboard pointer.</small>
            </div>
            <div className="cursor-color-picker">
              <input
                type="color"
                value={settings.cursorColor || stringToColor(socket.id || "user")}
                onChange={(e) => updateSetting("cursorColor", e.target.value)}
              />
              {settings.cursorColor && (
                <button type="button" className="cursor-color-auto-btn" onClick={() => updateSetting("cursorColor", null)}>
                  Auto
                </button>
              )}
            </div>
          </div>

          <div className="settings-actions">
            <button type="button" className="reset-btn" onClick={resetSettings}>
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}