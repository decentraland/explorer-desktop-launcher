import * as electronDl from 'electron-dl'
import { unzip } from './decompress'
import { BrowserWindow, ipcMain } from 'electron'
import * as fs from 'fs'
import axios from 'axios'
import { main } from './main'
import * as isDev from 'electron-is-dev'

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
    event.sender.executeJavaScript(`ELECTRON_MODE = ${electronMode}`)
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
      event.sender.send('downloadState', { type: 'ERROR', message: 'Invalid remote version' })
    } else if (version === remoteVersion) {
      // ready
      event.sender.send('downloadState', { type: 'READY' })
    } else {
      // download please
      event.sender.send('downloadState', { type: 'NEW_VERSION' })
    }

    if (validVersion && !PREVIEW) {
      const desktopVersion = `\"desktop-${main.config.desktopBranch}.commit-${remoteVersion.substring(0, 7)}\"`
      event.sender.executeJavaScript(`globalThis.ROLLOUTS['@dcl/unity-renderer']['version'] = ${desktopVersion};`)
      event.sender.executeJavaScript(`globalThis.ROLLOUTS['@dcl/explorer-desktop'] = { 'version': ${desktopVersion} };`)
    }
  })
}

const getBranchName = () => {
  return main.config.desktopBranch.replace(/\//gi, '-')
}

const registerExecuteProcessEvent = (rendererPath: string, executablePath: string) => {
  ipcMain.on('executeProcess', (event) => {
    try {
      const onExecute = (err: any, data: any) => {
        if (err) {
          console.error('Execute error: ', err)
          event.sender.send('downloadState', { type: 'ERROR', message: err })
          ipcMain.emit('process-terminated', false)
          return
        }

        console.log('Process terminated - ' + data.toString())
        ipcMain.emit('process-terminated', true)
      }

      let path = '"' + rendererPath + getBranchName() + executablePath + '"'

      let extraParams = ` --browser false --port ${main.config.port}`

      console.log('Execute path: ', path + extraParams)

      if (getOSName() === 'mac') {
        const { exec } = require('child_process')
        exec('open -W ' + path + ' --args' + extraParams, onExecute)
      } else {
        const { exec } = require('child_process')
        exec(path + extraParams, onExecute)
      }

      ipcMain.emit('on-open-renderer')
    } catch (e) {
      console.error('Execute error: ', e)
      event.sender.send('downloadState', { type: 'ERROR', message: e })
    }
  })
}
const registerDownloadEvent = (win: BrowserWindow, launcherPaths: LauncherPaths) => {
  //electronDl();
  ipcMain.on('download', async (event) => {
    const branchPath = launcherPaths.rendererPath + getBranchName()
    fs.rmdirSync(branchPath, { recursive: true })
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

export const registerUpdaterEvents = (win: BrowserWindow, launcherPaths: LauncherPaths) => {
  try {
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
