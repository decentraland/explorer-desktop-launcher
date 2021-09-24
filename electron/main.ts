import { app, BrowserWindow } from 'electron'
import * as path from 'path'
import * as isDev from 'electron-is-dev'
import installExtension, { REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer'
import { registerUpdaterEvents, getOSName, getFreePort } from './updater'
import { exit } from 'process'

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

const createWindow = async () => {
  const win = new BrowserWindow({
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

  win.setMenuBarVisibility(false)
  try {
    const port = await getFreePort()
    if (isDev) {
      win.loadURL(`http://localhost:3000/index.html?ws=ws://localhost:${port}/dcl`)
    } else {
      const stage = config.developerMode ? 'zone' : 'org'
      let url = `http://play.decentraland.${stage}/?`

      if (config.customUrl) {
        url = config.customUrl
      }

      url = `${url}ws=ws://localhost:${port}/dcl`

      console.log(`Opening: ${url}`)

      win.loadURL(url)
    }
  } catch (err) {
    console.error('err:', err)
  }

  if (isDev || config.developerMode) {
    win.webContents.openDevTools({ mode: 'detach' })
  }
}

app.whenReady().then(() => {
  // DevTools
  installExtension(REACT_DEVELOPER_TOOLS)
    .then((name) => console.log(`Added Extension:  ${name}`))
    .catch((err) => console.log('An error occurred: ', err))

  createWindow()

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
