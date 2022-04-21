import { unzip } from '../../electron/decompress'
import * as fs from 'fs'
import * as chai from 'chai'
import * as chaiAsPromised from 'chai-as-promised'

chai.use(chaiAsPromised)

const expect = chai.expect

describe('Test unzip', () => {
  it('normal unzip', async () => {
    if (!fs.existsSync('output')) fs.mkdirSync('output')

    await unzip('./test/resources/zip-good-to-test.zip', 'output')

    expect(fs.existsSync('output/some_folder/hello_world')).to.be.true

    fs.rmSync('output', { recursive: true })
  })

  it('trying to unzip relative paths', async () => {
    await expect(unzip('./test/resources/zip-with-relative-path.zip', 'output')).to.be.rejectedWith(
      'Malicious entry: ../some_folder/'
    )
  })
})
