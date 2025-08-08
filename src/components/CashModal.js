// src/components/CashModal.js
import React, { useState } from 'react';

const CashModal = ({ total, onCancel, onConfirm }) => {
  const [cashGiven, setCashGiven] = useState('');
  const change = parseFloat(cashGiven || 0) - total;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white p-4 rounded shadow-lg text-center w-80">
        <h2 className="text-xl font-bold mb-3">💰 Cash Payment</h2>
        <p className="mb-2">Total Amount: ₹{total}</p>
        <input
          type="number"
          value={cashGiven}
          onChange={(e) => setCashGiven(e.target.value)}
          className="border w-full p-2 mb-2"
          placeholder="Enter cash received"
        />
        <p className="mb-3 text-green-700 font-semibold">
          {cashGiven && change >= 0
            ? `Change: ₹${change}`
            : change < 0
            ? `❌ Not enough cash`
            : ''}
        </p>
        <div className="flex justify-between">
          <button
            onClick={() => onConfirm(parseFloat(cashGiven))}
            disabled={change < 0}
            className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Confirm
          </button>
          <button
            onClick={onCancel}
            className="bg-gray-500 text-white px-4 py-2 rounded"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CashModal;
