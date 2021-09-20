import { TrackingEvents } from '../trackingEvents'
import { internalTrackEvent, trackCriticalError } from '../integration/analytics'
import { errorToString } from './errorToString'
import { callOnce } from './callOnce'
import { isRecommendedBrowser } from '../integration/browser'

const ethereum = window.ethereum as any

const getWalletName = callOnce(() => {
  if (!ethereum) {
    return 'none'
  } else if (ethereum?.isMetaMask) {
    return 'metamask'
  } else if (ethereum?.isDapper) {
    return 'dapper'
  } else if (ethereum?.isCucumber) {
    return 'cucumber'
  } else if (ethereum?.isTrust) {
    return 'trust'
  } else if (ethereum?.isToshi) {
    return 'coinbase'
  } else if (ethereum?.isGoWallet) {
    return 'goWallet'
  } else if (ethereum?.isAlphaWallet) {
    return 'alphaWallet'
  } else if (ethereum?.isStatus) {
    return 'status'
  } else {
    return 'other'
  }
})

const getWalletProps = callOnce(() => {
  return Object.keys(ethereum || {})
    .filter((prop) => prop.startsWith('is') && typeof ethereum[prop] === 'boolean')
    .join(',')
})

/**
 * The only function used by this react app to track its own events.
 * Please do not use internalTrackEvent directly, it is meant to be used by kernel
 * and this function adds relevant information and proper types.
 */
export function track<E extends keyof TrackingEvents>(event: E, properties?: TrackingEvents[E]) {
  const wallet = getWalletName()
  const walletProps = getWalletProps()
  const recommendedBrowser = isRecommendedBrowser()
  internalTrackEvent(event, { wallet, walletProps, recommendedBrowser, ...properties })
}


/**
 * Default "catch" for promises and to print errors in the console.
 */
export function defaultWebsiteErrorTracker(error: any) {
  console.error(error)
  trackCriticalError(error, { context: 'explorer-website' })
  track('explorer_website_error', {
    // this string concatenation exists on purpose, it is a safe way to do (error).toString in case (error) is nullish
    error: errorToString(error)
  })
}
