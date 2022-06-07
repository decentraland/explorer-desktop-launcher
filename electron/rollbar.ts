export var rollbar: any;
export var token: string = '73e7ead7a15d4de3b26cecdda99b63c2'

export const initializeRollbar = () => {
  const Rollbar = require('rollbar');
  rollbar = new Rollbar({
    accessToken: token,
    captureUncaught: true,
    captureUnhandledRejections: true,
    payload: {
      code_version: '1.0.0',
    }
  });
}

export const reportCritical = (error: any) => {
  console.log("Reporting CRITICAL error to rollbar!")
  console.error(error)
  rollbar.critical(errorToString(error));
}

export const reportError = (error: any) => {
  console.log("Reporting error to rollbar!")
  console.error(error)
  rollbar.error(errorToString(error));
}

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