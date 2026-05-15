import React from 'react';
import { useDispatch } from 'react-redux';

import {
  updateInventoryDispatchStatus,
  deleteInventoryDispatchOrder,
  fetchInventoryDispatchOrders,
} from '../features/inventory/stockManagerInventorySlice';
import DispatchItemsTable from './DispatchItemsTable';
import {
  formatDispatchDate,
  getDispatchItemBarcode,
  getDispatchItemBrand,
  getDispatchItemCategory,
  getDispatchItemProductName,
  getDispatchItemUnit,
} from '../utils/dispatchDisplay';

const DispatchOrdersSection = ({ orders = [], loading = false }) => {
  const dispatch = useDispatch();

  const markStatus = async (id, status) => {
    try {
      await dispatch(
        updateInventoryDispatchStatus({
          id,
          dispatch_status: status,
        })
      ).unwrap();

      dispatch(fetchInventoryDispatchOrders());
    } catch (error) {
      alert(error?.message || error || 'Failed to update dispatch status');
    }
  };

  const deleteOrder = async (id) => {
    if (!window.confirm('Delete this draft dispatch?')) return;

    try {
      await dispatch(deleteInventoryDispatchOrder(id)).unwrap();
      dispatch(fetchInventoryDispatchOrders());
    } catch (error) {
      alert(error?.message || error || 'Failed to delete dispatch');
    }
  };

  const getStatusLabel = (status) => {
    const normalized = String(status || '').toLowerCase();

    if (normalized === 'received_to_outlet') return 'RECEIVED TO OUTLET';
    if (normalized === 'sent') return 'SENT';
    if (normalized === 'packed') return 'PACKED';
    if (normalized === 'dispatched') return 'DISPATCHED';

    return normalized.toUpperCase();
  };

  const printDispatch = (order) => {
    const rows = (order.items || [])
      .map(
        (item, index) => `
          <tr>
            <td class="text-center">${index + 1}</td>
            <td>${getDispatchItemBarcode(item)}</td>
            <td>${getDispatchItemProductName(item)}</td>
            <td>${getDispatchItemCategory(item)}</td>
            <td>${getDispatchItemBrand(item)}</td>
            <td class="text-center">${item.qty || ''}</td>
            <td class="text-center">${getDispatchItemUnit(item)}</td>
            <td>${formatDispatchDate(item.exp_date)}</td>
            <td>${item.notes || '-'}</td>
          </tr>
        `
      )
      .join('');

    const html = `
      <html>
        <head>
          <title>${order.dispatch_no || 'Dispatch Print'}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              font-size: 12px;
              color: #111827;
            }

            h2 {
              margin: 0 0 4px 0;
              font-size: 20px;
            }

            .subtitle {
              margin-bottom: 14px;
              color: #475569;
              font-size: 12px;
            }

            .meta {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 6px 16px;
              margin-bottom: 14px;
              padding: 10px;
              border: 1px solid #d1d5db;
              border-radius: 8px;
              background: #f8fafc;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 12px;
            }

            th,
            td {
              border: 1px solid #333;
              padding: 6px;
              text-align: left;
              vertical-align: top;
            }

            th {
              background: #f1f5f9;
              font-weight: bold;
            }

            .text-center {
              text-align: center;
            }

            .footer {
              margin-top: 45px;
              display: flex;
              justify-content: space-between;
              font-weight: bold;
            }

            @media print {
              body {
                padding: 10px;
              }

              button {
                display: none;
              }
            }
          </style>
        </head>

        <body>
          <h2>Inventory Dispatch</h2>
          <div class="subtitle">Dispatch copy for stock movement</div>

          <div class="meta">
            <div><b>Dispatch No:</b> ${order.dispatch_no || '-'}</div>
            <div><b>Status:</b> ${getStatusLabel(order.dispatch_status)}</div>
            <div><b>Source:</b> ${order.source || '-'}</div>
            <div><b>Destination:</b> ${order.destination || '-'}</div>
            <div><b>Expected:</b> ${
              order.expected_dispatch_at
                ? new Date(order.expected_dispatch_at).toLocaleString()
                : '-'
            }</div>
            <div><b>Notes:</b> ${order.dispatch_notes || '-'}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th class="text-center">S.No</th>
                <th>Barcode</th>
                <th>Product</th>
                <th>Category</th>
                <th>Brand</th>
                <th class="text-center">Qty</th>
                <th class="text-center">Unit</th>
                <th>Expiry</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${
                rows ||
                `<tr>
                  <td colspan="9" class="text-center">No items</td>
                </tr>`
              }
            </tbody>
          </table>

          <div class="footer">
            <div>Packed By: __________________</div>
            <div>Dispatched By: __________________</div>
          </div>

          <script>
            window.onload = function () {
              window.print();
              window.onafterprint = function () {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=1000,height=700');

    if (!printWindow) {
      alert('Please allow popups to print dispatch.');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <section className="rounded-2xl border bg-white p-4 shadow">
      <div className="mb-4 rounded-xl bg-indigo-50 p-3">
        <h2 className="text-lg font-bold text-indigo-900">
          Inventory Dispatch Orders
        </h2>
        <p className="text-sm text-indigo-700">
          Flow: Sent → Packed → Dispatched → Received To Outlet.
        </p>
      </div>

      {loading && (
        <div className="py-6 text-center text-gray-500">
          Loading dispatch orders...
        </div>
      )}

      {!loading && orders.length === 0 && (
        <div className="rounded-xl border border-dashed p-8 text-center text-gray-500">
          No dispatch orders found
        </div>
      )}

      <div className="space-y-4">
        {orders.map((order) => {
          const status = String(order.dispatch_status || '').toLowerCase();

          return (
            <article key={order.id} className="rounded-2xl border p-4 shadow-sm">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-900">
                      {order.dispatch_no}
                    </h3>
                    <StatusBadge status={order.dispatch_status} />
                  </div>

                  <p className="mt-1 text-sm text-gray-600">
                    <span className="font-semibold">Source:</span>{' '}
                    {order.source || '-'}
                  </p>

                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Destination:</span>{' '}
                    {order.destination || '-'}
                  </p>

                  {order.expected_dispatch_at && (
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">Expected:</span>{' '}
                      {new Date(order.expected_dispatch_at).toLocaleString()}
                    </p>
                  )}

                  {order.dispatch_notes && (
                    <p className="mt-1 text-sm text-gray-500">
                      Notes: {order.dispatch_notes}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => printDispatch(order)}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Print
                  </button>

                  {status === 'draft' && (
                    <>
                      <button
                        type="button"
                        onClick={() => markStatus(order.id, 'sent')}
                        className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
                      >
                        Mark Sent
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteOrder(order.id)}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </>
                  )}

                  {status === 'sent' && (
                    <button
                      type="button"
                      onClick={() => markStatus(order.id, 'packed')}
                      className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
                    >
                      Mark Packed
                    </button>
                  )}

                  {status === 'packed' && (
                    <button
                      type="button"
                      onClick={() => markStatus(order.id, 'dispatched')}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                    >
                      Mark Dispatched
                    </button>
                  )}

                  {status === 'dispatched' && (
                    <span className="rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-bold text-green-700">
                      Waiting POS Receive
                    </span>
                  )}

                  {!['cancelled', 'received_to_outlet'].includes(status) && (
                    <button
                      type="button"
                      onClick={() => markStatus(order.id, 'cancelled')}
                      className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 overflow-x-auto rounded-xl border">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left">Product</th>
                      <th className="px-3 py-2 text-left">Barcode</th>
                      <th className="px-3 py-2 text-left">Category</th>
                      <th className="px-3 py-2 text-left">Brand</th>
                      <th className="px-3 py-2 text-center">Qty</th>
                      <th className="px-3 py-2 text-center">Unit</th>
                      <th className="px-3 py-2 text-left">Expiry</th>
                      <th className="px-3 py-2 text-left">Notes</th>
                    </tr>
                  </thead>

                  <DispatchItemsTable items={order.items || []} />
                </table>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

const StatusBadge = ({ status }) => {
  const normalized = String(status || 'draft').toLowerCase();

  const cls =
    normalized === 'draft'
      ? 'bg-yellow-100 text-yellow-800'
      : normalized === 'sent'
      ? 'bg-purple-100 text-purple-800'
      : normalized === 'packed'
      ? 'bg-orange-100 text-orange-800'
      : normalized === 'dispatched'
      ? 'bg-indigo-100 text-indigo-800'
      : normalized === 'received_to_outlet'
      ? 'bg-green-100 text-green-800'
      : normalized === 'cancelled'
      ? 'bg-red-100 text-red-800'
      : 'bg-gray-100 text-gray-800';

  const label =
    normalized === 'received_to_outlet'
      ? 'RECEIVED TO OUTLET'
      : normalized.toUpperCase();

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${cls}`}>
      {label}
    </span>
  );
};

export default DispatchOrdersSection;
