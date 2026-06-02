const router = require('express').Router();
const { createAiProxyMiddleware } = require('../controllers/aiProxy.controller');

router.post('/chat', createAiProxyMiddleware());
router.get('/health', createAiProxyMiddleware());

module.exports = router;