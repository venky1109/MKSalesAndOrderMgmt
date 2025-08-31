// src/components/PhoneModal.js
import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

const PhoneModal = ({ onCancel, onConfirm }) => {
  const [raw, setRaw] = useState('');

  // keep only digits
  const digits = useMemo(() => (raw || '').replace(/\D+/g, ''), [raw]);
  const isValid = digits.length === 10;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-[1px] flex items-start justify-center pt-6 px-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="phone-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel?.();
      }}
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-4">
        <h2 id="phone-modal-title" className="text-lg font-bold mb-2 text-center">
          📱 Customer Mobile Number
        </h2>

        <p className="text-center text-sm text-slate-600 mb-3">
          Please enter a 10-digit mobile number
        </p>

        <input
          // numeric keypad on mobile
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          autoFocus
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          className="w-full border rounded p-2 text-center mb-2"
          placeholder="e.g. 9876543210"
          maxLength={14}
        />

        <div className="h-5 mb-3 text-center text-sm">
          {raw ? (
            isValid ? (
              <span className="text-green-700 font-medium">Looks good</span>
            ) : (
              <span className="text-red-600">Enter exactly 10 digits</span>
            )
          ) : null}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onConfirm?.(digits)}
            disabled={!isValid}
            className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            Continue
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

export default PhoneModal;
