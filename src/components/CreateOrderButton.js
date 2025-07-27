// 📁 src/components/CreateOrderButton.js
import {useState} from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { createOrder, fetchLatestOrders } from '../features/orders/orderSlice';
import { clearCart } from '../features/cart/cartSlice';
import {
  fetchCustomerByPhone,
  createCustomer
} from '../features/customers/customerSlice';
import { fetchAllProducts } from '../features/products/productSlice';
// import { useAuth } from '../context/AuthContext'; // adjust path as needed



function CreateOrderButton() {
  const now = new Date();
  const formattedDate = now.toLocaleDateString();
  const formattedTime = now.toLocaleTimeString();
  const [orderCreated, setOrderCreated] = useState(false);


  const dispatch = useDispatch();
  const cartItems = useSelector((state) => state.cart.items || []);
  const total = useSelector((state) => state.cart.total || 0);
  // const { token } = useAuth();
  const token = useSelector((state) => state.posUser.userInfo?.token);
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

    let customer = null;
    const phone = prompt('📱 Enter customer mobile number:');
    if (!phone || phone.trim().length < 10) {
      alert('⚠️ Valid phone number is required.');
      return;
    }

    try {
      // Step 1: Try fetching existing customer
      customer = await dispatch(fetchCustomerByPhone({ phone, token })).unwrap();
    } catch {
      // Step 2: Prompt and create new customer if not found
      let name = prompt('Enter customer name:')?.trim() || 'NA';
      let address = prompt('Enter customer address:')?.trim() || 'NA';
      // let email = prompt('📧 Enter customer email (optional):')?.trim() || 'NA';

      try {
        customer = await dispatch(
          createCustomer({ name, phone,  address, token })
        ).unwrap();
      } catch (err) {
        alert('❌ Failed to create customer: ' + err.message);
        return;
      }
      setOrderCreated(true);
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
  totalPrice: total,
};



    try {
      const result = await dispatch(
        createOrder({ payload: orderPayload, token, cartItems })
      ).unwrap();
      // console.log('create order result '+result)
      alert(`✅ Order Created: ID ${result._id}`);

      const fullOrder = {
        id: result._id,
        items: cartItems,
        total: result.total || total,
        totalQty: result.totalQty || cartItems.reduce((sum, i) => sum + i.quantity, 0),
        totalDiscount: result.totalDiscount || 0,
        datetime: new Date().toISOString(),
      };

      openPrintWindow(fullOrder);
      dispatch(fetchLatestOrders()); 
      dispatch(clearCart());
      dispatch(fetchAllProducts(token));
      // console.log('🧹 Cart and customer cleared after order!');
    } catch (err) {
      console.error('❌ Error creating order:', err);
      alert('Failed to create order: ' + err.message);
    }
  };

  return (
    <button
      onClick={handleCreateOrder}
      className="bg-purple-600 text-white mb-3 px-4 py-2  text-md rounded-lg w-full active:translate-y-0.5 active:shadow-inner transition-all duration-75"
    >
       Cash
    </button>
  );
}

export default CreateOrderButton;
