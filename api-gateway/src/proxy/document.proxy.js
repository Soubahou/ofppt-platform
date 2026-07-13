import { createProxyMiddleware } from 'http-proxy-middleware'
import { handleProxyError }      from '../utils/proxyError.js'

export const createDocumentProxy = () =>
  createProxyMiddleware({
    target:             process.env.DOCUMENT_SERVICE_URL,
    changeOrigin:       true,
    pathRewrite:        (path, req) => req.baseUrl + path,
    selfHandleResponse: false,
    on: {
      proxyReq: (proxyReq, req) => {
        proxyReq.setHeader('x-correlation-id', req.correlationId || '')
        proxyReq.setHeader('x-forwarded-by',   'api-gateway')
      },
      error: (err, req, res) => handleProxyError(err, req, res, 'document-service'),
    },
  })
