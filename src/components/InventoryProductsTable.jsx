import React, { useMemo, useState } from 'react';

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

const InventoryProductsTable = ({
  products = [],
  loading,
  warehouses = [],
  selectedWarehouseId = '',
  onWarehouseChange,
}) => {
  const [search, setSearch] = useState('');

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
                <th className="text-left p-3">Product</th>
                <th className="text-left p-3">SKU</th>
                <th className="text-left p-3">Barcode</th>
                <th className="text-right p-3">Stock</th>
                <th className="text-left p-3">Warehouse</th>
                <th className="text-left p-3">Expiry</th>
              </tr>
            </thead>

            <tbody>
              {filteredProducts.map((item) => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{getInventoryProductDisplayName(item)}</td>
                  <td className="p-3">{item.sku_id}</td>
                  <td className="p-3">{item.bar_code || '-'}</td>
                  <td className="p-3 text-right font-semibold">
                    {Number(item.count_in_stock || 0).toFixed(2)}
                  </td>
                  <td className="p-3">{item.warehouse_id || '-'}</td>
                  <td className="p-3">
                    {item.exp_date
  ? String(item.exp_date).split('T')[0]
  : '-'}
                  </td>
                </tr>
              ))}

              {filteredProducts.length === 0 && (
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
