# Decentraland Explorer Desktop Launcher

A launcher to auto update the `unity-renderer` (https://github.com/decentraland/unity-renderer)

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

- [Windows](https://renderer-artifacts.decentraland.org/launcher-branch/main/Install%20Decentraland.exe)
- [Windows AppX](https://renderer-artifacts.decentraland.org/launcher-branch/main/Decentraland.appx)
- [Linux](https://renderer-artifacts.decentraland.org/launcher-branch/main/Decentraland.AppImage)
- [Mac](https://renderer-artifacts.decentraland.org/launcher-branch/main/Decentraland.dmg)

## Custom protocol

The custom protocol is using the prefix `dcl://`

We can add the following parameters to the custom protocol to change the behaviour of the Launcher.

- `DESKTOP-BRANCH=main`: Downloads the renderer of the specified branch
- `DESKTOP-VERSION=1.0.325-20220517164352.commit-e28a414`: Downloads the renderer of the specified version
- `DESKTOP-DEVELOPER-MODE`: Open the application in Developer Mode (with DevTools)
- `PREVIEW-MODE=url`: Opens in PREVIEW MODE the specified URL (confirmation needed)

If you add another parameter, it will be forwarded to the final URL.
For example, if we use `position=10,10&realm=thor` it will be similar as opening:

https://play.decentraland.org/?position=10,10&realm=thor

Example: `dcl://DESKTOP-BRANCH=main&position=10,10&realm=thor`

It will use the last desktop renderer version from the `main` branch, and you will enter position 10,10 in the realm `thor`.
