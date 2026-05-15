import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchLatestOrders, queueOrder } from '../features/orders/orderSlice';
import { clearCart } from '../features/cart/cartSlice';
import { fetchAllProducts } from '../features/products/productSlice';

import CashModal from './CashModal';
import PhoneModal from './PhoneModal';
import InvoiceShareModal from './InvoiceShareModal';

const PAYMENT_OPTIONS = [
  {
    key: 'Cash',
    label: 'CASH',
    header: 'CASH',
  },
  {
    key: 'QR(HDFC)',
    label: 'QR (HDFC)',
    header: 'QR Scan (HDFC Bank)',
  },
  {
    key: 'PLuxee',
    label: 'PLuxee',
    header: 'PLuxee',
  },
  {
    key: 'Swipe(CC)',
    label: 'Swipe (CC)',
    header: 'Swipe Credit Card',
  },
  {
    key: 'Swipe(DC)',
    label: 'Swipe (DC)',
    header: 'Swipe Debit Card',
  },
  {
    key: 'Swipe(FC)',
    label: 'Swipe (FC)',
    header: 'Swipe Food Card',
  },
];

function CreateOrderButton() {
  const dispatch = useDispatch();

  const cartItems = useSelector((s) => s.cart.items || []);
  const total = useSelector((s) => s.cart.total || 0);
  const token = useSelector((s) => s.posUser.userInfo?.token);
  const posUserInfo = useSelector((s) => s.posUser.userInfo);

  const [orderCreated, setOrderCreated] = useState(false);

  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [pendingPhone, setPendingPhone] = useState(null);

  const [showCashModal, setShowCashModal] = useState(false);

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [lastFullOrder, setLastFullOrder] = useState(null);

  const [selectedPayment, setSelectedPayment] = useState(
    PAYMENT_OPTIONS[0]
  );

  const [showPaymentOptions, setShowPaymentOptions] = useState(false);

  const actionBtn =
    'rounded-xl font-bold transition active:translate-y-[1px] whitespace-nowrap';


  const orangeBtn =
    "bg-[#ff8a00] text-white border border-[#FFD700] hover:bg-[#e57b00]";
 
  const desktopBtn = "w-full h-11 text-sm";

  useEffect(() => {
    if (cartItems.length === 0) setOrderCreated(false);
  }, [cartItems.length]);

  const createAndShowInvoice = useCallback((order) => {
    setLastFullOrder(order);
    setShowInvoiceModal(true);
  }, []);

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

      paymentMethod: selectedPayment.key,

      orderItems: cartItems.map((item) => ({
        name: item.item,
        quantity: item.catalogQuantity,
        units: item.units,
        brand: item.brand,
        qty: item.qty,
        image: item.image || '',
        price: item.dprice,
        product_code: item.product_code || '',
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

      alert(
        `✅ ${selectedPayment.label} order queued for ${pendingPhone} with ID ${orderId}`
      );

      const fullOrder = {
        _id: result?._id || undefined,
        id: orderId,
        orderId,

        items: cartItems,

        total: result?.total || result?.totalPrice || total,

        totalPrice:
          result?.totalPrice || result?.total || total,

        totalQty:
          result?.totalQty ||
          cartItems.reduce(
            (sum, item) => sum + Number(item.qty || 0),
            0
          ),

        totalDiscount: result?.totalDiscount || 0,

        cashGiven,

        change: cashGiven - total,

        datetime:
          result?.createdAt || new Date().toISOString(),

        phone: pendingPhone,

        paymentMethod: selectedPayment.key,
      };

      createAndShowInvoice(fullOrder);

      dispatch(fetchLatestOrders());
      dispatch(clearCart());
      dispatch(fetchAllProducts(token));

      setOrderCreated(true);
      setPendingPhone(null);
    } catch (err) {
      alert(
        '❌ Order failed: ' +
          (err?.message || 'Something went wrong')
      );
    }
  };

  return (
    <div className="relative grid">
     <button
  onClick={() =>
    setShowPaymentOptions((prev) => !prev)
  }
  className={[
    actionBtn,
    orangeBtn,
    'h-9 ',
    desktopBtn,
  ].join(' ')}
>
  Pay
</button>

  {showPaymentOptions && (
  <div
    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4"
    onClick={() => setShowPaymentOptions(false)}
  >
    <div
      className="w-full max-w-xs overflow-hidden rounded-2xl border bg-white shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-[#ff7400] px-4 py-3 text-center text-sm font-bold text-white">
        Select Payment Mode
      </div>

      {PAYMENT_OPTIONS.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => {
            setSelectedPayment(option);
            setShowPaymentOptions(false);

            setTimeout(() => {
              handleCreateOrder();
            }, 100);
          }}
          className={`flex w-full items-center justify-between border-b px-4 py-3 text-left text-sm font-semibold hover:bg-orange-50 ${
            selectedPayment.key === option.key
              ? "bg-orange-100 text-orange-700"
              : "bg-white text-gray-700"
          }`}
        >
          <span>{option.label}</span>
          {selectedPayment.key === option.key ? <span>✓</span> : null}
        </button>
      ))}
    </div>
  </div>
)}

      {showPhoneModal && (
        <PhoneModal
          title={selectedPayment.header}
          onCancel={() => setShowPhoneModal(false)}
          onConfirm={handlePhoneConfirm}
        />
      )}

      {showCashModal && pendingPhone && (
        <CashModal
          title={selectedPayment.header}
          total={total}
          paymentMethod={selectedPayment.key}
          onCancel={() => setShowCashModal(false)}
          onConfirm={handleConfirmCash}
        />
      )}

      <InvoiceShareModal
        open={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        order={lastFullOrder}
        phone={lastFullOrder?.phone || pendingPhone}
        title={`${selectedPayment.header} Invoice`}
      />
    </div>
  );
}

export default CreateOrderButton;
