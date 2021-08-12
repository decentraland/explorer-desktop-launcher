const DecompressZip = require('decompress-zip');

export const unzip = (zipFilePath : string, destinationPath : string, onCompleted : () => void) => {
    const unZipper = new DecompressZip(zipFilePath);

    // Add the error event listener
    unZipper.on('error', (err : any) => {
        console.log('Caught an error', err);
    });
    
    // Notify when everything is extracted
    unZipper.on('extract', (log : string) => {
        console.log('Finished extracting', log);
        onCompleted()
    });
    
    // Notify "progress" of the decompressed files
    unZipper.on('progress', (fileIndex : number, fileCount : number) => {
        console.log('Extracted file ' + (fileIndex + 1) + ' of ' + fileCount);
    });
    
    // Unzip !
    unZipper.extract({
        path: destinationPath
    });
}