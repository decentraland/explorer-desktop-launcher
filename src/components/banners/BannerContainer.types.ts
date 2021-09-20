import { BannerType } from '../../state/redux'

export interface BannerContainerProps {
  banner: BannerType | null
  onClose?: () => void
}