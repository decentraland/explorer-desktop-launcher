import logo from './logo.svg';
import './App.css';
import { useEffect, useState } from 'react';
const { ipcRenderer } = window.require('electron');

enum DownloadState {
  Loading = 0,
  NewVersion,
  Downloading,
  ReadyToPlay
}

let remoteVersion : string | null = null

const App = () => {
  const [progress, setProgress] = useState<number>(0)
  const [description, setDescription] = useState<string>("")
  const [downloadState, setDownloadState] = useState<DownloadState>(DownloadState.Loading)
  useEffect(() => {
    setDescription("Checking for updates")
    ipcRenderer.on("getVersion", (event: any, localVersion: string | null) => {
      fetch('https://renderer-artifacts.decentraland.org/desktop/main/version.json').then(async (response) => {
        const body = await response.json()
        const version = body.version

        if (version === localVersion) {
          setDownloadState(DownloadState.ReadyToPlay)
          setDescription("Your game is up to date!")
        } else {
          remoteVersion = version
          setDescription("There are new updates.")
          setDownloadState(DownloadState.NewVersion)
          ipcRenderer.on("downloadStart", (event: any) => {
            setProgress(0)
            setDownloadState(DownloadState.Downloading)
            setDescription("Downloading")
          })
          ipcRenderer.on("downloadProgress", (event: any, percent: number) => {
            setProgress(Math.round(percent))
          })
          ipcRenderer.on("downloadCompleted", (event: any) => {
            setProgress(100)
            setDownloadState(DownloadState.ReadyToPlay)
            setDescription("Your game is up to date!")
          })
        }
      })
    })

    ipcRenderer.send('getVersion')
  }, [])

  const downloadArtifacts = () => {
    console.log("downloadArtifacts", remoteVersion)
    ipcRenderer.send('download', { remoteVersion })
  }

  const playGame = () => {
    ipcRenderer.send('executeProcess')
  }

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          {description}
        </p>
        <p>
          Progress: {progress}%
        </p>
        <button onClick={downloadArtifacts} disabled={downloadState !== DownloadState.NewVersion}>
          Download
        </button>
        <button onClick={playGame} disabled={downloadState !== DownloadState.ReadyToPlay}>
          Play
        </button>
      </header>
    </div>
  );
}

export default App;
