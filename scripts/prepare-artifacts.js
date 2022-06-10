const fs = require('fs');
const dir = './output';
const ext = process.argv[2];
console.log('ext: ', ext);
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
}

if (ext === 'exe') {
    if (fs.existsSync(`dist/Install Decentraland.${ext}`)) {
        fs.copyFileSync(`dist/Install Decentraland.${ext}`, `output/Install Decentraland.${ext}`)
    }

    if (fs.existsSync(`dist/Decentraland.appx`)) {
        fs.copyFileSync(`dist/Decentraland.appx`, `output/Decentraland.appx`)
    }
} else {
    fs.copyFileSync(`dist/Decentraland.${ext}`, `output/Decentraland.${ext}`)
}
console.log('Done');