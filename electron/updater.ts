import * as electronDl from 'electron-dl';
import {unzip} from './decompress'
import { BrowserWindow, ipcMain } from 'electron';
import * as fs from 'fs';

const getCurrentVersion = (versionPath : string) : string | null => {
    let version : string | null = null
    if (fs.existsSync(versionPath)) {
      const rawData = fs.readFileSync(versionPath);
      const body = JSON.parse(rawData.toString());
      version = body.version;
    }

    return version
}

const registerVersionEvent = (versionPath : string) => {
    const version = getCurrentVersion(versionPath)

    ipcMain.on('getVersion', (event) => {
        event.sender.send("getVersion", version)
    })
}

const registerExecuteProcessEvent = (executablePath : string) => {
    var child = require('child_process').execFile;

    ipcMain.on('executeProcess', (event) => {
      child(executablePath, (err : any, data : any) => {
        if(err) {
           console.error(err);
           return;
        }
     
        console.log(data.toString());
      });
    })
}

const registerDownloadEvent = (rendererPath : string, versionPath : string, artifactUrl : string) => {
    //electronDl();
    ipcMain.on('download', async (event, {remoteVersion}) => {
        fs.rmdirSync(rendererPath, { recursive: true });
        const win = BrowserWindow.getFocusedWindow() as BrowserWindow
        console.log("artifactUrl: ", artifactUrl)
        const res = await electronDl.download(win, artifactUrl, {
          directory: rendererPath,
          onStarted: (item) => {
            console.log("onStarted:", item)
            event.sender.send("downloadStart")
          },
          onProgress: (progress) => {
            console.log("onProgress:", progress)
            event.sender.send("downloadProgress", progress.percent * 100)
          },
          onCompleted: (file) => {
            console.log("onCompleted:", file)
            unzip(file.path, rendererPath, () => {
              fs.rmSync(file.path)
      
              const versionData = { 
                version: remoteVersion
              };
             
              fs.writeFileSync(versionPath, JSON.stringify(versionData));
      
              event.sender.send("downloadCompleted")
            })
          }
        });
        console.log("Res: ", res)
        console.log("Done!")
    });
}

export const registerUpdaterEvents = (rendererPath : string, versionPath : string, executablePath : string, artifactUrl : string) => {
    // Get version
    registerVersionEvent(versionPath)

    // Register event to execute process
    registerExecuteProcessEvent(executablePath + getOSExtension())

    // Register event to download
    registerDownloadEvent(rendererPath, versionPath, artifactUrl)

    // Register clear cache
    ipcMain.on('clearCache', async (event) => {
      fs.rmdirSync(rendererPath, { recursive: true });
    })
}

export const getOSName = () : string | null => {
    switch(process.platform) {
        case "darwin":
            return "mac"
        case "linux":
            return "linux"
        case "win32":
            return "windows"
        default:
            return null
    }
}

export const getOSExtension = () : string | null => {
  switch(process.platform) {
      case "darwin":
          return ".dmg"
      case "linux":
          return ""
      case "win32":
          return ".exe"
      default:
          return null
  }
}