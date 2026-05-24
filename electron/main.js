const { app, BrowserWindow, shell, ipcMain } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

const isDev = !app.isPackaged;

// Force DATA_DIR to the OS-native userData path BEFORE any module needing it loads.
if (!process.env.DATA_DIR) {
  process.env.DATA_DIR = app.getPath("userData");
}
try { fs.mkdirSync(process.env.DATA_DIR, { recursive: true }); } catch {}

let serverPort = null;
let mainWindow = null;
let tray = null;

async function startNextServer() {
  if (isDev) {
    // Dev mode: assume `npm run dev` already runs on the dev port
    serverPort = Number(process.env.UNIRO_DEV_PORT || 20129);
    return;
  }

  const getPort = (await import("get-port")).default;
  serverPort = await getPort({ port: [20128, 20129, 20130] });
  process.env.PORT = String(serverPort);
  process.env.HOSTNAME = "127.0.0.1";

  // electron-builder unpacks .next/standalone into app.asar.unpacked
  // so the Node runtime can read it.
  const standaloneRoot = path.join(
    process.resourcesPath,
    "app.asar.unpacked",
    ".next",
    "standalone"
  );
  const serverEntry = path.join(standaloneRoot, "server.js");

  // Standalone server reads cwd-relative paths for static files.
  process.chdir(standaloneRoot);

  // Loading the standalone server side-effects: it calls .listen on PORT.
  require(serverEntry);
}

function createMainWindow() {
  const windowStateKeeper = require("electron-window-state");
  const state = windowStateKeeper({ defaultWidth: 1280, defaultHeight: 800 });

  mainWindow = new BrowserWindow({
    x: state.x,
    y: state.y,
    width: state.width,
    height: state.height,
    minWidth: 900,
    minHeight: 600,
    title: "Uniro",
    backgroundColor: "#FFFFFF",
    show: false,
    autoHideMenuBar: true,
    icon: process.platform === "linux"
      ? path.join(__dirname, "icons", "linux.png")
      : undefined,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  state.manage(mainWindow);

  // Open external links in the user's default browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Minimize to tray on close; true exit goes through the tray menu.
  mainWindow.on("close", (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.loadURL(`http://127.0.0.1:${serverPort}/login`);
}

function wireIpc() {
  ipcMain.handle("uniro:version", () => app.getVersion());
  ipcMain.handle("uniro:openExternal", (_e, url) => shell.openExternal(url));
  ipcMain.handle("uniro:restart", () => {
    app.relaunch();
    app.exit(0);
  });
  ipcMain.handle("uniro:quit", () => {
    app.isQuitting = true;
    app.quit();
  });
}

// Single-instance lock so a second launch focuses the existing window.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      await startNextServer();
      wireIpc();
      createMainWindow();
      tray = require("./tray").createTray(mainWindow);
      if (app.isPackaged) {
        require("./updater").startUpdater(mainWindow);
      }
    } catch (err) {
      console.error("Electron startup failed:", err);
      app.quit();
    }

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
      else if (mainWindow) mainWindow.show();
    });
  });

  app.on("before-quit", () => {
    app.isQuitting = true;
  });

  // Keep running in tray after all windows close on Win/Linux.
  // macOS apps traditionally stay in the dock; we follow that here too.
  app.on("window-all-closed", () => {
    // intentionally no-op
  });
}

// Tray reference held to prevent GC.
module.exports = { __trayRef: () => tray };
