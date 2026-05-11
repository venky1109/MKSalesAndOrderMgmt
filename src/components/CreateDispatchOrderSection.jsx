import React, { useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';

import {
  createInventoryDispatchOrder,
  fetchInventoryDispatchOrders,
  fetchStockTransactions,
} from '../features/inventory/stockManagerInventorySlice';

const CreateDispatchOrderSection = ({
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

  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);

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

 const barcodeRows = useMemo(() => {
  return catalogBarcodes
    .filter((b) => b?.is_active !== false)
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
        searchText: [
          barcode.mk_barcode,
          barcode.barcode,
          product?.product_code,
          product?.product_name_eng,
          product?.product_name_tel,
          brand?.brand_name_english,
          category?.category_name_english,
          unit?.unit_name,
          unit?.unit_short_code,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase(),
      };
    });
}, [catalogBarcodes, catalogProducts, brands, categories, units]);
  const suggestions = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return [];

    return barcodeRows
      .filter((row) => row.searchText.includes(value))
      .slice(0, 10);
  }, [barcodeRows, search]);

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

 const addBarcodeItem = (barcodeRow) => {
  const exists = items.find(
    (item) => String(item.product_barcode_id) === String(barcodeRow.id)
  );

  if (exists) {
    setItems((prev) =>
      prev.map((item) =>
        String(item.product_barcode_id) === String(barcodeRow.id)
          ? { ...item, qty: Number(item.qty || 0) + 1 }
          : item
      )
    );
    setSearch('');
    return;
  }

  setItems((prev) => [
    ...prev,
    {
      product_barcode_id: Number(barcodeRow.id),
      product_id: Number(barcodeRow.product_id),
      brand_id: Number(barcodeRow.brand_id),
      category_id: Number(barcodeRow.category_id),
      unit_id: Number(barcodeRow.unit_id),

      mk_barcode: barcodeRow.mk_barcode,
      barcode: barcodeRow.barcode,
      barcode_quantity: barcodeRow.quantity,

      product_code: barcodeRow.product?.product_code,
      product_name_eng: barcodeRow.product?.product_name_eng,
      product_name_tel: barcodeRow.product?.product_name_tel,

      brand_code: barcodeRow.brand?.brand_code,
      brand_name_english: barcodeRow.brand?.brand_name_english,

      category_code: barcodeRow.category?.category_code,
      category_name_english: barcodeRow.category?.category_name_english,

      unit_code: barcodeRow.unit?.unit_code,
      unit_short_code: barcodeRow.unit?.unit_short_code,
      unit_name: barcodeRow.unit?.unit_name,

      qty: 1,
      notes: '',
    },
  ]);

  setSearch('');
};

  const updateItem = (index, field, value) => {
    setItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const submitHandler = async (e) => {
    e.preventDefault();

    if (!sourceWarehouseId) {
      alert('Please select source warehouse');
      return;
    }

    if (!destinationId) {
      alert('Please select destination');
      return;
    }

    if (items.length === 0) {
      alert('Please add at least one product');
      return;
    }

    const invalidItem = items.find((item) => Number(item.qty) <= 0);

    if (invalidItem) {
      alert('Dispatch quantity must be greater than 0');
      return;
    }

  const payload = {
  source: `warehouse:${sourceWarehouseId}:${getSourceLabel(sourceWarehouse)}`,
  destination: `${destinationType}:${destinationId}:${getDestinationLabel(
    selectedDestination
  )}`,
  expected_dispatch_at: expectedDispatchAt || null,
  dispatch_notes: dispatchNotes || null,
  dispatch_status: 'draft',
  items: items.map((item) => ({
    product_barcode_id: item.product_barcode_id,
    product_id: item.product_id,
    brand_id: item.brand_id,
    category_id: item.category_id,
    unit_id: item.unit_id,
    qty: Number(item.qty),
    notes: item.notes || null,
  })),
};

    const result = await dispatch(createInventoryDispatchOrder(payload));

    if (createInventoryDispatchOrder.fulfilled.match(result)) {
      dispatch(fetchInventoryDispatchOrders());
      dispatch(fetchStockTransactions());

      setSourceWarehouseId('');
      setDestinationType('outlet');
      setDestinationId('');
      setExpectedDispatchAt('');
      setDispatchNotes('');
      setSearch('');
      setItems([]);
    }
  };

  return (
    <section className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-4 rounded-xl bg-blue-50 p-4">
        <h2 className="text-lg font-bold text-blue-900">
          Create Dispatch Order
        </h2>
        <p className="text-sm text-blue-700">
          Search product from product barcode. Brand, category and unit will come automatically.
        </p>
      </div>

      <form onSubmit={submitHandler} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Source Warehouse
            </label>
            <select
              value={sourceWarehouseId}
              onChange={(e) => setSourceWarehouseId(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="">Select warehouse</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.warehouse_code} - {warehouse.warehouse_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Dispatch To
            </label>
            <select
              value={destinationType}
              onChange={(e) => {
                setDestinationType(e.target.value);
                setDestinationId('');
              }}
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="outlet">Outlet</option>
              <option value="stakeholder">Stakeholder</option>
              <option value="warehouse">Warehouse</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Destination
            </label>
            <select
              value={destinationId}
              onChange={(e) => setDestinationId(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="">Select destination</option>
              {destinations.map((destination) => (
                <option key={destination.id} value={destination.id}>
                  {getDestinationLabel(destination)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Expected Dispatch
            </label>
            <input
              type="datetime-local"
              value={expectedDispatchAt}
              onChange={(e) => setExpectedDispatchAt(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">
            Dispatch Notes
          </label>
          <textarea
            value={dispatchNotes}
            onChange={(e) => setDispatchNotes(e.target.value)}
            rows={2}
            className="w-full rounded-lg border px-3 py-2"
            placeholder="Optional notes"
          />
        </div>

        <div className="rounded-xl border bg-slate-50 p-4">
          <label className="mb-1 block text-sm font-bold text-gray-700">
            Add Product
          </label>

          <div className="relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by barcode, product name, product code, brand..."
              className="w-full rounded-lg border px-3 py-3 text-sm"
            />

            {suggestions.length > 0 && (
              <div className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl border bg-white shadow-lg">
                {suggestions.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => addBarcodeItem(row)}
                    className="block w-full border-b px-3 py-3 text-left hover:bg-blue-50"
                  >
                    <div className="flex justify-between gap-3">
                      <div>
                        <div className="font-bold text-gray-900">
                          {row.product?.product_name_eng ||
                            row.product?.product_name_tel ||
                            'Product'}
                        </div>
                        <div className="text-xs text-gray-500">
                          Code: {row.product?.product_code || '-'} | Barcode:{' '}
                          {row.mk_barcode || row.barcode || '-'}
                        </div>
                      </div>

                      <div className="text-right text-xs">
                        <div className="font-semibold text-gray-700">
                          {row.brand?.brand_name_english || '-'}
                        </div>
                        <div className="text-gray-500">
                          {row.quantity || ''}{' '}
                          {row.unit?.unit_short_code ||
                            row.unit?.unit_code ||
                            row.unit?.unit_name ||
                            ''}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-2 text-left">Product</th>
                <th className="p-2 text-left">Barcode</th>
                <th className="p-2 text-left">Brand</th>
                <th className="p-2 text-left">Category</th>
                <th className="p-2 text-center">Qty</th>
                <th className="p-2 text-center">Unit</th>
                <th className="p-2 text-left">Notes</th>
                <th className="p-2 text-center">Remove</th>
              </tr>
            </thead>

            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-6 text-center text-gray-500">
                    No products added
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr key={`${item.product_barcode_id}-${index}`} className="border-t">
                    <td className="p-2">
                      <div className="font-semibold">
                        {item.product_code} -{' '}
                        {item.product_name_eng || item.product_name_tel}
                      </div>
                      {item.product_name_tel && (
                        <div className="text-xs text-gray-500">
                          {item.product_name_tel}
                        </div>
                      )}
                    </td>

                    <td className="p-2">
                      {item.mk_barcode || item.barcode || '-'}
                    </td>

                    <td className="p-2">{item.brand_name_english || '-'}</td>

                    <td className="p-2">{item.category_name_english || '-'}</td>

                    <td className="p-2 text-center">
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => updateItem(index, 'qty', e.target.value)}
                        className="w-24 rounded border px-2 py-1 text-center"
                      />
                    </td>

                    <td className="p-2 text-center">
                      {item.barcode_quantity || ''}{' '}
                      {item.unit_short_code || item.unit_code || item.unit_name}
                    </td>

                    <td className="p-2">
                      <input
                        value={item.notes || ''}
                        onChange={(e) => updateItem(index, 'notes', e.target.value)}
                        className="w-44 rounded border px-2 py-1"
                        placeholder="Optional"
                      />
                    </td>

                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="rounded-lg bg-red-100 px-3 py-1 text-red-700 hover:bg-red-200"
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

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-700 px-5 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {loading ? 'Saving...' : 'Create Dispatch Order'}
          </button>
        </div>
      </form>
    </section>
  );
};

export default CreateDispatchOrderSection;