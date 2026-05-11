import React, { useEffect, useState } from 'react';

const makeSkuId = ({ productCode, expDate }) => {
  const code = String(productCode || 'MKP').replace(/\s+/g, '');
  const exp = expDate ? String(expDate).replaceAll('-', '') : 'NOEXP';
  return `${code}-${exp}`;
};

const VerifyItemInventoryModal = ({ open, item, onClose, onSave }) => {
  const [expDate, setExpDate] = useState('');
  const [mfgDate, setMfgDate] = useState('');
  const [skuId, setSkuId] = useState('');
  const [actualUnitPrice, setActualUnitPrice] = useState('');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (!open || !item) return;

    setExpDate(item.exp_date || '');
    setMfgDate(item.mfg_date || '');
    setSkuId(item.sku_id || '');
    setActualUnitPrice(
      item.actual_unit_price ?? item.expected_unit_price ?? item.unit_price ?? ''
    );
    setRemarks(item.inventory_remarks || '');
  }, [open, item]);

  if (!open || !item) return null;

  const productCode =
    item.product_code || item.productCode || `MKP${item.product_id || item.id}`;

  const autoSku = makeSkuId({
    productCode,
    expDate,
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!expDate) {
      alert('Expiry date is required');
      return;
    }

    if (actualUnitPrice === '' || Number(actualUnitPrice) < 0) {
      alert('Actual price/unit is required');
      return;
    }

    onSave({
      ...item,
      exp_date: expDate,
      mfg_date: mfgDate || null,
      sku_id: skuId || autoSku,
      actual_unit_price: Number(actualUnitPrice),
      inventory_remarks: remarks || null,
      is_verified: true,
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl">
        <div className="border-b px-5 py-4">
          <h2 className="text-lg font-bold text-gray-900">
            Verify Product Details
          </h2>
          <p className="text-sm text-gray-500">
            Enter expiry, SKU and actual price/unit before confirming.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div className="rounded-xl border bg-green-50 p-3">
            <div className="font-bold text-gray-900">
              {item.product_name || item.product_id}
            </div>
            <div className="mt-1 text-xs text-gray-600">
              Code: {productCode}
            </div>
            <div className="text-xs text-gray-600">
              MK Barcode: {item.mk_barcode || '-'}
            </div>
            <div className="text-xs text-gray-600">
              Qty: {Number(item.qty || 0).toFixed(3)}
            </div>
            <div className="text-xs text-gray-600">
              No. Units: {Number(item.no_of_units || 1)}
            </div>
            <div className="text-xs text-gray-600">
              Expected Price/Unit: ₹
              {Number(item.expected_unit_price || 0).toFixed(2)}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">
              Actual Price / Unit <span className="text-red-600">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={actualUnitPrice}
              onChange={(e) => setActualUnitPrice(e.target.value)}
              className="w-full rounded-xl border px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">
              Expiry Date <span className="text-red-600">*</span>
            </label>
            <input
              type="date"
              value={expDate}
              onChange={(e) => setExpDate(e.target.value)}
              className="w-full rounded-xl border px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">MFG Date</label>
            <input
              type="date"
              value={mfgDate || ''}
              onChange={(e) => setMfgDate(e.target.value)}
              className="w-full rounded-xl border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">SKU ID</label>
            <input
              value={skuId}
              onChange={(e) => setSkuId(e.target.value)}
              placeholder={autoSku}
              className="w-full rounded-xl border px-3 py-2"
            />
            <p className="mt-1 text-xs text-gray-500">
              Leave empty to use auto SKU: <b>{autoSku}</b>
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">Remarks</label>
            <input
              value={remarks || ''}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full rounded-xl border px-3 py-2"
              placeholder="Optional"
            />
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border px-4 py-2 font-semibold"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="rounded-xl bg-green-700 px-4 py-2 font-semibold text-white"
            >
              Confirm Product
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VerifyItemInventoryModal;