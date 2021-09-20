import { detect } from "detect-browser"
import { setBanner } from "../state/actions"
import { BannerType, store } from "../state/redux"
import { callOnce } from "../utils/callOnce"

export const initializeBrowserRecommendation = callOnce(() => {
  if (!isRecommendedBrowser()) {
    store.dispatch(setBanner(BannerType.NOT_RECOMMENDED))
  }
})

export const isRecommendedBrowser = callOnce(() => {
  const detected = detect(navigator.userAgent)

  if (!detected) {
    return false
  }

  switch (detected.name) {
    case 'chrome':
    case 'chromium-webview':
    case 'edge-chromium':
    case 'firefox':
      return true

    default:
      return false
  }
})
