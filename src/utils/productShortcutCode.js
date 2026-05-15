export const normalizeShortcutText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

export const normalizeShortcutUnit = (value) => {
  const unit = normalizeShortcutText(value).replace(/\./g, "");
  if (["kgs", "kilogram", "kilograms"].includes(unit)) return "kg";
  if (["grams", "gram"].includes(unit)) return "g";
  if (["litre", "litres", "ltrs", "ltr"].includes(unit)) return "l";
  if (["pieces", "piece"].includes(unit)) return "pcs";
  return unit || "unit";
};

export const normalizeShortcutQuantity = (value) => {
  const quantity = Number(value);
  return Number.isFinite(quantity)
    ? String(quantity)
    : normalizeShortcutText(value);
};

export const getProductShortcutKey = ({
  category,
  brand,
  productName,
  quantity,
  unit,
}) =>
  [
    normalizeShortcutText(category) || "uncategorized",
    normalizeShortcutText(brand) || "unbranded",
    normalizeShortcutText(productName),
    normalizeShortcutQuantity(quantity),
    normalizeShortcutUnit(unit),
  ].join("|");

export const getProductShortcutCode = (item) => {
  const key = getProductShortcutKey(item);
  let hash = 2166136261;

  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return String((hash >>> 0) % 90000 + 10000);
};
