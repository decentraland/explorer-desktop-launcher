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

//获取当前版本是否一致
const getCurrentVersion = (rendererPath: string, versionPath: string): string | null => {
  const path = rendererPath + getBranchName() + versionPath   //renderer路径+获取分支名字——版本路径
  let version: string | null = null
  if (fs.existsSync(path)) {
    const rawData = fs.readFileSync(path)
    const body = JSON.parse(rawData.toString())
    version = body.version
  }

  return version
}
//是否使用推出
const isUsingRollout = (): boolean => {
  return main.config.desktopBranch === undefined
  //桌面分支配置是否与默认配置相同
}
//获取远程版本
const getRemoteVersion = async (launcherPaths: LauncherPaths) => {
  if (isUsingRollout()) {
    if (main.config.customDesktopVersion) {
      // Custom Desktop Version
      //返回自定义桌面版本配置
      console.log("9999999999999999")
      return main.config.customDesktopVersion
    } else {
      // Rollout
      //如果不是的话，从官网获取
      //const response = await axios.get('https://play.decentraland.org', {
      //const response = await axios.get('https://play.testnet.andverse.org', {
      console.log("88888888888888888")
      const response = await axios.get('https://cdn.devnet.andverse.org/version.json', {
        headers: {
          'x-debug-rollouts': true
        }
      })
      return response.data.map['explorer-desktop'].version
    }
  } else {
    // Dev
    const url = launcherPaths.baseUrl + main.config.desktopBranch + launcherPaths.remoteVersionUrl
    console.log("7777777777777777")
    console.log('checkVersion', url)

    const response = await axios.get(url)
    return response.data.version
  }
}
//是有效版本
const isValidVersion = (version: string) => {
  if (isUsingRollout()) {
    const regex = /commit-[0-9a-f]{7}$/g
    return version.match(regex)
  } else {
    const regex = /[0-9a-f]{40}/g
    return version.match(regex)
  }
}
//注册版本事件
const registerVersionEvent = (launcherPaths: LauncherPaths) => {
  ipcMain.on('checkVersion', async (event) => {
    const electronMode = `\"${main.config.developerMode || isDev ? 'development' : 'production'}\"`
    await event.sender.executeJavaScript(`ELECTRON_MODE = ${electronMode}`)
    const PREVIEW = await event.sender.executeJavaScript('globalThis.preview')
    console.log("333333333333333333")
    //获取当前版本
    const version = getCurrentVersion(launcherPaths.rendererPath, launcherPaths.versionPath)
    console.log("444444444444444444")
    remoteVersion = await getRemoteVersion(launcherPaths)
    console.log("5555555555555555555")
    const validVersion = isValidVersion(remoteVersion)
    console.log("222222222222222222222222")
    console.log(launcherPaths.rendererPath, remoteVersion)
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
//获取分支名
const getBranchName = () => {
  if (isUsingRollout()) {
    return 'prod'
  } else {
    return main.config.desktopBranch!.replace(/\//gi, '-')
  }
}
//获取播放器日志路径
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
//获取player日志
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
//致命错误报告
const reportFatalError = async (sender: WebContents, message: string) => {
  try {
    const code = `ReportFatalError(new Error(${JSON.stringify(message)}), 'renderer#errorHandler')`
    console.log(code)
    await sender.executeJavaScript(code)
  } catch (e) {
    console.error(`Report fatal error, error: ${e}`)
  }
}
//报告事故
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
//注册执行进程事件
const registerExecuteProcessEvent = (rendererPath: string, executablePath: string) => {
  ipcMain.on('executeProcess', async (event) => {
    try {
      const onProcessFinish = async (err: any, data: any) => {
        if (err) {
          console.error('Execute error: ', err)
          const message = `Exit code ${err.code.toString(16)}, error message: ${err.message}`
          await reportCrash(event.sender, message)
          ipcMain.emit('process-terminated', event, false)
          return
        }

        console.log('Process terminated - ' + data.toString())
        ipcMain.emit('process-terminated', event, true)
      }

      // We didn't find a way to get this windows store app package path dynamically
      //我们没有找到动态获取windows store应用程序包路径的方法
      if (process.windowsStore) {
        rendererPath = process.env.LOCALAPPDATA +
          `\\Packages\\DecentralandFoundation.Decentraland_4zmdhd0rz3xz8\\LocalCache\\Roaming\\explorer-desktop-launcher\\renderer\\`
      }

      let path = rendererPath + getBranchName() + executablePath   //可执行文件路径

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
//Artifacts

//- [Windows](https://renderer-artifacts.decentraland.org/launcher-branch/main/Install%20Decentraland.exe)
//- [Windows AppX](https://renderer-artifacts.decentraland.org/launcher-branch/main/Decentraland.appx)
//- [Linux](https://renderer-artifacts.decentraland.org/launcher-branch/main/Decentraland.AppImage)
//- [Mac](https://renderer-artifacts.decentraland.org/launcher-branch/main/Decentraland.dmg)


const getArtifactUrl = (launcherPaths: LauncherPaths) => {
  if (isUsingRollout()) {
    // Rollout
    //const baseUrl = 'https://cdn.decentraland.org/@dcl/explorer-desktop/'
    const baseUrl = 'https://cdn.devnet.andverse.org/explorer-desktop/'
    return `${baseUrl}${encodeURIComponent(remoteVersion)}/${encodeURIComponent(launcherPaths.artifactUrl)}`
  } else {
    // Dev
    console.log("1111111111111111" + launcherPaths.baseUrl + main.config.desktopBranch + launcherPaths.artifactUrl)
    return `${launcherPaths.baseUrl}${encodeURIComponent(main.config.desktopBranch!)}/${encodeURIComponent(
      launcherPaths.artifactUrl
    )}`
  }
}
//注册下载事件
const registerDownloadEvent = (win: BrowserWindow, launcherPaths: LauncherPaths) => {
  //electronDl();
  console.log("1111111111111111")
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
//创建一个文件如果不是空
const createDirIfNotExists = (path: string) => {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path)
  }
}
//注册更新事件
export const registerUpdaterEvents = (win: BrowserWindow, launcherPaths: LauncherPaths) => {
  try {
    createDirIfNotExists(launcherPaths.rendererPath)

    // Get version获取版本
    registerVersionEvent(launcherPaths)

    // Register event to execute process注册事件以执行进程
    registerExecuteProcessEvent(launcherPaths.rendererPath, launcherPaths.executablePath + getOSExtension())

    // Register event to download注册事件下载
    registerDownloadEvent(win, launcherPaths)

    // Register clear cache清除缓存
    ipcMain.on('clearCache', async (event) => {
      if (fs.existsSync(launcherPaths.rendererPath)) {
        fs.rmSync(launcherPaths.rendererPath, { recursive: true })
      }
    })
  } catch (e) {
    console.error('registerUpdaterEvents error: ', e)
  }
}
//获取操作系统
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
//获取操作系统的扩展名
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
//获取免费端口
export const getFreePort = (): Promise<number> => {
  return new Promise<number>((resolve, reject) => {
    var fp = require('find-free-port')
    fp(7666, 7766, (err: any, freePort: number) => {
      //fp(5000, 5100, (err: any, freePort: number) => {
      if (err) reject(err)
      resolve(freePort)
    })
  })
}
