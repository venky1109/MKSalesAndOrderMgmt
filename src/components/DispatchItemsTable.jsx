import React from 'react';
import {
  formatDispatchDate,
  getDispatchItemBarcode,
  getDispatchItemBrand,
  getDispatchItemCategory,
  getDispatchItemProductName,
  getDispatchItemUnit,
  getDispatchItemPackingConfigurations,
  getPackingConfigUnit,
  getPackingConfigurationsFromNotes,
} from '../utils/dispatchDisplay';

const getCatalogBarcode = (catalogBarcodes, config) =>
  (catalogBarcodes || []).find(
    (barcode) =>
      String(barcode.id || barcode.product_barcode_id) ===
      String(config.product_barcode_id)
  );

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
    notes: item.notes || '-',
  }));

const DispatchItemsTable = ({ items = [], emptyColSpan = 8, catalogBarcodes = [] }) => {
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
