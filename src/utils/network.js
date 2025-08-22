// src/utils/network.js
export async function pingBackend(
  url = `${process.env.REACT_APP_API_BASE_URL}/health`,
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
