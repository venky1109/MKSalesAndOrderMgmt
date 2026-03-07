import React, { useRef, useEffect, useState, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  updateQty,
  removeFromCart,
  clearCart,
  setCart,
} from "../features/cart/cartSlice";

import { fetchLatestOrders } from "../features/orders/orderSlice";
import { fetchAllProducts } from "../features/products/productSlice";

function QtyInput({ item, dispatch, updateQty }) {
  const [draftQty, setDraftQty] = useState(String(item.qty ?? 1));

  useEffect(() => {
    setDraftQty(String(item.qty ?? 1));
  }, [item.qty]);

  const commitQty = () => {
    const parsed = parseInt(draftQty, 10);
    const maxQty = (item.stock ?? 0) + (item.qty ?? 0);

    if (Number.isNaN(parsed)) {
      setDraftQty(String(item.qty ?? 1));
      return;
    }

    const safeQty = Math.max(1, Math.min(parsed, maxQty));

    dispatch(
      updateQty({
        productId: item.productId,
        brandId: item.brandId,
        financialId: item.financialId,
        qty: safeQty,
      })
    );

    setDraftQty(String(safeQty));
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={draftQty}
      className={[
        "w-8 sm:w-8",
        "border rounded-md px-1 py-1",
        "text-center text-gray-800",
        "focus:outline-none focus:ring-2 focus:ring-blue-300",
      ].join(" ")}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        const value = e.target.value.replace(/[^\d]/g, "");
        setDraftQty(value);
      }}
      onFocus={(e) => {
        e.stopPropagation();
        e.target.select();
      }}
      onBlur={commitQty}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
        if (e.key === "Escape") {
          setDraftQty(String(item.qty ?? 1));
          e.currentTarget.blur();
        }
      }}
    />
  );
}

function BillingSection() {
  const [holds, setHolds] = useState([]);
  const [expandedKey, setExpandedKey] = useState(null);
  const [highlightedKey, setHighlightedKey] = useState(null);

  const dispatch = useDispatch();

  const cartItems = useSelector((state) => state.cart.items || []);
  const cartTotal = useSelector((state) => state.cart.total || 0);
  const cartTotalQty = useSelector((state) => state.cart.totalQty || 0);
  const cartTotalDiscount = useSelector((state) => state.cart.totalDiscount || 0);
  const cartTotalRaw = useSelector((state) => state.cart.totalRawAmount || 0);
  const token = useSelector((state) => state.posUser.userInfo?.token);

  const barcodeRef = useRef(null);
  const rowRefs = useRef({});
  const prevCartRef = useRef([]);
  const highlightTimeoutRef = useRef(null);

  const getRowKey = useCallback(
    (item) =>
      `${item.productId ?? "na"}-${item.brandId ?? "na"}-${item.financialId ?? "na"}`,
    []
  );

  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  const toggleExpand = useCallback((key) => {
    setExpandedKey((prev) => (prev === key ? null : key));
  }, []);

  useEffect(() => {
    if (token) dispatch(fetchAllProducts(token));
  }, [dispatch, token]);

  useEffect(() => {
    dispatch(fetchLatestOrders());
  }, [dispatch]);

  useEffect(() => {
    const existing = Object.keys(localStorage)
      .filter((key) => key.startsWith("hold"))
      .map((key) => {
        const number = key.replace("hold", "");
        return { key, label: `Hold ${number}` };
      });

    setHolds(existing);
  }, []);

  useEffect(() => {
    const payload = {
      items: cartItems,
      total: cartTotal,
      totalQty: cartTotalQty,
      totalDiscount: cartTotalDiscount,
      totalRawAmount: cartTotalRaw,
    };
    localStorage.setItem("cart", JSON.stringify(payload));
  }, [cartItems, cartTotal, cartTotalQty, cartTotalDiscount, cartTotalRaw]);

  useEffect(() => {
    const prevItems = prevCartRef.current || [];

    if (!prevItems.length) {
      prevCartRef.current = cartItems;
      return;
    }

    const prevQtyMap = new Map(
      prevItems.map((item) => [getRowKey(item), Number(item.qty || 0)])
    );

    let changedKey = null;

    for (const item of cartItems) {
      const key = getRowKey(item);
      const prevQty = prevQtyMap.get(key);
      const currQty = Number(item.qty || 0);

      if (prevQty === undefined || currQty !== prevQty) {
        changedKey = key;
        break;
      }
    }

    if (changedKey && rowRefs.current[changedKey]) {
      rowRefs.current[changedKey].scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      setHighlightedKey(changedKey);

      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }

      highlightTimeoutRef.current = setTimeout(() => {
        setHighlightedKey(null);
      }, 1500);
    }

    prevCartRef.current = cartItems;
  }, [cartItems, getRowKey]);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  const clickTimer = useRef(null);
const lastTapRef = useRef({ key: null, time: 0 });

const handleDeleteHold = (holdKey) => {
  if (clickTimer.current) {
    clearTimeout(clickTimer.current);
    clickTimer.current = null;
  }

  if (window.confirm(`🗑️ Delete ${holdKey.replace("hold", "Hold ")}?`)) {
    localStorage.removeItem(holdKey);
    setHolds((prev) => prev.filter((h) => h.key !== holdKey));
    dispatch(clearCart());
  }
};

const handleRestoreHold = (holdKey) => {
  const now = Date.now();
  const isDoubleTap =
    lastTapRef.current.key === holdKey &&
    now - lastTapRef.current.time < 300;

  if (isDoubleTap) {
    lastTapRef.current = { key: null, time: 0 };
    handleDeleteHold(holdKey);
    return;
  }

  lastTapRef.current = { key: holdKey, time: now };

  if (clickTimer.current) {
    clearTimeout(clickTimer.current);
  }

  clickTimer.current = setTimeout(() => {
    const heldData = JSON.parse(localStorage.getItem(holdKey) || "{}");
    if (!heldData?.items?.length) {
      alert("❌ No items in this hold.");
      clickTimer.current = null;
      return;
    }

    dispatch(setCart(heldData));
    localStorage.setItem("cart", JSON.stringify(heldData));
    clickTimer.current = null;
  }, 300);
};

  return (
    <div className="h-full min-h-0 flex flex-col bg-white">
      <div className="min-h-0 flex flex-col overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-white">
        <div className="shrink-0 bg-white border-b">
          <div className="px-3 py-2 flex items-center justify-between">
            <h2 className="font-semibold text-yellow-800 text-sm sm:text-xl leading-tight">
              Current Order Items
            </h2>

            <div className="flex items-center gap-2 text-sm sm:text-xl">
              <span className="px-2 py-1 rounded bg-gray-50 border text-gray-700">
                Items: <b>{cartItems.length}</b>
              </span>

              <span className="px-2 py-1 rounded bg-gray-50 border text-gray-700">
                Qty: <b>{cartTotalQty}</b>
              </span>
            </div>
          </div>

          <div className="md:hidden px-3 pb-2 flex items-center justify-end gap-2 text-xs">
            <span className="px-2 py-1 rounded bg-gray-50 border text-gray-700">
              MRP: <b>₹{cartTotalRaw}</b>
            </span>

            <span className="px-2 py-1 rounded bg-gray-50 border text-gray-700">
              Disc: <b>₹{cartTotalDiscount}</b>
            </span>

            <span className="px-2 py-1 rounded bg-green-50 border text-green-800 font-semibold">
              Total: <b>₹{cartTotal}</b>
            </span>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <table className="w-full text-sm sm:text-md table-fixed">
            <thead className="bg-gray-100 text-gray-700 sticky top-0 z-10 border-b">
              <tr className="text-left">
                <th className="px-1 py-2 w-8 text-center">No</th>
                <th className="px-2 py-2">Item</th>
                <th className="px-1 py-2 w-14 text-center">MRP</th>
                <th className="px-1 py-2 w-12 text-center">Disc%</th>
                <th className="px-1 py-2 w-14 text-center">Rate</th>
                <th className="px-2 py-2 w-8 text-center">Qty</th>
                <th className="px-3 py-2 w-24 text-right">Amt</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {cartItems.length === 0 ? (
                <tr className="text-center text-gray-600">
                  <td className="p-3" colSpan={7}>
                    No items added yet
                  </td>
                </tr>
              ) : (
                cartItems.map((item, idx) => {
                  const rowKey = getRowKey(item);
                  const amount = Number(item.subtotal || 0);
                  const isOpen = expandedKey === rowKey;

                  return (
                    <React.Fragment key={rowKey}>
                      <tr
                        ref={(el) => {
                          if (el) rowRefs.current[rowKey] = el;
                        }}
                        className={[
                          "cursor-pointer transition-all duration-300",
                          highlightedKey === rowKey
                            ? "bg-yellow-100 ring-2 ring-yellow-400"
                            : idx % 2 === 0
                            ? "bg-white hover:bg-blue-50"
                            : "bg-gray-50/60 hover:bg-blue-50",
                        ].join(" ")}
                      >
                        <td className="px-1 py-2 text-gray-500 text-center">
                          {idx + 1}
                        </td>

                        <td className="px-2 py-2">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              className={[
                                "shrink-0 h-6 w-4 rounded border text-gray-600 text-xs",
                                "hover:bg-gray-100 active:scale-95 transition",
                              ].join(" ")}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(rowKey);
                              }}
                              aria-expanded={isOpen}
                              aria-label="Toggle details"
                            >
                              {isOpen ? "▴" : "▾"}
                            </button>

                            <div className="min-w-0">
                              <div className="font-medium text-gray-800 truncate">
                                {item.item}
                              </div>

                              <div className="text-[11px] text-gray-500 truncate sm:hidden">
                                Stock: {item.stock ?? 0} • MRP: ₹
                                {Number(item.price || 0).toFixed(2)} • Disc:{" "}
                                {Math.round(Number(item.discount || 0))}%
                              </div>

                              <div className="hidden sm:block text-[11px] text-gray-500 truncate">
                                <span className="ml-1 text-xs text-gray-500">
                                  {item.catalogQuantity}
                                  {item.units}
                                </span>{" "}
                                •{" "}
                                <span className="ml-1 text-xs text-gray-500">
                                  Stock: {item.stock ?? 0}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-1 py-2 text-right text-gray-700 whitespace-nowrap">
                          ₹{Number(item.price || 0).toFixed(2)}
                        </td>

                        <td className="px-1 py-2 text-right text-gray-700 whitespace-nowrap">
                          {Math.round(Number(item.discount || 0))}%
                        </td>

                        <td className="px-1 py-2 text-right text-gray-700 whitespace-nowrap">
                          ₹{Number(item.dprice || 0).toFixed(2)}
                        </td>

                        <td className="px-1 py-2">
                          <QtyInput
                            item={item}
                            dispatch={dispatch}
                            updateQty={updateQty}
                          />
                        </td>

                        <td className="px-3 py-2 text-right font-semibold text-green-700 whitespace-nowrap">
                          ₹{amount.toFixed(2)}
                        </td>
                      </tr>

                      {isOpen && (
                        <tr className="bg-white">
                          <td colSpan={7} className="px-2 py-2 border-t">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                              <div className="p-2 bg-gray-50 rounded">
                                <div className="text-gray-500">Stock</div>
                                <div className="font-semibold">{item.stock}</div>
                              </div>

                              <div className="p-2 bg-gray-50 rounded">
                                <div className="text-gray-500">MRP</div>
                                <div className="font-semibold">₹ {item.price}</div>
                              </div>

                              <div className="p-2 bg-gray-50 rounded">
                                <div className="text-gray-500">Discount</div>
                                <div className="font-semibold">{item.discount} %</div>
                              </div>

                              <div className="p-2 flex items-center">
                                <button
                                  className="text-red-600 hover:text-red-700 px-3 py-1 border rounded-md"
                                  onClick={() =>
                                    dispatch(
                                      removeFromCart({
                                        productId: item.productId,
                                        brandId: item.brandId,
                                        financialId: item.financialId,
                                      })
                                    )
                                  }
                                >
                                  🗑️ Remove
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {holds.length > 0 && (
        <div className="shrink-0 mt-2 flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
          {holds.map((hold) => (
            <button
  key={hold.key}
  onClick={() => handleRestoreHold(hold.key)}
  className="bg-gray-500 text-white px-3 py-2 rounded-md text-sm hover:bg-gray-600 transition"
  title="Double-tap to delete"
>
  {hold.label}
</button>
          ))}
        </div>
      )}
    </div>
  );
}

export default BillingSection;