const { app, Menu, Tray, nativeImage } = require("electron");
const path = require("node:path");

function createTray(mainWindow) {
  const iconPath = path.join(__dirname, "icons", "linux.png");
  const image = nativeImage
    .createFromPath(iconPath)
    .resize({ width: 16, height: 16 });
  const tray = new Tray(image);

  const menu = Menu.buildFromTemplate([
    {
      label: "Show Uniro",
      click: () => mainWindow && mainWindow.show(),
    },
    {
      label: "Open Dashboard",
      click: () => {
        if (!mainWindow) return;
        mainWindow.show();
        // Best-effort navigation; if the window isn't loaded yet it's harmless.
        mainWindow.webContents.send("uniro:navigate", "/dashboard");
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setToolTip("Uniro");
  tray.setContextMenu(menu);
  tray.on("click", () => mainWindow && mainWindow.show());
  return tray;
}

module.exports = { createTray };
