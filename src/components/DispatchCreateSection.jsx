import React, { useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';

import { createInventoryDispatchOrder } from '../features/inventory/stockManagerInventorySlice';

const DispatchCreateSection = ({
  catalogProducts = [],
  catalogBarcodes = [],
  brands = [],
  categories = [],
  units = [],
  suppliers = [],
  warehouses = [],
  outlets = [],
  loading = false,
}) => {
  const dispatch = useDispatch();

  const [sourceWarehouseId, setSourceWarehouseId] = useState('');
  const [destinationType, setDestinationType] = useState('outlet');
  const [destinationId, setDestinationId] = useState('');
  const [expectedDispatchAt, setExpectedDispatchAt] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');

  const [productBarcodeId, setProductBarcodeId] = useState('');
  const [qty, setQty] = useState('');
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState([]);

  const getProductById = (id) =>
    catalogProducts.find((p) => String(p.id) === String(id));

  const getBrandById = (id) =>
    brands.find((b) => String(b.id) === String(id));

  const getCategoryById = (id) =>
    categories.find((c) => String(c.id) === String(id));

  const getUnitById = (id) =>
    units.find((u) => String(u.id) === String(id));

  const destinations = useMemo(() => {
    if (destinationType === 'warehouse') return warehouses;
    if (destinationType === 'outlet') return outlets;
    if (destinationType === 'stakeholder') return suppliers;
    return [];
  }, [destinationType, warehouses, outlets, suppliers]);

  const sourceWarehouse = warehouses.find(
    (w) => String(w.id) === String(sourceWarehouseId)
  );

  const selectedDestination = destinations.find(
    (d) => String(d.id) === String(destinationId)
  );

  const selectedBarcode = catalogBarcodes.find(
    (b) => String(b.id) === String(productBarcodeId)
  );

  const selectedProduct = getProductById(selectedBarcode?.product_id);
  const selectedBrand = getBrandById(selectedBarcode?.brand_id);
  const selectedCategory = getCategoryById(selectedBarcode?.category_id);
  const selectedUnit = getUnitById(selectedBarcode?.unit_id);

  const productBarcodeOptions = useMemo(() => {
  return catalogBarcodes
    .filter((barcode) => barcode?.is_active !== false)
    .map((barcode) => {
      const product = catalogProducts.find(
        (p) => String(p.id) === String(barcode.product_id)
      );

      const brand = brands.find(
        (b) => String(b.id) === String(barcode.brand_id)
      );

      const category = categories.find(
        (c) => String(c.id) === String(barcode.category_id)
      );

      const unit = units.find(
        (u) => String(u.id) === String(barcode.unit_id)
      );

      return {
        ...barcode,
        product,
        brand,
        category,
        unit,
        label: [
          barcode.mk_barcode || barcode.barcode,
          product?.product_code,
          product?.product_name_eng || product?.product_name_tel,
          brand?.brand_name_english,
          `${barcode.quantity || ''} ${
            unit?.unit_short_code || unit?.unit_code || unit?.unit_name || ''
          }`,
        ]
          .filter(Boolean)
          .join(' | '),
      };
    });
}, [catalogBarcodes, catalogProducts, brands, categories, units]);
  const getSourceLabel = (item) => {
    if (!item) return '';
    return `${item.warehouse_code || ''} - ${item.warehouse_name || ''}`;
  };

  const getDestinationLabel = (item) => {
    if (!item) return '';

    if (destinationType === 'warehouse') {
      return `${item.warehouse_code || ''} - ${item.warehouse_name || ''}`;
    }

    if (destinationType === 'outlet') {
      return `${item.outlet_code || ''} - ${item.outlet_name || ''}`;
    }

    return `${item.stakeholder_code || item.stackholder_code || ''} - ${
      item.stakeholder_name || ''
    }`;
  };

  const resetItemForm = () => {
    setProductBarcodeId('');
    setQty('');
    setNotes('');
  };

  const addItem = () => {
    if (!productBarcodeId) {
      alert('Please select product barcode');
      return;
    }

    if (!selectedBarcode) {
      alert('Selected product barcode not found');
      return;
    }

    if (!qty || Number(qty) <= 0) {
      alert('Quantity must be greater than 0');
      return;
    }

    const newItem = {
      product_barcode_id: Number(selectedBarcode.id),
      product_id: Number(selectedBarcode.product_id),
      brand_id: Number(selectedBarcode.brand_id),
      category_id: Number(selectedBarcode.category_id),
      unit_id: Number(selectedBarcode.unit_id),
      qty: Number(qty),
      notes: notes || '',

      mk_barcode: selectedBarcode.mk_barcode,
      barcode: selectedBarcode.barcode,
      barcode_quantity: selectedBarcode.quantity,

      product_code: selectedProduct?.product_code,
      product_name_eng: selectedProduct?.product_name_eng,
      product_name_tel: selectedProduct?.product_name_tel,

      brand_code: selectedBrand?.brand_code,
      brand_name_english: selectedBrand?.brand_name_english,

      category_code: selectedCategory?.category_code,
      category_name_english: selectedCategory?.category_name_english,

      unit_code: selectedUnit?.unit_code,
      unit_short_code: selectedUnit?.unit_short_code,
      unit_name: selectedUnit?.unit_name,
    };

    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (i) =>
          String(i.product_barcode_id) === String(newItem.product_barcode_id)
      );

      if (existingIndex !== -1) {
        return prev.map((item, index) =>
          index === existingIndex
            ? {
                ...item,
                qty: Number(item.qty) + Number(newItem.qty),
                notes: newItem.notes || item.notes,
              }
            : item
        );
      }

      return [...prev, newItem];
    });

    resetItemForm();
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const createDispatch = async () => {
    if (!sourceWarehouseId) {
      alert('Please select source warehouse');
      return;
    }

    if (!destinationId) {
      alert('Please select destination');
      return;
    }

    if (items.length === 0) {
      alert('Please add at least one item');
      return;
    }

    const payload = {
      source: `warehouse:${sourceWarehouseId}:${getSourceLabel(sourceWarehouse)}`,
      destination: `${destinationType}:${destinationId}:${getDestinationLabel(
        selectedDestination
      )}`,
      dispatch_notes: dispatchNotes || null,
      expected_dispatch_at: expectedDispatchAt || null,
      dispatch_status: 'draft',
      items: items.map((item) => ({
        product_barcode_id: item.product_barcode_id,
        product_id: item.product_id,
        brand_id: item.brand_id,
        category_id: item.category_id,
        unit_id: item.unit_id,
        qty: item.qty,
        notes: item.notes || null,
      })),
    };

    const result = await dispatch(createInventoryDispatchOrder(payload));

    if (createInventoryDispatchOrder.fulfilled.match(result)) {
      setSourceWarehouseId('');
      setDestinationType('outlet');
      setDestinationId('');
      setExpectedDispatchAt('');
      setDispatchNotes('');
      resetItemForm();
      setItems([]);
    }
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
      <header className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Create Inventory Dispatch</h2>
            <p className="mt-1 text-sm text-blue-100">
              Same purchase-order style flow. Select destination, choose product barcode,
              enter quantity, and add items.
            </p>
          </div>

          <div className="rounded-2xl bg-white/15 px-4 py-2 text-right">
            <p className="text-xs text-blue-100">Items</p>
            <p className="text-2xl font-bold">{items.length}</p>
          </div>
        </div>
      </header>

      <div className="space-y-6 p-6">
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="mb-4 text-base font-bold text-slate-800">
            Dispatch Details
          </h3>

          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                Source Warehouse
              </label>
              <select
                value={sourceWarehouseId}
                onChange={(e) => setSourceWarehouseId(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              >
                <option value="">Select warehouse</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.warehouse_code} - {w.warehouse_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                Dispatch To
              </label>
              <select
                value={destinationType}
                onChange={(e) => {
                  setDestinationType(e.target.value);
                  setDestinationId('');
                }}
                className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              >
                <option value="outlet">Outlet</option>
                <option value="stakeholder">Stakeholder</option>
                <option value="warehouse">Warehouse</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                Destination
              </label>
              <select
                value={destinationId}
                onChange={(e) => setDestinationId(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              >
                <option value="">Select destination</option>
                {destinations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {getDestinationLabel(d)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                Expected Dispatch
              </label>
              <input
                type="datetime-local"
                value={expectedDispatchAt}
                onChange={(e) => setExpectedDispatchAt(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
              Dispatch Notes
            </label>
            <textarea
              value={dispatchNotes}
              onChange={(e) => setDispatchNotes(e.target.value)}
              rows={2}
              className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              placeholder="Optional notes"
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Add Dispatch Items
              </h3>
              <p className="text-xs text-slate-500">
                Product suggestion is from product_barcode. Brand, category and unit
                auto-fill from selected barcode.
              </p>
            </div>

            <button
              type="button"
              onClick={addItem}
              className="rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
            >
              Add Item
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-3 md:grid-cols-12">
                <div className="md:col-span-7">
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                    Product Barcode
                  </label>
                  <select
                    value={productBarcodeId}
                    onChange={(e) => setProductBarcodeId(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="">Select product barcode</option>
                    {productBarcodeOptions.map((barcode) => (
                      <option key={barcode.id} value={barcode.id}>
                        {barcode.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                    placeholder="Qty"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                    Notes
                  </label>
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <p className="mb-3 text-xs font-bold uppercase text-blue-700">
                Selected Product Details
              </p>

              {selectedBarcode ? (
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Product</p>
                    <p className="font-bold text-slate-800">
                      {selectedProduct?.product_code
                        ? `${selectedProduct.product_code} - `
                        : ''}
                      {selectedProduct?.product_name_eng ||
                        selectedProduct?.product_name_tel ||
                        '-'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-500">Barcode</p>
                      <p className="font-semibold text-slate-800">
                        {selectedBarcode.mk_barcode || selectedBarcode.barcode || '-'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-500">Unit</p>
                      <p className="font-semibold text-slate-800">
                        {selectedBarcode.quantity || ''}{' '}
                        {selectedUnit?.unit_short_code ||
                          selectedUnit?.unit_code ||
                          selectedUnit?.unit_name ||
                          '-'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-500">Brand</p>
                      <p className="font-semibold text-slate-800">
                        {selectedBrand?.brand_name_english || '-'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        Category
                      </p>
                      <p className="font-semibold text-slate-800">
                        {selectedCategory?.category_name_english || '-'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Select a product barcode to view product, brand, category and unit.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-3">
            <h3 className="font-bold text-slate-800">Dispatch Items</h3>
            <p className="text-sm font-semibold text-slate-500">
              Total Items: {items.length}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Product</th>
                  <th className="px-4 py-3 text-left">Barcode</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Brand</th>
                  <th className="px-4 py-3 text-center">Qty</th>
                  <th className="px-4 py-3 text-center">Unit</th>
                  <th className="px-4 py-3 text-left">Notes</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>

              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No dispatch items added
                    </td>
                  </tr>
                ) : (
                  items.map((item, index) => (
                    <tr
                      key={`${item.product_barcode_id}-${index}`}
                      className="border-t hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-800">
                          {item.product_code
                            ? `${item.product_code} - `
                            : ''}
                          {item.product_name_eng || item.product_name_tel || '-'}
                        </p>
                        {item.product_name_tel ? (
                          <p className="text-xs text-slate-500">
                            {item.product_name_tel}
                          </p>
                        ) : null}
                      </td>

                      <td className="px-4 py-3 font-semibold text-slate-700">
                        {item.mk_barcode || item.barcode || '-'}
                      </td>

                      <td className="px-4 py-3">
                        {item.category_name_english || '-'}
                      </td>

                      <td className="px-4 py-3">
                        {item.brand_name_english || '-'}
                      </td>

                      <td className="px-4 py-3 text-center font-bold">
                        {item.qty}
                      </td>

                      <td className="px-4 py-3 text-center">
                        {item.barcode_quantity || ''}{' '}
                        {item.unit_short_code || item.unit_code || item.unit_name}
                      </td>

                      <td className="px-4 py-3">{item.notes || '-'}</td>

                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="rounded-xl bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-200"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={createDispatch}
            disabled={loading}
            className="rounded-2xl bg-green-600 px-6 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60"
          >
            {loading ? 'Saving...' : 'Create Dispatch'}
          </button>
        </div>
      </div>
    </section>
  );
};

export default DispatchCreateSection;