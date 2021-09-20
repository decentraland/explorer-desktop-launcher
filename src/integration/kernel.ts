import { startKernel } from "../kernel-loader"
import { callOnce } from "../utils/callOnce"

export const initializeKernel = callOnce(() => {
  startKernel()

  const initial = document.getElementById('root-loading')
  if (initial) {
    initial.style.opacity = '0'
    setTimeout(() => {
      initial.remove()
    }, 300)
  }
})
