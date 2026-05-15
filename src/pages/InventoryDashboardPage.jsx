import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Activity,
  AlertTriangle,
  ArrowDownUp,
  Boxes,
  CalendarDays,
  CircleDollarSign,
  Clock,
  PackageCheck,
  PackagePlus,
  RefreshCw,
  ShoppingCart,
  Store,
  Users,
  Warehouse,
} from "lucide-react";

import StockManagerLayout from "../components/StockManagerLayout";
import { fetchInventoryDashboard } from "../features/inventory/inventoryDashboardSlice";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const numberFormat = new Intl.NumberFormat("en-IN");

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.rows)) return value.rows;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.products)) return value.products;
  if (Array.isArray(value?.outlets)) return value.outlets;
  return [];
};

const first = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const asNumber = (...values) => Number(first(...values, 0)) || 0;

const formatNumber = (value) => numberFormat.format(Number(value || 0));

const formatMoney = (value) => inr.format(Number(value || 0));

const roundNumber = (value) => Number(Number(value || 0).toFixed(2));

const getStockCount = (row) =>
  asNumber(row?.stockCount, row?.countInStock, row?.stock, row?.qty);

const formatPack = (row) => {
  const quantity = first(
    row?.packQuantity,
    row?.pack_quantity,
    row?.barcodeQuantity,
    row?.barcode_quantity,
    row?.quantity
  );
  const unit = first(row?.units, row?.unit, row?.unitShortCode, row?.unit_short_code);

  if (row?.weight) return row.weight;
  if (quantity && unit) return `${quantity} ${unit}`.trim();
  if (quantity) return String(quantity);
  if (unit) return String(unit);
  return first(row?.pack, "-");
};

const uniqueProductRows = (rows = []) => {
  const seen = new Set();

  return rows.filter((row) => {
    const key = [
      row?.source,
      row?.productId,
      row?.financialId,
      row?.productBarcodeId,
      row?.name,
      row?.brand,
    ].join("|");

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
};

const getRows = (section, keys = []) => {
  for (const key of keys) {
    const rows = toArray(section?.[key]);
    if (rows.length) return rows;
  }

  return toArray(section);
};

const getSectionNumber = (section, paths = []) => {
  for (const path of paths) {
    const value = path.split(".").reduce((current, key) => current?.[key], section);
    if (value !== undefined && value !== null && value !== "") {
      return Number(value) || 0;
    }
  }

  return 0;
};

const StatTile = ({ icon: Icon, label, value, tone = "slate", hint }) => {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-900",
    blue: "border-sky-200 bg-sky-50 text-sky-900",
    green: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
  };

  return (
    <div className={`rounded-lg border p-4 shadow-sm ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold">{value}</p>
        </div>
        <Icon size={22} className="shrink-0 opacity-80" />
      </div>
      {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
};

const Section = ({ title, icon: Icon, children, action }) => (
  <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
    <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
      <div className="flex items-center gap-2">
        <Icon size={18} className="text-slate-600" />
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
      </div>
      {action}
    </div>
    <div className="p-4">{children}</div>
  </section>
);

const EmptyState = ({ message = "No records found for this period." }) => (
  <div className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
    {message}
  </div>
);

const DataTable = ({ columns, rows, rowKey, emptyMessage }) => {
  if (!rows.length) return <EmptyState message={emptyMessage} />;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-3 py-2 font-bold ${
                  column.align === "right" ? "text-right" : "text-left"
                }`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={rowKey ? rowKey(row, index) : index}
              className="border-t border-slate-100"
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-3 py-2 text-slate-700 ${
                    column.align === "right" ? "text-right" : "text-left"
                  }`}
                >
                  {column.render ? column.render(row, index) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const SectionError = ({ message }) =>
  message ? (
    <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
      {message}
    </div>
  ) : null;

export default function InventoryDashboardPage() {
  const dispatch = useDispatch();
  const dashboard = useSelector((state) => state.inventoryDashboard || {});
  const userInfo = useSelector((state) => state.posUser?.userInfo);
  const [filters, setFilters] = useState({ days: 7, outlet: "", limit: 10 });

  const loadDashboard = useCallback(() => {
    dispatch(fetchInventoryDashboard(filters));
  }, [dispatch, filters]);

  useEffect(() => {
    if (userInfo?.token) {
      loadDashboard();
    }
  }, [loadDashboard, userInfo?.token]);

  const sections = {
    summary: dashboard.summary?.data || {},
    products: dashboard.products?.data || {},
    orders: dashboard.orders?.data || {},
    customers: dashboard.customers?.data || {},
    finance: dashboard.finance?.data || {},
  };

  const productSection = useMemo(
    () => ({
      ...(sections.summary?.products || {}),
      ...(sections.products?.products || {}),
      ...sections.products,
    }),
    [sections.products, sections.summary]
  );

  const productRows = useMemo(() => {
    const outOfStock = [
      ...getRows(productSection, ["outOfStockProducts", "out_of_stock"]),
      ...getRows(productSection, ["outletOutOfStockProducts"]).map(
        (product) => ({
          ...product,
          source: "Outlet",
        })
      ),
      ...getRows(productSection, ["warehouseOutOfStockProducts"]).map(
        (product) => ({
          ...product,
          source: "Warehouse",
        })
      ),
    ];

    const reorder = uniqueProductRows([
        ...getRows(productSection, [
          "productsRequiringOrder",
          "reorderProducts",
          "lowStockProducts",
        ]),
        ...getRows(productSection, ["outletProductsRequiringOrder"]).map(
          (product) => ({
            ...product,
            source: "Outlet",
          })
        ),
        ...getRows(productSection, ["warehouseProductsRequiringOrder"]).map(
          (product) => ({
            ...product,
            source: "Warehouse",
          })
        ),
        ...outOfStock,
      ]).filter((product) => getStockCount(product) < 10);

    return {
      outletTop: getRows(productSection, [
        "outletTopProducts",
        "topOutletProducts",
        "top_products",
        "topProducts",
        "outletProducts",
      ]),
      warehouseTop: getRows(productSection, [
        "warehouseTopProducts",
        "topWarehouseProducts",
        "topDispatchedProducts",
        "warehouseProducts",
      ]),
      reorder,
      newProducts: [
        ...getRows(productSection, ["newProducts", "newProductsAddedLastWeek"]),
        ...getRows(productSection, ["newOutletProducts"]).map((product) => ({
          ...product,
          source: "Outlet",
        })),
        ...getRows(productSection, ["newWarehouseProducts"]).map((product) => ({
          ...product,
          source: "Warehouse",
        })),
      ],
      outOfStock,
    };
  }, [productSection]);

  const outletCustomers = useMemo(
    () =>
      getRows(sections.customers, [
        "newCustomersOutletwise",
        "outletwiseNewCustomers",
        "outletCustomers",
        "customersByOutlet",
      ]),
    [sections.customers]
  );

  const productProfitRows = useMemo(
    () =>
      getRows(sections.finance?.outlets || sections.finance, [
        "productProfit",
        "productProfitRows",
      ]),
    [sections.finance]
  );

  const topOrderRows = useMemo(() => {
    const rows = getRows(sections.orders?.outlets || sections.orders, [
      "topOrders",
      "topOutletOrders",
      "highestOrders",
    ]);

    return rows
      .map((order) => ({
        ...order,
        amount: asNumber(order.amount, order.totalAmount, order.totalPrice),
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [sections.orders]);

  const outletOrders = getSectionNumber(sections.orders, [
    "outletOrders",
    "outletOrderCount",
    "outlets.totalOrders",
  ]);
  const warehouseOrders = getSectionNumber(sections.orders, [
    "warehouseOrders",
    "warehouseOrderCount",
    "warehouse.totalOrders",
  ]);
  const totalOrders =
    getSectionNumber(sections.orders, ["totalOrders", "totalOrderCount"]) ||
    outletOrders + warehouseOrders;
  const orderAmount = getSectionNumber(sections.orders, [
    "totalOrderAmount",
    "orderAmount",
    "outlets.totalAmount",
  ]);
  const averageOrders = getSectionNumber(sections.orders, [
    "averageOrdersPerWeek",
    "avgOrdersPerWeek",
    "outlets.averageOrdersPerWeek",
  ]);

  const outletSales = getSectionNumber(sections.finance, [
    "outletSales",
    "outletSalesAmount",
    "totalOutletSales",
    "outlets.saleAmount",
  ]);
  const warehouseDispatch = getSectionNumber(sections.finance, [
    "warehouseDispatchValue",
    "warehouseDispatchAmount",
    "warehouseSales",
    "warehouse.dispatchValueAtCost",
  ]);
  const totalProfit = getSectionNumber(sections.finance, [
    "totalProfit",
    "estimatedProfit",
    "lastWeekProfit",
    "outlets.estimatedProfit",
  ]);
  const displayProfit = outletSales ? roundNumber(outletSales * 0.05) : totalProfit;

  const productColumns = [
    {
      key: "name",
      label: "Product",
      render: (row) =>
        first(row.productName, row.name, row.itemName, row.product_code, "-"),
    },
    {
      key: "brand",
      label: "Brand",
      render: (row) => first(row.brand, row.brandName, "-"),
    },
    {
      key: "pack",
      label: "Pack",
      render: (row) => formatPack(row),
    },
    {
      key: "quantity",
      label: "Qty",
      align: "right",
      render: (row) =>
        formatNumber(
        asNumber(row.quantity, row.qtySold, row.totalQty, row.stockCount)
        ),
    },
    {
      key: "amount",
      label: "Amount",
      align: "right",
      render: (row) =>
        asNumber(row.amount, row.saleAmount, row.revenue, row.totalAmount, row.dispatchValue)
          ? formatMoney(
              asNumber(
                row.amount,
                row.saleAmount,
                row.revenue,
                row.totalAmount,
                row.dispatchValue
              )
            )
          : "-",
    },
  ];

  const stockColumns = [
    {
      key: "name",
      label: "Product",
      render: (row) => first(row.productName, row.name, row.itemName, "-"),
    },
    {
      key: "brand",
      label: "Brand",
      render: (row) => first(row.brand, row.brandName, "-"),
    },
    {
      key: "source",
      label: "Source",
      render: (row) => first(row.source, row.outletName, row.warehouseName, "-"),
    },
    {
      key: "pack",
      label: "Pack",
      render: (row) => formatPack(row),
    },
    {
      key: "stock",
      label: "Stock",
      align: "right",
      render: (row) => formatNumber(getStockCount(row)),
    },
  ];

  return (
    <StockManagerLayout>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-950">
              Inventory Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Warehouse, outlet, customer and finance movement for the selected
              period.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex h-10 items-center gap-2 rounded-lg border bg-white px-3 text-sm font-semibold text-slate-600">
              <CalendarDays size={16} />
              <select
                value={filters.days}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    days: Number(event.target.value),
                  }))
                }
                className="bg-transparent outline-none"
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
              </select>
            </label>

            <input
              value={filters.outlet}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  outlet: event.target.value,
                }))
              }
              placeholder="Outlet"
              className="h-10 w-36 rounded-lg border bg-white px-3 text-sm font-semibold outline-none focus:border-sky-500"
            />

            <button
              onClick={loadDashboard}
              disabled={dashboard.loading}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-800 px-4 text-sm font-bold text-white hover:bg-slate-900 disabled:bg-slate-400"
            >
              <RefreshCw size={16} />
              {dashboard.loading ? "Loading" : "Refresh"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatTile
            icon={ShoppingCart}
            label="Orders"
            value={formatNumber(totalOrders)}
            hint={`${formatMoney(orderAmount)} last ${filters.days} days`}
            tone="blue"
          />
          <StatTile
            icon={Clock}
            label="Average Orders"
            value={formatNumber(averageOrders)}
            hint="Per week"
            tone="slate"
          />
          <StatTile
            icon={Users}
            label="Customers"
            value={formatNumber(
              asNumber(
                sections.customers.totalCustomers,
                sections.summary.totalCustomers
              )
            )}
            hint={`${formatNumber(
              asNumber(
                sections.customers.newCustomers,
                sections.customers.newCustomersLastWeek
              )
            )} new`}
            tone="green"
          />
          <StatTile
            icon={CircleDollarSign}
            label="Profit"
            value={formatMoney(displayProfit)}
            hint={`Total sale ${formatMoney(outletSales)} · 5% profit`}
            tone="amber"
          />
        </div>

        <Section title="Products" icon={Boxes}>
          <SectionError message={dashboard.products?.error} />
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-bold text-slate-700">
                Top Outlet Products
              </h3>
              <DataTable columns={productColumns} rows={productRows.outletTop} />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-bold text-slate-700">
                Top Warehouse Dispatch
              </h3>
              <DataTable columns={productColumns} rows={productRows.warehouseTop} />
            </div>
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                <AlertTriangle size={15} /> Products Requiring Order
              </h3>
              <DataTable
                columns={stockColumns}
                rows={productRows.reorder}
                emptyMessage="No products found with stock count below 10."
              />
            </div>
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                <PackageCheck size={15} /> Out Of Stock
              </h3>
              <DataTable columns={stockColumns} rows={productRows.outOfStock} />
            </div>
          </div>

          <div className="mt-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
              <PackagePlus size={15} /> New Products Added
            </h3>
            <DataTable
              columns={[
                {
                  key: "name",
                  label: "Product",
                  render: (row) => first(row.productName, row.name, row.itemName, "-"),
                },
                {
                  key: "category",
                  label: "Category",
                  render: (row) => first(row.category, row.brand, row.brandName, "-"),
                },
                {
                  key: "brand",
                  label: "Brand",
                  render: (row) => first(row.brand, row.brandName, "-"),
                },
                {
                  key: "source",
                  label: "Source",
                  render: (row) =>
                    first(row.source, row.outletName, row.warehouseName, "-"),
                },
                {
                  key: "createdAt",
                  label: "Added",
                  align: "right",
                  render: (row) => formatDate(first(row.createdAt, row.addedAt)),
                },
              ]}
              rows={productRows.newProducts}
            />
          </div>
        </Section>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Section title="Orders" icon={ArrowDownUp}>
            <SectionError message={dashboard.orders?.error} />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <StatTile
                icon={Store}
                label="Outlet Orders"
                value={formatNumber(
                  outletOrders
                )}
                hint={formatMoney(
                  getSectionNumber(sections.orders, [
                    "outletOrderAmount",
                    "outletAmount",
                    "outlets.totalAmount",
                  ])
                )}
                tone="blue"
              />
              <StatTile
                icon={Warehouse}
                label="Warehouse Orders"
                value={formatNumber(
                  warehouseOrders
                )}
                hint={formatMoney(
                  getSectionNumber(sections.orders, [
                    "warehouseOrderAmount",
                    "warehouseAmount",
                    "warehouse.totalAmount",
                  ])
                )}
                tone="slate"
              />
              <StatTile
                icon={Activity}
                label="Weekly Avg"
                value={formatNumber(averageOrders)}
                hint="Order frequency"
                tone="green"
              />
            </div>
            <div className="mt-4">
              <h3 className="mb-2 text-sm font-bold text-slate-700">
                Top 5 Orders
              </h3>
              <DataTable
                columns={[
                  {
                    key: "orderId",
                    label: "Order ID",
                    render: (row) =>
                      first(row.orderId, row.MK_order_id, row._id, "-"),
                  },
                  {
                    key: "phone",
                    label: "Customer Phone",
                    render: (row) =>
                      first(row.phoneNo, row.phone, row.customerPhone, "-"),
                  },
                  {
                    key: "amount",
                    label: "Amount",
                    align: "right",
                    render: (row) => formatMoney(row.amount),
                  },
                ]}
                rows={topOrderRows}
                emptyMessage="No top orders found for this period."
              />
            </div>
          </Section>

          <Section title="Customers" icon={Users}>
            <SectionError message={dashboard.customers?.error} />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <StatTile
                icon={Users}
                label="Total"
                value={formatNumber(
                  asNumber(sections.customers.totalCustomers)
                )}
                tone="green"
              />
              <StatTile
                icon={Activity}
                label="Active"
                value={formatNumber(
                  asNumber(sections.customers.activeCustomers)
                )}
                tone="blue"
              />
              <StatTile
                icon={Clock}
                label="Frequency"
                value={formatNumber(
                  asNumber(
                    sections.customers.customerOrderFrequency,
                    sections.customers.avgOrderFrequency,
                    sections.customers.averageOrdersPerActiveCustomer
                  )
                )}
                hint="Orders per active customer"
                tone="amber"
              />
            </div>
            <div className="mt-4">
              <h3 className="mb-2 text-sm font-bold text-slate-700">
                New Customers Outletwise
              </h3>
              <DataTable
                columns={[
                  {
                    key: "outlet",
                    label: "Outlet",
                    render: (row) => first(row.outletName, row.outlet, "-"),
                  },
                  {
                    key: "newCustomers",
                    label: "New Customers",
                    align: "right",
                    render: (row) =>
                      formatNumber(asNumber(row.newCustomers, row.count)),
                  },
                  {
                    key: "activeCustomers",
                    label: "Active",
                    align: "right",
                    render: (row) =>
                      formatNumber(asNumber(row.activeCustomers, row.active)),
                  },
                ]}
                rows={outletCustomers}
              />
            </div>
          </Section>
        </div>

        <Section title="Finance" icon={CircleDollarSign}>
          <SectionError message={dashboard.finance?.error} />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <StatTile
              icon={Warehouse}
              label="Warehouse Dispatch"
              value={formatMoney(warehouseDispatch)}
              hint="Internal transfer value"
              tone="slate"
            />
            <StatTile
              icon={Store}
              label="Total Sale"
              value={formatMoney(outletSales)}
              hint="Customer sale amount"
              tone="blue"
            />
            <StatTile
              icon={CircleDollarSign}
              label="Total Profit"
              value={formatMoney(displayProfit)}
              hint="5% of outlet sales"
              tone="green"
            />
          </div>
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-bold text-slate-700">
              Product Profit
            </h3>
            <DataTable
              columns={[
                {
                  key: "name",
                  label: "Product",
                  render: (row) => first(row.name, row.productName, "-"),
                },
                {
                  key: "weight",
                  label: "Pack",
                  render: (row) => first(row.weight, row.pack, "-"),
                },
                {
                  key: "qty",
                  label: "Qty",
                  align: "right",
                  render: (row) => formatNumber(asNumber(row.qty, row.quantity)),
                },
                {
                  key: "revenue",
                  label: "Sale",
                  align: "right",
                  render: (row) => formatMoney(row.revenue),
                },
                {
                  key: "estimatedProfit",
                  label: "Profit 5%",
                  align: "right",
                  render: (row) =>
                    formatMoney(roundNumber(Number(row.revenue || 0) * 0.05)),
                },
              ]}
              rows={productProfitRows}
            />
          </div>
        </Section>
      </div>
    </StockManagerLayout>
  );
}
