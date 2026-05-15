import React, { useCallback, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, RefreshCw } from "lucide-react";
import { fetchTopProductsReport } from "../features/reports/topProductsReportSlice";
import { fetchAllProducts } from "../features/products/productSlice";

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const makeCsvValue = (value) => {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const safeKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const sortText = (a, b) => String(a || "").localeCompare(String(b || ""));

const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

const firstValue = (value) => (Array.isArray(value) ? value[0] || "" : value || "");

const getGeneratedCode = (index) => String(((index - 1) % 90000) + 10001);

const quantityKey = (value) => {
  const qty = Number(value);
  return Number.isFinite(qty) ? String(qty) : safeKey(value);
};

const normalizeUnit = (value) => {
  const unit = safeKey(value).replace(/\./g, "");
  if (["kgs", "kilogram", "kilograms"].includes(unit)) return "kg";
  if (["grams", "gram"].includes(unit)) return "g";
  if (["litre", "litres", "ltrs", "ltr"].includes(unit)) return "l";
  if (["pieces", "piece"].includes(unit)) return "pcs";
  return unit || "unit";
};

const limitGeneratedCode = (value, fallbackIndex) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits) return digits.slice(-5).padStart(5, "0");
  return getGeneratedCode(fallbackIndex);
};

const buildGeneratedLookup = (products = []) => {
  const categoryMap = new Map();
  const byProductFinancial = new Map();
  const byProductQuantity = new Map();
  const byProduct = new Map();
  const byLoose = new Map();

  for (const product of products) {
    const category = safeKey(firstValue(product?.category)) || "uncategorized";
    if (!categoryMap.has(category)) {
      categoryMap.set(category, { name: category, products: [] });
    }
    categoryMap.get(category).products.push(product);
  }

  let generatedIndex = 1;
  [...categoryMap.values()]
    .sort((a, b) => sortText(a.name, b.name))
    .forEach((category) => {
      const brandMap = new Map();

      for (const product of category.products) {
        for (const detail of asArray(product?.details)) {
          const brand = detail?.brand || "Unbranded";
          const brandKey = safeKey(brand) || "unbranded";
          if (!brandMap.has(brandKey)) brandMap.set(brandKey, new Map());

          const productMap = brandMap.get(brandKey);
          const productName = product?.name || product?.productName || "";
          const productKey = safeKey(productName);
          if (!productMap.has(productKey)) productMap.set(productKey, []);

          for (const financial of asArray(detail?.financials)) {
            productMap.get(productKey).push({ product, detail, financial, brand });
          }
        }
      }

      [...brandMap.entries()]
        .sort(([a], [b]) => sortText(a, b))
        .forEach(([, productMap]) => {
          [...productMap.entries()]
            .sort(([a], [b]) => sortText(a, b))
            .forEach(([, entries]) => {
              entries.forEach(({ product, detail, financial, brand }) => {
                const productId = String(product?._id || product?.id || "");
                const financialId = String(financial?._id || financial?.id || "");
                const packQuantity = Number(financial?.quantity || 1);
                const unit = financial?.units || "-";
                const rate = Number(financial?.dprice || financial?.price || 0);
                const generatedCode = getGeneratedCode(generatedIndex);
                generatedIndex += 1;
                const productCode =
                  product?.product_code || product?.productCode || productId || "-";
                const entry = {
                  productCode,
                  generatedCode,
                  productName: product?.name || "",
                  brand,
                  productId,
                  brandId: String(detail?._id || ""),
                  financialId,
                  packQuantity,
                  unit,
                  rate,
                };

                if (productId) byProduct.set(productId, entry);
                if (productId && financialId) {
                  byProductFinancial.set(`${productId}|${financialId}`, entry);
                }
                if (productId) {
                  byProductQuantity.set(
                    [
                      productId,
                      quantityKey(packQuantity),
                      normalizeUnit(unit),
                    ].join("|"),
                    entry
                  );
                }
                byLoose.set(
                  [
                    safeKey(product?.name),
                    safeKey(brand),
                    quantityKey(packQuantity),
                    normalizeUnit(unit),
                    rate.toFixed(2),
                  ].join("|"),
                  entry
                );
              });
            });
        });
    });

  return { byProductFinancial, byProductQuantity, byProduct, byLoose };
};

export default function TopProductsReportPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const rows = useSelector((s) => s.topProductsReport?.rows || []);
  const totals = useSelector((s) => s.topProductsReport?.totals || {});
  const range = useSelector((s) => s.topProductsReport?.range || {});
  const loading = useSelector((s) => s.topProductsReport?.loading || false);
  const error = useSelector((s) => s.topProductsReport?.error || "");
  const token = useSelector((s) => s.posUser?.userInfo?.token);
  const products = useSelector((s) =>
    Array.isArray(s.products?.all) ? s.products.all : []
  );

  const loadReport = useCallback(() => {
    dispatch(fetchTopProductsReport({ days: 30, limit: 150 }));
  }, [dispatch]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  useEffect(() => {
    if (token && !products.length) {
      dispatch(fetchAllProducts({ token, localFirst: true }));
    }
  }, [dispatch, products.length, token]);

  const generatedLookup = useMemo(() => buildGeneratedLookup(products), [products]);

  const displayRows = useMemo(
    () =>
      rows.map((row, index) => {
        const looseKey = [
          safeKey(row.productName),
          safeKey(row.brand),
          quantityKey(row.packQuantity),
          normalizeUnit(row.unit),
          Number(row.rate || 0).toFixed(2),
        ].join("|");
        const fallback =
          generatedLookup.byProductFinancial.get(
            `${row.productId}|${row.financialId}`
          ) ||
          generatedLookup.byProductQuantity.get(
            [
              String(row.productId || ""),
              quantityKey(row.packQuantity),
              normalizeUnit(row.unit),
            ].join("|")
          ) ||
          generatedLookup.byLoose.get(looseKey) ||
          {};
        const productFallback = generatedLookup.byProduct.get(
          String(row.productId || "")
        );

        return {
          ...row,
          productCode:
            row.productCode && row.productCode !== "-"
              ? row.productCode
              : fallback.productCode || productFallback?.productCode || "-",
          generatedCode:
            fallback.generatedCode ||
            limitGeneratedCode(row.generatedCode, index + 1),
        };
      }),
    [generatedLookup, rows]
  );

  const exportCsv = () => {
    const headers = [
      "Rank",
      "Product Code",
      "Generated Code",
      "Product",
      "Brand",
      "Pack Quantity",
      "Unit",
      "Rate",
      "Packs",
      "Total Qty",
      "Order Lines",
    ];
    const lines = [
      headers.map(makeCsvValue).join(","),
      ...displayRows.map((row, index) =>
        [
          index + 1,
          row.productCode,
          row.generatedCode,
          row.productName,
          row.brand,
          row.packQuantity,
          row.unit,
          row.rate,
          row.packs,
          row.totalQuantity,
          row.orderLines,
        ]
          .map(makeCsvValue)
          .join(",")
      ),
    ];

    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `top-150-products-${range.from || "last-30-days"}-to-${
      range.to || "today"
    }.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-3 md:p-5">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <button
                onClick={() => navigate("/pos")}
                className="mb-3 inline-flex h-9 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                <ArrowLeft size={16} />
                POS
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                Top 150 Products
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Orders from {formatDate(range.from)} to {formatDate(range.to)}.
                Data comes from backend report query.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={loadReport}
                disabled={loading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-700 px-4 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                <RefreshCw size={16} />
                {loading ? "Loading" : "Refresh"}
              </button>
              <button
                onClick={exportCsv}
                disabled={!displayRows.length}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 text-sm font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                <Download size={16} />
                CSV
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-gray-500">Products</div>
            <div className="mt-2 text-2xl font-bold text-gray-900">
              {totals.products || displayRows.length || 0}
            </div>
          </div>
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-gray-500">Packs</div>
            <div className="mt-2 text-2xl font-bold text-gray-900">
              {totals.packs || 0}
            </div>
          </div>
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-gray-500">
              Total Quantity
            </div>
            <div className="mt-2 text-2xl font-bold text-green-700">
              {totals.totalQuantity || 0}
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border bg-white shadow-sm">
          <div className="border-b px-4 py-3 text-sm font-bold text-gray-800">
            Product Order Summary
          </div>
          <div className="max-h-[65vh] overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-100">
                <tr>
                  <th className="px-3 py-2 text-left">Rank</th>
                  <th className="px-3 py-2 text-left">Code</th>
                  <th className="px-3 py-2 text-left">Generated</th>
                  <th className="px-3 py-2 text-left">Product</th>
                  <th className="px-3 py-2 text-left">Brand</th>
                  <th className="px-3 py-2 text-right">Pack</th>
                  <th className="px-3 py-2 text-left">Unit</th>
                  <th className="px-3 py-2 text-right">Rate</th>
                  <th className="px-3 py-2 text-right">Packs</th>
                  <th className="px-3 py-2 text-right">Total Qty</th>
                  <th className="px-3 py-2 text-right">Lines</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="11" className="px-3 py-8 text-center">
                      Loading report...
                    </td>
                  </tr>
                ) : displayRows.length ? (
                  displayRows.map((row, index) => (
                    <tr
                      key={`${row.productCode}-${row.generatedCode}-${row.productName}-${row.brand}-${row.packQuantity}-${row.unit}-${row.rate}`}
                      className="border-t"
                    >
                      <td className="px-3 py-2 font-semibold">{index + 1}</td>
                      <td className="px-3 py-2">{row.productCode || "-"}</td>
                      <td className="px-3 py-2">{row.generatedCode || "-"}</td>
                      <td className="px-3 py-2">{row.productName || "-"}</td>
                      <td className="px-3 py-2">{row.brand || "-"}</td>
                      <td className="px-3 py-2 text-right">
                        {row.packQuantity}
                      </td>
                      <td className="px-3 py-2">{row.unit || "-"}</td>
                      <td className="px-3 py-2 text-right">
                        {row.rate ? Number(row.rate).toFixed(2) : "-"}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {row.packs || 0}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {row.totalQuantity || 0}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {row.orderLines || 0}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="11"
                      className="px-3 py-8 text-center text-gray-500"
                    >
                      No product orders found for the last 30 days.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
