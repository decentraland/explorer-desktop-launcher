import { app } from 'electron'
import updater from 'electron-updater'
import { getPortPromise } from 'portfinder'
import { main } from './main'

export const getAppTitle = (): string => {
  const currentVersion = updater.autoUpdater.currentVersion.version
  let title = `Decentraland ${currentVersion}`
  console.log({ title, currentVersion })

  if (main.config.desktopBranch !== main.defaultConfig.desktopBranch)
    title += ` desktop-branch=${main.config.desktopBranch}`

  if (main.config.customDesktopVersion !== main.defaultConfig.customDesktopVersion)
    title += ` desktop-version=${main.config.customDesktopVersion}`

  if (main.config.customParams !== main.defaultConfig.customParams) title += ` params=${main.config.customParams}`

  return title
}

export const getFreePort = async (startPort: number = 7666, stopPort?: number): Promise<number> => {
  try {
    const resolvedPort = await getPortPromise({ startPort: startPort, stopPort: stopPort })
    return resolvedPort
  } catch (error) {
    throw error
  }
}

export const getIconByPlatform = () => {
  if (process.platform === 'win32') return 'Windows/Icon.ico'
  //if (nativeTheme.shouldUseDarkColors) return 'decentraland-tray.png';
  return 'iOS/Icon.png'
}

export const onExit = () => {
  main.isExitAllowed = true
  app.quit()
}

export const getKeyAndValue = (data: string): [string, string | undefined] => {
  if (data.includes('=')) {
    const keyAndValue = data.split('=')
    if (keyAndValue.length == 2) {
      const key = keyAndValue[0].toUpperCase()
      const value = keyAndValue[1]
      return [key, value]
    }
  }

  return [data, undefined]
}

export const isTrustedCertificate = (url: string, error: string): boolean => {
  const regex = new RegExp('^wss://localhost:76[67][0-9]/dcl$') // Accept from 7660 to 7679
  return url.match(url) != null && error === 'net::ERR_CERT_AUTHORITY_INVALID'
}

export const getAppBasePath = (): string => {
  var applicationFolderName = 'DecentralandLauncher'
  //dev
  if (process.env.RUN_ENV === 'development') return './'

  if (!process.platform || !['win32', 'darwin', 'linux'].includes(process.platform)) {
    console.error(`Unsupported OS: ${process.platform}`)
    return './'
  }

  if (process.platform === 'darwin') {
    return `/Users/${process.env.USER}/Library/Application\ Support/${applicationFolderName}/`
  } else if (process.platform === 'win32') {
    return `${process.env.LOCALAPPDATA}\\${applicationFolderName}\\`
  } else if (process.platform === 'linux') {
    return app.getPath('userData')
  }

  return './'
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
