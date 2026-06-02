import { apiRequest } from './api/client';

export async function sendAiAssistantMessage({ message, history = [] }) {
  const response = await apiRequest('/api/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message, history })
  });

  const payload = await response.json();

  if (!response.ok || !payload.success) {
    throw new Error(payload?.message || 'AI assistant request failed');
  }

  return payload.data;
}