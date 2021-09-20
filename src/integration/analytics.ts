import { store } from '../state/redux'
import { getRequiredAnalyticsContext } from '../state/selectors'
import { errorToString } from '../utils/errorToString'
import { track } from '../utils/tracking'
import { DEBUG_ANALYTICS } from './queryParamsConfig'

let analyticsDisabled = false

enum AnalyticsAccount {
  PRD = '1plAT9a2wOOgbPCrTaU8rgGUMzgUTJtU',
  DEV = 'a4h4BC4dL1v7FhIQKKuPHEdZIiNRDVhc'
}

const authFlags = {
  isAuthenticated: false,
  isGuest: false,
  afterFatalError: false
}

// TODO fill with segment keys and integrate identity server
export function configureSegment() {
  // all decentraland.org domains are considered PRD
  if (globalThis.location.host.endsWith('.decentraland.org')) {
    return initialize(AnalyticsAccount.PRD)
  }

  return initialize(AnalyticsAccount.DEV)
}

function injectTrackingMetadata(payload: Record<string, any>): void {
  const qs = new URLSearchParams(globalThis.location.search || '')

  // inject realm
  if (qs.has('realm')) {
    payload.realm = qs.get('realm')
  }

  // inject position
  if (qs.has('position')) {
    payload.position = qs.get('position')
  }

  payload.dcl_is_authenticated = authFlags.isAuthenticated
  payload.dcl_is_guest = authFlags.isGuest
  payload.dcl_disabled_analytics = authFlags.afterFatalError
}

export function configureRollbar() {
  function rollbarTransformer(payload: Record<string, any>): void {
    injectTrackingMetadata(payload)
  }

  if ((window as any).Rollbar) {
    ;(window as any).Rollbar.configure({ transform: rollbarTransformer })
  }
}

// once this function is called, no more errors will be tracked neither reported to rollbar
export function disableAnalytics() {
  track('disable_analytics', {})

  authFlags.afterFatalError = true
  analyticsDisabled = true

  if ((window as any).Rollbar) {
    ;(window as any).Rollbar.configure({ enabled: false })
  }

  if (DEBUG_ANALYTICS) {
    console.info('explorer-website: DEBUG_ANALYTICS disableAnalytics')
  }
}

export function trackCriticalError(error: string | Error, payload?: Record<string, any>) {
  if (analyticsDisabled) return
  if (DEBUG_ANALYTICS) {
    console.info('explorer-website: DEBUG_ANALYTICS trackCriticalError ', error)
  }
  if (!(window as any).Rollbar) return

  if (typeof error === 'string') {
    ;(window as any).Rollbar.critical(errorToString(error), payload)
  } else if (error && error instanceof Error) {
    ;(window as any).Rollbar.critical(
      errorToString(error),
      Object.assign(error, payload, { fullErrorStack: error.toString() })
    )
  } else {
    ;(window as any).Rollbar.critical(errorToString(error), payload)
  }
}

export function identifyUser(address: string, isGuest: boolean, email?: string) {
  authFlags.isGuest = isGuest
  authFlags.isAuthenticated = !!address

  if (window.analytics) {
    const userTraits = {
      sessionId: getRequiredAnalyticsContext(store.getState()).sessionId,
      email
    }

    if (DEBUG_ANALYTICS) {
      console.info('explorer-website: DEBUG_ANALYTICS identifyUser', address, userTraits)
    }

    if (isGuest) {
      window.analytics.identify(userTraits)
    } else {
      window.analytics.identify(address, userTraits)
    }
  }
}

async function initialize(segmentKey: string): Promise<void> {
  if (window.analytics.load) {
    // loading client for the first time
    window.analytics.load(segmentKey)
    window.analytics.page()
    window.analytics.ready(() => {
      window.analytics.timeout(1000)
    })
  }
}

// please use src/utils "track" function.
export function internalTrackEvent(eventName: string, eventData: Record<string, any>) {
  if (!window.analytics || analyticsDisabled) {
    return
  }

  const data = { ...eventData, ...getRequiredAnalyticsContext(store.getState()) }

  injectTrackingMetadata(data)

  if (DEBUG_ANALYTICS) {
    console.info('explorer-website: DEBUG_ANALYTICS trackEvent', eventName, data)
  }

  window.analytics.track(eventName, data)
}
