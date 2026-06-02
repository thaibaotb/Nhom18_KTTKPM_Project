const { createProxyMiddleware } = require('http-proxy-middleware');
const { aiAgentServiceUrl } = require('../config/env');

const AI_PROXY_TIMEOUT_MS = 120000;

const createAiProxyMiddleware = () => createProxyMiddleware({
  target: aiAgentServiceUrl,
  changeOrigin: true,
  logLevel: 'silent',
  timeout: AI_PROXY_TIMEOUT_MS,
  proxyTimeout: AI_PROXY_TIMEOUT_MS,
  onProxyReq: (proxyReq, req) => {
    if (req.correlationId) {
      proxyReq.setHeader('X-Correlation-ID', req.correlationId);
    }
  },
  onError: (err, req, res) => {
    console.error('[ai proxy error]', err.message);

    if (!res.headersSent) {
      res.status(503).json({
        success: false,
        message: 'AI Assistant Service Unavailable',
        data: null,
        errorCode: 'AI_SERVICE_UNAVAILABLE'
      });
    }
  }
});

module.exports = {
  createAiProxyMiddleware
};