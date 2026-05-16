import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  CheckCircle2,
  Clock3,
  MapPin,
  PackageCheck,
  Phone,
  RefreshCw,
  Send,
  ShoppingBag,
  Truck,
  UserRound,
} from 'lucide-react';
import { formatDateTime } from '../utils/dateFormatter';
import { getElapsedTime } from '../utils/timeUtils';
import { useLiveTimer } from '../utils/useLiveTimer';
import { markOrderAsDispatched } from '../features/orders/orderSlice';

const DispatchOrdersTable = ({
  orders = [],
  title = 'Orders to Dispatch',
  onDispatchConfirm,
  refetch,
}) => {
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
        (a, b) => new Date(a.packedAt) - new Date(b.packedAt)
      ),
    [filteredOrders]
  );

  const totalItems = filteredOrders.reduce(
    (sum, order) => sum + Number(order.orderItems?.length || 0),
    0
  );
  const uniqueCustomers = new Set(
    filteredOrders.map((order) => order.user?.phoneNo || order.user?.name).filter(Boolean)
  ).size;
  const oldestPackedAt = sortedOrders[0]?.packedAt;

  const refreshOrders = useCallback(() => {
    if (onDispatchConfirm) onDispatchConfirm();
    if (refetch) refetch();
  }, [onDispatchConfirm, refetch]);

  const handleDispatch = useCallback(
    (orderId) => {
      if (window.confirm('Mark this order as dispatched?')) {
        dispatch(markOrderAsDispatched({ id: orderId, token }))
          .then(() => {
            alert(`Order ${orderId} successfully marked as dispatched`);
            refreshOrders();
          })
          .catch((err) => {
            console.error(err);
            alert('Failed to update dispatch status. Please try again.');
          });
      }
    },
    [dispatch, token, refreshOrders]
  );

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <Truck size={24} />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              <p className="text-sm text-gray-500">
                Review packed orders and mark them ready for delivery.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={refreshOrders}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={ShoppingBag}
          label="Orders waiting"
          value={filteredOrders.length}
          tone="gray"
        />
        <SummaryCard
          icon={PackageCheck}
          label="Items to dispatch"
          value={totalItems}
          tone="indigo"
        />
        <SummaryCard
          icon={UserRound}
          label="Customers"
          value={uniqueCustomers}
          tone="blue"
        />
        <SummaryCard
          icon={Clock3}
          label="Oldest packed"
          value={oldestPackedAt ? getElapsedTime(oldestPackedAt) : 'None'}
          tone="green"
        />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-gray-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Dispatch queue</h2>
            <p className="text-sm text-gray-500">Oldest packed orders appear first.</p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
            <Send size={14} />
            Tap Dispatch to confirm
          </span>
        </div>

        <div className="max-h-[calc(100vh-310px)] overflow-auto">
          <table className="min-w-[1080px] w-full text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Age</th>
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3 text-center">Items</th>
                <th className="px-4 py-3">Packed At</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedOrders.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-12 text-center text-gray-500">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                      <Truck className="text-gray-300" size={40} />
                      <p className="font-semibold text-gray-700">No dispatch orders found</p>
                      <p className="text-sm text-gray-500">
                        Packed orders will appear here automatically.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedOrders.map((order, index) => (
                  <tr
                    key={order._id}
                    className="border-l-4 border-l-indigo-500 bg-white transition hover:bg-indigo-50"
                  >
                    <td className="px-4 py-3 font-bold text-gray-900">{index + 1}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200">
                        <Clock3 size={14} />
                        {getElapsedTime(order.packedAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-900">
                      {order._id}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <span className="inline-flex items-center gap-2">
                        <UserRound size={14} className="text-gray-400" />
                        {order.user?.name || 'NA'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <span className="inline-flex items-center gap-2">
                        <Phone size={14} className="text-gray-400" />
                        {order.user?.phoneNo || 'NA'}
                      </span>
                    </td>
                    <td className="max-w-xs px-4 py-3 text-gray-700">
                      <span className="inline-flex items-start gap-2">
                        <MapPin size={14} className="mt-0.5 shrink-0 text-gray-400" />
                        <span>
                          {order.shippingAddress
                            ? `${order.shippingAddress.street} ${order.shippingAddress.city} - ${order.shippingAddress.postalCode}`
                            : 'NA'}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex min-w-10 items-center justify-center rounded-full bg-gray-100 px-3 py-1 font-bold text-gray-800">
                        {order.orderItems?.length || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatDateTime(order.packedAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDispatch(order._id)}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-indigo-700 px-4 text-sm font-semibold text-white hover:bg-indigo-800"
                      >
                        <CheckCircle2 size={16} />
                        Dispatch
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

const SummaryCard = ({ icon: Icon, label, value, tone }) => {
  const toneClass =
    tone === 'indigo'
      ? 'bg-indigo-50 text-indigo-700'
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

export default DispatchOrdersTable;
