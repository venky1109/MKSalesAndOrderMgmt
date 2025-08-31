import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import CreateOrderButton from "./CreateOrderButton";
import { clearCart, addToCart } from "../features/cart/cartSlice";
import { fetchLatestOrders } from "../features/orders/orderSlice";
import { fetchAllProducts, fetchProductByBarcode } from "../features/products/productSlice";
import {
  fetchCustomerByPhone,
  createCustomer,
} from "../features/customers/customerSlice";
import { initiateDeliveryPayment } from "../features/payment/paymentSlice";
import { createOrder } from "../features/orders/orderSlice";
import logo from "../assests/ManaKiranaLogo1024x1024.png";

/** Offline catalog (store-first, localStorage fallback) + fast barcode map */
function useOfflineCatalog() {
  const storeAll = useSelector((s) => s.products?.all);
  const storeList = Array.isArray(storeAll)
    ? storeAll
    : Array.isArray(storeAll?.products)
    ? storeAll.products
    : [];

  const lsList = useMemo(() => {
    const keys = [
      "mkpos.products",
      "products",
      "allProducts",
      "catalog",
      "mkpos.products.json",
    ];
    for (const k of keys) {
      try {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
        if (Array.isArray(parsed?.products)) return parsed.products;
      } catch {}
    }
    return [];
  }, []);

  const list = storeList?.length ? storeList : lsList;

  // Build a lookup map: barcode -> {p,d,f}
  const barcodeMap = useMemo(() => {
    const map = new Map();
    for (const p of list || []) {
      for (const d of p?.details || []) {
        for (const f of d?.financials || []) {
          let bars = Array.isArray(f?.barcode) ? f.barcode : [f?.barcode];
          bars = bars.filter(Boolean).map((b) => String(b).trim());
          for (const b of bars) {
            if (!b) continue;
            if (!map.has(b)) map.set(b, { p, d, f });
          }
        }
      }
    }
    return map;
  }, [list]);

  return { productsList: list, barcodeMap };
}

function Footer() {
  const dispatch = useDispatch();

  // Totals
  const cartItems = useSelector((s) => s.cart.items || []);
  const cartTotalQty = useSelector((s) => s.cart.totalQty || 0);
  const cartTotalDiscount = useSelector((s) => s.cart.totalDiscount || 0);
  const cartTotalRaw = useSelector((s) => s.cart.totalRawAmount || 0);
  const cartTotal = useSelector((s) => s.cart.total || 0);

  // Auth
  const token = useSelector((s) => s.posUser.userInfo?.token);

  // Offline catalog + barcode map
  const { productsList, barcodeMap } = useOfflineCatalog();

  // Optionally keep a fresh cache in localStorage for offline
  useEffect(() => {
    if (productsList?.length) {
      try {
        localStorage.setItem("mkpos.products", JSON.stringify(productsList));
      } catch {}
    }
  }, [productsList]);

  // If nothing cached and we’re online, try to fetch once
  useEffect(() => {
    if (!productsList.length && token && navigator.onLine) {
      dispatch(fetchAllProducts(token));
    }
  }, [productsList.length, token, dispatch]);

  const [loading, setLoading] = useState(false);

  // Barcode input
  const barcodeRef = useRef(null);
  const [barcodeInput, setBarcodeInput] = useState("");
  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  const normalizeScan = (raw) => {
    let s = String(raw ?? "").trim();
    // remove wrapping artifacts like ["12345"]
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed) && parsed[0]) s = String(parsed[0]);
    } catch {}
    return s.replace(/\s+/g, "");
  };

  const handleBarcode = useCallback(
    async (raw) => {
      const scanned = normalizeScan(raw);

      // 1) OFFLINE-FIRST: try local map
      const hit =
        barcodeMap.get(scanned) ||
        barcodeMap.get(scanned.replace(/^0+/, "")) || // tolerate leading zeros
        null;

      if (hit) {
        const { p, d, f } = hit;
        dispatch(
          addToCart({
            id: p._id,
            productName: p.name,
            category: p.category,
            brand: d.brand,
            brandId: d._id,
            financialId: f._id,
            MRP: f.price,
            dprice: f.dprice,
            quantity: f.quantity,
            countInStock: f.countInStock,
            units: f.units,
            image: d.images?.[0]?.image,
            catalogQuantity: f.quantity,
            discount:
              f?.price > 0
                ? Math.round(((f.price - f.dprice) / f.price) * 100)
                : 0,
            qty: 1,
          })
        );
        setTimeout(() => barcodeRef.current?.focus(), 100);
        return;
      }

      // 2) ONLINE fallback: query API if available
      if (navigator.onLine) {
        try {
          const result = await dispatch(
            fetchProductByBarcode({ barcode: scanned, token })
          ).unwrap();
          if (result) {
            dispatch(addToCart(result));
          } else {
            alert("❌ Product not found.");
          }
        } catch (err) {
          alert("❌ Error: " + (err?.message || err));
        }
      } else {
        alert("📴 Offline and product not found in cache.");
      }

      setTimeout(() => barcodeRef.current?.focus(), 100);
    },
    [dispatch, token, barcodeMap]
  );

  // --- Hold current cart (by phone) ---
  const handleHold = () => {
    if (cartItems.length === 0) {
      alert("❌ Cart is empty!");
      return;
    }
    const phone = prompt("📱 Enter customer phone number (10 digits):");
    if (!phone || !/^\d{10}$/.test(phone)) {
      alert("⚠️ Please enter a valid 10-digit phone number.");
      return;
    }
    const holdKey = `hold${phone}`;
    localStorage.setItem(
      holdKey,
      JSON.stringify({ items: cartItems, total: cartTotal })
    );
    dispatch(clearCart());
  };

  // --- UPI flow (online only) ---
  const handleUpiClick = async () => {
    if (!navigator.onLine) {
      alert("⚠️ You are offline. Connect to the internet to create a UPI link.");
      return;
    }

    const phone = prompt("📱 Enter Customer Mobile Number (10 digits):");
    if (!phone || !/^\d{10}$/.test(phone)) {
      alert("⚠️ Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);

    const items = cartItems || [];
    const total = cartTotal || 0;

    let customer = null;
    try {
      customer = await dispatch(fetchCustomerByPhone({ phone, token })).unwrap();
    } catch {
      const name = prompt("👤 Enter Customer Name:") || "NA";
      const street = prompt(" Enter Street:") || "NA";
      const city = prompt(" Enter City:") || "NA";
      const postalCode = prompt(" Enter Postal Code:") || "000000";
      try {
        customer = await dispatch(
          createCustomer({ name, phone, address: { street, city, postalCode }, token })
        ).unwrap();
      } catch (err) {
        alert("❌ Failed to create customer: " + err.message);
        setLoading(false);
        return;
      }
    }

    const orderPayload = {
      user: customer._id,
      shippingAddress: {
        street: customer.address || "NA",
        city: customer.city || "NA",
        postalCode: customer.postalCode || "000000",
        country: "India",
      },
      paymentMethod: "Cash",
      orderItems: items.map((item) => ({
        name: item.item,
        quantity: item.catalogQuantity,
        units: item.units,
        brand: item.brand,
        qty: item.qty ?? item.quantity,
        image: item.image || "",
        price: item.dprice,
        productId: item.id,
        brandId: item.brandId,
        financialId: item.financialId,
      })),
      totalPrice: total,
    };

    try {
      const createdOrder = await dispatch(
        createOrder({ payload: orderPayload, token, cartItems: items })
      ).unwrap();

      const result = await dispatch(
        initiateDeliveryPayment({
          customerId: phone,
          order_id: createdOrder._id,
          amount: total,
          source: "CASHIER",
          paymentMethod: "UPI",
        })
      ).unwrap();

      const redirectUrl = result?.data?.payment_links?.web;
      if (redirectUrl) window.open(redirectUrl, "_blank");
      else alert("No payment link received.");

      dispatch(clearCart());
      dispatch(fetchLatestOrders());
      dispatch(fetchAllProducts(token));
    } catch (err) {
      alert("❌ Payment failed: " + (err?.message || err));
    }

    setLoading(false);
  };

  return (
    <footer className="sticky bottom-0 left-0 right-0 bg-white border-t z-40">
      {/* Totals bar */}
      <div className="bg-yellow-500 sticky bottom-0 left-0 right-0 z-40 backdrop-blur">
        {/* Barcode input */}
        <div className="px-3 py-1">
          <div className="mb-2">
            <input
              type="text"
              ref={barcodeRef}
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && barcodeInput.trim()) {
                  handleBarcode(barcodeInput.trim());
                  setBarcodeInput("");
                }
              }}
              placeholder="📷 Scan barcode to add"
              className="border p-2 w-full text-base text-center rounded bg-white text-slate-900"
            />
          </div>

          {/* Totals */}
          <div className="rounded-xl border border-white/10 p-1">
            <div className="grid grid-cols-5 gap-x-3 gap-y-1 text-xs sm:text-sm items-center">
              <div className="text-center text-white/90 uppercase tracking-wide">Items</div>
              <div className="text-center text-white/90 uppercase tracking-wide">Qty</div>
              <div className="text-center text-white/90 uppercase tracking-wide">TotAmt</div>
              <div className="text-center text-white/90 uppercase tracking-wide">TotDis</div>
              <div className="text-center text-white text-md text-semibold uppercase tracking-wide">PayAmt</div>

              <div className="text-center">
                <span className="inline-block px-2 py-1 rounded-md bg-white/90 font-semibold text-slate-900">
                  {cartItems.length}
                </span>
              </div>
              <div className="text-center">
                <span className="inline-block px-2 py-1 rounded-md bg-white/90 font-semibold text-slate-900">
                  {cartTotalQty}
                </span>
              </div>
              <div className="text-center">
                <span className="inline-block px-2 py-1 rounded-md bg-white/90 font-semibold text-emerald-800">
                  ₹ {cartTotalRaw}
                </span>
              </div>
              <div className="text-center">
                <span className="inline-block px-2 py-1 rounded-md bg-white/90 font-semibold text-emerald-800">
                  ₹ {cartTotalDiscount}
                </span>
              </div>
              <div className="text-center">
                <span className="inline-block px-3 py-1 rounded-md bg-red-500 text-slate-100 text-base font-semibold shadow">
                  ₹ {cartTotal}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-3 pb-3">
          <div className="grid grid-cols-5 sm:grid-cols-5 gap-2 items-center">
            <button
              onClick={handleHold}
              title="Save cart for this customer"
              className="h-10 w-full inline-flex items-center justify-center rounded-lg bg-gray-500 text-white font-medium shadow-sm
                         active:translate-y-[1px] active:shadow-inner transition-all hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              Hold
            </button>

            <button
              title="Multi-customer / split flow"
              className="h-10 w-full inline-flex items-center justify-center rounded-lg bg-orange-500 text-white font-medium shadow-sm
                         active:translate-y-[1px] active:shadow-inner transition-all hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              Multi
            </button>

            <div className="h-12 w-full flex items-center justify-center">
              <img
                src={logo}
                alt="ManaKirana"
                className="h-12 w-12 sm:h-12 sm:w-12 rounded-full object-cover"
                draggable="false"
              />
            </div>

            <button
              onClick={handleUpiClick}
              title="Generate UPI payment link"
              className="h-10 w-full inline-flex items-center justify-center rounded-lg bg-blue-600 text-white font-medium shadow-sm
                         active:translate-y-[1px] active:shadow-inner transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              UPI
            </button>

            <div className="h-10 w-full [&>*]:h-full [&>*]:w-full [&>button]:rounded-lg">
              <CreateOrderButton />
            </div>
          </div>
        </div>
      </div>

      {/* Loader */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center z-[60]">
          <div className="w-12 h-12 border-4 border-white/70 border-t-transparent rounded-full animate-spin" />
          <p className="mt-3 text-white text-base">Processing UPI Payment...</p>
        </div>
      )}
    </footer>
  );
}

export default Footer;
