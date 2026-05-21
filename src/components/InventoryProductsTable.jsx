import React, { useMemo, useState } from 'react';

import { formatStockQuantity } from '../utils/stockDisplay';
import { getNextSortConfig, sortRows } from '../utils/tableSort';

const firstValue = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== '');

const getInventoryBrandName = (item) =>
  firstValue(
    item?.brand_name_english,
    item?.brand_name,
    item?.brand,
    item?.brandName,
    item?.brandNameEnglish
  );

const getInventoryProductName = (item) =>
  firstValue(
    item?.product_name,
    item?.product_name_eng,
    item?.product_name_tel,
    item?.productName,
    item?.name,
    item?.product_id
  );

const getInventoryProductDisplayName = (item) => {
  const brand = String(getInventoryBrandName(item) || '').trim();
  const product = String(getInventoryProductName(item) || '').trim();

  if (!brand) return product || '-';
  if (!product) return brand;
  if (product.toLowerCase().startsWith(brand.toLowerCase())) return product;

  return `${brand} ${product}`;
};

const getInventoryStockQuantity = (item) =>
  firstValue(
    item?.count_in_stock,
    item?.countInStock,
    item?.stock,
    item?.qty,
    item?.quantityInStock,
    item?.no_of_units,
    item?.purchase_qty
  );

const getInventoryStockDisplay = (item) =>
  formatStockQuantity(getInventoryStockQuantity(item));

const columns = [
  {
    key: 'product',
    label: 'Product',
    align: 'left',
    getValue: getInventoryProductDisplayName,
  },
  { key: 'sku', label: 'SKU', align: 'left', getValue: (item) => item.sku_id },
  {
    key: 'barcode',
    label: 'Barcode',
    align: 'left',
    getValue: (item) => item.bar_code,
  },
  {
    key: 'stock',
    label: 'Stock',
    align: 'right',
    type: 'number',
    getValue: getInventoryStockQuantity,
  },
  {
    key: 'warehouse',
    label: 'Warehouse',
    align: 'left',
    getValue: (item) => item.warehouse_id,
  },
  {
    key: 'expiry',
    label: 'Expiry',
    align: 'left',
    type: 'date',
    getValue: (item) => item.exp_date,
  },
];

const SortHeader = ({ column, sortConfig, onSort }) => (
  <th className={`p-3 ${column.align === 'right' ? 'text-right' : 'text-left'}`}>
    <button
      type="button"
      onClick={() => onSort(column.key)}
      className={`inline-flex w-full items-center gap-1 font-semibold hover:text-blue-700 ${
        column.align === 'right' ? 'justify-end' : 'justify-start'
      }`}
    >
      <span>{column.label}</span>
      <span className="text-xs">
        {sortConfig.key === column.key
          ? sortConfig.direction === 'asc'
            ? '^'
            : 'v'
          : '-'}
      </span>
    </button>
  </th>
);

const InventoryProductsTable = ({
  products = [],
  loading,
  warehouses = [],
  selectedWarehouseId = '',
  onWarehouseChange,
}) => {
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({
    key: 'product',
    direction: 'asc',
  });

  const filteredProducts = useMemo(() => {
    const value = search.toLowerCase();

    return products.filter((item) => {
      return (
        [
          getInventoryProductDisplayName(item),
          item.product_name,
          item.product_code,
          item.sku_id,
          item.bar_code,
          getInventoryBrandName(item),
        ]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(value))
      );
    });
  }, [products, search]);

  const sortedProducts = useMemo(
    () => sortRows(filteredProducts, sortConfig, columns),
    [filteredProducts, sortConfig]
  );

  const handleSort = (key) => {
    setSortConfig((current) => getNextSortConfig(current, key));
  };

  return (
    <section className="bg-white rounded-xl border shadow-sm p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <h2 className="font-bold text-lg">Inventory Products</h2>

        <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
          {onWarehouseChange ? (
            <select
              value={selectedWarehouseId}
              onChange={(e) => onWarehouseChange(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 md:w-56"
            >
              <option value="">All inventory</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.warehouse_name || warehouse.warehouse_code || warehouse.id}
                </option>
              ))}
            </select>
          ) : null}

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product / SKU / barcode"
            className="border rounded-lg px-3 py-2 w-full md:w-80"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading inventory...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                {columns.map((column) => (
                  <SortHeader
                    key={column.key}
                    column={column}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                ))}
              </tr>
            </thead>

            <tbody>
              {sortedProducts.map((item) => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{getInventoryProductDisplayName(item)}</td>
                  <td className="p-3">{item.sku_id}</td>
                  <td className="p-3">{item.bar_code || '-'}</td>
                  <td className="p-3 text-right font-semibold">
                    {getInventoryStockDisplay(item)}
                  </td>
                  <td className="p-3">{item.warehouse_id || '-'}</td>
                  <td className="p-3">
                    {item.exp_date
  ? String(item.exp_date).split('T')[0]
  : '-'}
                  </td>
                </tr>
              ))}

              {sortedProducts.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-4 text-center text-gray-500">
                    No inventory products found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default InventoryProductsTable;
