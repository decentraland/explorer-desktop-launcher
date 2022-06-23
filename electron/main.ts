import { shell, app, BrowserWindow, ipcMain, Tray, Menu, crashReporter } from 'electron'
import * as isDev from 'electron-is-dev'
import { getOSName, getFreePort } from './updater'
import { exit } from 'process'
import { autoUpdater } from 'electron-updater'
import { parseConfig } from './cmdParser'
import { getAppTitle, getAppBasePath } from './helpers'
import {
  createWindow,
  hideWindowInTray,
  loadDecentralandWeb,
  onOpenUrl,
  reportNewLauncherVersion,
  showWindowAndHideTray
} from './window'
import { LauncherConfig, LauncherPaths } from './types'
import { isTrustedCertificate } from './certificateChecker'
import { reportError, initializeRollbar } from './rollbar'
import * as semver from 'semver'
import fs = require('fs')

const defaultConfig: LauncherConfig = {
  developerMode: false,
  customUrl: '',
  desktopBranch: undefined,
  customDesktopVersion: undefined,
  customParams: '',
  port: 7666,
  previewMode: false
}

class MainApp {
  defaultConfig: LauncherConfig = defaultConfig

  isDefaultWeb = false
  isRendererOpen = false
  isExitAllowed = false
  tray: Tray | null = null
  contextMenu: Menu | undefined = undefined
  openingUrl: string | undefined
  config: LauncherConfig = defaultConfig
  win: BrowserWindow | undefined
}

// all uncaught exceptions are being sent automatically
initializeRollbar()

initializeCrashReport()

export const main: MainApp = new MainApp()

parseConfig([...process.argv])

main.openingUrl = process.argv.find((arg) => arg.startsWith('dcl://'))
console.log('main.openingUrl: ', main.openingUrl)

app.setAsDefaultProtocolClient('dcl')

const isAppAllowed = app.requestSingleInstanceLock()

if (!isAppAllowed) {
  app.quit()
} else {
  app.on('open-url', (event, url) => {
    if (main.win) {
      onOpenUrl(url, main.win)
    } else {
      main.openingUrl = url
    }
    event.preventDefault()
  })
}

const osName = getOSName()

console.log('Config:', main.config)
console.log('OS:', osName)

if (getOSName() === null) {
  reportError('OS not supported', () => {
    exit(1)
  })
}

const launcherPaths: LauncherPaths = {
  baseUrl: `https://renderer-artifacts.decentraland.org/desktop/`,
  rendererPath: `${app.getPath('appData')}/explorer-desktop-launcher/renderer/`,
  executablePath: `/unity-renderer-${osName}`,
  versionPath: `/version.json`,
  artifactUrl: `unity-renderer-${osName}.zip`,
  remoteVersionUrl: `/version.json`
}

if (getOSName() === 'windows') {
  launcherPaths.rendererPath = launcherPaths.rendererPath.replace(/\//gi, '\\')
  launcherPaths.versionPath = launcherPaths.versionPath.replace(/\//gi, '\\')
  launcherPaths.executablePath = launcherPaths.executablePath.replace(/\//gi, '\\')
}

const checkUpdates = async (win: BrowserWindow): Promise<void> => {
  try {
    if (getOSName() === 'mac') {
      // No updates in Mac until we signed the executable
      const newVersion = autoUpdater.currentVersion.version
      autoUpdater.autoDownload = false
      const result = await autoUpdater.checkForUpdates()
      const installedVersion = result.updateInfo.version
      console.log('Mac Result:', result)

      if (semver.lt(installedVersion, newVersion)) {
        const macDownloadUrl =
          'https://github.com/decentraland/explorer-desktop-launcher/releases/latest/download/Decentraland.dmg'
        await reportNewLauncherVersion(win, macDownloadUrl)
      } else {
        await loadDecentralandWeb(win) // Load decentraland web to report the error
      }
    } else {
      const result = await autoUpdater.checkForUpdatesAndNotify()
      console.log('Result:', result)
      if (result === null || !result.downloadPromise) {
        await loadDecentralandWeb(win)
      } else {
        await result.downloadPromise

        console.log('Download completed')
        const silent = process.platform === 'darwin' // Silent=true only on Mac
        autoUpdater.quitAndInstall(silent, true)
      }
    }
  } catch (err) {
    console.error(`Check Updates error: ${err}`)
    await loadDecentralandWeb(win) // Load current version anyway
  }
  return Promise.resolve()
}

const startApp = async (): Promise<void> => {
  main.config.port = await getFreePort()

  if (main.openingUrl) {
    console.log('opening-url: ', main.openingUrl)
    onOpenUrl(main.openingUrl)
  }

  const appTitle = getAppTitle()
  const win = await createWindow(appTitle, launcherPaths)
  main.win = win

  ipcMain.on('process-terminated', async (event, reloadWebsite: boolean) => {
    main.isRendererOpen = false

    if (reloadWebsite) {
      // (#1457) we should reload the url
      await loadDecentralandWeb(win)
    }

    showWindowAndHideTray(win)
  })

  ipcMain.on('on-open-renderer', (event) => {
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
      if (url) onOpenUrl(url, win)

      console.log('second-instance url: ', url)
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

  if (!main.config.developerMode && !main.config.previewMode) {
    await checkUpdates(win)
  }

  return Promise.resolve()
}

// SSL/TSL: this is the self signed certificate support
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  // On certificate error we disable default behaviour (stop loading the page)
  // and we then say "it is all fine - true" to the callback
  if (isTrustedCertificate(url, error)) {
    event.preventDefault()
    callback(true)
  }
})

app
  .whenReady()
  .then(async () => {
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
  .catch(async (error) => {
    reportError(error)
  })

function initializeCrashReport() {
  var path = getAppBasePath()
  if (!fs.existsSync(path)) fs.mkdir(path, () => {})

  app.setPath('crashDumps', path)

  crashReporter.start({ uploadToServer: false })
}
