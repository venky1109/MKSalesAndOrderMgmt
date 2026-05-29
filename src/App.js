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
import StockPage from './pages/StockPage';
import CreatePurchaseOrderPage  from './pages/CreatePurchaseOrderPage';
import StockManagerCatalogPage from './pages/StockManagerCatalogPage';
import DispatchPage from "./pages/DispatchPage";
import RollbackPage from "./pages/RollbackPage";
import PrinterSettingsPage from "./pages/PrinterSettingsPage";  
import AccountsPage from "./pages/AccountsPage";
import AccountsBillsPage from "./pages/AccountsBillsPage";
import TopProductsReportPage from "./pages/TopProductsReportPage";
import InventoryDashboardPage from "./pages/InventoryDashboardPage";
import PwaLinkPage from "./pages/PwaLinkPage";
import OrderManagementPage from "./pages/OrderManagementPage";
import ApplicationMigrationHelperPage from "./pages/ApplicationMigrationHelperPage";
import AdvertisementsPage from "./pages/AdvertisementsPage";
import PwaInstallPrompt from "./components/PwaInstallPrompt";

const ALL_MANAGER_ROLES = ["ADMIN", "STOCKMANAGER", "DIRECTOR", "SUPERVISOR"];
const POS_ROLES = ["ADMIN", "ONLINE_CASHIER", "CASHIER", "HYBRID_CASHIER", "STOCKMANAGER", "DIRECTOR", "SUPERVISOR"];
const ADMIN_ROLES = ["ADMIN", "DIRECTOR"];

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
              <ProtectedRoute role={POS_ROLES}>
                <POS />
              </ProtectedRoute>
            }
          />

          {/* Cashier Route */}
          <Route
            path="/cashier"
            element={
              <ProtectedRoute role={["CASHIER", "ONLINE_CASHIER", "HYBRID_CASHIER", "SUPERVISOR"]}>
                <Cashier />
              </ProtectedRoute>
            }
          />
           {/* Order Lifecycle Pages */}
          <Route path="/packing" element={
               <ProtectedRoute role={[...ALL_MANAGER_ROLES,"PACKING_AGENT"]}>
              <PackingOrdersPage />
            </ProtectedRoute>
          } />
          <Route path="/dispatch" element={
            // <ProtectedRoute role="DISPATCH_AGENT">
               <ProtectedRoute role={[...ALL_MANAGER_ROLES,"DISPATCH_AGENT"]}>
              <DispatchOrdersPage />
            </ProtectedRoute>
          } />
          <Route path="/delivery" element={

              <ProtectedRoute role={[...ALL_MANAGER_ROLES,"DELIVERY_AGENT"]}>
              <DeliveryPage />
            </ProtectedRoute>
          } />
          <Route
  path="/ecosystem/catalog"
  element={
     <ProtectedRoute role={ALL_MANAGER_ROLES}>
      <StockManagerCatalogPage />
    </ProtectedRoute>
  }
/>
          <Route path="/ecosystem" element={

              <ProtectedRoute role={ALL_MANAGER_ROLES}>
              <StockManagerInventoryPage />
            </ProtectedRoute>
          } />
          <Route path="/inventory/dashboard" element={

              <ProtectedRoute role={ALL_MANAGER_ROLES}>
              <InventoryDashboardPage />
            </ProtectedRoute>
          } />
          <Route
  path="/ecosystem/purchase-orders/create"
  element={
    <ProtectedRoute role={ALL_MANAGER_ROLES}>
      <CreatePurchaseOrderPage />
    </ProtectedRoute>
  }
/>
          <Route
  path="/ecosystem/stock"
  element={
    <ProtectedRoute role={ALL_MANAGER_ROLES}>
      <StockPage />
    </ProtectedRoute>
  }
/>
          <Route path="/payment/success" element={<PaymentSuccessPage />} />
<Route path="/payment/failure" element={<PaymentFailurePage />} />
<Route path="/payment/invoice-share" element={<PaymentInvoiceSharePage />} />
<Route
  path="/ecosystem/dispatch"
  element={
    <ProtectedRoute role={ALL_MANAGER_ROLES}>
      <DispatchPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/ecosystem/rollback"
  element={
    <ProtectedRoute role={ALL_MANAGER_ROLES}>
      <RollbackPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/printer-settings"
  element={
    <ProtectedRoute role={["ADMIN", "ONLINE_CASHIER", "CASHIER", "HYBRID_CASHIER", "SUPERVISOR"]}>
      <PrinterSettingsPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/accounts/finance"
  element={
    <ProtectedRoute role={POS_ROLES}>
      <AccountsPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/accounts/bills"
  element={
    <ProtectedRoute role={POS_ROLES}>
      <AccountsBillsPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/reports/top-products"
  element={
    <ProtectedRoute role={POS_ROLES}>
      <TopProductsReportPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/orders/manage"
  element={
    <ProtectedRoute role={POS_ROLES}>
      <OrderManagementPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/advertisements"
  element={
    <ProtectedRoute role={ADMIN_ROLES}>
      <AdvertisementsPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/applications/pwa"
  element={
    <ProtectedRoute role={[...POS_ROLES, "PACKING_AGENT", "DISPATCH_AGENT", "DELIVERY_AGENT"]}>
      <PwaLinkPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/applications/migration-helper"
  element={
    <ProtectedRoute role={ALL_MANAGER_ROLES}>
      <ApplicationMigrationHelperPage />
    </ProtectedRoute>
  }
/>
<Route path="/finance" element={<Navigate to="/accounts/finance" replace />} />
<Route path="/accounts" element={<Navigate to="/accounts/finance" replace />} />
<Route path="/inventory" element={<Navigate to="/ecosystem" replace />} />
<Route path="/stock-manager/catalog" element={<Navigate to="/ecosystem/catalog" replace />} />
<Route path="/stock-manager/purchase-orders/create" element={<Navigate to="/ecosystem/purchase-orders/create" replace />} />
<Route path="/inventory/stock" element={<Navigate to="/ecosystem/stock" replace />} />
<Route path="/inventory/dispatch" element={<Navigate to="/ecosystem/dispatch" replace />} />
<Route path="/inventory/rollback" element={<Navigate to="/ecosystem/rollback" replace />} />
          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
