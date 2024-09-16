import { describe, expect, it } from 'vitest'
import { isTrustedCertificate } from '../../electron/certificateChecker'

describe('Test helpers', () => {
  it('trusted certificate checker', () => {
    expect(isTrustedCertificate('', '')).toBeFalsy()

    // Invalids
    expect(isTrustedCertificate('', 'net::ERR_CERT_AUTHORITY_INVALID')).toBeFalsy()

    expect(isTrustedCertificate('wss://localhost:7659/dcl', 'net::ERR_CERT_AUTHORITY_INVALID')).toBeFalsy()

    expect(isTrustedCertificate('wss://localhost:7680/dcl', 'net::ERR_CERT_AUTHORITY_INVALID')).toBeFalsy()

    expect(isTrustedCertificate('wss://localhost:7666/dcll', 'net::ERR_CERT_AUTHORITY_INVALID')).toBeFalsy()

    expect(isTrustedCertificate('ws://localhost:7666/dcl', 'net::ERR_CERT_AUTHORITY_INVALID')).toBeFalsy()

    // Valids
    expect(isTrustedCertificate('wss://localhost:7666/dcl', 'net::ERR_CERT_AUTHORITY_INVALID')).toBeTruthy()

    expect(isTrustedCertificate('wss://localhost:7660/dcl', 'net::ERR_CERT_AUTHORITY_INVALID')).toBeTruthy()

    expect(isTrustedCertificate('wss://localhost:7679/dcl', 'net::ERR_CERT_AUTHORITY_INVALID')).toBeTruthy()
  })
})
