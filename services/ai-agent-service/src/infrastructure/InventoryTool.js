class InventoryTool {
  constructor(productTool) {
    this.productTool = productTool;
  }

  async checkStock(productName) {
    const match = await this.productTool.findBestMatch(productName);
    const product = match.product;

    if (!product) {
      return {
        found: false,
        product: null,
        alternatives: match.alternatives || []
      };
    }

    return {
      found: true,
      product,
      inStock: Number(product.stock || 0) > 0,
      stock: Number(product.stock || 0),
      alternatives: match.alternatives || []
    };
  }
}

module.exports = InventoryTool;