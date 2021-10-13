const fs = require('fs');
const dir = './output';
const ext = process.argv[2];
console.log('ext: ', ext);
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
}

if (ext === 'exe') {
    fs.copyFileSync(`dist/Install Decentraland.${ext}`, `output/Install Decentraland.${ext}`)
} else {
    fs.copyFileSync(`dist/Decentraland.${ext}`, `output/Decentraland.${ext}`)
}
console.log('Done');