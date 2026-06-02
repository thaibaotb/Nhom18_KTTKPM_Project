function extractJsonPayload(text) {
  if (!text) {
    throw new Error('Empty LLM response');
  }

  if (typeof text === 'object') {
    return text;
  }

  const trimmed = String(text).trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    // Continue below.
  }

  const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)```/i) || trimmed.match(/```\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1].trim() : trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
  }

  throw new Error('Unable to parse JSON payload from LLM response');
}

function normalizeIntent(intent) {
  const supported = new Set(['CHECK_INVENTORY', 'SEARCH_PRODUCT', 'COMPARE_PRODUCTS', 'FAQ', 'GENERAL']);
  const value = String(intent || 'GENERAL').toUpperCase();
  return supported.has(value) ? value : 'GENERAL';
}

function normalizePriceRange(priceRange) {
  if (!priceRange) return null;

  if (Array.isArray(priceRange) && priceRange.length >= 2) {
    return {
      min: Number(priceRange[0]) || null,
      max: Number(priceRange[1]) || null
    };
  }

  if (typeof priceRange === 'object') {
    return {
      min: priceRange.min != null ? Number(priceRange.min) : null,
      max: priceRange.max != null ? Number(priceRange.max) : null
    };
  }

  return null;
}

function normalizeEntities(entities) {
  const normalized = entities && typeof entities === 'object' ? { ...entities } : {};

  if (normalized.priceRange) {
    normalized.priceRange = normalizePriceRange(normalized.priceRange);
  }

  if (normalized.productNames && !Array.isArray(normalized.productNames)) {
    normalized.productNames = [normalized.productNames].filter(Boolean);
  }

  return normalized;
}

module.exports = {
  extractJsonPayload,
  normalizeEntities,
  normalizeIntent,
  normalizePriceRange
};