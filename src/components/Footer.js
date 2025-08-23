import React,{ useCallback, useEffect, useMemo, useRef, useState }  from 'react';
import { useSelector, useDispatch } from 'react-redux';
import CreateOrderButton from './CreateOrderButton';
import { clearCart,addToCart  } from '../features/cart/cartSlice';
import { fetchLatestOrders } from '../features/orders/orderSlice';
import { fetchAllProducts } from '../features/products/productSlice';
import {
  fetchCustomerByPhone,
  createCustomer
} from '../features/customers/customerSlice';
import { initiateDeliveryPayment } from '../features/payment/paymentSlice';
import { createOrder } from '../features/orders/orderSlice';
import logo from "../assests/ManaKiranaLogo1024x1024.png";
import { fetchProductByBarcode } from "../features/products/productSlice";

function Footer() {
  const dispatch = useDispatch();

  // Totals
  const cartItems = useSelector((s) => s.cart.items || []);
  const cartTotalQty = useSelector((s) => s.cart.totalQty || 0);
  const cartTotalDiscount = useSelector((s) => s.cart.totalDiscount || 0);
  const cartTotalRaw = useSelector((s) => s.cart.totalRawAmount || 0);
  const cartTotal = useSelector((s) => s.cart.total || 0);
    const { all: products = [] } = useSelector((s) => s.products || {});  
    const safeProducts = useMemo(
    () => (Array.isArray(products) ? products : Array.isArray(products?.products) ? products.products : []),
    [products] );

  // Auth
  const token = useSelector((s) => s.posUser.userInfo?.token);

  const [loading, setLoading] = useState(false);
    // Barcode input
  const barcodeRef = useRef(null);
  const [barcodeInput, setBarcodeInput] = useState("");

  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  const handleBarcode = useCallback(
    async (raw) => {
      let scanned = raw;
      if (typeof raw === "string") {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) scanned = parsed[0];
        } catch {
          scanned = raw.replace(/\[\]"]+/g, "");
        }
      }

      // 1) Try offline (local Redux/cache) match first
      const matchedProduct = safeProducts.find((p) =>
        p.details?.some((d) =>
          d.financials?.some((f) =>
            (Array.isArray(f.barcode) ? f.barcode : [f.barcode || ""]).includes(scanned)
          )
        )
      );

      if (matchedProduct) {
        const detail = matchedProduct.details.find((d) =>
          d.financials?.some((f) =>
            (Array.isArray(f.barcode) ? f.barcode : [f.barcode || ""]).includes(scanned)
          )
        );
        const financial = detail.financials.find((f) =>
          (Array.isArray(f.barcode) ? f.barcode : [f.barcode || ""]).includes(scanned)
        );

        dispatch(
          addToCart({
            id: matchedProduct._id,
            productName: matchedProduct.name,
            category: matchedProduct.category,
            brand: detail.brand,
            brandId: detail._id,
            financialId: financial._id,
            MRP: financial.price,
            dprice: financial.dprice,
            quantity: financial.quantity,
            countInStock: financial.countInStock,
            units: financial.units,
            image: detail.images?.[0]?.image,
            catalogQuantity: financial.quantity,
            discount: Math.round(((financial.price - financial.dprice) / financial.price) * 100),
            qty: 1,
          })
        );
      } else {
        // 2) Fallback to API (when online)
        try {
          const result = await dispatch(fetchProductByBarcode({ barcode: scanned, token })).unwrap();
          if (result) {
            dispatch(addToCart(result));
          } else {
            alert("❌ Product not found");
          }
        } catch (err) {
          alert("❌ Error: " + err.message);
        }
      }

      setTimeout(() => barcodeRef.current?.focus(), 100);
    },
    [dispatch, token, safeProducts]
  );


  // --- Hold current cart (by phone) ---
  const handleHold = () => {
    if (cartItems.length === 0) {
      alert('❌ Cart is empty!');
      return;
    }
    const phone = prompt('📱 Enter customer phone number (10 digits):');
    if (!phone || !/^\d{10}$/.test(phone)) {
      alert('⚠️ Please enter a valid 10-digit phone number.');
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
      alert('⚠️ You are offline. Connect to the internet to create a UPI link.');
      return;
    }

    const phone = prompt('📱 Enter Customer Mobile Number (10 digits):');
    if (!phone || !/^\d{10}$/.test(phone)) {
      alert('⚠️ Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);

    // Use current cart snapshot
    const items = cartItems || [];
    const total = cartTotal || 0;

    let customer = null;
    try {
      customer = await dispatch(fetchCustomerByPhone({ phone, token })).unwrap();
    } catch {
      const name = prompt('👤 Enter Customer Name:') || 'NA';
      const street = prompt(' Enter Street:') || 'NA';
      const city = prompt(' Enter City:') || 'NA';
      const postalCode = prompt(' Enter Postal Code:') || '000000';

      try {
        customer = await dispatch(
          createCustomer({ name, phone, address: { street, city, postalCode }, token })
        ).unwrap();
      } catch (err) {
        alert('❌ Failed to create customer: ' + err.message);
        setLoading(false);
        return;
      }
    }

    const orderPayload = {
      user: customer._id,
      shippingAddress: {
        street: customer.address || 'NA',
        city: customer.city || 'NA',
        postalCode: customer.postalCode || '000000',
        country: 'India',
      },
      paymentMethod: 'Cash', // backend may switch on payment later
      orderItems: items.map((item) => ({
        name: item.item,
        quantity: item.catalogQuantity,
        units: item.units,
        brand: item.brand,
        qty: item.qty ?? item.quantity,
        image: item.image || '',
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
          source: 'CASHIER',
          paymentMethod: 'UPI',
        })
      ).unwrap();

      const redirectUrl = result?.data?.payment_links?.web;
      if (redirectUrl) {
        window.open(redirectUrl, '_blank');
      } else {
        alert('No payment link received.');
      }

      dispatch(clearCart());
      dispatch(fetchLatestOrders());
      dispatch(fetchAllProducts(token));
    } catch (err) {
      alert('❌ Payment failed: ' + (err?.message || err));
    }

    setLoading(false);
  };

  return (
    <footer className="sticky bottom-0 left-0 right-0 bg-white border-t z-40">
      {/* Totals bar */}
<div className="bg-yellow-500 sticky bottom-0 left-0 right-0 z-40 backdrop-blur">
  {/* Totals */}
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
  <div className="rounded-xl border border-white/10 p-1">
    {/* 2-row grid: labels (row 1) + values (row 2) */}
    <div className="grid grid-cols-5 gap-x-3 gap-y-1 text-xs sm:text-sm items-center">
      {/* Row 1 — labels */}
      <div className="text-center text-white/90 uppercase tracking-wide">Items</div>
      <div className="text-center text-white/90 uppercase tracking-wide">Qty</div>
      <div className="text-center text-white/90 uppercase tracking-wide">TotAmt</div>
      <div className="text-center text-white/90 uppercase tracking-wide">TotDis</div>
      <div className="text-center text-white text-md text-semibold uppercase tracking-wide">PayAmt</div>

      {/* Row 2 — values */}
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
    {/* 1: Hold */}
    <button
      onClick={handleHold}
      title="Save cart for this customer"
      className="h-10 w-full inline-flex items-center justify-center rounded-lg bg-gray-500 text-white font-medium shadow-sm
                 active:translate-y-[1px] active:shadow-inner transition-all hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-white/50"
    >
      Hold
    </button>

    {/* 2: Multi */}
    <button
      title="Multi-customer / split flow"
      className="h-10 w-full inline-flex items-center justify-center rounded-lg bg-orange-500 text-white font-medium shadow-sm
                 active:translate-y-[1px] active:shadow-inner transition-all hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-white/50"
    >
      Multi
    </button>

    {/* 3: Center logo */}
    <div className="h-12 w-full flex items-center justify-center">
      <img
        src={logo}
        alt="ManaKirana"
        className="h-12 w-12 sm:h-12 sm:w-12 rounded-full object-cover"
        draggable="false"
      />
    </div>

    {/* 4: UPI */}
    <button
      onClick={handleUpiClick}
      title="Generate UPI payment link"
      className="h-10 w-full inline-flex items-center justify-center rounded-lg bg-blue-600 text-white font-medium shadow-sm
                 active:translate-y-[1px] active:shadow-inner transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-white/50"
    >
      UPI
    </button>

    {/* 5: Cash (CreateOrderButton) */}
    <div className="h-10 w-full [&>*]:h-full [&>*]:w-full [&>button]:rounded-lg">
      <CreateOrderButton />
    </div>
  </div>
</div>


  {/* Loader overlay */}
  {loading && (
    <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center z-[60]">
      <div className="w-12 h-12 border-4 border-white/70 border-t-transparent rounded-full animate-spin" />
      <p className="mt-3 text-white text-base">Processing UPI Payment...</p>
    </div>
  )}
</div>



      {/* Action buttons row */}
     

      {/* Loader overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center z-50">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-white text-lg">Processing UPI Payment...</p>
        </div>
      )}
    </footer>
  );
}

export default Footer;
