import * as electronDl from 'electron-dl'
import { unzip } from './decompress'
import { BrowserWindow, ipcMain } from 'electron'
import * as fs from 'fs'

const branches = {
  kernelBranch: 'main',
  rendererBranch: 'main'
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

const registerVersionEvent = (
  rendererPath: string,
  versionPath: string,
  baseUrl: string,
  remoteVersionUrl: string,
  config: any
) => {
  ipcMain.on('getVersion', (event, kernelBranch?: string, rendererBranch?: string) => {
    if (kernelBranch) branches.kernelBranch = kernelBranch
    if (rendererBranch) branches.rendererBranch = rendererBranch

    const version = getCurrentVersion(rendererPath, versionPath)
    event.sender.send('getVersion', version, baseUrl + rendererBranch + remoteVersionUrl)
  })

  ipcMain.on('rendererReady', (event) => {
    event.sender.send('init', config.developerMode)
  })
}

const getBranchName = () => {
  return branches.rendererBranch.replace(/\//gi, '-')
}

const registerExecuteProcessEvent = (rendererPath: string, executablePath: string, config: any) => {
  ipcMain.on('executeProcess', (event) => {
    const onExecute = (err: any, data: any) => {
      if (err) {
        console.error(err)
        return
      }

      console.log(data.toString())
    }

    let path = rendererPath + getBranchName() + executablePath

    let params = config.urlParams

    if (branches.kernelBranch) {
      params = `"kernel-branch=${branches.kernelBranch}"`
    }

    if (params) {
      path = `${path} --url-params ${params}`
    }

    if (typeof config.openBrowser === 'boolean') {
      path = `${path} --browser ${config.openBrowser ? 'true' : 'false'}`
    }

    console.log('Execute path: ', path)

    if (getOSName() === 'mac') {
      const { exec } = require('child_process')
      exec('open "' + path + '"', onExecute)
    } else {
      const { exec } = require('child_process')
      exec(path, onExecute)
    }
  })
}

const registerDownloadEvent = (rendererPath: string, versionPath: string, baseUrl: string, artifactUrl: string) => {
  //electronDl();
  ipcMain.on('download', async (event, { remoteVersion }) => {
    const branchPath = rendererPath + getBranchName()
    fs.rmdirSync(branchPath, { recursive: true })
    const win = BrowserWindow.getFocusedWindow() as BrowserWindow
    const url = baseUrl + branches.rendererBranch + artifactUrl
    console.log('artifactUrl: ', url)
    const res = await electronDl.download(win, url, {
      directory: branchPath,
      onStarted: (item) => {
        console.log('onStarted:', item)
        event.sender.send('downloadStart')
      },
      onProgress: (progress) => {
        console.log('onProgress:', progress)
        event.sender.send('downloadProgress', progress.percent * 100)
      },
      onCompleted: (file) => {
        console.log('onCompleted:', file)
        unzip(file.path, branchPath, () => {
          fs.rmSync(file.path)

          const versionData = {
            version: remoteVersion
          }

          const path = branchPath + versionPath

          fs.writeFileSync(path, JSON.stringify(versionData))

          event.sender.send('downloadCompleted')
        })
      }
    })
    console.log('Res: ', res)
    console.log('Done!')
  })
}

export const registerUpdaterEvents = (
  baseUrl: string,
  rendererPath: string,
  versionPath: string,
  executablePath: string,
  artifactUrl: string,
  remoteVersionUrl: string,
  config: any
) => {
  // Get version
  registerVersionEvent(rendererPath, versionPath, baseUrl, remoteVersionUrl, config)

  // Register event to execute process
  registerExecuteProcessEvent(rendererPath, executablePath + getOSExtension(), config)

  // Register event to download
  registerDownloadEvent(rendererPath, versionPath, baseUrl, artifactUrl)

  // Register clear cache
  ipcMain.on('clearCache', async (event) => {
    fs.rmdirSync(rendererPath, { recursive: true })
  })
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
