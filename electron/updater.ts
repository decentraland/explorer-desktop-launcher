import * as electronDl from 'electron-dl'
import { unzip } from './decompress'
import { BrowserWindow, ipcMain, WebContents } from 'electron'
import * as fs from 'fs'
import axios from 'axios'
import { main } from './main'
import * as isDev from 'electron-is-dev'
import { app } from 'electron/main'
import { LauncherPaths } from './types'

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

const isUsingRollout = (): boolean => {
  return main.config.desktopBranch === undefined
}

const getRemoteVersion = async (launcherPaths: LauncherPaths) => {
  if (isUsingRollout()) {
    if (main.config.customDesktopVersion) {
      // Custom Desktop Version
      return main.config.customDesktopVersion
    } else {
      // Rollout
      const response = await axios.get('https://play.decentraland.org', {
        headers: {
          'x-debug-rollouts': true
        }
      })
      return response.data.map['@dcl/explorer-desktop'].version
    }
  } else {
    // Dev
    const url = launcherPaths.baseUrl + main.config.desktopBranch + launcherPaths.remoteVersionUrl

    console.log('checkVersion', url)

    const response = await axios.get(url)
    return response.data.version
  }
}

const isValidVersion = (version: string) => {
  if (isUsingRollout()) {
    const regex = /commit-[0-9a-f]{7}$/g
    return version.match(regex)
  } else {
    const regex = /[0-9a-f]{40}/g
    return version.match(regex)
  }
}

const registerVersionEvent = (launcherPaths: LauncherPaths) => {
  ipcMain.on('checkVersion', async (event) => {
    const electronMode = `\"${main.config.developerMode || isDev ? 'development' : 'production'}\"`
    await event.sender.executeJavaScript(`ELECTRON_MODE = ${electronMode}`)
    const PREVIEW = await event.sender.executeJavaScript('globalThis.preview')

    const version = getCurrentVersion(launcherPaths.rendererPath, launcherPaths.versionPath)
    remoteVersion = await getRemoteVersion(launcherPaths)

    const validVersion = isValidVersion(remoteVersion)

    if (!validVersion) {
      // error
      await reportFatalError(event.sender, `Invalid remote version ${remoteVersion}`)
    } else if (version === remoteVersion) {
      // ready
      event.sender.send('downloadState', { type: 'READY' })
    } else {
      // download please
      event.sender.send('downloadState', { type: 'NEW_VERSION' })
    }

    if (validVersion && !PREVIEW) {
      const desktopVersion = main.config.desktopBranch
        ? JSON.stringify(`dev-desktop-${main.config.desktopBranch}.commit-${remoteVersion.substring(0, 7)}`)
        : JSON.stringify(`desktop-${remoteVersion}`)

      await event.sender.executeJavaScript(`globalThis.ROLLOUTS['@dcl/unity-renderer']['version'] = ${desktopVersion};`)
      await event.sender.executeJavaScript(
        `globalThis.ROLLOUTS['@dcl/explorer-desktop'] = { 'version': ${desktopVersion} };`
      )
    }
  })
}

const getBranchName = () => {
  if (isUsingRollout()) {
    return 'prod'
  } else {
    return main.config.desktopBranch!.replace(/\//gi, '-')
  }
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
      if (data.length > maxCharsToRead) return data.slice(-maxCharsToRead)
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

const reportCrash = async (sender: WebContents, message: string) => {
  const path = JSON.stringify({ playerlogpath: getPlayerLogPath() })
  const data = JSON.stringify(`Player log:\n${getPlayerLog()}`)
  const code = `window.Rollbar.error(${data}, ${path})`
  console.log(`reportCrash path: ${path}`)

  try {
    await sender.executeJavaScript(code)

    await reportFatalError(sender, `Renderer unexpected exit: ${message}`)
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
          const message = `Exit code ${err.code.toString('hex')}, error message: ${err.message}`
          await reportCrash(event.sender, message)
          ipcMain.emit('process-terminated', event, false)
          return
        }

        console.log('Process terminated - ' + data.toString())
        ipcMain.emit('process-terminated', event, true)
      }

      let path = rendererPath + getBranchName() + executablePath

      let params = [`--browser`, `false`, `--port`, `${main.config.port}`]

      console.log(`Execute path: ${path} params: ${params}`)

      if (fs.existsSync(path)) {
        const { execFile } = require('child_process')
        if (getOSName() === 'mac') {
          params = ['-W', path, '--args', ...params]
          execFile('open', params, onProcessFinish)
        } else {
          execFile(path, params, onProcessFinish)
        }

        ipcMain.emit('on-open-renderer', event)
      } else {
        await reportFatalError(event.sender, `Renderer not found: ${path}`)
      }
    } catch (e) {
      console.error('Execute error: ', e)
      await reportFatalError(event.sender, JSON.stringify(e))
    }
  })
}

const getArtifactUrl = (launcherPaths: LauncherPaths) => {
  if (isUsingRollout()) {
    // Rollout
    const baseUrl = 'https://cdn.decentraland.org/@dcl/explorer-desktop/'
    return `${baseUrl}${encodeURIComponent(remoteVersion)}/${encodeURIComponent(launcherPaths.artifactUrl)}`
  } else {
    // Dev
    return `${launcherPaths.baseUrl}${encodeURIComponent(main.config.desktopBranch!)}/${encodeURIComponent(
      launcherPaths.artifactUrl
    )}`
  }
}

const registerDownloadEvent = (win: BrowserWindow, launcherPaths: LauncherPaths) => {
  //electronDl();
  ipcMain.on('download', async (event) => {
    const branchPath = launcherPaths.rendererPath + getBranchName()
    if (fs.existsSync(branchPath)) {
      fs.rmSync(branchPath, { recursive: true })
    }
    createDirIfNotExists(branchPath)
    const url = getArtifactUrl(launcherPaths)
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
        unzip(file.path, branchPath).then(() => {
          if (fs.existsSync(file.path)) {
            fs.rmSync(file.path)
          }

          if (getOSName() === 'mac') {
            const execPath = `${branchPath}/unity-renderer-mac.app/Contents/MacOS/Decentraland`
            console.log('execPath ' + execPath)
            if (fs.existsSync(execPath)) {
              fs.chmodSync(execPath, 0o755)
            }
          }

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
      if (fs.existsSync(launcherPaths.rendererPath)) {
        fs.rmSync(launcherPaths.rendererPath, { recursive: true })
      }
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
