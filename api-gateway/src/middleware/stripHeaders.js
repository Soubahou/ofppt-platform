export const stripHeaders = (req, _res, next) => {
  for (const key of Object.keys(req.headers)) {
    if (key.toLowerCase().startsWith('x-internal-')) {
      delete req.headers[key]
    }
  }
  next()
}
