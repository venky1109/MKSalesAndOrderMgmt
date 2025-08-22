export const LS_KEYS = {
  PRODUCTS: 'mk_products_v1',
  ORDERS_QUEUE: 'mk_orders_queue_v1',
};

export function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
export function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export function cacheProducts(products) {
  saveJSON(LS_KEYS.PRODUCTS, Array.isArray(products) ? products : []);
}
export function getCachedProducts() {
  return loadJSON(LS_KEYS.PRODUCTS, []);
}
export function enqueueOrder(localOrder) {
  const q = loadJSON(LS_KEYS.ORDERS_QUEUE, []);
  q.push(localOrder);
  saveJSON(LS_KEYS.ORDERS_QUEUE, q);
  return q.length;
}
export function peekOrdersQueue() {
  return loadJSON(LS_KEYS.ORDERS_QUEUE, []);
}
export function setOrdersQueue(newQueue) {
  saveJSON(LS_KEYS.ORDERS_QUEUE, newQueue || []);
}