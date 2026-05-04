import React, { useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';

import {
  createPurchaseOrdersBySupplier,
  fetchPurchaseOrders,
} from '../features/inventory/stockManagerInventorySlice';

const searchText = (value) => String(value || '').toLowerCase();

const getBrandName = (b) =>
  b?.brand_name_english || b?.brand_name_englishh || b?.brand_name_telugu || '';

const SuggestInput = ({
  label,
  value,
  onChange,
  placeholder,
  suggestions = [],
  onSelect,
  renderItem,
  readOnly = false,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      {label && (
        <label className="block text-xs font-semibold mb-1 text-gray-700">
          {label}
        </label>
      )}

      <input
        value={value}
        readOnly={readOnly}
        onFocus={() => !readOnly && setOpen(true)}
        onChange={(e) => {
          if (readOnly) return;
          onChange(e.target.value);
          setOpen(true);
        }}
        placeholder={placeholder}
        className={`border rounded-lg px-3 py-2 w-full ${
          readOnly ? 'bg-gray-100 cursor-not-allowed' : ''
        }`}
      />

      {!readOnly && open && suggestions.length > 0 && (
        <div className="absolute z-40 bg-white border rounded-lg shadow w-full mt-1 max-h-64 overflow-auto">
          {suggestions.map((item, index) => (
            <button
              key={`${item.id || index}-${item.mk_barcode || item.barcode || ''}`}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(item);
                setOpen(false);
              }}
              className="block w-full text-left px-3 py-2 hover:bg-gray-100"
            >
              {renderItem(item)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const CreatePurchaseOrderSection = ({
  productBarcodes = [],
  suppliers = [],
  warehouses = [],
}) => {
  const dispatch = useDispatch();

  const [warehouseId, setWarehouseId] = useState('');
  const [warehouseSearch, setWarehouseSearch] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [remarks, setRemarks] = useState('');

  const [supplierId, setSupplierId] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  const [productId, setProductId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [categoryId, setCategoryId] = useState('');
  const [categorySearch, setCategorySearch] = useState('');

  const [brandId, setBrandId] = useState('');
  const [brandSearch, setBrandSearch] = useState('');

  const [unitId, setUnitId] = useState('');
  const [unitSearch, setUnitSearch] = useState('');

  const [qty, setQty] = useState(1);
  const [noOfUnits, setNoOfUnits] = useState(1);
  const [expectedUnitPrice, setExpectedUnitPrice] = useState(0);

  const [items, setItems] = useState([]);

  const warehouseSuggestions = useMemo(() => {
    if (!warehouseSearch.trim()) return [];
    const value = searchText(warehouseSearch);

    return (warehouses || [])
      .filter(
        (w) =>
          searchText(w.warehouse_name).includes(value) ||
          searchText(w.warehouse_code).includes(value) ||
          searchText(w.address).includes(value)
      )
      .slice(0, 10);
  }, [warehouses, warehouseSearch]);

  const supplierSuggestions = useMemo(() => {
    if (!supplierSearch.trim()) return [];
    const value = searchText(supplierSearch);

    return (suppliers || [])
      .filter((s) => {
        const isSupplier =
          searchText(s.stakeholder_type) === 'supplier' || !s.stakeholder_type;

        return (
          isSupplier &&
          (searchText(s.stakeholder_name).includes(value) ||
            searchText(s.stackholder_code).includes(value) ||
            searchText(s.phone).includes(value))
        );
      })
      .slice(0, 10);
  }, [suppliers, supplierSearch]);

  const productSuggestions = useMemo(() => {
    const value = searchText(productSearch);
    if (!value) return [];

    return (productBarcodes || [])
      .filter((p) => {
        const brandName = getBrandName(p);

        return (
          searchText(p.product_name_eng).includes(value) ||
          searchText(p.product_name_tel).includes(value) ||
          searchText(p.product_code).includes(value) ||
          searchText(p.mk_barcode).includes(value) ||
          searchText(p.barcode).includes(value) ||
          searchText(brandName).includes(value) ||
          searchText(p.category_name_english).includes(value) ||
          searchText(p.unit_name).includes(value) ||
          searchText(p.unit_short_code).includes(value)
        );
      })
      .slice(0, 20);
  }, [productBarcodes, productSearch]);

  const selectWarehouse = (warehouse) => {
    setWarehouseId(warehouse.id);
    setWarehouseSearch(warehouse.warehouse_name || warehouse.warehouse_code || '');
  };

  const selectSupplier = (supplier) => {
    setSupplierId(supplier.id);
    setSelectedSupplier(supplier);
    setSupplierSearch(supplier.stakeholder_name || supplier.stackholder_code || '');
  };

  const clearBarcodeDependentFields = () => {
    setProductId('');
    setSelectedProduct(null);
    setCategoryId('');
    setCategorySearch('');
    setBrandId('');
    setBrandSearch('');
    setUnitId('');
    setUnitSearch('');
    setQty(1);
  };

  const selectProduct = (barcodeRow) => {
    const brandName = getBrandName(barcodeRow);

    setProductId(barcodeRow.product_id || '');
    setSelectedProduct(barcodeRow);

    setProductSearch(
      barcodeRow.product_name_eng ||
        barcodeRow.product_name_tel ||
        barcodeRow.product_code ||
        barcodeRow.mk_barcode ||
        barcodeRow.barcode ||
        ''
    );

    setCategoryId(barcodeRow.category_id || '');
    setCategorySearch(barcodeRow.category_name_english || '');

    setBrandId(barcodeRow.brand_id || '');
    setBrandSearch(brandName);

    setUnitId(barcodeRow.unit_id || '');
    setUnitSearch(barcodeRow.unit_name || barcodeRow.unit_short_code || '');

    setQty(Number(barcodeRow.quantity || 1));
  };

  const clearItemInputs = () => {
    setSupplierId('');
    setSupplierSearch('');
    setSelectedSupplier(null);
    setProductId('');
    setProductSearch('');
    setSelectedProduct(null);
    setCategoryId('');
    setCategorySearch('');
    setBrandId('');
    setBrandSearch('');
    setUnitId('');
    setUnitSearch('');
    setQty(1);
    setNoOfUnits(1);
    setExpectedUnitPrice(0);
  };

  const addItem = () => {
    if (
      !supplierId ||
      !productId ||
      !categoryId ||
      !brandId ||
      !unitId ||
      !qty ||
      !noOfUnits
    ) {
      alert(
        'Supplier, product barcode, category, brand, unit, quantity and no. of units are required'
      );
      return;
    }

    const brandName = getBrandName(selectedProduct);

    setItems([
      ...items,
      {
        supplier_id: Number(supplierId),
        supplier_name:
          selectedSupplier?.stakeholder_name || selectedSupplier?.stackholder_code,

        product_id: Number(productId),
        product_name:
          selectedProduct?.product_name_eng ||
          selectedProduct?.product_name_tel ||
          selectedProduct?.product_code,
        product_code: selectedProduct?.product_code,

        mk_barcode: selectedProduct?.mk_barcode || '',
        barcode: selectedProduct?.barcode || '',

        category_id: Number(categoryId),
        category_name: categorySearch,

        brand_id: Number(brandId),
        brand_name: brandName,

        unit_id: Number(unitId),
        unit_name: unitSearch,

        qty: Number(qty),
        no_of_units: Number(noOfUnits || 1),
        expected_unit_price: Number(expectedUnitPrice || 0),
        actual_unit_price: null,
      },
    ]);

    clearItemInputs();
  };

  const updateRow = (index, field, value) => {
    const copy = [...items];
    copy[index] = {
      ...copy[index],
      [field]: value,
    };
    setItems(copy);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const groupedBySupplier = useMemo(() => {
    const map = new Map();

    for (const item of items) {
      const key = String(item.supplier_id);

      if (!map.has(key)) {
        map.set(key, {
          supplier_id: item.supplier_id,
          supplier_name: item.supplier_name,
          items: [],
        });
      }

      map.get(key).items.push({
        product_id: Number(item.product_id),
        category_id: Number(item.category_id),
        brand_id: Number(item.brand_id),
        unit_id: Number(item.unit_id),
        qty: Number(item.qty),
        no_of_units: Number(item.no_of_units || 1),
        expected_unit_price: Number(item.expected_unit_price || 0),
        actual_unit_price: null,

        product_name: item.product_name,
        product_code: item.product_code,
        category_name: item.category_name,
        brand_name: item.brand_name,
        unit_name: item.unit_name,
        mk_barcode: item.mk_barcode,
        barcode: item.barcode,
      });
    }

    return Array.from(map.values());
  }, [items]);

  const grandTotal = items.reduce(
    (sum, item) =>
      sum +
      // Number(item.qty || 0) *
        Number(item.no_of_units || 1) *
        Number(item.expected_unit_price || 0),
    0
  );

  const submitHandler = async (e) => {
    e.preventDefault();

    if (!warehouseId) {
      alert('Warehouse is required');
      return;
    }

    if (items.length === 0) {
      alert('Please add at least one item');
      return;
    }

    await dispatch(
      createPurchaseOrdersBySupplier({
        warehouse_id: Number(warehouseId),
        expected_date: expectedDate || null,
        remarks: remarks || null,
        supplierGroups: groupedBySupplier,
      })
    );

    dispatch(fetchPurchaseOrders());

    setWarehouseId('');
    setWarehouseSearch('');
    setExpectedDate('');
    setRemarks('');
    setItems([]);
  };

  return (
    <section className="bg-white rounded-xl border shadow-sm p-4">
      <h2 className="font-bold text-lg mb-4">Create Purchase Orders</h2>

      <form onSubmit={submitHandler} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <SuggestInput
            label="Warehouse"
            value={warehouseSearch}
            onChange={(value) => {
              setWarehouseSearch(value);
              setWarehouseId('');
            }}
            placeholder="Search warehouse"
            suggestions={warehouseSuggestions}
            onSelect={selectWarehouse}
            renderItem={(w) => (
              <>
                <div className="font-medium">{w.warehouse_name}</div>
                <div className="text-xs text-gray-500">
                  {w.warehouse_code} | {w.address || '-'}
                </div>
              </>
            )}
          />

          <div>
            <label className="block text-xs font-semibold mb-1">
              Expected Date
            </label>
            <input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold mb-1">Remarks</label>
            <input
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Purchase remarks"
              className="border rounded-lg px-3 py-2 w-full"
            />
          </div>
        </div>

        <section className="border rounded-xl p-4 bg-gray-50">
          <h3 className="font-semibold mb-3">Add Item</h3>

          <div className="grid grid-cols-1 md:grid-cols-9 gap-3">
            <SuggestInput
              label="Supplier"
              value={supplierSearch}
              onChange={(value) => {
                setSupplierSearch(value);
                setSupplierId('');
                setSelectedSupplier(null);
              }}
              placeholder="Search supplier"
              suggestions={supplierSuggestions}
              onSelect={selectSupplier}
              renderItem={(s) => (
                <>
                  <div className="font-medium">{s.stakeholder_name}</div>
                  <div className="text-xs text-gray-500">
                    {s.stackholder_code} | {s.phone || '-'}
                  </div>
                </>
              )}
            />

            <SuggestInput
              label="Product"
              value={productSearch}
              onChange={(value) => {
                setProductSearch(value);
                clearBarcodeDependentFields();
              }}
              placeholder="Search product / barcode"
              suggestions={productSuggestions}
              onSelect={selectProduct}
              renderItem={(p) => (
                <>
                  <div className="font-medium">
                    {p.product_name_eng || p.product_name_tel || p.product_code}
                  </div>
                  <div className="text-xs text-gray-500">
                    MK: {p.mk_barcode || '-'} | Vendor: {p.barcode || '-'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {getBrandName(p) || '-'} | {p.category_name_english || '-'} |{' '}
                    {p.unit_name || p.unit_short_code || '-'} | Qty:{' '}
                    {p.quantity || 1}
                  </div>
                </>
              )}
            />

            <SuggestInput
              label="Category"
              value={categorySearch}
              onChange={() => {}}
              placeholder="Auto from barcode"
              suggestions={[]}
              onSelect={() => {}}
              renderItem={() => null}
              readOnly
            />

            <SuggestInput
              label="Brand"
              value={brandSearch}
              onChange={() => {}}
              placeholder="Auto from barcode"
              suggestions={[]}
              onSelect={() => {}}
              renderItem={() => null}
              readOnly
            />

            <SuggestInput
              label="Unit"
              value={unitSearch}
              onChange={() => {}}
              placeholder="Auto from barcode"
              suggestions={[]}
              onSelect={() => {}}
              renderItem={() => null}
              readOnly
            />

            <div>
              <label className="block text-xs font-semibold mb-1">Qty</label>
              <input
                type="number"
                min="0.001"
                step="0.001"
                value={qty}
                readOnly
                className="border rounded-lg px-3 py-2 w-full text-right bg-gray-100 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                No. Units
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={noOfUnits}
                onChange={(e) => setNoOfUnits(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full text-right"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                Expected Price
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={expectedUnitPrice}
                onChange={(e) => setExpectedUnitPrice(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full text-right"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={addItem}
                className="bg-blue-700 text-white px-4 py-2 rounded-lg w-full"
              >
                Add
              </button>
            </div>
          </div>
        </section>

        <div className="overflow-x-auto">
         <table className="min-w-full text-sm border table-fixed">
           <thead className="bg-gray-100">
  <tr>
    <th className="p-2 text-left w-[140px]">Supplier</th>
    <th className="p-2 text-left w-[220px]">Product</th>
    <th className="p-2 text-left w-[140px]">Category</th>
    <th className="p-2 text-left w-[140px]">Brand</th>

    <th className="p-2 text-right w-[100px]">Qty</th>
    <th className="p-2 text-left w-[100px]">Unit</th>

    <th className="p-2 text-right w-[120px]">No. Units</th>
    <th className="p-2 text-right w-[140px]">Expected Price</th>

    <th className="p-2 text-right w-[140px]">Total</th>
    <th className="p-2 w-[100px] text-center">Remove</th>
  </tr>
</thead>

            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan="10" className="p-4 text-center text-gray-500">
                    No items added yet
                  </td>
                </tr>
              )}

              {items.map((item, index) => (
                <tr
                  key={`${item.supplier_id}-${item.product_id}-${item.category_id}-${item.brand_id}-${item.unit_id}-${index}`}
                  className="border-t"
                >
                  <td className="p-2">{item.supplier_name}</td>

                  <td className="p-2">
                    <div className="font-medium">{item.product_name}</div>
                    <div className="text-xs text-gray-500">
                      Code: {item.product_code || '-'}
                    </div>
                    <div className="text-xs text-gray-500">
                      MK: {item.mk_barcode || '-'} | Vendor: {item.barcode || '-'}
                    </div>
                  </td>

                  <td className="p-2">{item.category_name || '-'}</td>
                  <td className="p-2">{item.brand_name || '-'}</td>
                  <td className="p-2">
  <input
    type="number"
    value={item.qty}
    readOnly
    className="border rounded px-2 py-1 w-full text-right bg-gray-100"
  />
</td>
                  <td className="p-2">{item.unit_name || '-'}</td>

                 

                <td className="p-2">
  <input
    type="number"
    value={item.no_of_units}
    onChange={(e) =>
      updateRow(index, 'no_of_units', e.target.value)
    }
    className="border rounded px-2 py-1 w-full text-right"
  />
</td>

                 <td className="p-2">
  <input
    type="number"
    value={item.expected_unit_price}
    onChange={(e) =>
      updateRow(index, 'expected_unit_price', e.target.value)
    }
    className="border rounded px-2 py-1 w-full text-right"
  />
</td>

                  <td className="p-2 text-right font-semibold">
                    ₹
                    {(
                      // Number(item.qty || 0) *
                      Number(item.no_of_units || 1) *
                      Number(item.expected_unit_price || 0)
                    ).toFixed(2)}
                  </td>

                  <td className="p-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}

              {items.length > 0 && (
                <tr className="bg-gray-50 font-bold">
                  <td colSpan="8" className="p-3 text-right">
                    Grand Total
                  </td>
                  <td className="p-3 text-right">₹{grandTotal.toFixed(2)}</td>
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-green-700 text-white px-5 py-2 rounded-lg"
          >
            Create Purchase Orders
          </button>
        </div>
      </form>
    </section>
  );
};

export default CreatePurchaseOrderSection;