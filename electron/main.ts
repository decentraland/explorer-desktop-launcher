import { app, BrowserWindow } from 'electron'
import * as path from 'path'
import * as isDev from 'electron-is-dev'
import installExtension, { REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer'
import { registerUpdaterEvents, getOSName, getFreePort } from './updater'
import { exit } from 'process'
import * as serve from 'electron-serve'


const loadURL = serve({directory: `${__dirname}/../`});

const config = {
  urlParams: '',
  openBrowser: false,
  developerMode: false
}

process.argv.shift() // Skip process name
while (process.argv.length != 0) {
  switch (process.argv[0]) {
    case '--url-params':
      process.argv.shift()
      config.urlParams = process.argv[0]
      break
    case '--browser':
      process.argv.shift()
      config.openBrowser = process.argv[0].toString() === 'true'
      break
    case '--developer-mode':
      config.developerMode = true
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
      //webSecurity: !isDev,
      webSecurity: false,
      preload: path.join(__dirname, 'preload.js'),
    }
  })

  win.setMenuBarVisibility(false)
  try {
    const port = await getFreePort()
    if (isDev) {
      win.loadURL(`http://localhost:3000/index.html?ws=ws://localhost:${port}/dcl&${config.urlParams}`)
    } else {
      loadURL(win).then(() => {
        win.loadURL(`app://-?ws=ws://localhost:${port}/dcl&kernel-branch=feat/ws-reconnect&${config.urlParams}`)
      })
      // 'build/index.html'
      //win.loadURL(`file://${__dirname}/../index.html?ws=ws://localhost:5000/dcl`)
    }
  } catch(err) {
    console.error('err:', err)
  }

  // Hot Reloading
  /*if (isDev) {
    // 'node_modules/.bin/electronPath'
    require('electron-reload')(__dirname, {
      electron: path.join(
        __dirname,
        '..',
        '..',
        'node_modules',
        '.bin',
        'electron' + (process.platform === 'win32' ? '.cmd' : '')
      ),
      forceHardReset: true,
      hardResetMethod: 'exit'
    })
  }*/

  if (isDev || true) {
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
