import React from 'react'
import { BannerContainerProps } from './BannerContainer.types'

import './banners.css'

export const BannerNotSupported: React.FC<Pick<BannerContainerProps, 'onClose'>> = (props) => (
  <div id="banner-notsupported" className="banner-container">
    <div className="banner-close-button" onClick={props.onClose} />
    <div className="banner-text">
      Your browser is not among the recommended choices for an optimal experience in Decentraland.
      We suggest you use one based on
        {' '}
        <a href="https://www.google.com/chrome/" rel="noreferrer noopener" target="_blank">Chromium</a>
        {' or '}
        <a href="https://www.mozilla.org/en-US/firefox/new/" rel="noreferrer noopener" target="_blank">Firefox</a>.
    </div>
  </div>
)
