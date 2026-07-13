import { createProxyMiddleware } from 'http-proxy-middleware'
import { handleProxyError }      from '../utils/proxyError.js'

export const createAcademicProxy = () =>
  createProxyMiddleware({
    target:       process.env.ACADEMIC_SERVICE_URL,
    changeOrigin: true,
    pathRewrite:  (path, req) => req.baseUrl + path,
    on: {
      proxyReq: (proxyReq, req) => {
        proxyReq.setHeader('x-correlation-id', req.correlationId || '')
        proxyReq.setHeader('x-forwarded-by',   'api-gateway')
      },
      error: (err, req, res) => handleProxyError(err, req, res, 'academic-service'),
    },
  })
