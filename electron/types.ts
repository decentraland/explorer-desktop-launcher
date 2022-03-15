type LauncherConfig = {
  developerMode: boolean,
  customUrl: string,
  desktopBranch: string,
  customParams: string,
  port: number,
  defaultParams: string,
  remoteVersion?: string,
  previewMode: boolean
}

type LauncherPaths = {
  baseUrl: string,
  rendererPath: string,
  versionPath: string,
  executablePath: string,
  artifactUrl: string,
  remoteVersionUrl: string
}