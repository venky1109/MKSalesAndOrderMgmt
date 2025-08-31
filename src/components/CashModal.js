// src/components/CashModal.js
import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

const CashModal = ({ total = 0, onCancel, onConfirm }) => {
  const [cashGiven, setCashGiven] = useState('');

  // Only digits allowed so mobile shows numeric keypad.
  const handleChange = (e) => {
    const v = e.target.value.replace(/[^\d]/g, ''); // keep digits only
    setCashGiven(v);
  };

  const numericCash = useMemo(() => Number(cashGiven || 0), [cashGiven]);
  const change = useMemo(() => numericCash - Number(total || 0), [numericCash, total]);
  const disableConfirm = Number.isNaN(numericCash) || change < 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-[1px] flex items-start justify-center pt-6 px-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cash-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel?.(); // click backdrop to close
      }}
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-4">
        <h2 id="cash-modal-title" className="text-lg font-bold mb-2 text-center">💰 Cash Payment</h2>

        <p className="text-center mb-3">
          Total Amount: <span className="font-semibold">₹{Number(total).toFixed(2)}</span>
        </p>

        <input
          // Use text + inputMode numeric so mobile shows numeric keypad
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoFocus
          value={cashGiven}
          onChange={handleChange}
          className="w-full border rounded p-2 text-center mb-2"
          placeholder="Enter cash received"
        />

        <p
          className={`mb-4 text-center font-semibold ${
            cashGiven
              ? change >= 0 ? 'text-green-700' : 'text-red-600'
              : 'text-slate-500'
          }`}
        >
          {cashGiven ? (change >= 0 ? `Change: ₹${change.toFixed(2)}` : '❌ Not enough cash') : ''}
        </p>

        <div className="flex gap-2">
          <button
            onClick={() => onConfirm?.(numericCash)}
            disabled={disableConfirm}
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            Confirm
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CashModal;
