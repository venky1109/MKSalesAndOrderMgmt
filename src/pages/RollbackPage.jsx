import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import StockManagerLayout from '../components/StockManagerLayout';
import {
  clearStockManagerMessage,
  fetchInventoryDispatchOrders,
  fetchInventoryProducts,
  fetchPurchaseOrders,
  fetchStockTransactions,
  rollbackInventoryDispatch,
  rollbackPurchaseInventory,
} from '../features/inventory/stockManagerInventorySlice';

const getStatus = (value) => String(value || '').trim().toLowerCase();

const getDestinationType = (order = {}) =>
  String(order.destination || '').split(':')[0].trim().toLowerCase();

const canRollbackDispatch = (order = {}) =>
  ['dispatched', 'received_to_outlet', 'received_by_stakeholder'].includes(
    getStatus(order.dispatch_status)
  );

const formatDropdownDate = (value) => {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const RollbackPage = () => {
  const dispatch = useDispatch();
  const [purchaseOrderId, setPurchaseOrderId] = useState('');
  const [dispatchOrderId, setDispatchOrderId] = useState('');
  const [stakeholderType, setStakeholderType] = useState('');
  const [reason, setReason] = useState('');
  const [purchaseQtyByKey, setPurchaseQtyByKey] = useState({});
  const [dispatchQtyByKey, setDispatchQtyByKey] = useState({});

  const { userInfo } = useSelector((state) => state.posUser || {});
  const {
    purchaseOrders = [],
    inventoryDispatchOrders = [],
    loading = false,
    inventoryDispatchLoading = false,
    error,
    successMessage,
    inventoryDispatchError,
    inventoryDispatchSuccess,
  } = useSelector((state) => state.stockManagerInventory || {});

  useEffect(() => {
    if (userInfo?.token) {
      dispatch(fetchPurchaseOrders());
      dispatch(fetchInventoryDispatchOrders());
      dispatch(fetchInventoryProducts());
    }
  }, [dispatch, userInfo?.token]);

  useEffect(() => {
    if (error || successMessage || inventoryDispatchError || inventoryDispatchSuccess) {
      const timer = setTimeout(() => dispatch(clearStockManagerMessage()), 3500);
      return () => clearTimeout(timer);
    }
  }, [dispatch, error, successMessage, inventoryDispatchError, inventoryDispatchSuccess]);

  const rollbackablePurchases = useMemo(
    () =>
      purchaseOrders.filter((order) =>
        ['received', 'verified'].includes(getStatus(order.status))
      ),
    [purchaseOrders]
  );

  const rollbackableDispatches = useMemo(
    () => inventoryDispatchOrders.filter(canRollbackDispatch),
    [inventoryDispatchOrders]
  );

  const selectedDispatch = rollbackableDispatches.find(
    (order) => String(order.id) === String(dispatchOrderId)
  );
  const selectedPurchase = rollbackablePurchases.find(
    (order) => String(order.id) === String(purchaseOrderId)
  );

  const getPurchaseItemKey = (item) =>
    String(item.id || item.product_barcode_id || item.mk_barcode || item.barcode);

  const getDispatchItemKey = (item) =>
    String(item.id || item.inventory_product_id || item.product_barcode_id || item.mk_barcode);

  const productName = (item = {}) =>
    item.product_name ||
    item.product_name_eng ||
    item.productName ||
    item.name ||
    `Product ${item.product_barcode_id || item.id || ''}`;

  const productUnit = (item = {}) => {
    const qty =
      item.barcode_quantity ??
      item.quantity ??
      item.qty ??
      item.catalog_quantity ??
      '';
    const unit =
      item.unit_short_code ||
      item.unit_name ||
      item.unit_code ||
      item.units ||
      '';

    return [qty, unit].filter(Boolean).join(' ');
  };

  const barcode = (item = {}) => item.mk_barcode || item.MK_BARCODE || item.barcode || '-';

  const maxQty = (item = {}) =>
    Number(item.no_of_units || item.qty || item.quantity || item.count_in_stock || 0);

  const selectedPurchaseItems = (selectedPurchase?.items || []).filter(
    (item) => Number(purchaseQtyByKey[getPurchaseItemKey(item)] || 0) > 0
  );

  const selectedDispatchItems = (selectedDispatch?.items || []).filter(
    (item) => Number(dispatchQtyByKey[getDispatchItemKey(item)] || 0) > 0
  );

  useEffect(() => {
    setPurchaseQtyByKey({});
  }, [purchaseOrderId]);

  useEffect(() => {
    setDispatchQtyByKey({});
  }, [dispatchOrderId]);

  const rollbackPurchase = async () => {
    if (!purchaseOrderId) {
      alert('Please select a purchase order');
      return;
    }

    if (!selectedPurchaseItems.length) {
      alert('Please enter quantity for at least one purchase product');
      return;
    }

    if (!window.confirm('Rollback selected purchase product quantities? This is allowed only if stock is not dispatched.')) {
      return;
    }

    try {
      await dispatch(
        rollbackPurchaseInventory({
          purchaseOrderId,
          reason: reason || 'Purchase rollback from Rollback page',
          items: selectedPurchaseItems.map((item) => ({
            product_barcode_id: item.product_barcode_id,
            MK_BARCODE: barcode(item),
            qty: Number(purchaseQtyByKey[getPurchaseItemKey(item)] || 0),
            no_of_units: Number(purchaseQtyByKey[getPurchaseItemKey(item)] || 0),
          })),
        })
      ).unwrap();

      setPurchaseOrderId('');
      setPurchaseQtyByKey({});
      dispatch(fetchPurchaseOrders());
      dispatch(fetchInventoryProducts());
      dispatch(fetchStockTransactions());
    } catch (rollbackError) {
      alert(rollbackError?.message || rollbackError || 'Purchase rollback failed');
    }
  };

  const rollbackDispatch = async () => {
    if (!dispatchOrderId) {
      alert('Please select a dispatch order');
      return;
    }

    if (!selectedDispatchItems.length) {
      alert('Please enter quantity for at least one dispatch product');
      return;
    }

    const selectedType = stakeholderType || getDestinationType(selectedDispatch);
    if (!selectedType) {
      alert('Please select stakeholder type');
      return;
    }

    if (
      !window.confirm(
        selectedType === 'outlet'
          ? 'Rollback outlet dispatch? Mongo stock will be removed and inventory stock will be restored.'
          : 'Rollback dispatch? Inventory stock will be restored.'
      )
    ) {
      return;
    }

    try {
      await dispatch(
        rollbackInventoryDispatch({
          dispatchOrderId,
          stakeholder_type: selectedType,
          reason: reason || 'Dispatch rollback from Rollback page',
          items: selectedDispatchItems.map((item) => ({
            dispatch_order_item_id: item.id,
            inventory_product_id: item.inventory_product_id,
            product_barcode_id: item.product_barcode_id,
            MK_BARCODE: barcode(item),
            qty: Number(dispatchQtyByKey[getDispatchItemKey(item)] || 0),
            no_of_units: Number(dispatchQtyByKey[getDispatchItemKey(item)] || 0),
          })),
        })
      ).unwrap();

      setDispatchOrderId('');
      setStakeholderType('');
      setDispatchQtyByKey({});
      dispatch(fetchInventoryDispatchOrders());
      dispatch(fetchInventoryProducts());
      dispatch(fetchStockTransactions());
    } catch (rollbackError) {
      alert(rollbackError?.message || rollbackError || 'Dispatch rollback failed');
    }
  };

  return (
    <StockManagerLayout>
      <main className="space-y-4 p-4">
        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">Rollback</h1>
          <p className="text-sm text-gray-500">
            Reverse purchase inventory or dispatch movement using MK_BARCODE as the product key.
          </p>
        </section>

        {(error || inventoryDispatchError) && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-red-700">
            {error || inventoryDispatchError}
          </div>
        )}

        {(successMessage || inventoryDispatchSuccess) && (
          <div className="rounded-lg bg-green-50 px-4 py-3 text-green-700">
            {successMessage || inventoryDispatchSuccess}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Rollback Purchase / Inventory</h2>
            <p className="mt-1 text-sm text-gray-500">
              Removes stock created from a purchase order when that stock has not moved into dispatch.
            </p>

            <label className="mt-4 block text-sm font-semibold text-gray-700">
              Purchase Order
            </label>
            <select
              value={purchaseOrderId}
              onChange={(event) => setPurchaseOrderId(event.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">Select purchase order</option>
              {rollbackablePurchases.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.po_number || `PO ${order.id}`} -{' '}
                  {order.supplier_name || order.stakeholder_name || order.supplier_code || 'SH'} -{' '}
                  {formatDropdownDate(
                    order.order_date || order.arrived_date || order.expected_date || order.created_at
                  )}{' '}
                  -{' '}
                  {order.status}
                </option>
              ))}
            </select>

            {selectedPurchase ? (
              <RollbackItemsTable
                items={selectedPurchase.items || []}
                qtyByKey={purchaseQtyByKey}
                setQtyByKey={setPurchaseQtyByKey}
                getKey={getPurchaseItemKey}
                productName={productName}
                productUnit={productUnit}
                barcode={barcode}
                maxQty={maxQty}
                emptyText="No products in this purchase order"
              />
            ) : null}

            <button
              type="button"
              onClick={rollbackPurchase}
              disabled={loading}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Rollback Selected Purchase
            </button>
          </div>

          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Rollback Dispatch</h2>
            <p className="mt-1 text-sm text-gray-500">
              For outlet dispatch, Mongo stock is reduced and the same stock returns to inventory.
            </p>

            <label className="mt-4 block text-sm font-semibold text-gray-700">
              Dispatch Order
            </label>
            <select
              value={dispatchOrderId}
              onChange={(event) => {
                const nextId = event.target.value;
                setDispatchOrderId(nextId);
                const nextOrder = rollbackableDispatches.find(
                  (order) => String(order.id) === String(nextId)
                );
                setStakeholderType(getDestinationType(nextOrder));
              }}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">Select dispatch order</option>
              {rollbackableDispatches.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.dispatch_no || `Dispatch ${order.id}`} -{' '}
                  {formatDropdownDate(
                    order.expected_dispatch_at || order.created_at || order.updated_at
                  )}{' '}
                  - {order.dispatch_status} -{' '}
                  {order.destination || '-'}
                </option>
              ))}
            </select>

            {selectedDispatch ? (
              <RollbackItemsTable
                items={selectedDispatch.items || []}
                qtyByKey={dispatchQtyByKey}
                setQtyByKey={setDispatchQtyByKey}
                getKey={getDispatchItemKey}
                productName={productName}
                productUnit={productUnit}
                barcode={barcode}
                maxQty={maxQty}
                emptyText="No products in this dispatch order"
              />
            ) : null}

            <label className="mt-4 block text-sm font-semibold text-gray-700">
              Stakeholder Type
            </label>
            <select
              value={stakeholderType}
              onChange={(event) => setStakeholderType(event.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">Select type</option>
              <option value="outlet">Outlet</option>
              <option value="vendor">Vendor</option>
              <option value="customer">Customer</option>
              <option value="stakeholder">Stakeholder</option>
            </select>

            <button
              type="button"
              onClick={rollbackDispatch}
              disabled={inventoryDispatchLoading}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Rollback Selected Dispatch
            </button>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <label className="block text-sm font-semibold text-gray-700">Reason</label>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="Optional reason for audit notes"
          />
        </section>
      </main>
    </StockManagerLayout>
  );
};

const RollbackItemsTable = ({
  items,
  qtyByKey,
  setQtyByKey,
  getKey,
  productName,
  productUnit,
  barcode,
  maxQty,
  emptyText,
}) => (
  <div className="mt-4 overflow-x-auto rounded-lg border">
    <table className="min-w-full text-sm">
      <thead className="bg-gray-50 text-gray-700">
        <tr>
          <th className="px-3 py-2 text-left">Product</th>
          <th className="px-3 py-2 text-left">MK Barcode</th>
          <th className="px-3 py-2 text-right">Available Qty</th>
          <th className="px-3 py-2 text-right">Rollback Qty</th>
        </tr>
      </thead>
      <tbody>
        {items.length === 0 ? (
          <tr>
            <td className="px-3 py-4 text-center text-gray-500" colSpan={4}>
              {emptyText}
            </td>
          </tr>
        ) : (
          items.map((item) => {
            const key = getKey(item);
            const available = maxQty(item);

            return (
              <tr key={key} className="border-t">
                <td className="px-3 py-2 font-semibold text-gray-900">
                  <div>{productName(item)}</div>
                  {productUnit(item) ? (
                    <div className="text-xs font-medium text-gray-500">
                      {productUnit(item)}
                    </div>
                  ) : null}
                </td>
                <td className="px-3 py-2">{barcode(item)}</td>
                <td className="px-3 py-2 text-right">{available}</td>
                <td className="px-3 py-2 text-right">
                  <input
                    type="number"
                    min="0"
                    max={available}
                    step="0.001"
                    value={qtyByKey[key] || ''}
                    onChange={(event) => {
                      const value = Number(event.target.value || 0);
                      const nextValue = Math.max(0, Math.min(value, available));

                      setQtyByKey((current) => ({
                        ...current,
                        [key]: nextValue || '',
                      }));
                    }}
                    className="w-28 rounded-lg border px-2 py-1 text-right"
                    placeholder="0"
                  />
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  </div>
);

export default RollbackPage;
