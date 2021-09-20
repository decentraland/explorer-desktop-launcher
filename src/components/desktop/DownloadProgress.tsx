import React from 'react'
import { connect } from 'react-redux'
import { DownloadCurrentState, StoreType } from '../../state/redux'

function mapStateToProps(state: StoreType): DownloaderProps {
    return {
      progress: state.download.progress,
      currentState: state.download.currentState
    }
}

export interface DownloaderProps {
  currentState: DownloadCurrentState
  progress: number
}

const DownloadProgress: React.FC<DownloaderProps> = (props) => {
    return (
      <div>
        {props.currentState === DownloadCurrentState.DOWNLOADING && <p>{Math.round(props.progress)}%</p>}
        {props.currentState === DownloadCurrentState.READY && <p>Ready!</p>}
      </div>
    )    
}

export default connect(mapStateToProps)(DownloadProgress)