import React from 'react'
import { connect } from 'react-redux'
import { setKernelError } from '../../state/actions'
import { disconnect } from '../../eth/provider'
import { ErrorState, ErrorType, StoreType } from '../../state/redux'
import { ErrorAvatarLoading } from './ErrorAvatarLoading'
import { ErrorComms } from './ErrorComms'
import { ErrorFatal } from './ErrorFatal'
import { ErrorMetamaskLocked } from './ErrorMetamaskLocked'
import { ErrorNetworkMismatch } from './ErrorNetworkMismatch'
import { ErrorNewLogin } from './ErrorNewLogin'
import { ErrorNoMobile } from './ErrorNoMobile'
import { ErrorNotSupported } from './ErrorNotSupported'

const mapStateToProps = (state: StoreType): Pick<ErrorContainerProps, 'error'> => {
  return {
    error: state.error.error || null
  }
}

const mapDispatchToProps = (dispatch: (a: any) => void, state: StoreType): Pick<ErrorContainerProps, 'closeError'> => {
  return {
    closeError: () => dispatch(setKernelError(null)),
    onLogout: () => disconnect()
  }
}

export interface ErrorContainerProps {
  error: ErrorState['error']
  onLogout(): void
  closeError(): void
}

export const ErrorContainer: React.FC<ErrorContainerProps> = (props) => {
  if (!props.error) return <React.Fragment></React.Fragment>

  if (props.error.type === ErrorType.COMMS) return <ErrorComms />
  if (props.error.type === ErrorType.METAMASK_LOCKED)
    return <ErrorMetamaskLocked details={props.error.details} closeError={props.closeError} />
  if (props.error.type === ErrorType.NEW_LOGIN) return <ErrorNewLogin />
  if (props.error.type === ErrorType.NOT_MOBILE) return <ErrorNoMobile />
  if (props.error.type === ErrorType.NOT_SUPPORTED) return <ErrorNotSupported />
  if (props.error.type === ErrorType.NET_MISMATCH)
    return <ErrorNetworkMismatch details={props.error.details} onLogout={props.onLogout} />
  if (props.error.type === ErrorType.AVATAR_ERROR) return <ErrorAvatarLoading />

  return (
    <React.Fragment>
      <ErrorFatal details={[props.error.details || 'An error happened while loading Decentraland.']} />
    </React.Fragment>
  )
}

export default connect(mapStateToProps, mapDispatchToProps)(ErrorContainer)
