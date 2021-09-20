const path = require('path')

/**
 * This module creates a "CDN-like" environment. Serving static content directly
 * from NPM modules.
 */

module.exports = function (app) {
  if (!process.env.KERNEL_PATH) throw new Error('KERNEL_PATH not present in process.env')

  createStaticRoutes(app, '/cdn/packages/kernel/:version/*', path.resolve(process.env.KERNEL_PATH))
  createStaticRoutes(app, '/cdn/packages/website/:version/*', `./public`)
  createStaticRoutes(app, '/cdn/packages/unity-renderer/:version/*', `./node_modules/@dcl/unity-renderer`)
}

function createStaticRoutes(app, route, localFolder) {
  app.use(route, (req, res, next) => {
    const options = {
      root: localFolder,
      dotfiles: 'deny',
      maxAge: 1,
      cacheControl: false,
      lastModified: true,
      headers: {
        'x-timestamp': Date.now(),
        'x-sent': true,
        etag: JSON.stringify(Date.now().toString()),
        'cache-control': 'no-cache,private,max-age=1'
      }
    }

    const fileName = req.params[0]

    res.sendFile(fileName, options, (err) => {
      if (err) {
        next(err)
      } else {
        console.log(`Sending ${localFolder}/${fileName}`)
      }
    })
  })
}
