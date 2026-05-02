import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  receivePurchaseOrder,
  fetchInventoryProducts,
  fetchPurchaseOrders,
  fetchStockTransactions,
} from '../features/inventory/stockManagerInventorySlice';

const ReceivePurchaseOrderSection = ({ purchaseOrders = [] }) => {
  const dispatch = useDispatch();
  const { receiving } = useSelector((state) => state.stockManagerInventory);

  const [purchaseOrderId, setPurchaseOrderId] = useState('');
  const [remarks, setRemarks] = useState('');

  const handleReceive = async (e) => {
    e.preventDefault();

    if (!purchaseOrderId) {
      alert('Please select purchase order');
      return;
    }

    await dispatch(
      receivePurchaseOrder({
        purchaseOrderId: Number(purchaseOrderId),
        remarks,
      })
    );

    dispatch(fetchInventoryProducts());
    dispatch(fetchPurchaseOrders());
    dispatch(fetchStockTransactions());

    setPurchaseOrderId('');
    setRemarks('');
  };

  return (
    <section className="bg-white rounded-xl border shadow-sm p-4">
      <h2 className="font-bold text-lg mb-4">Receive Purchase Order</h2>

      <form onSubmit={handleReceive} className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <select
          value={purchaseOrderId}
          onChange={(e) => setPurchaseOrderId(e.target.value)}
          className="border rounded-lg px-3 py-2"
        >
          <option value="">Select Purchase Order</option>
          {purchaseOrders.map((po) => (
            <option key={po.id} value={po.id}>
              {po.po_number} - {po.status}
            </option>
          ))}
        </select>

        <input
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Remarks"
          className="border rounded-lg px-3 py-2 md:col-span-2"
        />

        <button
          type="submit"
          disabled={receiving}
          className="bg-green-700 text-white rounded-lg px-4 py-2 disabled:bg-gray-400"
        >
          {receiving ? 'Receiving...' : 'Receive Stock'}
        </button>
      </form>
    </section>
  );
};

export default ReceivePurchaseOrderSection;