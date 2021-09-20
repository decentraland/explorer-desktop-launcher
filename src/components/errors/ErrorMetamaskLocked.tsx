import React from 'react'

import './errors.css'
import errorImage from '../../images/errors/robotsmiling.png'

export interface ErrorNetworkMismatchProps {
  details: string | null
  closeError(): void
}

export const ErrorMetamaskLocked: React.FC<ErrorNetworkMismatchProps> = (props: ErrorNetworkMismatchProps) => {
  return (
    <div id="error-networkmismatch" className="error-container">
      <div className="error-background" />
      <div className="errormessage">
        <div className="errortext col">
          <div className="communicationslink">Before we continue</div>
          {props.details && <div className="givesomedetailof">{props.details}</div>}
          <div className="cta">
            <button className="retry" onClick={props.closeError}>
              Retry
            </button>
          </div>
        </div>
        <div className="errorimage col">
          <div className="imagewrapper">
            <img alt="" className="error-image" src={errorImage} />
          </div>
        </div>
      </div>
    </div>
  )
}
