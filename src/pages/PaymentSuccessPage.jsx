import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { clearCart } from '../features/cart/cartSlice';
import InvoiceShareModal from '../components/InvoiceShareModal';

const PaymentSuccessPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [params] = useSearchParams();

  const urlOrderId = params.get('orderId');
  const urlAmount = params.get('amount');

  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState(null);

  const displayAmount = useMemo(() => {
    const n = Number(urlAmount || 0);
    return Number.isFinite(n) ? n.toFixed(2) : '0.00';
  }, [urlAmount]);

  const handleOk = () => {
    try {
      const rawSnapshot = localStorage.getItem('upiInvoiceSnapshot');
      const snapshot = rawSnapshot ? JSON.parse(rawSnapshot) : null;

      dispatch(clearCart());
      localStorage.removeItem('cartItems');

      if (snapshot) {
        const finalOrderId =
          snapshot.orderId || urlOrderId || snapshot.mkOrderId || '';

        const items = Array.isArray(snapshot.items) ? snapshot.items : [];

        setInvoiceOrder({
          _id: finalOrderId,
          id: finalOrderId,
          orderId: finalOrderId,
          items,
          total: Number(snapshot.total ?? snapshot.totalPrice ?? urlAmount ?? 0),
          totalPrice: Number(
            snapshot.totalPrice ?? snapshot.total ?? urlAmount ?? 0
          ),
          totalQty:
            Number(snapshot.totalQty) ||
            items.reduce((sum, item) => sum + Number(item.qty || 0), 0),
          totalDiscount: Number(snapshot.totalDiscount || 0),
          datetime: snapshot.datetime || new Date().toISOString(),
          phone: snapshot.phone || '',
          paymentMethod: snapshot.paymentMethod || 'UPI',
          posUserName: snapshot.posUserName || '',
          posLocation: snapshot.posLocation || '',
          source: snapshot.source || 'POS',
        });
      } else {
        const fallbackOrderId = urlOrderId || '';

        setInvoiceOrder({
          _id: fallbackOrderId,
          id: fallbackOrderId,
          orderId: fallbackOrderId,
          items: [],
          total: Number(urlAmount || 0),
          totalPrice: Number(urlAmount || 0),
          totalQty: 0,
          totalDiscount: 0,
          datetime: new Date().toISOString(),
          phone: '',
          paymentMethod: 'UPI',
          source: 'POS',
        });
      }

      setShowInvoice(true);
    } catch (err) {
      console.error('Failed to prepare invoice:', err);
      alert('Failed to prepare invoice');
      navigate('/');
    }
  };

  const handleInvoiceClose = () => {
    setShowInvoice(false);
    localStorage.removeItem('upiInvoiceSnapshot');
    navigate('/');
  };

  return (
    <>
      {!showInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="text-center">
              <div className="mb-2 text-5xl">✅</div>
              <h2 className="text-xl font-bold text-green-600">
                Payment Successful
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                The payment was completed successfully
              </p>
            </div>

            <div className="mt-5 space-y-3 rounded-lg bg-green-50 p-4 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Order ID</span>
                <span className="break-all text-right font-semibold">
                  {urlOrderId || '-'}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Amount</span>
                <span className="font-semibold">₹{displayAmount}</span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Status</span>
                <span className="font-semibold text-green-600">SUCCESS</span>
              </div>
            </div>

            <button
              onClick={handleOk}
              className="mt-6 w-full rounded-lg bg-green-600 py-2 font-semibold text-white hover:bg-green-700"
            >
              OK
            </button>
          </div>
        </div>
      )}

      <InvoiceShareModal
        open={showInvoice}
        onClose={handleInvoiceClose}
        order={invoiceOrder}
        phone={invoiceOrder?.phone}
        title="Share Invoice"
      />
    </>
  );
};

export default PaymentSuccessPage;