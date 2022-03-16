import { app, BrowserWindow, ipcMain, Menu, Tray } from "electron";
import { registerUpdaterEvents } from "./updater";
import * as path from 'path'
import { main } from "./main";
import * as isDev from 'electron-is-dev'
import { checkAmpersand, getAppTitle, getIconByPlatform, getKeyAndValue, onExit } from "./helpers";

export const createWindow = async (
  title: string,
  launcherPaths: LauncherPaths
): Promise<BrowserWindow> => {

  const win = new BrowserWindow({
    title,
    width: 1006, // 990+16 border
    height: 849, // 790+59 border
    minWidth: 1006,
    minHeight: 849,
    webPreferences: {
      backgroundThrottling: false,
      nodeIntegration: true,
      enableRemoteModule: true,
      contextIsolation: false,
      webSecurity: !isDev
    }
  })

  win.on('page-title-updated', (evt) => {
    evt.preventDefault();
  });

  ipcMain.on('checkDeveloperMode', (event: any) => {
    console.log('checkDeveloperMode')
    event.sender.send('checkDeveloperMode', {
      isDev: isDev || main.config.developerMode,
      previewMode: main.config.previewMode ? main.config.customUrl : undefined,
      desktopBranch: main.config.desktopBranch,
      customParams: main.config.customParams
    })
  })

  registerUpdaterEvents(win, launcherPaths)

  win.setMenuBarVisibility(false)

  await loadWindow(win, isDev)

  checkDeveloperConsole(win)

  return Promise.resolve(win)
}

export const loadWindow = async (win: BrowserWindow, isDev: boolean) => {
  if (isDev) {
    await win.loadURL(`http://localhost:9000/index.html`)
  } else {
    await win.loadURL(`file://${__dirname}/../../public/index.html#v${app.getVersion()}`)
  }
}

export const checkDeveloperConsole = (win: BrowserWindow) => {
  if (isDev || main.config.developerMode) {
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    if (win.webContents.isDevToolsOpened())
      win.webContents.closeDevTools()
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

const showLoading = (win: BrowserWindow) => {
  win.webContents.executeJavaScript(`document.getElementById("loading").removeAttribute("hidden")`)
}

const hideLoading = (win: BrowserWindow) => {
  win.webContents.executeJavaScript(`document.getElementById("loading")?.setAttribute("hidden", "")`)
}

export const loadDecentralandWeb = async (win: BrowserWindow) => {
  try {
    showLoading(win)

    const stage = main.config.developerMode ? 'zone' : 'org'
    let url = `http://play.decentraland.${stage}/?`

    if (main.config.customUrl) {
      url = main.config.customUrl
    } else {
      url = `${url}renderer-version=loading&`
    }

    url = `${url}${main.config.customParams}${main.config.defaultParams}ws=wss://localhost:${main.config.port}/dcl`

    console.log(`Opening: ${url}`)

    let promise = win.loadURL(url)
    promise.finally(() => hideLoading(win))
  } catch (err) {
    console.error('err:', err)
  }
}

export const onOpenUrl = (data: string, win?: BrowserWindow) => {
  main.config = { ...main.defaultConfig }
  const url = checkAmpersand(data.substring('dcl://'.length))
  const params = url.split('&')
  let resultParams = ''
  for (const param of params) {
    const [key, value] = getKeyAndValue(param)
    if (key == 'DESKTOP-BRANCH' && value) {
      main.config.desktopBranch = value
    } else if (key == 'DESKTOP-DEVELOPER-MODE') {
      main.config.developerMode = true
    } else if (key == 'PREVIEW-MODE' && value) {
      main.config.customUrl = value
      main.config.previewMode = true
    } else {
      resultParams += key
      if (value)
        resultParams += `=${value}`
      resultParams += '&'
    }
  }

  main.config.customParams = checkAmpersand(resultParams)

  if (main.config.customParams === '&')
    main.config.customParams = ''

  if (win) {
    win.setTitle(getAppTitle())

    if (!isDev && !main.config.developerMode && !main.config.previewMode) {
      loadDecentralandWeb(win)
    } else {
      loadWindow(win, isDev)
    }

    checkDeveloperConsole(win)
  }
}