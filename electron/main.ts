import { app, BrowserWindow, ipcMain } from 'electron'
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
console.log('Test version')

if (getOSName() === null) {
  console.error('OS not supported')
  exit(1)
}

let rendererPath = `${app.getPath('appData')}/decentraland/renderer/`
let executablePath = `/unity-renderer-${osName}`
let versionPath = `/version.json`
const baseUrl = `https://renderer-artifacts.decentraland.org/desktop/`
const artifactUrl = `/unity-renderer-${osName}.zip`
const remoteVersionUrl = `/version.json`

if (getOSName() === 'windows') {
  rendererPath = rendererPath.replace(/\//gi, '\\')
  versionPath = versionPath.replace(/\//gi, '\\')
  executablePath = executablePath.replace(/\//gi, '\\')
}

registerUpdaterEvents(baseUrl, rendererPath, versionPath, executablePath, artifactUrl, remoteVersionUrl, config)

// TEST

let globalWin: BrowserWindow | null = null
function sendStatusToWindow(text: string) {
  console.log('sendStatusToWindow', text)
  globalWin?.webContents.send('message', text)
}
autoUpdater.on('checking-for-update', () => {
  sendStatusToWindow('Checking for update...')
})
autoUpdater.on('update-available', (info) => {
  sendStatusToWindow('Update available.')
})
autoUpdater.on('update-not-available', (info) => {
  sendStatusToWindow('Update not available.')
})
autoUpdater.on('error', (err) => {
  sendStatusToWindow('Error in auto-updater. ' + err)
})
autoUpdater.on('download-progress', (progressObj) => {
  let log_message = 'Download speed: ' + progressObj.bytesPerSecond
  log_message = log_message + ' - Downloaded ' + progressObj.percent + '%'
  log_message = log_message + ' (' + progressObj.transferred + '/' + progressObj.total + ')'
  sendStatusToWindow(log_message)
})
autoUpdater.on('update-downloaded', (info) => {
  sendStatusToWindow('Update downloaded')
})

// TEST

const createWindow = () => {
  const win = new BrowserWindow({
    title: 'Decentraland',
    width: 900,
    height: 720,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      contextIsolation: false,
      webSecurity: !isDev,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  globalWin = win

  win.setMenuBarVisibility(false)

  if (isDev) {
    win.loadURL(`http://localhost:9000/index.html`)
  } else {
    win.loadURL(`file://${__dirname}/../../public/index.html#v${app.getVersion()}`)
  }

  if (isDev || config.developerMode) {
    win.webContents.openDevTools({ mode: 'detach' })
  }

  return win
}

const loadDecentralandWeb = async (win: BrowserWindow) => {
  try {
    const port = await getFreePort()
    const stage = config.developerMode ? 'zone' : 'org'
    let url = `http://play.decentraland.${stage}/?`

    if (config.customUrl) {
      url = config.customUrl
    }

    url = `${url}ws=ws://localhost:${port}/dcl`

    console.log(`Opening: ${url}`)

    win.loadURL(url)
  } catch (err) {
    console.error('err:', err)
  }
}

ipcMain.on('loadDecentralandWeb', () => {
  loadDecentralandWeb(globalWin!)
})

app.whenReady().then(() => {
  createWindow()

  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify().then((result) => {
      console.log('Result:', result)
      loadDecentralandWeb(globalWin!)
    })
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
})
