import logo from './logo.svg'
import './App.css'
import { useEffect, useState } from 'react'
import VersionSelector from './VersionSelector'
const { ipcRenderer } = window.require('electron')

enum DownloadState {
  Loading = 0,
  SelectVersion,
  NewVersion,
  Downloading,
  ReadyToPlay,
  Error
}

let remoteVersion: string | null = null

const App = () => {
  const [progress, setProgress] = useState<number>(0)
  const [description, setDescription] = useState<string>('')
  const [state, setDownloadState] = useState<DownloadState>(DownloadState.Loading)

  useEffect(() => {
    setDescription('Checking for updates')

    ipcRenderer.on('getVersion', async (event: any, localVersion: string | null, remoteVersionUrl: string) => {
      try {
        const init: RequestInit = {
          method: 'GET', // Method
          mode: 'no-cors', // Options: no-cors, cors, same-origin
          credentials: 'omit' // Options: include, same-origin, omit
        }

        const response = await fetch(remoteVersionUrl, init)

        const body = await response.json()
        const version = body.version

        const regex = /[0-9a-f]{40}/g
        const validVersion = version.match(regex)

        console.log('version: ', version)
        console.log('localVersion: ', localVersion)

        if (!validVersion) {
          throw Error('Invalid remote version')
        } else if (version === localVersion) {
          setDownloadState(DownloadState.ReadyToPlay)
          setDescription('Decentraland is up to date!')
        } else {
          remoteVersion = version
          setDescription('There are new updates.')
          setDownloadState(DownloadState.NewVersion)
        }

        ipcRenderer.on('downloadStart', (event: any) => {
          setProgress(0)
          setDownloadState(DownloadState.Downloading)
          setDescription('Downloading')
        })
        ipcRenderer.on('downloadProgress', (event: any, percent: number) => {
          setProgress(Math.round(percent))
        })
        ipcRenderer.on('downloadCompleted', (event: any) => {
          setProgress(100)
          setDownloadState(DownloadState.ReadyToPlay)
          setDescription('Decentraland is up to date!')
        })
      } catch (e) {
        setDownloadState(DownloadState.Error)
        setDescription('Error: Invalid remote version')
      }
    })

    ipcRenderer.on('init', (event: any, developerMode: boolean) => {
      if (developerMode) {
        setDownloadState(DownloadState.SelectVersion)
      } else {
        ipcRenderer.send('getVersion')
      }
    })

    ipcRenderer.send('rendererReady')
  }, [])

  const downloadArtifacts = () => {
    console.log('downloadArtifacts', remoteVersion)
    ipcRenderer.send('download', { remoteVersion })
  }

  const executeDecentraland = () => {
    ipcRenderer.send('executeProcess')
  }

  const clearCache = () => {
    ipcRenderer.send('clearCache')
    setDownloadState(DownloadState.Loading)
    ipcRenderer.send('rendererReady')
  }

  const onSelectBranches = (kernelBranch: string, rendererBranch: string) => {
    console.log(`kernelBranch: ${kernelBranch}`)
    console.log(`rendererBranch: ${rendererBranch}`)
    setDownloadState(DownloadState.Loading)
    ipcRenderer.send('getVersion', kernelBranch, rendererBranch)
  }

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>{description}</p>
        {state === DownloadState.SelectVersion && <VersionSelector onSelectBranches={onSelectBranches} />}
        {state !== DownloadState.Error && (
          <div>
            <p>Progress: {progress}%</p>
            <button onClick={downloadArtifacts} disabled={state !== DownloadState.NewVersion}>
              Download
            </button>
            <button onClick={executeDecentraland} disabled={state !== DownloadState.ReadyToPlay}>
              Play
            </button>
            <button
              onClick={clearCache}
              disabled={state === DownloadState.Loading || state === DownloadState.Downloading}
            >
              Clear Cache
            </button>
          </div>
        )}
      </header>
    </div>
  )
}

export default App
