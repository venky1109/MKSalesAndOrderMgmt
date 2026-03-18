import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clearPaymentState, retryExistingUpiPayment } from '../features/payment/paymentSlice';

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
    navigate('/');
  };

  const handleRetry = async () => {
    if (!orderId) {
      alert('Order ID not found');
      return;
    }

    try {
      const result = await dispatch(
        retryExistingUpiPayment({ orderId, token })
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="text-center">
          <div className="mb-2 text-5xl">❌</div>
          <h2 className="text-xl font-bold text-red-600">Payment Failed</h2>
          <p className="mt-1 text-sm text-gray-500">
            The payment could not be completed
          </p>
        </div>

        <div className="mt-5 space-y-3 rounded-lg bg-red-50 p-4 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Order ID</span>
            <span className="break-all text-right font-semibold">
              {orderId || '-'}
            </span>
          </div>

          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Status</span>
            <span className="font-semibold text-red-600">{status}</span>
          </div>

          {reason ? (
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Reason</span>
              <span className="text-right font-semibold">{reason}</span>
            </div>
          ) : null}
        </div>

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
      </div>
    </div>
  );
};

export default PaymentFailurePage;