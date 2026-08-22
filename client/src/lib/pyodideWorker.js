import { loadPyodide } from "pyodide";

let pyodideReadyPromise = null;

function getPyodide() {
  if (!pyodideReadyPromise) {
    self.postMessage({ kind: "meta", args: ["Loading Python runtime…"] });
    pyodideReadyPromise = loadPyodide({
      indexURL: "/pyodide/",
      stdout: (text) => self.postMessage({ kind: "log", args: [text] }),
      stderr: (text) => self.postMessage({ kind: "error", args: [text] }),
    });
  }
  return pyodideReadyPromise;
}

self.onmessage = async (e) => {
  if (e.data?.kind !== "run") return;
  try {
    const pyodide = await getPyodide();
    await pyodide.runPythonAsync(e.data.code);
  } catch (err) {
    self.postMessage({ kind: "error", args: [err.message || String(err)] });
  }
  self.postMessage({ kind: "done" });
};
