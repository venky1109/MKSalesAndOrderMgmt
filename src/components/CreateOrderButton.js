// 📁 src/components/CreateOrderButton.js
import {useState, useEffect} from 'react'
import { useDispatch, useSelector } from 'react-redux';
import {  fetchLatestOrders, queueOrder } from '../features/orders/orderSlice';
import { clearCart } from '../features/cart/cartSlice';
// import {
//   fetchCustomerByPhone,
//   createCustomer
// } from '../features/customers/customerSlice';
import { fetchAllProducts } from '../features/products/productSlice';
// import { useAuth } from '../context/AuthContext'; // adjust path as needed
import CashModal from './CashModal';


function CreateOrderButton() {
  const now = new Date();
  const formattedDate = now.toLocaleDateString();
  const formattedTime = now.toLocaleTimeString();
  const [orderCreated, setOrderCreated] = useState(false);
const [pendingPhone, setPendingPhone] = useState('');

  const [showCashModal, setShowCashModal] = useState(false);
  // const [pendingCustomer, setPendingCustomer] = useState(null);

  const dispatch = useDispatch();
  const cartItems = useSelector((state) => state.cart.items || []);
  const total = useSelector((state) => state.cart.total || 0);
  // const { token } = useAuth();
  const token = useSelector((state) => state.posUser.userInfo?.token);
  useEffect(() => {
  if (cartItems.length === 0) {
    setOrderCreated(false);
  }
}, [cartItems.length]);
  const openPrintWindow = (order) => {
    const printWindow = window.open('', '_blank', 'width=393,height=600');

    const itemsHTML = order.items.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${item.item}</td>
        <td>${item.catalogQuantity || ''}</td>
        <td>${(item.price ?? 0).toFixed(2)}</td>
        <td>${item.quantity}</td>
        <td>${item.discount}%</td>
        <td>${parseFloat(
          item.subtotal ??
          ((item.price ?? 0) * (item.quantity ?? 0)) *
          (1 - (item.discount ?? 0) / 100)
        ).toFixed(2)}</td>
      </tr>
    `).join('');

    const html = `
<html>
  <head>
    <title>Invoice</title>
    <style>
      body {
        font-family: monospace;
        padding: 10px;
        font-size: 12px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10px;
      }
      table, th, td {
        border: 1px solid black;
        padding: 4px;
        text-align: center;
      }
      .text-right { text-align: right; padding-right: 6px; }
      .font-bold { font-weight: bold; }
      .center { text-align: center; }
    </style>
  </head>
  <body>
    <div class="center" style="margin-bottom: 12px;">
      <h2 class="text-base font-bold">${process.env.REACT_APP_SHOP_NAME}</h2>
      <p>
        ${process.env.REACT_APP_SHOP_ADDRESS_LINE1}<br />
        ${process.env.REACT_APP_SHOP_ADDRESS_LINE2}<br />
        ${process.env.REACT_APP_SHOP_GST}<br />
        ${process.env.REACT_APP_SHOP_VAT}<br />
        ${process.env.REACT_APP_SHOP_PHONE}
      </p>
      <p class="font-bold">Invoice #: ${order.order_number || order.id}</p>
      <p>Name: Walk-in customer</p>
      <p>Seller: ${process.env.REACT_APP_INVOICE_SELLER}</p>
      <p>Date: ${formattedDate} &nbsp;&nbsp; Time: ${formattedTime}</p>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Description</th>
          <th>Quantity</th>
          <th>Price</th>
          <th>Qty</th>
          <th>Discount</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHTML}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="6" class="text-right">Total Qty:</td>
          <td>${(order.totalQty ?? 0).toFixed(2)}</td>
        </tr>
        <tr>
          <td colspan="6" class="text-right">Total Discount:</td>
          <td>₹ ${(order.totalDiscount ?? 0).toFixed(2)}</td>
        </tr>
        <tr>
          <td colspan="6" class="text-right font-bold">Total:</td>
          <td class="font-bold">₹ ${(order.total ?? 0).toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>

    <p class="center" style="margin-top: 16px;">Thank you for shopping!</p>

    <script>
      window.onload = function() {
        window.print();
        setTimeout(() => window.close(), 500);
      };
    </script>
  </body>
</html>
`;

    printWindow.document.write(html);
    printWindow.document.close();
  };






  
  const handleCreateOrder = async () => {
  if (orderCreated) return;

  if (cartItems.length === 0) {
    alert('🛒 Cart is empty. Please add items first.');
    return;
  }

  // let customer = null;
  const phone = prompt('📱 Enter customer mobile number:');
  if (!phone || phone.trim().length < 10) {
    alert('⚠️ Valid phone number is required.');
    return;
  }

  // try {
  //   customer = await dispatch(fetchCustomerByPhone({ phone, token })).unwrap();
  // } catch {
  //   let name = 'NA';
  //   let address = 'NA';
  //   try {
  //     customer = await dispatch(
  //       createCustomer({ name, phone, address, token })
  //     ).unwrap();
  //   } catch (err) {
  //     alert('❌ Failed to create customer: ' + err.message);
  //     return;
  //   }
  // }

  // ✅ Only show modal — don't create order here
  // setPendingCustomer(customer);
   setPendingPhone(phone); 
  setShowCashModal(true);
};


const handleConfirmCash = async (cashGiven) => {
  setShowCashModal(false);

  const orderPayload = {
    // user: pendingPhone,
    
    shippingAddress: {
      street: 'Gollavelli',
      city: 'Amalapuram',
      postalCode: '533222',
      country: 'India',
    },
    paymentMethod: 'Cash',
    orderItems: cartItems.map((item) => ({
      name: item.item,
      quantity: item.catalogQuantity,
      units: item.units,
      brand: item.brand,
      qty: item.qty,
      image: item.image || '',
      price: item.dprice,
      productId: item.id,
      brandId: item.brandId,
      financialId: item.financialId,
    })),
    totalPrice: total,
  };

  try {
    // console.log("phone"+pendingPhone)
    const result = await dispatch(
       queueOrder({ payload: orderPayload, token, cartItems, phone: pendingPhone })
    ).unwrap();

    alert(`✅ Order queued for ${pendingPhone} with ID ${result._localId}`);

    const fullOrder = {
      id: result,
      items: cartItems,
      total: result.total || total,
      totalQty: result.totalQty || cartItems.reduce((sum, i) => sum + i.qty, 0),
      totalDiscount: result.totalDiscount || 0,
      cashGiven,
      change: cashGiven - total,
      datetime: new Date().toISOString(),
    };

    openPrintWindow(fullOrder);
    dispatch(fetchLatestOrders());
    dispatch(clearCart());
    dispatch(fetchAllProducts(token));
    setOrderCreated(true);
    setPendingPhone(null)
  } catch (err) {
    alert('❌ Order failed: ' + err.message);
  }
};


  

  return (
    <div className="grid">
    <button
      onClick={handleCreateOrder}
      className="h-10 p-3 inline-flex items-center justify-center rounded-lg bg-green-600 text-white font-medium shadow-sm
                   active:translate-y-[1px] active:shadow-inner transition-all hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-white/50"
    >
       Cash
    </button>

    {showCashModal  && pendingPhone && (
  <CashModal
    total={total}
    onCancel={() => {
      setShowCashModal(false);
      // setPendingCustomer(null);
      // setPendingPhone(null)
    }}
    onConfirm={handleConfirmCash}
  />
)}
    </div>


  );
}

export default CreateOrderButton;
