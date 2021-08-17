const fs = require('fs');
const dir = './output';
const ext = process.argv[2];
console.log('ext: ', ext);
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
}

fs.copyFileSync(`dist/decentraland-launcher.${ext}`, `output/decentraland-launcher.${ext}`)
console.log('Done');