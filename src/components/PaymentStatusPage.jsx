import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { completePosUpiPayment } from '../features/payments/paymentSlice';
import { createOrderPOS } from '../features/orders/orderSlice'; // your existing action
import { clearCartItems } from '../features/cart/cartSlice'; // your existing action

const PaymentStatusPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const verifyAndCreateOrder = async () => {
      const orderId = searchParams.get('orderId');
      const amount = searchParams.get('amount');

      const pending = JSON.parse(localStorage.getItem('pendingPosUpi') || '{}');

      if (!orderId || !pending?.cartItems?.length) {
        alert('Payment verification data missing');
        navigate('/');
        return;
      }

      const result = await dispatch(
        completePosUpiPayment({
          orderId,
          amount: amount || pending.amount,
          cartItems: pending.cartItems.map((item) => ({
            productId: item.productId,
            brandId: item.brandId,
            financialId: item.financialId,
            qty: item.qty,
          })),
        })
      );

      if (completePosUpiPayment.fulfilled.match(result) && result.payload?.success) {
        const createResult = await dispatch(
          createOrderPOS({
            orderItems: pending.cartItems,
            shippingAddress: {},
            paymentMethod: 'UPI',
            user: pending.customer?._id || pending.customer,
            orderId,
            paymentResult: result.payload.paymentResult,
          })
        );

        if (createOrderPOS.fulfilled.match(createResult)) {
          dispatch(clearCartItems());
          localStorage.removeItem('pendingPosUpi');
          alert('Payment Complete');
          navigate('/');
        } else {
          alert('Payment done, but order creation failed');
          navigate('/');
        }
      } else {
        alert('Payment Failed');
        navigate('/');
      }
    };

    verifyAndCreateOrder();
  }, [dispatch, navigate, searchParams]);

  return <div>Verifying payment...</div>;
};

export default PaymentStatusPage;