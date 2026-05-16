import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  Banknote,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  ExternalLink,
  MapPin,
  PackageOpen,
  Phone,
  ReceiptText,
  User,
} from 'lucide-react';
import { initiateDeliveryPayment } from '../features/payment/paymentSlice';
import { markOrderAsDelivered, markOrderAsPaid } from '../features/orders/orderSlice';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatAddress = (shippingAddress) => {
  if (!shippingAddress) return 'NA';

  return [shippingAddress.street, shippingAddress.city, shippingAddress.postalCode]
    .filter(Boolean)
    .join(', ');
};

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
      return;
    }

    const query = encodeURIComponent(formatAddress(shippingAddress));
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
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
      const result = await dispatch(
        initiateDeliveryPayment({ customerId, order_id, amount })
      ).unwrap();
      const redirectUrl = result?.data?.payment_links?.web;

      if (redirectUrl) {
        window.open(redirectUrl, '_blank');
      } else {
        alert('No payment link received.');
      }
    } catch (err) {
      alert('Payment failed: ' + (err?.message || err));
    } finally {
      setLoadingOrderId(null);
    }
  };

  const handleCashPaymentConfirm = async (orderId) => {
    try {
      setLoadingOrderId(orderId);
      await dispatch(markOrderAsPaid(orderId)).unwrap();
      alert('Payment marked as completed');

      if (refetch) refetch();
    } catch (err) {
      alert('Failed to update payment status');
    } finally {
      setLoadingOrderId(null);
      setCashModeOrderId(null);
    }
  };

  const handleMarkDelivered = async (orderId) => {
    const confirmed = window.confirm('Mark this order as Delivered?');
    if (!confirmed) return;

    try {
      setLoadingOrderId(orderId);
      await dispatch(markOrderAsDelivered(orderId)).unwrap();
      alert('Order marked as delivered');
      if (refetch) refetch();
    } catch (err) {
      alert(`Failed to update delivery status: ${err}`);
    } finally {
      setLoadingOrderId(null);
    }
  };

  if (orders.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-500">
          <PackageOpen size={28} />
        </div>
        <h2 className="mt-4 text-lg font-bold text-gray-900">
          No delivery orders found
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          New assigned orders will appear here after refresh.
        </p>
      </section>
    );
  }

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {orders.map((order) => {
        const address = order.shippingAddress;
        const isPaid = order.isPaid;
        const isDelivered = order.isDelivered;
        const isBusy = loadingOrderId === order._id;
        const itemCount = order.orderItems?.length || 0;

        return (
          <article
            key={order._id}
            className="flex min-h-[420px] flex-col rounded-lg border border-gray-200 bg-white shadow-sm transition hover:border-gray-300 hover:shadow-md"
          >
            <div className="border-b border-gray-100 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-bold uppercase tracking-wide text-gray-400">
                    Order ID
                  </div>
                  <h3 className="mt-1 truncate text-lg font-bold text-gray-950">
                    {order._id}
                  </h3>
                </div>

                <StatusBadge isPaid={isPaid} isDelivered={isDelivered} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <InfoBlock
                  icon={<User size={16} />}
                  label="Customer"
                  value={order.user?.name || 'NA'}
                />
                <InfoBlock
                  icon={<Phone size={16} />}
                  label="Phone"
                  value={order.user?.phoneNo || 'NA'}
                />
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-4 p-4">
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 flex-none text-green-700" size={18} />
                  <div className="min-w-0">
                    <div className="text-xs font-bold uppercase tracking-wide text-gray-400">
                      Delivery address
                    </div>
                    <p className="mt-1 text-sm font-medium leading-5 text-gray-800">
                      {formatAddress(address)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                    <ReceiptText size={15} />
                    Amount
                  </div>
                  <div className="mt-1 text-xl font-bold text-gray-950">
                    {formatCurrency(order.totalPrice)}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-3">
                  <div className="text-xs font-bold uppercase tracking-wide text-gray-400">
                    Items
                  </div>
                  <div className="mt-1 text-xl font-bold text-gray-950">
                    {itemCount}
                  </div>
                </div>
              </div>

              <div className="mt-auto space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => toggleOrderItems(order._id)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <ChevronDown
                      size={16}
                      className={expandedOrderId === order._id ? 'rotate-180' : ''}
                    />
                    {expandedOrderId === order._id ? 'Hide items' : 'View items'}
                  </button>

                  <button
                    type="button"
                    onClick={() => openInGoogleMaps(address)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-green-700 px-3 text-sm font-semibold text-white hover:bg-green-800"
                  >
                    <ExternalLink size={16} />
                    Location
                  </button>
                </div>

                {!isPaid && (
                  <PaymentActions
                    isOpen={cashModeOrderId === order._id}
                    isBusy={isBusy}
                    amount={order.totalPrice}
                    onToggle={() =>
                      setCashModeOrderId((prev) =>
                        prev === order._id ? null : order._id
                      )
                    }
                    onOnline={() => handlePayment(order)}
                    onCash={() => handleCashPaymentConfirm(order._id)}
                  />
                )}

                {isPaid && !isDelivered && (
                  <button
                    type="button"
                    onClick={() => handleMarkDelivered(order._id)}
                    disabled={isBusy}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <CheckCircle2 size={17} />
                    {isBusy ? 'Updating...' : 'Mark as delivered'}
                  </button>
                )}
              </div>

              {expandedOrderId === order._id && (
                <ul className="rounded-lg border border-gray-200 bg-gray-50 text-sm">
                  {order.orderItems?.map((item, idx) => (
                    <li
                      key={`${order._id}-${idx}`}
                      className="flex items-start justify-between gap-3 border-b border-gray-200 px-3 py-2 last:border-b-0"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900">
                          {item.name || 'Item'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.brand || 'No brand'}
                        </div>
                      </div>
                      <div className="flex-none rounded-md bg-white px-2 py-1 text-xs font-bold text-gray-700">
                        {item.quantity || 0} {item.units || ''}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
};

const InfoBlock = ({ icon, label, value }) => (
  <div className="min-w-0 rounded-lg border border-gray-200 p-3">
    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-400">
      {icon}
      {label}
    </div>
    <div className="mt-1 truncate text-sm font-semibold text-gray-900">
      {value}
    </div>
  </div>
);

const PaymentActions = ({ isOpen, isBusy, amount, onToggle, onOnline, onCash }) => (
  <div className="rounded-lg border border-amber-200 bg-amber-50 p-2">
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-amber-600 px-3 text-sm font-bold text-white hover:bg-amber-700"
    >
      <CreditCard size={16} />
      Payment options
    </button>

    {isOpen && (
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={isBusy}
          onClick={onOnline}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-indigo-700 px-3 text-sm font-semibold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <CreditCard size={16} />
          Online
        </button>

        <button
          type="button"
          disabled={isBusy}
          onClick={onCash}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-green-700 px-3 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Banknote size={16} />
          Cash {formatCurrency(amount)}
        </button>
      </div>
    )}
  </div>
);

const StatusBadge = ({ isPaid, isDelivered }) => {
  if (isDelivered) {
    return (
      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">
        Delivered
      </span>
    );
  }

  if (isPaid) {
    return (
      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
        Paid
      </span>
    );
  }

  return (
    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
      Payment due
    </span>
  );
};

export default DeliverOrdersCards;
