const { apiGatewayUrl } = require('../config/env');

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    searchParams.set(key, String(value));
  });

  return searchParams.toString();
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length > 1);
}

function scoreProductMatch(product, query) {
  const queryTokens = tokenize(query);
  const haystack = [
    product.name,
    product.description,
    product.category,
    ...(Array.isArray(product.highlights) ? product.highlights.map((item) => `${item.title} ${item.description}`) : [])
  ]
    .join(' ')
    .toLowerCase();

  let score = 0;

  if (product.name && product.name.toLowerCase() === String(query || '').toLowerCase()) {
    score += 100;
  }

  queryTokens.forEach((token) => {
    if (haystack.includes(token)) {
      score += token.length >= 4 ? 8 : 4;
    }
  });

  return score;
}

class ProductTool {
  constructor() {
    this.apiBaseUrl = apiGatewayUrl;
  }

  async searchProducts(filters = {}) {
    const query = buildQuery({
      search: filters.search,
      category: filters.category,
      minPrice: filters.priceRange?.min,
      maxPrice: filters.priceRange?.max,
      limit: filters.limit || 12,
      sort: filters.sort || '-createdAt'
    });

    const response = await fetch(`${this.apiBaseUrl}/api/products?${query}`, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Product search failed (${response.status}): ${text}`);
    }

    const payload = await response.json();
    return {
      products: payload.products || [],
      pagination: payload.pagination || null,
      filters
    };
  }

  async findBestMatch(productName) {
    const result = await this.searchProducts({ search: productName, limit: 10 });
    const products = result.products || [];

    if (products.length === 0) {
      return { product: null, alternatives: [], products: [] };
    }

    const ranked = [...products]
      .map((product) => ({ product, score: scoreProductMatch(product, productName) }))
      .sort((a, b) => b.score - a.score);

    return {
      product: ranked[0]?.product || products[0],
      alternatives: ranked.slice(1, 4).map((item) => item.product),
      products
    };
  }

  async compareProducts(productNames = []) {
    const normalizedNames = productNames.filter(Boolean).slice(0, 4);

    const resolved = [];
    for (const name of normalizedNames) {
      const match = await this.findBestMatch(name);
      if (match.product && !resolved.some((item) => item._id === match.product._id)) {
        resolved.push(match.product);
      }
    }

    return {
      products: resolved,
      comparison: resolved.map((product) => ({
        id: product._id,
        name: product.name,
        category: product.category,
        price: product.price,
        stock: product.stock,
        averageRating: product.averageRating || 0,
        numReviews: product.numReviews || 0,
        highlights: Array.isArray(product.highlights) ? product.highlights.slice(0, 2) : [],
        image: product.image || product.images?.[0] || null
      }))
    };
  }
}

module.exports = ProductTool;