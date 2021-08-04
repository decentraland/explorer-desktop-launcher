import logo from './logo.svg';
import './App.css';
import { useEffect, useState } from 'react';
const { ipcRenderer } = window.require('electron');

enum DownloadState {
  None = 0,
  Downloading,
  ReadyToPlay
}

const App = () => {
  const [progress, setProgress] = useState<number>(0)
  const [downloadState, setDownloadState] = useState<DownloadState>(DownloadState.None)
  useEffect(() => {
    ipcRenderer.on("downloadStart", (event: any) => {
      setProgress(0)
      setDownloadState(DownloadState.Downloading)
    })
    ipcRenderer.on("downloadProgress", (event: any, percent: number) => {
      setProgress(Math.round(percent))
    })
    ipcRenderer.on("downloadCompleted", (event: any) => {
      setProgress(100)
      setDownloadState(DownloadState.ReadyToPlay)
    })
  }, [])

  const downloadArtifacts = () => {
    console.log("downloadArtifacts")
    ipcRenderer.send('download-button', { url: "https://renderer-artifacts.decentraland.org/desktop/main/unity-renderer-linux.zip" })
  }

  const playGame = () => {
    ipcRenderer.send('execute-process')
  }

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Progress: {progress}%
        </p>
        <button onClick={downloadArtifacts} disabled={downloadState != DownloadState.None}>
          Download
        </button>
        <button onClick={playGame} disabled={downloadState != DownloadState.ReadyToPlay}>
          Play
        </button>
      </header>
    </div>
  );
}

export default App;
