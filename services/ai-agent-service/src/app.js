const express = require('express');
const cors = require('cors');
const aiRoutes = require('./routes/ai.routes');
const { nodeEnv } = require('./config/env');

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'ai-agent-service', env: nodeEnv });
});

app.use('/', aiRoutes);

app.use((err, req, res, next) => {
  console.error('[AI Agent Error]', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

module.exports = app;