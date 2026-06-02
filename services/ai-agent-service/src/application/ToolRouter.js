const ProductTool = require('../infrastructure/ProductTool');
const InventoryTool = require('../infrastructure/InventoryTool');
const FAQTool = require('../infrastructure/FAQTool');

class ToolRouter {
  constructor() {
    this.productTool = new ProductTool();
    this.inventoryTool = new InventoryTool(this.productTool);
    this.faqTool = new FAQTool();
  }

  async route(classification, { message }) {
    const { intent, entities } = classification;

    switch (intent) {
      case 'CHECK_INVENTORY':
        return {
          tool: 'inventory',
          data: await this.inventoryTool.checkStock(entities.productName || message)
        };

      case 'SEARCH_PRODUCT':
        return {
          tool: 'product-search',
          data: await this.productTool.searchProducts({
            search: entities.query || entities.brand || message,
            category: entities.category,
            priceRange: entities.priceRange,
            limit: 8
          })
        };

      case 'COMPARE_PRODUCTS':
        return {
          tool: 'product-compare',
          data: await this.productTool.compareProducts(entities.productNames || [])
        };

      case 'FAQ':
        return {
          tool: 'faq',
          data: this.faqTool.search(entities.query || message)
        };

      default:
        return {
          tool: 'none',
          data: null
        };
    }
  }
}

module.exports = ToolRouter;