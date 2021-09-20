import { action } from 'typesafe-actions'
import {
  IEthereumProvider,
  KernelAccountState,
  KernelError,
  KernelLoadingProgress,
  KernelResult
} from '@dcl/kernel-interface'
import { BannerType, store } from './redux'

export const KERNEL_AUTHENTICATE = '[Authenticate]'
export const SET_KERNEL_ACCOUNT_STATE = 'Set kernel account state'
export const SET_KERNEL_ERROR = 'Set kernel error'
export const SET_KERNEL_LOADED = 'Set kernel loaded'
export const SET_RENDERER_LOADING = 'Set renderer loading'
export const SET_RENDERER_VISIBLE = 'Set renderer visible'
export const SET_BANNER = 'Set banenr'

export const SET_DOWNLOAD_PROGRESS = '[DownloadProgress]'
export const SET_DOWNLOAD_READY = '[DownloadReady]'
export const SET_DOWNLOAD_NEW_VERSION = '[DownloadNewVersion]'

export const setKernelAccountState = (accountState: KernelAccountState) =>
  action(SET_KERNEL_ACCOUNT_STATE, accountState)
export const setKernelError = (error: KernelError | null) => action(SET_KERNEL_ERROR, error)
export const setKernelLoaded = (kernel: KernelResult) => action(SET_KERNEL_LOADED, kernel)
export const setRendererLoading = (progressEvent: KernelLoadingProgress) => action(SET_RENDERER_LOADING, progressEvent)
export const setRendererVisible = (visible: boolean) => action(SET_RENDERER_VISIBLE, { visible })
export const setBanner = (banner: BannerType | null) => action(SET_BANNER, { banner })

export const setDownloadProgress = (progress: number) => action(SET_DOWNLOAD_PROGRESS, { progress })
export const setDownloadReady = () => action(SET_DOWNLOAD_READY, { })
export const setDownloadNewVersion = () => action(SET_DOWNLOAD_NEW_VERSION, { })

export const authenticate = (provider: IEthereumProvider, isGuest: boolean) =>
  action(KERNEL_AUTHENTICATE, { provider, isGuest })

if (process.env.REACT_APP_DESKTOP === 'true') {
  const { ipcRenderer } = window.require('electron')
  ipcRenderer.on('downloadState', (event: any, payload: any) => {
    console.log('downloadState', payload)
    switch(payload.type) {
      case 'ERROR':
        store.dispatch(
          setKernelError({
            error: new Error(
              `Invalid remote version`
            )
          })
        )
        break;
      case 'NEW_VERSION':
        store.dispatch(
          setDownloadNewVersion()
        )
        event.sender.send('download')
        break;
      case 'READY':
        store.dispatch(
          setDownloadReady()
        )
        break;
      case 'PROGRESS':
        store.dispatch(
          setDownloadProgress(payload.progress)
        )
        break;
    }
  })
  ipcRenderer.send('checkVersion')
}