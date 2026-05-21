import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowDownUp,
  Boxes,
  CircleDollarSign,
  PackageCheck,
  Store,
  Truck,
  Warehouse,
} from 'lucide-react';

import StockManagerLayout from '../components/StockManagerLayout';
import InventoryProductsTable from '../components/InventoryProductsTable';
import StockTransactionsTable from '../components/StockTransactionsTable';
import TransitProductsTable from '../components/TransitProductsTable';
import { fetchAllProducts } from '../features/products/productSlice';
import {
  clearStockManagerMessage,
  fetchInventoryDispatchOrders,
  fetchInventoryProducts,
  fetchOutlets,
  fetchStockTransactions,
  fetchWarehouses,
} from '../features/inventory/stockManagerInventorySlice';

const number = (value) => Number(value || 0);

const numberFormat = new Intl.NumberFormat('en-IN');

const currencyFormat = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const firstValue = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== '');

const asArray = (value) => (Array.isArray(value) ? value : []);

const formatNumber = (value) => numberFormat.format(number(value));

const formatMoney = (value) => currencyFormat.format(number(value));

const normalizeText = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const locationNamesMatch = (left, right) => {
  const a = normalizeText(left);
  const b = normalizeText(right);

  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
};

const getOutletLabel = (outlet) =>
  firstValue(
    outlet?.outlet_name,
    outlet?.outletName,
    outlet?.outlet_code,
    outlet?.unit_code,
    outlet?.name,
    outlet?.location,
    outlet?.locationName,
    outlet?.id
  );

const getUserOutletName = (userInfo) =>
  firstValue(
    userInfo?.outlet?.outlet_name,
    userInfo?.outlet?.name,
    userInfo?.outlet_name,
    userInfo?.outletName,
    userInfo?.outlet,
    userInfo?.location,
    userInfo?.branch,
    userInfo?.store,
    userInfo?.storeName
  );

const getUserOutletId = (userInfo) =>
  firstValue(
    userInfo?.outlet?.id,
    userInfo?.outlet_id,
    userInfo?.outletId,
    userInfo?.location_id,
    userInfo?.locationId,
    userInfo?.store_id,
    userInfo?.storeId
  );

const getLocationId = (item, type) => {
  if (type === 'outlet') {
    return firstValue(
      item?.outlet_id,
      item?.outletId,
      item?.outletID,
      item?.business_entity_type === 'OUTLET' ? item?.business_entity_id : undefined,
      item?.store_id,
      item?.storeId
    );
  }

  return firstValue(
    item?.warehouse_id,
    item?.warehouseId,
    item?.warehouseID,
    item?.business_entity_type === 'WAREHOUSE' ? item?.business_entity_id : undefined,
    item?.inventory_id,
    item?.inventoryId
  );
};

const getLocationName = (item, type) => {
  if (type === 'outlet') {
    return firstValue(
      item?.outlet_name,
      item?.outletName,
      item?.outlet,
      item?.store_name,
      item?.storeName,
      item?.branch_name,
      item?.branchName,
      item?.location_name,
      item?.locationName,
      item?.location
    );
  }

  return firstValue(
    item?.warehouse_name,
    item?.warehouseName,
    item?.inventory_name,
    item?.inventoryName,
    item?.location_name,
    item?.locationName
  );
};

const filterByLocation = (
  items = [],
  selectedId = '',
  type = 'warehouse',
  selectedLocation = null,
  fallbackLocation = {}
) => {
  if (!selectedId) return items;

  const fallbackId = fallbackLocation?.id;
  const fallbackName = normalizeText(fallbackLocation?.name);
  const selectedName = normalizeText(
    type === 'outlet'
      ? getOutletLabel(selectedLocation)
      : firstValue(
          selectedLocation?.warehouse_name,
          selectedLocation?.warehouseName,
          selectedLocation?.warehouse_code,
          selectedLocation?.name,
          selectedLocation?.id
        )
  );

  return items.filter((item) => {
    const itemId = getLocationId(item, type);
    const itemName = normalizeText(getLocationName(item, type));
    const hasLocation = itemId !== undefined || Boolean(itemName);

    return (
      String(itemId || '') === String(selectedId) ||
      locationNamesMatch(itemName, selectedName) ||
      (!hasLocation &&
        fallbackId !== undefined &&
        String(fallbackId) === String(selectedId)) ||
      (!hasLocation && locationNamesMatch(fallbackName, selectedName))
    );
  });
};

const sumQty = (items = [], keys = []) =>
  items.reduce((sum, item) => {
    const value = keys.find((key) => item?.[key] !== undefined);
    return sum + number(value ? item[value] : 0);
  }, 0);

const getStockQty = (item) =>
  number(
    firstValue(
      item?.count_in_stock,
      item?.countInStock,
      item?.stock,
      item?.qty,
      item?.quantityInStock,
      item?.no_of_units,
      item?.purchase_qty
    )
  );

const getPurchaseUnitPrice = (item) =>
  number(
    firstValue(
      item?.purchase_price,
      item?.purchasePrice,
      item?.cost_price,
      item?.costPrice,
      item?.buying_price,
      item?.buyingPrice,
      item?.unit_cost,
      item?.unitCost,
      item?.unit_price,
      item?.unitPrice,
      item?.landing_cost,
      item?.landingCost,
      item?.price
    )
  );

const getPurchaseAmount = (item) => {
  const directAmount = firstValue(
    item?.total_purchase_amount,
    item?.totalPurchaseAmount,
    item?.purchase_amount,
    item?.purchaseAmount,
    item?.total_cost,
    item?.totalCost
  );

  if (directAmount !== undefined) return number(directAmount);

  return getStockQty(item) * getPurchaseUnitPrice(item);
};

const getStockBrandName = (item) =>
  firstValue(
    item?.brand,
    item?.brand_name,
    item?.brand_name_english,
    item?.brandName,
    item?.brandNameEnglish
  );

const getStockProductName = (item) =>
  firstValue(
    item?.product_name,
    item?.product_name_eng,
    item?.product_name_tel,
    item?.productName,
    item?.name,
    item?.product_id
  );

const getStockProductDisplayName = (item) => {
  const brand = String(getStockBrandName(item) || '').trim();
  const product = String(getStockProductName(item) || '').trim();

  if (!brand) return product || '-';
  if (!product) return brand;
  if (product.toLowerCase().startsWith(brand.toLowerCase())) return product;

  return `${brand} ${product}`;
};

const flattenOutletProducts = (
  products = [],
  fallbackOutletName = '',
  fallbackOutletId = ''
) =>
  asArray(products).flatMap((product) =>
    asArray(product?.details).flatMap((detail) =>
      asArray(detail?.financials).map((financial) => ({
        id: [product?._id, detail?._id, financial?._id].filter(Boolean).join(':'),
        product_name: product?.name || product?.product_name || '-',
        product_code: product?.product_code || product?.productCode || '-',
        brand: detail?.brand || '-',
        sku_id: financial?.mkid || financial?.sku_id || '-',
        bar_code: asArray(financial?.barcode)[0] || '-',
        countInStock: financial?.countInStock,
        outlet_id: firstValue(
          financial?.outlet_id,
          financial?.outletId,
          detail?.outlet_id,
          detail?.outletId,
          product?.outlet_id,
          product?.outletId,
          product?.business_entity_type === 'OUTLET'
            ? product?.business_entity_id
            : undefined,
          fallbackOutletId
        ),
        outlet_name: firstValue(
          financial?.outlet_name,
          financial?.outletName,
          financial?.outlet,
          financial?.location,
          financial?.locationName,
          detail?.outlet_name,
          detail?.outletName,
          detail?.outlet,
          detail?.location,
          detail?.locationName,
          product?.outlet_name,
          product?.outletName,
          product?.outlet,
          product?.store_name,
          product?.storeName,
          product?.branch_name,
          product?.branchName,
          product?.location_name,
          product?.locationName,
          product?.location,
          fallbackOutletName
        ),
        quantity: financial?.quantity,
        units: financial?.units,
        price: financial?.price,
        dprice: financial?.dprice,
        purchasePrice: financial?.purchasePrice,
        purchase_price: financial?.purchase_price,
        costPrice: financial?.costPrice,
        cost_price: financial?.cost_price,
      }))
    )
  );

const statusIsTransit = (status) =>
  ['sent', 'packed', 'dispatched', 'intransit'].includes(
    String(status || '').toLowerCase()
  );

const SummaryCard = ({ icon: Icon, label, value, detail, tone }) => {
  const tones = {
    blue: 'border-blue-200 bg-blue-50 text-blue-900',
    green: 'border-green-200 bg-green-50 text-green-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    indigo: 'border-indigo-200 bg-indigo-50 text-indigo-900',
    slate: 'border-slate-200 bg-white text-slate-900',
  };

  return (
    <div className={`rounded-lg border p-4 shadow-sm ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold opacity-75">{label}</p>
          <p className="mt-2 text-2xl font-bold">{value}</p>
          <p className="mt-1 text-xs opacity-70">{detail}</p>
        </div>
        <Icon size={24} />
      </div>
    </div>
  );
};

const tabs = [
  { id: 'outlets', label: 'Outlet Stock' },
  { id: 'inventory', label: 'Inventory Stock' },
  { id: 'transactions', label: 'Stock Transactions' },
  { id: 'transit', label: 'Products In Transit' },
];

const OutletStockTable = ({
  products = [],
  loading,
  outlets = [],
  selectedOutletId = '',
  onOutletChange,
}) => {
  const [search, setSearch] = useState('');

  const filteredProducts = useMemo(() => {
    const value = search.toLowerCase();

    return products.filter((item) =>
      [
        item.product_name,
        getStockProductDisplayName(item),
        item.product_code,
        item.sku_id,
        item.bar_code,
        item.brand,
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(value))
    );
  }, [products, search]);

  return (
    <section className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-lg font-bold">Outlet Stock</h2>

        <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
          <select
            value={selectedOutletId}
            onChange={(event) => onOutletChange(event.target.value)}
            className="w-full rounded-lg border px-3 py-2 md:w-56"
          >
            <option value="">All outlets</option>
            {outlets.map((outlet) => (
              <option key={outlet.id} value={outlet.id}>
                {getOutletLabel(outlet)}
              </option>
            ))}
          </select>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search outlet product / SKU / barcode"
            className="w-full rounded-lg border px-3 py-2 md:w-80"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading outlet stock...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-3 text-left">Product</th>
                <th className="p-3 text-left">Brand</th>
                <th className="p-3 text-left">Outlet</th>
                <th className="p-3 text-left">SKU</th>
                <th className="p-3 text-left">Barcode</th>
                <th className="p-3 text-right">Stock</th>
                <th className="p-3 text-right">Purchase Amount</th>
              </tr>
            </thead>

            <tbody>
              {filteredProducts.map((item) => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{getStockProductDisplayName(item)}</td>
                  <td className="p-3">{item.brand}</td>
                  <td className="p-3">
                    {getLocationName(item, 'outlet') || getLocationId(item, 'outlet') || '-'}
                  </td>
                  <td className="p-3">{item.sku_id}</td>
                  <td className="p-3">{item.bar_code}</td>
                  <td className="p-3 text-right font-semibold">
                    {formatNumber(getStockQty(item))}
                  </td>
                  <td className="p-3 text-right font-semibold">
                    {formatMoney(getPurchaseAmount(item))}
                  </td>
                </tr>
              ))}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-4 text-center text-gray-500">
                    No outlet stock products found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

const StockPage = () => {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('outlets');
  const [selectedOutletId, setSelectedOutletId] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');

  const { userInfo } = useSelector((state) => state.posUser || {});
  const {
    all: outletProductsRaw = [],
    loading: outletProductsLoading = false,
  } = useSelector((state) => state.products || {});
  const {
    inventoryProducts = [],
    transactions = [],
    inventoryDispatchOrders = [],
    transitProducts = [],
    warehouses = [],
    outlets = [],
    loading = false,
    error,
  } = useSelector((state) => state.stockManagerInventory || {});

  useEffect(() => {
    if (!userInfo?.token) return;

    dispatch(fetchInventoryProducts());
    dispatch(fetchStockTransactions());
    dispatch(fetchInventoryDispatchOrders());
    dispatch(fetchAllProducts({ token: userInfo.token }));
    dispatch(fetchOutlets());
    dispatch(fetchWarehouses());
  }, [dispatch, userInfo]);

  useEffect(() => {
    if (!error) return undefined;

    const timer = setTimeout(() => {
      dispatch(clearStockManagerMessage());
    }, 3000);

    return () => clearTimeout(timer);
  }, [dispatch, error]);

  const summary = useMemo(() => {
    const selectedOutlet = outlets.find(
      (outlet) => String(outlet.id) === String(selectedOutletId)
    );
    const selectedWarehouse = warehouses.find(
      (warehouse) => String(warehouse.id) === String(selectedWarehouseId)
    );
    const userOutletName = getUserOutletName(userInfo);
    const userOutletId = getUserOutletId(userInfo);
    const outletProducts = flattenOutletProducts(
      outletProductsRaw,
      userOutletName,
      userOutletId
    );
    const selectedOutletProducts = filterByLocation(
      outletProducts,
      selectedOutletId,
      'outlet',
      selectedOutlet,
      {
        id: userOutletId,
        name: userOutletName,
      }
    );
    const selectedInventoryProducts = filterByLocation(
      inventoryProducts,
      selectedWarehouseId,
      'warehouse',
      selectedWarehouse
    );
    const productsInTransit = inventoryDispatchOrders
      .filter((order) => statusIsTransit(order.dispatch_status))
      .flatMap((order) => order.items || []);

    const inventoryStockQty = selectedInventoryProducts.reduce(
      (sum, item) => sum + getStockQty(item),
      0
    );
    const outletStockQty = selectedOutletProducts.reduce(
      (sum, item) => sum + getStockQty(item),
      0
    );
    const inventoryPurchaseAmount = selectedInventoryProducts.reduce(
      (sum, item) => sum + getPurchaseAmount(item),
      0
    );
    const outletPurchaseAmount = selectedOutletProducts.reduce(
      (sum, item) => sum + getPurchaseAmount(item),
      0
    );
    const transitQty =
      transitProducts.length > 0
        ? sumQty(transitProducts, ['qty', 'quantity', 'no_of_units'])
        : sumQty(productsInTransit, ['qty', 'quantity', 'no_of_units']);

    return {
      outletProducts,
      selectedOutletProducts,
      selectedInventoryProducts,
      productsCount: selectedInventoryProducts.length,
      outletProductsCount: selectedOutletProducts.length,
      stockQty: inventoryStockQty,
      outletStockQty,
      totalStockQty: inventoryStockQty + outletStockQty,
      inventoryPurchaseAmount,
      outletPurchaseAmount,
      totalPurchaseAmount: inventoryPurchaseAmount + outletPurchaseAmount,
      transactionsCount: transactions.length,
      transitCount:
        transitProducts.length > 0 ? transitProducts.length : productsInTransit.length,
      transitQty,
    };
  }, [
    outletProductsRaw,
    inventoryProducts,
    selectedOutletId,
    selectedWarehouseId,
    outlets,
    warehouses,
    userInfo,
    transactions,
    inventoryDispatchOrders,
    transitProducts,
  ]);

  return (
    <StockManagerLayout>
      <section className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Stock</h1>
            <p className="text-sm text-gray-500">
              Stock across 2 outlets and inventory, with total stock and purchase value.
            </p>
          </div>
        </div>

        {error ? (
          <div className="rounded-lg bg-red-100 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={Boxes}
            label="Total Stock"
            value={formatNumber(summary.totalStockQty)}
            detail={`${formatNumber(summary.outletStockQty)} outlet + ${formatNumber(
              summary.stockQty
            )} inventory`}
            tone="blue"
          />
          <SummaryCard
            icon={CircleDollarSign}
            label="Total Purchase Amount"
            value={formatMoney(summary.totalPurchaseAmount)}
            detail="Outlet and inventory purchase value"
            tone="green"
          />
          <SummaryCard
            icon={Store}
            label="Outlet Stock"
            value={formatNumber(summary.outletStockQty)}
            detail={`${formatNumber(summary.outletProductsCount)} product lines`}
            tone="amber"
          />
          <SummaryCard
            icon={Warehouse}
            label="Inventory Stock"
            value={formatNumber(summary.stockQty)}
            detail={`${formatNumber(summary.productsCount)} product lines`}
            tone="indigo"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SummaryCard
            icon={PackageCheck}
            label="Inventory Purchase"
            value={formatMoney(summary.inventoryPurchaseAmount)}
            detail="Purchase value in inventory"
            tone="slate"
          />
          <SummaryCard
            icon={ArrowDownUp}
            label="Transactions"
            value={formatNumber(summary.transactionsCount)}
            detail={`In transit: ${formatNumber(summary.transitQty)} qty`}
            tone="slate"
          />
          <SummaryCard
            icon={Truck}
            label="In Transit"
            value={formatNumber(summary.transitCount)}
            detail={`Transit qty: ${formatNumber(summary.transitQty)}`}
            tone="slate"
          />
        </div>

        <div className="flex flex-wrap gap-2 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 px-4 py-2 text-sm font-semibold ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'outlets' ? (
          <OutletStockTable
            products={summary.selectedOutletProducts}
            loading={outletProductsLoading}
            outlets={outlets}
            selectedOutletId={selectedOutletId}
            onOutletChange={setSelectedOutletId}
          />
        ) : null}

        {activeTab === 'inventory' ? (
          <InventoryProductsTable
            products={summary.selectedInventoryProducts}
            loading={loading}
            warehouses={warehouses}
            selectedWarehouseId={selectedWarehouseId}
            onWarehouseChange={setSelectedWarehouseId}
          />
        ) : null}

        {activeTab === 'transactions' ? (
          <StockTransactionsTable transactions={transactions} />
        ) : null}

        {activeTab === 'transit' ? (
          <TransitProductsTable
            transitProducts={transitProducts}
            dispatchOrders={inventoryDispatchOrders}
            loading={loading}
          />
        ) : null}
      </section>
    </StockManagerLayout>
  );
};

export default StockPage;
