import React from 'react';
import { useSearchParams } from 'react-router-dom';

const PaymentFailurePage = () => {
  const [params] = useSearchParams();
  const orderId = params.get('orderId');
  const reason = params.get('reason');
  const status = params.get('status');

  return (
    <div className="min-h-screen bg-red-50 px-4 py-10">
      <div className="mx-auto max-w-lg rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
        <div className="mb-4 text-4xl">❌</div>
        <h1 className="text-2xl font-bold text-red-700">Payment Failed</h1>
        <p className="mt-2 text-sm text-gray-600">
          The UPI payment was not completed.
        </p>

        <div className="mt-5 space-y-3 rounded-xl bg-red-50 p-4">
          <div>
            <p className="text-sm text-gray-600">Order ID</p>
            <p className="break-all text-sm font-semibold text-gray-900">
              {orderId || '-'}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Status</p>
            <p className="text-sm font-semibold text-gray-900">
              {status || 'failure'}
            </p>
          </div>

          {reason ? (
            <div>
              <p className="text-sm text-gray-600">Reason</p>
              <p className="text-sm font-semibold text-gray-900">{reason}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default PaymentFailurePage;