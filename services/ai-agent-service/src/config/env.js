const path = require('path');

module.exports = {
  port: process.env.PORT || 3010,
  nodeEnv: process.env.NODE_ENV || 'development',
  ollamaUrl: process.env.OLLAMA_URL || 'http://host.docker.internal:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'qwen3:latest',
  apiGatewayUrl: process.env.API_GATEWAY_URL || 'http://api-gateway:3000',
  assistantName: process.env.AI_ASSISTANT_NAME || 'ELPPA Assistant',
  faqPath: process.env.FAQ_PATH || path.join(__dirname, '../../data/faq.json')
};