import { app } from 'electron'
import { main } from './main'

export const checkAmpersand = (origText: string) => {
  const url = new URL(origText)
  let result = url.href
  const lastChar = result.substring(result.length - 1)

  if (lastChar !== '&' && lastChar !== '?') {
    if (result.indexOf('?') > 0) {
      result += '&'
    } else {
      result += '?'
    }
  }

  return result
}

export const getAppTitle = (): string => {
  let title = 'Decentraland BETA'

  if (main.config.desktopBranch !== main.defaultConfig.desktopBranch)
    title += ` desktop-branch=${main.config.desktopBranch}`

  if (main.config.customParams !== main.defaultConfig.customParams) title += ` params=${main.config.customParams}`

  return title
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
