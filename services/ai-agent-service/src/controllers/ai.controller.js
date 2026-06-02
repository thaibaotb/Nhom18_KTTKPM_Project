const aiAgentService = require('../application/AIAgentService');

const chat = async (req, res, next) => {
  try {
    const { message, history } = req.body || {};

    if (!message || !String(message).trim()) {
      return res.status(400).json({
        success: false,
        message: 'message is required'
      });
    }

    const result = await aiAgentService.handleMessage({
      message: String(message).trim(),
      history: Array.isArray(history) ? history : [],
      user: req.user || null
    });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  chat
};