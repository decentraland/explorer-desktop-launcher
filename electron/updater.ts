import * as electronDl from 'electron-dl'
import { unzip } from './decompress'
import { BrowserWindow, ipcMain, ipcRenderer } from 'electron'
import * as fs from 'fs'
import axios from 'axios'

const globalConfig = {
  remoteVersion: '',
  desktopBranch: ''
}

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

const registerVersionEvent = (rendererPath: string, versionPath: string, baseUrl: string, remoteVersionUrl: string) => {
  ipcMain.on('checkVersion', async (event) => {
    const version = getCurrentVersion(rendererPath, versionPath)
    const url = baseUrl + globalConfig.desktopBranch + remoteVersionUrl

    console.log('checkVersion', url)

    const response = await axios.get(url)
    const remoteVersion = response.data.version

    const regex = /[0-9a-f]{40}/g
    const validVersion = remoteVersion.match(regex)

    globalConfig.remoteVersion = remoteVersion

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

    if (validVersion) {
      event.sender.executeJavaScript(
        `globalThis.ROLLOUTS['@dcl/unity-renderer']['version'] = \"desktop-${globalConfig.desktopBranch
        }.commit-${globalConfig.remoteVersion.substr(0, 7)}\";`
      )
    }
  })
}

const getBranchName = () => {
  return globalConfig.desktopBranch.replace(/\//gi, '-')
}

const registerExecuteProcessEvent = (rendererPath: string, executablePath: string, config: any) => {
  ipcMain.on('executeProcess', (event) => {
    try {
      const onExecute = (err: any, data: any) => {
        if (err) {
          console.error('Execute error: ', err)
          event.sender.send('downloadState', { type: 'ERROR', message: err })
          return
        }

        console.log("Process terminated - " + data.toString())
        ipcMain.emit("process-terminated");
      }

      let path = rendererPath + getBranchName() + executablePath

      let extraParams = ' --browser false'

      console.log('Execute path: ', path + extraParams)

      if (getOSName() === 'mac') {
        const { exec } = require('child_process')
        exec('open -W "' + path + '" --args' + extraParams, onExecute)
      } else {
        const { exec } = require('child_process')
        exec(path + extraParams, onExecute)
      }
    } catch (e) {
      console.error('Execute error: ', e)
      event.sender.send('downloadState', { type: 'ERROR', message: e })
    }
  })
}
const registerDownloadEvent = (
  win: BrowserWindow,
  rendererPath: string,
  versionPath: string,
  baseUrl: string,
  artifactUrl: string
) => {
  //electronDl();
  ipcMain.on('download', async (event) => {
    const branchPath = rendererPath + getBranchName()
    fs.rmdirSync(branchPath, { recursive: true })
    const url = baseUrl + globalConfig.desktopBranch + artifactUrl
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
            version: globalConfig.remoteVersion
          }

          const path = branchPath + versionPath

          fs.writeFileSync(path, JSON.stringify(versionData))
          event.sender.send('downloadState', { type: 'READY' })
        })
      }
    })
    console.log('Res: ', res)
    console.log('Done!')
  })
}

export const registerUpdaterEvents = (
  win: BrowserWindow,
  baseUrl: string,
  rendererPath: string,
  versionPath: string,
  executablePath: string,
  artifactUrl: string,
  remoteVersionUrl: string,
  config: any
) => {
  try {
    globalConfig.desktopBranch = config.desktopBranch

    // Get version
    registerVersionEvent(rendererPath, versionPath, baseUrl, remoteVersionUrl)

    // Register event to execute process
    registerExecuteProcessEvent(rendererPath, executablePath + getOSExtension(), config)

    // Register event to download
    registerDownloadEvent(win, rendererPath, versionPath, baseUrl, artifactUrl)

    // Register clear cache
    ipcMain.on('clearCache', async (event) => {
      fs.rmdirSync(rendererPath, { recursive: true })
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
    fp(5000, 5100, (err: any, freePort: number) => {
      if (err) reject(err)
      resolve(freePort)
    })
  })
}
