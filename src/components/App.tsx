import React from 'react'
import { connect } from 'react-redux'
import ErrorContainer from './errors/ErrorContainer'
import LoginContainer from './auth/LoginContainer'
import { Audio } from './common/Audio'
import { StoreType } from '../state/redux'
import './App.css'

function mapStateToProps(state: StoreType): AppProps {
  return {
    rendererVisible: state.renderer.visible,
    error: !!state.error.error,
    sound: true // TODO: sound must be true after the first click
  }
}

export interface AppProps {
  rendererVisible: boolean
  error: boolean
  sound: boolean
}

const App: React.FC<AppProps> = (props) => {
  if (props.error) {
    return <ErrorContainer />
  }

  if (props.rendererVisible) {
    return <React.Fragment />
  }

  return (
    <div>
      {props.sound && <Audio track="/tone4.mp3" play={true} />}
      <LoginContainer />
    </div>
  )
}

export default connect(mapStateToProps)(App)
