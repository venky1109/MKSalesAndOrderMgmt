import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  fetchCatalogProducts,
  fetchBrands,
  fetchUnits,
  fetchSuppliers,
  fetchWarehouses,
  fetchPurchaseOrders,
  fetchStockTransactions,
  clearStockManagerMessage,
} from '../features/inventory/stockManagerInventorySlice';

import StockManagerLayout from '../components/StockManagerLayout';
import InventorySummaryCards from '../components/InventorySummaryCards';
import InventoryProductsTable from '../components/InventoryProductsTable';
import PurchaseOrdersSection from '../components/PurchaseOrdersSection';
import ReceivePurchaseOrderSection from '../components/ReceivePurchaseOrderSection';
import StockTransactionsTable from '../components/StockTransactionsTable';
// import CreatePurchaseOrderSection from '../components/CreatePurchaseOrderSection';
import CreateDispatchOrderSection from '../components/CreateDispatchOrderSection';
// import { useNavigate } from 'react-router-dom';



const StockManagerInventoryPage = () => {
  const dispatch = useDispatch();
//  const navigate = useNavigate();

  const { userInfo } = useSelector((state) => state.posUser || {});
const {
  catalogProducts,
  purchaseOrders,
  transactions,
  loading,
  error,
  successMessage,
} = useSelector((state) => state.stockManagerInventory);

// const previousPurchases = [];

  useEffect(() => {
  if (userInfo?.token) {
    dispatch(fetchCatalogProducts());
    dispatch(fetchBrands());
    dispatch(fetchUnits());
    dispatch(fetchSuppliers());
    dispatch(fetchWarehouses());
    dispatch(fetchPurchaseOrders());
    dispatch(fetchStockTransactions());
  }
}, [dispatch, userInfo]);

  useEffect(() => {
    if (error || successMessage) {
      const timer = setTimeout(() => {
        dispatch(clearStockManagerMessage());
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [dispatch, error, successMessage]);

  if (!userInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600 font-semibold">
          Please login as STOCK_MANAGER
        </p>
      </div>
    );
  }

  if (!['ADMIN', 'STOCK_MANAGER', 'CASHIER'].includes(userInfo.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600 font-semibold">
          Access denied for this page
        </p>
      </div>
    );
  }

  return (
    <StockManagerLayout>
      <section className="p-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Stock Manager Inventory
          </h1>
          <p className="text-sm text-gray-500">
            Manage stock, purchase receiving, and inventory transactions
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-100 text-red-700 px-4 py-3">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="rounded-lg bg-green-100 text-green-700 px-4 py-3">
            {successMessage}
          </div>
        )}

        <InventorySummaryCards
          products={catalogProducts}
          purchaseOrders={purchaseOrders}
          transactions={transactions}
        />
    {/* <CreatePurchaseOrderSection products={catalogProducts} /> */}
{/* <CreatePurchaseOrderSection
  products={catalogProducts || []}
  brands={brands || []}
  units={units || []}
  suppliers={suppliers || []}
  warehouses={warehouses || []}
  previousPurchases={[]}
/> */}

<CreateDispatchOrderSection products={catalogProducts} />
        <ReceivePurchaseOrderSection purchaseOrders={purchaseOrders} />

        <PurchaseOrdersSection purchaseOrders={purchaseOrders} />

        <InventoryProductsTable products={catalogProducts} loading={loading} />

        <StockTransactionsTable transactions={transactions} />
      </section>
    </StockManagerLayout>
  );
};

export default StockManagerInventoryPage;