module.exports.cdnFolder = function (packageName, version) {
  return `/cdn/packages/${packageName.replace(/^@[^/]+\//, '')}/${version}`
}
