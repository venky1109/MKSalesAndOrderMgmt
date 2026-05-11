import React, { useRef, useState } from 'react';
import { useDispatch } from 'react-redux';

import {
  updatePurchaseOrder,
  updatePurchaseOrderItems,
  verifyReceivedPurchaseOrder,
  fetchPurchaseOrders,
  fetchInventoryProducts,
  fetchStockTransactions,
} from '../features/inventory/stockManagerInventorySlice';

import { receiveVerifiedPurchaseToInventory } from '../features/inventory/inventoryMovementSlice';

import VerifyItemInventoryModal from './VerifyItemInventoryModal';

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

const makeBatchId = () => {
  const d = new Date();
  const ymd = d.toISOString().slice(0, 10).replaceAll('-', '');
  const time = String(d.getTime()).slice(-5);
  return Number(`${ymd}${time}`);
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

  const [itemVerifyModal, setItemVerifyModal] = useState({
    open: false,
    index: null,
    item: null,
  });

  const rowRefs = useRef({});

  const normalizeBarcode = (value) =>
    String(value || '').trim().replace(/\s+/g, '');

  const grouped = STATUSES.reduce((acc, status) => {
    acc[status] = purchaseOrders.filter(
      (po) => String(po.status || '').toLowerCase() === status
    );
    return acc;
  }, {});

  const canEditStatus = (status) =>
    ['draft', 'sent', 'intransit'].includes(
      String(status || '').toLowerCase()
    );

  const canEditItems = (status) =>
    String(status || '').toLowerCase() === 'draft';

  const getItemBarcodes = (item) =>
    [
      item?.mk_barcode,
      item?.barcode,
      item?.product_barcode,
      item?.vendor_barcode,
      item?.supplier_barcode,
    ]
      .map((code) => normalizeBarcode(code))
      .filter(Boolean);

  const getProductBarcodeId = (item) => {
    if (item?.product_barcode_id) return item.product_barcode_id;
    if (item?.product_barcode_id_fk) return item.product_barcode_id_fk;
    if (item?.barcode_id) return item.barcode_id;

    const itemMk = normalizeBarcode(item?.mk_barcode);
    const itemBarcode = normalizeBarcode(item?.barcode);

    const matchedByBarcode = productBarcodes.find((p) => {
      const pMk = normalizeBarcode(p.mk_barcode);
      const pBarcode = normalizeBarcode(p.barcode);

      return (
        (itemMk && pMk && itemMk === pMk) ||
        (itemBarcode && pBarcode && itemBarcode === pBarcode)
      );
    });

    if (matchedByBarcode?.id) return matchedByBarcode.id;

    const matchedByIds = productBarcodes.find(
      (p) =>
        String(p.product_id) === String(item?.product_id) &&
        String(p.brand_id) === String(item?.brand_id) &&
        String(p.category_id) === String(item?.category_id) &&
        String(p.unit_id) === String(item?.unit_id)
    );

    return matchedByIds?.id || '';
  };

  const getDisplayItems = (po) => {
    if (Array.isArray(po.items) && po.items.length > 0) {
      return po.items.map((item) => ({
        ...item,
        product_barcode_id:
          item.product_barcode_id ||
          item.product_barcode_id_fk ||
          item.barcode_id ||
          getProductBarcodeId(item),
      }));
    }

    if (Array.isArray(po.bill_details?.items)) {
      return po.bill_details.items.map((item, index) => {
        const row = {
          id: item.id || `bill-${index}`,
          product_barcode_id:
            item.product_barcode_id ||
            item.product_barcode_id_fk ||
            item.barcode_id ||
            '',
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
          exp_date: item.exp_date || '',
          mfg_date: item.mfg_date || '',
          sku_id: item.sku_id || '',
          inventory_remarks: item.inventory_remarks || '',
        };

        row.product_barcode_id = row.product_barcode_id || getProductBarcodeId(row);

        return row;
      });
    }

    return [];
  };

  const getEffectivePrice = (item) =>
    item.actual_unit_price !== null && item.actual_unit_price !== undefined
      ? Number(item.actual_unit_price)
      : Number(item.expected_unit_price || 0);

  const getPoTotal = (po) => {
    const items = getDisplayItems(po);

    return items.reduce((sum, item) => {
      return (
        sum +
        Number(item.no_of_units || 1) *
          Number(item.expected_unit_price || item.unit_price || item.price || 0)
      );
    }, 0);
  };

  const addVerifyProduct = () => {
    const first = productBarcodes[0];

    if (!first) {
      alert('No catalog products available to add.');
      return;
    }

    setVerifyItems((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        is_new: true,
        product_barcode_id: first.id,
        product_id: Number(first.product_id),
        product_name:
          first.product_name_eng ||
          first.product_name_tel ||
          first.product_code ||
          '',
        product_code: first.product_code || '',
        mk_barcode: first.mk_barcode || '',
        barcode: first.barcode || '',
        category_id: Number(first.category_id),
        category_name:
          first.category_name_english || first.category_name || '-',
        brand_id: Number(first.brand_id),
        brand_name: getBrandName(first) || '-',
        unit_id: Number(first.unit_id),
        unit_name: first.unit_name || first.unit_short_code || '-',
        unit_short_code: first.unit_short_code || '',
        qty: Number(first.quantity || 1),
        no_of_units: 1,
        expected_unit_price: 0,
        actual_unit_price: 0,
        exp_date: '',
        mfg_date: '',
        sku_id: '',
        inventory_remarks: 'Added during verification',
        is_verified: false,
      },
    ]);
  };

  const removeVerifyProduct = (index) => {
    const ok = window.confirm('Remove this product from verification?');
    if (!ok) return;

    setVerifyItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateVerifyProduct = (index, barcodeRowId) => {
    const selected = productBarcodes.find(
      (p) => String(p.id) === String(barcodeRowId)
    );

    if (!selected) return;

    setVerifyItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
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
            }
          : item
      )
    );
  };

  const buildPurchaseOrderText = (po) => {
    const items = getDisplayItems(po);

    let text = `*MANAKIRANA PURCHASE ORDER*\n\n`;
    text += `PO No: ${po.po_number || po.id}\n`;
    text += `Status: ${po.status || '-'}\n`;
    text += `Supplier: ${po.supplier_name || po.supplier_id || '-'}\n`;
    text += `Supplier Phone: ${po.supplier_phone || '-'}\n`;
    text += `Warehouse: ${po.warehouse_name || po.warehouse_id || '-'}\n`;
    text += `Expected Date: ${
      po.expected_date ? String(po.expected_date).slice(0, 10) : '-'
    }\n`;
    text += `Remarks: ${po.remarks || '-'}\n\n`;
    text += `*Items*\n`;

    items.forEach((item, index) => {
      text += `${index + 1}. ${item.product_name || item.product_id}\n`;
      text += `   Code: ${item.product_code || '-'}\n`;
      text += `   MK Barcode: ${normalizeBarcode(item.mk_barcode) || '-'}\n`;
      text += `   Brand: ${item.brand_name || '-'}\n`;
      text += `   Category: ${item.category_name || '-'}\n`;
      text += `   Qty: ${Number(item.qty || 0).toFixed(3)} ${
        item.unit_short_code || item.unit_name || ''
      }\n`;
      text += `   No. Units: ${Number(item.no_of_units || 1).toFixed(0)}\n\n`;
    });

    text += `Please supply the above items.`;

    return text;
  };

  const sharePurchaseOrderWhatsApp = (po) => {
    const message = encodeURIComponent(buildPurchaseOrderText(po));
    const phone = String(po.supplier_phone || '').replace(/\D/g, '');
    const url = phone
      ? `https://wa.me/91${phone.slice(-10)}?text=${message}`
      : `https://wa.me/?text=${message}`;

    window.open(url, '_blank');
  };

  const printPurchaseOrder = (po) => {
    const items = getDisplayItems(po);
    const printWindow = window.open('', '_blank', 'width=900,height=700');

    if (!printWindow) {
      alert('Please allow popup to print purchase order.');
      return;
    }

    const rows = items
      .map(
        (item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>
              <strong>${item.product_name || item.product_id || '-'}</strong><br/>
              <small>Code: ${item.product_code || '-'}</small><br/>
              <small>MK: ${normalizeBarcode(item.mk_barcode) || '-'}</small>
            </td>
            <td>${item.category_name || '-'}</td>
            <td>${item.brand_name || '-'}</td>
            <td>${item.unit_name || item.unit_short_code || '-'}</td>
            <td class="right">${Number(item.qty || 0).toFixed(3)}</td>
            <td class="right">${Number(item.no_of_units || 1).toFixed(0)}</td>
          </tr>
        `
      )
      .join('');

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Purchase Order ${po.po_number || po.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            h1 { text-align: center; margin: 0; font-size: 22px; }
            .sub { text-align: center; margin-top: 4px; font-size: 13px; color: #555; }
            .info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px 24px;
              margin: 24px 0;
              font-size: 14px;
            }
            .info div { border-bottom: 1px solid #eee; padding-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; vertical-align: top; }
            th { background: #eff6ff; text-align: left; }
            .right { text-align: right; }
            .footer {
              margin-top: 40px;
              display: flex;
              justify-content: space-between;
              font-size: 14px;
            }
            @media print {
              button { display: none; }
              body { padding: 12px; }
            }
          </style>
        </head>
        <body>
          <h1>MANAKIRANA PURCHASE ORDER</h1>
          <div class="sub">Supplier Copy - No Internal Price / Amount</div>

          <div class="info">
            <div><strong>PO No:</strong> ${po.po_number || po.id || '-'}</div>
            <div><strong>Status:</strong> ${po.status || '-'}</div>
            <div><strong>Supplier:</strong> ${
              po.supplier_name || po.supplier_id || '-'
            }</div>
            <div><strong>Supplier Phone:</strong> ${po.supplier_phone || '-'}</div>
            <div><strong>Warehouse:</strong> ${
              po.warehouse_name || po.warehouse_id || '-'
            }</div>
            <div><strong>Warehouse Code:</strong> ${po.warehouse_code || '-'}</div>
            <div><strong>Expected Date:</strong> ${
              po.expected_date ? String(po.expected_date).slice(0, 10) : '-'
            }</div>
            <div><strong>Remarks:</strong> ${po.remarks || '-'}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>S.No</th>
                <th>Product</th>
                <th>Category</th>
                <th>Brand</th>
                <th>Unit</th>
                <th>Qty</th>
                <th>No. Units</th>
              </tr>
            </thead>
            <tbody>
              ${
                rows ||
                `<tr>
                  <td colspan="7" style="text-align:center;">No items</td>
                </tr>`
              }
            </tbody>
          </table>

          <div class="footer">
            <div>Prepared By</div>
            <div>Supplier Signature</div>
          </div>

          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

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
          item.barcode_id ||
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
          product_barcode_id:
            item.product_barcode_id ||
            item.product_barcode_id_fk ||
            item.barcode_id ||
            getProductBarcodeId(item),
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
        product_barcode_id:
          item.product_barcode_id ||
          item.product_barcode_id_fk ||
          item.barcode_id ||
          getProductBarcodeId(item),
        actual_unit_price:
          item.actual_unit_price ?? item.expected_unit_price ?? 0,
        is_verified: Boolean(item.is_verified),
        mk_barcode: item.mk_barcode || '',
        barcode: item.barcode || '',
        exp_date: item.exp_date || '',
        mfg_date: item.mfg_date || '',
        sku_id: item.sku_id || '',
        inventory_remarks: item.inventory_remarks || '',
      }))
    );
  };

  const cancelVerify = () => {
    setVerifyingId(null);
    setVerifyItems([]);
    setVerifyRemarks('');
    setScanBarcode('');
    setItemVerifyModal({
      open: false,
      index: null,
      item: null,
    });
  };

  const updateVerifyItem = (index, field, value) => {
    const copy = [...verifyItems];
    copy[index] = { ...copy[index], [field]: value };
    setVerifyItems(copy);
  };

  const saveItemInventoryDetails = (updatedItem) => {
    setVerifyItems((prev) =>
      prev.map((item, i) =>
        i === itemVerifyModal.index
          ? {
              ...item,
              ...updatedItem,
              product_barcode_id:
                updatedItem.product_barcode_id ||
                item.product_barcode_id ||
                getProductBarcodeId(item),
              is_verified: true,
            }
          : item
      )
    );

    setItemVerifyModal({
      open: false,
      index: null,
      item: null,
    });
  };

  const toggleVerifyItem = (index) => {
    const item = verifyItems[index];

    if (!item) return;

    if (item.is_verified) {
      setVerifyItems((prev) =>
        prev.map((row, i) =>
          i === index
            ? {
                ...row,
                is_verified: false,
                exp_date: '',
                mfg_date: '',
                sku_id: '',
                inventory_remarks: '',
              }
            : row
        )
      );
      return;
    }

    setItemVerifyModal({
      open: true,
      index,
      item,
    });
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

    setItemVerifyModal({
      open: true,
      index,
      item: {
        ...verifyItems[index],
        product_barcode_id:
          verifyItems[index].product_barcode_id ||
          getProductBarcodeId(verifyItems[index]),
        just_scanned: true,
      },
    });

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

    const verifiedItems = verifyItems.filter((item) => item.is_verified);

    if (verifiedItems.length === 0) {
      alert('Please verify at least one item.');
      return;
    }

    const verifiedWithoutExpiryOrSku = verifiedItems.filter(
      (item) => !item.exp_date || !item.sku_id
    );

    if (verifiedWithoutExpiryOrSku.length > 0) {
      alert('Please enter expiry date and SKU for all verified items.');
      return;
    }

    const batchId = makeBatchId();

    const existingVerifiedItems = verifyItems.filter((item) => !item.is_new);

    const verifyResult = await dispatch(
      verifyReceivedPurchaseOrder({
        id: po.id,
        remarks:
          notVerified.length > 0
            ? `APPROVED WITH MISSING ITEMS: ${verifyRemarks}`
            : verifyRemarks || null,
        items: existingVerifiedItems.map((item) => ({
          id: item.id,
          actual_unit_price: Number(item.actual_unit_price || 0),
          is_verified: Boolean(item.is_verified),
          missing: !item.is_verified,
          inventory_remarks: item.inventory_remarks || null,
        })),
      })
    );

    if (!verifyReceivedPurchaseOrder.fulfilled.match(verifyResult)) {
      alert(verifyResult.payload || 'Purchase verification failed');
      return;
    }

    for (const item of verifiedItems) {
      const productBarcodeId =
        item.product_barcode_id ||
        item.product_barcode_id_fk ||
        item.barcode_id ||
        getProductBarcodeId(item);

      if (!productBarcodeId) {
        alert(
          `Product barcode id missing for ${
            item.product_name || item.product_id
          }. Please select the product again or check catalog barcode data.`
        );
        return;
      }

      const payload = {
        purchase_order_id: po.id,
        purchase_order_item_id: item.is_new ? null : item.id,
        product_barcode_id: productBarcodeId,
        product_id: item.product_id,
        batch_id: batchId,
        sku_id: item.sku_id,
        warehouse_id: po.warehouse_id,
        supplier_id: po.supplier_id || po.stakeholders_id,
        stakeholders_id: po.stakeholders_id || po.supplier_id,
        qty: Number(item.qty || 0),
        no_of_units: Number(item.no_of_units || 1),
        unit_price: Number(item.actual_unit_price || 0),
        mfg_date: item.mfg_date || null,
        exp_date: item.exp_date,
        remarks: item.inventory_remarks || verifyRemarks || null,
      };

      console.log('receiveVerifiedPurchaseToInventory payload:', payload);

      const inventoryResult = await dispatch(
        receiveVerifiedPurchaseToInventory(payload)
      );

      if (receiveVerifiedPurchaseToInventory.rejected.match(inventoryResult)) {
        alert(
          inventoryResult.payload ||
            `Inventory update failed for ${item.product_name || item.product_id}`
        );
        return;
      }
    }

    alert('Purchase verified, inventory updated, and stock movement added.');

    dispatch(fetchPurchaseOrders());
    dispatch(fetchInventoryProducts());
    dispatch(fetchStockTransactions());

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
                    <th className="p-2 text-center">Share / Print</th>
                    <th className="p-2 text-center">Details</th>
                  </tr>
                </thead>

                <tbody>
                  {grouped[status].length === 0 && (
                    <tr>
                      <td colSpan="13" className="p-4 text-center text-gray-500">
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

                    const isSent =
                      String(po.status || '').toLowerCase() === 'sent';

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
                            ₹{getPoTotal(po).toFixed(2)}
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
                            {isSent ? (
                              <div className="flex justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => sharePurchaseOrderWhatsApp(po)}
                                  className="rounded bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700"
                                >
                                  WhatsApp
                                </button>
                                <button
                                  type="button"
                                  onClick={() => printPurchaseOrder(po)}
                                  className="rounded bg-slate-700 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800"
                                >
                                  Print
                                </button>
                              </div>
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
                            <td colSpan="13" className="p-3 bg-gray-50">
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

                                  <div className="mt-2 flex flex-wrap items-center gap-3">
                                    <div className="text-sm font-semibold">
                                      Confirmed:{' '}
                                      <span className="text-green-700">
                                        {
                                          verifyItems.filter(
                                            (i) => i.is_verified
                                          ).length
                                        }
                                      </span>{' '}
                                      / {verifyItems.length}
                                    </div>

                                    <button
                                      type="button"
                                      onClick={addVerifyProduct}
                                      className="rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                                    >
                                      + Add Product
                                    </button>
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
                                    <th className="p-2 text-left w-[330px]">
                                      Product
                                    </th>
                                    <th className="p-2 text-left w-[140px]">
                                      Category
                                    </th>
                                    <th className="p-2 text-left w-[130px]">
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

                                    {isVerifying && (
                                      <>
                                        <th className="p-2 text-left w-[220px]">
                                          Product Remarks
                                        </th>
                                        <th className="p-2 text-center w-[90px]">
                                          Delete
                                        </th>
                                      </>
                                    )}

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
                                      Number(item.no_of_units || 1) *
                                      effectivePrice;

                                    const verifiedClass =
                                      isVerifying && item.is_verified
                                        ? 'bg-green-100 border-green-400'
                                        : isVerifying
                                        ? 'bg-red-50'
                                        : '';

                                    const selectedProductBarcodeId =
                                      item.product_barcode_id ||
                                      getProductBarcodeId(item);

                                    return (
                                      <tr
                                        key={item.id || index}
                                        ref={(el) => {
                                          rowRefs.current[index] = el;
                                        }}
                                        tabIndex={-1}
                                        onClick={() =>
                                          isVerifying && toggleVerifyItem(index)
                                        }
                                        className={`border-t ${
                                          isVerifying ? 'cursor-pointer' : ''
                                        } ${verifiedClass}`}
                                      >
                                        {isVerifying && (
                                          <td className="p-2 text-center">
                                            <input
                                              type="checkbox"
                                              checked={Boolean(item.is_verified)}
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
                                          {isVerifying && item.is_new ? (
                                            <select
                                              value={
                                                item.product_barcode_id || ''
                                              }
                                              onChange={(e) =>
                                                updateVerifyProduct(
                                                  index,
                                                  e.target.value
                                                )
                                              }
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
                                              className="border rounded px-2 py-1 w-full"
                                            >
                                              {productBarcodes.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                  {p.product_name_eng ||
                                                    p.product_name_tel ||
                                                    p.product_code}
                                                </option>
                                              ))}
                                            </select>
                                          ) : isEditingItems ? (
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
                                              {!selectedProductBarcodeId && (
                                                <option value="" disabled>
                                                  {item.product_name ||
                                                    'Product not matched'}
                                                </option>
                                              )}

                                              {productBarcodes.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                  {p.product_name_eng ||
                                                    p.product_name_tel ||
                                                    p.product_code}
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
                                                Code: {item.product_code || '-'}
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
                                              {isVerifying &&
                                                item.is_verified && (
                                                  <div className="mt-1 text-xs text-green-700">
                                                    Exp: {item.exp_date || '-'} |
                                                    SKU: {item.sku_id || '-'}
                                                  </div>
                                                )}
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
                                          {isEditingItems || isVerifying ? (
                                            <input
                                              type="number"
                                              min="0.001"
                                              step="0.001"
                                              value={item.qty}
                                              onChange={(e) =>
                                                isVerifying
                                                  ? updateVerifyItem(
                                                      index,
                                                      'qty',
                                                      e.target.value
                                                    )
                                                  : updateEditedItem(
                                                      index,
                                                      'qty',
                                                      e.target.value
                                                    )
                                              }
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
                                              className="border rounded px-2 py-1 w-full text-right"
                                            />
                                          ) : (
                                            Number(item.qty || 0).toFixed(3)
                                          )}
                                        </td>

                                        <td className="p-2 text-right">
                                          {isEditingItems || isVerifying ? (
                                            <input
                                              type="number"
                                              min="1"
                                              step="1"
                                              value={item.no_of_units}
                                              onChange={(e) =>
                                                isVerifying
                                                  ? updateVerifyItem(
                                                      index,
                                                      'no_of_units',
                                                      e.target.value
                                                    )
                                                  : updateEditedItem(
                                                      index,
                                                      'no_of_units',
                                                      e.target.value
                                                    )
                                              }
                                              onClick={(e) =>
                                                e.stopPropagation()
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

                                        {isVerifying && (
                                          <>
                                            <td className="p-2">
                                              <input
                                                value={
                                                  item.inventory_remarks || ''
                                                }
                                                onChange={(e) =>
                                                  updateVerifyItem(
                                                    index,
                                                    'inventory_remarks',
                                                    e.target.value
                                                  )
                                                }
                                                onClick={(e) =>
                                                  e.stopPropagation()
                                                }
                                                className="w-full rounded border px-2 py-1"
                                                placeholder="Product-wise remarks"
                                              />
                                            </td>

                                            <td className="p-2 text-center">
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  removeVerifyProduct(index);
                                                }}
                                                className="text-red-600 hover:underline"
                                              >
                                                Delete
                                              </button>
                                            </td>
                                          </>
                                        )}

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

      <VerifyItemInventoryModal
        open={itemVerifyModal.open}
        item={itemVerifyModal.item}
        onClose={() =>
          setItemVerifyModal({
            open: false,
            index: null,
            item: null,
          })
        }
        onSave={saveItemInventoryDetails}
      />
    </section>
  );
};

export default PurchaseOrdersStatusSections;