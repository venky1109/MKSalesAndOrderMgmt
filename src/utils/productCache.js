const PRODUCT_CACHE_KEYS = [
  'mkpos.products',
  'mk_products_v1',
  'products',
  'allProducts',
  'catalog',
  'mkpos.products.json',
];

export const getCachedProductList = () => {
  for (const key of PRODUCT_CACHE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed?.products)) return parsed.products;
    } catch {
      // Ignore malformed cache entries and keep checking older keys.
    }
  }

  return [];
};
