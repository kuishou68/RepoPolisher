"use strict";
const electron = require("electron");
const l = "electron-trpc";
function F(e) {
  const r = /* @__PURE__ */ Object.create(null);
  for (const n in e) {
    const t = e[n];
    r[t] = n;
  }
  return r;
}
const k = {
  /**
  * Invalid JSON was received by the server.
  * An error occurred on the server while parsing the JSON text.
  */
  PARSE_ERROR: -32700,
  /**
  * The JSON sent is not a valid Request object.
  */
  BAD_REQUEST: -32600,
  /**
  * Internal JSON-RPC error.
  */
  INTERNAL_SERVER_ERROR: -32603,
  // Implementation specific errors
  UNAUTHORIZED: -32001,
  FORBIDDEN: -32003,
  NOT_FOUND: -32004,
  METHOD_NOT_SUPPORTED: -32005,
  TIMEOUT: -32008,
  CONFLICT: -32009,
  PRECONDITION_FAILED: -32012,
  PAYLOAD_TOO_LARGE: -32013,
  UNPROCESSABLE_CONTENT: -32022,
  TOO_MANY_REQUESTS: -32029,
  CLIENT_CLOSED_REQUEST: -32099
};
F(k);
F(k);
var D, A, m, U, L, M;
typeof window > "u" || "Deno" in window || ((A = (D = globalThis.process) == null ? void 0 : D.env) == null ? void 0 : A.NODE_ENV) === "test" || (U = (m = globalThis.process) == null ? void 0 : m.env) != null && U.JEST_WORKER_ID || (M = (L = globalThis.process) == null ? void 0 : L.env) != null && M.VITEST_WORKER_ID;
const q = () => {
  const e = {
    sendMessage: (r) => electron.ipcRenderer.send(l, r),
    onMessage: (r) => electron.ipcRenderer.on(l, (n, t) => r(t))
  };
  electron.contextBridge.exposeInMainWorld("electronTRPC", e);
};
process.once("loaded", async () => {
  q();
});
electron.contextBridge.exposeInMainWorld("electronAPI", {
  // Dialog
  openDirectory: () => electron.ipcRenderer.invoke("dialog:openDirectory"),
  openFile: (options) => electron.ipcRenderer.invoke("dialog:openFile", options),
  // Shell
  openExternal: (url) => electron.ipcRenderer.invoke("shell:openExternal", url),
  // Editor
  openInEditor: (filePath, line) => electron.ipcRenderer.invoke("editor:openFile", filePath, line),
  // App
  getPath: (name) => electron.ipcRenderer.invoke("app:getPath", name),
  // Platform info
  platform: process.platform,
  arch: process.arch
});
