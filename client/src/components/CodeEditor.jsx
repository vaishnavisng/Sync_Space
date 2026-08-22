import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { MonacoBinding } from "y-monaco";
import { FileIcon } from "./FileExplorer";
import Terminal from "./Terminal";
import AiDoubtBox from "./AiDoubtBox";
import { isRunnable } from "../lib/fileTree";
import { useSettings, FONT_FAMILY_STACKS } from "../context/SettingsContext";
import { useRemoteCursorStyles } from "../hooks/useRemoteCursorStyles";
import { usePanelResize } from "../hooks/usePanelResize";
import "./CodeEditor.css";

function CodeEditor({ ydoc, fileSystem, awareness }) {
  const { activeFile, activeFileId, activeText } = fileSystem;
  const { settings } = useSettings();

  useRemoteCursorStyles(awareness, ydoc?.clientID);

  const bindingRef = useRef(null);

  const [editorInstance, setEditorInstance] = useState(null);
  const [monacoInstance, setMonacoInstance] = useState(null);

  const [terminalOpen, setTerminalOpen] = useState(false);
  const [runRequest, setRunRequest] = useState(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState("");
  const terminalPanel = usePanelResize({ defaultHeight: 200 });
  const aiPanel = usePanelResize({ defaultHeight: 200 });

  const language = activeFile?.language || "plaintext";
  const runnable = isRunnable(language);

  const handleMount = (editor, monaco) => {
    setEditorInstance(editor);
    setMonacoInstance(monaco);
  };

  useEffect(() => {
    if (
      !editorInstance ||
      !monacoInstance ||
      !activeText ||
      !awareness
    )
      return;

    bindingRef.current?.destroy();

    const model = editorInstance.getModel();

    monacoInstance.editor.setModelLanguage(model, language);

    bindingRef.current = new MonacoBinding(
      activeText,
      model,
      new Set([editorInstance]),
      awareness
    );
    editorInstance.setPosition({ lineNumber: 1, column: 1 });
    editorInstance.revealLine(1);

    return () => bindingRef.current?.destroy();

  }, [
    editorInstance,
    monacoInstance,
    activeFileId,
    activeText,
    awareness,
    language,
  ]);

  useEffect(() => {
    return () => bindingRef.current?.destroy();
  }, []);

  const handleRun = () => {
    if (!activeText || !runnable) return;

    setRunRequest({
      code: activeText.toString(),
      language,
      token: Date.now(),
    });

    setTerminalOpen(true);
  };

  useEffect(() => {
    if (!editorInstance || !awareness) return undefined;
    let idleTimer = null;
    const disposable = editorInstance.onDidChangeModelContent(() => {
      awareness.setLocalStateField("activity", "editing");
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        awareness.setLocalStateField("activity", "idle");
      }, 2000);
    });
    return () => {
      disposable.dispose();
      clearTimeout(idleTimer);
    };
  }, [editorInstance, awareness]);

  return (
    <div className="code-editor">
      <div className="code-editor__tabbar">
        <div className="code-editor__file-label">
          {activeFile && (
            <FileIcon
              name={activeFile.name}
              size={14}
            />
          )}

          <span>
            {activeFile
              ? activeFile.name
              : "No file open — select one from the explorer"}
          </span>
        </div>

        <div className="code-editor__tools">
          <button
            className="btn-run"
            onClick={handleRun}
            disabled={!runnable}
            title={runnable ? "Run in-browser" : "JS/TS/Python only"}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            Run
          </button>

          <button
            className={`btn-terminal ${terminalOpen ? "is-active" : ""}`}
            onClick={() => setTerminalOpen((v) => !v)}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 7l5 5-5 5M13 17h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Terminal
          </button>

          <button
            className={`btn-terminal ${aiOpen ? "is-active" : ""}`}
            onClick={() => setAiOpen((v) => !v)}
            disabled={!activeFile}
            title={activeFile ? "Ask AI about this code" : "Open a file first"}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 3l1.9 4.5L18 9l-4.1 1.5L12 15l-1.9-4.5L6 9l4.1-1.5L12 3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
            Ask AI
          </button>
        </div>
      </div>

      <div className="code-editor__surface">
        {activeText ? (
          <Editor
            language={language}
            theme="vs-dark"
            onMount={handleMount}
            options={{
              automaticLayout: true,
              fontSize: settings.fontSize,
              fontFamily: FONT_FAMILY_STACKS[settings.fontFamily],
              wordWrap: settings.wordWrap ? "on" : "off",
              minimap: {
                enabled: settings.minimap,
              },
              lineNumbers: settings.lineNumbers ? "on" : "off",
              smoothScrolling: true,
              padding: {
                top: 12,
              },
            }}
          />
        ) : (
          <div className="code-editor__empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="code-editor__empty-icon">
            <path d="M8 4 3 12l5 8M16 4l5 8-5 8" stroke="url(#emptyGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <defs>
              <linearGradient id="emptyGrad" x1="2" y1="4" x2="22" y2="20">
                <stop offset="0%" stopColor="#3fc6d6" />
                <stop offset="100%" stopColor="#3ddc97" />
              </linearGradient>
            </defs>
          </svg>
          <p className="code-editor__empty-title">No file open</p>
          <p className="code-editor__empty-sub">Select a file from the explorer to start editing</p>
        </div>
        )}
      </div>

      {terminalOpen && (
        <div className="code-editor__terminal" style={{ height: terminalPanel.height }}>
          <div
            className={`code-editor__panel-resizer ${terminalPanel.resizing ? "is-resizing" : ""}`}
            onMouseDown={terminalPanel.onDragStart}
            onTouchStart={terminalPanel.onDragStart}
          />
          <Terminal
            code={runRequest?.code ?? ""}
            language={
              runRequest?.language ?? language
            }
            autoRunToken={runRequest?.token}
            onClose={() =>
              setTerminalOpen(false)
            }
            onOutputChange={setTerminalOutput}
          />
        </div>
      )}

      {aiOpen && (
        <div className="code-editor__terminal" style={{ height: aiPanel.height }}>
          <div
            className={`code-editor__panel-resizer ${aiPanel.resizing ? "is-resizing" : ""}`}
            onMouseDown={aiPanel.onDragStart}
            onTouchStart={aiPanel.onDragStart}
          />
          <AiDoubtBox
            code={activeText?.toString() ?? ""}
            language={language}
            fileName={activeFile?.name}
            errorOutput={terminalOutput}
            onClose={() => setAiOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

export default CodeEditor;