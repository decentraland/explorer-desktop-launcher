import { AnyAction } from 'redux'
import { KernelAccountState, KernelResult, KernelError, LoginState } from '@dcl/kernel-interface'
import {
  SET_BANNER,
  SET_DOWNLOAD_PROGRESS,
  SET_DOWNLOAD_NEW_VERSION,
  SET_DOWNLOAD_READY,
  SET_KERNEL_ACCOUNT_STATE,
  SET_KERNEL_ERROR,
  SET_KERNEL_LOADED,
  SET_RENDERER_LOADING,
  SET_RENDERER_VISIBLE
} from './actions'
import { KernelState, SessionState, RendererState, ErrorState, BannerState, DownloadState, DownloadCurrentState } from './redux'
import { v4 } from 'uuid'
import { errorToString } from '../utils/errorToString'

const defaultSession: SessionState = {
  sessionId: v4(),
  kernelState: null
}

export function kernelReducer(state: KernelState | undefined, action: AnyAction): KernelState {
  if (action.type === SET_KERNEL_LOADED) {
    console.log('kernelReducer: ', state)
    return { ...state, ready: true, kernel: action.payload as KernelResult }
  }
  return (
    state || {
      ready: false,
      kernel: null
    }
  )
}

export function sessionReducer(state: SessionState | undefined, action: AnyAction): SessionState {
  console.log('sessionReducer: ', state, action)
  if (!state) return defaultSession

  if (action.type === SET_KERNEL_ACCOUNT_STATE) {
    return { ...state, kernelState: action.payload }
  }

  return state
}

export function rendererReducer(state: RendererState | undefined, action: AnyAction): RendererState {
  if (state && action.type === SET_RENDERER_VISIBLE) {
    console.log('rendererReducer: ', state)
    return { ...state, visible: action.payload.visible }
  } else if (state && action.type === SET_RENDERER_LOADING) {
    console.log('rendererReducer: ', state)
    return { ...state, loading: action.payload }
  }
  return (
    state || {
      ready: false,
      version: 'latest',
      visible: false,
      loading: null
    }
  )
}

export function errorReducer(state: ErrorState | undefined, action: AnyAction): ErrorState {
  if (action.type === SET_KERNEL_ERROR) {
    const payload: KernelError = action.payload

    if (!payload) {
      return { error: null }
    }

    return {
      error: {
        details: errorToString(payload.error),
        type: payload.code as any
      }
    }
  }

  return state || { error: null }
}

export function bannerReducer(state: BannerState | undefined, action: AnyAction): BannerState {
  if (action.type === SET_BANNER) {
    return { banner: action.payload.banner }
  }

  return state || { banner: null }
}

const CHANGE_LOGIN_STAGE = '[LOGIN_STAGE] change login stage' // TODO: Importar de kernel

export function downloadReducer(state: DownloadState | undefined, action: AnyAction): DownloadState {
  console.log('downloadReducer: ', state, action)

  const defaultDownload: DownloadState = {
    progress: 0,
    currentState: DownloadCurrentState.NONE,
    authCompleted: false
  }

  state = state || defaultDownload

  if (action.type === SET_DOWNLOAD_PROGRESS) {
    state = { ...state, progress: action.payload.progress, currentState: DownloadCurrentState.DOWNLOADING }
  } else if (action.type === SET_DOWNLOAD_READY) {
    state = { ...state, progress: action.payload.progress, currentState: DownloadCurrentState.READY }
  } else if (action.type === SET_DOWNLOAD_NEW_VERSION) {
    state = { ...state, progress: action.payload.progress, currentState: DownloadCurrentState.NEW_VERSION }
  }

  if (action.type === SET_KERNEL_ACCOUNT_STATE) {
    if (action.payload.loginStatus === LoginState.WAITING_RENDERER) {
      state = { ...state, authCompleted: true }
      console.log('LoginState.COMPLETED')
    }
  }

  console.log('downloadReducer State: ', state)

  if (state.authCompleted && state.currentState == DownloadCurrentState.READY) {
    const { ipcRenderer } = window.require('electron')
    ipcRenderer.send('executeProcess')
    state = { ...state, currentState: DownloadCurrentState.EXECUTED }
    console.log('READY!!!')
  }

  return state
}