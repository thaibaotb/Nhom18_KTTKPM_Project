class OllamaClient {
  constructor({ baseUrl, model }) {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async chat(messages) {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: false,
        format: 'json',
        options: {
          temperature: 0.1
        }
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ollama request failed (${response.status}): ${text}`);
    }

    return response.json();
  }
}

module.exports = OllamaClient;