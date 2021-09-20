import future from 'fp-future'
import { KernelOptions, KernelResult, IDecentralandKernel } from '@dcl/kernel-interface'

export async function injectKernel(options: KernelOptions): Promise<KernelResult> {
  const kernelUrl = new URL(`index.js?cors`, options.kernelOptions.baseUrl).toString()

  await injectScript(kernelUrl)

  console.log('Kernel: ', kernelUrl)

  const DecentralandKernel: IDecentralandKernel = (globalThis as any).DecentralandKernel

  if (!DecentralandKernel) throw new Error('DecentralandKernel could not be loaded')

  return await DecentralandKernel.initKernel(options)
}

async function injectScript(url: string) {
  const theFuture = future<Event>()
  const theScript = document.createElement('script')
  const persistMessage =
    'If this error persists, please try emptying the cache of your browser and reloading this page.'
  theScript.src = url
  theScript.async = true
  theScript.type = 'application/javascript'
  theScript.crossOrigin = 'anonymous'
  theScript.addEventListener('load', theFuture.resolve)
  theScript.addEventListener('error', (e) =>
    theFuture.reject(e.error || new Error(`The script ${url} failed to load.\n${persistMessage}`))
  )
  theScript.addEventListener('abort', () =>
    theFuture.reject(
      new Error(
        `Script loading aborted: ${url}.\nThis may be caused because you manually stopped the loading or because of a network error.\n${persistMessage}`
      )
    )
  )
  document.body.appendChild(theScript)
  return theFuture
}
