import React, { useState ,useEffect,useCallback} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { formatDateTime } from '../utils/dateFormatter';
import { getElapsedTime } from '../utils/timeUtils'; // adjust path based on location
import { useLiveTimer } from '../utils/useLiveTimer';
import { markOrderAsPacked } from '../features/orders/orderSlice';



const OrdersTable = ({ orders, title = "Orders List" , refetch}) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [packedStatus, setPackedStatus] = useState({});
  const dispatch=useDispatch();
  
const token = useSelector((state) => state.posUser.userInfo?.token);
  useLiveTimer(); 

  const togglePacked = (index) => {
  setPackedStatus((prev) => ({
    ...prev,
    [index]: !prev[index],
  }));
};



const handleAllItemsPacked = useCallback(() => {
  if (window.confirm('✅ All items packed. Move to dispatch?')) {
    dispatch(markOrderAsPacked({ id: selectedOrderId, token }))
      .then(() => {
        alert(`✅ Order ${selectedOrderId} successfully moved to Dispatch`);
        setShowModal(false);
        if (refetch) refetch(); // Refresh orders after update
      })
      .catch((err) => {
        console.error(err);
        alert('❌ Failed to update dispatch status. Please try again.');
      });
  }
}, [dispatch, selectedOrderId, token, refetch]);


useEffect(() => {
  const allPacked =
    Object.values(packedStatus).length > 0 &&
    Object.values(packedStatus).every((v) => v);

  if (allPacked) {
    setTimeout(() => {
      handleAllItemsPacked(); // ✅ No ESLint warning now
    }, 300);
  }
}, [packedStatus, handleAllItemsPacked]);

// const markOrderPacked = async () => {
//   try {
//     const res = await fetch(
//       `${process.env.REACT_APP_API_BASE_URL}/orders/pos/${selectedOrderId}/pack`,
//       {
//         method: 'PATCH',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify({ isPacked: true }),
//       }
//     );
//     if (!res.ok) throw new Error('Failed to update packing status');
//     alert('✅ Order marked as packed');
//     setShowModal(false);
//   } catch (error) {
//     alert(error.message);
//   }
// };


  const handleClick = (orderId) => {
    const selectedOrder = orders.find((o) => o._id === orderId);
    if (selectedOrder?.isPacked) {
    alert("✅ This order is already marked as packed.");
    return;
  }
    if (selectedOrder) {
      setOrderItems(selectedOrder.orderItems);
       setPackedStatus(
      Object.fromEntries(selectedOrder.orderItems.map((_, i) => [i, false]))
    );
      setSelectedOrderId(orderId);
      setShowModal(true);
    }
  };

  // const filteredOrders = Array.isArray(orders) ? orders : [];
  const filteredOrders = Array.isArray(orders) ? orders : [];
const sortedOrders = [...filteredOrders].sort(
  (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
);

  return (
    <div className="mt-6">
      <div className="border rounded-lg bg-white shadow-sm">
        <h2 className="text-5xl font-semibold p-4 mb-2 text-center text-gray-700">{title}</h2>

        {/* Main Table Scroll Container */}
        <div className="overflow-x-auto max-h-[90vh] overflow-y-auto">
          <table className="w-full text-2xl bg-white border rounded">
            <thead className="bg-gray-100 text-left sticky top-0 z-10">
              <tr>
                <th className="p-2 border-b">#</th>
                <th className="p-2 border-b">Bucket Time</th>
                <th className="p-2 border-b">Date</th>
                <th className="p-2 border-b">Order ID</th>
                <th className="p-2 border-b">Phone</th>
                {/* <th className="p-2 border-b">Name</th> */}
                <th className="p-2 border-b">Amount</th>
                
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-3 text-gray-500">
                    No orders found
                  </td>
                </tr>
              ) : (
                sortedOrders.map((order, index) => (
                  <tr
                    key={order._id}
                    // className={`cursor-pointer transition ${
                    //   !order.isPaid && !order.isPacked
                    //     ? 'bg-yellow-100'
                    //     : order.isPaid && !order.isPacked
                    //     ? 'bg-red-100'
                    //     : order.isPacked && !order.isDispatched
                    //     ? 'bg-orange-100'
                    //     : order.isDispatched && !order.isDelivered
                    //     ? 'bg-gray-200'
                    //     : order.isDelivered
                    //     ? 'bg-green-100'
                    //     : 'hover:bg-blue-50'
                    // }`}
                                      
                    className={`cursor-pointer transition
                      ${
                        !order.isPaid && !order.isPacked
                          ? 'bg-blue-900'
                          : order.isPaid && !order.isPacked
                          ? 'bg-red-400'
                          : ''
                      } hover:bg-green-500`}


                    onClick={() => handleClick(order._id)}
                  >

                    <td className="p-2 border-b text-white">{index + 1}</td>
                    <td className="p-2 border-b text-white">{getElapsedTime(order.createdAt)}</td>

                    <td className="p-2 border-b text-white">{formatDateTime(order.createdAt)}</td>
                    <td className="p-2 border-b text-white">{order._id}</td>
                    {/* <td className="p-2 border-b ">{order.user?.name}</td> */}
                       <td className="p-2 border-b text-white">{order.user?.phoneNo || 'NA'}</td>
                    <td className="p-2 border-b text-white">₹ {order.totalPrice?.toFixed(2)}</td>
                 
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal for Item Details */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg min-w-[1300px]  shadow-lg w-[90%] max-w-2xl p-6 relative max-h-[80vh] overflow-y-auto">
              <h3 className="text-2xl font-bold mb-4 text-blue-700">
                Order Details — <span className="text-xl text-gray-500">#{selectedOrderId}</span>
              </h3>

              {orderItems.length === 0 ? (
                <p className="text-gray-500">No items found.</p>
              ) : (
                <div className="overflow-auto">
                  <table className="min-w-[1200px]  table-fixed text-xl border">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                       <th className="p-2 border w-1/4 min-w-[120px] text-left ">Brand</th>
        <th className="p-2 border min-w-[500px]  text-left ">Item</th>
        <th className="p-2 border w-1/6 min-w-[100px]  text-left ">Qty</th>
        <th className="p-2 border w-1/6 min-w-[100px]  ">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderItems.map((item, index) => (
                        <tr key={index}   className={`cursor-pointer ${packedStatus[index] ? 'bg-green-200' : ''}`}
  onClick={() => togglePacked(index)}>
                          <td className="p-2 border  text-left ">{item.brand}</td>
                          <td className="p-2 border  text-left ">{item.name}</td>
                          <td className="p-2 border  text-left ">
                            {item.quantity}
                            {item.units}
                          </td>
                          <td className="p-2 border text-right">₹ {item.price}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 sticky bottom-0">
  <tr>
    <td colSpan="4" className="p-2 text-right font-semibold">
      Total Items: {orderItems.length}
    </td>
  </tr>
</tfoot>

                  </table>
                </div>
              )}

              <button
                onClick={() => setShowModal(false)}
                className="absolute top-2 right-2 text-gray-500 hover:text-red-600 text-3xl"
              >
                &times;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersTable;
