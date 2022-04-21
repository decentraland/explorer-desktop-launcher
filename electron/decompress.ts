import * as StreamZip from 'node-stream-zip'

export const unzip = async (zipFilePath: string, destinationPath: string) => {
  const zip = new StreamZip.async({ file: zipFilePath })

  try {
    const count = await zip.extract(null, destinationPath)
    console.log(`Extracted ${count} entries`)
    await zip.close()
  } catch (e) {
    console.error('Caught an error', e)
    throw e
  }
}
