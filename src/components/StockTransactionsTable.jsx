import React, { useMemo, useState } from 'react';

import { formatStockQuantity } from '../utils/stockDisplay';
import { getNextSortConfig, sortRows } from '../utils/tableSort';

const columns = [
  { key: 'product', label: 'Product ID', align: 'left', getValue: (tx) => tx.product_id },
  { key: 'source', label: 'Source', align: 'left', getValue: (tx) => tx.source },
  {
    key: 'destination',
    label: 'Destination',
    align: 'left',
    getValue: (tx) => tx.destination,
  },
  { key: 'refType', label: 'Ref Type', align: 'left', getValue: (tx) => tx.ref_type },
  {
    key: 'qtyIn',
    label: 'Qty In',
    align: 'right',
    type: 'number',
    getValue: (tx) => tx.qty_in,
  },
  {
    key: 'qtyOut',
    label: 'Qty Out',
    align: 'right',
    type: 'number',
    getValue: (tx) => tx.qty_out,
  },
  {
    key: 'balance',
    label: 'Balance',
    align: 'right',
    type: 'number',
    getValue: (tx) => tx.balance_qty,
  },
  {
    key: 'date',
    label: 'Date',
    align: 'left',
    type: 'date',
    getValue: (tx) => tx.created_at,
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

const StockTransactionsTable = ({ transactions = [] }) => {
  const [sortConfig, setSortConfig] = useState({
    key: 'date',
    direction: 'desc',
  });

  const sortedTransactions = useMemo(
    () => sortRows(transactions, sortConfig, columns),
    [transactions, sortConfig]
  );

  const handleSort = (key) => {
    setSortConfig((current) => getNextSortConfig(current, key));
  };

  return (
    <section className="bg-white rounded-xl border shadow-sm p-4">
      <h2 className="font-bold text-lg mb-4">Stock Transactions</h2>

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
            {sortedTransactions.map((tx) => (
              <tr key={tx.id} className="border-b hover:bg-gray-50">
                <td className="p-3">{tx.product_id}</td>
                <td className="p-3">{tx.source}</td>
                <td className="p-3">{tx.destination}</td>
                <td className="p-3">{tx.ref_type}</td>
                <td className="p-3 text-right">{formatStockQuantity(tx.qty_in)}</td>
                <td className="p-3 text-right">{formatStockQuantity(tx.qty_out)}</td>
                <td className="p-3 text-right font-semibold">
                  {formatStockQuantity(tx.balance_qty)}
                </td>
                <td className="p-3">
                  {tx.created_at
                    ? new Date(tx.created_at).toLocaleString()
                    : '-'}
                </td>
              </tr>
            ))}

            {sortedTransactions.length === 0 && (
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
