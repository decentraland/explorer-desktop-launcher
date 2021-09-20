import React from 'react'

import './errors.css'
import errorImage from '../../images/errors/error-robotdown.png'

const defaultDetails: (string | JSX.Element)[] = [
  'If you have any ad blocking extensions,',
  'try turning them off for this site.',
  '',
  'Loading should not take any longer than 2-3 minutes.',
  'If you seem to be stuck, make sure hardware acceleration is on.',
  <a href="https://docs.decentraland.org/decentraland/hardware-acceleration/">LEARN MORE</a>
]

export const ErrorFatal = (props: { details?: typeof defaultDetails }) => {
  const details = props.details && props.details.length ? props.details : defaultDetails

  return (
    <div id="error-fatal" className="error-container">
      <div className="error-background" />
      <div className="errormessage">
        <div className="errortext col">
          <div className="error">Oops!</div>
          <div className="communicationslink">Something went wrong</div>
          <div className="givesomedetailof">
            {details.map(($, ix) => (
              <div key={ix}>{$}</div>
            ))}
          </div>
          <div className="cta">
            <button
              className="retry"
              onClick={() => {
                window.location.reload()
              }}
            >
              Reload
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
