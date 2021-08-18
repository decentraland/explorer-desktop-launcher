import logo from "./logo.svg"
import "./App.css"
import { useEffect, useState } from "react"
const { ipcRenderer } = window.require("electron")

enum DownloadState {
  Loading = 0,
  NewVersion,
  Downloading,
  ReadyToPlay,
}

let remoteVersion: string | null = null

const App = () => {
  const [progress, setProgress] = useState<number>(0)
  const [description, setDescription] = useState<string>("")
  const [downloadState, setDownloadState] = useState<DownloadState>(
    DownloadState.Loading
  )
  useEffect(() => {
    setDescription("Checking for updates")
    ipcRenderer.on(
      "getVersion",
      async (event: any, localVersion: string | null) => {
        const init: RequestInit = {
          method: "GET", // Method
          mode: "no-cors", // Options: no-cors, cors, same-origin
          credentials: "omit", // Options: include, same-origin, omit
        }

        const response = await fetch(
          "https://renderer-artifacts.decentraland.org/desktop/main/version.json",
          init
        )

        const body = await response.json()
        const version = body.version

        if (version === localVersion) {
          setDownloadState(DownloadState.ReadyToPlay)
          setDescription("Decentraland is up to date!")
        } else {
          remoteVersion = version
          setDescription("There are new updates.")
          setDownloadState(DownloadState.NewVersion)
        }

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
          setDescription("Decentraland is up to date!")
        })
      }
    )

    ipcRenderer.send("getVersion")
  }, [])

  const downloadArtifacts = () => {
    console.log("downloadArtifacts", remoteVersion)
    ipcRenderer.send("download", { remoteVersion })
  }

  const executeDecentraland = () => {
    ipcRenderer.send("executeProcess")
  }

  const clearCache = () => {
    ipcRenderer.send("clearCache")
    setDownloadState(DownloadState.NewVersion)
  }

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>{description}</p>
        <p>Progress: {progress}%</p>
        <button
          onClick={downloadArtifacts}
          disabled={downloadState !== DownloadState.NewVersion}
        >
          Download
        </button>
        <button
          onClick={executeDecentraland}
          disabled={downloadState !== DownloadState.ReadyToPlay}
        >
          Play
        </button>
        <button
          onClick={clearCache}
          disabled={downloadState === DownloadState.Loading}
        >
          Clear Cache
        </button>
      </header>
    </div>
  )
}

export default App
