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
import PaymentInvoiceSharePage from './pages/PaymentInvoiceSharePage';
// import { publishQueuedOrders } from './features/orders/orderSlice';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import PaymentFailurePage from './pages/PaymentFailurePage';
import StockManagerInventoryPage from './pages/StockManagerInventoryPage';
import CreatePurchaseOrderPage  from './pages/CreatePurchaseOrderPage';
import StockManagerCatalogPage from './pages/StockManagerCatalogPage';
import DispatchPage from "./pages/DispatchPage";
import PrinterSettingsPage from "./pages/PrinterSettingsPage";  
import AccountsPage from "./pages/AccountsPage";
import TopProductsReportPage from "./pages/TopProductsReportPage";
import InventoryDashboardPage from "./pages/InventoryDashboardPage";
import PwaLinkPage from "./pages/PwaLinkPage";
import OrderManagementPage from "./pages/OrderManagementPage";
import PwaInstallPrompt from "./components/PwaInstallPrompt";

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
        <PwaInstallPrompt />
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<Login />} />

          {/* POS Route */}
          <Route
            path="/pos"
            element={
              <ProtectedRoute role={["ADMIN", "ONLINE_CASHIER", "CASHIER", "HYBRID_CASHIER", "STOCKMANAGER", "DIRECTOR"]}>
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
               <ProtectedRoute role={["ADMIN","STOCKMANAGER","DIRECTOR","PACKING_AGENT"]}>
              <PackingOrdersPage />
            </ProtectedRoute>
          } />
          <Route path="/dispatch" element={
            // <ProtectedRoute role="DISPATCH_AGENT">
               <ProtectedRoute role={["ADMIN","STOCKMANAGER","DIRECTOR","DISPATCH_AGENT"]}>
              <DispatchOrdersPage />
            </ProtectedRoute>
          } />
          <Route path="/delivery" element={

              <ProtectedRoute role={["ADMIN","STOCKMANAGER","DIRECTOR","DELIVERY_AGENT"]}>
              <DeliveryPage />
            </ProtectedRoute>
          } />
          <Route
  path="/ecosystem/catalog"
  element={
     <ProtectedRoute role={["ADMIN","STOCKMANAGER","DIRECTOR"]}>
      <StockManagerCatalogPage />
    </ProtectedRoute>
  }
/>
          <Route path="/ecosystem" element={

              <ProtectedRoute role={["ADMIN","STOCKMANAGER","DIRECTOR"]}>
              <StockManagerInventoryPage />
            </ProtectedRoute>
          } />
          <Route path="/inventory/dashboard" element={

              <ProtectedRoute role={["ADMIN","STOCKMANAGER","DIRECTOR"]}>
              <InventoryDashboardPage />
            </ProtectedRoute>
          } />
          <Route
  path="/ecosystem/purchase-orders/create"
  element={
    <ProtectedRoute role={["ADMIN","STOCKMANAGER","DIRECTOR"]}>
      <CreatePurchaseOrderPage />
    </ProtectedRoute>
  }
/>
          <Route path="/payment/success" element={<PaymentSuccessPage />} />
<Route path="/payment/failure" element={<PaymentFailurePage />} />
<Route path="/payment/invoice-share" element={<PaymentInvoiceSharePage />} />
<Route
  path="/ecosystem/dispatch"
  element={
    <ProtectedRoute role={["ADMIN","STOCKMANAGER","DIRECTOR"]}>
      <DispatchPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/printer-settings"
  element={
    <ProtectedRoute role={["ADMIN", "ONLINE_CASHIER", "CASHIER", "HYBRID_CASHIER"]}>
      <PrinterSettingsPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/accounts/finance"
  element={
    <ProtectedRoute role={["ADMIN", "ONLINE_CASHIER", "CASHIER", "HYBRID_CASHIER", "STOCKMANAGER", "DIRECTOR"]}>
      <AccountsPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/reports/top-products"
  element={
    <ProtectedRoute role={["ADMIN", "ONLINE_CASHIER", "CASHIER", "HYBRID_CASHIER", "STOCKMANAGER", "DIRECTOR"]}>
      <TopProductsReportPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/orders/manage"
  element={
    <ProtectedRoute role={["ADMIN", "ONLINE_CASHIER", "CASHIER", "HYBRID_CASHIER", "STOCKMANAGER", "DIRECTOR"]}>
      <OrderManagementPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/applications/pwa"
  element={
    <ProtectedRoute role={["ADMIN", "ONLINE_CASHIER", "CASHIER", "HYBRID_CASHIER", "STOCKMANAGER", "DIRECTOR", "PACKING_AGENT", "DISPATCH_AGENT", "DELIVERY_AGENT"]}>
      <PwaLinkPage />
    </ProtectedRoute>
  }
/>
<Route path="/finance" element={<Navigate to="/accounts/finance" replace />} />
<Route path="/accounts" element={<Navigate to="/accounts/finance" replace />} />
<Route path="/inventory" element={<Navigate to="/ecosystem" replace />} />
<Route path="/stock-manager/catalog" element={<Navigate to="/ecosystem/catalog" replace />} />
<Route path="/stock-manager/purchase-orders/create" element={<Navigate to="/ecosystem/purchase-orders/create" replace />} />
<Route path="/inventory/dispatch" element={<Navigate to="/ecosystem/dispatch" replace />} />
          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
