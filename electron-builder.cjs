const { execSync } = require('child_process')

const config = {
  appId: 'decentraland.desktop.launcher',
  productName: 'Decentraland',
  extends: null,
  artifactName: 'Decentraland.${ext}',
  compression: 'maximum',
  files: ['dist/**/*', 'public/**/*', 'public/systray/iOS/**/*', 'public/systray/Windows/**/*'],
  protocols: [
    {
      name: 'Decentraland Desktop App',
      schemes: ['dcl']
    }
  ],
  directories: {
    buildResources: 'assets'
  },
  win: {
    publisherName: 'Decentraland Foundation',
    icon: 'public/app-icon.png',
    target: ['nsis'],
    verifyUpdateCodeSignature: false,
    signAndEditExecutable: true,
    signingHashAlgorithms: ['sha256'],
    rfc3161TimeStampServer: 'http://ts.ssl.com',
    timeStampServer: 'http://ts.ssl.com'
  },
  nsis: {
    oneClick: false,
    shortcutName: 'Decentraland',
    artifactName: 'Install Decentraland.${ext}',
    installerIcon: 'public/installer-icon.ico',
    allowToChangeInstallationDirectory: true,
    deleteAppDataOnUninstall: true,
    perMachine: true,
    include: 'electron/installer.nsh'
  },
  appx: {
    applicationId: 'com.decentraland.launcher',
    identityName: 'DecentralandFoundation.Decentraland',
    publisherDisplayName: 'Decentraland Foundation',
    publisher: 'CN=546D5DDE-76D5-4F9D-99D8-07C3235EC3A0'
  },
  linux: {
    icon: 'public/app-icon.png',
    target: ['AppImage']
  },
  appImage: {
    artifactName: 'Decentraland.${ext}'
  },
  mac: {
    icon: 'public/app-icon.png',
    target: ['dmg', 'zip'],
    hardenedRuntime: true,
    entitlements: 'entitlements.mac.plist',
    extendInfo: {
      NSMicrophoneUsageDescription: 'Need microphone access to use voice chat in the application'
    }
  },
  dmg: {
    icon: 'public/installer-icon.icns',
    artifactName: 'Decentraland.${ext}'
  },
  publish: {
    provider: 'github',
    owner: 'decentraland',
    repo: 'explorer-desktop-launcher',
    private: false
  }
}

// Sign Windows .exe
if (process.env.CODE_SIGN_SCRIPT_PATH) {
  config.win.sign = (configuration) => {
    console.log('Requested signing for ', configuration.path)

    // Only proceed if the installer .exe file is in the configuration path - skip signing everything else
    if (!configuration.path.endsWith('Install Decentraland.exe')) {
      console.log('This is not the installer .exe, skip signing')
      return true
    }

    const scriptPath = process.env.CODE_SIGN_SCRIPT_PATH

    try {
      // Execute the sign script synchronously
      process.env.INPUT_COMMAND = 'sign' // override the INPUT_COMMAND, it is already set in the "env" of the GitHub Action step, but for some reason it gets overwritten with 'npx electron-builder ...' so we must set it to 'sign'
      process.env.INPUT_FILE_PATH = configuration.path // set the file path to the installer .exe
      const env = {
        command: process.env.INPUT_COMMAND,
        username: process.env.INPUT_USERNAME,
        password: process.env.INPUT_PASSWORD,
        credential_id: process.env.INPUT_CREDENTIAL_ID,
        totp_secret: process.env.INPUT_TOTP_SECRET,
        file_path: process.env.INPUT_FILE_PATH,
        output_path: process.env.INPUT_OUTPUT_PATH,
        malware_block: process.env.INPUT_MALWARE_BLOCK,
        override: process.env.INPUT_OVERRIDE,
        clean_logs: process.env.INPUT_CLEAN_LOGS,
        environment_name: process.env.INPUT_ENVIRONMENT_NAME,
        jvm_max_memory: process.env.INPUT_JVM_MAX_MEMORY
      }
      console.log('env:', JSON.stringify(env, null, 2))
      const output = execSync(`node "${scriptPath}"`, {
        env: { ...process.env, ...env }
      }).toString()
      console.log(`Script output: ${output}`)
    } catch (error) {
      console.error(`Error executing script: ${error.message}`)
      if (error.stdout) {
        console.log(`Script stdout: ${error.stdout.toString()}`)
      }
      if (error.stderr) {
        console.error(`Script stderr: ${error.stderr.toString()}`)
      }
      return false
    }

    return true // Return true at the end of successful signing
  }

  config.win.signingHashAlgorithms = ['sha256']
}

module.exports = config
