import { shell, app, BrowserWindow, ipcMain, Tray, Menu } from 'electron'
import * as path from 'path'
import * as isDev from 'electron-is-dev'
import { registerUpdaterEvents, getOSName, getFreePort, setConfig } from './updater'
import { exit } from 'process'
import { autoUpdater } from 'electron-updater'

const defaultConfig = {
  developerMode: false,
  customUrl: '',
  desktopBranch: 'main',
  customParams: '',
  port: 7666,
  defaultParams: 'DISABLE_ASSET_BUNDLES&DISABLE_WEARABLE_ASSET_BUNDLES&'
}

let config = { ...defaultConfig }

const openingUrl = process.argv.find((arg) => arg.startsWith('dcl://'))

const checkAmpersand = (origText: string) => {
  let result = origText
  if (origText.length > 0) {
    const lastChar = origText.substr(origText.length - 1)
    if (lastChar != '&' && lastChar != '?') {
      result += '&'
    }
  }
  return result
}

app.setAsDefaultProtocolClient('dcl');

const isAppAllowed = app.requestSingleInstanceLock()

if (!isAppAllowed) {
  app.quit();
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

let isRendererOpen = false
let isExitAllowed = false
let rendererPath = `${app.getPath('appData')}/explorer-desktop-launcher/renderer/`
let executablePath = `/unity-renderer-${osName}`
let versionPath = `/version.json`
const baseUrl = `https://renderer-artifacts.decentraland.org/desktop/`
const artifactUrl = `/unity-renderer-${osName}.zip`
const remoteVersionUrl = `/version.json`
let tray: Tray | null = null
let contextMenu: Menu | undefined = undefined

if (getOSName() === 'windows') {
  rendererPath = rendererPath.replace(/\//gi, '\\')
  versionPath = versionPath.replace(/\//gi, '\\')
  executablePath = executablePath.replace(/\//gi, '\\')
}

const loadWindow = async (win: BrowserWindow) => {
  if (isDev) {
    await win.loadURL(`http://localhost:9000/index.html`)
  } else {
    await win.loadURL(`file://${__dirname}/../../public/index.html#v${app.getVersion()}`)
  }
}

const checkDeveloperConsole = (win: BrowserWindow) => {
  if (isDev || config.developerMode) {
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    if (win.webContents.isDevToolsOpened())
      win.webContents.closeDevTools()
  }
}

const getAppTitle = (): string => {
  let title = 'Decentraland BETA'

  if (config.desktopBranch !== defaultConfig.desktopBranch)
    title += ` desktop-branch=${config.desktopBranch}`

  if (config.customParams !== defaultConfig.customParams)
    title += ` params=${config.customParams}`

  return title
}

const createWindow = async (): Promise<BrowserWindow> => {

  const win = new BrowserWindow({
    title: getAppTitle(),
    width: 1006, // 990+16 border
    height: 849, // 790+59 border
    minWidth: 1006,
    minHeight: 849,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      contextIsolation: false,
      webSecurity: !isDev,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  win.on('page-title-updated', (evt) => {
    evt.preventDefault();
  });

  ipcMain.on('checkDeveloperMode', (event: any) => {
    console.log('checkDeveloperMode')
    event.sender.send('checkDeveloperMode', {
      isDev: isDev || config.developerMode,
      desktopBranch: config.desktopBranch,
      customParams: config.customParams
    })
  })

  const port = await getFreePort()
  config.port = port

  registerUpdaterEvents(win, baseUrl, rendererPath, versionPath, executablePath, artifactUrl, remoteVersionUrl, config)

  win.setMenuBarVisibility(false)

  await loadWindow(win)

  checkDeveloperConsole(win)

  return Promise.resolve(win)
}

const loadDecentralandWeb = async (win: BrowserWindow) => {
  try {
    showLoading(win)

    const stage = config.developerMode ? 'zone' : 'org'
    let url = `http://play.decentraland.${stage}/?`

    if (config.customUrl) {
      url = config.customUrl
    } else {
      url = `${url}renderer-version=loading&`
    }

    url = `${url}${config.customParams}${config.defaultParams}ws=wss://localhost:${config.port}/dcl`

    console.log(`Opening: ${url}`)

    let promise = win.loadURL(url)
    promise.finally(() => hideLoading(win))
  } catch (err) {
    console.error('err:', err)
  }
}

const getIconByPlatform = () => {
  if (process.platform === 'win32') return 'Windows/Icon.ico'
  //if (nativeTheme.shouldUseDarkColors) return 'decentraland-tray.png';
  return 'iOS/Icon.png'
}

const hideWindowInTray = (win: BrowserWindow) => {
  if (tray == null) {
    const iconPath = path.join(path.dirname(__dirname), '../public/systray', getIconByPlatform())

    try {
      tray = new Tray(iconPath)

      contextMenu = Menu.buildFromTemplate([
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          type: 'normal',
          click: () => onExit()
        }
      ])

      tray.setToolTip('Decentraland Launcher')
      tray.setContextMenu(contextMenu)
      tray.on('click', (event) => showWindowAndHideTray(win))
      tray.on('right-click', (event) => tray?.popUpContextMenu(contextMenu))
    } catch (e) {
      throw e
    }
  }

  win.hide()
}

const onExit = () => {
  isExitAllowed = true
  exit(0)
}

const showWindowAndHideTray = (win: BrowserWindow) => {
  win.show()
  if (tray != null) {
    tray.destroy()
    tray = null
  }
}

const showLoading = (win: BrowserWindow) => {
  win.webContents.executeJavaScript(`document.getElementById("loading").removeAttribute("hidden")`)
}

const hideLoading = (win: BrowserWindow) => {
  win.webContents.executeJavaScript(`document.getElementById("loading")?.setAttribute("hidden", "")`)
}

const getKeyAndValue = (data: string): [string, string | undefined] => {
  if (data.includes('=')) {
    const keyAndValue = data.split('=')
    if (keyAndValue.length == 2) {
      const key = keyAndValue[0].toUpperCase()
      const value = keyAndValue[1]
      return [key, value]
    }
  }

  return [data, undefined]
}

const onOpenUrl = (data: string, win?: BrowserWindow) => {
  config = { ...defaultConfig }
  const url = data.substring('dcl://'.length)

  const params = url.split('&')
  let resultParams = ''
  for (const param of params) {
    const [key, value] = getKeyAndValue(param)
    if (key == 'DESKTOP-BRANCH' && value) {
      config.desktopBranch = value
      setConfig(config)
    } else if (key == 'DESKTOP-DEVELOPER-MODE') {
      config.developerMode = true
    } else {
      resultParams += key
      if (value)
        resultParams += `=${value}`
      resultParams += '&'
    }
  }

  config.customParams = checkAmpersand(resultParams)

  if (win) {
    win.setTitle(getAppTitle())

    if (!isDev && !config.developerMode) {
      loadDecentralandWeb(win)
    } else {
      loadWindow(win)
    }

    checkDeveloperConsole(win)
  }
}

const startApp = async (): Promise<void> => {
  if (process.platform == 'win32') {
    if (openingUrl)
      onOpenUrl(openingUrl)
  }

  const win = await createWindow()

  app.on('open-url', (event, url) => {
    event.preventDefault();
    onOpenUrl(url, win)
  });

  ipcMain.on('process-terminated', async (event) => {
    isRendererOpen = false

    // (#1457) we should reload the url
    loadDecentralandWeb(win)
    showWindowAndHideTray(win)
  })

  ipcMain.on('executeProcess', (event) => {
    isRendererOpen = true
    hideWindowInTray(win)
  })

  win.on('close', (event: { preventDefault: () => void }) => {
    // this prevents the launcher from closing when using the X button on the window
    if (!isExitAllowed && isRendererOpen) {
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

  if (!isDev && !config.developerMode) {
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

  ipcMain.on('loadDecentralandWeb', (event: any, url: string, explorerDesktopBranch: string) => {
    config.customUrl = url
    config.desktopBranch = explorerDesktopBranch
    setConfig(config)
    loadDecentralandWeb(win)
  })

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
    isExitAllowed = true
  })
})
