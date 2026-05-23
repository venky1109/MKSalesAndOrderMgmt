import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  fetchInventoryDispatchOrders,
  fetchInventoryProducts,
  fetchWarehouses,
  fetchOutlets,
  createInventoryDispatchOrder,
  receiveDispatchToOutlet,
} from "../features/inventory/stockManagerInventorySlice";
import {
  formatDispatchDate,
  getDispatchItemBarcode,
  getDispatchItemBrand,
  getDispatchItemCategory,
  getDispatchItemProductName,
  getDispatchItemUnit,
} from "../utils/dispatchDisplay";

const emptyItem = {
  search: "",
  exp_date: "",
  inventory_product_id: "",
  product_id: "",
  product_barcode_id: "",
  barcode: "",
  product_name: "",
  brand_id: "",
  brand_name: "",
  category_id: "",
  category_name: "",
  unit_id: "",
  unit_name: "",
  weight: "",
  qty: "",
  price: "",
  dprice: "",
  notes: "",
};

const POSDispatchButtons = ({ buttonClass = "" }) => {
  const dispatch = useDispatch();

  const { userInfo } = useSelector((state) => state.posUser || {});

  const {
    inventoryDispatchOrders = [],
    inventoryProducts = [],
    warehouses = [],
    outlets = [],
    loading = false,
  } = useSelector((state) => state.stockManagerInventory || {});

  const [open, setOpen] = useState(null);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(null);

  const [form, setForm] = useState({
    warehouse_id: "",
    outlet_id: "",
    expected_dispatch_at: "",
    dispatch_notes: "",
    items: [{ ...emptyItem }],
  });

  useEffect(() => {
    if (!userInfo?.token) return;

    dispatch(fetchInventoryDispatchOrders());
    dispatch(fetchInventoryProducts());
    dispatch(fetchWarehouses());
    dispatch(fetchOutlets());
  }, [dispatch, userInfo?.token]);

  const normalizeText = (value) =>
    String(value || "").toLowerCase().replace(/\s+/g, "").trim();

  const formatDateInput = (value) => {
    if (!value) return "";
    return String(value).slice(0, 10);
  };

  const getProductName = (p) => getDispatchItemProductName(p);

  const getBrandName = (p) => getDispatchItemBrand(p);

  const getCategoryName = (p) =>
    p.category_name_english || p.category_name_telugu || p.category_name || "-";

  const getUnitName = (p) =>
    p.unit_short_code || p.unit_code || p.unit_name || "-";

  const getWeight = (p) =>
    [
      p.barcode_quantity || p.quantity || p.catalog_quantity,
      p.unit_short_code || p.unit_code || p.unit_name,
    ]
      .filter(Boolean)
      .join(" ");

  const getBarcode = (p) => p.mk_barcode || p.barcode || p.bar_code || "";
  const getStock = (p) => p.count_in_stock ?? p.stock ?? 0;

  const firstValue = (...values) =>
    values.find((value) => value !== undefined && value !== null && value !== "");

  const toNumberOrNull = (value) => {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
  };

  const getPriceFromNotes = (notes, key) => {
    if (!notes) return null;
    const pattern =
      key === "mrp"
        ? /MRP\s*Rs\.?\s*([0-9]+(?:\.[0-9]+)?)/i
        : /Purchase\s*Rs\.?\s*([0-9]+(?:\.[0-9]+)?)/i;
    const match = String(notes).match(pattern);
    return match ? toNumberOrNull(match[1]) : null;
  };

  const getPurchasePrice = (item) =>
    toNumberOrNull(
      firstValue(
        item.package_amount,
        item.dprice,
        item.discount_price,
        item.discounted_price,
        item.selling_price,
        item.unit_price,
        item.unitPrice,
        getPriceFromNotes(item.notes, "purchase")
      )
    );

  const getMrpPrice = (item) => {
    const explicitMrp = toNumberOrNull(
      firstValue(
        item.mrp_amount,
        item.mrp,
        item.MRP,
        item.price,
        getPriceFromNotes(item.notes, "mrp")
      )
    );

    if (explicitMrp) return explicitMrp;

    const purchasePrice = getPurchasePrice(item);
    return purchasePrice ? Math.round(purchasePrice * 1.25) : null;
  };

  const getReceivePricePayload = (order) =>
    (order.items || []).map((item) => {
      const qty = Number(firstValue(item.no_of_units, item.qty, 0));
      const dprice = getPurchasePrice(item);
      const price = getMrpPrice(item);

      return {
        dispatch_order_item_id: item.id,
        product_barcode_id: item.product_barcode_id,
        barcode: item.mk_barcode || item.barcode || item.bar_code || "",
        qty,
        no_of_units: qty,
        countInStock: qty,
        price,
        dprice,
      };
    });

  const getProductSuggestionLabel = (p) =>
    `${getProductName(p)} | ${getWeight(p) || "-"} | ${getBrandName(
      p
    )} | ${getCategoryName(p)} | Barcode: ${getBarcode(p) || "-"} | Stock: ${getStock(
      p
    )}`;

  const getSuggestions = (search) => {
    const q = normalizeText(search);
    if (!q) return [];

    return inventoryProducts
      .filter((p) => {
        const barcode = normalizeText(getBarcode(p));
        const name = normalizeText(getProductName(p));
        const brand = normalizeText(getBrandName(p));
        const category = normalizeText(getCategoryName(p));
        const weight = normalizeText(getWeight(p));

        return (
          barcode === q ||
          barcode.includes(q) ||
          name.includes(q) ||
          brand.includes(q) ||
          category.includes(q) ||
          weight.includes(q)
        );
      })
      .slice(0, 50);
  };

  const dispatchedOrdersForOutlet = useMemo(() => {
    const outletText = String(userInfo?.location || "").toLowerCase();

    return (inventoryDispatchOrders || []).filter((order) => {
      const status = String(order.dispatch_status || "").toLowerCase();
      const destination = String(order.destination || "").toLowerCase();

      return (
        status === "dispatched" &&
        (!outletText || destination.includes(outletText))
      );
    });
  }, [inventoryDispatchOrders, userInfo?.location]);

  const resetForm = () => {
    setForm({
      warehouse_id: "",
      outlet_id: "",
      expected_dispatch_at: "",
      dispatch_notes: "",
      items: [{ ...emptyItem }],
    });
  };

  const closeModal = () => {
    setOpen(null);
    setActiveSuggestionIndex(null);
  };

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateItem = (index, field, value) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const selectProduct = (index, selectedProduct) => {
    if (!selectedProduct) return;

    setForm((prev) => {
      const items = [...prev.items];

      items[index] = {
        ...items[index],
        search: getProductSuggestionLabel(selectedProduct),
        inventory_product_id: selectedProduct.id || "",
        product_id:
          selectedProduct.product_id ||
          selectedProduct.catalog_product_id ||
          selectedProduct.id ||
          "",
        product_barcode_id:
          selectedProduct.product_barcode_id ||
          selectedProduct.barcode_id ||
          selectedProduct.catalog_barcode_id ||
          "",
        barcode: getBarcode(selectedProduct),
        product_name: getProductName(selectedProduct),
        brand_id: selectedProduct.brand_id || "",
        brand_name: getBrandName(selectedProduct),
        category_id: selectedProduct.category_id || "",
        category_name: getCategoryName(selectedProduct),
        unit_id: selectedProduct.unit_id || "",
        unit_name: getUnitName(selectedProduct),
        weight: getWeight(selectedProduct),
        price: getMrpPrice(selectedProduct) || "",
        dprice: getPurchasePrice(selectedProduct) || "",
        exp_date: formatDateInput(
          selectedProduct.exp_date ||
            selectedProduct.expiry_date ||
            selectedProduct.expDate
        ),
      };

      return { ...prev, items };
    });

    setActiveSuggestionIndex(null);
  };

  const handleSearchChange = (index, value) => {
    updateItem(index, "search", value);
    setActiveSuggestionIndex(index);

    const exactProduct = inventoryProducts.find(
      (p) => normalizeText(getBarcode(p)) === normalizeText(value)
    );

    if (exactProduct) selectProduct(index, exactProduct);
  };

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { ...emptyItem }],
    }));
  };

  const removeItem = (index) => {
    setForm((prev) => ({
      ...prev,
      items:
        prev.items.length === 1
          ? [{ ...emptyItem }]
          : prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleCreateDispatch = async () => {
    if (!form.warehouse_id) {
      alert("Please select warehouse.");
      return;
    }

    if (!form.outlet_id) {
      alert("Please select outlet.");
      return;
    }

    const missingExpiry = form.items.some(
      (item) => item.product_id && Number(item.qty) > 0 && !item.exp_date
    );

    if (missingExpiry) {
      alert("Expiry date is required for every dispatch item.");
      return;
    }

    const cleanItems = form.items
      .filter((item) => item.product_id && Number(item.qty) > 0 && item.exp_date)
      .map((item) => ({
        product_id: Number(item.product_id),
        product_barcode_id: item.product_barcode_id
          ? Number(item.product_barcode_id)
          : null,
        brand_id: item.brand_id ? Number(item.brand_id) : null,
        category_id: item.category_id ? Number(item.category_id) : null,
        unit_id: item.unit_id ? Number(item.unit_id) : null,
        qty: Number(item.qty),
        exp_date: item.exp_date,
        price: toNumberOrNull(item.price),
        dprice: toNumberOrNull(item.dprice),
        mrp_amount: toNumberOrNull(item.price),
        package_amount: toNumberOrNull(item.dprice),
        notes: item.notes || "",
      }));

    if (cleanItems.length === 0) {
      alert("Please add at least one product with quantity.");
      return;
    }

    const warehouse = warehouses.find(
      (w) => String(w.id) === String(form.warehouse_id)
    );

    const outlet = outlets.find((o) => String(o.id) === String(form.outlet_id));

    const payload = {
      source: `warehouse:${
  warehouse?.warehouse_name ||
  warehouse?.name ||
  warehouse?.warehouse_code ||
  form.warehouse_id
}`,
     destination: `outlet:${
  outlet?.outlet_name ||
  outlet?.name ||
  outlet?.outlet_code ||
  form.outlet_id
}`,
      warehouse_id: form.warehouse_id,
      outlet_id: form.outlet_id,
      dispatch_status: "sent",
      expected_dispatch_at: form.expected_dispatch_at || null,
      dispatch_notes:
        form.dispatch_notes ||
        `POS dispatch created by ${userInfo?.username || "POS user"}`,
      items: cleanItems,
    };

    try {
      await dispatch(createInventoryDispatchOrder(payload)).unwrap();
      await dispatch(fetchInventoryDispatchOrders()).unwrap();

      alert("Dispatch created successfully with status SENT.");
      resetForm();
      setOpen(null);
    } catch (error) {
      alert(error?.message || error || "Failed to create dispatch.");
    }
  };

  const handleReceive = async (order) => {
    if (
      !window.confirm(
        `Receive / verify dispatch ${order.dispatch_no}? This will update outlet stock.`
      )
    ) {
      return;
    }

    try {
      await dispatch(
        receiveDispatchToOutlet({
          dispatchOrderId: order.id,
          items: getReceivePricePayload(order),
        })
      ).unwrap();

      await dispatch(fetchInventoryDispatchOrders()).unwrap();
      alert("Dispatch received to outlet successfully.");
    } catch (error) {
      alert(error?.message || error || "Failed to receive dispatch.");
    }
  };

  const gridCols =
    "grid-cols-[minmax(760px,4fr)_100px_150px_180px_220px_220px_160px_minmax(260px,1fr)_100px]";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen("create")}
        className={buttonClass}
      >
        CDR
      </button>

      <button
        type="button"
        onClick={() => setOpen("receive")}
        className={buttonClass}
      >
        RDR
      </button>

      {open && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/45 px-2 py-3">
          <div className="h-[96vh] w-[98vw] overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex h-16 items-center justify-between bg-indigo-600 px-4 py-3">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {open === "create"
                    ? "Create Dispatch From Warehouse"
                    : "Receive / Verify Dispatched Orders"}
                </h2>
                <p className="text-xs font-semibold text-indigo-100">
                  Flow: Sent → Packed → Dispatched → Received To Outlet
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="text-2xl font-bold text-white"
              >
                ×
              </button>
            </div>

            <div className="h-[calc(96vh-64px)] overflow-auto p-4">
              {open === "create" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-gray-600">
                        Source Warehouse
                      </label>
                      <select
                        value={form.warehouse_id}
                        onChange={(e) =>
                          updateForm("warehouse_id", e.target.value)
                        }
                        className="h-11 w-full rounded-xl border px-3 text-sm"
                      >
                        <option value="">Select Warehouse</option>
                        {warehouses.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.warehouse_name ||
                              w.name ||
                              w.warehouse_code ||
                              `Warehouse ${w.id}`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-gray-600">
                        Destination Outlet
                      </label>
                      <select
                        value={form.outlet_id}
                        onChange={(e) => updateForm("outlet_id", e.target.value)}
                        className="h-11 w-full rounded-xl border px-3 text-sm"
                      >
                        <option value="">Select Outlet</option>
                        {outlets.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.outlet_name ||
                              o.name ||
                              o.outlet_code ||
                              `Outlet ${o.id}`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-gray-600">
                        Expected Dispatch Time
                      </label>
                      <input
                        type="datetime-local"
                        value={form.expected_dispatch_at}
                        onChange={(e) =>
                          updateForm("expected_dispatch_at", e.target.value)
                        }
                        className="h-11 w-full rounded-xl border px-3 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-gray-600">
                      Dispatch Notes
                    </label>
                    <textarea
                      value={form.dispatch_notes}
                      onChange={(e) =>
                        updateForm("dispatch_notes", e.target.value)
                      }
                      placeholder="Dispatch notes"
                      className="min-h-[70px] w-full rounded-xl border px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="min-h-[620px] overflow-x-auto rounded-xl border">
                    <div className="min-w-[1950px]">
                      <div
                        className={`grid ${gridCols} gap-2 bg-slate-100 px-3 py-2 text-xs font-bold text-gray-700`}
                      >
                        <div>Product / Barcode Search</div>
                        <div>Qty</div>
                        <div>Expiry</div>
                        <div>Weight</div>
                        <div>Brand</div>
                        <div>Category</div>
                        <div>Unit</div>
                        <div>Notes</div>
                        <div>Action</div>
                      </div>

                      {form.items.map((item, index) => {
                        const suggestions = getSuggestions(item.search);

                        return (
                          <div
                            key={index}
                            className={`grid ${gridCols} items-start gap-2 border-t px-3 py-2`}
                          >
                            <div className="relative">
                              <input
                                value={item.search}
                                onChange={(e) =>
                                  handleSearchChange(index, e.target.value)
                                }
                                onFocus={() => setActiveSuggestionIndex(index)}
                                placeholder="Type product name / brand / category / barcode"
                                className="h-10 w-full rounded-lg border px-2 text-sm"
                              />

                              {activeSuggestionIndex === index &&
                                suggestions.length > 0 && (
                                  <div className="absolute left-0 top-11 z-[10000] max-h-[560px] w-[950px] overflow-y-auto rounded-xl border bg-white shadow-2xl">
                                    {suggestions.map((p) => (
                                      <button
                                        key={`${p.id}-${getBarcode(p)}`}
                                        type="button"
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          selectProduct(index, p);
                                        }}
                                        className="block w-full border-b px-4 py-2 text-left text-xs hover:bg-yellow-50"
                                      >
                                        <div className="text-sm font-bold text-gray-900">
                                          {getProductName(p)}
                                        </div>

                                        <div className="mt-1 grid grid-cols-3 gap-2 text-[11px] text-gray-700">
                                          <div>
                                            <span className="font-bold">
                                              Weight:
                                            </span>{" "}
                                            {getWeight(p) || "-"}
                                          </div>
                                          <div>
                                            <span className="font-bold">
                                              Brand:
                                            </span>{" "}
                                            {getBrandName(p)}
                                          </div>
                                          <div>
                                            <span className="font-bold">
                                              Category:
                                            </span>{" "}
                                            {getCategoryName(p)}
                                          </div>
                                        </div>

                                        <div className="mt-1 grid grid-cols-3 gap-2 text-[11px] text-gray-500">
                                          <div>
                                            <span className="font-bold">
                                              Barcode:
                                            </span>{" "}
                                            {getBarcode(p) || "-"}
                                          </div>
                                          <div>
                                            <span className="font-bold">
                                              Stock:
                                            </span>{" "}
                                            {getStock(p)}
                                          </div>
                                          <div>
                                            <span className="font-bold">
                                              Exp:
                                            </span>{" "}
                                            {formatDateInput(
                                              p.exp_date ||
                                                p.expiry_date ||
                                                p.expDate
                                            ) || "-"}
                                          </div>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                )}
                            </div>

                            <input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={(e) =>
                                updateItem(index, "qty", e.target.value)
                              }
                              placeholder="Qty"
                              className="h-10 rounded-lg border px-2 text-sm"
                            />

                            <input
                              type="date"
                              value={item.exp_date || ""}
                              onChange={(e) =>
                                updateItem(index, "exp_date", e.target.value)
                              }
                              className="h-10 rounded-lg border px-2 text-sm"
                            />

                            <input
                              value={item.weight || ""}
                              readOnly
                              placeholder="Weight"
                              className="h-10 rounded-lg border bg-gray-50 px-2 text-sm"
                            />

                            <input
                              value={item.brand_name || ""}
                              readOnly
                              placeholder="Brand"
                              className="h-10 rounded-lg border bg-gray-50 px-2 text-sm"
                            />

                            <input
                              value={item.category_name || ""}
                              readOnly
                              placeholder="Category"
                              className="h-10 rounded-lg border bg-gray-50 px-2 text-sm"
                            />

                            <input
                              value={item.unit_name || ""}
                              readOnly
                              placeholder="Unit"
                              className="h-10 rounded-lg border bg-gray-50 px-2 text-sm"
                            />

                            <input
                              value={item.notes || ""}
                              onChange={(e) =>
                                updateItem(index, "notes", e.target.value)
                              }
                              placeholder="Item notes"
                              className="h-10 rounded-lg border px-2 text-sm"
                            />

                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="h-10 rounded-lg bg-red-600 text-xs font-bold text-white hover:bg-red-700"
                            >
                              Remove
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-between gap-3">
                    <button
                      type="button"
                      onClick={addItem}
                      className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
                    >
                      + Add Product
                    </button>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={closeModal}
                        className="rounded-xl border px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-100"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        disabled={loading}
                        onClick={handleCreateDispatch}
                        className="rounded-xl bg-green-600 px-5 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:bg-gray-400"
                      >
                        {loading ? "Saving..." : "Create Dispatch"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {dispatchedOrdersForOutlet.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-8 text-center text-gray-500">
                      No dispatched orders found for this outlet.
                    </div>
                  ) : (
                    dispatchedOrdersForOutlet.map((order) => (
                      <div
                        key={order.id}
                        className="rounded-xl border p-4 shadow-sm"
                      >
                        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                          <div>
                            <div className="text-lg font-bold text-gray-900">
                              {order.dispatch_no}
                            </div>

                            <div className="mt-1 text-sm text-gray-600">
                              <span className="font-semibold">Source:</span>{" "}
                              {order.source || "-"}
                            </div>

                            <div className="text-sm text-gray-600">
                              <span className="font-semibold">
                                Destination:
                              </span>{" "}
                              {order.destination || "-"}
                            </div>

                            <div className="text-sm font-semibold text-indigo-700">
                              Status: {order.dispatch_status}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleReceive(order)}
                            className="rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700"
                          >
                            Receive / Verify To Outlet
                          </button>
                        </div>

                        <div className="mt-4 overflow-x-auto rounded-xl border">
                          <table className="min-w-full text-sm">
                            <thead className="bg-slate-100 text-gray-700">
                              <tr>
                                <th className="px-3 py-2 text-left">Product</th>
                                <th className="px-3 py-2 text-left">Barcode</th>
                                <th className="px-3 py-2 text-left">Weight</th>
                                <th className="px-3 py-2 text-left">Brand</th>
                                <th className="px-3 py-2 text-left">
                                  Category
                                </th>
                                <th className="px-3 py-2 text-left">Expiry</th>
                                <th className="px-3 py-2 text-center">Qty</th>
                                <th className="px-3 py-2 text-left">Notes</th>
                              </tr>
                            </thead>

                            <tbody>
                              {(order.items || []).map((item) => (
                                <tr key={item.id} className="border-t">
                                  <td className="px-3 py-2 font-semibold">
                                    {getDispatchItemProductName(item)}
                                  </td>

                                  <td className="px-3 py-2">
                                    {getDispatchItemBarcode(item)}
                                  </td>

                                  <td className="px-3 py-2">
                                    {getDispatchItemUnit(item)}
                                  </td>

                                  <td className="px-3 py-2">
                                    {getDispatchItemBrand(item)}
                                  </td>

                                  <td className="px-3 py-2">
                                    {getDispatchItemCategory(item)}
                                  </td>

                                  <td className="px-3 py-2">
                                    {formatDispatchDate(item.exp_date)}
                                  </td>

                                  <td className="px-3 py-2 text-center">
                                    {item.qty}
                                  </td>

                                  <td className="px-3 py-2">
                                    {item.notes || "-"}
                                  </td>
                                </tr>
                              ))}

                              {(!order.items || order.items.length === 0) && (
                                <tr>
                                  <td
                                    colSpan="8"
                                    className="px-3 py-6 text-center text-gray-500"
                                  >
                                    No items
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default POSDispatchButtons;
