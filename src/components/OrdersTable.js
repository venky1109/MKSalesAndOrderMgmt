import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  CheckCircle2,
  Clock3,
  MapPin,
  IndianRupee,
  PackageCheck,
  Phone,
  RefreshCw,
  ShoppingBag,
  X,
} from 'lucide-react';
import { formatDateTime } from '../utils/dateFormatter';
import { getElapsedTime } from '../utils/timeUtils';
import { useLiveTimer } from '../utils/useLiveTimer';
import { markOrderAsPacked } from '../features/orders/orderSlice';

const OrdersTable = ({ orders, title = 'Orders List', refetch }) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [packedStatus, setPackedStatus] = useState({});
  const [selectedLocation, setSelectedLocation] = useState('all');
  const dispatch = useDispatch();

  const token = useSelector((state) => state.posUser.userInfo?.token);
  useLiveTimer();

  const filteredOrders = useMemo(
    () => (Array.isArray(orders) ? orders : []),
    [orders]
  );
  const sortedOrders = useMemo(
    () =>
      [...filteredOrders].sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      ),
    [filteredOrders]
  );
  const locationOptions = useMemo(() => {
    const locations = filteredOrders
      .map((order) => getWarehouseLocationFromPosLocation(order.posLocation))
      .filter(Boolean);

    return [...new Set(locations)].sort((a, b) => a.localeCompare(b));
  }, [filteredOrders]);
  const visibleOrders = useMemo(
    () =>
      sortedOrders.filter((order) => {
        if (selectedLocation === 'all') return true;
        return getWarehouseLocationFromPosLocation(order.posLocation) === selectedLocation;
      }),
    [selectedLocation, sortedOrders]
  );

  const paidOrders = visibleOrders.filter(
    (order) => order.isPaid && !order.isPacked
  ).length;
  const waitingPaymentOrders = visibleOrders.filter(
    (order) => !order.isPaid && !order.isPacked
  ).length;
  const totalAmount = visibleOrders.reduce(
    (sum, order) => sum + Number(order.totalPrice || 0),
    0
  );
  const packedCount = Object.values(packedStatus).filter(Boolean).length;
  const selectedOrderTotal = orderItems.reduce(
    (sum, item) => sum + Number(item.price || 0),
    0
  );

  const togglePacked = (index) => {
    setPackedStatus((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleAllItemsPacked = useCallback(() => {
    if (window.confirm('All items packed. Move to dispatch?')) {
      dispatch(markOrderAsPacked({ id: selectedOrderId, token }))
        .then(() => {
          alert(`Order ${selectedOrderId} successfully moved to Dispatch`);
          setShowModal(false);
          if (refetch) refetch();
        })
        .catch((err) => {
          console.error(err);
          alert('Failed to update dispatch status. Please try again.');
        });
    }
  }, [dispatch, selectedOrderId, token, refetch]);

  useEffect(() => {
    const allPacked =
      Object.values(packedStatus).length > 0 &&
      Object.values(packedStatus).every((value) => value);

    if (allPacked) {
      setTimeout(() => {
        handleAllItemsPacked();
      }, 300);
    }
  }, [packedStatus, handleAllItemsPacked]);

  const handleClick = (orderId) => {
    const currentOrder = visibleOrders.find((order) => order._id === orderId);

    if (currentOrder?.isPacked) {
      alert('This order is already marked as packed.');
      return;
    }

    if (currentOrder) {
      setOrderItems(currentOrder.orderItems || []);
      setPackedStatus(
        Object.fromEntries((currentOrder.orderItems || []).map((_, i) => [i, false]))
      );
      setSelectedOrderId(orderId);
      setSelectedOrder(currentOrder);
      setShowModal(true);
    }
  };

  const getOrderRowClass = (order) => {
    if (!order.isPaid && !order.isPacked) {
      return 'border-l-4 border-l-blue-700 bg-blue-50 hover:bg-blue-100';
    }

    if (order.isPaid && !order.isPacked) {
      return 'border-l-4 border-l-red-500 bg-red-50 hover:bg-red-100';
    }

    return 'border-l-4 border-l-gray-200 bg-white hover:bg-green-50';
  };

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-green-100 text-green-700">
              <PackageCheck size={24} />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              <p className="text-sm text-gray-500">
                Tap an order, tick each item, and send completed orders to dispatch.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700">
              <MapPin size={16} className="text-gray-400" />
              <select
                value={selectedLocation}
                onChange={(event) => setSelectedLocation(event.target.value)}
                className="h-full min-w-[190px] bg-transparent text-sm font-semibold text-gray-800 outline-none"
                aria-label="Filter by packing location"
              >
                <option value="all">All locations</option>
                {locationOptions.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={refetch}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={ShoppingBag}
          label="Orders waiting"
          value={visibleOrders.length}
          tone="gray"
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Paid to pack"
          value={paidOrders}
          tone="red"
        />
        <SummaryCard
          icon={Clock3}
          label="Payment pending"
          value={waitingPaymentOrders}
          tone="blue"
        />
        <SummaryCard
          icon={IndianRupee}
          label="Order value"
          value={`₹ ${totalAmount.toFixed(2)}`}
          tone="green"
        />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-gray-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Packing queue</h2>
            <p className="text-sm text-gray-500">Oldest orders appear first.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-red-50 px-3 py-1 text-red-700">
              Paid
            </span>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
              Payment pending
            </span>
          </div>
        </div>

        <div className="max-h-[calc(100vh-310px)] overflow-auto">
          <table className="min-w-[920px] w-full text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Age</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center text-gray-500">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                      <PackageCheck className="text-gray-300" size={40} />
                      <p className="font-semibold text-gray-700">No orders found</p>
                      <p className="text-sm text-gray-500">
                        New packing orders will appear here automatically.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleOrders.map((order, index) => (
                  <tr
                    key={order._id}
                    className={`cursor-pointer transition ${getOrderRowClass(order)}`}
                    onClick={() => handleClick(order._id)}
                  >
                    <td className="px-4 py-3 font-bold text-gray-900">{index + 1}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200">
                        <Clock3 size={14} />
                        {getElapsedTime(order.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatDateTime(order.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-900">
                      {order._id}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <span className="inline-flex items-center gap-2">
                        <Phone size={14} className="text-gray-400" />
                        {order.user?.phoneNo || 'NA'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200">
                        <MapPin size={14} className="text-gray-400" />
                        {getWarehouseLocationFromPosLocation(order.posLocation) || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                      ₹ {Number(order.totalPrice || 0).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 p-4">
            <div className="relative flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
              <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Order details</h3>
                    <p className="mt-1 break-all font-mono text-xs font-semibold text-gray-500">
                      #{selectedOrderId}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                    <ModalMetric label="Items" value={`${packedCount}/${orderItems.length}`} />
                    <ModalMetric
                      label="Phone"
                      value={selectedOrder?.user?.phoneNo || 'NA'}
                    />
                    <ModalMetric
                      label="Value"
                      value={`₹ ${selectedOrderTotal.toFixed(2)}`}
                    />
                  </div>
                </div>
              </div>

              {orderItems.length === 0 ? (
                <p className="p-8 text-center text-gray-500">No items found.</p>
              ) : (
                <div className="overflow-auto p-4">
                  <table className="min-w-[860px] w-full table-fixed overflow-hidden rounded-lg border border-gray-200 text-sm">
                    <thead className="sticky top-0 bg-gray-100 text-xs font-bold uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="w-[52px] px-3 py-3 text-center">Done</th>
                        <th className="w-1/5 px-3 py-3 text-left">Brand</th>
                        <th className="px-3 py-3 text-left">Item</th>
                        <th className="w-[120px] px-3 py-3 text-left">Qty</th>
                        <th className="w-[140px] px-3 py-3 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {orderItems.map((item, index) => (
                        <tr
                          key={index}
                          className={`cursor-pointer transition ${
                            packedStatus[index]
                              ? 'bg-green-50'
                              : 'bg-white hover:bg-gray-50'
                          }`}
                          onClick={() => togglePacked(index)}
                        >
                          <td className="px-3 py-3 text-center">
                            <span
                              className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full border ${
                                packedStatus[index]
                                  ? 'border-green-600 bg-green-600 text-white'
                                  : 'border-gray-300 bg-white text-transparent'
                              }`}
                            >
                              <CheckCircle2 size={18} />
                            </span>
                          </td>
                          <td className="px-3 py-3 text-left font-semibold text-gray-900">
                            {item.brand || '-'}
                          </td>
                          <td className="px-3 py-3 text-left text-gray-800">
                            {item.name}
                          </td>
                          <td className="px-3 py-3 text-left font-bold text-gray-900">
                            {item.quantity}
                            {item.units}
                          </td>
                          <td className="px-3 py-3 text-right font-semibold text-gray-900">
                            ₹ {Number(item.price || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="sticky bottom-0 bg-gray-50">
                      <tr>
                        <td
                          colSpan="5"
                          className="px-3 py-3 text-right font-semibold text-gray-700"
                        >
                          Total Items: {orderItems.length}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-white hover:text-red-600"
                aria-label="Close order details"
              >
                <X size={22} />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

const SummaryCard = ({ icon: Icon, label, value, tone }) => {
  const toneClass =
    tone === 'red'
      ? 'bg-red-50 text-red-700'
      : tone === 'blue'
      ? 'bg-blue-50 text-blue-700'
      : tone === 'green'
      ? 'bg-green-50 text-green-700'
      : 'bg-gray-100 text-gray-700';

  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${toneClass}`}>
          <Icon size={22} />
        </span>
      </div>
    </article>
  );
};

const getWarehouseLocationFromPosLocation = (posLocation = '') => {
  const parts = String(posLocation)
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);

  return parts[1] || parts[0] || '';
};

const ModalMetric = ({ label, value }) => (
  <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
    <p className="text-xs font-semibold text-gray-500">{label}</p>
    <p className="mt-1 truncate font-bold text-gray-900">{value}</p>
  </div>
);

export default OrdersTable;
