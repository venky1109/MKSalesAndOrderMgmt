import React, { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDeliveryOrders } from '../features/orders/orderSlice';
import HeaderPOS from '../components/HeaderPOS';
import DeliverOrdersCards from '../components/DeliverOrdersCards';

const DeliveryOrdersPage = () => {
  const dispatch = useDispatch();
  const orders = useSelector((state) => state.orders.delivery); // adjust to your state


  const userInfo = useSelector((state) => state.posUser.userInfo);
  console.log(orders)

  useEffect(() => {
    if (userInfo?.role === 'DELIVERY_AGENT') {
      dispatch(fetchDeliveryOrders()); // initial fetch

      const intervalId = setInterval(() => {
        dispatch(fetchDeliveryOrders());
      }, 10000); // refresh every 10s

      return () => clearInterval(intervalId);
    }
  }, [dispatch, userInfo]);

  const refetch = useCallback(() => {
    dispatch(fetchDeliveryOrders());
  }, [dispatch]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return (
    <div className="p-6">
      <HeaderPOS />
      <DeliverOrdersCards orders={orders} refetch={refetch} />
    </div>
  );
};

export default DeliveryOrdersPage;
