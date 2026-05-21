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
    item.barcode_quantity || item.quantity,
    item.unit_short_code || item.unit_code || item.unit_name,
  ]
    .filter(Boolean)
    .join(' ') || '-';
