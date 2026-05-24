const { autoUpdater } = require("electron-updater");

let updateInterval = null;

function startUpdater(mainWindow) {
  autoUpdater.logger = console;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-available", (info) => {
    mainWindow?.webContents.send("uniro:update-available", info);
  });

  autoUpdater.on("update-downloaded", (info) => {
    mainWindow?.webContents.send("uniro:update-downloaded", info);
  });

  autoUpdater.on("error", (err) => {
    console.error("Auto-update error:", err);
  });

  // Initial check after 30s, then every 6 hours.
  setTimeout(() => autoUpdater.checkForUpdatesAndNotify().catch(() => {}), 30_000);
  updateInterval = setInterval(
    () => autoUpdater.checkForUpdatesAndNotify().catch(() => {}),
    6 * 60 * 60 * 1000
  );
}

function stopUpdater() {
  if (updateInterval) clearInterval(updateInterval);
}

module.exports = { startUpdater, stopUpdater };
