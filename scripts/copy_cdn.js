// this file creates the /build/cdn folder containing the renderer and kernel

const path = require('path')
const fs = require('fs')
const fse = require('fs-extra')
const dotenv = require('dotenv')
const { cdnFolder } = require('./utils')

dotenv.config({ path: path.resolve(__dirname, '../.env') })

function distFolderRelative(folder) {
  return path.resolve(__dirname, '../build' + folder)
}

function copyPackage(packageName, envValueToCheck) {
  const packageJsonPath = require.resolve(packageName + '/package.json')
  const packageFolder = path.dirname(packageJsonPath)
  const { name, version } = JSON.parse(fs.readFileSync(packageJsonPath).toString())
  const resolvedCdnFolder = cdnFolder(name, version)
  const destFolder = distFolderRelative(resolvedCdnFolder)

  if (envValueToCheck.replace(/\/$/, '') !== resolvedCdnFolder.replace(/\/$/, '')) {
    console.error(
      'ERROR: The values from the .env file does not match the values from the installed versions for the package ' +
        packageName
    )
    console.log(envValueToCheck + ' != ' + resolvedCdnFolder)
    console.log('CALL TO ACTION: Please run `npm run postinstall` and `npm run build`')
    process.exit(1)
  }

  console.log(`Copying package ${name}:\n  from: ${packageFolder}\n    to: ${destFolder}`)
  fse.copySync(packageFolder, destFolder)
  console.log('\n')
}

copyPackage('@dcl/unity-renderer', process.env.REACT_APP_RENDERER_BASE_URL)
copyPackage('@dcl/kernel', process.env.REACT_APP_KERNEL_BASE_URL)

console.log('copy-cdn SUCCEED')
