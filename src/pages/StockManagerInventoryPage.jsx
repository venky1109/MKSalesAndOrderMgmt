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
  fetchInventoryDispatchOrders,
  clearStockManagerMessage,
} from '../features/inventory/stockManagerInventorySlice';

import StockManagerLayout from '../components/StockManagerLayout';

const number = (value) => Number(value || 0);

const asArray = (value) => (Array.isArray(value) ? value : []);

const DAY_MS = 24 * 60 * 60 * 1000;

const DISPATCHED_STATUSES = new Set([
  'dispatched',
  'received_to_outlet',
  'received_by_stakeholder',
  'received_to_warehouse',
]);

const countByStatus = (items = [], statusKey = 'status') =>
  items.reduce((acc, item) => {
    const status = item?.[statusKey] || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

const firstValue = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== '');

const formatDate = (value) => {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });
};

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getItemQty = (item) =>
  number(firstValue(item?.no_of_units, item?.qty, item?.quantity, item?.qty_out));

const getProductLabel = (item) =>
  firstValue(
    item?.product_name,
    item?.product_name_eng,
    item?.name,
    item?.product_code,
    item?.product_id,
    item?.product_barcode_id,
    'Product'
  );

const getProductKey = (item) =>
  String(
    firstValue(
      item?.product_barcode_id,
      item?.mk_barcode,
      item?.barcode,
      item?.product_id,
      getProductLabel(item)
    )
  );

const getOrderDate = (order) =>
  firstValue(
    order?.arrived_date,
    order?.order_date,
    order?.expected_date,
    order?.created_at,
    order?.updated_at
  );

const isShDestination = (destination) => {
  const normalized = String(destination || '').trim().toLowerCase();

  return (
    normalized.includes('sh') ||
    normalized.startsWith('stakeholder') ||
    normalized.startsWith('vendor') ||
    normalized.startsWith('customer')
  );
};

const buildProductDayRows = (orders = [], options = {}) => {
  const groups = new Map();

  asArray(orders).forEach((order) => {
    if (options.dispatchedOnly) {
      const status = String(order?.dispatch_status || '').toLowerCase();
      if (!DISPATCHED_STATUSES.has(status)) return;
    }

    const rawDate = options.getDate?.(order) || getOrderDate(order);
    const date = parseDate(rawDate);
    const dateLabel = formatDate(rawDate);

    asArray(order?.items).forEach((item) => {
      const qty = getItemQty(item);
      if (!qty) return;

      const product = getProductLabel(item);
      const productKey = getProductKey(item);
      const key = `${dateLabel}|${productKey}`;
      const current = groups.get(key) || {
        date: dateLabel,
        dateValue: date?.getTime() || 0,
        product,
        productKey,
        qty: 0,
        count: 0,
      };

      current.qty += qty;
      current.count += 1;
      groups.set(key, current);
    });
  });

  return [...groups.values()]
    .sort((a, b) => b.qty - a.qty || a.product.localeCompare(b.product))
};

const buildShTransactionRows = (transactions = []) => {
  const groups = new Map();

  asArray(transactions)
    .filter((transaction) => isShDestination(transaction?.destination))
    .forEach((transaction) => {
      const destination = transaction.destination || 'SH';
      const product = getProductLabel(transaction);
      const key = `${destination}|${product}`;
      const current = groups.get(key) || {
        destination,
        product,
        qtyIn: 0,
        qtyOut: 0,
        transactions: 0,
      };

      current.qtyIn += number(transaction.qty_in);
      current.qtyOut += number(transaction.qty_out);
      current.transactions += 1;
      groups.set(key, current);
    });

  return [...groups.values()]
    .sort((a, b) => b.qtyOut + b.qtyIn - (a.qtyOut + a.qtyIn))
};

const buildProductTotals = (rows = [], dateFilter = () => true) => {
  const groups = new Map();

  rows.filter(dateFilter).forEach((row) => {
    const key = row.productKey || row.product;
    const current = groups.get(key) || {
      product: row.product,
      productKey: key,
      qty: 0,
      firstDateValue: row.dateValue || 0,
      lastDateValue: row.dateValue || 0,
      firstDate: row.date,
      lastDate: row.date,
    };

    current.qty += number(row.qty);

    if (row.dateValue && (!current.firstDateValue || row.dateValue < current.firstDateValue)) {
      current.firstDateValue = row.dateValue;
      current.firstDate = row.date;
    }

    if (row.dateValue && row.dateValue > current.lastDateValue) {
      current.lastDateValue = row.dateValue;
      current.lastDate = row.date;
    }

    groups.set(key, current);
  });

  return groups;
};

const buildNotDispatchedMoreThanWeekRows = (purchaseRows = [], dispatchRows = []) => {
  const cutoff = Date.now() - 7 * DAY_MS;
  const oldPurchases = buildProductTotals(
    purchaseRows,
    (row) => row.dateValue && row.dateValue < cutoff
  );
  const allDispatches = buildProductTotals(dispatchRows);

  return [...oldPurchases.values()]
    .map((purchase) => {
      const dispatchedQty = number(allDispatches.get(purchase.productKey)?.qty);
      const pendingQty = Math.max(number(purchase.qty) - dispatchedQty, 0);

      return {
        product: purchase.product,
        purchaseQty: number(purchase.qty),
        dispatchedQty,
        pendingQty,
        firstPurchaseDate: purchase.firstDate,
        lastPurchaseDate: purchase.lastDate,
      };
    })
    .filter((row) => row.pendingQty > 0)
    .sort((a, b) => b.pendingQty - a.pendingQty || a.product.localeCompare(b.product));
};

const buildDispatchedEightyPercentRows = (purchaseRows = [], dispatchRows = []) => {
  const cutoff = Date.now() - 7 * DAY_MS;
  const recentPurchases = buildProductTotals(
    purchaseRows,
    (row) => row.dateValue && row.dateValue >= cutoff
  );
  const recentDispatches = buildProductTotals(
    dispatchRows,
    (row) => row.dateValue && row.dateValue >= cutoff
  );

  return [...recentPurchases.values()]
    .map((purchase) => {
      const dispatchedQty = number(recentDispatches.get(purchase.productKey)?.qty);
      const purchaseQty = number(purchase.qty);
      const dispatchPercent = purchaseQty
        ? Number(((dispatchedQty / purchaseQty) * 100).toFixed(1))
        : 0;

      return {
        product: purchase.product,
        purchaseQty,
        dispatchedQty,
        dispatchPercent,
        firstPurchaseDate: purchase.firstDate,
        lastPurchaseDate: purchase.lastDate,
      };
    })
    .filter((row) => row.purchaseQty > 0 && row.dispatchPercent >= 80)
    .sort(
      (a, b) =>
        b.dispatchPercent - a.dispatchPercent ||
        b.dispatchedQty - a.dispatchedQty ||
        a.product.localeCompare(b.product)
    );
};

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

const ProductMovementTable = ({ title, rows = [], mode }) => (
  <div className="rounded-xl border bg-white p-4 shadow-sm">
    <h3 className="mb-4 text-sm font-bold text-gray-900">{title}</h3>

    {rows.length === 0 ? (
      <p className="text-sm text-gray-500">No records</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-3 text-left">Product</th>
              <th className="p-3 text-right text-emerald-700">Purchased Qty</th>
              <th className="p-3 text-right text-blue-700">Dispatched Qty</th>
              {mode === 'pending' ? (
                <th className="p-3 text-right text-red-700">Pending Qty</th>
              ) : (
                <th className="p-3 text-right text-blue-700">Dispatch %</th>
              )}
              <th className="p-3 text-left">Purchase Dates</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${title}-${row.product}`} className="border-b hover:bg-gray-50">
                <td className="p-3 font-semibold text-gray-900">{row.product}</td>
                <td className="p-3 text-right font-semibold text-emerald-700">
                  {row.purchaseQty}
                </td>
                <td className="p-3 text-right font-semibold text-blue-700">
                  {row.dispatchedQty}
                </td>
                {mode === 'pending' ? (
                  <td className="p-3 text-right font-bold text-red-700">
                    {row.pendingQty}
                  </td>
                ) : (
                  <td className="p-3 text-right font-bold text-blue-700">
                    {row.dispatchPercent}%
                  </td>
                )}
                <td className="p-3 text-gray-700">
                  {row.firstPurchaseDate === row.lastPurchaseDate
                    ? row.firstPurchaseDate
                    : `${row.firstPurchaseDate} to ${row.lastPurchaseDate}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

const ShTransactionReport = ({ rows = [] }) => (
  <div className="rounded-xl border bg-white p-4 shadow-sm">
    <h3 className="mb-4 text-sm font-bold text-gray-900">
      Stock Transaction Qty by Destination SH
    </h3>

    {rows.length === 0 ? (
      <p className="text-sm text-gray-500">No SH destination transactions</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-3 text-left">Destination</th>
              <th className="p-3 text-left">Product</th>
              <th className="p-3 text-right">Qty In</th>
              <th className="p-3 text-right">Qty Out</th>
              <th className="p-3 text-right">Transactions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.destination}-${row.product}`} className="border-b">
                <td className="p-3">{row.destination}</td>
                <td className="p-3">{row.product}</td>
                <td className="p-3 text-right font-semibold">{row.qtyIn}</td>
                <td className="p-3 text-right font-semibold">{row.qtyOut}</td>
                <td className="p-3 text-right">{row.transactions}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
    inventoryDispatchOrders = [],
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
      dispatch(fetchInventoryDispatchOrders());
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
      dispatchStatus: countByStatus(inventoryDispatchOrders, 'dispatch_status'),
    };
  }, [catalogProducts, inventoryProducts, purchaseOrders, inventoryDispatchOrders]);

  const purchaseProductDayRows = useMemo(
    () => buildProductDayRows(purchaseOrders),
    [purchaseOrders]
  );

  const dispatchProductDayRows = useMemo(
    () =>
      buildProductDayRows(inventoryDispatchOrders, {
        dispatchedOnly: true,
        getDate: (order) => firstValue(order?.updated_at, order?.created_at),
      }),
    [inventoryDispatchOrders]
  );

  const notDispatchedMoreThanWeekRows = useMemo(
    () =>
      buildNotDispatchedMoreThanWeekRows(
        purchaseProductDayRows,
        dispatchProductDayRows
      ),
    [purchaseProductDayRows, dispatchProductDayRows]
  );

  const dispatchedEightyPercentRows = useMemo(
    () =>
      buildDispatchedEightyPercentRows(
        purchaseProductDayRows,
        dispatchProductDayRows
      ),
    [purchaseProductDayRows, dispatchProductDayRows]
  );

  const shTransactionRows = useMemo(
    () => buildShTransactionRows(transactions),
    [transactions]
  );

  if (!userInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="font-semibold text-red-600">
          Please login as ADMIN, STOCKMANAGER, DIRECTOR, or SUPERVISOR
        </p>
      </div>
    );
  }

  if (!['ADMIN', 'STOCKMANAGER', 'DIRECTOR', 'SUPERVISOR'].includes(userInfo.role)) {
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
            ManaKirana Ecosystem
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
            subtitle="Warehouse product lines"
            color="green"
          />

          <DashboardCard
            title="Products in Outlets"
            value={dashboard.outletProducts}
            subtitle="Outlet product lines"
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

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ProductMovementTable
            title="Products Purchased but Not Dispatched More Than a Week"
            rows={notDispatchedMoreThanWeekRows}
            mode="pending"
          />
          <ProductMovementTable
            title="Products Purchased and Dispatched 80% in Last Week"
            rows={dispatchedEightyPercentRows}
            mode="percent"
          />
        </div>

        <ShTransactionReport rows={shTransactionRows} />
      </section>
    </StockManagerLayout>
  );
};

export default StockManagerInventoryPage;
