const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("uniro", {
  version: () => ipcRenderer.invoke("uniro:version"),
  openExternal: (url) => ipcRenderer.invoke("uniro:openExternal", url),
  restart: () => ipcRenderer.invoke("uniro:restart"),
  quit: () => ipcRenderer.invoke("uniro:quit"),
  onNavigate: (cb) =>
    ipcRenderer.on("uniro:navigate", (_e, path) => cb(path)),
  onUpdateAvailable: (cb) =>
    ipcRenderer.on("uniro:update-available", (_e, info) => cb(info)),
  onUpdateDownloaded: (cb) =>
    ipcRenderer.on("uniro:update-downloaded", (_e, info) => cb(info)),
});
