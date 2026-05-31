import { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchLatestOrders, queueOrder } from '../features/orders/orderSlice';
import { clearCart } from '../features/cart/cartSlice';
import { fetchAllProducts } from '../features/products/productSlice';

import CashModal from './CashModal';
import PhoneModal from './PhoneModal';
import InvoiceShareModal from './InvoiceShareModal';
import OrderFulfillmentModal from './OrderFulfillmentModal';
import {
  APPROVED_DISCOUNT_MESSAGE,
  calculateOrderDiscount,
  MAX_ORDER_DISCOUNT_PERCENT,
  ORDER_DISCOUNT_ROLES,
  toWholeRupees,
} from '../utils/orderDiscount';

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

function DiscountModal({ total, onCancel, onConfirm }) {
  const [discountText, setDiscountText] = useState('');
  const [error, setError] = useState('');

  const discount = calculateOrderDiscount(total, discountText);

  const handleChange = (e) => {
    const value = e.target.value.replace(/[^\d.]/g, '');
    const parts = value.split('.');
    const normalized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : value;
    const nextDiscount = calculateOrderDiscount(total, normalized);

    if (nextDiscount.clamped) {
      setDiscountText(String(MAX_ORDER_DISCOUNT_PERCENT));
      setError(APPROVED_DISCOUNT_MESSAGE);
    } else {
      setDiscountText(normalized);
      setError('');
    }
  };

  const handleConfirm = () => {
    const nextDiscount = calculateOrderDiscount(total, discountText);

    if (Number.isNaN(Number(discountText || 0)) || Number(discountText || 0) < 0) {
      setError('Enter a valid discount percentage.');
      return;
    }

    if (nextDiscount.clamped) {
      setDiscountText(String(MAX_ORDER_DISCOUNT_PERCENT));
      setError(APPROVED_DISCOUNT_MESSAGE);
      return;
    }

    onConfirm({
      discountPercentage: nextDiscount.discountPercentage,
      discountAmount: nextDiscount.discountAmount,
      totalAfterDiscount: nextDiscount.totalAfterDiscount,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4"
      onClick={onCancel}
    >
      <form
        className="w-full max-w-sm overflow-hidden rounded-2xl border bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          handleConfirm();
        }}
      >
        <div className="bg-[#ff7400] px-4 py-3 text-center text-sm font-bold text-white">
          Order Discount
        </div>

        <div className="space-y-3 p-4">
          <div className="rounded-xl border bg-gray-50 p-3 text-sm">
            <div className="flex justify-between">
              <span>Order Total</span>
              <strong>Rs. {Number(total || 0).toFixed(2)}</strong>
            </div>
            <div className="mt-1 flex justify-between text-green-700">
              <span>Discount</span>
              <strong>Rs. {discount.discountAmount.toFixed(2)}</strong>
            </div>
            <div className="mt-1 flex justify-between text-base">
              <span>Payable</span>
              <strong>Rs. {discount.totalAfterDiscount.toFixed(2)}</strong>
            </div>
          </div>

          <label className="block text-sm font-semibold text-gray-700">
            Discount Percentage
          </label>
          <input
            autoFocus
            type="text"
            inputMode="decimal"
            value={discountText}
            onChange={handleChange}
            placeholder={`0 to ${MAX_ORDER_DISCOUNT_PERCENT}`}
            className="h-11 w-full rounded-xl border border-gray-300 px-3 text-center text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
          />
          <p className="text-xs font-semibold text-gray-500">
            Max allowed: {MAX_ORDER_DISCOUNT_PERCENT}%
          </p>
          {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() =>
                onConfirm({
                  discountPercentage: 0,
                  discountAmount: 0,
                  totalAfterDiscount: toWholeRupees(total),
                })
              }
              className="flex-1 rounded-xl bg-gray-500 px-4 py-2 font-semibold text-white hover:bg-gray-600"
            >
              No Discount
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700"
            >
              Continue
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function CreateOrderButton() {
  const dispatch = useDispatch();
  const rootRef = useRef(null);

  const cartItems = useSelector((s) => s.cart.items || []);
  const total = useSelector((s) => s.cart.total || 0);
  const token = useSelector((s) => s.posUser.userInfo?.token);
  const posUserInfo = useSelector((s) => s.posUser.userInfo);

  const [orderCreated, setOrderCreated] = useState(false);

  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [pendingPhone, setPendingPhone] = useState(null);

  const [showCashModal, setShowCashModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [orderDiscount, setOrderDiscount] = useState({
    discountPercentage: 0,
    discountAmount: 0,
    totalAfterDiscount: 0,
  });
  const [showFulfillmentModal, setShowFulfillmentModal] = useState(false);
  const [fulfillmentOptions, setFulfillmentOptions] = useState(null);

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [lastFullOrder, setLastFullOrder] = useState(null);

  const [selectedPayment, setSelectedPayment] = useState(
    PAYMENT_OPTIONS[0]
  );

  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const canApplyOrderDiscount = ORDER_DISCOUNT_ROLES.includes(
    String(posUserInfo?.role || '').toUpperCase()
  );

  const actionBtn =
    'rounded-xl font-bold transition active:translate-y-[1px] whitespace-nowrap';


  const orangeBtn =
    "bg-[#ff8a00] text-white border border-[#FFD700] hover:bg-[#e57b00]";
 
  const desktopBtn = "w-full h-11 text-sm";

  useEffect(() => {
    if (cartItems.length === 0) setOrderCreated(false);
  }, [cartItems.length]);

  useEffect(() => {
    setOrderDiscount((prev) => ({
      ...prev,
      ...calculateOrderDiscount(total, prev.discountPercentage),
    }));
  }, [total]);

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

  useEffect(() => {
    const handleShortcut = () => {
      const root = rootRef.current;
      if (!root || root.getClientRects().length === 0) return;

      setShowPaymentOptions(false);
      handleCreateOrder();
    };

    window.addEventListener('mkpos:create-order', handleShortcut);
    return () => window.removeEventListener('mkpos:create-order', handleShortcut);
  }, [handleCreateOrder]);

  const handlePaymentOptionKeyDown = (e, option) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    setSelectedPayment(option);
    setShowPaymentOptions(false);

    setTimeout(() => {
      handleCreateOrder();
    }, 100);
  };

  const handlePhoneConfirm = (digits) => {
    setShowPhoneModal(false);
    setPendingPhone(digits);
    setShowFulfillmentModal(true);
  };

  const handleFulfillmentConfirm = (options) => {
    setFulfillmentOptions(options);
    setShowFulfillmentModal(false);
    setOrderDiscount({
      discountPercentage: 0,
      discountAmount: 0,
      totalAfterDiscount: toWholeRupees(total),
    });

    if (canApplyOrderDiscount) {
      setShowDiscountModal(true);
    } else {
      setShowCashModal(true);
    }
  };

  const handleDiscountConfirm = (discount) => {
    setOrderDiscount(discount);
    setShowDiscountModal(false);
    setShowCashModal(true);
  };

  const handleConfirmCash = async (cashGiven) => {
    setShowCashModal(false);

    const packingWarehouseLocation =
      fulfillmentOptions?.packingWarehouseLocation || '';
    const basePosLocation = posUserInfo?.location || '';
    const posLocation = packingWarehouseLocation
      ? [basePosLocation, packingWarehouseLocation].filter(Boolean).join('|')
      : basePosLocation;

    const discountPercentage = Number(orderDiscount.discountPercentage || 0);
    const calculatedDiscount = calculateOrderDiscount(total, discountPercentage);
    const discountAmount = calculatedDiscount.discountAmount;
    const payableTotal = calculatedDiscount.totalAfterDiscount;

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

      itemsPrice: calculatedDiscount.orderTotal,
      totalPrice: payableTotal,
      discountPercentage,
      discountAmount,
      posUserName: posUserInfo?.username || '',
      posLocation,
      ...(fulfillmentOptions || {}),
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

        total: result?.total || result?.totalPrice || payableTotal,

        totalPrice:
          result?.totalPrice || result?.total || payableTotal,

        totalQty:
          result?.totalQty ||
          cartItems.reduce(
            (sum, item) => sum + Number(item.qty || 0),
            0
          ),

        totalDiscount: Number(result?.totalDiscount || 0) + discountAmount,
        discountPercentage,
        discountAmount,

        cashGiven,

        change: cashGiven - payableTotal,

        datetime:
          result?.createdAt || new Date().toISOString(),

        phone: pendingPhone,

        paymentMethod: selectedPayment.key,
        fulfillment: fulfillmentOptions,
      };

      createAndShowInvoice(fullOrder);

      dispatch(fetchLatestOrders());
      dispatch(clearCart());
      dispatch(fetchAllProducts(token));

      setOrderCreated(true);
      setPendingPhone(null);
      setFulfillmentOptions(null);
      setOrderDiscount({
        discountPercentage: 0,
        discountAmount: 0,
        totalAfterDiscount: 0,
      });
    } catch (err) {
      alert(
        '❌ Order failed: ' +
          (err?.message || 'Something went wrong')
      );
    }
  };

  return (
    <div ref={rootRef} className="relative grid">
     <button
  onClick={() =>
    setShowPaymentOptions((prev) => !prev)
  }
  data-create-order
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
          onKeyDown={(e) => handlePaymentOptionKeyDown(e, option)}
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
          total={orderDiscount.totalAfterDiscount || total}
          paymentMethod={selectedPayment.key}
          onCancel={() => setShowCashModal(false)}
          onConfirm={handleConfirmCash}
        />
      )}

      {showDiscountModal && (
        <DiscountModal
          total={total}
          onCancel={() => {
            setShowDiscountModal(false);
            setPendingPhone(null);
          }}
          onConfirm={handleDiscountConfirm}
        />
      )}

      <OrderFulfillmentModal
        open={showFulfillmentModal}
        onCancel={() => {
          setShowFulfillmentModal(false);
          setPendingPhone(null);
        }}
        onConfirm={handleFulfillmentConfirm}
        confirmLabel="Continue"
      />

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
