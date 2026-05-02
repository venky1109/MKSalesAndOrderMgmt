import React from 'react';

const StockTransactionsTable = ({ transactions = [] }) => {
  return (
    <section className="bg-white rounded-xl border shadow-sm p-4">
      <h2 className="font-bold text-lg mb-4">Stock Transactions</h2>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="text-left p-3">Product ID</th>
              <th className="text-left p-3">Source</th>
              <th className="text-left p-3">Destination</th>
              <th className="text-left p-3">Ref Type</th>
              <th className="text-right p-3">Qty In</th>
              <th className="text-right p-3">Qty Out</th>
              <th className="text-right p-3">Balance</th>
              <th className="text-left p-3">Date</th>
            </tr>
          </thead>

          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id} className="border-b hover:bg-gray-50">
                <td className="p-3">{tx.product_id}</td>
                <td className="p-3">{tx.source}</td>
                <td className="p-3">{tx.destination}</td>
                <td className="p-3">{tx.ref_type}</td>
                <td className="p-3 text-right">{tx.qty_in}</td>
                <td className="p-3 text-right">{tx.qty_out}</td>
                <td className="p-3 text-right font-semibold">{tx.balance_qty}</td>
                <td className="p-3">
                  {tx.created_at
                    ? new Date(tx.created_at).toLocaleString()
                    : '-'}
                </td>
              </tr>
            ))}

            {transactions.length === 0 && (
              <tr>
                <td colSpan="8" className="p-4 text-center text-gray-500">
                  No stock transactions found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default StockTransactionsTable;