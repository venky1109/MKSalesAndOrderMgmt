import React, { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CheckCircle2, Clock3, RefreshCw, Truck } from 'lucide-react';
import { fetchDeliveryOrders } from '../features/orders/orderSlice';
import DeliverOrdersCards from '../components/DeliverOrdersCards';
import StockManagerLayout from '../components/StockManagerLayout';

const DeliveryOrdersPage = () => {
  const dispatch = useDispatch();
  const orders = useSelector((state) => state.orders.delivery);


  const userInfo = useSelector((state) => state.posUser.userInfo);

  useEffect(() => {
    if (userInfo?.role === 'DELIVERY_AGENT') {
      dispatch(fetchDeliveryOrders());

      const intervalId = setInterval(() => {
        dispatch(fetchDeliveryOrders());
      }, 10000);

      return () => clearInterval(intervalId);
    }
  }, [dispatch, userInfo]);

  const refetch = useCallback(() => {
    dispatch(fetchDeliveryOrders());
  }, [dispatch]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const totalOrders = orders.length;
  const paidOrders = orders.filter((order) => order.isPaid).length;
  const pendingPayments = totalOrders - paidOrders;
  const readyToClose = orders.filter((order) => order.isPaid && !order.isDelivered).length;

  return (
    <StockManagerLayout>
      <main className="space-y-5">
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
                <Truck size={18} />
                Delivery workspace
              </div>
              <h1 className="mt-1 text-2xl font-bold text-gray-950">
                Orders assigned for delivery
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Auto-refreshes every 10 seconds for delivery agents.
              </p>
            </div>

            <button
              type="button"
              onClick={refetch}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-800"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <SummaryTile
              icon={<Truck size={18} />}
              label="Total orders"
              value={totalOrders}
              className="border-blue-100 bg-blue-50 text-blue-900"
            />
            <SummaryTile
              icon={<Clock3 size={18} />}
              label="Payment pending"
              value={pendingPayments}
              className="border-amber-100 bg-amber-50 text-amber-900"
            />
            <SummaryTile
              icon={<CheckCircle2 size={18} />}
              label="Ready to deliver"
              value={readyToClose}
              className="border-green-100 bg-green-50 text-green-900"
            />
          </div>
        </section>

        <DeliverOrdersCards orders={orders} refetch={refetch} />
      </main>
    </StockManagerLayout>
  );
};

const SummaryTile = ({ icon, label, value, className }) => (
  <div className={`rounded-lg border p-3 ${className}`}>
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-semibold">{label}</span>
      {icon}
    </div>
    <div className="mt-2 text-3xl font-bold">{value}</div>
  </div>
);

export default DeliveryOrdersPage;
