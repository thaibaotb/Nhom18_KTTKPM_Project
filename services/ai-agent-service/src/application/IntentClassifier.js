const { extractJsonPayload, normalizeEntities, normalizeIntent } = require('../utils/json');

class IntentClassifier {
  constructor(ollamaClient) {
    this.ollamaClient = ollamaClient;
  }

  async classify(message, history = []) {
    const contextMessages = history
      .filter((item) => item && item.content)
      .slice(-6)
      .map((item) => ({
        role: item.role === 'assistant' ? 'assistant' : 'user',
        content: String(item.content)
      }));

    const response = await this.ollamaClient.chat([
      {
        role: 'system',
        content: [
          'You are an intent classifier for an e-commerce shopping assistant.',
          'Return ONLY valid JSON with this shape:',
          '{"intent":"CHECK_INVENTORY|SEARCH_PRODUCT|COMPARE_PRODUCTS|FAQ|GENERAL","entities":{...},"confidence":0.0}',
          'Supported entity examples:',
          '- CHECK_INVENTORY: {"productName":"iPhone 15 Pro Max"}',
          '- SEARCH_PRODUCT: {"category":"phone","brand":"Samsung","priceRange":{"min":0,"max":15000000}}',
          '- COMPARE_PRODUCTS: {"productNames":["iPhone 15 Pro Max","Samsung S26 Ultra"]}',
          '- FAQ: {"query":"chính sách đổi trả"}',
          'If the request is unclear, use GENERAL and keep entities minimal.',
          'Do not answer the user. Do not include markdown.'
        ].join(' ')
      },
      ...contextMessages,
      {
        role: 'user',
        content: message
      }
    ]);

    const content = response?.message?.content || response?.response || '';
    const parsed = extractJsonPayload(content);

    return {
      intent: normalizeIntent(parsed.intent),
      entities: normalizeEntities(parsed.entities),
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : null,
      raw: parsed
    };
  }
}

module.exports = IntentClassifier;