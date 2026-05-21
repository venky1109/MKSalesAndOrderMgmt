import React, { useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';

import {
  createInventoryDispatchOrder,
  fetchInventoryDispatchOrders,
  fetchInventoryProducts,
  fetchStockTransactions,
} from '../features/inventory/stockManagerInventorySlice';
import {
  getDispatchDestinationLabel,
  getDispatchItemBrand,
  getDispatchItemProductName,
  getWarehouseLabel,
} from '../utils/dispatchDisplay';

// const getDateOnly = (value) => {
//   if (!value) return '';
//   const text = String(value).trim();
//   const match = text.match(/(\d{4})-(\d{2})-(\d{2})/);
//   return match ? match[0] : '';
// };

const CreateDispatchOrderSection = ({
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
  const [showSuggestions, setShowSuggestions] = useState(false);
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

  const inventoryRows = useMemo(() => {
    return inventoryProducts
      .filter((item) => {
        const availableUnits = Number(item.no_of_units || item.count_in_stock || 0);
        const sameWarehouse =
          !sourceWarehouseId ||
          String(item.warehouse_id) === String(sourceWarehouseId);

        return (
          availableUnits > 0 &&
          sameWarehouse &&
          item.is_active !== false &&
          item.product_barcode_id
        );
      })
      .map((item) => {
        const expDateOnly =  item.exp_date
      

        return {
          ...item,
          inventory_product_id: item.id,
          exp_date_only: expDateOnly,
          available_units: Number(item.no_of_units || item.count_in_stock || 0),
          product_barcode_id: item.product_barcode_id,
          display_barcode: item.mk_barcode || item.bar_code || item.barcode || '',
          display_product_name: getDispatchItemProductName(item),
          searchText: [
            item.product_code,
            getDispatchItemProductName(item),
            item.product_name,
            item.product_name_eng,
            item.product_name_tel,
            item.mk_barcode,
            item.bar_code,
            item.barcode,
            getDispatchItemBrand(item),
            item.brand_name_english,
            item.category_name_english,
            item.unit_name,
            item.unit_short_code,
            expDateOnly,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase(),
        };
      });
  }, [inventoryProducts, sourceWarehouseId]);

  const suggestions = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!sourceWarehouseId) return [];
    if (!value) return inventoryRows.slice(0, 20);

    return inventoryRows.filter((row) => row.searchText.includes(value)).slice(0, 20);
  }, [inventoryRows, search, sourceWarehouseId]);

  const getDestinationLabel = (item) =>
    getDispatchDestinationLabel(item, destinationType);

  const getAlreadyAddedUnits = (row) => {
    return items
      .filter(
        (item) =>
          String(item.inventory_product_id) === String(row.inventory_product_id)
      )
      .reduce((sum, item) => sum + Number(item.no_of_units || 0), 0);
  };

  const addInventoryItem = (inventoryRow) => {
    if (!sourceWarehouseId) {
      alert('Please select source warehouse first');
      return;
    }

    const availableUnits = Number(
      inventoryRow.available_units || inventoryRow.no_of_units || 0
    );

    const alreadyAddedUnits = getAlreadyAddedUnits(inventoryRow);

    if (alreadyAddedUnits + 1 > availableUnits) {
      alert(`Only ${availableUnits} units available.`);
      return;
    }

    const newItem = {
      inventory_product_id: Number(inventoryRow.inventory_product_id),
      product_barcode_id: Number(inventoryRow.product_barcode_id),

      mk_barcode: inventoryRow.mk_barcode || inventoryRow.bar_code || inventoryRow.barcode || '',
      barcode: inventoryRow.barcode || inventoryRow.bar_code || '',
      barcode_quantity: inventoryRow.barcode_quantity || '',

      product_code: inventoryRow.product_code,
      product_name: getDispatchItemProductName(inventoryRow),

      brand_name_english: getDispatchItemBrand(inventoryRow),
      category_name_english: inventoryRow.category_name_english,
      unit_short_code: inventoryRow.unit_short_code,
      unit_name: inventoryRow.unit_name,

      exp_date: inventoryRow.exp_date_only,
      available_units: availableUnits,

      qty: 1,
      no_of_units: 1,
      notes: '',
    };

    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          String(item.inventory_product_id) ===
          String(newItem.inventory_product_id)
      );

      if (existingIndex !== -1) {
        return prev.map((item, index) =>
          index === existingIndex
            ? {
                ...item,
                qty: Number(item.qty || 0) + 1,
                no_of_units: Number(item.no_of_units || 0) + 1,
              }
            : item
        );
      }

      return [...prev, newItem];
    });

    setSearch('');
    setShowSuggestions(false);
  };

  const updateItem = (index, field, value) => {
    setItems((prev) =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        if (field === 'no_of_units' || field === 'qty') {
          const nextUnits = Number(value || 0);

          if (nextUnits > Number(item.available_units || 0)) {
            alert(`Only ${Number(item.available_units || 0)} units available.`);
            return item;
          }

          return {
            ...item,
            qty: nextUnits,
            no_of_units: nextUnits,
          };
        }

        return { ...item, [field]: value };
      })
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

    const invalidItem = items.find(
      (item) =>
        !item.inventory_product_id ||
        !item.product_barcode_id ||
        !item.exp_date ||
        Number(item.no_of_units || 0) <= 0 ||
        Number(item.no_of_units || 0) > Number(item.available_units || 0)
    );

    if (invalidItem) {
      alert('Dispatch item is invalid. Check barcode, expiry and available units.');
      return;
    }

    const payload = {
      source: `warehouse:${sourceWarehouseId}:${getWarehouseLabel(sourceWarehouse)}`,
      destination: `${destinationType}:${destinationId}:${getDestinationLabel(
        selectedDestination
      )}`,
      expected_dispatch_at: expectedDispatchAt || null,
      dispatch_notes: dispatchNotes || null,
      dispatch_status: 'draft',
      items: items.map((item) => ({
        inventory_product_id: Number(item.inventory_product_id),
        product_barcode_id: Number(item.product_barcode_id),
        qty: Number(item.no_of_units),
        no_of_units: Number(item.no_of_units),
        exp_date: item.exp_date,
        notes: item.notes || null,
      })),
    };

    const result = await dispatch(createInventoryDispatchOrder(payload));

    if (createInventoryDispatchOrder.fulfilled.match(result)) {
      dispatch(fetchInventoryDispatchOrders());
      dispatch(fetchInventoryProducts());
      dispatch(fetchStockTransactions());

      setSourceWarehouseId('');
      setDestinationType('outlet');
      setDestinationId('');
      setExpectedDispatchAt('');
      setDispatchNotes('');
      setSearch('');
      setShowSuggestions(false);
      setItems([]);
    }
  };

  return (
    <section className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-4 rounded-xl bg-blue-50 p-4">
        <h2 className="text-lg font-bold text-blue-900">CDR</h2>
        <p className="text-sm text-blue-700">
          Search only available inventory products. Available units and expiry are shown.
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
              onChange={(e) => {
                setSourceWarehouseId(e.target.value);
                setSearch('');
                setShowSuggestions(false);
                setItems([]);
              }}
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
            Add Product From Inventory
          </label>

          <div className="relative">
            <input
              value={search}
              onFocus={() => setShowSuggestions(true)}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowSuggestions(true);
              }}
              disabled={!sourceWarehouseId}
              placeholder={
                sourceWarehouseId
                  ? 'Search by barcode, product name, product code, brand, expiry...'
                  : 'Select source warehouse first'
              }
              className="w-full rounded-lg border px-3 py-3 text-sm disabled:bg-gray-100"
            />

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl border bg-white shadow-lg">
                {suggestions.map((row) => (
                  <button
                    key={`${row.inventory_product_id}-${row.product_barcode_id}`}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => addInventoryItem(row)}
                    className="block w-full border-b px-3 py-3 text-left hover:bg-blue-50"
                  >
                    <div className="flex justify-between gap-3">
                      <div>
                        <div className="font-bold text-gray-900">
                          {row.display_product_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          Inv ID: {row.inventory_product_id} | Code:{' '}
                          {row.product_code || '-'} | Barcode:{' '}
                          {row.display_barcode || '-'} | Exp:{' '}
                          {row.exp_date_only || '-'}
                        </div>
                        <div className="text-xs text-gray-500">
                          Brand: {row.brand_name_english || '-'} | Category:{' '}
                          {row.category_name_english || '-'}
                        </div>
                      </div>

                      <div className="text-right text-xs">
                        <div className="font-semibold text-green-700">
                          Available: {Number(row.available_units || 0).toFixed(0)}
                        </div>
                        <div className="text-gray-500">
                          {row.unit_short_code || row.unit_name || ''}
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
                <th className="p-2 text-center">Expiry</th>
                <th className="p-2 text-center">Available</th>
                <th className="p-2 text-center">Dispatch Units</th>
                <th className="p-2 text-center">Unit</th>
                <th className="p-2 text-left">Notes</th>
                <th className="p-2 text-center">Remove</th>
              </tr>
            </thead>

            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan="10" className="p-6 text-center text-gray-500">
                    No products added
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr
                    key={`${item.inventory_product_id}-${index}`}
                    className="border-t"
                  >
                    <td className="p-2">
                      <div className="font-semibold">
                        {[item.product_code, item.product_name].filter(Boolean).join(' - ')}
                      </div>
                      <div className="text-xs text-gray-500">
                        Inventory ID: {item.inventory_product_id}
                      </div>
                    </td>

                    <td className="p-2">{item.mk_barcode || item.barcode || '-'}</td>
                    <td className="p-2">{item.brand_name_english || '-'}</td>
                    <td className="p-2">{item.category_name_english || '-'}</td>
                    <td className="p-2 text-center">{item.exp_date || '-'}</td>

                    <td className="p-2 text-center font-bold text-green-700">
                      {Number(item.available_units || 0).toFixed(0)}
                    </td>

                    <td className="p-2 text-center">
                      <input
                        type="number"
                        min="1"
                        max={item.available_units}
                        value={item.no_of_units}
                        onChange={(e) =>
                          updateItem(index, 'no_of_units', e.target.value)
                        }
                        className="w-24 rounded border px-2 py-1 text-center"
                      />
                    </td>

                    <td className="p-2 text-center">
                      {item.unit_short_code || item.unit_name || '-'}
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
            {loading ? 'Saving...' : 'CDR'}
          </button>
        </div>
      </form>
    </section>
  );
};

export default CreateDispatchOrderSection;
