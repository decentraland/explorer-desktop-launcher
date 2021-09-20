import React from 'react'
import { connect } from 'react-redux'
import { setBanner } from '../../state/actions'
import { BannerType, StoreType } from '../../state/redux'
import { BannerContainerProps } from './BannerContainer.types'
import { BannerNotSupported } from './BannerNotSupported'

const mapStateToProps = (state: StoreType): Pick<BannerContainerProps, 'banner'> => {
  return {
    banner: state.banner.banner
  }
}

const mapDispatchToProps = (dispatch: (a: any) => void, state: StoreType): Pick<BannerContainerProps, 'onClose'> => {
  return {
    onClose: () => dispatch(setBanner(null))
  }
}

export const BannerContainer: React.FC<BannerContainerProps> = (props) => {
  switch (props.banner) {
    case BannerType.NOT_RECOMMENDED:
      return <BannerNotSupported onClose={props.onClose}/>
    default:
      return null
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(BannerContainer)
