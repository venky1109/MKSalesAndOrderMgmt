import React, { useEffect,useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPackingOrders } from '../features/orders/orderSlice';
import OrdersTable from '../components/OrdersTable';
import HeaderPOS from '../components/HeaderPOS'

const PackingOrdersPage = () => {
  const dispatch = useDispatch();
  const { orders} = useSelector((state) => state.orders);
  const userInfo = useSelector((state) => state.posUser.userInfo);

useEffect(() => {
  if (userInfo?.role === 'PACKING_AGENT') {
    dispatch(fetchPackingOrders()); // initial fetch

    const intervalId = setInterval(() => {
      dispatch(fetchPackingOrders());
    }, 10000); // every 10 seconds

    return () => clearInterval(intervalId); // cleanup on unmount
  }
}, [dispatch, userInfo]);


//   const refetch = () => dispatch(fetchPackingOrders());
const refetch = useCallback(() => {
  dispatch(fetchPackingOrders());
}, [dispatch]);

useEffect(() => {
  refetch();
}, [refetch]);

  


  return (
    <div className="p-6">
        <HeaderPOS />
      {/* <h2 className="text-2xl font-bold mb-4">Orders For Packing</h2> */}
      {/* {loading && <p className="text-gray-500">Loading...</p>} */}
      {/* {error && <p className="text-red-500">{error}</p>} */}
      { <OrdersTable orders={orders} title="ORDERS TO PACK" refetch={refetch} />}
    </div>
  );
};

export default PackingOrdersPage;
