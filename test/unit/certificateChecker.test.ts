import { expect } from 'chai'
import { isTrustedCertificate } from '../../electron/certificateChecker'

describe('Test helpers', () => {
  it('trusted certificate checker', () => {
    expect(isTrustedCertificate('', '')).to.be.false

    // Invalids
    expect(isTrustedCertificate('', 'net::ERR_CERT_AUTHORITY_INVALID')).to.be.false

    expect(isTrustedCertificate('wss://localhost:7659/dcl', 'net::ERR_CERT_AUTHORITY_INVALID')).to.be.false

    expect(isTrustedCertificate('wss://localhost:7680/dcl', 'net::ERR_CERT_AUTHORITY_INVALID')).to.be.false

    expect(isTrustedCertificate('wss://localhost:7666/dcll', 'net::ERR_CERT_AUTHORITY_INVALID')).to.be.false

    expect(isTrustedCertificate('ws://localhost:7666/dcl', 'net::ERR_CERT_AUTHORITY_INVALID')).to.be.false

    // Valids
    expect(isTrustedCertificate('wss://localhost:7666/dcl', 'net::ERR_CERT_AUTHORITY_INVALID')).to.be.true

    expect(isTrustedCertificate('wss://localhost:7660/dcl', 'net::ERR_CERT_AUTHORITY_INVALID')).to.be.true

    expect(isTrustedCertificate('wss://localhost:7679/dcl', 'net::ERR_CERT_AUTHORITY_INVALID')).to.be.true
  })
})
