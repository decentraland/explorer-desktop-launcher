import * as electronDl from 'electron-dl'
import { unzip } from './decompress'
import { BrowserWindow, ipcMain, WebContents } from 'electron'
import * as fs from 'fs'
import axios from 'axios'
import { main } from './main'
import * as isDev from 'electron-is-dev'
import { app } from 'electron/main'

let remoteVersion: string

const getCurrentVersion = (rendererPath: string, versionPath: string): string | null => {
  const path = rendererPath + getBranchName() + versionPath
  let version: string | null = null
  if (fs.existsSync(path)) {
    const rawData = fs.readFileSync(path)
    const body = JSON.parse(rawData.toString())
    version = body.version
  }

  return version
}

const registerVersionEvent = (launcherPaths: LauncherPaths) => {
  ipcMain.on('checkVersion', async (event) => {
    const electronMode = `\"${main.config.developerMode || isDev ? 'development' : 'production'}\"`
    await event.sender.executeJavaScript(`ELECTRON_MODE = ${electronMode}`)
    const PREVIEW = await event.sender.executeJavaScript('globalThis.preview')

    const version = getCurrentVersion(launcherPaths.rendererPath, launcherPaths.versionPath)
    const url = launcherPaths.baseUrl + main.config.desktopBranch + launcherPaths.remoteVersionUrl

    console.log('checkVersion', url)

    const response = await axios.get(url)
    remoteVersion = response.data.version

    const regex = /[0-9a-f]{40}/g
    const validVersion = remoteVersion.match(regex)

    if (!validVersion) {
      // error
      await reportFatalError(event.sender, 'Invalid remote version')
    } else if (version === remoteVersion) {
      // ready
      event.sender.send('downloadState', { type: 'READY' })
    } else {
      // download please
      event.sender.send('downloadState', { type: 'NEW_VERSION' })
    }

    if (validVersion && !PREVIEW) {
      const desktopVersion = `\"desktop-${main.config.desktopBranch}.commit-${remoteVersion.substring(0, 7)}\"`
      await event.sender.executeJavaScript(`globalThis.ROLLOUTS['@dcl/unity-renderer']['version'] = ${desktopVersion};`)
      await event.sender.executeJavaScript(
        `globalThis.ROLLOUTS['@dcl/explorer-desktop'] = { 'version': ${desktopVersion} };`
      )
    }
  })
}

const getBranchName = () => {
  return main.config.desktopBranch.replace(/\//gi, '-')
}

const getPlayerLogPath = (): string | undefined => {
  switch (getOSName()) {
    case 'mac':
      return `${app.getPath('home')}/Library/Logs/Decentraland/Decentraland/Player.log`
    case 'linux':
      return `${app.getPath('home')}/.config/unity3d/Decentraland/Decentraland/Player.log`
    case 'windows':
      return `${app.getPath('userData')}\\..\\..\\LocalLow\\Decentraland\\Decentraland\\Player.log`
    default:
      return undefined
  }
}

const getPlayerLog = (): string => {
  const path = getPlayerLogPath()
  if (path) {
    try {
      const maxCharsToRead = 2000
      const data = fs.readFileSync(path, 'utf8')
      if (data.length > maxCharsToRead) return data.substring(-maxCharsToRead)
      else return data
    } catch (err) {
      console.error(err)
      return `Get player log error: ${err}`
    }
  } else {
    return 'No path'
  }
}

const reportFatalError = async (sender: WebContents, message: string) => {
  try {
    const code = `ReportFatalError(new Error(${JSON.stringify(message)}), 'renderer#errorHandler')`
    console.log(code)
    await sender.executeJavaScript(code)
  } catch (e) {
    console.error(`Report fatal error, error: ${e}`)
  }
}

const reportCrash = async (sender: WebContents) => {
  const path = JSON.stringify({ playerlogpath: getPlayerLogPath() })
  const data = JSON.stringify(`Player log:\n${getPlayerLog()}`)
  const code = `window.Rollbar.error(${data}, ${path})`
  console.log(`reportCrash path: ${path}`)

  try {
    await sender.executeJavaScript(code)

    await reportFatalError(sender, 'Renderer unexpected exit')
  } catch (e) {
    console.error(`Report crash, error: ${e}`)
  }
}

const registerExecuteProcessEvent = (rendererPath: string, executablePath: string) => {
  ipcMain.on('executeProcess', async (event) => {
    try {
      const onProcessFinish = async (err: any, data: any) => {
        if (err) {
          console.error('Execute error: ', err)
          await reportCrash(event.sender)
          ipcMain.emit('process-terminated', event, false)
          return
        }

        console.log('Process terminated - ' + data.toString())
        ipcMain.emit('process-terminated', event, true)
      }

      let path = '"' + rendererPath + getBranchName() + executablePath + '"'

      let extraParams = ` --browser false --port ${main.config.port}`

      console.log('Execute path: ', path + extraParams)

      if (getOSName() === 'mac') {
        const { exec } = require('child_process')
        exec('open -W ' + path + ' --args' + extraParams, onProcessFinish)
      } else {
        const { exec } = require('child_process')
        exec(path + extraParams, onProcessFinish)
      }

      ipcMain.emit('on-open-renderer', event)
    } catch (e) {
      console.error('Execute error: ', e)
      await reportFatalError(event.sender, JSON.stringify(e))
    }
  })
}
const registerDownloadEvent = (win: BrowserWindow, launcherPaths: LauncherPaths) => {
  //electronDl();
  ipcMain.on('download', async (event) => {
    const branchPath = launcherPaths.rendererPath + getBranchName()
    fs.rmdirSync(branchPath, { recursive: true })
    createDirIfNotExists(branchPath)
    const url = launcherPaths.baseUrl + main.config.desktopBranch + launcherPaths.artifactUrl
    console.log('artifactUrl: ', url)
    const res = await electronDl.download(win, url, {
      directory: branchPath,
      onStarted: (item) => {
        console.log('onStarted:', item)
        event.sender.send('downloadState', { type: 'PROGRESS', progress: 0 })
      },
      onProgress: (progress) => {
        console.log('onProgress:', progress)
        event.sender.send('downloadState', { type: 'PROGRESS', progress: progress.percent * 100 })
      },
      onCompleted: (file) => {
        console.log('onCompleted:', file)
        unzip(file.path, branchPath, () => {
          fs.rmSync(file.path)

          const versionData = {
            version: remoteVersion
          }

          const path = branchPath + launcherPaths.versionPath

          fs.writeFileSync(path, JSON.stringify(versionData))
          event.sender.send('downloadState', { type: 'READY' })
        })
      }
    })
    console.log('Res: ', res)
    console.log('Done!')
  })
}

const createDirIfNotExists = (path: string) => {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path)
  }
}

export const registerUpdaterEvents = (win: BrowserWindow, launcherPaths: LauncherPaths) => {
  try {
    createDirIfNotExists(launcherPaths.rendererPath)

    // Get version
    registerVersionEvent(launcherPaths)

    // Register event to execute process
    registerExecuteProcessEvent(launcherPaths.rendererPath, launcherPaths.executablePath + getOSExtension())

    // Register event to download
    registerDownloadEvent(win, launcherPaths)

    // Register clear cache
    ipcMain.on('clearCache', async (event) => {
      fs.rmdirSync(launcherPaths.rendererPath, { recursive: true })
    })
  } catch (e) {
    console.error('registerUpdaterEvents error: ', e)
  }
}

export const getOSName = (): string | null => {
  switch (process.platform) {
    case 'darwin':
      return 'mac'
    case 'linux':
      return 'linux'
    case 'win32':
      return 'windows'
    default:
      return null
  }
}

export const getOSExtension = (): string | null => {
  switch (process.platform) {
    case 'darwin':
      return '.app'
    case 'linux':
      return ''
    case 'win32':
      return '.exe'
    default:
      return null
  }
}

export const getFreePort = (): Promise<number> => {
  return new Promise<number>((resolve, reject) => {
    var fp = require('find-free-port')
    fp(7666, 7766, (err: any, freePort: number) => {
      if (err) reject(err)
      resolve(freePort)
    })
  })
}
