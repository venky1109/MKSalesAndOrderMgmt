import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clearCart } from '../features/cart/cartSlice';
import { updateProductStockOnly } from '../features/products/productSlice';
import InvoiceShareModal from '../components/InvoiceShareModal';
import PaymentResultCard from '../components/PaymentResultCard';
import { API_BASE_URL } from '../utils/apiConfig';

const PaymentSuccessPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [params] = useSearchParams();
  const token = useSelector((state) => state.posUser?.userInfo?.token);

  const urlOrderId = params.get('orderId');
  const urlAmount = params.get('amount');

  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState(null);

  const displayAmount = useMemo(() => {
    const n = Number(urlAmount || 0);
    return Number.isFinite(n) ? n.toFixed(2) : '0.00';
  }, [urlAmount]);

  const updateStockAfterSuccess = async (snapshot) => {
    const items = Array.isArray(snapshot?.items) ? snapshot.items : [];
    const orderId = snapshot?.orderId || urlOrderId || snapshot?.mkOrderId || '';
    const stockUpdateKey = orderId ? `upiStockUpdated:${orderId}` : '';

    if (!token || !stockUpdateKey || localStorage.getItem(stockUpdateKey)) {
      return;
    }

    const updates = items
      .filter((item) => item.productId && item.brandId && item.financialId)
      .map((item) => {
        const newQuantity = Number(item.stock);

        if (!Number.isFinite(newQuantity) || newQuantity < 0) {
          return null;
        }

        return dispatch(
          updateProductStockOnly({
            productID: item.productId,
            brandID: item.brandId,
            financialID: item.financialId,
            newQuantity,
            token,
          })
        ).unwrap();
      })
      .filter(Boolean);

    if (!updates.length) {
      return;
    }

    const results = await Promise.allSettled(updates);
    if (results.every((result) => result.status === 'fulfilled')) {
      localStorage.setItem(stockUpdateKey, '1');
    }
  };

  const fetchOrderInvoiceFallback = async () => {
    if (!urlOrderId || !token) return null;

    const response = await fetch(
      `${API_BASE_URL}/orders/pos/orders/details/${urlOrderId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const data = await response.json().catch(() => ({}));

    if (!response.ok) return null;

    return {
      _id: data._id || urlOrderId,
      id: data._id || urlOrderId,
      orderId: data.MK_order_id || data.orderId || data._id || urlOrderId,
      items: data.items || data.orderItems || [],
      total: Number(data.totalPrice ?? urlAmount ?? 0),
      totalPrice: Number(data.totalPrice ?? urlAmount ?? 0),
      totalQty: (data.items || []).reduce(
        (sum, item) => sum + Number(item.qty || 0),
        0
      ),
      totalDiscount: Number(data.discountAmount || 0),
      datetime: data.createdAt || new Date().toISOString(),
      phone: data.phoneNo || '',
      paymentMethod: data.paymentMethod || 'UPI',
      paymentBreakdown: Array.isArray(data.paymentBreakdown)
        ? data.paymentBreakdown
        : [],
      posUserName: data.posUserName || '',
      posLocation: data.posLocation || '',
      source: data.source || 'POS',
    };
  };

  const handleOk = async () => {
    try {
      const rawSnapshot = localStorage.getItem('upiInvoiceSnapshot');
      const snapshot = rawSnapshot ? JSON.parse(rawSnapshot) : null;

      if (snapshot) {
        await updateStockAfterSuccess(snapshot);
      }

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
          paymentBreakdown: Array.isArray(snapshot.paymentBreakdown)
            ? snapshot.paymentBreakdown
            : [],
          posUserName: snapshot.posUserName || '',
          posLocation: snapshot.posLocation || '',
          source: snapshot.source || 'POS',
        });
      } else {
        const fallbackInvoice = await fetchOrderInvoiceFallback();

        if (fallbackInvoice) {
          setInvoiceOrder(fallbackInvoice);
          setShowInvoice(true);
          return;
        }

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
      navigate('/pos', { replace: true });
    }
  };

  const handleInvoiceClose = () => {
    setShowInvoice(false);
    localStorage.removeItem('upiInvoiceSnapshot');
    navigate('/pos', { replace: true });
  };

  return (
    <>
      {!showInvoice && (
        <PaymentResultCard
          accent="green"
          icon="OK"
          title="Order Created"
          description="Order created with payment details."
          rows={[
            { label: 'Order ID', value: urlOrderId || '-', alignRight: true },
            { label: 'Amount', value: `Rs ${displayAmount}` },
            {
              label: 'Status',
              value: 'SUCCESS',
              valueClassName: 'text-green-600',
            },
          ]}
        >
          <button
            onClick={handleOk}
            className="mt-6 w-full rounded-lg bg-green-600 py-2 font-semibold text-white hover:bg-green-700"
          >
            OK
          </button>
        </PaymentResultCard>
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
