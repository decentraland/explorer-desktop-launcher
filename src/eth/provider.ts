import { connection, ProviderType, ConnectionResponse } from 'decentraland-connect'
import { WebSocketProvider } from 'eth-connect'
import { ChainId } from '@dcl/schemas'
import { IEthereumProvider } from '@dcl/kernel-interface'
import { defaultWebsiteErrorTracker } from '../utils/tracking'

export const chainIdRpc = new Map<number, string>([
  [1, 'wss://mainnet.infura.io/ws/v3/074a68d50a7c4e6cb46aec204a50cbf0'],
  [3, 'wss://ropsten.infura.io/ws/v3/074a68d50a7c4e6cb46aec204a50cbf0']
])

export async function getEthereumProvider(
  type: ProviderType | null,
  chainId: ChainId
): Promise<{ provider: IEthereumProvider; chainId: number }> {
  if (type === null) {
    const rpc = chainIdRpc.get(chainId)
    if (!rpc) throw new Error("Can't get RPC for chainId " + chainId)
    return {
      provider: new WebSocketProvider(rpc),
      chainId
    }
  }

  const result = await connection.connect(type, chainId)
  // console.log('11111111111 PERSONAL SIGGGGGGGGGN 11111111111')
  // console.log('PERSONAL SIGGGGGGGGGN 11111111111')

  return { provider: result.provider, chainId: result.chainId }
}

export async function restoreConnection(): Promise<ConnectionResponse | null> {
  try {
    return await connection.tryPreviousConnection()
  } catch (err) {
    return null
  }
}

export async function disconnect(): Promise<void> {
  try {
    return await connection.disconnect()
  } catch (err) {
    defaultWebsiteErrorTracker(err)
    return
  }
}
