import React, { useMemo, useState } from 'react';

const PAYMENT_CHANNELS = [
  { key: 'Cash', label: 'Cash' },
  { key: 'UPI', label: 'UPI / QR' },
  { key: 'Card', label: 'Card' },
  { key: 'Swipe(CC)', label: 'Credit Card' },
  { key: 'Swipe(DC)', label: 'Debit Card' },
  { key: 'Swipe(FC)', label: 'Food Card' },
  { key: 'PLuxee', label: 'PLuxee' },
  { key: 'QR(HDFC)', label: 'QR (HDFC)' },
];

const money = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;

const normalizeAmount = (value) => {
  const cleaned = String(value || '').replace(/[^\d.]/g, '');
  const parts = cleaned.split('.');
  return parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
};

const isUpiChannel = (channel) => {
  const value = String(channel || '').toUpperCase();
  return value.includes('UPI') || value.includes('QR');
};

const MultiPaymentModal = ({
  total = 0,
  onCancel,
  onConfirm,
  onPayUpi,
  upiPaid = false,
  paymentLoading = false,
}) => {
  const payableTotal = Number(total || 0);
  const [rows, setRows] = useState([{ channel: 'Cash', amount: '' }]);

  const paidAmount = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    [rows]
  );
  const remaining = Number((payableTotal - paidAmount).toFixed(2));
  const overpaid = remaining < 0;
  const isComplete = Math.abs(remaining) < 0.01;
  const hasUpiPayment = rows.some(
    (row) => isUpiChannel(row.channel) && Number(row.amount || 0) > 0
  );

  const getPayments = () =>
    rows
      .map((row) => ({
        channel: row.channel,
        amount: Number(row.amount || 0),
      }))
      .filter((row) => row.channel && row.amount > 0);

  const updateRow = (index, patch) => {
    setRows((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row
      )
    );
  };

  const removeRow = (index) => {
    setRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
  };

  const addRow = () => {
    if (remaining <= 0) return;
    setRows((prev) => [
      ...prev,
      { channel: 'UPI', amount: remaining.toFixed(2) },
    ]);
  };

  const handleConfirm = () => {
    const payments = getPayments();

    if (!isComplete || overpaid || payments.length === 0 || (hasUpiPayment && !upiPaid)) {
      return;
    }

    onConfirm?.({
      payments,
      paidAmount: Number(paidAmount.toFixed(2)),
    });
  };

  const handlePayUpi = () => {
    const payments = getPayments();

    if (!isComplete || overpaid || payments.length === 0 || !hasUpiPayment) {
      return;
    }

    onPayUpi?.({
      payments,
      paidAmount: Number(paidAmount.toFixed(2)),
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 px-3">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-2xl">
        <div className="bg-[#ff8a00] px-5 py-4">
          <h2 className="text-lg font-bold text-white">Multi Payment</h2>
          <div className="mt-1 text-sm font-semibold text-orange-50">
            Bill Amount: {money(payableTotal)}
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="space-y-2">
            {rows.map((row, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2"
              >
                <select
                  value={row.channel}
                  onChange={(e) => updateRow(index, { channel: e.target.value })}
                  className="h-10 rounded-lg border border-gray-300 bg-white px-2 text-sm font-semibold outline-none"
                >
                  {PAYMENT_CHANNELS.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <input
                  value={row.amount}
                  inputMode="decimal"
                  onChange={(e) =>
                    updateRow(index, { amount: normalizeAmount(e.target.value) })
                  }
                  className="h-10 rounded-lg border border-gray-300 bg-white px-2 text-right text-sm font-semibold outline-none"
                  placeholder="Amount"
                />

                <button
                  type="button"
                  onClick={handlePayUpi}
                  disabled={
                    !isUpiChannel(row.channel) ||
                    Number(row.amount || 0) <= 0 ||
                    !isComplete ||
                    overpaid ||
                    upiPaid ||
                    paymentLoading
                  }
                  className="h-10 rounded-lg bg-green-600 px-3 text-sm font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {upiPaid && isUpiChannel(row.channel)
                    ? 'Paid'
                    : paymentLoading && isUpiChannel(row.channel)
                      ? 'Wait'
                      : 'Pay'}
                </button>

                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  disabled={rows.length === 1 || paymentLoading}
                  className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm font-bold text-gray-700 disabled:opacity-40"
                >
                  X
                </button>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-orange-100 bg-orange-50 p-3 text-sm font-semibold">
            <div className="flex justify-between">
              <span>Paid</span>
              <span>{money(paidAmount)}</span>
            </div>
            <div className={`mt-1 flex justify-between ${overpaid ? 'text-red-700' : 'text-gray-800'}`}>
              <span>{overpaid ? 'Overpaid' : 'Remaining'}</span>
              <span>{money(Math.abs(remaining))}</span>
            </div>
          </div>

          {remaining > 0.009 ? (
            <button
              type="button"
              onClick={addRow}
              className="w-full rounded-xl border border-orange-300 bg-white px-4 py-2.5 text-sm font-bold text-orange-700 hover:bg-orange-50"
            >
              Add Payment Channel
            </button>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t bg-gray-50 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isComplete || overpaid || (hasUpiPayment && !upiPaid) || paymentLoading}
            className="rounded-xl bg-[#ff8a00] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#e57b00] disabled:cursor-not-allowed disabled:bg-orange-300"
          >
            Confirm Multi Payment
          </button>
        </div>
      </div>
    </div>
  );
};

export default MultiPaymentModal;
