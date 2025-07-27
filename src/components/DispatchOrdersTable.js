import { useCallback } from 'react';
import { useDispatch ,useSelector} from 'react-redux';
import { formatDateTime } from '../utils/dateFormatter';
import { getElapsedTime } from '../utils/timeUtils';
import { useLiveTimer } from '../utils/useLiveTimer';
import { markOrderAsDispatched } from '../features/orders/orderSlice';
// import { useAuth } from '../context/AuthContext'; // assumes token from context

const DispatchOrdersTable = ({ orders = [], title = "Orders to Dispatch", onDispatchConfirm }) => {
  const dispatch = useDispatch();
//   const { token } = useAuth(); // 

  
const token = useSelector((state) => state.posUser.userInfo?.token);

  useLiveTimer();

  const sortedOrders = [...orders].sort(
    (a, b) => new Date(a.packedAt) - new Date(b.packedAt)
  );

  const handleRowClick = useCallback(
    (orderId) => {
      if (window.confirm("🚚 Mark this order as Dispatched?")) {
        dispatch(markOrderAsDispatched({ id: orderId, token }))
          .then(() => {
            alert(`✅ Order ${orderId} successfully marked as Dispatched`);
            if (onDispatchConfirm) onDispatchConfirm(); // 🔄 refresh orders
          })
          .catch((err) => {
            console.error(err);
            alert("❌ Failed to update dispatch status. Please try again.");
          });
      }
    },
    [dispatch, token, onDispatchConfirm]
  );

  return (
    <div className="mt-6">
      <div className="border rounded-lg bg-white shadow-sm">
        <h2 className="text-4xl font-semibold p-4 mb-2 text-center text-gray-700">{title}</h2>
        <div className="overflow-x-auto max-h-[100vh] overflow-y-auto">
          <table className="w-full text-xl bg-white border rounded">
            <thead className="bg-gray-100 sticky top-0 z-10 text-left">
              <tr>
                <th className="p-2 border-b">#</th>
                <th className="p-2 border-b">Order ID</th>
                <th className="p-2 border-b">Customer</th>
                <th className="p-2 border-b">Phone</th>
                <th className="p-2 border-b">Address</th>
                <th className="p-2 border-b">Items</th>
                <th className="p-2 border-b">Packed At</th>
                <th className="p-2 border-b">Elapsed</th>
              </tr>
            </thead>
            <tbody>
              {sortedOrders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-4 text-gray-500">
                    No dispatch orders found.
                  </td>
                </tr>
              ) : (
                sortedOrders.map((order, index) => (
                  <tr
                    key={order._id}
                    className="hover:bg-green-50 cursor-pointer transition"
                    onClick={() => handleRowClick(order._id)}
                  >
                    <td className="p-2 border-b">{index + 1}</td>
                    <td className="p-2 border-b">{order._id}</td>
                    <td className="p-2 border-b">{order.user?.name || 'NA'}</td>
                    <td className="p-2 border-b">{order.user?.phoneNo || 'NA'}</td>
                    <td className="p-2 border-b">
                      {order.shippingAddress
                        ? ` ${order.shippingAddress.street} ${order.shippingAddress.city} - ${order.shippingAddress.postalCode}`
                        : 'NA'}
                    </td>
                    <td className="p-2 border-b">{order.orderItems?.length || 0}</td>
                    <td className="p-2 border-b">{formatDateTime(order.packedAt)}</td>
                    <td className="p-2 border-b">{getElapsedTime(order.packedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DispatchOrdersTable;
