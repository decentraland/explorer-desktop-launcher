import { shell, app, BrowserWindow, ipcMain, Tray, Menu, nativeTheme } from 'electron'
import * as path from 'path'
import * as isDev from 'electron-is-dev'
import { registerUpdaterEvents, getOSName, getFreePort } from './updater'
import { exit } from 'process'
import { autoUpdater } from 'electron-updater'

const config = {
  developerMode: false,
  customUrl: '',
  desktopBranch: 'main'
}

process.argv.shift() // Skip process name
while (process.argv.length != 0) {
  switch (process.argv[0]) {
    case '--developer-mode':
      config.developerMode = true
      break
    case '--custom-url':
      process.argv.shift()
      config.customUrl = process.argv[0]
      break
    case '--desktop-branch':
      process.argv.shift()
      config.desktopBranch = process.argv[0]
      break
  }
  process.argv.shift()
}

const osName = getOSName()

console.log('Config:', config)
console.log('OS:', osName)

if (getOSName() === null) {
  console.error('OS not supported')
  exit(1)
}

let isExitAllowed = false
let rendererPath = `${app.getPath('appData')}/decentraland/renderer/`
let executablePath = `/unity-renderer-${osName}`
let versionPath = `/version.json`
const baseUrl = `https://renderer-artifacts.decentraland.org/desktop/`
const artifactUrl = `/unity-renderer-${osName}.zip`
const remoteVersionUrl = `/version.json`
let tray: Tray | null = null;

if (getOSName() === 'windows') {
  rendererPath = rendererPath.replace(/\//gi, '\\')
  versionPath = versionPath.replace(/\//gi, '\\')
  executablePath = executablePath.replace(/\//gi, '\\')
}

const createWindow = async (): Promise<BrowserWindow> => {
  const win = new BrowserWindow({
    title: 'Decentraland',
    width: 990,
    height: 790,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      contextIsolation: false,
      webSecurity: !isDev,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  registerUpdaterEvents(win, baseUrl, rendererPath, versionPath, executablePath, artifactUrl, remoteVersionUrl, config)

  win.setMenuBarVisibility(false)

  if (isDev) {
    await win.loadURL(`http://localhost:9000/index.html`)
  } else {
    await win.loadURL(`file://${__dirname}/../../public/index.html#v${app.getVersion()}`)
  }

  if (isDev || config.developerMode) {
    win.webContents.openDevTools({ mode: 'detach' })
  }

  return Promise.resolve(win)
}

const loadDecentralandWeb = async (win: BrowserWindow) => {
  try {
    const port = await getFreePort()
    const stage = config.developerMode ? 'zone' : 'org'
    let url = `http://play.decentraland.${stage}/?`

    if (config.customUrl) {
      url = config.customUrl
    } else {
      url = `${url}renderer-version=loading&`
    }

    url = `${url}ws=ws://localhost:${port}/dcl`

    console.log(`Opening: ${url}`)

    win.loadURL(url)
  } catch (err) {
    console.error('err:', err)
  }
}

const getIconByPlatform = () => {
  if (process.platform === 'win32') return 'Windows/Icon.ico';
  //if (nativeTheme.shouldUseDarkColors) return 'decentraland-tray.png';
  return 'iOS/Icon.png';
};

const hideWindowInTray = (win: BrowserWindow) => {
  if (tray == null) {

    const iconPath = path.join(path.dirname(__dirname), "../public/systray", getIconByPlatform())

    try {
      tray = new Tray(iconPath)

      const contextMenu = Menu.buildFromTemplate([
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          type: 'normal',
          click: () => onExit()
        },
      ])

      tray.setToolTip('Decentraland Launcher')
      tray.setContextMenu(contextMenu)
      tray.on('click', (event) => showWindowAndHideTray(win))
      tray.on('right-click', (event) => tray?.popUpContextMenu(contextMenu));
    } catch (e) {
      throw e;
    }
  }

  win.hide()
}

const onExit = () => {
  isExitAllowed = true;
  exit(0)
}

const showWindowAndHideTray = (win: BrowserWindow) => {
  win.show()
  if (tray != null) {
    tray.destroy()
    tray = null
  }
}

const startApp = async (): Promise<void> => {

  const win = await createWindow()

  ipcMain.on('checkVersion', async (event) => {
    showWindowAndHideTray(win)
  })

  ipcMain.on('executeProcess', (event) => {
    hideWindowInTray(win)
  })

  win.on('close', (event: { preventDefault: () => void }) => {
    // this prevents the launcher from closing when using the X button on the window
    if (!isExitAllowed) {
      hideWindowInTray(win)
      event.preventDefault();
    }
  })

  win.on('minimize', function (event: { preventDefault: () => void }) {
    hideWindowInTray(win)
    event.preventDefault()
  })

  win.webContents.setWindowOpenHandler(({ url }: any) => {
    shell.openExternal(url, { activate: true })
    return { action: 'deny' }
  })

  if (!isDev) {
    const result = await autoUpdater.checkForUpdatesAndNotify()
    console.log('Result:', result)
    if (result === null || !result.downloadPromise) {
      loadDecentralandWeb(win)
    } else {
      if (result.downloadPromise) {
        await result.downloadPromise

        console.log('Download completed')
        const silent = process.platform === 'darwin' // Silent=true only on Mac
        autoUpdater.quitAndInstall(silent, true)
      }
    }
  } else {
    loadDecentralandWeb(win)
  }

  ipcMain.on('loadDecentralandWeb', () => {
    loadDecentralandWeb(win)
  })

  return Promise.resolve()
}

app.whenReady().then(async () => {
  await startApp()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      startApp()
    }
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('before-quit', function () {
    //this allows exiting the launcher through command+Q or alt+f4
    isExitAllowed = true;
  });
})
