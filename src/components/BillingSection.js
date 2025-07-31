import React from 'react';

import { useEffect ,useState} from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateQty, removeFromCart,clearCart } from '../features/cart/cartSlice';
import CreateOrderButton from './CreateOrderButton';
import { fetchLatestOrders } from '../features/orders/orderSlice';
import { fetchOrderItemsByOrderId } from '../features/orderItems/orderItemSlice';
// import { useAuth } from '../context/AuthContext'; // adjust path as needed
import {formatDateTime} from '../utils/dateFormatter'
import {initiateDeliveryPayment} from '../features/payment/paymentSlice'
import {createOrder} from '../features/orders/orderSlice'
import {
  fetchCustomerByPhone,
  createCustomer
} from '../features/customers/customerSlice';
// import OrdersTable from './OrdersTable';


function BillingSection() {
  const dispatch = useDispatch();
  const [showModal, setShowModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const cartItems = useSelector(state => state.cart.items || []);
  const cartTotal = useSelector(state => state.cart.total || 0);
  const cartTotalQty = useSelector(state => state.cart.totalQty || 0);
  const cartTotalDiscount = useSelector(state => state.cart.totalDiscount || 0);
  const cartTotalRaw = useSelector(state => state.cart.totalRawAmount || 0);
  const token = useSelector((state) => state.posUser.userInfo?.token);
  const recentOrders = useSelector((state) => state.orders.recent);
  const user = useSelector((state) => state.posUser.userInfo);


useEffect(() => {
  dispatch(fetchLatestOrders());
  // console.log("Initial fetch");
  // const interval = setInterval(() => {
  //   console.log("Auto-refresh triggered");
  //   dispatch(fetchLatestOrders());
  // }, 5000);
  // return () => clearInterval(interval);
}, [dispatch]);


const handleClick = (orderId) => {
  setSelectedOrderId(orderId);
  dispatch(fetchOrderItemsByOrderId({ orderId, token }));
  setShowModal(true);
};


const orderItems = useSelector((state) => state.orderItems.items || []);
const filteredOrders = recentOrders.filter((order) => {
  if (user?.role === 'CASHIER') {
    return order.source === 'CASHIER'; // POS orders only
  } else if (user?.role === 'ONLINE_CASHIER') {
    return order.source === 'ONLINE'; // Online orders only
  } else if (user?.role === 'HYBRID_CASHIER') {
    return ['CASHIER', 'ONLINE'].includes(order.source); // All orders
  } else {
    return true; // Admins or general fallback
  }
});

const handleUpiClick = async () => {
  const phone = prompt(" Enter Customer Mobile Number (10 digits):");

  if (!phone || !/^\d{10}$/.test(phone)) {
    alert("⚠️ Please enter a valid 10-digit mobile number.");
    return;
  }

  const cartData = JSON.parse(localStorage.getItem("cart") || "{}");
  const cartItems = cartData.items || [];
  const cartTotal = cartData.total || 0;

  if (!cartItems.length || !cartTotal) {
    alert("❌ Cart is empty or amount is missing.");
    return;
  }


    let customer = null;
try {

  customer = await dispatch(fetchCustomerByPhone({ phone, token })).unwrap();
} catch (error) {
  customer = null; // proceed to create user
  const name = prompt("👤 Enter Customer Name:");
      const street = prompt("Enter Street:");
      const city = prompt("Enter City:");
      const postalCode = prompt("Enter Postal Code:");

      if (!name || !street || !city || !postalCode) {
        alert("❗ Please provide all delivery details.");
        return;
      }

       const address = { street, city, postalCode };

  
       try {
        customer = await dispatch(
          createCustomer({ name, phone,  address, token })
        ).unwrap();
      } catch (err) {
        alert('❌ Failed to create customer: ' + err.message);
        return;
      }
}


    

     const orderPayload = {
    user: customer._id,
    
  shippingAddress: {
    street: customer.address || 'NA',
    city: customer.city || 'NA',
    postalCode: customer.postalCode || '000000',
    country: 'India', // optional, default if needed
  },
  paymentMethod: 'Cash',
  orderItems: cartItems.map((item) => ({
    name: item.item, // ✅ match the name expected in schema
    quantity: item.catalogQuantity, // or `item.quantity`, depending on your logic
    units: item.units,
    brand: item.brand,
    qty: item.qty ?? item.quantity, // fallback for compatibility
    image: item.image || '',
    price: item.dprice, // or item.price if that's what you're showing
    productId: item.id,          // Must be MongoDB ObjectId
    brandId: item.brandId,       // Must be MongoDB ObjectId
    financialId: item.financialId // Must be MongoDB ObjectId
  })),
  totalPrice: cartTotal,
};

    // ✅ Step 2: Create order
     const createdOrder = await dispatch(
        createOrder({ payload: orderPayload, token, cartItems })
      ).unwrap();

      dispatch(clearCart());
    // ✅ Step 3: Initiate UPI payment
    try{
       const result = await dispatch(initiateDeliveryPayment({ customerId: phone, order_id: createdOrder._id,amount: cartTotal,source: 'CASHIER',paymentMethod: 'UPI' })).unwrap();
     const redirectUrl = result?.data?.payment_links?.web;

      if (redirectUrl) {
        window.open(redirectUrl, '_blank');
      } else {
        alert('No payment link received.');
      }
    } catch (err) {
      alert('❌ Payment failed: ' + (err?.message || err));
    } 

     
 
};


  return (
    <div className="p-4 space-y-4">
      
      <div className="overflow-x-auto border rounded-lg  border-gray-200 shadow-sm">
        <h2 className="font-semibold text-center text-gray-700 text-xl" >Current Order Items</h2>
       <table className="w-full table-auto text-sm sm:text-xs">
  <thead className="bg-gray-200 text-gray-700 text-sm sm:text-xs">
    <tr>
      <th className="px-4 sm:px-4 p-2 text-left">Item</th>
      <th className="px-2">Quantity</th>
      <th className="px-2">Stock</th>
      <th className="px-2">Qty</th>
      <th className="px-2">Price</th>
      <th className="px-2">Discount</th>
      <th className="px-2">dPrice</th>
      <th className="px-2">Amount</th>
      <th className="px-2">Bin</th>
    </tr>
  </thead>
  <tbody>
    {cartItems.length === 0 ? (
      <tr className="text-center text-gray-600">
        <td className="p-2" colSpan="9">No items added yet</td>
      </tr>
    ) : (
      cartItems.map((item) => (
        <tr
          key={`${item.productId}-${item.brandId}-${item.financialId}`}
          className="text-center text-sm sm:text-xs"
        >
          <td className="p-2 font-medium text-left">
  {/* Show full name on medium and up */}
  <span className="hidden sm:inline">{item.item}</span>

  {/* Show without Telugu on small screens */}
  <span className="sm:hidden font-small text-xs ">
    {item.item.replace(/\s*\([^)]*\)/g, '').trim()}
  </span>
</td>

          <td>{item.catalogQuantity}{item.units}</td>
          <td>{item.stock}</td>
          <td>
            <input
              type="number"
              value={item.qty}
              min="1"
              max={item.stock + item.qty}
              className="w-14 border rounded px-1 text-center text-sm sm:text-xs"
              onChange={(e) =>
                dispatch(updateQty({ id: item.id, qty: parseInt(e.target.value) }))
              }
            />
          </td>
          <td>₹ {item.price}</td>
          <td>{item.discount} %</td>
          <td>₹ {item.dprice}</td>
          <td className="text-green-700 font-semibold">
            ₹ {Number(item.subtotal || 0).toFixed(2)}
          </td>
          <td>
            <button
              className="text-red-500 hover:text-red-700"
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
              🗑️
            </button>
          </td>
        </tr>
      ))
    )}
  </tbody>
</table>

      </div>

      {/* Totals */}
      <div className="bg-gray-200 p-2 rounded shadow-sm grid grid-cols-4 gap-2 items-center text-center text-sm font-medium">
        <div>
          <div className="text-gray-600">Qty</div>
          <div className="text-black text-lg">{cartTotalQty}</div>
        </div>
        <div>
          <div className="text-gray-600">TotAmt</div>
          <div className="text-black text-lg">₹ {cartTotalRaw.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-gray-600">TotDis</div>
          <div className="text-black text-lg">₹ {cartTotalDiscount.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-gray-600">PayAmt</div>
          <div className="text-black text-lg">₹ {cartTotal.toFixed(2)}</div>
        </div>
      </div>

      {/* Actions */}
      {/* <div className="flex justify-between items-center mt-2">
        <label className="flex items-center text-sm gap-2">
          <input type="checkbox" className="accent-blue-600" />
          Send SMS to Customer
        </label>
        <input placeholder="Other Charges" className="border px-2 py-1 text-sm rounded w-32" />
      </div> */}

      <div className="grid grid-cols-4 gap-2 mt-2">
   {/* <button
  onClick={() => dispatch(fetchLatestOrders())}
  className="mb-3 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-md active:translate-y-0.5 active:shadow-inner transition-all duration-75"
>
  Refresh Orders
</button> */}

<button
  className="bg-pink-600 text-white mb-3 px-4 py-2 text-md rounded-lg active:translate-y-0.5 active:shadow-inner transition-all duration-75"
>
  Hold
</button>

<button
  className="bg-blue-600 text-white mb-3 px-4 py-2 text-md rounded-lg active:translate-y-0.5 active:shadow-inner transition-all duration-75"
>
  Multi
</button>
<button
  className="bg-green-600 text-white mb-3 px-4 py-2 text-md rounded-lg active:translate-y-0.5 active:shadow-inner transition-all duration-75"
  onClick={handleUpiClick}
>
  UPI
</button>






        
       
    <CreateOrderButton/>





      </div>

    {/* Latest Orders Table */}
 
<div className="mt-6">
 

  <div className="overflow-x-auto border rounded-lg bg-white shadow-sm">

  
    <table className="w-full text-sm bg-white border shadow-sm rounded">
      
      <thead className="bg-gray-200 text-left">
        <tr>
          <th className="p-2 border-b">#</th>
          <th className="p-2 border-b">Date</th>
          <th className="p-2 border-b">Name</th>
          <th className="p-2 border-b">Amount</th>
          <th className="p-2 border-b">Phone</th>
        </tr>
      </thead>
      <tbody>
       {filteredOrders.length === 0 ? (
  <tr>
    <td colSpan="4" className="text-center py-3 text-gray-500">
      No recent orders
    </td>
  </tr>
) : (
  filteredOrders.map((order, index) => (
    <React.Fragment key={order._id}>
    <tr
  className={`cursor-pointer transition ${
    !order.isPaid && !order.isPacked && !order.isDispatched && !order.isDelivered
      ? 'bg-gray-100' // NOT PAID, NOT PROCESSED
      : order.isPaid && !order.isPacked
      ? 'bg-gray-100' // PAID but NOT PACKED
      : order.isPacked && !order.isDispatched
      ? 'bg-gray-100' // PACKED but NOT DISPATCHED
      : order.isDispatched && !order.isDelivered
      ? 'bg-gray-100' // DISPATCHED but NOT DELIVERED
      : order.isDelivered
      ? 'bg-green-100' // DELIVERED
      : 'hover:bg-blue-50' // Default
  }`}
  onClick={() => handleClick(order._id)}
>
  <td className="p-2 border-b">{index + 1}</td>
  <td className="p-2 border-b">{formatDateTime(order.createdAt)}</td>
  <td className="p-2 border-b font-medium">{order.user?.name}</td>
  <td className="p-2 border-b">₹ {order.totalPrice?.toFixed(2)}</td>
  <td className="p-2 border-b">{order.user?.phoneNo || 'NA'}</td>
</tr>


    </React.Fragment>
  ))
)}

      </tbody>
    </table>
{showModal && (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg shadow-lg w-[90%] max-w-2xl p-6 relative max-h-[85vh] flex flex-col">
      <h3 className="text-lg font-bold mb-4 text-blue-700">
        Order Details — <span className="text-sm text-gray-500">#{selectedOrderId}</span>
      </h3>

      {orderItems.length === 0 ? (
        <p className="text-gray-500">No items found.</p>
      ) : (
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm border">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="p-2 border">Brand</th>
                <th className="p-2 border">Item</th>
                <th className="p-2 border">Qty</th>
                <th className="p-2 border min-w-[70px]">Price</th>
              </tr>
            </thead>
            <tbody>
              {orderItems.map((item, index) => (
                <tr key={index}>
                  <td className="p-2 border">{item.brand}</td>
                  <td className="p-2 border">{item.name}</td>
                  <td className="p-2 border">{item.quantity}{item.units}</td>
                  <td className="p-2 border">₹ {item.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        onClick={() => setShowModal(false)}
        className="absolute top-2 right-2 text-gray-500 hover:text-red-600 text-xl"
      >
        &times;
      </button>
    </div>
  </div>
)}

   
  </div>
</div>

    </div>
    
  );
}

export default BillingSection;
