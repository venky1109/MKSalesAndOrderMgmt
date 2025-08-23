import React from 'react';

import { useRef,  useEffect ,useState, useCallback} from 'react';
import { useSelector, useDispatch } from 'react-redux';
// import { updateQty, removeFromCart,clearCart,setCart } from '../features/cart/cartSlice';
import { updateQty, removeFromCart, clearCart, setCart} from '../features/cart/cartSlice';
// import { fetchProductByBarcode } from '../features/products/productSlice';
// import CreateOrderButton from './CreateOrderButton';
import { fetchLatestOrders } from '../features/orders/orderSlice';
import { fetchAllProducts } from '../features/products/productSlice';
// import { fetchOrderItemsByOrderId } from '../features/orderItems/orderItemSlice';
// import { useAuth } from '../context/AuthContext'; // adjust path as needed
// import {formatDateTime} from '../utils/dateFormatter'
// import {initiateDeliveryPayment} from '../features/payment/paymentSlice'
// import {createOrder} from '../features/orders/orderSlice'
// import {
//   fetchCustomerByPhone,
//   createCustomer
// } from '../features/customers/customerSlice';
// import ProductList from './ProductList';
// import OrdersTable from './OrdersTable';


function BillingSection() {
  const [holds, setHolds] = useState([]);
  // const [showDetails, setShowDetails] = useState(false);

  const dispatch = useDispatch();
  // const [showModal, setShowModal] = useState(false);
  // const [selectedOrderId, setSelectedOrderId] = useState(null);
  const cartItems = useSelector(state => state.cart.items || []);
  const cartTotal = useSelector(state => state.cart.total || 0);
  const cartTotalQty = useSelector(state => state.cart.totalQty || 0);
  const cartTotalDiscount = useSelector(state => state.cart.totalDiscount || 0);
  const cartTotalRaw = useSelector(state => state.cart.totalRawAmount || 0);
  const token = useSelector((state) => state.posUser.userInfo?.token);
const [expandedKey, setExpandedKey] = useState(null);
const barcodeRef = useRef(null);


// const [barcodeInput, setBarcodeInput] = useState('');

// local products for offline match
// const productsAll = useSelector((s) => s.products?.all);
// const safeProducts = useMemo(
//   () => (Array.isArray(productsAll) ? productsAll : (productsAll?.products || [])),
//   [productsAll]
// );

useEffect(() => {
  barcodeRef.current?.focus();
}, []);

// const handleBarcode = useCallback(async (raw) => {
//   let scanned = raw;
//   if (typeof raw === 'string') {
//     try {
//       const parsed = JSON.parse(raw);
//       if (Array.isArray(parsed)) scanned = parsed[0];
//     } catch {
//       scanned = raw.replace(/\[\]"]+/g, '');
//     }
//   }

//   // try offline match first
//   const matchedProduct = safeProducts.find((p) =>
//     p.details?.some((d) =>
//       d.financials?.some((f) =>
//         (Array.isArray(f.barcode) ? f.barcode : [f.barcode || ""]).includes(scanned)
//       )
//     )
//   );

//   if (matchedProduct) {
//     const detail = matchedProduct.details.find((d) =>
//       d.financials?.some((f) =>
//         (Array.isArray(f.barcode) ? f.barcode : [f.barcode || ""]).includes(scanned)
//       )
//     );
//     const financial = detail.financials.find((f) =>
//       (Array.isArray(f.barcode) ? f.barcode : [f.barcode || ""]).includes(scanned)
//     );

//     dispatch(addToCart({
//       id: matchedProduct._id,
//       productName: matchedProduct.name,
//       category: matchedProduct.category,
//       brand: detail.brand,
//       brandId: detail._id,
//       financialId: financial._id,
//       MRP: financial.price,
//       dprice: financial.dprice,
//       quantity: financial.quantity,
//       countInStock: financial.countInStock,
//       units: financial.units,
//       image: detail.images?.[0]?.image,
//       catalogQuantity: financial.quantity,
//       discount: Math.round(((financial.price - financial.dprice) / financial.price) * 100),
//       qty: 1
//     }));
//   } else {
//     // fallback to API
//     try {
//       const result = await dispatch(fetchProductByBarcode({ barcode: scanned, token })).unwrap();
//       if (result) {
//         dispatch(addToCart(result));
//       } else {
//         alert('❌ Product not found');
//       }
//     } catch (err) {
//       alert('❌ Error: ' + err.message);
//     }
//   }

//   setTimeout(() => barcodeRef.current?.focus(), 100);
// }, [dispatch, token, safeProducts]);
const toggleExpand = useCallback(
  (key) => setExpandedKey(prev => (prev === key ? null : key)),
  []
);

  // const recentOrders = useSelector((state) => state.orders.recent);
  // const user = useSelector((state) => state.posUser.userInfo);
  // const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) dispatch(fetchAllProducts(token));
  }, [dispatch, token]);

useEffect(() => {
  dispatch(fetchLatestOrders());
  // after storing posUser.userInfo


  // console.log("Initial fetch");
  // const interval = setInterval(() => {
  //   console.log("Auto-refresh triggered");
  //   dispatch(fetchLatestOrders());
  // }, 5000);
  // return () => clearInterval(interval);
}, [dispatch]);

useEffect(() => {
  const existing = Object.keys(localStorage)
    .filter((key) => key.startsWith('hold'))
    .map((key) => {
      const number = key.replace('hold', '');
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
    localStorage.setItem('cart', JSON.stringify(payload));
  }, [cartItems, cartTotal, cartTotalQty, cartTotalDiscount, cartTotalRaw]);




// const handleHold = () => {
//   if (cartItems.length === 0) {
//     alert('❌ Cart is empty!');
//     return;
//   }

//   const phone = prompt('📱 Enter customer phone number (10 digits):');
//   if (!phone || !/^\d{10}$/.test(phone)) {
//     alert('⚠️ Please enter a valid 10-digit phone number.');
//     return;
//   }

//   const holdKey = `hold${phone}`;
//   const newHold = { key: holdKey, label: `Hold ${phone}` };

//   // ✅ Save or overwrite the hold in localStorage
//   localStorage.setItem(holdKey, JSON.stringify({
//     items: cartItems,
//     total: cartTotal
//   }));

//   // ✅ Update UI state: overwrite if exists, else add
//   setHolds((prev) => {
//     const existing = prev.filter((h) => h.key !== holdKey);
//     return [...existing, newHold];
//   });

//   dispatch(clearCart());
// };



const handleDeleteHold = (holdKey) => {
  if (window.confirm(`🗑️ Delete ${holdKey.replace('hold', 'Hold ')}?`)) {
    localStorage.removeItem(holdKey);
    setHolds((prev) => prev.filter((h) => h.key !== holdKey));
    dispatch(clearCart());
  }
};





const handleRestoreHold = (holdKey) => {
  const heldData = JSON.parse(localStorage.getItem(holdKey) || '{}');
  if (!heldData?.items?.length) {
    alert('❌ No items in this hold.');
    return;
  }

  dispatch(setCart(heldData));
    // ✅ Persist to localStorage cart
  localStorage.setItem('cart', JSON.stringify(heldData));
};


// const handleUpiClick = async () => {
//   const phone = prompt("📱 Enter Customer Mobile Number (10 digits):");
  

//   if (!phone || !/^\d{10}$/.test(phone)) {
//     alert("⚠️ Please enter a valid 10-digit mobile number.");
//     return;
//   }

//   setLoading(true); // ⏳ Start loader

//   const cartData = JSON.parse(localStorage.getItem("cart") || "{}");
//   const cartItems = cartData.items || [];
//   const cartTotal = cartData.total || 0;

  

//   let customer = null;
//   try {
//     customer = await dispatch(fetchCustomerByPhone({ phone, token })).unwrap();
//   } catch (error) {
//     customer = null; // proceed to create user

//     const name = prompt("👤 Enter Customer Name:");
//     const street = prompt(" Enter Street:");
//     const city = prompt(" Enter City:");
//     const postalCode = prompt(" Enter Postal Code:");

//     if (!name || !street || !city || !postalCode) {
//       alert("❗ Please provide all delivery details.");
//       setLoading(false);
//       return;
//     }

//     const address = { street, city, postalCode };

//     try {
//       customer = await dispatch(createCustomer({ name, phone, address, token })).unwrap();
//     } catch (err) {
//       alert('❌ Failed to create customer: ' + err.message);
//       setLoading(false);
//       return;
//     }
//   }

//   const orderPayload = {
//     user: customer._id,
//     shippingAddress: {
//       street: customer.address || 'NA',
//       city: customer.city || 'NA',
//       postalCode: customer.postalCode || '000000',
//       country: 'India',
//     },
//     paymentMethod: 'Cash',
//     orderItems: cartItems.map((item) => ({
//       name: item.item,
//       quantity: item.catalogQuantity,
//       units: item.units,
//       brand: item.brand,
//       qty: item.qty ?? item.quantity,
//       image: item.image || '',
//       price: item.dprice,
//       productId: item.id,
//       brandId: item.brandId,
//       financialId: item.financialId
//     })),
//     totalPrice: cartTotal,
//   };

//   try {
//     const createdOrder = await dispatch(
//       createOrder({ payload: orderPayload, token, cartItems })
//     ).unwrap();

//     dispatch(clearCart());

//     const result = await dispatch(
//       initiateDeliveryPayment({
//         customerId: phone,
//         order_id: createdOrder._id,
//         amount: cartTotal,
//         source: 'CASHIER',
//         paymentMethod: 'UPI',
//       })
//     ).unwrap();

//     const redirectUrl = result?.data?.payment_links?.web;
//     if (redirectUrl) {
//       window.open(redirectUrl, '_blank');
//     } else {
//       alert('No payment link received.');
//     }
//   } catch (err) {
//     alert('❌ Payment failed: ' + (err?.message || err));
//   }

//   setLoading(false); // ✅ Stop loader
// };



  return (
    <div className=" space-y-2 mt-1 bg-white">
 
     <div className="border rounded-lg border-gray-200 shadow-sm flex flex-col h-[68vh] ">
  <h2 className="font-semibold text-center text-gray-700 text-xl p-1">
    Current Order Items
  </h2>

  {/* Scrollable table area */}
  <div className="min-h-0 overflow-x-auto overflow-y-auto flex-1" >
  <table className="w-full table-auto text-sm sm:text-xs">
    <thead className="bg-gray-200 text-gray-700 text-sm sm:text-xs sticky top-0 z-10">
      <tr>
        {/* 👉 Only these 5 columns */}
        <th className="sm:px-4 px-2 text-left">ItemName</th>
        <th className="px-2">Quantity</th>
        <th className="px-2">Qty</th>
        <th className="px-2">dPrice</th>
        <th className="px-2">Amount</th>
      </tr>
    </thead>

   <tbody>
  {cartItems.length === 0 ? (
    <tr className="text-center text-gray-600">
      <td className="p-2" colSpan={5}>No items added yet</td>
    </tr>
  ) : (
    cartItems.map((item) => {
      const rowKey = `${item.productId ?? item.id}-${item.brandId}-${item.financialId}`;
      const amount = Number(item.subtotal || 0);

      return (
        <React.Fragment key={rowKey}>
          {/* Compact row */}
          <tr
            className="text-center text-sm sm:text-xs hover:bg-blue-50 cursor-pointer"
            onDoubleClick={() => toggleExpand(rowKey)}            // desktop dbl-click
            onClick={(e) => { if (e.detail === 2) toggleExpand(rowKey); }} // dbl-click fallback
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleExpand(rowKey); }}
            tabIndex={0}
            data-rowkey={rowKey}
            title="Double-click (or tap chevron) to see details"
          >
            {/* Item name + chevron (works on mobile) */}
            <td className="px-2 text-xs text-left">
              <div className="flex items-center justify-between gap-2">
                <span className="hidden sm:inline">{item.item}</span>
                <span className="sm:hidden text-xs">
                  {item.item.replace(/\s*\([^)]*\)/g, '').trim()}
                </span>
                <button
                  type="button"
                  className="ml-2 text-gray-500 hover:text-gray-700 px-2 py-0.5 border rounded text-[11px]"
                  onClick={(e) => { e.stopPropagation(); toggleExpand(rowKey); }}
                  aria-expanded={expandedKey === rowKey}
                  aria-label="Toggle details"
                >
                  {expandedKey === rowKey ? '▴' : '▾'}
                </button>
              </div>
            </td>

            {/* Quantity (catalog pack) */}
            <td>{item.catalogQuantity}{item.units}</td>

            {/* Order Qty (editable) */}
            <td>
              <input
                type="number"
                value={item.qty}
                min="1"
                max={(item.stock ?? 0) + (item.qty ?? 0)}
                className="w-14 border rounded px-1 text-center text-xs"
                onChange={(e) =>
                  dispatch(updateQty({ id: item.id, qty: parseInt(e.target.value || '0', 10) }))
                }
              />
            </td>

            {/* dPrice */}
            <td>₹ {item.dprice}</td>

            {/* Amount */}
            <td className="text-green-700 font-semibold">₹ {amount.toFixed(2)}</td>
          </tr>

          {/* Expanded drawer */}
          {expandedKey === rowKey && (
            <tr className="bg-white">
              <td colSpan={5} className="p-2 border-t">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 bg-gray-50 rounded">
                    <div className="text-gray-500">Stock</div>
                    <div className="font-semibold">{item.stock}</div>
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <div className="text-gray-500">Price (MRP)</div>
                    <div className="font-semibold">₹ {item.price}</div>
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <div className="text-gray-500">Discount</div>
                    <div className="font-semibold">{item.discount} %</div>
                  </div>
                  {/* <div className="p-2 bg-gray-50 rounded">
                    <div className="text-gray-500">IDs</div>
                    <div className="font-mono break-all">
                      <div>Prod: {item.productId ?? item.id}</div>
                      <div>Brand: {item.brandId}</div>
                      <div>Fin: {item.financialId}</div>
                    </div>
                  </div> */}
                  <div className="p-2 flex items-center">
                    <button
                      className="text-red-600 hover:text-red-700 px-3 py-1 border rounded"
                      onClick={() =>
                        dispatch(removeFromCart({
                          productId: item.productId,
                          brandId: item.brandId,
                          financialId: item.financialId,
                        }))
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


  {/* Sticky footer totals */}
  {/* <div className="sticky bottom-0 bg-white border-t px-3 py-2">
    <div className="grid grid-cols-5 gap-2 text-center text-sm font-medium">
      <div>
        <div className="text-gray-900">Items</div>
        <div className="text-green-900">{cartItems.length}</div>
      </div>
      <div>
        <div className="text-gray-900">Qty</div>
        <div className="text-green-900">{cartTotalQty}</div>
      </div>
      <div>
        <div className="text-gray-900">TotAmt</div>
        <div className="text-green-900">₹ {cartTotalRaw}</div>
      </div>
      <div>
        <div className="text-gray-900">TotDis</div>
        <div className="text-green-900">₹ {cartTotalDiscount}</div>
      </div>
      <div>
        <div className="text-gray-900">PayAmt</div>
        <div className="text-green-900 text-lg bg-yellow-300 rounded-md">₹ {cartTotal}</div>
      </div>
    </div>
  </div> */}
</div>

      {/* <div className="grid grid-cols-4 gap-2 ">

<button
  onClick={handleHold}
  className="bg-yellow-600 text-white mb-3 px-4 py-1 text-md rounded-lg active:translate-y-0.5 active:shadow-inner transition-all duration-75"
>
  Hold
</button>

<button
  className="bg-orange-600 text-white mb-3 px-4 py-1 text-md rounded-lg active:translate-y-0.5 active:shadow-inner transition-all duration-75"
>
  Multi
</button>
<button
  className="bg-blue-600 text-white mb-3 px-4 py-1 text-md rounded-lg active:translate-y-0.5 active:shadow-inner transition-all duration-75"
  onClick={handleUpiClick}
>
  UPI
</button>

{loading && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center z-50">
    <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
    <p className="mt-4 text-white text-lg">Processing UPI Payment...</p>
  </div>
)}





        
       
    <CreateOrderButton/>

     


      </div> */}

{/* <div className="mb-2">
  <input
    type="text"
    ref={barcodeRef}
    value={barcodeInput}
    onChange={(e) => setBarcodeInput(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === 'Enter' && barcodeInput.trim()) {
        handleBarcode(barcodeInput.trim());
        setBarcodeInput('');
      }
    }}
    placeholder="📷 Scan barcode to add"
    className="border p-2 w-full text-base text-center rounded"
  />
</div> */}

    {/* Latest Orders Table */}

<div className="flex flex-wrap gap-2 border rounded-lg border-gray-200 shadow-sm ">
  {holds.map((hold) => (
    <button
      key={hold.key}
      onClick={() => handleRestoreHold(hold.key)}
      onDoubleClick={() => handleDeleteHold(hold.key)}
      className="bg-gray-500 text-white px-3  rounded-md text-sm hover:bg-gray-600 transition"
      title="Double-click to delete"
    >
      {hold.label}
    </button>
  ))}
</div>


    </div>
    
  );
}

export default BillingSection;
