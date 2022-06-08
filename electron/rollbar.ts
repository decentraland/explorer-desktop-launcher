import Rollbar = require('rollbar');

export var rollbar: any;
export var post_server_token: string = 'db6bba90771e483389425d078bb63e74'

export const initializeRollbar = () => {
  rollbar = new Rollbar({
    accessToken: post_server_token,
    captureUncaught: true,
    captureUnhandledRejections: true,
    payload: {
      code_version: '1.0.0',
    }
  });
}

export const reportCritical = (error: any, callback: () => void) => {
  var errorString = errorToString(error);
  console.log("sending critical");
  rollbar.critical(error, (err: any) => {
    if (err) {
      console.error(err)
    } else {
      callback();
    }
  });
}

export const reportError = (error: any, callback: () => void) => {
  var errorString = errorToString(error);
  console.log("sending error");
  rollbar.error(error, (err: any) => {
    if (err) {
      console.error(err)
    } else {
      callback();
    }
  });
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