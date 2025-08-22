import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Cashier from './pages/Cashier';
import POS from './pages/POS';
import ProtectedRoute from './auth/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
// Order Lifecycle Pages
import PackingOrdersPage from './pages/PackingOrdersPage';
import DispatchOrdersPage from './pages/DispatchOrdersPage';
import DeliveryPage from './pages/DeliveryPage';
import { hydrateFromCache, fetchAllProducts } from './features/products/productSlice';
// import { publishQueuedOrders } from './features/orders/orderSlice';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

function App() {
  function AppBootHydrator() {
  const dispatch = useDispatch();
  const token = useSelector((s) => s.posUser?.userInfo?.token);

  useEffect(() => {
    // If offline at boot, hydrate products from cache
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      dispatch(hydrateFromCache());
    }

    // On reconnect: refresh products cache and publish queued orders
    const onOnline = () => {
      if (token) dispatch(fetchAllProducts(token));
      // dispatch(publishQueuedOrders({ token }));
    };

    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [dispatch, token]);

  return null;
}
  return (
    <AuthProvider>
       <AppBootHydrator />
      <BrowserRouter>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<Login />} />

          {/* POS Route */}
          <Route
            path="/pos"
            element={
              <ProtectedRoute role={["ADMIN", "ONLINE_CASHIER", "CASHIER", "HYBRID_CASHIER"]}>
                <POS />
              </ProtectedRoute>
            }
          />

          {/* Cashier Route */}
          <Route
            path="/cashier"
            element={
              <ProtectedRoute role={["CASHIER", "ONLINE_CASHIER", "HYBRID_CASHIER"]}>
                <Cashier />
              </ProtectedRoute>
            }
          />
           {/* Order Lifecycle Pages */}
          <Route path="/packing" element={
            <ProtectedRoute role="PACKING_AGENT">
              <PackingOrdersPage />
            </ProtectedRoute>
          } />
          <Route path="/dispatch" element={
            <ProtectedRoute role="DISPATCH_AGENT">
              <DispatchOrdersPage />
            </ProtectedRoute>
          } />
          <Route path="/delivery" element={
            <ProtectedRoute role="DELIVERY_AGENT">
              <DeliveryPage />
            </ProtectedRoute>
          } />
          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
