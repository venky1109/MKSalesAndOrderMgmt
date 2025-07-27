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

function App() {
  return (
    <AuthProvider>
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
