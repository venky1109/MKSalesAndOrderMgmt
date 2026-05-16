import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Edit3,
  PackagePlus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import StockManagerLayout from '../components/StockManagerLayout';
import {
  deletePOSOrder,
  deletePOSOrderItem,
  fetchPOSOrderDetails,
  fetchPOSOrders,
  updatePOSOrder,
} from '../features/orders/orderSlice';
import { fetchAllProducts } from '../features/products/productSlice';
import {
  APPROVED_DISCOUNT_MESSAGE,
  calculateOrderDiscount,
  getOrderDiscountSummary,
  MAX_ORDER_DISCOUNT_PERCENT,
  ORDER_DISCOUNT_ROLES,
} from '../utils/orderDiscount';

const asArray = (value) => (Array.isArray(value) ? value : []);
const money = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getItemId = (item) => item?._id || item?.itemId || item?.id || '';

const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const parseWeight = (weight) => {
  const raw = String(weight || '').trim();
  const match = raw.match(/^([\d.]+)\s*(.*)$/);
  if (!match) return { quantity: 0, units: '', weight: raw };

  return {
    quantity: Number(match[1] || 0),
    units: (match[2] || '').trim(),
    weight: raw,
  };
};

const findCatalogMatch = (item, catalog) => {
  const productId = item?.productId || item?.productID || '';
  const brandId = item?.brandId || item?.brandID || '';
  const financialId = item?.financialId || item?.financialID || '';
  const itemName = normalizeText(item?.name || item?.item);
  const itemPrice = Number(item?.price ?? item?.pricePerQty ?? item?.dprice ?? 0);
  const parsedWeight = parseWeight(item?.weight);

  return catalog.find((catalogItem) => {
    const idsMatch =
      productId &&
      catalogItem.productId === productId &&
      (!brandId || catalogItem.brandId === brandId) &&
      (!financialId || catalogItem.financialId === financialId);

    if (idsMatch) return true;

    const catalogName = normalizeText(catalogItem.name);
    const namesMatch =
      itemName &&
      (catalogName.includes(itemName) || itemName.includes(catalogName));
    const pricesMatch =
      !itemPrice || Number(catalogItem.price || 0) === itemPrice;
    const weightsMatch =
      !parsedWeight.quantity ||
      (Number(catalogItem.quantity || 0) === parsedWeight.quantity &&
        normalizeText(catalogItem.units) === normalizeText(parsedWeight.units));

    return namesMatch && pricesMatch && weightsMatch;
  });
};

const normalizeDetailItems = (order, catalog = []) => {
  const sourceItems = asArray(order?.orderItems).length
    ? asArray(order?.orderItems)
    : asArray(order?.items);

  return sourceItems.map((item, index) => {
    const catalogMatch = findCatalogMatch(item, catalog);
    const qty = Number(item?.qty ?? item?.quantityOrdered ?? 1);
    const price = Number(item?.price ?? item?.pricePerQty ?? item?.dprice ?? 0);
    const parsedWeight = parseWeight(item?.weight);
    const catalogQty = Number(
      item?.quantity ??
        item?.catalogQuantity ??
        catalogMatch?.quantity ??
        parsedWeight.quantity ??
        0
    );
    const units = item?.units || catalogMatch?.units || parsedWeight.units || '';
    const labelWeight = item?.weight || [catalogQty || '', units].filter(Boolean).join(' ');

    return {
      _rowKey: getItemId(item) || `row-${index}`,
      _id: getItemId(item),
      name: item?.name || item?.item || catalogMatch?.name || '',
      category: item?.category || catalogMatch?.category || '',
      quantity: catalogQty,
      units,
      weight: labelWeight,
      brand: item?.brand || catalogMatch?.brand || '',
      qty: Number.isFinite(qty) && qty > 0 ? qty : 1,
      image: item?.image || catalogMatch?.image || '',
      price: price || catalogMatch?.price || 0,
      product_code: item?.product_code || item?.productCode || catalogMatch?.product_code || '',
      productId: item?.productId || item?.productID || catalogMatch?.productId || '',
      brandId: item?.brandId || item?.brandID || catalogMatch?.brandId || '',
      financialId: item?.financialId || item?.financialID || catalogMatch?.financialId || '',
    };
  });
};

const buildPayloadItems = (items) =>
  items.map((item) => ({
    ...(item._id ? { _id: item._id } : {}),
    name: item.name,
    category: item.category,
    quantity: Number(item.quantity || 0),
    units: item.units,
    brand: item.brand,
    qty: Number(item.qty || 0),
    image: item.image || '',
    price: Number(item.price || 0),
    product_code: item.product_code || '',
    productId: item.productId,
    brandId: item.brandId,
    financialId: item.financialId,
  }));

const flattenProducts = (products) =>
  asArray(products).flatMap((product) =>
    asArray(product?.details).flatMap((detail) =>
      asArray(detail?.financials).map((financial) => ({
        key: [product?._id, detail?._id, financial?._id].filter(Boolean).join(':'),
        name: product?.name || '',
        category: product?.category || '',
        brand: detail?.brand || '',
        productId: product?._id || '',
        brandId: detail?._id || '',
        financialId: financial?._id || '',
        quantity: Number(financial?.quantity || 0),
        units: financial?.units || '',
        price: Number(financial?.dprice || financial?.price || 0),
        mrp: Number(financial?.price || 0),
        product_code: product?.product_code || product?.productCode || '',
        image: detail?.images?.[0]?.image || '',
        stock: Number(financial?.countInStock || 0),
      }))
    )
  );

const OrderManagementPage = () => {
  const dispatch = useDispatch();
  const userInfo = useSelector((state) => state.posUser?.userInfo);
  const token = useSelector((state) => state.posUser?.userInfo?.token);
  const orders = useSelector((state) => state.orders?.posOrdersList || []);
  const ordersLoading = useSelector((state) => state.orders?.posOrdersListLoading);
  const ordersError = useSelector((state) => state.orders?.posOrdersListError);
  const selectedOrder = useSelector((state) => state.orders?.posOrderDetails);
  const detailsLoading = useSelector((state) => state.orders?.posOrderDetailsLoading);
  const saving = useSelector((state) => state.orders?.posOrderMutationLoading);
  const products = useSelector((state) => state.products?.all || []);

  const [filters, setFilters] = useState({
    date: '',
    customerNumber: '',
    posUser: '',
    location: '',
  });
  const [draftItems, setDraftItems] = useState([]);
  const [remarks, setRemarks] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('0');
  const [discountMessage, setDiscountMessage] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const canApplyOrderDiscount = ORDER_DISCOUNT_ROLES.includes(
    String(userInfo?.role || '').toUpperCase()
  );

  const catalog = useMemo(() => flattenProducts(products), [products]);
  const catalogMatches = useMemo(() => {
    const search = productSearch.trim().toLowerCase();
    if (!search) return catalog.slice(0, 20);
    return catalog
      .filter((item) =>
        [item.name, item.brand, item.product_code]
          .join(' ')
          .toLowerCase()
          .includes(search)
      )
      .slice(0, 20);
  }, [catalog, productSearch]);

  const selectedTotal = useMemo(
    () =>
      draftItems.reduce(
        (sum, item) => sum + Number(item.qty || 0) * Number(item.price || 0),
        0
      ),
    [draftItems]
  );
  const selectedDiscount = useMemo(
    () => calculateOrderDiscount(selectedTotal, discountPercentage),
    [discountPercentage, selectedTotal]
  );
  const getDisplayedOrderDiscount = useCallback(
    (order) => getOrderDiscountSummary(order),
    []
  );

  const loadOrders = useCallback(async () => {
    await dispatch(
      fetchPOSOrders({
        mode: 'filter',
        date: filters.date,
        customerNumber: filters.customerNumber,
        phone: filters.customerNumber,
        posUser: filters.posUser,
        location: filters.location,
      })
    ).unwrap();
  }, [dispatch, filters]);

  useEffect(() => {
    dispatch(fetchPOSOrders({ mode: 'today' }));
  }, [dispatch]);

  useEffect(() => {
    if (token) dispatch(fetchAllProducts(token));
  }, [dispatch, token]);

  useEffect(() => {
    setDraftItems(normalizeDetailItems(selectedOrder, catalog));
    setRemarks('');
    setDiscountPercentage(String(selectedOrder?.discountPercentage || 0));
    setDiscountMessage('');
  }, [selectedOrder, catalog]);

  const openOrder = async (id) => {
    await dispatch(fetchPOSOrderDetails(id)).unwrap();
  };

  const updateItem = (index, field, value) => {
    setDraftItems((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  };

  const addCatalogItem = (item) => {
    setDraftItems((items) => [
      ...items,
      {
        _rowKey: `new-${Date.now()}`,
        _id: '',
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        units: item.units,
        weight: [item.quantity || '', item.units].filter(Boolean).join(' '),
        brand: item.brand,
        qty: 1,
        image: item.image,
        price: item.price,
        product_code: item.product_code,
        productId: item.productId,
        brandId: item.brandId,
        financialId: item.financialId,
      },
    ]);
    setProductSearch('');
  };

  const removeDraftOnlyItem = (index) => {
    setDraftItems((items) => items.filter((_, itemIndex) => itemIndex !== index));
  };

  const deletePersistedItem = async (item) => {
    if (!selectedOrder?._id || !item?._id) return;
    if (!window.confirm(`Delete ${item.name || 'this item'} from the order?`)) return;

    await dispatch(
      deletePOSOrderItem({
        orderId: selectedOrder._id,
        itemId: item._id,
        remarks,
      })
    ).unwrap();
    await dispatch(fetchPOSOrderDetails(selectedOrder._id)).unwrap();
    await loadOrders();
  };

  const saveOrder = async () => {
    if (!selectedOrder?._id) return;
    if (draftItems.length === 0) {
      alert('Order must have at least one item.');
      return;
    }
    if (
      canApplyOrderDiscount &&
      (Number.isNaN(Number(discountPercentage || 0)) ||
        Number(discountPercentage || 0) < 0 ||
        Number(discountPercentage || 0) > MAX_ORDER_DISCOUNT_PERCENT)
    ) {
      setDiscountPercentage(String(MAX_ORDER_DISCOUNT_PERCENT));
      setDiscountMessage(APPROVED_DISCOUNT_MESSAGE);
      return;
    }

    await dispatch(
      updatePOSOrder({
        id: selectedOrder._id,
        orderItems: buildPayloadItems(draftItems),
        remarks,
        ...(canApplyOrderDiscount
          ? {
              discountPercentage: selectedDiscount.discountPercentage,
              discountAmount: selectedDiscount.discountAmount,
              totalPrice: selectedDiscount.totalAfterDiscount,
            }
          : {}),
      })
    ).unwrap();
    await loadOrders();
    await dispatch(fetchPOSOrderDetails(selectedOrder._id)).unwrap();
  };

  const handleDiscountChange = (value) => {
    const nextDiscount = calculateOrderDiscount(selectedTotal, value);

    if (nextDiscount.clamped) {
      setDiscountPercentage(String(MAX_ORDER_DISCOUNT_PERCENT));
      setDiscountMessage(APPROVED_DISCOUNT_MESSAGE);
      return;
    }

    setDiscountPercentage(value);
    setDiscountMessage('');
  };

  const deleteOrder = async () => {
    if (!selectedOrder?._id) return;
    const id = selectedOrder.MK_order_id || selectedOrder._id;
    if (!window.confirm(`Delete order ${id}? This cannot be undone.`)) return;

    await dispatch(deletePOSOrder(selectedOrder._id)).unwrap();
    await loadOrders();
  };

  return (
    <StockManagerLayout>
      <main className="space-y-4">
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
              <p className="text-sm text-gray-500">
                Search, edit items, record remarks, and remove orders.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[150px_170px_170px_170px_auto]">
              <FilterInput
                label="Date"
                type="date"
                value={filters.date}
                onChange={(value) => setFilters((prev) => ({ ...prev, date: value }))}
              />
              <FilterInput
                label="Customer number"
                value={filters.customerNumber}
                onChange={(value) =>
                  setFilters((prev) => ({ ...prev, customerNumber: value }))
                }
              />
              <FilterInput
                label="POS user"
                value={filters.posUser}
                onChange={(value) => setFilters((prev) => ({ ...prev, posUser: value }))}
              />
              <FilterInput
                label="Location"
                value={filters.location}
                onChange={(value) =>
                  setFilters((prev) => ({ ...prev, location: value }))
                }
              />
              <button
                type="button"
                onClick={loadOrders}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800"
              >
                <Search size={16} />
                Search
              </button>
            </div>
          </div>
        </section>

        {ordersError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {ordersError}
          </div>
        ) : null}

        <section className="grid gap-4 xl:grid-cols-[420px_1fr]">
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="font-bold text-gray-900">Orders</h2>
              <button
                type="button"
                onClick={loadOrders}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                <RefreshCw size={15} />
                Refresh
              </button>
            </div>

            <div className="max-h-[calc(100vh-265px)] overflow-auto">
              {ordersLoading ? (
                <EmptyState text="Loading orders..." />
              ) : orders.length === 0 ? (
                <EmptyState text="No orders found." />
              ) : (
                <div className="divide-y divide-gray-100">
                  {orders.map((order) => (
                    <button
                      type="button"
                      key={order._id}
                      onClick={() => openOrder(order._id)}
                      className={`block w-full px-4 py-3 text-left hover:bg-blue-50 ${
                        selectedOrder?._id === order._id ? 'bg-blue-50' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-bold text-gray-900">
                            {order.MK_order_id || order._id}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {formatDateTime(order.createdAt)}
                          </p>
                          <p className="mt-1 text-sm text-gray-700">
                            {order.phoneNo || order.user?.phoneNo || '-'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">
                            {money(getDisplayedOrderDiscount(order).totalAfterDiscount)}
                          </p>
                          {getDisplayedOrderDiscount(order).discountAmount > 0 ? (
                            <p className="mt-1 text-xs font-semibold text-green-700">
                              Disc {money(getDisplayedOrderDiscount(order).discountAmount)}
                            </p>
                          ) : null}
                          <p className="mt-1 text-xs text-gray-500">
                            {order.posUserName || '-'}
                          </p>
                        </div>
                      </div>
                      <p className="mt-2 truncate text-xs text-gray-500">
                        {order.posLocation || '-'}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            {!selectedOrder ? (
              <EmptyState text="Select an order to edit." />
            ) : detailsLoading ? (
              <EmptyState text="Loading order details..." />
            ) : (
              <div className="space-y-4 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedOrder.MK_order_id || selectedOrder._id}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {formatDateTime(selectedOrder.createdAt)} |{' '}
                      {selectedOrder.phoneNo || selectedOrder.user?.phoneNo || '-'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {selectedOrder.posUserName || '-'} |{' '}
                      {selectedOrder.posLocation || '-'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={saveOrder}
                      disabled={saving}
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-green-700 px-4 text-sm font-semibold text-white hover:bg-green-800 disabled:bg-gray-400"
                    >
                      <Save size={16} />
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={deleteOrder}
                      disabled={saving}
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-gray-400"
                    >
                      <Trash2 size={16} />
                      Delete Order
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
                  <label className="block">
                    <span className="text-sm font-semibold text-gray-700">
                      Remarks
                    </span>
                    <textarea
                      value={remarks}
                      onChange={(event) => setRemarks(event.target.value)}
                      placeholder="Optional. Backend adds default added/removed item remarks with date."
                      className="mt-1 h-20 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>

                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="text-sm font-semibold text-gray-500">Items total</p>
                    <p className="mt-1 text-xl font-bold text-gray-900">
                      {money(selectedTotal)}
                    </p>
                    {canApplyOrderDiscount ? (
                      <div className="mt-3 space-y-2 border-t border-gray-200 pt-3">
                        <label className="block">
                          <span className="text-xs font-bold uppercase text-gray-500">
                            Discount %
                          </span>
                          <input
                            type="number"
                            min="0"
                            max={MAX_ORDER_DISCOUNT_PERCENT}
                            step="0.01"
                            value={discountPercentage}
                            onChange={(event) => handleDiscountChange(event.target.value)}
                            className="mt-1 h-9 w-full rounded-lg border border-gray-300 px-2 text-right text-sm outline-none focus:border-blue-500"
                          />
                        </label>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between text-green-700">
                            <span>Discount</span>
                            <strong>{money(selectedDiscount.discountAmount)}</strong>
                          </div>
                          <div className="flex justify-between text-gray-900">
                            <span>Payable</span>
                            <strong>{money(selectedDiscount.totalAfterDiscount)}</strong>
                          </div>
                          {discountMessage ? (
                            <p className="rounded-md bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-700">
                              {discountMessage}
                            </p>
                          ) : null}
                          <p className="text-xs font-semibold text-gray-500">
                            Max {MAX_ORDER_DISCOUNT_PERCENT}%. Rounded down to rupees.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-gray-500">
                        Payable: {money(selectedOrder.totalPrice || selectedTotal)}
                      </p>
                    )}
                    <p className="mt-2 text-sm text-gray-500">{draftItems.length} item(s)</p>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 border-b bg-gray-50 px-3 py-2">
                    <PackagePlus size={18} className="text-gray-500" />
                    <input
                      value={productSearch}
                      onChange={(event) => setProductSearch(event.target.value)}
                      placeholder="Search catalog to add item"
                      className="h-9 flex-1 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  {productSearch ? (
                    <div className="max-h-48 overflow-auto divide-y divide-gray-100">
                      {catalogMatches.map((item) => (
                        <button
                          type="button"
                          key={item.key}
                          onClick={() => addCatalogItem(item)}
                          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-blue-50"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-gray-900">
                              {item.name}
                            </span>
                            <span className="block truncate text-xs text-gray-500">
                              {item.brand} | {item.quantity} {item.units} | Stock {item.stock}
                            </span>
                          </span>
                          <span className="text-sm font-bold text-gray-900">
                            {money(item.price)}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="overflow-auto rounded-lg border border-gray-200">
                  <table className="min-w-[980px] w-full text-sm">
                    <thead className="bg-gray-100 text-left text-xs font-bold uppercase text-gray-500">
                      <tr>
                        <th className="px-3 py-3">Item</th>
                        <th className="px-3 py-3">Category</th>
                        <th className="px-3 py-3">Brand</th>
                        <th className="px-3 py-3">Weight</th>
                        <th className="px-3 py-3">Units</th>
                        <th className="px-3 py-3 text-right">Order Qty</th>
                        <th className="px-3 py-3 text-right">Price</th>
                        <th className="px-3 py-3 text-right">Amount</th>
                        <th className="px-3 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {draftItems.map((item, index) => (
                        <tr key={item._rowKey}>
                          <td className="px-3 py-2">
                            <TextField
                              value={item.name}
                              onChange={(value) => updateItem(index, 'name', value)}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <TextField
                              value={item.category}
                              onChange={(value) => updateItem(index, 'category', value)}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <TextField
                              value={item.brand}
                              onChange={(value) => updateItem(index, 'brand', value)}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <NumberField
                              value={item.quantity}
                              onChange={(value) => updateItem(index, 'quantity', value)}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <TextField
                              value={item.units}
                              onChange={(value) => updateItem(index, 'units', value)}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <NumberField
                              value={item.qty}
                              onChange={(value) => updateItem(index, 'qty', value)}
                              align="right"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <NumberField
                              value={item.price}
                              onChange={(value) => updateItem(index, 'price', value)}
                              align="right"
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-gray-900">
                            {money(Number(item.qty || 0) * Number(item.price || 0))}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                item._id ? deletePersistedItem(item) : removeDraftOnlyItem(index)
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                              aria-label="Delete item"
                            >
                              {item._id ? <Trash2 size={16} /> : <X size={16} />}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {asArray(selectedOrder.remarks).length ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="mb-2 flex items-center gap-2 font-bold text-gray-900">
                      <Edit3 size={16} />
                      Remarks history
                    </div>
                    <div className="max-h-36 space-y-2 overflow-auto text-sm text-gray-700">
                      {selectedOrder.remarks.map((remark, index) => (
                        <p key={index}>
                          {typeof remark === 'string'
                            ? remark
                            : [remark.message || remark.text, formatDateTime(remark.createdAt)]
                                .filter(Boolean)
                                .join(' | ')}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </section>
      </main>
    </StockManagerLayout>
  );
};

const FilterInput = ({ label, value, onChange, type = 'text' }) => (
  <label className="block">
    <span className="text-xs font-bold uppercase text-gray-500">{label}</span>
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="mt-1 h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
    />
  </label>
);

const TextField = ({ value, onChange }) => (
  <input
    type="text"
    value={value}
    onChange={(event) => onChange(event.target.value)}
    className="h-9 w-full rounded-lg border border-gray-300 px-2 text-sm outline-none focus:border-blue-500"
  />
);

const NumberField = ({ value, onChange, align = 'left' }) => (
  <input
    type="number"
    min="0"
    step="0.01"
    value={value}
    onChange={(event) => onChange(event.target.value)}
    className={`h-9 w-full rounded-lg border border-gray-300 px-2 text-sm outline-none focus:border-blue-500 ${
      align === 'right' ? 'text-right' : ''
    }`}
  />
);

const EmptyState = ({ text }) => (
  <div className="flex min-h-[220px] items-center justify-center p-6 text-center text-sm font-semibold text-gray-500">
    {text}
  </div>
);

export default OrderManagementPage;
