import { app, BrowserWindow, ipcMain, Menu, Tray } from 'electron'
import { registerUpdaterEvents } from './updater'
import * as path from 'path'
import { main } from './main'
import * as isDev from 'electron-is-dev'
import { getAppTitle, getIconByPlatform, onExit } from './helpers'
import { URLSearchParams } from 'url'
import { LauncherPaths } from './types'

export const createWindow = async (title: string, launcherPaths: LauncherPaths): Promise<BrowserWindow> => {
  const win = new BrowserWindow({
    title,
    width: 1006, // 990+16 border
    height: 849, // 790+59 border
    minWidth: 1006,
    minHeight: 849,
    webPreferences: {
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      backgroundThrottling: false
    }
  })

  win.on('page-title-updated', (evt) => {
    evt.preventDefault()
  })

  ipcMain.on('checkDeveloperMode', (event: any) => {
    console.log('checkDeveloperMode')
    event.sender.send('checkDeveloperMode', {
      isDev: main.config.developerMode,
      previewMode: main.config.previewMode ? main.config.customUrl : undefined,
      desktopBranch: main.config.desktopBranch ?? 'main',
      customParams: main.config.customParams
    })
  })

  registerUpdaterEvents(win, launcherPaths)

  win.setMenuBarVisibility(false)

  await loadDefaultWeb(win)

  checkDeveloperConsole(win)

  return Promise.resolve(win)
}

export const loadDefaultWeb = async (win: BrowserWindow) => {
  main.isDefaultWeb = true
  await win.loadURL(`file://${__dirname}/../../public/index.html#v${app.getVersion()}`)
}

export const reportLauncherError = async (win: BrowserWindow, message: string) => {
  await win.loadURL(`file://${__dirname}/../../public/error.html`)

  win.webContents.send('setError', { error: message })
}

export const checkDeveloperConsole = (win: BrowserWindow) => {
  if (isDev || main.config.developerMode) {
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    if (win.webContents.isDevToolsOpened()) win.webContents.closeDevTools()
  }
}

export const hideWindowInTray = (win: BrowserWindow) => {
  if (main.tray == null) {
    const iconPath = path.join(path.dirname(__dirname), '../public/systray', getIconByPlatform())

    try {
      main.tray = new Tray(iconPath)

      main.contextMenu = Menu.buildFromTemplate([
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          type: 'normal',
          click: () => onExit()
        }
      ])

      main.tray.setToolTip('Decentraland Launcher')
      main.tray.setContextMenu(main.contextMenu)
      main.tray.on('right-click', (event) => main.tray?.popUpContextMenu(main.contextMenu))
    } catch (e) {
      throw e
    }
  }

  win.hide()
}

export const showWindowAndHideTray = (win: BrowserWindow) => {
  win.show()
  if (main.tray != null) {
    main.tray.destroy()
    main.tray = null
  }
}

const showLoading = async (win: BrowserWindow) => {
  try {
    await win.webContents.executeJavaScript(`document.getElementById("loading").removeAttribute("hidden")`)
  } catch (e) {
    console.error(`Show loading error ${e}`)
  }
}

const hideLoading = async (win: BrowserWindow) => {
  try {
    await win.webContents.executeJavaScript(`document.getElementById("loading")?.setAttribute("hidden", "")`)
  } catch (e) {
    console.error(`Hide loading error ${e}`)
  }
}

export const loadDecentralandWeb = async (win: BrowserWindow) => {
  try {
    if (main.isDefaultWeb) await showLoading(win)

    const stage = main.config.developerMode ? 'zone' : 'org'
    const url = new URL(main.config.customUrl || `http://play.decentraland.${stage}/?renderer-version=loading`)

    const customParamObj = new URLSearchParams(main.config.customParams)
    for (const [key, value] of Array.from(customParamObj.entries())) {
      url.searchParams.append(key, value)
    }

    url.searchParams.append('DISABLE_ASSET_BUNDLES', '')
    url.searchParams.append('DISABLE_WEARABLE_ASSET_BUNDLES', '')

    url.searchParams.append('ws', `wss://localhost:${main.config.port}/dcl`)

    console.log(`Opening: ${url.toString()}`)

    main.isDefaultWeb = false
    await win.loadURL(url.toString())
    await hideLoading(win)
  } catch (err) {
    console.error('err:', err)
  }
}

/**
 * Crop 'dcl://' at begin and a slash at the end if exists.
 * @param url - to be process
 * @returns URL proccesed
 */
function cropUrl(url: string): string {
  let result: string = url
  if (url.startsWith('dcl://')) {
    result = result.substring('dcl://'.length)
  }
  if (url.endsWith('/')) {
    result = result.substring(0, result.length - 1)
  }
  return result
}

export const onOpenUrl = (data: string, win?: BrowserWindow) => {
  main.config = { ...main.defaultConfig }

  const params = new URLSearchParams(cropUrl(data))

  const desktopBranch: string | null = params.get('DESKTOP-BRANCH')
  if (desktopBranch != null) {
    main.config.desktopBranch = desktopBranch
    params.delete('DESKTOP-BRANCH')
  }

  if (params.get('DESKTOP-DEVELOPER-MODE') != null) {
    main.config.developerMode = true
    params.delete('DESKTOP-DEVELOPER-MODE')
  }

  const previewMode: string | null = params.get('PREVIEW-MODE')
  if (previewMode != null) {
    if (previewMode !== '') {
      main.config.customUrl = previewMode
      main.config.previewMode = true
    }
    params.delete('PREVIEW-MODE')
  }

  main.config.customParams = params.toString()

  if (main.config.customParams.length > 0) {
    main.config.customParams += '&'
  }

  if (win) {
    win.setTitle(getAppTitle())

    if (!main.config.developerMode && !main.config.previewMode) {
      loadDecentralandWeb(win)
    } else {
      loadDefaultWeb(win)
    }

    checkDeveloperConsole(win)
  }
}
