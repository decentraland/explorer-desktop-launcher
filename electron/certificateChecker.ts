export const isTrustedCertificate = (url: string, error: string): boolean => {
  const regex = new RegExp('^wss://localhost:76[67][0-9]/dcl$') // Accept from 7660 to 7679
  return url.match(regex) != null && error === 'net::ERR_CERT_AUTHORITY_INVALID'
}
