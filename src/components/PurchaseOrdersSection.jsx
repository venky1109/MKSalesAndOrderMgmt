import React from 'react';

const PurchaseOrdersSection = ({ purchaseOrders = [] }) => {
  return (
    <section className="bg-white rounded-xl border shadow-sm p-4">
      <h2 className="font-bold text-lg mb-4">Purchase Orders</h2>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="text-left p-3">PO Number</th>
              <th className="text-left p-3">Supplier</th>
              <th className="text-left p-3">Warehouse</th>
              <th className="text-left p-3">Status</th>
              <th className="text-right p-3">Amount</th>
              <th className="text-left p-3">Order Date</th>
            </tr>
          </thead>

          <tbody>
            {purchaseOrders.map((po) => (
              <tr key={po.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium">{po.po_number}</td>
                <td className="p-3">{po.supplier_id}</td>
                <td className="p-3">{po.warehouse_id}</td>
                <td className="p-3">
                  <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs">
                    {po.status}
                  </span>
                </td>
                <td className="p-3 text-right">
                  ₹{Number(po.total_amount || 0).toFixed(2)}
                </td>
                <td className="p-3">
                  {po.order_date
                    ? new Date(po.order_date).toLocaleDateString()
                    : '-'}
                </td>
              </tr>
            ))}

            {purchaseOrders.length === 0 && (
              <tr>
                <td colSpan="6" className="p-4 text-center text-gray-500">
                  No purchase orders found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default PurchaseOrdersSection;