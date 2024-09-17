import { BrowserWindow, Tray, Menu } from 'electron'
import { LauncherConfig } from './types'

const defaultConfig: LauncherConfig = {
  developerMode: false,
  customUrl: '',
  desktopBranch: undefined,
  customDesktopVersion: undefined,
  customParams: '',
  port: 7666,
  previewMode: false
}

class MainApp {
  defaultConfig: LauncherConfig = defaultConfig

  isDefaultWeb = false
  isRendererOpen = false
  isExitAllowed = false
  tray: Tray | null = null
  contextMenu: Menu | undefined = undefined
  openingUrl: string | undefined
  config: LauncherConfig = defaultConfig
  win: BrowserWindow | undefined
}

export const main: MainApp = new MainApp()
