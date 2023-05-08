const fs = require('fs')
const dir = './output'
const ext = process.argv[2]
console.log('ext: ', ext)
if (!fs.existsSync(dir)) {
  console.log('creating', dir)
  fs.mkdirSync(dir)
}

function copyFileSync(src, dest, mode) {
  if (fs.existsSync(src)) {
    console.log('coping', src, 'to', dest)
    fs.copyFileSync(src, dest, mode)
  } else {
    console.log('skipping', src, `(don't exist)`)
  }
}

if (ext === 'exe') {
  copyFileSync(`dist/Install Decentraland.${ext}`, `output/Install-Decentraland.${ext}`)
  copyFileSync(`dist/Install Decentraland.${ext}.blockmap`, `output/Install-Decentraland.${ext}.blockmap`)
  copyFileSync(`dist/Decentraland.appx`, `output/Decentraland.appx`)
} else {
  copyFileSync(`dist/Decentraland.${ext}`, `output/Decentraland.${ext}`)
  copyFileSync(`dist/Decentraland.${ext}.blockmap`, `output/Decentraland.${ext}.blockmap`)
}

copyFileSync(`dist/latest.yml`, `output/latest.yml`)

console.log('Done')
