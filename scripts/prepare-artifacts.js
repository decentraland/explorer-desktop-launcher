const fs = require('fs')
const dir = './output'
const ext = process.argv[2]
console.log('ext: ', ext)
if (!fs.existsSync(dir)) {
  console.log('creating', dir)
  fs.mkdirSync(dir)
}

function copyFileSync(src, dest, mode) {
  console.log('coping', src, 'to', dest)
  fs.copyFileSync(src, dest, mode)
}

if (ext === 'exe') {
  if (fs.existsSync(`dist/Install Decentraland.${ext}`)) {
    copyFileSync(`dist/Install Decentraland.${ext}`, `output/Install-Decentraland.${ext}`)
  }

  if (fs.existsSync(`dist/Decentraland.appx`)) {
    copyFileSync(`dist/Decentraland.appx`, `output/Decentraland.appx`)
  }
} else {
  copyFileSync(`dist/Decentraland.${ext}`, `output/Decentraland.${ext}`)
}

console.log('Done')
