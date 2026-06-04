export const formatDispatchDate = (value) => {
  if (!value) return '-';
  return String(value).slice(0, 10);
};

export const getWarehouseLabel = (warehouse) => {
  if (!warehouse) return '';
  return `${warehouse.warehouse_code || warehouse.code || ''} - ${
    warehouse.warehouse_name || warehouse.name || ''
  }`;
};

export const getDispatchDestinationLabel = (item, destinationType) => {
  if (!item) return '';

  if (destinationType === 'internal_packing') {
    return item.name || 'Internal Packing Dept';
  }

  if (destinationType === 'warehouse') {
    return `${item.warehouse_code || item.code || ''} - ${
      item.warehouse_name || item.name || ''
    }`;
  }

  if (destinationType === 'outlet') {
    return `${item.outlet_code || item.code || ''} - ${
      item.outlet_name || item.name || ''
    }`;
  }

  return `${item.stakeholder_code || item.stackholder_code || item.code || ''} - ${
    item.stakeholder_name || item.name || ''
  }`;
};

const firstValue = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== '');

const joinBrandAndProductName = (brandName, productName) => {
  const brand = String(brandName || '').trim();
  const product = String(productName || '').trim();

  if (!brand) return product || '-';
  if (!product) return brand;
  if (product.toLowerCase().startsWith(brand.toLowerCase())) return product;

  return `${brand} ${product}`;
};

const formatQuantity = (value) => {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) return String(value || '');
  if (Number.isInteger(numeric)) return String(numeric);

  return String(numeric).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
};

const getDispatchItemBrandValue = (item) =>
  firstValue(
    item.brand_name_english,
    item.brand_name_telugu,
    item.brand_name,
    item.brand,
    item.brandName
  );

export const getDispatchItemBrand = (item) => getDispatchItemBrandValue(item) || '-';

export const getDispatchItemProductName = (item) =>
  joinBrandAndProductName(
    getDispatchItemBrandValue(item),
    firstValue(
      item.product_name_eng,
      item.product_name_tel,
      item.product_name,
      item.productName,
      item.name,
      item.product_code
    )
  );

export const getDispatchItemBarcode = (item) =>
  item.mk_barcode || item.barcode || item.bar_code || item.product_barcode_id || '-';

export const getDispatchItemCategory = (item) =>
  item.category_name_english ||
  item.category_name_telugu ||
  item.category_name ||
  '-';

export const getDispatchItemUnit = (item) =>
  [
    formatQuantity(item.barcode_quantity || item.quantity),
    item.unit_short_code ||
      item.unit_code ||
      item.unit_name ||
      item.units ||
      item.unit ||
      item.pack_unit_short_code ||
      item.pack_unit_name,
  ]
    .filter(Boolean)
    .join(' ') || '-';

export const getDispatchItemPackingConfigurations = (item) => {
  const configs =
    item.packing_configurations ||
    item.packingConfigurations ||
    item.packing_configs ||
    item.packingConfigs ||
    [];

  return Array.isArray(configs) ? configs : [];
};

export const getPackingConfigUnit = (config) =>
  [
    formatQuantity(config.barcode_quantity || config.quantity),
    config.unit_short_code ||
      config.unit_code ||
      config.unit_name ||
      config.units ||
      config.unit ||
      config.pack_unit_short_code ||
      config.pack_unit_name,
  ]
    .filter(Boolean)
    .join(' ') || '-';

export const getPackingConfigurationsFromNotes = (item) => {
  const noteParts = String(item?.notes || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);

  return noteParts.flatMap((part, index) => {
    const packMatch = part.match(
      /^(.*?)\s+([0-9]+(?:\.[0-9]+)?)\s*([A-Za-z]+)\s+x\s*([0-9]+)/i
    );

    if (!packMatch) return [];

    const [, productName, quantity, unit, countText] = packMatch;
    const purchaseMatch = part.match(/Purchase\s*Rs\.?\s*([0-9]+(?:\.[0-9]+)?)/i);
    const mrpMatch = part.match(/MRP\s*Rs\.?\s*([0-9]+(?:\.[0-9]+)?)/i);

    return {
      id: `notes-pack-${index}`,
      product_name: productName.trim(),
      barcode_quantity: formatQuantity(quantity),
      unit_short_code: unit,
      pack_count: Number(countText || 0),
      package_amount: purchaseMatch?.[1] || '',
      mrp_amount: mrpMatch?.[1] || '',
      notes: part,
      _fromNotes: true,
    };
  });
};

const getQuantityBaseUnits = (quantity, unitCode) => {
  const qty = Number(quantity || 0);
  const normalizedUnit = String(unitCode || '')
    .trim()
    .toLowerCase()
    .replace(/\./g, '');

  if (!Number.isFinite(qty) || qty <= 0) return 0;
  if (normalizedUnit.startsWith('kg')) return qty * 1000;
  if (
    normalizedUnit.startsWith('gm') ||
    normalizedUnit.startsWith('gms') ||
    normalizedUnit === 'g'
  ) {
    return qty;
  }

  return qty;
};

const isWeightUnitCode = (unitCode) => {
  const normalizedUnit = String(unitCode || '')
    .trim()
    .toLowerCase()
    .replace(/\./g, '');

  return (
    normalizedUnit.startsWith('kg') ||
    normalizedUnit.startsWith('gm') ||
    normalizedUnit.startsWith('gms') ||
    normalizedUnit === 'g'
  );
};

const positiveNumber = (...values) => {
  for (const value of values) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) return numeric;
  }

  return null;
};

export const getCalculatedPackingAmounts = (item = {}, config = {}) => {
  const explicitPackageAmount = positiveNumber(
    config.package_amount,
    config.packageAmount,
    config.purchase_amount,
    config.purchaseAmount
  );
  const explicitMrp = positiveNumber(config.mrp_amount, config.mrpAmount, config.MRP, config.mrp);

  const sourcePrice = positiveNumber(item.unit_price, item.package_amount, item.packageAmount);
  const sourceUnit =
    item.unit_short_code || item.unit_code || item.unit_name || item.units || item.unit;
  const configList = getDispatchItemPackingConfigurations(item);
  const sourcePackConfig = config.source_pack_quantity
    ? config
    : configList.find((row) => row.source_pack_quantity);
  const sourcePackBaseQty = getQuantityBaseUnits(
    sourcePackConfig?.source_pack_quantity,
    sourcePackConfig?.source_pack_unit_short_code || sourcePackConfig?.source_pack_unit
  );
  const rawSourceBaseQty = sourcePackBaseQty || getQuantityBaseUnits(
    item.barcode_quantity || item.quantity,
    sourceUnit
  );
  const totalPackedBaseQty = configList.reduce(
    (sum, row) =>
      sum +
      getQuantityBaseUnits(
        row.barcode_quantity || row.quantity,
        row.unit_short_code || row.unit_code || row.unit_name || row.units || row.unit
      ) *
        Number(row.pack_count || row.qty || 0),
    0
  );
  const sourceUnits = positiveNumber(item.no_of_units, item.qty) || 1;
  const sourceBaseQty =
    !isWeightUnitCode(sourceUnit) && totalPackedBaseQty
      ? totalPackedBaseQty / sourceUnits
      : rawSourceBaseQty;
  const packedBaseQty = getQuantityBaseUnits(
    config.barcode_quantity || config.quantity,
    config.unit_short_code || config.unit_code || config.unit_name || config.units || config.unit
  );

  const baseAmount =
    sourcePrice && sourceBaseQty && packedBaseQty
      ? (sourcePrice / sourceBaseQty) * packedBaseQty
      : null;
  const percentTotal =
    Number(config.margin_percentage || 0) +
    Number(config.labour_percentage || 0) +
    Number(config.transport_percentage || 0) +
    Number(config.load_percentage || 0) +
    Number(config.unload_percentage || 0);
  const calculatedPackageAmount =
    baseAmount ? Math.ceil(baseAmount + (baseAmount * percentTotal) / 100) : null;
  const useCalculatedPackageAmount =
    calculatedPackageAmount &&
    (!explicitPackageAmount || explicitPackageAmount > calculatedPackageAmount * 10);
  const packageAmount = useCalculatedPackageAmount
    ? calculatedPackageAmount
    : explicitPackageAmount ?? calculatedPackageAmount;
  const calculatedMrp = packageAmount ? Math.round(packageAmount * 1.25) : null;
  const useCalculatedMrp = calculatedMrp && (!explicitMrp || explicitMrp > calculatedMrp * 10);
  const mrpAmount =
    useCalculatedMrp
      ? calculatedMrp
      : explicitMrp ?? positiveNumber(config.unit_mrp, config.unitMRP) ?? calculatedMrp;

  return {
    packageAmount,
    mrpAmount,
  };
};
