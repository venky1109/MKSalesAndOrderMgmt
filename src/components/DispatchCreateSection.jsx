import React, { useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';

import { createInventoryDispatchOrder } from '../features/inventory/stockManagerInventorySlice';

const DispatchCreateSection = ({
  inventoryProducts = [],
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

  const [inventoryProductId, setInventoryProductId] = useState('');
  const [noOfUnits, setNoOfUnits] = useState('');
  const [notes, setNotes] = useState('');

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

  const availableInventoryOptions = useMemo(() => {
    return inventoryProducts
      .filter((item) => {
        const availableUnits = Number(item.no_of_units || 0);
        const sameWarehouse =
          !sourceWarehouseId ||
          String(item.warehouse_id) === String(sourceWarehouseId);

        return availableUnits > 0 && sameWarehouse && item.is_active !== false;
      })
      .map((item) => ({
        ...item,
        label: [
          item.mk_barcode || item.bar_code || item.barcode,
          item.product_code,
          item.product_name,
          item.brand_name_english,
          item.category_name_english,
          item.exp_date ? `Exp: ${String(item.exp_date).slice(0, 10)}` : '',
          `Available: ${Number(item.no_of_units || 0).toFixed(0)} units`,
        ]
          .filter(Boolean)
          .join(' | '),
      }));
  }, [inventoryProducts, sourceWarehouseId]);

  const selectedInventory = availableInventoryOptions.find(
    (item) => String(item.id) === String(inventoryProductId)
  );

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
    setInventoryProductId('');
    setNoOfUnits('');
    setNotes('');
  };

  const getAlreadyAddedUnits = (productBarcodeId, expDate) => {
    return items
      .filter(
        (item) =>
          String(item.product_barcode_id) === String(productBarcodeId) &&
          String(item.exp_date).slice(0, 10) === String(expDate).slice(0, 10)
      )
      .reduce((sum, item) => sum + Number(item.no_of_units || 0), 0);
  };

  const addItem = () => {
    if (!sourceWarehouseId) {
      alert('Please select source warehouse first');
      return;
    }

    if (!inventoryProductId) {
      alert('Please select available inventory product');
      return;
    }

    if (!selectedInventory) {
      alert('Selected inventory product not found');
      return;
    }

    if (!noOfUnits || Number(noOfUnits) <= 0) {
      alert('No. of units must be greater than 0');
      return;
    }

    const dispatchUnits = Number(noOfUnits);
    const availableUnits = Number(selectedInventory.no_of_units || 0);

    const alreadyAddedUnits = getAlreadyAddedUnits(
      selectedInventory.product_barcode_id,
      selectedInventory.exp_date
    );

    if (alreadyAddedUnits + dispatchUnits > availableUnits) {
      alert(
        `Only ${availableUnits} units available. Already added ${alreadyAddedUnits}, trying to add ${dispatchUnits}.`
      );
      return;
    }

    const newItem = {
      inventory_product_row_id: Number(selectedInventory.id),

      product_barcode_id: Number(selectedInventory.product_barcode_id),
      product_id: Number(selectedInventory.id),
      brand_id: selectedInventory.brand_id
        ? Number(selectedInventory.brand_id)
        : null,
      category_id: selectedInventory.category_id
        ? Number(selectedInventory.category_id)
        : null,
      unit_id: selectedInventory.unit_id ? Number(selectedInventory.unit_id) : null,

      qty: dispatchUnits,
      no_of_units: dispatchUnits,
      exp_date: selectedInventory.exp_date
        ? String(selectedInventory.exp_date).slice(0, 10)
        : null,
      notes: notes || '',

      available_units: availableUnits,
      mk_barcode:
        selectedInventory.mk_barcode ||
        selectedInventory.bar_code ||
        selectedInventory.barcode ||
        '',
      barcode: selectedInventory.barcode || selectedInventory.bar_code || '',
      barcode_quantity: selectedInventory.barcode_quantity || '',

      product_code: selectedInventory.product_code,
      product_name: selectedInventory.product_name,

      brand_name_english: selectedInventory.brand_name_english,
      category_name_english: selectedInventory.category_name_english,

      unit_short_code: selectedInventory.unit_short_code,
      unit_name: selectedInventory.unit_name,
    };

    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          String(item.product_barcode_id) === String(newItem.product_barcode_id) &&
          String(item.exp_date).slice(0, 10) === String(newItem.exp_date).slice(0, 10)
      );

      if (existingIndex !== -1) {
        return prev.map((item, index) =>
          index === existingIndex
            ? {
                ...item,
                qty: Number(item.qty) + Number(newItem.qty),
                no_of_units:
                  Number(item.no_of_units) + Number(newItem.no_of_units),
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
        no_of_units: item.no_of_units,
        exp_date: item.exp_date,
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
              Select only available inventory products and dispatch available units.
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
                onChange={(e) => {
                  setSourceWarehouseId(e.target.value);
                  resetItemForm();
                  setItems([]);
                }}
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
                Products are shown from inventory only. Available units and expiry are visible.
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
                    Available Inventory Product
                  </label>
                  <select
                    value={inventoryProductId}
                    onChange={(e) => setInventoryProductId(e.target.value)}
                    disabled={!sourceWarehouseId}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                  >
                    <option value="">
                      {sourceWarehouseId
                        ? 'Select available inventory product'
                        : 'Select source warehouse first'}
                    </option>

                    {availableInventoryOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                    Units
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedInventory?.no_of_units || undefined}
                    value={noOfUnits}
                    onChange={(e) => setNoOfUnits(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                    placeholder="Units"
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
                Selected Inventory Details
              </p>

              {selectedInventory ? (
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Product</p>
                    <p className="font-bold text-slate-800">
                      {selectedInventory.product_code
                        ? `${selectedInventory.product_code} - `
                        : ''}
                      {selectedInventory.product_name || '-'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-500">Barcode</p>
                      <p className="font-semibold text-slate-800">
                        {selectedInventory.mk_barcode ||
                          selectedInventory.bar_code ||
                          selectedInventory.barcode ||
                          '-'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        Available Units
                      </p>
                      <p className="font-bold text-green-700">
                        {Number(selectedInventory.no_of_units || 0).toFixed(0)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-500">Expiry</p>
                      <p className="font-semibold text-slate-800">
                        {selectedInventory.exp_date
                          ? String(selectedInventory.exp_date).slice(0, 10)
                          : '-'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-500">Unit</p>
                      <p className="font-semibold text-slate-800">
                        {selectedInventory.unit_short_code ||
                          selectedInventory.unit_name ||
                          '-'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-500">Brand</p>
                      <p className="font-semibold text-slate-800">
                        {selectedInventory.brand_name_english || '-'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        Category
                      </p>
                      <p className="font-semibold text-slate-800">
                        {selectedInventory.category_name_english || '-'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Select an available inventory product to view stock details.
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
                  <th className="px-4 py-3 text-left">Expiry</th>
                  <th className="px-4 py-3 text-center">Available</th>
                  <th className="px-4 py-3 text-center">Dispatch Units</th>
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
                      key={`${item.product_barcode_id}-${item.exp_date}-${index}`}
                      className="border-t hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-800">
                          {item.product_code ? `${item.product_code} - ` : ''}
                          {item.product_name || '-'}
                        </p>
                      </td>

                      <td className="px-4 py-3 font-semibold text-slate-700">
                        {item.mk_barcode || item.barcode || '-'}
                      </td>

                      <td className="px-4 py-3">
                        {item.exp_date || '-'}
                      </td>

                      <td className="px-4 py-3 text-center font-bold text-green-700">
                        {Number(item.available_units || 0).toFixed(0)}
                      </td>

                      <td className="px-4 py-3 text-center font-bold">
                        {Number(item.no_of_units || 0).toFixed(0)}
                      </td>

                      <td className="px-4 py-3 text-center">
                        {item.unit_short_code || item.unit_name || '-'}
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