import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchLatestOrders, queueOrder } from '../features/orders/orderSlice';
import { clearCart } from '../features/cart/cartSlice';
import { fetchAllProducts } from '../features/products/productSlice';

import CashModal from './CashModal';
import PhoneModal from './PhoneModal';
import InvoiceShareModal from './InvoiceShareModal';

function CreateOrderButton() {
  const dispatch = useDispatch();

  // Store data
  const cartItems = useSelector((s) => s.cart.items || []);
  const total = useSelector((s) => s.cart.total || 0);
  const token = useSelector((s) => s.posUser.userInfo?.token);
  const posUserInfo = useSelector((s) => s.posUser.userInfo);

  // Flow state
  const [orderCreated, setOrderCreated] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [pendingPhone, setPendingPhone] = useState(null);
  const [showCashModal, setShowCashModal] = useState(false);

  // Reusable invoice modal state
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [lastFullOrder, setLastFullOrder] = useState(null);

  const actionBtn =
    'rounded-xl font-bold transition active:translate-y-[1px] whitespace-nowrap';
  const orangeBtn =
    'bg-[#ff7400] text-white border border-[#FFD700] hover:bg-[#e66a00]';
  const desktopBtn = 'w-full h-12 text-sm md:text-base';

  useEffect(() => {
    if (cartItems.length === 0) setOrderCreated(false);
  }, [cartItems.length]);

  const createAndShowInvoice = useCallback((order) => {
    setLastFullOrder(order);
    setShowInvoiceModal(true);
  }, []);

  // Order flow
  const handleCreateOrder = () => {
    if (orderCreated) return;

    if (cartItems.length === 0) {
      alert('🛒 Cart is empty. Please add items first.');
      return;
    }

    setShowPhoneModal(true);
  };

  const handlePhoneConfirm = (digits) => {
    setShowPhoneModal(false);
    setPendingPhone(digits);
    setShowCashModal(true);
  };

  const handleConfirmCash = async (cashGiven) => {
    setShowCashModal(false);

    const orderPayload = {
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
      posUserName: posUserInfo?.username || '',
      posLocation: posUserInfo?.location || '',
    };

    try {
      const result = await dispatch(
        queueOrder({
          payload: orderPayload,
          token,
          cartItems,
          phone: pendingPhone,
        })
      ).unwrap();

      const orderId =
        result?._id ||
        result?.id ||
        result?._localId ||
        result?.orderId ||
        '';

      alert(`✅ Order queued for ${pendingPhone} with ID ${orderId}`);

      const fullOrder = {
        _id: result?._id || undefined,
        id: orderId,
        orderId,
        items: cartItems,
        total: result?.total || result?.totalPrice || total,
        totalPrice: result?.totalPrice || result?.total || total,
        totalQty:
          result?.totalQty ||
          cartItems.reduce((sum, item) => sum + Number(item.qty || 0), 0),
        totalDiscount: result?.totalDiscount || 0,
        cashGiven,
        change: cashGiven - total,
        datetime: result?.createdAt || new Date().toISOString(),
        phone: pendingPhone,
        paymentMethod: 'Cash',
      };

      createAndShowInvoice(fullOrder);

      dispatch(fetchLatestOrders());
      dispatch(clearCart());
      dispatch(fetchAllProducts(token));
      setOrderCreated(true);
      setPendingPhone(null);
    } catch (err) {
      alert('❌ Order failed: ' + (err?.message || 'Something went wrong'));
    }
  };

  return (
    <div className="grid">
      <button
        onClick={handleCreateOrder}
        className={[actionBtn, orangeBtn, 'h-9 text-xs', desktopBtn].join(' ')}
      >
        Cash
      </button>

      {showPhoneModal && (
        <PhoneModal
          onCancel={() => setShowPhoneModal(false)}
          onConfirm={handlePhoneConfirm}
        />
      )}

      {showCashModal && pendingPhone && (
        <CashModal
          total={total}
          onCancel={() => setShowCashModal(false)}
          onConfirm={handleConfirmCash}
        />
      )}

      <InvoiceShareModal
        open={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        order={lastFullOrder}
        phone={lastFullOrder?.phone || pendingPhone}
        title="Invoice Preview"
      />
    </div>
  );
}

export default CreateOrderButton;