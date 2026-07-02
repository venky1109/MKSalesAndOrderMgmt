// src/utils/network.js
import { API_BASE_URL } from './apiConfig';

export async function pingBackend(
  url = `${API_BASE_URL}/health`,
  timeoutMs = 2500,
  token
) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    await fetch(url, {
      method: 'GET',       // HEAD also fine if your server supports it
      cache: 'no-store',
      signal: controller.signal,
      headers,
    });
    // If we got *any* HTTP response, the backend is reachable
    return true;
  } catch {
    // Network error / CORS / timeout
    return false;
  } finally {
    clearTimeout(t);
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchWithRetry(url, options = {}, retries = 2) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fetch(url, { cache: 'no-store', ...options });
    } catch (error) {
      lastError = error;
      const canRetry =
        error?.name === 'TypeError' && error?.message === 'Failed to fetch';

      if (!canRetry || attempt === retries) {
        throw error;
      }

      await wait(700 * (attempt + 1));
    }
  }

  throw lastError;
}
