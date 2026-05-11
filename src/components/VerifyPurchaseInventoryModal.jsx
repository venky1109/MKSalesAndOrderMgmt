import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  receiveVerifiedPurchaseToInventory,
} from '../features/inventory/inventoryMovementSlice';

const makeBatchId = () => {
  const d = new Date();
  const ymd = d.toISOString().slice(0, 10).replaceAll('-', '');
  const time = String(d.getTime()).slice(-5);
  return Number(`${ymd}${time}`);
};

const makeSkuId = ({ productCode, batchId, expDate }) => {
  const code = String(productCode || 'MKP').replace(/\s+/g, '');
  const exp = expDate ? String(expDate).replaceAll('-', '') : 'NOEXP';
  return `${code}-B${batchId}-${exp}`;
};

const VerifyPurchaseInventoryModal = ({
  open,
  onClose,
  purchaseOrder,
  items = [],
  onSuccess,
}) => {
  const dispatch = useDispatch();

  const { loading } = useSelector((state) => state.inventoryMovement || {});

  const [batchId, setBatchId] = useState('');
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (!open) return;

    const commonBatchId = makeBatchId();
    setBatchId(commonBatchId);

    setRows(
      items.map((item) => {
        const productCode =
          item.product_code ||
          item.productCode ||
          `MKP${item.product_id || item.id}`;

        return {
          ...item,
          product_code: productCode,
          sku_id: '',
          mfg_date: '',
          exp_date: '',
          remarks: '',
        };
      })
    );
  }, [open, items]);

  if (!open) return null;

  const updateRow = (index, field, value) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!batchId) {
      alert('Batch ID is required');
      return;
    }

    for (const row of rows) {
      if (!row.exp_date) {
        alert(`Please enter expiry date for ${row.product_name || row.product_id}`);
        return;
      }

      if (!row.product_id) {
        alert(`Product ID missing for ${row.product_name || 'item'}`);
        return;
      }
    }

    for (const row of rows) {
      const finalSku =
        row.sku_id ||
        makeSkuId({
          productCode: row.product_code,
          batchId,
          expDate: row.exp_date,
        });

      const payload = {
        purchase_order_id: purchaseOrder.id,
        purchase_order_item_id: row.id,
        product_id: row.product_id,
        batch_id: batchId,
        sku_id: finalSku,
        warehouse_id: purchaseOrder.warehouse_id,
        supplier_id: purchaseOrder.supplier_id || purchaseOrder.stakeholders_id,
        stakeholders_id: purchaseOrder.stakeholders_id || purchaseOrder.supplier_id,
        qty: Number(row.qty || 0),
        unit_price: Number(row.actual_unit_price || row.expected_unit_price || 0),
        mfg_date: row.mfg_date || null,
        exp_date: row.exp_date,
        remarks: row.remarks || purchaseOrder.remarks || null,
      };

      const result = await dispatch(receiveVerifiedPurchaseToInventory(payload));

      if (receiveVerifiedPurchaseToInventory.rejected.match(result)) {
        alert(result.payload || 'Inventory update failed');
        return;
      }
    }

    onSuccess?.();
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 border-b bg-white px-5 py-4">
          <h2 className="text-lg font-bold text-gray-900">
            Add Verified Purchase Items To Inventory
          </h2>
          <p className="text-sm text-gray-500">
            Batch ID is common for all items. Expiry date is required for each product.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          <div className="mb-4 grid grid-cols-1 gap-4 rounded-xl border bg-green-50 p-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                PO Number
              </label>
              <div className="rounded border bg-white px-3 py-2 text-sm font-semibold">
                {purchaseOrder?.po_number || purchaseOrder?.id}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Warehouse
              </label>
              <div className="rounded border bg-white px-3 py-2 text-sm font-semibold">
                {purchaseOrder?.warehouse_name || purchaseOrder?.warehouse_id}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Batch ID For All Items
              </label>
              <input
                type="number"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                className="w-full rounded border px-3 py-2 text-sm"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Auto generated. You can edit before saving.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-2 text-left">Product</th>
                  <th className="p-2 text-right">Qty</th>
                  <th className="p-2 text-right">Price</th>
                  <th className="p-2 text-left">MFG Date</th>
                  <th className="p-2 text-left">Expiry Date</th>
                  <th className="p-2 text-left">SKU ID</th>
                  <th className="p-2 text-left">Remarks</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row, index) => {
                  const autoSku = makeSkuId({
                    productCode: row.product_code,
                    batchId,
                    expDate: row.exp_date,
                  });

                  return (
                    <tr key={row.id || index} className="border-t">
                      <td className="p-2">
                        <div className="font-semibold">
                          {row.product_name || row.product_id}
                        </div>
                        <div className="text-xs text-gray-500">
                          Code: {row.product_code || '-'}
                        </div>
                        <div className="text-xs text-gray-500">
                          MK: {row.mk_barcode || '-'}
                        </div>
                      </td>

                      <td className="p-2 text-right">
                        {Number(row.qty || 0).toFixed(3)}
                      </td>

                      <td className="p-2 text-right">
                        ₹
                        {Number(
                          row.actual_unit_price || row.expected_unit_price || 0
                        ).toFixed(2)}
                      </td>

                      <td className="p-2">
                        <input
                          type="date"
                          value={row.mfg_date}
                          onChange={(e) =>
                            updateRow(index, 'mfg_date', e.target.value)
                          }
                          className="w-40 rounded border px-2 py-1"
                        />
                      </td>

                      <td className="p-2">
                        <input
                          type="date"
                          value={row.exp_date}
                          onChange={(e) =>
                            updateRow(index, 'exp_date', e.target.value)
                          }
                          className="w-40 rounded border px-2 py-1"
                          required
                        />
                      </td>

                      <td className="p-2">
                        <input
                          value={row.sku_id}
                          onChange={(e) =>
                            updateRow(index, 'sku_id', e.target.value)
                          }
                          placeholder={autoSku}
                          className="w-72 rounded border px-2 py-1"
                        />
                        <div className="mt-1 text-xs text-gray-500">
                          Auto: {autoSku}
                        </div>
                      </td>

                      <td className="p-2">
                        <input
                          value={row.remarks}
                          onChange={(e) =>
                            updateRow(index, 'remarks', e.target.value)
                          }
                          className="w-56 rounded border px-2 py-1"
                          placeholder="Optional"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border px-4 py-2 font-semibold"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-green-700 px-4 py-2 font-semibold text-white disabled:opacity-60"
            >
              {loading ? 'Updating Inventory...' : 'Add To Inventory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VerifyPurchaseInventoryModal;