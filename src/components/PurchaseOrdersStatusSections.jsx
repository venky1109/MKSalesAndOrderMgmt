import React, { useRef, useState } from 'react';
import { useDispatch } from 'react-redux';

import {
  updatePurchaseOrder,
  updatePurchaseOrderItems,
  verifyReceivedPurchaseOrder,
  fetchPurchaseOrders,
} from '../features/inventory/stockManagerInventorySlice';

const STATUSES = ['draft', 'sent', 'intransit', 'received', 'verified'];

const STATUS_STYLES = {
  draft: {
    section: 'bg-slate-50 border-slate-300',
    header: 'bg-slate-100 text-slate-800',
    badge: 'bg-slate-200 text-slate-800',
  },
  sent: {
    section: 'bg-blue-50 border-blue-300',
    header: 'bg-blue-100 text-blue-800',
    badge: 'bg-blue-200 text-blue-800',
  },
  intransit: {
    section: 'bg-orange-50 border-orange-300',
    header: 'bg-orange-100 text-orange-800',
    badge: 'bg-orange-200 text-orange-800',
  },
  received: {
    section: 'bg-yellow-50 border-yellow-300',
    header: 'bg-yellow-100 text-yellow-800',
    badge: 'bg-yellow-200 text-yellow-800',
  },
  verified: {
    section: 'bg-green-50 border-green-300',
    header: 'bg-green-100 text-green-800',
    badge: 'bg-green-200 text-green-800',
  },
};

const getBrandName = (p) =>
  p?.brand_name_english ||
  p?.brand_name_englishh ||
  p?.brand_name_telugu ||
  p?.brand_name ||
  '';

const PurchaseOrdersStatusSections = ({
  purchaseOrders = [],
  productBarcodes = [],
}) => {
  const dispatch = useDispatch();

  const [openOrderId, setOpenOrderId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingItemsId, setEditingItemsId] = useState(null);
  const [verifyingId, setVerifyingId] = useState(null);

  const [form, setForm] = useState({});
  const [editedItems, setEditedItems] = useState([]);
  const [verifyItems, setVerifyItems] = useState([]);
  const [verifyRemarks, setVerifyRemarks] = useState('');
  const [scanBarcode, setScanBarcode] = useState('');

  const rowRefs = useRef({});

  const grouped = STATUSES.reduce((acc, status) => {
    acc[status] = purchaseOrders.filter(
      (po) => String(po.status || '').toLowerCase() === status
    );
    return acc;
  }, {});

  const canEditStatus = (status) =>
    ['draft', 'sent', 'intransit'].includes(String(status || '').toLowerCase());

  const canEditItems = (status) =>
    String(status || '').toLowerCase() === 'draft';

  const normalizeBarcode = (value) =>
    String(value || '').trim().replace(/\s+/g, '');

  const getItemBarcodes = (item) =>
    [
      item.mk_barcode,
      item.barcode,
      item.product_barcode,
      item.vendor_barcode,
      item.supplier_barcode,
    ]
      .map((code) => normalizeBarcode(code))
      .filter(Boolean);

  const getProductBarcodeId = (item) => {
    if (item.product_barcode_id) return item.product_barcode_id;

    const matched = productBarcodes.find(
      (p) =>
        String(p.product_id) === String(item.product_id) &&
        String(p.brand_id) === String(item.brand_id) &&
        String(p.category_id) === String(item.category_id) &&
        String(p.unit_id) === String(item.unit_id)
    );

    return matched?.id || '';
  };

  const getDisplayItems = (po) => {
    if (Array.isArray(po.items) && po.items.length > 0) return po.items;

    if (Array.isArray(po.bill_details?.items)) {
      return po.bill_details.items.map((item, index) => ({
        id: item.id || `bill-${index}`,
        product_id: item.product_id,
        product_name: item.product_name || `Product ${item.product_id}`,
        product_code: item.product_code || '-',
        mk_barcode: item.mk_barcode || '',
        barcode: item.barcode || '',
        category_id: item.category_id,
        category_name: item.category_name || '-',
        brand_id: item.brand_id,
        brand_name: item.brand_name || '-',
        unit_id: item.unit_id,
        unit_name: item.unit_name || '-',
        unit_short_code: item.unit_short_code || '',
        qty: item.qty,
        no_of_units: item.no_of_units || 1,
        expected_unit_price:
          item.expected_unit_price || item.unit_price || item.price || 0,
        actual_unit_price: item.actual_unit_price ?? null,
        is_verified: Boolean(item.is_verified),
      }));
    }

    return [];
  };

  const getEffectivePrice = (item) =>
    item.actual_unit_price !== null && item.actual_unit_price !== undefined
      ? Number(item.actual_unit_price)
      : Number(item.expected_unit_price || 0);

  const startEditStatus = (po) => {
    setEditingId(po.id);
    setForm({
      status: po.status || 'draft',
      expected_date: po.expected_date
        ? String(po.expected_date).slice(0, 10)
        : '',
      arrived_date: po.arrived_date ? String(po.arrived_date).slice(0, 10) : '',
      remarks: po.remarks || '',
    });
  };

  const cancelEditStatus = () => {
    setEditingId(null);
    setForm({});
  };

  const saveStatus = async (po) => {
    await dispatch(
      updatePurchaseOrder({
        id: po.id,
        payload: {
          status: form.status,
          expected_date: form.expected_date || null,
          arrived_date: form.arrived_date || null,
          remarks: form.remarks || null,
        },
      })
    );

    dispatch(fetchPurchaseOrders());
    cancelEditStatus();
  };

  const startEditItems = (po) => {
    setEditingItemsId(po.id);
    setOpenOrderId(po.id);

    setEditedItems(
      getDisplayItems(po).map((item) => ({
        ...item,
        product_barcode_id:
          item.product_barcode_id ||
          item.product_barcode_id_fk ||
          getProductBarcodeId(item),
        product_id: Number(item.product_id),
        category_id: Number(item.category_id),
        brand_id: Number(item.brand_id),
        unit_id: Number(item.unit_id),
        qty: Number(item.qty || 0),
        no_of_units: Number(item.no_of_units || 1),
        expected_unit_price: Number(item.expected_unit_price || 0),
        actual_unit_price: item.actual_unit_price ?? null,
        mk_barcode: item.mk_barcode || '',
        barcode: item.barcode || '',
      }))
    );
  };

  const cancelEditItems = () => {
    setEditingItemsId(null);
    setEditedItems([]);
  };

  const updateEditedItem = (index, field, value) => {
    const copy = [...editedItems];
    copy[index] = { ...copy[index], [field]: value };
    setEditedItems(copy);
  };

  const updateEditedProduct = (index, barcodeRowId) => {
    const selected = productBarcodes.find(
      (p) => String(p.id) === String(barcodeRowId)
    );

    if (!selected) return;

    const copy = [...editedItems];

    copy[index] = {
      ...copy[index],
      product_barcode_id: selected.id,

      product_id: Number(selected.product_id),
      product_name:
        selected.product_name_eng ||
        selected.product_name_tel ||
        selected.product_code ||
        '',

      product_code: selected.product_code || '',
      mk_barcode: selected.mk_barcode || '',
      barcode: selected.barcode || '',

      category_id: Number(selected.category_id),
      category_name:
        selected.category_name_english || selected.category_name || '-',

      brand_id: Number(selected.brand_id),
      brand_name: getBrandName(selected) || '-',

      unit_id: Number(selected.unit_id),
      unit_name: selected.unit_name || selected.unit_short_code || '-',
      unit_short_code: selected.unit_short_code || '',

      qty: Number(selected.quantity || 1),
    };

    setEditedItems(copy);
  };

  const removeEditedItem = (index) => {
    setEditedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const saveItems = async (po) => {
    if (editedItems.length === 0) {
      alert('At least one product is required in purchase order.');
      return;
    }

    await dispatch(
      updatePurchaseOrderItems({
        id: po.id,
        items: editedItems.map((item) => ({
          id: item.id,

          product_id: Number(item.product_id),
          category_id: Number(item.category_id),
          brand_id: Number(item.brand_id),
          unit_id: Number(item.unit_id),

          qty: Number(item.qty),
          no_of_units: Number(item.no_of_units || 1),
          expected_unit_price: Number(item.expected_unit_price || 0),
          actual_unit_price: item.actual_unit_price ?? null,

          product_name: item.product_name,
          product_code: item.product_code,
          category_name: item.category_name,
          brand_name: item.brand_name,
          unit_name: item.unit_name,
          unit_short_code: item.unit_short_code,
          mk_barcode: item.mk_barcode,
          barcode: item.barcode,
        })),
      })
    );

    dispatch(fetchPurchaseOrders());
    cancelEditItems();
  };

  const startVerify = (po) => {
    setVerifyingId(po.id);
    setOpenOrderId(po.id);
    setVerifyRemarks(po.remarks || '');
    setScanBarcode('');

    setVerifyItems(
      getDisplayItems(po).map((item) => ({
        ...item,
        actual_unit_price:
          item.actual_unit_price ?? item.expected_unit_price ?? 0,
        is_verified: Boolean(item.is_verified),
        mk_barcode: item.mk_barcode || '',
        barcode: item.barcode || '',
      }))
    );
  };

  const cancelVerify = () => {
    setVerifyingId(null);
    setVerifyItems([]);
    setVerifyRemarks('');
    setScanBarcode('');
  };

  const updateVerifyItem = (index, field, value) => {
    const copy = [...verifyItems];
    copy[index] = { ...copy[index], [field]: value };
    setVerifyItems(copy);
  };

  const toggleVerifyItem = (index) => {
    setVerifyItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, is_verified: !item.is_verified } : item
      )
    );
  };

  const confirmItemByBarcode = (barcode) => {
    const scanned = normalizeBarcode(barcode);
    if (!scanned) return;

    const index = verifyItems.findIndex((item) =>
      getItemBarcodes(item).includes(scanned)
    );

    if (index === -1) {
      alert(`Barcode not found: ${scanned}`);
      setScanBarcode('');
      return;
    }

    setVerifyItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, is_verified: true, just_scanned: true } : item
      )
    );

    setTimeout(() => {
      rowRefs.current[index]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      rowRefs.current[index]?.focus?.();
    }, 100);

    setScanBarcode('');
  };

  const saveVerify = async (po) => {
    const notVerified = verifyItems.filter((item) => !item.is_verified);

    if (notVerified.length > 0) {
      const approveWithRemarks = window.confirm(
        `Pending items: ${notVerified.length}\n\nDo you want to approve with remarks?`
      );

      if (!approveWithRemarks) return;

      if (!verifyRemarks.trim()) {
        alert('Please enter remarks before approving with missing items.');
        return;
      }
    }

    await dispatch(
      verifyReceivedPurchaseOrder({
        id: po.id,
        remarks:
          notVerified.length > 0
            ? `APPROVED WITH MISSING ITEMS: ${verifyRemarks}`
            : verifyRemarks || null,
        items: verifyItems.map((item) => ({
          id: item.id,
          actual_unit_price: Number(item.actual_unit_price),
          is_verified: Boolean(item.is_verified),
          missing: !item.is_verified,
        })),
      })
    );

    dispatch(fetchPurchaseOrders());
    cancelVerify();
  };

  return (
    <section className="space-y-4">
      {STATUSES.map((status) => {
        const style = STATUS_STYLES[status];

        return (
          <div
            key={status}
            className={`rounded-xl border shadow-sm p-4 ${style.section}`}
          >
            <div
              className={`rounded-lg px-4 py-3 mb-3 flex justify-between items-center ${style.header}`}
            >
              <h2 className="font-bold text-lg capitalize">
                {status} Orders ({grouped[status].length})
              </h2>

              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${style.badge}`}
              >
                {status.toUpperCase()}
              </span>
            </div>

            <div className="overflow-x-auto bg-white rounded-lg border">
              <table className="min-w-full text-sm">
                <thead className={style.header}>
                  <tr>
                    <th className="p-2 text-left">PO No</th>
                    <th className="p-2 text-left">Supplier</th>
                    <th className="p-2 text-left">Warehouse</th>
                    <th className="p-2 text-right">Amount</th>
                    <th className="p-2 text-left">Expected</th>
                    <th className="p-2 text-left">Received</th>
                    <th className="p-2 text-left">Remarks</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-center">Edit Status</th>
                    <th className="p-2 text-center">Edit Items</th>
                    <th className="p-2 text-center">Verify</th>
                    <th className="p-2 text-center">Details</th>
                  </tr>
                </thead>

                <tbody>
                  {grouped[status].length === 0 && (
                    <tr>
                      <td
                        colSpan="12"
                        className="p-4 text-center text-gray-500"
                      >
                        No {status} orders
                      </td>
                    </tr>
                  )}

                  {grouped[status].map((po) => {
                    const isOpen = openOrderId === po.id;
                    const isEditingStatus = editingId === po.id;
                    const isEditingItems = editingItemsId === po.id;
                    const isVerifying = verifyingId === po.id;

                    const displayItems = getDisplayItems(po);
                    const activeItems = isVerifying
                      ? verifyItems
                      : isEditingItems
                      ? editedItems
                      : displayItems;

                    return (
                      <React.Fragment key={po.id}>
                        <tr className="border-t align-top hover:bg-gray-50">
                          <td className="p-2 font-medium">{po.po_number}</td>

                          <td className="p-2">
                            <div className="font-medium">
                              {po.supplier_name || po.supplier_id}
                            </div>
                            <div className="text-xs text-gray-500">
                              {po.supplier_code || '-'} |{' '}
                              {po.supplier_phone || '-'}
                            </div>
                          </td>

                          <td className="p-2">
                            <div className="font-medium">
                              {po.warehouse_name || po.warehouse_id}
                            </div>
                            <div className="text-xs text-gray-500">
                              {po.warehouse_code || '-'}
                            </div>
                          </td>

                          <td className="p-2 text-right">
                            ₹{Number(po.total_amount || 0).toFixed(2)}
                          </td>

                          <td className="p-2">
                            {isEditingStatus ? (
                              <input
                                type="date"
                                value={form.expected_date}
                                onChange={(e) =>
                                  setForm({
                                    ...form,
                                    expected_date: e.target.value,
                                  })
                                }
                                className="border rounded px-2 py-1"
                              />
                            ) : po.expected_date ? (
                              String(po.expected_date).slice(0, 10)
                            ) : (
                              '-'
                            )}
                          </td>

                          <td className="p-2">
                            {isEditingStatus ? (
                              <input
                                type="date"
                                value={form.arrived_date}
                                onChange={(e) =>
                                  setForm({
                                    ...form,
                                    arrived_date: e.target.value,
                                  })
                                }
                                className="border rounded px-2 py-1"
                              />
                            ) : po.arrived_date ? (
                              String(po.arrived_date).slice(0, 10)
                            ) : (
                              '-'
                            )}
                          </td>

                          <td className="p-2">
                            {isEditingStatus ? (
                              <input
                                value={form.remarks}
                                onChange={(e) =>
                                  setForm({ ...form, remarks: e.target.value })
                                }
                                className="border rounded px-2 py-1"
                              />
                            ) : (
                              po.remarks || '-'
                            )}
                          </td>

                          <td className="p-2">
                            {isEditingStatus ? (
                              <select
                                value={form.status}
                                onChange={(e) =>
                                  setForm({ ...form, status: e.target.value })
                                }
                                className="border rounded px-2 py-1"
                              >
                                {STATUSES.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span
                                className={`px-2 py-1 rounded-full text-xs capitalize ${style.badge}`}
                              >
                                {po.status}
                              </span>
                            )}
                          </td>

                          <td className="p-2 text-center">
                            {isEditingStatus ? (
                              <div className="flex gap-2 justify-center">
                                <button
                                  type="button"
                                  onClick={() => saveStatus(po)}
                                  className="bg-green-700 text-white px-3 py-1 rounded"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditStatus}
                                  className="border px-3 py-1 rounded"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : canEditStatus(po.status) ? (
                              <button
                                type="button"
                                onClick={() => startEditStatus(po)}
                                className="text-blue-700 underline"
                              >
                                Edit
                              </button>
                            ) : (
                              '-'
                            )}
                          </td>

                          <td className="p-2 text-center">
                            {canEditItems(po.status) ? (
                              <button
                                type="button"
                                onClick={() => startEditItems(po)}
                                className="text-blue-700 underline"
                              >
                                Edit Items
                              </button>
                            ) : (
                              '-'
                            )}
                          </td>

                          <td className="p-2 text-center">
                            {String(po.status || '').toLowerCase() ===
                            'received' ? (
                              <button
                                type="button"
                                onClick={() => startVerify(po)}
                                className="text-purple-700 underline"
                              >
                                Verify
                              </button>
                            ) : (
                              '-'
                            )}
                          </td>

                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                setOpenOrderId(isOpen ? null : po.id)
                              }
                              className="text-blue-700 underline"
                            >
                              {isOpen ? 'Hide' : 'View'}
                            </button>
                          </td>
                        </tr>

                        {isOpen && (
                          <tr>
                            <td colSpan="12" className="p-3 bg-gray-50">
                              {isVerifying && (
                                <div className="mb-3 bg-purple-50 border border-purple-200 rounded-lg p-3">
                                  <label className="block text-xs font-semibold mb-1">
                                    Scan Barcode To Confirm Item
                                  </label>

                                  <input
                                    autoFocus
                                    value={scanBarcode}
                                    onChange={(e) =>
                                      setScanBarcode(e.target.value)
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        confirmItemByBarcode(scanBarcode);
                                      }
                                    }}
                                    className="border rounded px-3 py-2 w-full mb-3"
                                    placeholder="Scan MK barcode or vendor barcode and press Enter"
                                  />

                                  <label className="block text-xs font-semibold mb-1">
                                    Verification Remarks
                                  </label>
                                  <input
                                    value={verifyRemarks}
                                    onChange={(e) =>
                                      setVerifyRemarks(e.target.value)
                                    }
                                    className="border rounded px-3 py-2 w-full"
                                    placeholder="Required if any item is missed"
                                  />

                                  <div className="mt-2 text-sm font-semibold">
                                    Confirmed:{' '}
                                    <span className="text-green-700">
                                      {
                                        verifyItems.filter((i) => i.is_verified)
                                          .length
                                      }
                                    </span>{' '}
                                    / {verifyItems.length}
                                  </div>
                                </div>
                              )}

                              <table className="min-w-full text-sm border bg-white table-fixed">
                                <thead className="bg-gray-100">
                                  <tr>
                                    {isVerifying && (
                                      <th className="p-2 text-center w-[90px]">
                                        Confirmed
                                      </th>
                                    )}
                                    <th className="p-2 text-left w-[300px]">
                                      Product
                                    </th>
                                    <th className="p-2 text-left w-[150px]">
                                      Category
                                    </th>
                                    <th className="p-2 text-left w-[140px]">
                                      Brand
                                    </th>
                                    <th className="p-2 text-left w-[90px]">
                                      Unit
                                    </th>
                                    <th className="p-2 text-right w-[100px]">
                                      Qty
                                    </th>
                                    <th className="p-2 text-right w-[120px]">
                                      No. Units
                                    </th>
                                    <th className="p-2 text-right w-[150px]">
                                      Expected Price
                                    </th>
                                    <th className="p-2 text-right w-[140px]">
                                      Actual Price
                                    </th>
                                    <th className="p-2 text-right w-[130px]">
                                      Total
                                    </th>
                                    {isEditingItems && (
                                      <th className="p-2 text-center w-[100px]">
                                        Remove
                                      </th>
                                    )}
                                  </tr>
                                </thead>

                                <tbody>
                                  {activeItems.map((item, index) => {
                                    const effectivePrice =
                                      getEffectivePrice(item);
                                    const total =
                                      // Number(item.qty || 0) *
                                      Number(item.no_of_units || 1) *
                                      effectivePrice;

                                    const verifiedClass =
                                      isVerifying && item.is_verified
                                        ? 'bg-green-100 border-green-400'
                                        : isVerifying
                                        ? 'bg-red-50'
                                        : '';

                                    const selectedProductBarcodeId =
                                      getProductBarcodeId(item);

                                    return (
                                      <tr
                                        key={item.id || index}
                                        ref={(el) => {
                                          rowRefs.current[index] = el;
                                        }}
                                        tabIndex={-1}
                                        onClick={() =>
                                          isVerifying &&
                                          toggleVerifyItem(index)
                                        }
                                        className={`border-t ${
                                          isVerifying ? 'cursor-pointer' : ''
                                        } ${verifiedClass}`}
                                      >
                                        {isVerifying && (
                                          <td className="p-2 text-center">
                                            <input
                                              type="checkbox"
                                              checked={Boolean(
                                                item.is_verified
                                              )}
                                              onChange={() =>
                                                toggleVerifyItem(index)
                                              }
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
                                            />
                                          </td>
                                        )}

                                        <td className="p-2">
                                          {isEditingItems ? (
                                            <select
                                              value={selectedProductBarcodeId}
                                              onChange={(e) =>
                                                updateEditedProduct(
                                                  index,
                                                  e.target.value
                                                )
                                              }
                                              className="border rounded px-2 py-1 w-full"
                                            >
                                              {selectedProductBarcodeId ===
                                                '' && (
                                                <option value="" disabled>
                                                  {item.product_name ||
                                                    'Product not matched'}
                                                </option>
                                              )}

                                              {productBarcodes.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                  {p.product_name_eng ||
                                                    p.product_name_tel ||
                                                    p.product_code}{' '}
                                                  {/* | Code:{' '}
                                                  {p.product_code || '-'} | MK:{' '}
                                                  {p.mk_barcode || '-'} */}
                                                </option>
                                              ))}
                                            </select>
                                          ) : (
                                            <>
                                              <div className="font-medium">
                                                {item.product_name ||
                                                  item.product_id}
                                              </div>
                                              <div className="text-xs text-gray-500">
                                                Code:{' '}
                                                {item.product_code || '-'}
                                              </div>
                                              <div className="text-xs text-gray-500">
                                                MK:{' '}
                                                {normalizeBarcode(
                                                  item.mk_barcode
                                                ) || '-'}
                                              </div>
                                              <div className="text-xs text-gray-500">
                                                Vendor:{' '}
                                                {normalizeBarcode(
                                                  item.barcode
                                                ) || '-'}
                                              </div>
                                            </>
                                          )}
                                        </td>

                                        <td className="p-2">
                                          {item.category_name ||
                                            item.category_id ||
                                            '-'}
                                        </td>

                                        <td className="p-2">
                                          {item.brand_name ||
                                            item.brand_id ||
                                            '-'}
                                        </td>

                                        <td className="p-2">
                                          {item.unit_name ||
                                            item.unit_short_code ||
                                            item.unit_id ||
                                            '-'}
                                        </td>

                                        <td className="p-2 text-right">
                                          {isEditingItems ? (
                                            <input
                                              type="number"
                                              min="0.001"
                                              step="0.001"
                                              value={item.qty}
                                              onChange={(e) =>
                                                updateEditedItem(
                                                  index,
                                                  'qty',
                                                  e.target.value
                                                )
                                              }
                                              className="border rounded px-2 py-1 w-full text-right"
                                            />
                                          ) : (
                                            Number(item.qty || 0).toFixed(3)
                                          )}
                                        </td>

                                        <td className="p-2 text-right">
                                          {isEditingItems ? (
                                            <input
                                              type="number"
                                              min="1"
                                              step="1"
                                              value={item.no_of_units}
                                              onChange={(e) =>
                                                updateEditedItem(
                                                  index,
                                                  'no_of_units',
                                                  e.target.value
                                                )
                                              }
                                              className="border rounded px-2 py-1 w-full text-right"
                                            />
                                          ) : (
                                            Number(
                                              item.no_of_units || 1
                                            ).toFixed(0)
                                          )}
                                        </td>

                                        <td className="p-2 text-right">
                                          {isEditingItems ? (
                                            <input
                                              type="number"
                                              min="0"
                                              step="0.01"
                                              value={item.expected_unit_price}
                                              onChange={(e) =>
                                                updateEditedItem(
                                                  index,
                                                  'expected_unit_price',
                                                  e.target.value
                                                )
                                              }
                                              className="border rounded px-2 py-1 w-full text-right"
                                            />
                                          ) : (
                                            `₹${Number(
                                              item.expected_unit_price || 0
                                            ).toFixed(2)}`
                                          )}
                                        </td>

                                        <td className="p-2 text-right">
                                          {isVerifying ? (
                                            <input
                                              type="number"
                                              min="0"
                                              step="0.01"
                                              value={item.actual_unit_price ?? ''}
                                              onChange={(e) =>
                                                updateVerifyItem(
                                                  index,
                                                  'actual_unit_price',
                                                  e.target.value
                                                )
                                              }
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
                                              className="border rounded px-2 py-1 w-full text-right"
                                            />
                                          ) : item.actual_unit_price !== null &&
                                            item.actual_unit_price !==
                                              undefined ? (
                                            `₹${Number(
                                              item.actual_unit_price
                                            ).toFixed(2)}`
                                          ) : (
                                            '-'
                                          )}
                                        </td>

                                        <td className="p-2 text-right font-semibold">
                                          ₹{total.toFixed(2)}
                                        </td>

                                        {isEditingItems && (
                                          <td className="p-2 text-center">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                removeEditedItem(index)
                                              }
                                              className="text-red-600 hover:underline"
                                            >
                                              Remove
                                            </button>
                                          </td>
                                        )}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>

                              {isEditingItems && (
                                <div className="flex justify-end gap-2 mt-3">
                                  <button
                                    type="button"
                                    onClick={() => saveItems(po)}
                                    className="bg-green-700 text-white px-4 py-2 rounded"
                                  >
                                    Save Items
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelEditItems}
                                    className="border px-4 py-2 rounded"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              )}

                              {isVerifying && (
                                <div className="flex justify-end gap-2 mt-3">
                                  <button
                                    type="button"
                                    onClick={() => saveVerify(po)}
                                    className="bg-purple-700 text-white px-4 py-2 rounded"
                                  >
                                    Approve & Verify
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelVerify}
                                    className="border px-4 py-2 rounded"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </section>
  );
};

export default PurchaseOrdersStatusSections;