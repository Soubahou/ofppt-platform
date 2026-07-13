import logger from './logger.js'

export const handleProxyError = (err, req, res, serviceName) => {
  logger.error(
    { err: err.message, serviceName, method: req.method, path: req.path },
    'Proxy error — downstream service unavailable',
  )
  if (!res.headersSent) {
    res.status(503).json({
      error: `${serviceName} is unavailable. Please try again later.`,
    })
  }
}
