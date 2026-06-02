const fs = require('fs');
const { faqPath } = require('../config/env');

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length > 1);
}

class FAQTool {
  constructor() {
    const raw = fs.readFileSync(faqPath, 'utf8');
    this.items = JSON.parse(raw);
  }

  search(query) {
    const queryTokens = tokenize(query);

    const ranked = this.items
      .map((item) => {
        const haystack = [item.title, item.answer, ...(item.keywords || [])].join(' ').toLowerCase();
        let score = 0;

        queryTokens.forEach((token) => {
          if (haystack.includes(token)) {
            score += token.length >= 4 ? 8 : 4;
          }
        });

        return { ...item, score };
      })
      .sort((a, b) => b.score - a.score);

    const top = ranked.filter((item) => item.score > 0).slice(0, 3);

    return {
      answer:
        top.length > 0
          ? top[0].answer
          : 'Mình chưa tìm thấy câu trả lời chính xác. Bạn có thể chọn một chủ đề FAQ bên dưới để xem chi tiết.',
      matches: top.map(({ score, ...item }) => item)
    };
  }
}

module.exports = FAQTool;