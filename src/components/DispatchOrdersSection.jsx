import React from 'react';
import { useDispatch } from 'react-redux';

import {
  updateInventoryDispatchStatus,
  updateInventoryDispatchOrderItems,
  receiveDispatchToStakeholder,
  completeInternalPackingDispatch,
  deleteInventoryDispatchOrder,
  fetchInventoryDispatchOrders,
  fetchInventoryProducts,
  fetchStockTransactions,
} from '../features/inventory/stockManagerInventorySlice';
import DispatchItemsTable from './DispatchItemsTable';
import {
  getPackingLabelRowKey,
  getPackingLabelRows,
  printPackingLabels,
  summarizePackingLabelRows,
} from '../utils/packingLabelPrint';
import {
  formatDispatchDate,
  getDispatchItemBarcode,
  getDispatchItemBrand,
  getDispatchItemCategory,
  getDispatchItemPackingConfigurations,
  getDispatchItemProductName,
  getDispatchItemUnit,
  getPackingConfigUnit,
  getPackingConfigurationsFromNotes,
} from '../utils/dispatchDisplay';

const DispatchOrdersSection = ({ orders = [], loading = false, catalogBarcodes = [] }) => {
  const dispatch = useDispatch();
  const [labelDialog, setLabelDialog] = React.useState(null);
  const [excludedLabelKeys, setExcludedLabelKeys] = React.useState(new Set());

  const normalizeUnit = (value) =>
    String(value || '').toLowerCase().replace(/\./g, '').replace(/\s+/g, '');

  const getUnitQtyInGrams = (quantity, unit) => {
    const qty = Number(quantity || 0);
    const normalizedUnit = normalizeUnit(unit);

    if (!qty) return 0;
    if (normalizedUnit.startsWith('kg')) return qty * 1000;
    if (
      normalizedUnit.startsWith('gm') ||
      normalizedUnit.startsWith('gms') ||
      normalizedUnit === 'g'
    ) {
      return qty;
    }

    return qty;
  };

  const getSourceItemGrams = (item) => {
    const unitParts = String(getDispatchItemUnit(item)).split(/\s+/);
    const quantity = item.barcode_quantity || item.quantity || unitParts[0];
    const unit =
      item.unit_short_code ||
      item.unit_code ||
      item.unit_name ||
      unitParts.slice(1).join('');

    return getUnitQtyInGrams(quantity, unit);
  };

  const getPackingConfigGrams = (config) =>
    getUnitQtyInGrams(
      config.barcode_quantity || config.quantity,
      config.unit_short_code || config.unit_code || config.unit_name
    ) * Number(config.pack_count || 0);

  const getCorrectedInternalPackingUnits = (item) => {
    const configs =
      getDispatchItemPackingConfigurations(item).length > 0
        ? getDispatchItemPackingConfigurations(item)
        : getPackingConfigurationsFromNotes(item);
    const sourceGrams = getSourceItemGrams(item);
    const configuredGrams = configs.reduce(
      (sum, config) => sum + getPackingConfigGrams(config),
      0
    );

    if (!sourceGrams || !configuredGrams) return Number(item.no_of_units || item.qty || 0);

    return Number((configuredGrams / sourceGrams).toFixed(3));
  };

  const updateInternalPackingSourceQuantities = async (order) => {
    const items = (order.items || []).map((item) => {
      const correctedUnits = getCorrectedInternalPackingUnits(item);
      const packingConfigurations =
        getDispatchItemPackingConfigurations(item).length > 0
          ? getDispatchItemPackingConfigurations(item)
          : item.packing_configurations ||
            item.packingConfigurations ||
            item.packing_configs ||
            item.packingConfigs ||
            [];

      return {
        ...item,
        inventory_product_id: Number(item.inventory_product_id || item.id),
        product_barcode_id: Number(item.product_barcode_id),
        qty: correctedUnits,
        no_of_units: correctedUnits,
        exp_date: item.exp_date,
        notes: item.notes || null,
        packing_configurations: packingConfigurations,
      };
    });

    const shouldUpdate = items.some(
      (item, index) =>
        Number(item.no_of_units || 0) !==
        Number(order.items?.[index]?.no_of_units || order.items?.[index]?.qty || 0)
    );

    if (!shouldUpdate) return;

    await dispatch(
      updateInventoryDispatchOrderItems({
        id: order.id,
        items,
      })
    ).unwrap();
  };

  const getDestinationType = (order) =>
    String(order?.destination || '').split(':')[0].trim().toLowerCase();

  const getRouteName = (route = '') => {
    const parts = String(route || '').split(':');
    return parts.slice(2).join(':') || parts[1] || route || '';
  };

  const isOutletDispatch = (order) => getDestinationType(order) === 'outlet';

  const isStakeholderDispatch = (order) =>
    ['vendor', 'customer', 'stakeholder'].includes(getDestinationType(order));

  const isInternalPackingDispatch = (order) =>
    getDestinationType(order) === 'internal_packing';

  const isCompletedStatus = (status) =>
    ['received_to_outlet', 'received_by_stakeholder', 'dispatched'].includes(
      String(status || '').toLowerCase()
    );

  const markStatus = async (id, status) => {
    try {
      await dispatch(
        updateInventoryDispatchStatus({
          id,
          dispatch_status: status,
        })
      ).unwrap();

      dispatch(fetchInventoryDispatchOrders());
    } catch (error) {
      alert(error?.message || error || 'Failed to update dispatch status');
    }
  };

  const deleteOrder = async (id) => {
    if (!window.confirm('Delete this draft dispatch?')) return;

    try {
      await dispatch(deleteInventoryDispatchOrder(id)).unwrap();
      dispatch(fetchInventoryDispatchOrders());
    } catch (error) {
      alert(error?.message || error || 'Failed to delete dispatch');
    }
  };

  const receiveStakeholderDispatch = async (order) => {
    if (
      !window.confirm(
        `Receive dispatch ${order.dispatch_no} by stakeholder? This will reduce inventory stock.`
      )
    ) {
      return;
    }

    try {
      await dispatch(
        receiveDispatchToStakeholder({
          dispatchOrderId: order.id,
        })
      ).unwrap();

      dispatch(fetchInventoryDispatchOrders());
      dispatch(fetchInventoryProducts());
      dispatch(fetchStockTransactions());
    } catch (error) {
      alert(error?.message || error || 'Failed to receive dispatch by stakeholder');
    }
  };

  const firstValue = (...values) =>
    values.find((value) => value !== undefined && value !== null && value !== '');

  const getCatalogBarcode = (productBarcodeId) =>
    (catalogBarcodes || []).find(
      (barcode) =>
        String(
          barcode.id ||
            barcode.product_barcode_id ||
            barcode.productBarcodeId ||
            barcode.catalogProductBarcodeId ||
            barcode.catalogProductBarcodeID
        ) ===
        String(productBarcodeId)
    ) || {};

  const getRealMkBarcode = (...values) =>
    values
      .map((value) => String(value || '').trim())
      .find((value) => /^\d{8,}$/.test(value)) || '';

  const getProductBarcodeId = (...values) =>
    values
      .map((value) => String(value || '').trim())
      .find((value) => /^\d+$/.test(value)) || '';

  const getBarcodeUnitFields = (barcode = {}, fallback = {}) => ({
    barcode_quantity: firstValue(
      fallback.barcode_quantity,
      fallback.quantity,
      barcode.barcode_quantity,
      barcode.quantity
    ),
    quantity: firstValue(
      fallback.barcode_quantity,
      fallback.quantity,
      barcode.barcode_quantity,
      barcode.quantity
    ),
    unit_short_code: firstValue(
      fallback.unit_short_code,
      fallback.unit_code,
      fallback.unit_name,
      fallback.units,
      fallback.unit,
      barcode.unit_short_code,
      barcode.unit_code,
      barcode.unit_name,
      barcode.units,
      barcode.unit
    ),
    unit_name: firstValue(
      fallback.unit_name,
      fallback.unit_short_code,
      fallback.unit_code,
      fallback.units,
      fallback.unit,
      barcode.unit_name,
      barcode.unit_short_code,
      barcode.unit_code,
      barcode.units,
      barcode.unit
    ),
  });

  const getLabelReadyOrder = (order) => ({
    ...order,
    items: (order.items || []).map((item) => {
      const packingConfigurations = getDispatchItemPackingConfigurations(item);

      if (!packingConfigurations.length) {
        const productBarcodeId = getProductBarcodeId(
          item.product_barcode_id,
          item.productBarcodeId,
          item.catalogProductBarcodeId,
          item.catalogProductBarcodeID,
          item.label_id,
          item.labelId,
          item.mkid
        );
        const catalogBarcode = getCatalogBarcode(
          productBarcodeId
        );
        const postgresBarcodeId = getProductBarcodeId(
          productBarcodeId,
          catalogBarcode.id,
          catalogBarcode.product_barcode_id,
          catalogBarcode.productBarcodeId,
          catalogBarcode.catalogProductBarcodeId,
          catalogBarcode.catalogProductBarcodeID,
          catalogBarcode.mkid
        );
        const mkBarcode = getRealMkBarcode(
          catalogBarcode.mk_barcode,
          catalogBarcode.barcode,
          item.mk_barcode,
          item.barcode,
          item.bar_code
        );
        const unitFields = getBarcodeUnitFields(catalogBarcode, item);

        return mkBarcode
          ? {
              ...item,
              ...unitFields,
              product_barcode_id: postgresBarcodeId,
              productBarcodeId: postgresBarcodeId,
              catalogProductBarcodeId: postgresBarcodeId,
              catalogProductBarcodeID: postgresBarcodeId,
              label_id: postgresBarcodeId,
              labelId: postgresBarcodeId,
              mk_barcode: mkBarcode,
              barcode: mkBarcode,
              mkid: postgresBarcodeId,
            }
          : item;
      }

      return {
        ...item,
        packing_configurations: packingConfigurations.map((config) => {
          const productBarcodeId = getProductBarcodeId(
            config.product_barcode_id,
            config.productBarcodeId,
            config.catalogProductBarcodeId,
            config.catalogProductBarcodeID,
            config.label_id,
            config.labelId,
            config.mkid
          );
          const catalogBarcode = getCatalogBarcode(
            productBarcodeId
          );
          const postgresBarcodeId = getProductBarcodeId(
            productBarcodeId,
            catalogBarcode.id,
            catalogBarcode.product_barcode_id,
            catalogBarcode.productBarcodeId,
            catalogBarcode.catalogProductBarcodeId,
            catalogBarcode.catalogProductBarcodeID,
            catalogBarcode.mkid
          );
          const mkBarcode = getRealMkBarcode(
            catalogBarcode.mk_barcode,
            catalogBarcode.barcode,
            config.mk_barcode,
            config.barcode,
            config.bar_code,
            item.mk_barcode,
            item.barcode,
            item.bar_code
          );
          const unitFields = getBarcodeUnitFields(catalogBarcode, config);

          return mkBarcode
            ? {
                ...config,
                ...unitFields,
                product_barcode_id: postgresBarcodeId,
                productBarcodeId: postgresBarcodeId,
                catalogProductBarcodeId: postgresBarcodeId,
                catalogProductBarcodeID: postgresBarcodeId,
                label_id: postgresBarcodeId,
                labelId: postgresBarcodeId,
                mk_barcode: mkBarcode,
                barcode: mkBarcode,
                mkid: postgresBarcodeId,
              }
            : config;
        }),
      };
    }),
  });

  const getReceivePricePayload = (order) =>
    (order.items || []).flatMap((item) => {
      const configs =
        getDispatchItemPackingConfigurations(item).length > 0
          ? getDispatchItemPackingConfigurations(item)
          : getPackingConfigurationsFromNotes(item);

      if (!configs.length) {
        return [
          {
            dispatch_order_item_id: item.id,
            product_barcode_id: item.product_barcode_id,
            MK_BARCODE: item.mk_barcode || item.barcode || item.bar_code || '',
            barcode: item.mk_barcode || item.barcode || item.bar_code || '',
            image_url: item.image_url || item.imageUrl || '',
            qty: Number(item.qty || item.no_of_units || 0),
            no_of_units: Number(item.no_of_units || item.qty || 0),
            price: Number(firstValue(item.mrp_amount, item.mrp, item.price, 0)),
            dprice: Number(
              firstValue(
                item.package_amount,
                item.dprice,
                item.discount_price,
                item.discounted_price,
                item.selling_price,
                item.unit_price,
                item.price,
                0
              )
            ),
          },
        ];
      }

      return configs.map((config) => ({
        dispatch_order_item_id: item.id,
        product_barcode_id: config.product_barcode_id,
        MK_BARCODE: config.mk_barcode || config.barcode || config.bar_code || '',
        barcode: config.mk_barcode || config.barcode || config.bar_code || '',
        image_url: config.image_url || config.imageUrl || item.image_url || item.imageUrl || '',
        qty: Number(config.pack_count || config.qty || 0),
        no_of_units: Number(config.pack_count || config.qty || 0),
        price: Number(firstValue(config.mrp_amount, config.mrp, 0)),
        dprice: Number(
          firstValue(
            config.package_amount,
            config.dprice,
            config.discount_price,
            config.discounted_price,
            0
          )
        ),
      }));
    });

  const openLabelDialog = (order, shouldMarkDone = false) => {
    const labelReadyOrder = getLabelReadyOrder(order);
    const rows = getPackingLabelRows(labelReadyOrder);

    if (!rows.length) {
      alert('No labels available for this dispatch.');
      return;
    }

    setExcludedLabelKeys(new Set());
    setLabelDialog({
      order,
      labelReadyOrder,
      rows,
      shouldMarkDone,
    });
  };

  const toggleExcludedLabel = (key) => {
    setExcludedLabelKeys((current) => {
      const next = new Set(current);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  };

  const setAllLabelsIncluded = (included) => {
    if (!labelDialog) return;

    if (included) {
      setExcludedLabelKeys(new Set());
      return;
    }

    setExcludedLabelKeys(
      new Set(summarizePackingLabelRows(labelDialog.rows).map((row) => row.key))
    );
  };

  const runLabelAction = async (mode) => {
    if (!labelDialog) return;

    try {
      const completed = await printPackingLabels(labelDialog.labelReadyOrder, {
        mode,
        excludedRowKeys: Array.from(excludedLabelKeys),
        rows: labelDialog.rows,
      });

      if (!completed || mode === 'preview') return;

      if (labelDialog.shouldMarkDone) {
        await dispatch(
          updateInventoryDispatchStatus({
            id: labelDialog.order.id,
            dispatch_status: 'label_printed',
          })
        ).unwrap();

        dispatch(fetchInventoryDispatchOrders());
      }

      setLabelDialog(null);
    } catch (error) {
      alert(error?.message || error || 'Labels printed, but status update failed');
    }
  };

  const completeInternalPacking = async (order) => {
    if (
      !window.confirm(
        `Dispatch ${order.dispatch_no} to internal packing? This will reduce source inventory and add the new packing stock.`
      )
    ) {
      return;
    }

    try {
      const status = String(order.dispatch_status || '').toLowerCase();

      await updateInternalPackingSourceQuantities(order);

      if (status === 'packed') {
        await dispatch(
          updateInventoryDispatchStatus({
            id: order.id,
            dispatch_status: 'label_printed',
          })
        ).unwrap();
      }

      await dispatch(
        completeInternalPackingDispatch({
          dispatchOrderId: order.id,
        })
      ).unwrap();

      dispatch(fetchInventoryDispatchOrders());
      dispatch(fetchInventoryProducts());
      dispatch(fetchStockTransactions());
    } catch (error) {
      alert(error?.message || error || 'Failed to complete internal packing dispatch');
    }
  };

  const getStatusLabel = (status, order = null) => {
    const normalized = String(status || '').toLowerCase();

    if (normalized === 'received_to_outlet') return 'RECEIVED TO OUTLET';
    if (normalized === 'received_by_stakeholder' && isInternalPackingDispatch(order)) {
      return `RECEIVED IN ${getRouteName(order?.source) || 'WAREHOUSE'}`;
    }
    if (normalized === 'received_by_stakeholder') return 'RECEIVED BY STAKEHOLDER';
    if (normalized === 'sent') return 'SENT';
    if (normalized === 'packed') return 'PACKED';
    if (normalized === 'label_printed') return 'LABEL PRINTED';
    if (normalized === 'dispatched') return 'DISPATCHED';

    return normalized.toUpperCase();
  };

  const printDispatch = (order) => {
    const getPrintPrice = (value) => {
      if (value === undefined || value === null || value === '') return '-';
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric.toFixed(2) : String(value);
    };

    const rows = (order.items || [])
      .flatMap((item) => {
          const packingConfigs =
            getDispatchItemPackingConfigurations(item).length > 0
              ? getDispatchItemPackingConfigurations(item)
              : getPackingConfigurationsFromNotes(item);

          if (!packingConfigs.length) return [item];

        return packingConfigs.map((config, index) => {
          const catalogBarcode =
            catalogBarcodes.find(
              (barcode) =>
                String(barcode.id || barcode.product_barcode_id) ===
                String(config.product_barcode_id)
            ) || {};
          const noteConfig = getPackingConfigurationsFromNotes(item)[index] || {};
          const mergedConfig = {
            ...noteConfig,
            ...catalogBarcode,
            ...config,
            barcode_quantity:
              config.barcode_quantity ||
              catalogBarcode.quantity ||
              catalogBarcode.barcode_quantity ||
              noteConfig.barcode_quantity,
            unit_short_code:
              config.unit_short_code ||
              catalogBarcode.unit_short_code ||
              catalogBarcode.unit_name ||
              noteConfig.unit_short_code,
            mk_barcode:
              config.mk_barcode ||
              catalogBarcode.mk_barcode ||
              catalogBarcode.mkBarcode ||
              catalogBarcode.barcode ||
              noteConfig.mk_barcode,
            barcode:
              config.barcode ||
              catalogBarcode.barcode ||
              catalogBarcode.mk_barcode ||
              noteConfig.barcode,
          };

          return {
          ...item,
          product_name:
            mergedConfig.product_name ||
            mergedConfig.product_name_eng ||
            getDispatchItemProductName(item),
          mk_barcode:
            mergedConfig.mk_barcode ||
            mergedConfig.barcode ||
            mergedConfig.bar_code ||
            mergedConfig.product_barcode_id,
          qty: mergedConfig.pack_count || mergedConfig.qty,
          barcode_quantity: mergedConfig.barcode_quantity || mergedConfig.quantity,
          unit_short_code:
            mergedConfig.unit_short_code || mergedConfig.unit_code || mergedConfig.unit_name,
          notes:
            [
              mergedConfig.package_amount ? `Purchase Rs ${mergedConfig.package_amount}` : '',
              mergedConfig.mrp_amount ? `MRP Rs ${mergedConfig.mrp_amount}` : '',
            ]
              .filter(Boolean)
              .join(' | ') || item.notes,
          unit_price:
            mergedConfig.package_amount ||
            mergedConfig.packageAmount ||
            mergedConfig.purchase_amount ||
            mergedConfig.purchaseAmount ||
            item.unit_price,
          unit_mrp:
            mergedConfig.mrp_amount ||
            mergedConfig.mrpAmount ||
            mergedConfig.MRP ||
            mergedConfig.mrp ||
            item.unit_mrp,
          _isPackingConfig: true,
        };
        });
      })
      .map(
        (item, index) => `
          <tr>
            <td class="text-center">${index + 1}</td>
            <td>${getDispatchItemBarcode(item)}</td>
            <td>${getDispatchItemProductName(item)}</td>
            <td>${getDispatchItemCategory(item)}</td>
            <td>${getDispatchItemBrand(item)}</td>
            <td class="text-center">${item.qty || ''}</td>
            <td class="text-center">${
              item._isPackingConfig ? getPackingConfigUnit(item) : getDispatchItemUnit(item)
            }</td>
            <td>${formatDispatchDate(item.exp_date)}</td>
            <td class="text-right">${getPrintPrice(item.unit_price)}</td>
            <td class="text-right">${getPrintPrice(item.unit_mrp)}</td>
            <td>${item.notes || '-'}</td>
          </tr>
        `
      )
      .join('');

    const html = `
      <html>
        <head>
          <title>${order.dispatch_no || 'Dispatch Print'}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              font-size: 12px;
              color: #111827;
            }

            h2 {
              margin: 0 0 4px 0;
              font-size: 20px;
            }

            .subtitle {
              margin-bottom: 14px;
              color: #475569;
              font-size: 12px;
            }

            .meta {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 6px 16px;
              margin-bottom: 14px;
              padding: 10px;
              border: 1px solid #d1d5db;
              border-radius: 8px;
              background: #f8fafc;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 12px;
            }

            th,
            td {
              border: 1px solid #333;
              padding: 6px;
              text-align: left;
              vertical-align: top;
            }

            th {
              background: #f1f5f9;
              font-weight: bold;
            }

            .text-center {
              text-align: center;
            }

            .text-right {
              text-align: right;
            }

            .footer {
              margin-top: 45px;
              display: flex;
              justify-content: space-between;
              font-weight: bold;
            }

            @media print {
              body {
                padding: 10px;
              }

              button {
                display: none;
              }
            }
          </style>
        </head>

        <body>
          <h2>Inventory Dispatch</h2>
          <div class="subtitle">Dispatch copy for stock movement</div>

          <div class="meta">
            <div><b>Dispatch No:</b> ${order.dispatch_no || '-'}</div>
            <div><b>Status:</b> ${getStatusLabel(order.dispatch_status, order)}</div>
            <div><b>Source:</b> ${order.source || '-'}</div>
            <div><b>Destination:</b> ${order.destination || '-'}</div>
            <div><b>Expected:</b> ${
              order.expected_dispatch_at
                ? new Date(order.expected_dispatch_at).toLocaleString()
                : '-'
            }</div>
            <div><b>Notes:</b> ${order.dispatch_notes || '-'}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th class="text-center">S.No</th>
                <th>Barcode</th>
                <th>Product</th>
                <th>Category</th>
                <th>Brand</th>
                <th class="text-center">Qty</th>
                <th class="text-center">Unit</th>
                <th>Expiry</th>
                <th class="text-right">Unit Price</th>
                <th class="text-right">MRP</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${
                rows ||
                `<tr>
                  <td colspan="11" class="text-center">No items</td>
                </tr>`
              }
            </tbody>
          </table>

          <div class="footer">
            <div>Packed By: __________________</div>
            <div>Label Printed By: __________________</div>
            <div>Dispatched By: __________________</div>
          </div>

          <script>
            window.onload = function () {
              window.print();
              window.onafterprint = function () {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=1000,height=700');

    if (!printWindow) {
      alert('Please allow popups to print dispatch.');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <section className="rounded-2xl border bg-white p-4 shadow">
      <div className="mb-4 rounded-xl bg-indigo-50 p-3">
        <h2 className="text-lg font-bold text-indigo-900">
          Inventory Dispatch Orders
        </h2>
        <p className="text-sm text-indigo-700">
          Flow: Sent - Packed - Label Printed - Dispatched - Received.
        </p>
      </div>

      {loading && (
        <div className="py-6 text-center text-gray-500">
          Loading dispatch orders...
        </div>
      )}

      {!loading && orders.length === 0 && (
        <div className="rounded-xl border border-dashed p-8 text-center text-gray-500">
          No dispatch orders found
        </div>
      )}

      <div className="space-y-4">
        {orders.map((order) => {
          const status = String(order.dispatch_status || '').toLowerCase();

          return (
            <article key={order.id} className="rounded-2xl border p-4 shadow-sm">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-900">
                      {order.dispatch_no}
                    </h3>
                    <StatusBadge status={order.dispatch_status} order={order} />
                  </div>

                  <p className="mt-1 text-sm text-gray-600">
                    <span className="font-semibold">Source:</span>{' '}
                    {order.source || '-'}
                  </p>

                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Destination:</span>{' '}
                    {order.destination || '-'}
                  </p>

                  {order.expected_dispatch_at && (
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">Expected:</span>{' '}
                      {new Date(order.expected_dispatch_at).toLocaleString()}
                    </p>
                  )}

                  {order.dispatch_notes && (
                    <p className="mt-1 text-sm text-gray-500">
                      Notes: {order.dispatch_notes}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => printDispatch(order)}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Print
                  </button>

                  {status === 'draft' && (
                    <>
                      <button
                        type="button"
                        onClick={() => markStatus(order.id, 'sent')}
                        className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
                      >
                        Mark Sent
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteOrder(order.id)}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </>
                  )}

                  {status === 'sent' && (
                    <button
                      type="button"
                      onClick={() => markStatus(order.id, 'packed')}
                      className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
                    >
                      Mark Packed
                    </button>
                  )}

                  {status === 'packed' &&
                    (isInternalPackingDispatch(order) ? (
                      <>
                        <button
                          type="button"
                          onClick={() => openLabelDialog(order, true)}
                          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
                        >
                          Label Print
                        </button>
                        <button
                          type="button"
                          onClick={() => completeInternalPacking(order)}
                          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                        >
                          Dispatch Packings
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => markStatus(order.id, 'dispatched')}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                      >
                        Mark Dispatched
                      </button>
                    ))}

                  {status === 'label_printed' && isInternalPackingDispatch(order) && (
                    <>
                      <button
                        type="button"
                        onClick={() => openLabelDialog(order, false)}
                        className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
                      >
                        Reprint Labels
                      </button>
                      <button
                        type="button"
                        onClick={() => completeInternalPacking(order)}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                      >
                        Dispatch Packings
                      </button>
                    </>
                  )}

                  {status === 'dispatched' &&
                    (isOutletDispatch(order) ? (
                      <span className="rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-bold text-green-700">
                        Waiting POS Receive
                      </span>
                    ) : isStakeholderDispatch(order) ? (
                      <button
                        type="button"
                        onClick={() => receiveStakeholderDispatch(order)}
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                      >
                        Receive By Stakeholder
                      </button>
                    ) : isInternalPackingDispatch(order) ? (
                      <button
                        type="button"
                        onClick={() => markStatus(order.id, 'received_by_stakeholder')}
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                      >
                        Mark Received In {getRouteName(order.source) || 'Warehouse'}
                      </button>
                    ) : (
                      <span className="rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700">
                        Dispatched To {getDestinationType(order) || 'Destination'}
                      </span>
                    ))}

                  {!['cancelled'].includes(status) && !isCompletedStatus(status) && (
                    <button
                      type="button"
                      onClick={() => markStatus(order.id, 'cancelled')}
                      className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 overflow-x-auto rounded-xl border">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left">Product</th>
                      <th className="px-3 py-2 text-left">Barcode</th>
                      <th className="px-3 py-2 text-left">Category</th>
                      <th className="px-3 py-2 text-left">Brand</th>
                      <th className="px-3 py-2 text-center">Qty</th>
                      <th className="px-3 py-2 text-center">Unit</th>
                      <th className="px-3 py-2 text-left">Expiry</th>
                      <th className="px-3 py-2 text-right">Unit Price</th>
                      <th className="px-3 py-2 text-right">MRP</th>
                      <th className="px-3 py-2 text-left">Notes</th>
                    </tr>
                  </thead>

                  <DispatchItemsTable
                    items={order.items || []}
                    catalogBarcodes={catalogBarcodes}
                  />
                </table>
              </div>
            </article>
          );
        })}
      </div>

      {labelDialog && (
        <LabelPrintDialog
          order={labelDialog.order}
          rows={summarizePackingLabelRows(labelDialog.rows)}
          excludedKeys={excludedLabelKeys}
          selectedCount={labelDialog.rows.filter(
            (row) => !excludedLabelKeys.has(getPackingLabelRowKey(row))
          ).length}
          onToggle={toggleExcludedLabel}
          onIncludeAll={() => setAllLabelsIncluded(true)}
          onExcludeAll={() => setAllLabelsIncluded(false)}
          onPreview={() => runLabelAction('preview')}
          onPrint={() => runLabelAction('print')}
          onClose={() => setLabelDialog(null)}
        />
      )}
    </section>
  );
};

const LabelPrintDialog = ({
  order,
  rows,
  excludedKeys,
  selectedCount,
  onToggle,
  onIncludeAll,
  onExcludeAll,
  onPreview,
  onPrint,
  onClose,
}) => {
  const selectedProducts = rows.filter((row) => !excludedKeys.has(row.key)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
        <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Print Packing Labels</h3>
            <p className="text-sm text-gray-600">
              {order.dispatch_no || '-'} - {selectedCount} labels selected
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="self-start rounded-lg border px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-gray-50 px-4 py-3">
          <div className="text-sm font-semibold text-gray-700">
            {selectedProducts} of {rows.length} products included
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onIncludeAll}
              className="rounded-lg border px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-white"
            >
              Include All
            </button>
            <button
              type="button"
              onClick={onExcludeAll}
              className="rounded-lg border px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-white"
            >
              Exclude All
            </button>
          </div>
        </div>

        <div className="max-h-[55vh] overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-gray-100 text-gray-700">
              <tr>
                <th className="px-3 py-2 text-left">Print</th>
                <th className="px-3 py-2 text-left">Product</th>
                <th className="px-3 py-2 text-left">Barcode</th>
                <th className="px-3 py-2 text-left">Unit</th>
                <th className="px-3 py-2 text-center">Labels</th>
                <th className="px-3 py-2 text-right">MRP</th>
                <th className="px-3 py-2 text-right">MK Price</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const included = !excludedKeys.has(row.key);

                return (
                  <tr key={row.key} className={included ? 'border-t' : 'border-t bg-red-50 text-gray-500'}>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={included}
                        onChange={() => onToggle(row.key)}
                        className="h-4 w-4"
                        aria-label={`Include ${row.productName}`}
                      />
                    </td>
                    <td className="px-3 py-2 font-semibold text-gray-900">{row.productName || '-'}</td>
                    <td className="px-3 py-2">{row.barcode || row.labelId || '-'}</td>
                    <td className="px-3 py-2">{row.unit || '-'}</td>
                    <td className="px-3 py-2 text-center">{row.count}</td>
                    <td className="px-3 py-2 text-right">{row.mrp || '-'}</td>
                    <td className="px-3 py-2 text-right">{row.price || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-2 border-t p-4 md:flex-row md:items-center md:justify-end">
          <button
            type="button"
            onClick={onPreview}
            disabled={!selectedCount}
            className="rounded-lg border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Preview
          </button>
          <button
            type="button"
            onClick={onPrint}
            disabled={!selectedCount}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Print Selected
          </button>
        </div>
      </div>
    </div>
  );
};

const StatusBadge = ({ status, order }) => {
  const normalized = String(status || 'draft').toLowerCase();
  const destinationType = String(order?.destination || '')
    .split(':')[0]
    .trim()
    .toLowerCase();
  const sourceName =
    String(order?.source || '').split(':').slice(2).join(':') ||
    String(order?.source || '').split(':')[1] ||
    'WAREHOUSE';

  const cls =
    normalized === 'draft'
      ? 'bg-yellow-100 text-yellow-800'
      : normalized === 'sent'
      ? 'bg-purple-100 text-purple-800'
      : normalized === 'packed'
      ? 'bg-orange-100 text-orange-800'
      : normalized === 'label_printed'
      ? 'bg-sky-100 text-sky-800'
      : normalized === 'dispatched'
      ? 'bg-indigo-100 text-indigo-800'
      : normalized === 'received_to_outlet'
      ? 'bg-green-100 text-green-800'
      : normalized === 'received_by_stakeholder'
      ? 'bg-green-100 text-green-800'
      : normalized === 'cancelled'
      ? 'bg-red-100 text-red-800'
      : 'bg-gray-100 text-gray-800';

  const label =
    normalized === 'received_to_outlet'
      ? 'RECEIVED TO OUTLET'
      : normalized === 'received_by_stakeholder' && destinationType === 'internal_packing'
      ? `RECEIVED IN ${sourceName}`
      : normalized === 'received_by_stakeholder'
      ? 'RECEIVED BY STAKEHOLDER'
      : normalized === 'label_printed'
      ? 'LABEL PRINTED'
      : normalized.toUpperCase();

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${cls}`}>
      {label}
    </span>
  );
};

export default DispatchOrdersSection;
