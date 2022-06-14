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

export const reportCritical = (error: any, callback?: () => void) => {
  rollbar.critical(error, (err: any) => {
    console.error(err)
    if (callback) {
      callback();
    }
  });
}

export const reportError = (error: any, callback?: () => void) => {
  rollbar.error(error, (err: any) => {
    console.error(err)
    if (callback) {
      callback();
    }
  });
}