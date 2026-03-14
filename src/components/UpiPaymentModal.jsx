import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  clearPaymentState,
  initiateUpiPayment,
} from '../features/payment/paymentSlice';
import generateMKOrderId from '../utils/generateMKOrderId';
import { fetchCustomerByPhone } from '../features/customers/customerSlice';


const UpiPaymentModal = ({ onClose, cartItems = [], totals = {} }) => {

  const dispatch = useDispatch();

  const token = useSelector((state) => state.posUser?.userInfo?.token);
  const posUserInfo = useSelector((state) => state.posUser?.userInfo);

  const paymentLoading = useSelector((state) => state.payment?.loading);
  const paymentError = useSelector((state) => state.payment?.error);
  const paymentData = useSelector((state) => state.payment?.data);
  const paymentUrl = useSelector((state) => state.payment?.paymentUrl);

  const [phoneNumber, setPhoneNumber] = useState('');

  const amount = useMemo(
    () => Number(totals?.totalPrice || 0).toFixed(2),
    [totals]
  );

  useEffect(() => {
    if (paymentUrl) {
      window.location.href = paymentUrl;
    }
  }, [paymentUrl]);

  useEffect(() => {
    return () => {
      dispatch(clearPaymentState());
    };
  }, [dispatch]);

  const handleSubmit = async () => {

    if (cartItems.length === 0) {
      return;
    }

    if (!/^\d{10}$/.test(phoneNumber)) {
      return;
    }

    const mkOrderId = generateMKOrderId();
     const cust = await dispatch(
      fetchCustomerByPhone({
        phone: phoneNumber,
        token
      })
    ).unwrap();
    const customerId = cust?._id || null;

const payload = {
  MK_order_id: mkOrderId,
  user: customerId,
  shippingAddress: {
    street: 'Gollavelli',
    city: 'Amalapuram',
    postalCode: '533222',
    country: 'India',
  },
  paymentMethod: 'UPI',
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
  totalPrice: Number(totals?.totalPrice || 0),
  phoneNo: phoneNumber,
  posUserName: posUserInfo?.username || '',
  posLocation: posUserInfo?.location || '',
  source: 'POS',
  isPaid: false,
};

    dispatch(
      initiateUpiPayment({
        payload,
        token,
        cartItems,
        phoneNumber,
      })
    );
  };

  const localPhoneError =
    phoneNumber && !/^\d{10}$/.test(phoneNumber)
      ? 'Please enter a valid 10-digit phone number'
      : '';

  const canSubmit =
    cartItems.length > 0 && /^\d{10}$/.test(phoneNumber) && !paymentLoading;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 px-3 sm:px-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-[#ff8a00] px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-white">UPI Payment</h2>
            <p className="text-xs text-orange-50">
              Create DB order and initiate payment
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={paymentLoading}
            className="rounded-lg bg-white/15 px-2.5 py-1.5 text-sm font-medium text-white transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Total Amount</span>
              <span className="text-2xl font-extrabold text-orange-600">
                ₹{amount}
              </span>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Items: {cartItems.length}
            </div>
          </div>

          <div>
            <label
              htmlFor="upiPhone"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Customer Phone Number
            </label>

            <input
              id="upiPhone"
              type="text"
              inputMode="numeric"
              autoFocus
              maxLength={10}
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 10-digit phone number"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-800 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
            />

            {localPhoneError ? (
              <p className="mt-2 text-sm font-medium text-red-600">
                {localPhoneError}
              </p>
            ) : null}
          </div>

          {cartItems.length === 0 ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              Cart is empty.
            </div>
          ) : null}

          {paymentError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {paymentError}
            </div>
          ) : null}

          {paymentData?.message && !paymentError ? (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
              {paymentData.message}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={paymentLoading}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-xl border border-[#FFD700] bg-[#ff8a00] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#e57b00] disabled:cursor-not-allowed disabled:bg-orange-300"
          >
            {paymentLoading ? 'Processing...' : 'Pay via UPI'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpiPaymentModal;