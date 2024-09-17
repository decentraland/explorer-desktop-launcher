import fs from 'fs'
import { describe, expect, it } from 'vitest'
import { unzip } from '../../electron/decompress'

describe('Test unzip', () => {
  it('normal unzip', async () => {
    if (!fs.existsSync('output')) fs.mkdirSync('output')

    await unzip('./test/resources/zip-good-to-test.zip', 'output')

    expect(fs.existsSync('output/some_folder/hello_world')).toBeTruthy()

    fs.rmSync('output', { recursive: true })
  })

  it('trying to unzip relative paths', () => {
    expect(unzip('./test/resources/zip-with-relative-path.zip', 'output')).rejects.toThrow(
      'Malicious entry: ../some_folder/'
    )
  })
})
