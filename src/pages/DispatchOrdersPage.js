import React, { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDispatchOrders } from '../features/orders/orderSlice';
import DispatchOrdersTable from '../components/DispatchOrdersTable';
import StockManagerLayout from '../components/StockManagerLayout';

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
    <StockManagerLayout>
    <main className="space-y-4">
      <DispatchOrdersTable orders={orders} title="ORDERS TO DISPATCH" refetch={refetch} />
    </main>
    </StockManagerLayout>
  );
};

export default DispatchOrdersPage;
