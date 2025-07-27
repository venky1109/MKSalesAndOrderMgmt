import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { FaMapMarkerAlt } from 'react-icons/fa';
import { initiateDeliveryPayment } from '../features/payment/paymentSlice';
import { markOrderAsDelivered,markOrderAsPaid } from '../features/orders/orderSlice';

const DeliverOrdersCards = ({ orders = [], refetch }) => {
  const dispatch = useDispatch();
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [loadingOrderId, setLoadingOrderId] = useState(null);
  const [cashModeOrderId, setCashModeOrderId] = useState(null);

  const toggleOrderItems = (orderId) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
  };

  const openInGoogleMaps = (shippingAddress) => {
    if (!shippingAddress) return;
    const coords = shippingAddress.location?.coordinates;
    if (Array.isArray(coords) && coords.length === 2) {
      const [lng, lat] = coords;
      window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    } else {
      const { street = '', city = '', postalCode = '' } = shippingAddress;
      const query = encodeURIComponent(`${street}, ${city}, ${postalCode}`);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    }
  };

  const handlePayment = async (order) => {
    const { _id: order_id, user, totalPrice: amount } = order;
    const customerId = user?.phoneNo;

    if (!customerId || !order_id || !amount) {
      alert('Missing customer ID, order ID, or amount');
      return;
    }

    try {
      setLoadingOrderId(order_id);
      const result = await dispatch(initiateDeliveryPayment({ customerId, order_id, amount })).unwrap();
      const redirectUrl = result?.data?.payment_links?.web;

      if (redirectUrl) {
        window.open(redirectUrl, '_blank');
      } else {
        alert('No payment link received.');
      }
    } catch (err) {
      alert('❌ Payment failed: ' + (err?.message || err));
    } finally {
      setLoadingOrderId(null);
    }
  };

  const handleCashPaymentConfirm = async (orderId) => {
    try {
      setLoadingOrderId(orderId);
    //   await dispatch(markOrderAsDelivered(orderId)).unwrap();
    //   alert('✅ Order marked as paid');
    //   if (refetch) refetch();
        await dispatch(markOrderAsPaid(orderId)).unwrap(); // ✅ update isPaid flag
    alert('✅ Payment marked as completed');

    if (refetch) refetch(); // ✅ refresh the list
    } catch (err) {
      alert('❌ Failed to update payment status');
    } finally {
      setLoadingOrderId(null);
      setCashModeOrderId(null);
    }
  };

  const handleMarkDelivered = async (orderId) => {
    const confirmed = window.confirm("✅ Mark this order as Delivered?");
    if (!confirmed) return;

    try {
      setLoadingOrderId(orderId);
      await dispatch(markOrderAsDelivered(orderId)).unwrap();
      alert("✅ Order marked as delivered!");
      if (refetch) refetch();
    } catch (err) {
      alert(`❌ Failed to update delivery status: ${err}`);
    } finally {
      setLoadingOrderId(null);
    }
  };

  return (
    <div className="grid gap-6 p-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {orders.length === 0 ? (
        <p className="text-gray-500 col-span-full text-center">No delivery orders found.</p>
      ) : (
        orders.map((order) => {
          const address = order.shippingAddress;
          const isPaid = order.isPaid;
          const isDelivered = order.isDelivered;

          return (
            <div key={order._id} className="border shadow-md rounded-xl p-4 bg-white transition hover:shadow-lg">
              <h3 className="text-xl font-bold mb-2">Order: {order._id}</h3>
              <p><strong>Customer:</strong> {order.user?.name || 'NA'}</p>
              <p><strong>Phone:</strong> {order.user?.phoneNo || 'NA'}</p>
              <p className="text-sm mt-1 text-gray-600">
                <strong>Address:</strong> {address ? `${address.street}, ${address.city} - ${address.postalCode}` : 'NA'}
              </p>

              {/* Status Label */}
              <p className={`mt-3 font-semibold text-sm px-2 py-1 inline-block rounded 
                ${isPaid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                {isPaid ? '✅ Order Paid' : '❌ Payment Not Done'}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {/* View Items */}
                <button
                  onClick={() => toggleOrderItems(order._id)}
                  className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {expandedOrderId === order._id ? 'Hide Items' : '📦 View Items'}
                </button>

                {/* Location */}
                <button
                  onClick={() => openInGoogleMaps(address)}
                  className="flex items-center gap-1 text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  <FaMapMarkerAlt />
                  Get Location
                </button>

                {/* Payment Options */}
                {!isPaid && (
                  <div className="relative">
                    <button
                      onClick={() => setCashModeOrderId(prev => prev === order._id ? null : order._id)}
                      className="text-sm px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
                    >
                      💳 Payment Options
                    </button>

                    {cashModeOrderId === order._id && (
                      <div className="absolute z-10 mt-2 bg-white border rounded shadow-lg w-60 p-3">
                        <button
                          disabled={loadingOrderId === order._id}
                          onClick={() => handlePayment(order)}
                          className="block w-full text-left text-sm px-4 py-2 text-white bg-indigo-600 rounded hover:bg-indigo-700"
                        >
                          Online Payment
                        </button>
                        <div className="mt-2 p-2 bg-yellow-100 text-sm rounded">
                          <p>💵 Collect: ₹{order.totalPrice.toFixed(2)}</p>
                          <button
                            disabled={loadingOrderId === order._id}
                            onClick={() => handleCashPaymentConfirm(order._id)}
                            className="mt-1 w-full bg-green-600 hover:bg-green-700 text-white text-sm px-2 py-1 rounded"
                          >
                            ✅ Order Paid (Cash)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Delivered button - only if paid but not marked delivered */}
                {isPaid && !isDelivered && (
                  <button
                    onClick={() => handleMarkDelivered(order._id)}
                    disabled={loadingOrderId === order._id}
                    className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Mark as Delivered
                  </button>
                )}
              </div>

              {/* Order Items */}
              {expandedOrderId === order._id && (
                <ul className="mt-4 text-sm bg-gray-50 p-3 rounded">
                  {order.orderItems?.map((item, idx) => (
                    <li key={idx} className="border-b py-1">
                      🛒 {item.name} – {item.quantity} {item.units} ({item.brand})
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default DeliverOrdersCards;
