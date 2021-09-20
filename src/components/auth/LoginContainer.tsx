import React from 'react'
import { connect } from 'react-redux'
import { connection } from 'decentraland-connect/dist/index'
import { ProviderType } from 'decentraland-connect/dist/types'
import { Navbar } from '../common/Navbar'
import { EthLogin } from './EthLogin'
import { Container } from '../common/Container'
import { BeginnersGuide } from './BeginnersGuide'
import { BigFooter } from '../common/BigFooter'
import './LoginContainer.css'
import { StoreType } from '../../state/redux'
import { LoginState } from '@dcl/kernel-interface'
import { authenticate } from '../../kernel-loader'
import BannerContainer from '../banners/BannerContainer'
import DownloadProgress from '../desktop/DownloadProgress'
import { disconnect } from '../../eth/provider'

const mapStateToProps = (state: StoreType): LoginContainerProps => {
  // test all connectors
  const enableProviders = new Set([ProviderType.INJECTED, ProviderType.FORTMATIC, ProviderType.WALLET_CONNECT])
  const availableProviders = connection.getAvailableProviders().filter((provider) => enableProviders.has(provider))
  return {
    stage: state.session.kernelState?.loginStatus,
    availableProviders,
    kernelReady: state.kernel.ready,
    rendererReady: state.renderer.ready
  }
}

const mapDispatchToProps = (dispatch: any) => ({
  onLogin: (providerType: ProviderType | null) => {
    authenticate(providerType)
  },
  onLogout: () => disconnect()
})

export interface LoginContainerProps {
  stage?: LoginState
  availableProviders: ProviderType[]
  kernelReady: boolean
  rendererReady: boolean
}

export interface LoginContainerDispathc {
  onLogin: (provider: ProviderType | null) => void
  onLogout: () => void
}

export const LoginContainer: React.FC<LoginContainerProps & LoginContainerDispathc> = (props) => {
  const loading =
    props.stage === LoginState.SIGNATURE_PENDING ||
    props.stage === LoginState.WAITING_PROFILE ||
    props.stage === LoginState.LOADING ||
    !props.kernelReady

  if (props.stage === LoginState.COMPLETED) {
    return <React.Fragment />
  }

  return (
    <React.Fragment>
      <div className={'LoginContainer  FullPage'}>
        <BannerContainer />
        {/* Nabvar */}
        <Navbar full={true} />
        <main>
          <Container className="eth-login-popup">
            <EthLogin availableProviders={props.availableProviders} onLogin={props.onLogin} onLogout={props.onLogout} signing={loading} />
            {process.env.REACT_APP_DESKTOP === 'true' && <DownloadProgress/> }
            {/* {props.stage === LoginState.CONNECT_ADVICE && <EthConnectAdvice onLogin={props.onLogin} />} */}
            {/* {props.stage === LoginState.SIGN_ADVICE && <EthSignAdvice />} */}
          </Container>
        </main>
        {process.env.REACT_APP_DESKTOP !== 'true' && <BeginnersGuide /> }
        {process.env.REACT_APP_DESKTOP !== 'true' && <BigFooter /> }
      </div>
    </React.Fragment>
  )
}
export default connect(mapStateToProps, mapDispatchToProps)(LoginContainer)
