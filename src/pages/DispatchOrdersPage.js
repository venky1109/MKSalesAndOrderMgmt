import React, { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDispatchOrders } from '../features/orders/orderSlice';
import HeaderPOS from '../components/HeaderPOS';
import DispatchOrdersTable from '../components/DispatchOrdersTable';

const DispatchOrdersPage = () => {
  const dispatch = useDispatch();
 const orders = useSelector((state) => state.orders.dispatch);
  const userInfo = useSelector((state) => state.posUser.userInfo);
  // console.log(orders)

  useEffect(() => {
    if (userInfo?.role === 'DISPATCH_AGENT') {
      dispatch(fetchDispatchOrders()); // initial fetch

      const intervalId = setInterval(() => {
        dispatch(fetchDispatchOrders());
      }, 10000); // every 10 seconds

      return () => clearInterval(intervalId);
    }
  }, [dispatch, userInfo]);

  const refetch = useCallback(() => {
    dispatch(fetchDispatchOrders());
  }, [dispatch]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return (
    <div className="p-6">
      <HeaderPOS />
      <DispatchOrdersTable orders={orders} title="ORDERS TO DISPATCH" refetch={refetch} />
    </div>
  );
};

export default DispatchOrdersPage;
