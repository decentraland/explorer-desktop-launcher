export type LauncherConfig = {
  developerMode: boolean
  customUrl: string
  desktopBranch: string | undefined
  customDesktopVersion: string | undefined
  customParams: string
  port: number
  remoteVersion?: string
  previewMode: boolean
}

export type LauncherPaths = {
  baseUrl: string
  rendererPath: string
  versionPath: string
  executablePath: string
  artifactUrl: string
  remoteVersionUrl: string
}
