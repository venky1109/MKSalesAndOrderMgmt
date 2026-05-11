import React, { useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';

import {
  createPurchaseOrdersBySupplier,
  fetchPurchaseOrders,
} from '../features/inventory/stockManagerInventorySlice';

const searchText = (value) => String(value || '').toLowerCase();

const getBrandName = (item) =>
  item?.brand_name_english ||
  item?.brand_name_englishh ||
  item?.brand_name_telugu ||
  '';

const SuggestInput = ({
  label,
  value,
  onChange,
  placeholder,
  suggestions = [],
  onSelect,
  renderItem,
  readOnly = false,
  dropdownClassName = '',
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      {label && (
        <label className="mb-1 block text-xs font-semibold text-gray-700">
          {label}
        </label>
      )}

      <input
        value={value}
        readOnly={readOnly}
        onFocus={() => !readOnly && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => {
          if (readOnly) return;
          onChange(e.target.value);
          setOpen(true);
        }}
        placeholder={placeholder}
        className={`h-11 w-full rounded-lg border px-3 py-2 text-sm ${
          readOnly ? 'cursor-not-allowed bg-gray-100' : 'bg-white'
        }`}
      />

      {!readOnly && open && suggestions.length > 0 && (
        <div
          className={`absolute z-50 mt-1 max-h-80 overflow-auto rounded-xl border bg-white shadow-xl ${
            dropdownClassName || 'w-full'
          }`}
        >
          {suggestions.map((item, index) => (
            <button
              key={`${item.id || index}-${item.mk_barcode || item.barcode || ''}`}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(item);
                setOpen(false);
              }}
              className="block w-full border-b px-3 py-3 text-left hover:bg-yellow-50"
            >
              {renderItem(item)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ProductSuggestionItem = ({ product }) => {
  const productName =
    product.product_name_eng ||
    product.product_name_tel ||
    product.product_code ||
    '-';

  const brandName = getBrandName(product) || '-';
  const categoryName =
    product.category_name_english || product.category_name_telugu || '-';

  const unitName = product.unit_short_code || product.unit_name || '';
  const quantity = Number(product.quantity || product.qty || 0);

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold text-gray-900">
          {productName}
        </div>

        <div className="mt-1 text-xs text-gray-600">
          <span className="font-semibold text-gray-800">MK Barcode:</span>{' '}
          {product.mk_barcode || '-'}
        </div>

        <div className="text-xs text-gray-600">
          <span className="font-semibold text-gray-800">Vendor Barcode:</span>{' '}
          {product.barcode || '-'}
        </div>

        <div className="text-xs text-gray-600">
          <span className="font-semibold text-gray-800">Brand:</span>{' '}
          {brandName}
        </div>

        <div className="text-xs text-gray-600">
          <span className="font-semibold text-gray-800">Category:</span>{' '}
          {categoryName}
        </div>
      </div>

      <div className="shrink-0 rounded-lg bg-green-50 px-3 py-2 text-right">
        <div className="text-[11px] font-semibold text-green-700">Qty</div>
        <div className="text-base font-bold text-green-900">
          {quantity.toFixed(2)}
        </div>
        <div className="text-[11px] font-bold text-green-700">
          {unitName || '-'}
        </div>
      </div>
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

  const [productSearch, setProductSearch] = useState('');
  const [selectedBarcodeRow, setSelectedBarcodeRow] = useState(null);

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
          searchText(p.category_name_telugu).includes(value) ||
          searchText(p.unit_name).includes(value) ||
          searchText(p.unit_short_code).includes(value)
        );
      })
      .slice(0, 25);
  }, [productBarcodes, productSearch]);

  const selectWarehouse = (warehouse) => {
    setWarehouseId(warehouse.id);
    setWarehouseSearch(
      warehouse.warehouse_name || warehouse.warehouse_code || ''
    );
  };

  const selectSupplier = (supplier) => {
    setSupplierId(supplier.id);
    setSelectedSupplier(supplier);
    setSupplierSearch(
      supplier.stakeholder_name || supplier.stackholder_code || ''
    );
  };

  const clearSelectedProduct = () => {
    setSelectedBarcodeRow(null);
  };

  const selectProductBarcode = (barcodeRow) => {
    setSelectedBarcodeRow(barcodeRow);

    setProductSearch(
      barcodeRow.product_name_eng ||
        barcodeRow.product_name_tel ||
        barcodeRow.product_code ||
        barcodeRow.mk_barcode ||
        barcodeRow.barcode ||
        ''
    );
  };

  const clearItemInputs = () => {
    setSupplierId('');
    setSupplierSearch('');
    setSelectedSupplier(null);

    setProductSearch('');
    setSelectedBarcodeRow(null);

    setNoOfUnits(1);
    setExpectedUnitPrice(0);
  };

  const addItem = () => {
    if (!supplierId || !selectedBarcodeRow) {
      alert('Supplier and product barcode are required');
      return;
    }

    if (!selectedBarcodeRow.product_id) {
      alert('Selected barcode row does not have product_id');
      return;
    }

    if (!selectedBarcodeRow.brand_id) {
      alert('Selected barcode row does not have brand_id');
      return;
    }

    if (!selectedBarcodeRow.category_id) {
      alert('Selected barcode row does not have category_id');
      return;
    }

    if (!selectedBarcodeRow.unit_id) {
      alert('Selected barcode row does not have unit_id');
      return;
    }

    const brandName = getBrandName(selectedBarcodeRow);
    const categoryName =
      selectedBarcodeRow.category_name_english ||
      selectedBarcodeRow.category_name_telugu ||
      '';

    const unitName =
      selectedBarcodeRow.unit_short_code || selectedBarcodeRow.unit_name || '';

    const productName =
      selectedBarcodeRow.product_name_eng ||
      selectedBarcodeRow.product_name_tel ||
      selectedBarcodeRow.product_code ||
      '';

    setItems((prev) => [
      ...prev,
      {
        supplier_id: Number(supplierId),
        supplier_name:
          selectedSupplier?.stakeholder_name ||
          selectedSupplier?.stackholder_code ||
          '',

        product_barcode_id: selectedBarcodeRow.id
          ? Number(selectedBarcodeRow.id)
          : null,

        product_id: Number(selectedBarcodeRow.product_id),
        product_name: productName,
        product_code: selectedBarcodeRow.product_code || '',

        mk_barcode: selectedBarcodeRow.mk_barcode || '',
        barcode: selectedBarcodeRow.barcode || '',

        category_id: Number(selectedBarcodeRow.category_id),
        category_name: categoryName,

        brand_id: Number(selectedBarcodeRow.brand_id),
        brand_name: brandName,

        unit_id: Number(selectedBarcodeRow.unit_id),
        unit_name: unitName,

        qty: Number(selectedBarcodeRow.quantity || selectedBarcodeRow.qty || 1),
        no_of_units: Number(noOfUnits || 1),
        expected_unit_price: Number(expectedUnitPrice || 0),
        actual_unit_price: null,
      },
    ]);

    clearItemInputs();
  };

  const updateRow = (index, field, value) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: value,
      };
      return copy;
    });
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
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

        product_barcode_id: item.product_barcode_id,

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
      Number(item.no_of_units || 1) * Number(item.expected_unit_price || 0),
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

  const selectedProductName =
    selectedBarcodeRow?.product_name_eng ||
    selectedBarcodeRow?.product_name_tel ||
    selectedBarcodeRow?.product_code ||
    '';

  const selectedBrandName = getBrandName(selectedBarcodeRow);
  const selectedCategoryName =
    selectedBarcodeRow?.category_name_english ||
    selectedBarcodeRow?.category_name_telugu ||
    '';

  const selectedUnitName =
    selectedBarcodeRow?.unit_short_code || selectedBarcodeRow?.unit_name || '';

  const selectedQty = Number(
    selectedBarcodeRow?.quantity || selectedBarcodeRow?.qty || 0
  );

  return (
    <section className="rounded-xl border bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-lg font-bold">Create Purchase Orders</h2>

      <form onSubmit={submitHandler} className="space-y-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
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
            <label className="mb-1 block text-xs font-semibold">
              Expected Date
            </label>
            <input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              className="h-11 w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-semibold">Remarks</label>
            <input
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Purchase remarks"
              className="h-11 w-full rounded-lg border px-3 py-2"
            />
          </div>
        </div>

        <section className="rounded-xl border bg-gray-50 p-4">
          <h3 className="mb-3 font-semibold">Add Item</h3>

          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 md:col-span-2">
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
            </div>

            <div className="col-span-12 md:col-span-4">
              <SuggestInput
                label="Product / Barcode"
                value={productSearch}
                onChange={(value) => {
                  setProductSearch(value);
                  clearSelectedProduct();
                }}
                placeholder="Search product / MK barcode / vendor barcode"
                suggestions={productSuggestions}
                onSelect={selectProductBarcode}
                dropdownClassName="w-full min-w-[560px]"
                renderItem={(p) => <ProductSuggestionItem product={p} />}
              />
            </div>

            <div className="col-span-6 md:col-span-2">
              <label className="mb-1 block text-xs font-semibold">
                Category
              </label>
              <input
                value={selectedCategoryName}
                readOnly
                placeholder="Auto"
                className="h-11 w-full cursor-not-allowed rounded-lg border bg-gray-100 px-3 py-2 text-sm"
              />
            </div>

            <div className="col-span-6 md:col-span-2">
              <label className="mb-1 block text-xs font-semibold">Brand</label>
              <input
                value={selectedBrandName}
                readOnly
                placeholder="Auto"
                className="h-11 w-full cursor-not-allowed rounded-lg border bg-gray-100 px-3 py-2 text-sm"
              />
            </div>

            <div className="col-span-6 md:col-span-1">
              <label className="mb-1 block text-xs font-semibold">Unit</label>
              <input
                value={selectedUnitName}
                readOnly
                placeholder="Auto"
                className="h-11 w-full cursor-not-allowed rounded-lg border bg-gray-100 px-3 py-2 text-sm"
              />
            </div>

            <div className="col-span-6 md:col-span-1">
              <label className="mb-1 block text-xs font-semibold">Qty</label>
              <input
                type="number"
                value={selectedQty || ''}
                readOnly
                placeholder="Auto"
                className="h-11 w-full cursor-not-allowed rounded-lg border bg-gray-100 px-2 py-2 text-right text-sm"
              />
            </div>

            {selectedBarcodeRow && (
              <div className="col-span-12 rounded-lg border bg-white p-3 text-xs text-gray-700">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                  <div>
                    <span className="font-semibold">Product:</span>{' '}
                    {selectedProductName || '-'}
                  </div>
                  <div>
                    <span className="font-semibold">MK Barcode:</span>{' '}
                    {selectedBarcodeRow.mk_barcode || '-'}
                  </div>
                  <div>
                    <span className="font-semibold">Vendor Barcode:</span>{' '}
                    {selectedBarcodeRow.barcode || '-'}
                  </div>
                  <div>
                    <span className="font-semibold">Product Code:</span>{' '}
                    {selectedBarcodeRow.product_code || '-'}
                  </div>
                </div>
              </div>
            )}

            <div className="col-span-6 md:col-span-2">
              <label className="mb-1 block text-xs font-semibold">
                No. Units
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={noOfUnits}
                onChange={(e) => setNoOfUnits(e.target.value)}
                className="h-11 w-full rounded-lg border px-3 py-2 text-right"
              />
            </div>

            <div className="col-span-6 md:col-span-2">
              <label className="mb-1 block text-xs font-semibold">
                Expected Price / Unit
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={expectedUnitPrice}
                onChange={(e) => setExpectedUnitPrice(e.target.value)}
                className="h-11 w-full rounded-lg border px-3 py-2 text-right"
              />
            </div>

            <div className="col-span-12 flex items-end md:col-span-2">
              <button
                type="button"
                onClick={addItem}
                className="h-11 w-full rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800"
              >
                Add
              </button>
            </div>
          </div>
        </section>

        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="w-[140px] p-2 text-left">Supplier</th>
                <th className="w-[280px] p-2 text-left">Product</th>
                <th className="w-[140px] p-2 text-left">Category</th>
                <th className="w-[140px] p-2 text-left">Brand</th>
                <th className="w-[90px] p-2 text-right">Qty</th>
                <th className="w-[100px] p-2 text-left">Unit</th>
                <th className="w-[120px] p-2 text-right">No. Units</th>
                <th className="w-[160px] p-2 text-right">
                  Expected Price / Unit
                </th>
                <th className="w-[140px] p-2 text-right">Total</th>
                <th className="w-[100px] p-2 text-center">Remove</th>
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
                  key={`${item.supplier_id}-${item.product_id}-${item.product_barcode_id}-${index}`}
                  className="border-t"
                >
                  <td className="p-2">{item.supplier_name || '-'}</td>

                  <td className="p-2">
                    <div className="font-medium">{item.product_name || '-'}</div>
                    <div className="text-xs text-gray-500">
                      Code: {item.product_code || '-'}
                    </div>
                    <div className="text-xs text-gray-500">
                      MK: {item.mk_barcode || '-'}
                    </div>
                    <div className="text-xs text-gray-500">
                      Vendor: {item.barcode || '-'}
                    </div>
                  </td>

                  <td className="p-2">{item.category_name || '-'}</td>
                  <td className="p-2">{item.brand_name || '-'}</td>

                  <td className="p-2">
                    <input
                      type="number"
                      value={item.qty}
                      readOnly
                      className="w-full rounded border bg-gray-100 px-2 py-1 text-right"
                    />
                  </td>

                  <td className="p-2">{item.unit_name || '-'}</td>

                  <td className="p-2">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={item.no_of_units}
                      onChange={(e) =>
                        updateRow(index, 'no_of_units', e.target.value)
                      }
                      className="w-full rounded border px-2 py-1 text-right"
                    />
                  </td>

                  <td className="p-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.expected_unit_price}
                      onChange={(e) =>
                        updateRow(index, 'expected_unit_price', e.target.value)
                      }
                      className="w-full rounded border px-2 py-1 text-right"
                    />
                  </td>

                  <td className="p-2 text-right font-semibold">
                    ₹
                    {(
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
            className="rounded-lg bg-green-700 px-5 py-2 text-white hover:bg-green-800"
          >
            Create Purchase Orders
          </button>
        </div>
      </form>
    </section>
  );
};

export default CreatePurchaseOrderSection;
