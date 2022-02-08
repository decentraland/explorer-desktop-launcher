import { shell, app, BrowserWindow, ipcMain, Tray, Menu } from 'electron'
import * as isDev from 'electron-is-dev'
import { getOSName, getFreePort } from './updater'
import { exit } from 'process'
import { autoUpdater } from 'electron-updater'
import { parseConfig } from './cmdParser'
import { getAppTitle } from './helpers'
import { createWindow, hideWindowInTray, loadDecentralandWeb, onOpenUrl, showWindowAndHideTray } from './window'

const defaultConfig: LauncherConfig = {
  developerMode: false,
  customUrl: '',
  desktopBranch: 'main',
  customParams: '',
  port: 7666,
  defaultParams: 'DISABLE_ASSET_BUNDLES&DISABLE_WEARABLE_ASSET_BUNDLES&'
}

class MainApp {
  defaultConfig: LauncherConfig = defaultConfig

  isRendererOpen = false
  isExitAllowed = false
  tray: Tray | null = null
  contextMenu: Menu | undefined = undefined
  openingUrl: string | undefined
  config: LauncherConfig = defaultConfig
}

export const main: MainApp = new MainApp();

parseConfig([...process.argv])

main.openingUrl = process.argv.find((arg) => arg.startsWith('dcl://'))

app.setAsDefaultProtocolClient('dcl');

const isAppAllowed = app.requestSingleInstanceLock()

if (!isAppAllowed) {
  app.quit();
}

const osName = getOSName()

console.log('Config:', main.config)
console.log('OS:', osName)

if (getOSName() === null) {
  console.error('OS not supported')
  exit(1)
}

const launcherPaths: LauncherPaths = {
  baseUrl: `https://renderer-artifacts.decentraland.org/desktop/`,
  rendererPath: `${app.getPath('appData')}/explorer-desktop-launcher/renderer/`,
  executablePath: `/unity-renderer-${osName}`,
  versionPath: `/version.json`,
  artifactUrl: `/unity-renderer-${osName}.zip`,
  remoteVersionUrl: `/version.json`
}

if (getOSName() === 'windows') {
  launcherPaths.rendererPath = launcherPaths.rendererPath.replace(/\//gi, '\\')
  launcherPaths.versionPath = launcherPaths.versionPath.replace(/\//gi, '\\')
  launcherPaths.executablePath = launcherPaths.executablePath.replace(/\//gi, '\\')
}

const checkUpdates = async(win: BrowserWindow): Promise<void> => {
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
}

const startApp = async (): Promise<void> => {
  main.config.port = await getFreePort()

  if (process.platform == 'win32') {
    if (main.openingUrl) {
      onOpenUrl(main.openingUrl)
    }
  }

  const appTitle = getAppTitle()
  const win = await createWindow(appTitle, launcherPaths)

  app.on('open-url', (event, url) => {
    event.preventDefault();
    onOpenUrl(url, win)
  });

  ipcMain.on('process-terminated', async (event) => {
    main.isRendererOpen = false

    // (#1457) we should reload the url
    loadDecentralandWeb(win)
    showWindowAndHideTray(win)
  })

  ipcMain.on('executeProcess', (event) => {
    main.isRendererOpen = true
    hideWindowInTray(win)
  })

  win.on('close', (event: { preventDefault: () => void }) => {
    // this prevents the launcher from closing when using the X button on the window
    if (!main.isExitAllowed && main.isRendererOpen) {
      hideWindowInTray(win)
      event.preventDefault()
    }
  })

  win.on('minimize', function (event: { preventDefault: () => void }) {
    hideWindowInTray(win)
    event.preventDefault()
  })

  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (process.platform !== 'darwin') {
      // Find the arg that is our custom protocol url and store it
      const url = commandLine.find((arg) => arg.startsWith('dcl://'))
      if (url)
        onOpenUrl(url, win)
    }
    showWindowAndHideTray(win)
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  ipcMain.on('loadDecentralandWeb', (event: any, url: string, explorerDesktopBranch: string) => {
    main.config.customUrl = url
    main.config.desktopBranch = explorerDesktopBranch
    loadDecentralandWeb(win)
  })

  if (!isDev && !main.config.developerMode) {
    await checkUpdates(win)
  }

  return Promise.resolve()
}

// SSL/TSL: this is the self signed certificate support
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  // On certificate error we disable default behaviour (stop loading the page)
  // and we then say "it is all fine - true" to the callback
  event.preventDefault()
  callback(true)
})

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
    main.isExitAllowed = true
  })
})
