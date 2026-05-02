import React, { useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  createDispatchOrderWithItems,
  fetchStockTransactions,
} from '../features/inventory/stockManagerInventorySlice';

const CreateDispatchOrderSection = ({ products = [] }) => {
  const dispatch = useDispatch();

  const [source, setSource] = useState('WAREHOUSE');
  const [destination, setDestination] = useState('');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);

  const suggestions = useMemo(() => {
    if (!search.trim()) return [];

    const value = search.toLowerCase();

    return products
      .filter((p) =>
        p.product_name_eng?.toLowerCase().includes(value) ||
        p.product_name_tel?.toLowerCase().includes(value) ||
        p.product_code?.toLowerCase().includes(value)
      )
      .slice(0, 8);
  }, [products, search]);

  const addProduct = (product) => {
  const exists = items.find(
    (item) => Number(item.product_id) === Number(product.id)
  );

  if (exists) {
    setSearch('');
    return;
  }

  setItems([
    ...items,
    {
      product_id: product.id,
      product_name: product.product_name_eng || product.product_name_tel,
      product_code: product.product_code,

      brand_id: '',
      brand_name: '',
      brand_search: '',

      unit_id: '',
      unit_name: '',
      unit_search: '',

      qty: 1,
      unit_price: 0,
      estimated_price: 0,
    },
  ]);

  setSearch('');
};

  const updateItem = (index, field, value) => {
    const copy = [...items];
    copy[index][field] = value;
    setItems(copy);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const submitHandler = async (e) => {
    e.preventDefault();

    if (!source || !destination || items.length === 0) {
      alert('Source, destination and products are required');
      return;
    }

    await dispatch(
      createDispatchOrderWithItems({
        source,
        destination,
        items: items.map((item) => ({
          product_id: Number(item.product_id),
          qty: Number(item.qty),
          unit_price: Number(item.unit_price),
        })),
      })
    );

    dispatch(fetchStockTransactions());

    setDestination('');
    setItems([]);
  };

  return (
    <section className="bg-white rounded-xl border shadow-sm p-4">
      <h2 className="font-bold text-lg mb-4">Create Dispatch Order</h2>

      <form onSubmit={submitHandler} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Source"
            className="border rounded-lg px-3 py-2"
          />

          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Destination"
            className="border rounded-lg px-3 py-2"
          />

          <div className="relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product"
              className="border rounded-lg px-3 py-2 w-full"
            />

            {suggestions.length > 0 && (
              <div className="absolute z-20 bg-white border rounded-lg shadow w-full mt-1 max-h-60 overflow-auto">
                {suggestions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addProduct(p)}
                    className="block w-full text-left px-3 py-2 hover:bg-gray-100"
                  >
                    <div className="font-medium">
                      {p.product_name_eng || p.product_name_tel}
                    </div>
                    <div className="text-xs text-gray-500">
                      Code: {p.product_code}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-left">Product</th>
                  <th className="p-2 text-right">Qty</th>
                  <th className="p-2 text-right">Unit Price</th>
                  <th className="p-2 text-right">Total</th>
                  <th className="p-2">Remove</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item, index) => (
                  <tr key={item.product_id} className="border-t">
                    <td className="p-2">{item.product_name}</td>

                    <td className="p-2">
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) => updateItem(index, 'qty', e.target.value)}
                        className="border rounded px-2 py-1 w-24 text-right"
                      />
                    </td>

                    <td className="p-2">
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                        className="border rounded px-2 py-1 w-28 text-right"
                      />
                    </td>

                    <td className="p-2 text-right">
                      ₹{(Number(item.qty) * Number(item.unit_price)).toFixed(2)}
                    </td>

                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button className="bg-blue-700 text-white px-4 py-2 rounded-lg">
          Create Dispatch Order
        </button>
      </form>
    </section>
  );
};

export default CreateDispatchOrderSection;