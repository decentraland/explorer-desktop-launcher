
export function errorToString(error: any) {
  if (typeof error === 'object') {
    if (error.message) return error.message
    if (error.toString() === '[object Object]') {
      return JSON.stringify(error)
    }
    return error.toString()
  }
  if (typeof error === 'string') return error
  return Object.prototype.toString.call(error)
}