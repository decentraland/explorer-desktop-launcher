import { SessionTraits } from '../trackingEvents'
import { StoreType } from './redux'

// This function is used for every rollbar and segment events.
export function getRequiredAnalyticsContext(state: StoreType): SessionTraits {
  return {
    sessionId: state.session.sessionId
  }
}
