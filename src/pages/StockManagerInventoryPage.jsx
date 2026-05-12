import React, { useEffect, useMemo } from 'react';
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
// import InventoryProductsTable from '../components/InventoryProductsTable';
import PurchaseOrdersSection from '../components/PurchaseOrdersSection';
// import ReceivePurchaseOrderSection from '../components/ReceivePurchaseOrderSection';
import StockTransactionsTable from '../components/StockTransactionsTable';
// import CreateDispatchOrderSection from '../components/CreateDispatchOrderSection';

const number = (value) => Number(value || 0);

const countByStatus = (items = [], statusKey = 'status') =>
  items.reduce((acc, item) => {
    const status = item?.[statusKey] || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

const DashboardCard = ({ title, value, subtitle, color = 'blue' }) => {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    green: 'bg-green-50 border-green-200 text-green-800',
    orange: 'bg-orange-50 border-orange-200 text-orange-800',
    purple: 'bg-purple-50 border-purple-200 text-purple-800',
    red: 'bg-red-50 border-red-200 text-red-800',
    slate: 'bg-slate-50 border-slate-200 text-slate-800',
  };

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${colors[color]}`}>
      <p className="text-sm font-semibold opacity-80">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      {subtitle && <p className="mt-1 text-xs opacity-70">{subtitle}</p>}
    </div>
  );
};

const StatusBox = ({ title, data = {}, color = 'bg-gray-50' }) => (
  <div className={`rounded-xl border p-4 shadow-sm ${color}`}>
    <h3 className="mb-3 text-sm font-bold text-gray-800">{title}</h3>

    {Object.keys(data).length === 0 ? (
      <p className="text-sm text-gray-500">No records</p>
    ) : (
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {Object.entries(data).map(([status, count]) => (
          <div
            key={status}
            className="rounded-lg bg-white px-3 py-2 text-center shadow-sm"
          >
            <p className="text-xs capitalize text-gray-500">
              {status.replaceAll('_', ' ')}
            </p>
            <p className="text-lg font-bold text-gray-900">{count}</p>
          </div>
        ))}
      </div>
    )}
  </div>
);

const StockManagerInventoryPage = () => {
  const dispatch = useDispatch();

  const { userInfo } = useSelector((state) => state.posUser || {});

  const {
    catalogProducts = [],
    inventoryProducts = [],
    purchaseOrders = [],
    dispatchOrders = [],
    transactions = [],
    warehouses = [],
    suppliers = [],
    outlets = [],
    employees = [],
    // loading,
    error,
    successMessage,
  } = useSelector((state) => state.stockManagerInventory || {});

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

  const dashboard = useMemo(() => {
    const stockSource =
      inventoryProducts?.length > 0 ? inventoryProducts : catalogProducts;

    const warehouseProducts = stockSource.filter(
      (item) =>
        item?.warehouse_id ||
        item?.warehouseId ||
        item?.business_entity_type === 'WAREHOUSE'
    );

    const outletProducts = stockSource.filter(
      (item) =>
        item?.outlet_id ||
        item?.outletId ||
        item?.business_entity_type === 'OUTLET'
    );

    const warehouseQty = warehouseProducts.reduce(
      (sum, item) =>
        sum + number(item.count_in_stock ?? item.stock ?? item.qty ?? 0),
      0
    );

    const outletQty = outletProducts.reduce(
      (sum, item) =>
        sum + number(item.count_in_stock ?? item.stock ?? item.qty ?? 0),
      0
    );

    return {
      totalProducts: catalogProducts.length,
      warehouseProducts: warehouseProducts.length,
      outletProducts: outletProducts.length,
      warehouseQty,
      outletQty,
      purchaseStatus: countByStatus(purchaseOrders, 'status'),
      dispatchStatus: countByStatus(dispatchOrders, 'dispatch_status'),
    };
  }, [catalogProducts, inventoryProducts, purchaseOrders, dispatchOrders]);

  if (!userInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="font-semibold text-red-600">
          Please login as STOCK_MANAGER
        </p>
      </div>
    );
  }

  if (!['ADMIN', 'STOCK_MANAGER', 'CASHIER'].includes(userInfo.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="font-semibold text-red-600">
          Access denied for this page
        </p>
      </div>
    );
  }

  return (
    <StockManagerLayout>
      <section className="space-y-5 p-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Stock Manager Inventory
          </h1>
          <p className="text-sm text-gray-500">
            Manage warehouse stock, outlet stock, dispatches, purchases, and
            inventory transactions
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-100 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="rounded-lg bg-green-100 px-4 py-3 text-green-700">
            {successMessage}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DashboardCard
            title="Catalog Products"
            value={dashboard.totalProducts}
            subtitle="Total products in catalog"
            color="blue"
          />

          <DashboardCard
            title="Products in Warehouse"
            value={dashboard.warehouseProducts}
            subtitle={`Total stock qty: ${dashboard.warehouseQty}`}
            color="green"
          />

          <DashboardCard
            title="Products in Outlets"
            value={dashboard.outletProducts}
            subtitle={`Total stock qty: ${dashboard.outletQty}`}
            color="orange"
          />

          <DashboardCard
            title="Employees / Users"
            value={employees.length || 0}
            subtitle="Staff summary"
            color="purple"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <DashboardCard
            title="Warehouses"
            value={warehouses.length || 0}
            subtitle="Active warehouse units"
            color="slate"
          />

          <DashboardCard
            title="Suppliers"
            value={suppliers.length || 0}
            subtitle="Supplier records"
            color="blue"
          />

          <DashboardCard
            title="Outlets"
            value={outlets.length || 0}
            subtitle="Outlet units"
            color="green"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <StatusBox
            title="Purchase Orders by Status"
            data={dashboard.purchaseStatus}
            color="bg-emerald-50"
          />

          <StatusBox
            title="Dispatch Orders by Status"
            data={dashboard.dispatchStatus}
            color="bg-indigo-50"
          />
        </div>

        <InventorySummaryCards
          products={catalogProducts}
          purchaseOrders={purchaseOrders}
          transactions={transactions}
        />

        {/* <CreateDispatchOrderSection products={catalogProducts} /> */}

        {/* <ReceivePurchaseOrderSection purchaseOrders={purchaseOrders} /> */}

        <PurchaseOrdersSection purchaseOrders={purchaseOrders} />

        {/* <InventoryProductsTable
          products={inventoryProducts?.length ? inventoryProducts : catalogProducts}
          loading={loading}
        /> */}

        <StockTransactionsTable transactions={transactions} />
      </section>
    </StockManagerLayout>
  );
};

export default StockManagerInventoryPage;