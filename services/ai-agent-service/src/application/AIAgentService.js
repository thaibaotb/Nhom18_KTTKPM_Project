const { assistantName } = require('../config/env');
const OllamaClient = require('../infrastructure/OllamaClient');
const IntentClassifier = require('./IntentClassifier');
const ToolRouter = require('./ToolRouter');

const GENERAL_SUGGESTIONS = [
  'iPhone 15 Pro Max còn hàng không?',
  'Điện thoại dưới 15 triệu',
  'So sánh iPhone 16 và Samsung S25 Ultra',
  'Chính sách đổi trả như thế nào?'
];

const SUGGESTIONS_BY_INTENT = {
  CHECK_INVENTORY: [
    'iPhone 16 Pro Max còn hàng không?',
    'Samsung S25 Ultra còn bao nhiêu chiếc?',
    'iPad Gen 10 còn hàng chứ?'
  ],
  SEARCH_PRODUCT: [
    'Điện thoại dưới 15 triệu',
    'Tìm Samsung tầm trung',
    'iPhone cho chụp ảnh đẹp'
  ],
  COMPARE_PRODUCTS: [
    'So sánh iPhone 16 và iPhone 15',
    'So sánh iPhone 16 Pro Max và Samsung S25 Ultra',
    'Điện thoại nào tốt hơn giữa hai mẫu này?'
  ],
  FAQ: [
    'Chính sách bảo hành',
    'Chính sách đổi trả',
    'Hình thức thanh toán'
  ]
};

class AIAgentService {
  constructor() {
    this.ollamaClient = new OllamaClient({
      baseUrl: require('../config/env').ollamaUrl,
      model: require('../config/env').ollamaModel
    });
    this.intentClassifier = new IntentClassifier(this.ollamaClient);
    this.toolRouter = new ToolRouter();
  }

  getSuggestedQuestions(intent) {
    return SUGGESTIONS_BY_INTENT[intent] || GENERAL_SUGGESTIONS;
  }

  composeResponse(classification, toolResult) {
    const { intent, entities } = classification;

    switch (intent) {
      case 'CHECK_INVENTORY': {
        const inventory = toolResult.data;
        if (!inventory?.found) {
          return {
            answer: `Mình chưa tìm thấy sản phẩm "${entities.productName || 'bạn vừa hỏi'}" trong kho. Bạn có thể thử tên đầy đủ hơn hoặc xem các gợi ý bên dưới.`,
            products: inventory?.alternatives || []
          };
        }

        return {
          answer: inventory.inStock
            ? `${inventory.product.name} hiện còn ${inventory.stock} chiếc trong kho.`
            : `${inventory.product.name} hiện đang hết hàng.`,
          products: [inventory.product, ...(inventory.alternatives || [])].filter(Boolean).slice(0, 4)
        };
      }

      case 'SEARCH_PRODUCT': {
        const search = toolResult.data;
        const count = search.products.length;
        return {
          answer: count > 0
            ? `Mình đã tìm thấy ${count} sản phẩm phù hợp với yêu cầu của bạn.`
            : 'Mình chưa tìm thấy sản phẩm phù hợp. Bạn có thể đổi mức giá, thương hiệu hoặc danh mục để mình tìm lại.',
          products: search.products.slice(0, 8)
        };
      }

      case 'COMPARE_PRODUCTS': {
        const comparison = toolResult.data;
        const count = comparison.products.length;

        if (count < 2) {
          return {
            answer: 'Mình cần ít nhất 2 sản phẩm rõ ràng để so sánh. Bạn có thể nói cụ thể hơn tên model nhé.',
            products: comparison.products
          };
        }

        return {
          answer: `Mình đã so sánh ${comparison.products.map((item) => item.name).join(' và ')}. Bạn xem các thẻ sản phẩm bên dưới để đối chiếu nhanh.`,
          products: comparison.products,
          comparison: comparison.comparison
        };
      }

      case 'FAQ': {
        const faq = toolResult.data;
        return {
          answer: faq.answer,
          faq: faq.matches,
          products: []
        };
      }

      default:
        return {
          answer: `${assistantName} có thể giúp bạn tìm sản phẩm, kiểm tra tồn kho, so sánh sản phẩm hoặc tra FAQ. Bạn hãy thử một câu hỏi cụ thể hơn nhé.`,
          products: []
        };
    }
  }

  async handleMessage({ message, history = [], user = null }) {
    console.log(`\n=================== [AI-AGENT] INCOMING REQUEST ===================`);
    console.log(`[USER]:`, user ? `${user.fullName || user.email} (${user.userId})` : 'Anonymous / Guest');
    console.log(`[QUESTION]: "${message}"`);
    console.log(`[HISTORY COUNT]: ${history.length} turn(s)`);
    try {
      const classification = await this.intentClassifier.classify(message, history);
      console.log(`[CLASSIFICATION]:`, {
        intent: classification.intent,
        entities: classification.entities,
        confidence: classification.confidence
      });

      const toolResult = await this.toolRouter.route(classification, { message, history, user });
      console.log(`[TOOL CALLED]: "${toolResult.tool}"`);

      const response = this.composeResponse(classification, toolResult);
      console.log(`[AGENT ANSWER]: "${response.answer.substring(0, 150)}${response.answer.length > 150 ? '...' : ''}"`);
      if (response.products?.length) {
        console.log(`[PRODUCTS ATTACHED]: ${response.products.length} product(s)`);
      }
      console.log(`===================================================================\n`);

      return {
        intent: classification.intent,
        entities: classification.entities,
        confidence: classification.confidence,
        answer: response.answer,
        products: response.products || [],
        faq: response.faq || [],
        comparison: response.comparison || [],
        suggestedQuestions: this.getSuggestedQuestions(classification.intent),
        tool: toolResult.tool
      };
    } catch (error) {
      console.error('[AI-AGENT] ERROR OCCURRED:', error.message);
      console.log(`===================================================================\n`);

      return {
        intent: 'GENERAL',
        entities: {},
        confidence: 0,
        answer: 'Mình chưa kết nối được với mô hình AI lúc này. Bạn có thể thử lại sau ít phút hoặc hỏi cụ thể hơn.',
        products: [],
        faq: [],
        comparison: [],
        suggestedQuestions: GENERAL_SUGGESTIONS,
        tool: 'fallback',
        error: error.message
      };
    }
  }
}

module.exports = new AIAgentService();