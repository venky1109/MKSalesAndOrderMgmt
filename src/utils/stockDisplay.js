const stockNumberFormat = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 3,
});

export const formatStockQuantity = (value, fallback = '0') => {
  if (value === undefined || value === null || value === '') return fallback;

  const numericValue = Number(String(value).replace(/,/g, '').trim());

  if (!Number.isFinite(numericValue)) return fallback;

  return stockNumberFormat.format(numericValue);
};
