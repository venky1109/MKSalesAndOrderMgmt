import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  clearPaymentState,
  retryExistingUpiPayment,
} from '../features/payment/paymentSlice';
import PaymentResultCard from '../components/PaymentResultCard';

const PaymentFailurePage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [params] = useSearchParams();

  const token = useSelector((state) => state.posUser?.userInfo?.token);
  const paymentLoading = useSelector((state) => state.payment?.loading);

  const orderId = params.get('orderId');
  const status = params.get('status') || 'FAILED';
  const reason = params.get('reason');

  const handleHome = () => {
    dispatch(clearPaymentState());
    navigate('/pos', { replace: true });
  };

  const handleRetry = async () => {
    if (!orderId) {
      alert('Order ID not found');
      return;
    }

    try {
      const savedToken =
        token ||
        JSON.parse(localStorage.getItem('posUserInfo') || '{}')?.token ||
        '';

      const result = await dispatch(
        retryExistingUpiPayment({ orderId, token: savedToken })
      ).unwrap();

      const redirectUrl =
        result?.redirect_url ||
        result?.paymentUrl ||
        result?.webUrl ||
        result?.data?.payment_links?.web;

      if (!redirectUrl) {
        throw new Error('Payment URL not received');
      }

      window.location.href = redirectUrl;
    } catch (err) {
      alert(err?.message || 'Retry payment failed');
    }
  };

  const rows = [
    { label: 'Order ID', value: orderId || '-', alignRight: true },
    { label: 'Status', value: status, valueClassName: 'text-red-600' },
  ];

  if (reason) {
    rows.push({ label: 'Reason', value: reason, alignRight: true });
  }

  return (
    <PaymentResultCard
      accent="red"
      icon="X"
      title="Payment Failed"
      description="The payment could not be completed"
      rows={rows}
    >
      <div className="mt-6 flex gap-3">
        <button
          onClick={handleHome}
          disabled={paymentLoading}
          className="w-full rounded-lg border border-gray-300 bg-white py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-70"
        >
          Home
        </button>

        <button
          onClick={handleRetry}
          disabled={!orderId || paymentLoading}
          className="w-full rounded-lg bg-red-600 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-70"
        >
          {paymentLoading ? 'Retrying...' : 'Retry Payment'}
        </button>
      </div>
    </PaymentResultCard>
  );
};

export default PaymentFailurePage;
