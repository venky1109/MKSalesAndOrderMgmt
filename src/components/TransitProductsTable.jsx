import React, { useMemo, useState } from 'react';

import {
  formatDispatchDate,
  getDispatchItemBarcode,
  getDispatchItemBrand,
  getDispatchItemCategory,
  getDispatchItemProductName,
  getDispatchItemUnit,
} from '../utils/dispatchDisplay';

const statusClass = (status) => {
  const normalized = String(status || 'intransit').toLowerCase();

  if (normalized === 'reached' || normalized === 'received_to_outlet') {
    return 'bg-green-100 text-green-800';
  }

  if (normalized === 'cancelled') return 'bg-red-100 text-red-800';

  return 'bg-indigo-100 text-indigo-800';
};

const getTransitRows = (transitProducts, dispatchOrders) => {
  if (transitProducts?.length) {
    return transitProducts.flatMap((transit) => {
      const order =
        transit.dispatch_order ||
        transit.dispatchOrder ||
        dispatchOrders.find(
          (item) => String(item.id) === String(transit.dispatch_order_id)
        );

      const items = order?.items?.length ? order.items : [transit];

      return items.map((item) => ({
        id: `${transit.id || transit.dispatch_order_id}-${item.id || item.product_id || item.product_barcode_id || 'item'}`,
        dispatchNo: order?.dispatch_no || transit.dispatch_no || transit.dispatch_order_id,
        status: transit.transit_status || order?.dispatch_status || 'intransit',
        source: order?.source || transit.source || '-',
        destination: order?.destination || transit.destination || '-',
        product: getDispatchItemProductName(item) || transit.product_name || '-',
        barcode: getDispatchItemBarcode(item) || transit.bar_code || '-',
        brand: getDispatchItemBrand(item) || transit.brand || '-',
        category: getDispatchItemCategory(item) || transit.category || '-',
        qty: item.qty || item.quantity || transit.qty || transit.quantity || '-',
        unit: getDispatchItemUnit(item) || transit.unit || '-',
        expDate: item.exp_date || transit.exp_date,
        updatedAt: transit.updated_at || order?.updated_at || order?.created_at,
      }));
    });
  }

  return dispatchOrders
    .filter((order) =>
      ['sent', 'packed', 'dispatched'].includes(
        String(order.dispatch_status || '').toLowerCase()
      )
    )
    .flatMap((order) =>
      (order.items || []).map((item) => ({
        id: `${order.id}-${item.id || item.product_id || item.product_barcode_id}`,
        dispatchNo: order.dispatch_no || order.id,
        status: 'intransit',
        source: order.source || '-',
        destination: order.destination || '-',
        product: getDispatchItemProductName(item),
        barcode: getDispatchItemBarcode(item),
        brand: getDispatchItemBrand(item),
        category: getDispatchItemCategory(item),
        qty: item.qty || item.quantity || '-',
        unit: getDispatchItemUnit(item),
        expDate: item.exp_date,
        updatedAt: order.updated_at || order.created_at,
      }))
    );
};

const TransitProductsTable = ({
  transitProducts = [],
  dispatchOrders = [],
  loading = false,
}) => {
  const [search, setSearch] = useState('');

  const rows = useMemo(
    () => getTransitRows(transitProducts, dispatchOrders),
    [transitProducts, dispatchOrders]
  );

  const filteredRows = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return rows;

    return rows.filter((row) =>
      [
        row.dispatchNo,
        row.product,
        row.barcode,
        row.brand,
        row.category,
        row.source,
        row.destination,
        row.status,
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(value))
    );
  }, [rows, search]);

  return (
    <section className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-bold">Products In Transit</h2>
          <p className="text-sm text-gray-500">
            Items linked to dispatch orders before they reach destination stock.
          </p>
        </div>

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search dispatch / product / barcode"
          className="w-full rounded-lg border px-3 py-2 text-sm md:w-80"
        />
      </div>

      {loading ? (
        <p className="py-6 text-center text-gray-500">Loading transit products...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-3 text-left">Dispatch</th>
                <th className="p-3 text-left">Product</th>
                <th className="p-3 text-left">Barcode</th>
                <th className="p-3 text-left">Brand</th>
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-right">Qty</th>
                <th className="p-3 text-left">Unit</th>
                <th className="p-3 text-left">Route</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Expiry</th>
              </tr>
            </thead>

            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-semibold">{row.dispatchNo}</td>
                  <td className="p-3">{row.product || '-'}</td>
                  <td className="p-3">{row.barcode || '-'}</td>
                  <td className="p-3">{row.brand || '-'}</td>
                  <td className="p-3">{row.category || '-'}</td>
                  <td className="p-3 text-right font-semibold">{row.qty}</td>
                  <td className="p-3">{row.unit || '-'}</td>
                  <td className="p-3">
                    {row.source || '-'} to {row.destination || '-'}
                  </td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${statusClass(
                        row.status
                      )}`}
                    >
                      {String(row.status || 'intransit').replaceAll('_', ' ')}
                    </span>
                  </td>
                  <td className="p-3">{formatDispatchDate(row.expDate)}</td>
                </tr>
              ))}

              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan="10" className="p-4 text-center text-gray-500">
                    No products in transit found
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

export default TransitProductsTable;
