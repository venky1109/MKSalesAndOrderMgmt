import React from 'react';
import { useSearchParams } from 'react-router-dom';

const PaymentSuccessPage = () => {
  const [params] = useSearchParams();
  const orderId = params.get('orderId');

  return (
    <div className="min-h-screen bg-green-50 px-4 py-10">
      <div className="mx-auto max-w-lg rounded-2xl border border-green-200 bg-white p-6 shadow-sm">
        <div className="mb-4 text-4xl">✅</div>
        <h1 className="text-2xl font-bold text-green-700">Payment Successful</h1>
        <p className="mt-2 text-sm text-gray-600">
          Your UPI payment was completed successfully.
        </p>

        <div className="mt-5 rounded-xl bg-green-50 p-4">
          <p className="text-sm text-gray-600">Order ID</p>
          <p className="break-all text-sm font-semibold text-gray-900">
            {orderId || '-'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;