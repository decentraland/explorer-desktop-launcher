import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import * as isDev from 'electron-is-dev';
import installExtension, { REACT_DEVELOPER_TOOLS } from "electron-devtools-installer";
import { registerUpdaterEvents, getOSName } from './updater'
import { exit } from 'process';

const osName = getOSName();

console.log("OS:", osName)

if (getOSName() === null) {
  console.error("OS not supported")
  exit(1)
}

const rendererPath = app.getAppPath() + "/renderer"
const executablePath = `${ rendererPath }/unity-renderer-${ osName }`
const versionPath = `${ rendererPath }/version.json`
const artifactUrl = `https://renderer-artifacts.decentraland.org/desktop/main/unity-renderer-${ osName }.zip`
registerUpdaterEvents(rendererPath, versionPath, executablePath, artifactUrl)

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule:true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  win.setMenuBarVisibility(false)

  if (isDev) {
    win.loadURL('http://localhost:3000/index.html');
  } else {
    // 'build/index.html'
    win.loadURL(`file://${__dirname}/../index.html`);
  }

  // Hot Reloading
  if (isDev) {
    // 'node_modules/.bin/electronPath'
    require('electron-reload')(__dirname, {
      electron: path.join(__dirname,
        '..',
        '..',
        'node_modules',
        '.bin',
        'electron' + (process.platform === "win32" ? ".cmd" : "")),
      forceHardReset: true,
      hardResetMethod: 'exit'
    });
  }

  if (isDev) {
    win.webContents.openDevTools({ mode: 'detach' });
  }
}

app.whenReady().then(() => {
  // DevTools
  installExtension(REACT_DEVELOPER_TOOLS)
    .then((name) => console.log(`Added Extension:  ${name}`))
    .catch((err) => console.log('An error occurred: ', err));

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
});
