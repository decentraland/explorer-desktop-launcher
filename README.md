# Decentraland Explorer Desktop Launcher

A launcher to auto update the `explorer-desktop` (https://github.com/decentraland/explorer-desktop)

## Available Scripts

### `npm run start`

Runs the Electron app in the development mode.

The Electron app will reload if you make edits in the `electron` directory.<br>
You will also see any lint errors in the console.

### `npm run build`

Builds the Electron app package for production to the `dist` folder.

Your Electron app is ready to be distributed!

### `npm run publish`

Build and publish

## Project directory structure

```bash
my-app/
├── package.json
│
## render process
├── tsconfig.json
├── public/
│
## main process
├── electron/
│   ├── main.ts
│   └── tsconfig.json
│
## build output
├── build/
│   ├── index.html
│   ├── static/
│   │   ├── css/
│   │   └── js/
│   │
│   └── electron/
│      └── main.js
│
## distribution packges
└── dist/
    ├── mac/
    │   └── my-app.app
    └── my-app-0.1.0.dmg
```

## Artifacts

- Windows: https://renderer-artifacts.decentraland.org/launcher-branch/main/decentraland-launcher.exe
- Linux: https://renderer-artifacts.decentraland.org/launcher-branch/main/decentraland-launcher.AppImage
- Mac: https://renderer-artifacts.decentraland.org/launcher-branch/main/decentraland-launcher.dmg

The format is the following: https://renderer-artifacts.decentraland.org/launcher-branch/{branch}/decentraland-launcher.{extension}