import { IpcRendererEvent, contextBridge, ipcRenderer } from "electron";

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  "electron",
  {
    ipcRenderer: {
      send(channel: string, ...args: any[]) {
        ipcRenderer.send(channel, ...args)
      },
      on(channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) {
        ipcRenderer.on(channel, listener)
        return this
      }
    }
  }
);