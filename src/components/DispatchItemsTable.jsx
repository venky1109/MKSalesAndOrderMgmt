import React from 'react';
import {
  formatDispatchDate,
  getDispatchItemBarcode,
  getDispatchItemBrand,
  getDispatchItemCategory,
  getDispatchItemProductName,
  getDispatchItemUnit,
  getDispatchItemPackingConfigurations,
  getCalculatedPackingAmounts,
  getPackingConfigUnit,
  getPackingConfigurationsFromNotes,
} from '../utils/dispatchDisplay';

const getCatalogBarcode = (catalogBarcodes, config) =>
  (catalogBarcodes || []).find(
    (barcode) =>
      String(barcode.id || barcode.product_barcode_id) ===
      String(config.product_barcode_id)
  );

const firstValue = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== '');

const formatPrice = (value) => {
  if (value === undefined || value === null || value === '') return '-';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return numeric.toFixed(2);
};

const getPriceFromNotes = (notes, label) => {
  const text = String(notes || '');
  const pattern =
    label === 'mrp'
      ? /MRP\s*Rs\.?\s*([0-9]+(?:\.[0-9]+)?)/i
      : /Purchase\s*Rs\.?\s*([0-9]+(?:\.[0-9]+)?)/i;

  return text.match(pattern)?.[1] || '';
};

const getPackageRows = (items, catalogBarcodes = []) =>
  items.flatMap((item) => {
    const configs =
      getDispatchItemPackingConfigurations(item).length > 0
        ? getDispatchItemPackingConfigurations(item)
        : getPackingConfigurationsFromNotes(item);
    const noteConfigs = getPackingConfigurationsFromNotes(item);

    if (!configs.length) return [];

    return configs.map((config, index) => {
      const catalogBarcode = getCatalogBarcode(catalogBarcodes, config) || {};
      const noteConfig = noteConfigs[index] || {};
      const mergedConfig = {
        ...noteConfig,
        ...catalogBarcode,
        ...config,
        barcode_quantity:
          config.barcode_quantity ||
          catalogBarcode.quantity ||
          catalogBarcode.barcode_quantity ||
          noteConfig.barcode_quantity,
        unit_short_code:
          config.unit_short_code ||
          catalogBarcode.unit_short_code ||
          catalogBarcode.unit_name ||
          noteConfig.unit_short_code,
        mk_barcode:
          config.mk_barcode ||
          catalogBarcode.mk_barcode ||
          catalogBarcode.mkBarcode ||
          catalogBarcode.barcode ||
          noteConfig.mk_barcode,
        barcode:
          config.barcode ||
          catalogBarcode.barcode ||
          catalogBarcode.mk_barcode ||
            noteConfig.barcode,
      };
      const calculatedAmounts = getCalculatedPackingAmounts(item, mergedConfig);

      return {
      id: `${item.id || getDispatchItemBarcode(item)}-${config.product_barcode_id || index}`,
      product:
        mergedConfig.product_name ||
        mergedConfig.product_name_eng ||
        getDispatchItemProductName(item),
      barcode:
        mergedConfig.mk_barcode ||
        mergedConfig.barcode ||
        mergedConfig.bar_code ||
        mergedConfig.product_barcode_id ||
        '-',
      category: getDispatchItemCategory(item),
      brand: getDispatchItemBrand(item),
      qty: mergedConfig.pack_count || mergedConfig.qty || '-',
      unit: getPackingConfigUnit(mergedConfig),
      expDate: item.exp_date,
      unitPrice: firstValue(
        calculatedAmounts.packageAmount,
        mergedConfig.package_amount,
        mergedConfig.packageAmount,
        mergedConfig.purchase_amount,
        mergedConfig.purchaseAmount,
        getPriceFromNotes(mergedConfig.notes, 'purchase'),
        getPriceFromNotes(item.notes, 'purchase'),
        item.package_amount,
        item.unit_price
      ),
      mrp: firstValue(
        calculatedAmounts.mrpAmount,
        mergedConfig.mrp_amount,
        mergedConfig.mrpAmount,
        mergedConfig.MRP,
        mergedConfig.mrp,
        getPriceFromNotes(mergedConfig.notes, 'mrp'),
        getPriceFromNotes(item.notes, 'mrp'),
        item.mrp_amount,
        item.unit_mrp
      ),
      notes: [
        mergedConfig.package_amount ? `Purchase Rs ${mergedConfig.package_amount}` : '',
        mergedConfig.mrp_amount ? `MRP Rs ${mergedConfig.mrp_amount}` : '',
      ]
        .filter(Boolean)
        .join(' | ') || item.notes || '-',
    };
    });
  });

const sourceRows = (items) =>
  items.map((item) => ({
    id: item.id || `${getDispatchItemBarcode(item)}-${item.exp_date}`,
    product: getDispatchItemProductName(item),
    barcode: getDispatchItemBarcode(item),
    category: getDispatchItemCategory(item),
    brand: getDispatchItemBrand(item),
    qty: item.qty,
    unit: getDispatchItemUnit(item),
    expDate: item.exp_date,
    unitPrice: firstValue(
      item.package_amount,
      item.packageAmount,
      item.purchase_amount,
      item.purchaseAmount,
      getPriceFromNotes(item.notes, 'purchase'),
      item.unit_price,
      item.price
    ),
    mrp: firstValue(
      item.mrp_amount,
      item.mrpAmount,
      item.MRP,
      item.mrp,
      getPriceFromNotes(item.notes, 'mrp'),
      item.unit_mrp
    ),
    notes: item.notes || '-',
  }));

const DispatchItemsTable = ({ items = [], emptyColSpan = 10, catalogBarcodes = [] }) => {
  const packageRows = getPackageRows(items, catalogBarcodes);
  const rows = packageRows.length ? packageRows : sourceRows(items);

  return (
    <tbody>
      {rows.map((item) => (
        <tr key={item.id} className="border-t">
          <td className="px-3 py-2 font-semibold">{item.product}</td>

          <td className="px-3 py-2">{item.barcode}</td>

          <td className="px-3 py-2">{item.category}</td>

          <td className="px-3 py-2">{item.brand}</td>

          <td className="px-3 py-2 text-center">{item.qty}</td>

          <td className="px-3 py-2 text-center">{item.unit}</td>

          <td className="px-3 py-2">{formatDispatchDate(item.expDate)}</td>

          <td className="px-3 py-2 text-right">{formatPrice(item.unitPrice)}</td>

          <td className="px-3 py-2 text-right">{formatPrice(item.mrp)}</td>

          <td className="px-3 py-2">{item.notes}</td>
        </tr>
      ))}

      {rows.length === 0 && (
        <tr>
          <td colSpan={emptyColSpan} className="px-3 py-5 text-center text-gray-500">
            No items
          </td>
        </tr>
      )}
    </tbody>
  );
};

export default DispatchItemsTable;
