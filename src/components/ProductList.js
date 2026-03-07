import React, {
  forwardRef,
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAllProducts,
  fetchProductByBarcode,
} from "../features/products/productSlice";
import { addToCart } from "../features/cart/cartSlice";
import { FixedSizeGrid as Grid } from "react-window";
import { CiBarcode } from "react-icons/ci";

/** helpers */
const safeLower = (v) => (typeof v === "string" ? v.toLowerCase() : "");
const asArray = (v) => (Array.isArray(v) ? v : v != null ? [v] : []);

const calcDiscount = (price, dprice) => {
  const p = Number(price);
  const dp = Number(dprice);
  if (!Number.isFinite(p) || p <= 0 || !Number.isFinite(dp)) return 0;
  return Math.max(0, Math.round(((p - dp) / p) * 100));
};

const normalizeScan = (raw) => {
  let s = String(raw ?? "").trim();
  try {
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed) && parsed[0]) s = String(parsed[0]);
  } catch {}
  return s.replace(/\s+/g, "");
};

/** Offline catalog (store-first, localStorage fallback) + fast barcode map */
function useOfflineCatalog() {
  const storeAll = useSelector((s) => s.products?.all);
  const storeList = Array.isArray(storeAll)
    ? storeAll
    : Array.isArray(storeAll?.products)
    ? storeAll.products
    : [];

  const lsList = useMemo(() => {
    const keys = [
      "mkpos.products",
      "products",
      "allProducts",
      "catalog",
      "mkpos.products.json",
    ];

    for (const k of keys) {
      try {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
        if (Array.isArray(parsed?.products)) return parsed.products;
      } catch {}
    }
    return [];
  }, []);

  const list = storeList?.length ? storeList : lsList;

  const barcodeMap = useMemo(() => {
    const map = new Map();

    for (const p of list || []) {
      for (const d of asArray(p?.details)) {
        for (const f of asArray(d?.financials)) {
          let bars = Array.isArray(f?.barcode) ? f.barcode : [f?.barcode];
          bars = bars.filter(Boolean).map((b) => String(b).trim());

          for (const b of bars) {
            if (!b) continue;
            if (!map.has(b)) map.set(b, { p, d, f });
          }
        }
      }
    }

    return map;
  }, [list]);

  return { productsList: list, barcodeMap };
}

const ProductList = forwardRef((props, ref) => {
  const dispatch = useDispatch();

  const token = useSelector((state) => state.posUser.userInfo?.token);
  const { loading, error } = useSelector((state) => state.products || {});
  const { productsList: safeProducts, barcodeMap } = useOfflineCatalog();

  useEffect(() => {
    if (safeProducts?.length) {
      try {
        localStorage.setItem("mkpos.products", JSON.stringify(safeProducts));
      } catch {}
    }
  }, [safeProducts]);

  useEffect(() => {
    if (!safeProducts.length && token && navigator.onLine) {
      dispatch(fetchAllProducts(token));
    }
  }, [safeProducts.length, token, dispatch]);

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [search, setSearch] = useState("");

  const barcodeRef = useRef(null);
  const [barcodeInput, setBarcodeInput] = useState("");

  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  const gridWrapRef = useRef(null);
  const [gridSize, setGridSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = gridWrapRef.current;
    if (!el) return;

    const updateSize = () => {
      setGridSize({
        width: el.clientWidth,
        height: el.clientHeight,
      });
    };

    updateSize();

    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    window.addEventListener("resize", updateSize);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  const handleClearFilters = useCallback(() => {
    setCategoryFilter("all");
    setBrandFilter("all");
    setSearch("");
    setTimeout(() => barcodeRef.current?.focus(), 50);
  }, []);

  const addItemToCart = useCallback(
    (p, d, f) => {
      dispatch(
        addToCart({
          id: p._id,
          productId: p._id,
          item: p.name,
          productName: p.name,
          category: p.category,
          brand: d?.brand,
          brandId: d?._id,
          financialId: f?._id,
          price: Number(f?.price || 0),
          MRP: Number(f?.price || 0),
          dprice: Number(f?.dprice || 0),
          quantity: Number(f?.quantity || 0),
          countInStock: Number(f?.countInStock || 0),
          stock: Number(f?.countInStock || 0),
          units: f?.units,
          image: d?.images?.[0]?.image || "",
          catalogQuantity: Number(f?.quantity || 0),
          discount: calcDiscount(f?.price, f?.dprice),
          qty: 1,
          subtotal: Number(f?.dprice || 0),
        })
      );

      setTimeout(() => {
        barcodeRef.current?.focus();
      }, 50);
    },
    [dispatch]
  );

  const handleBarcode = useCallback(
    async (raw) => {
      const scanned = normalizeScan(raw);
      if (!scanned) return;

      const hit =
        barcodeMap.get(scanned) ||
        barcodeMap.get(scanned.replace(/^0+/, "")) ||
        null;

      if (hit) {
        const { p, d, f } = hit;
        addItemToCart(p, d, f);
        setBarcodeInput("");
        setTimeout(() => barcodeRef.current?.focus(), 50);
        return;
      }

      if (navigator.onLine) {
        try {
          const result = await dispatch(
            fetchProductByBarcode({ barcode: scanned, token })
          ).unwrap();

          if (result) dispatch(addToCart(result));
          else alert("❌ Product not found.");
        } catch (err) {
          alert("❌ Error: " + (err?.message || err));
        }
      } else {
        alert("📴 Offline and product not found in cache.");
      }

      setBarcodeInput("");
      setTimeout(() => barcodeRef.current?.focus(), 50);
    },
    [dispatch, token, barcodeMap, addItemToCart]
  );

  const filteredProducts = useMemo(() => {
    const s = safeLower(search);

    return (safeProducts || []).filter((product) => {
      const category = safeLower(product?.category);
      const details = asArray(product?.details);

      const matchCategory =
        categoryFilter === "all" || category === categoryFilter;

      const matchBrand =
        brandFilter === "all" ||
        details.some((d) => safeLower(d?.brand) === brandFilter);

      const matchSearch =
        !s ||
        safeLower(product?.name).includes(s) ||
        details.some((d) => safeLower(d?.brand).includes(s));

      return matchCategory && matchBrand && matchSearch;
    });
  }, [safeProducts, categoryFilter, brandFilter, search]);

  const filteredCategories = useMemo(() => {
    const set = new Set();

    for (const p of safeProducts || []) {
      const details = asArray(p?.details);
      if (
        brandFilter === "all" ||
        details.some((d) => safeLower(d?.brand) === brandFilter)
      ) {
        const cat = safeLower(p?.category);
        if (cat) set.add(cat);
      }
    }

    return [...set].sort((a, b) => a.localeCompare(b));
  }, [safeProducts, brandFilter]);

  const filteredBrands = useMemo(() => {
    const set = new Set();

    for (const p of safeProducts || []) {
      const cat = safeLower(p?.category);
      if (categoryFilter !== "all" && cat !== categoryFilter) continue;

      const details = asArray(p?.details);
      for (const d of details) {
        const brand = safeLower(d?.brand || "unbranded");
        if (brand) set.add(brand);
      }
    }

    return [...set].filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [safeProducts, categoryFilter]);

  const flatProducts = useMemo(
    () =>
      filteredProducts.flatMap((p) =>
        asArray(p?.details).flatMap((d) =>
          asArray(d?.financials)
            .filter(Boolean)
            .map((f) => ({ p, d, f }))
        )
      ),
    [filteredProducts]
  );

  const MIN_CARD_WIDTH = 180;
  const CARD_HEIGHT = 220;
  const CARD_GAP = 10;

  const columnCount =
    gridSize.width > 0
      ? Math.max(1, Math.floor(gridSize.width / MIN_CARD_WIDTH))
      : 1;

  const columnWidth =
    gridSize.width > 0 ? Math.floor(gridSize.width / columnCount) : MIN_CARD_WIDTH;

  const rowCount = Math.ceil(flatProducts.length / columnCount);

  return (
    <div
      ref={ref}
      className="h-full min-h-0 flex flex-col overflow-hidden bg-gray-50"
    >
      {/* Top controls */}
      <div className="shrink-0 border-b bg-white p-2 sm:p-3">
        {/* Barcode */}
        <div className="mb-2">
          <div className="relative">
            <CiBarcode className="absolute left-3 top-1/2 -translate-y-1/2 text-xl text-slate-400 pointer-events-none" />
            <input
              type="text"
              ref={barcodeRef}
              value={barcodeInput}
              inputMode="none"
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && barcodeInput.trim()) {
                  handleBarcode(barcodeInput.trim());
                }
              }}
              placeholder="Scan barcode to add"
              className="w-full rounded border bg-white p-2 pl-10 pr-10 text-center text-sm text-slate-900 md:text-base"
            />
          </div>
        </div>

        {/* Desktop / tablet filters */}
        <div className="mb-2 hidden md:flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="min-w-[130px] flex-1 rounded border bg-white px-2 py-2 text-sm"
          >
            <option value="all">All Categories</option>
            {filteredCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.toUpperCase()}
              </option>
            ))}
          </select>

          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className="min-w-[130px] flex-1 rounded border bg-white px-2 py-2 text-sm"
          >
            <option value="all">All Brands</option>
            {filteredBrands.map((brand) => (
              <option key={brand} value={brand}>
                {brand.toUpperCase()}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleClearFilters}
            className="
              shrink-0 rounded bg-red-600 text-white font-bold transition hover:bg-red-700
              px-2 py-1 text-xs
              lg:px-3 lg:py-2 lg:text-sm
              xl:px-4 xl:py-2
            "
          >
            Clear
          </button>
        </div>

        {/* Search */}
        <div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Search product"
            className="w-full rounded border bg-white px-3 py-2 text-sm"
          />
        </div>

        {/* Mobile clear button */}
        <div className="mt-2 md:hidden">
          <button
            type="button"
            onClick={handleClearFilters}
            className="
              w-full rounded bg-red-600 text-white font-bold transition hover:bg-red-700
              px-3 py-2 text-sm
              sm:px-4 sm:py-2.5 sm:text-base
            "
          >
            Clear
          </button>
        </div>
      </div>

      {/* Product grid area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {loading ? (
          <div className="flex h-full items-center justify-center font-medium text-blue-500">
            Loading products...
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center text-sm text-red-600">
            {error}
          </div>
        ) : flatProducts.length === 0 ? (
          <div className="flex h-full items-center justify-center italic text-gray-500">
            No matching products found.
          </div>
        ) : (
          <div ref={gridWrapRef} className="h-full w-full overflow-hidden">
            {gridSize.width > 0 && gridSize.height > 0 ? (
              <Grid
                columnCount={columnCount}
                columnWidth={columnWidth}
                height={gridSize.height}
                rowCount={rowCount}
                rowHeight={CARD_HEIGHT}
                width={gridSize.width}
                itemData={flatProducts}
              >
                {({ columnIndex, rowIndex, style, data }) => {
                  const index = rowIndex * columnCount + columnIndex;
                  const item = data[index];
                  if (!item) return null;

                  const { p, d, f } = item;
                  const imageUrl = d?.images?.[0]?.image;
                  const mrp = Number(f?.price || 0);
                  const rate = Number(f?.dprice || 0);
                  const stock = Number(f?.countInStock || 0);
                  const qtyLabel = `${Number(f?.quantity || 0)} ${f?.units || ""}`;
                  const discount = calcDiscount(f?.price, f?.dprice);

                  return (
                    <div
                      style={{
                        ...style,
                        padding: CARD_GAP / 2,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => addItemToCart(p, d, f)}
                        className="h-full w-full overflow-hidden rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md active:scale-[0.99]"
                      >
                        <div className="flex h-full flex-col">
                          <div className="mb-2 flex h-20 w-full items-center justify-center overflow-hidden rounded-md bg-gray-50">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={p?.name || "Product"}
                                className="h-full w-full object-contain"
                                loading="lazy"
                              />
                            ) : (
                              <div className="text-xs text-gray-400">No Image</div>
                            )}
                          </div>

                          <div className="text-center text-[10px] font-semibold text-red-600">
                            Qty: {qtyLabel}
                          </div>

                          <div className="min-h-[2.5rem] overflow-hidden text-center text-sm font-semibold leading-5 text-gray-800">
                            {p?.name}
                          </div>

                          <div className="text-center text-[11px] italic text-gray-500">
                            {d?.brand || "Unbranded"}
                          </div>

                          <div className="mt-1 flex items-end justify-between gap-2">
                            <div className="min-w-0">
                              <div className="whitespace-nowrap text-base font-bold text-green-700">
                                ₹ {rate.toFixed(2)}
                              </div>
                              <div className="whitespace-nowrap text-[11px] text-gray-400 line-through">
                                ₹ {mrp.toFixed(2)}
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              <div className="text-[11px] font-semibold text-orange-600">
                                {discount}% OFF
                              </div>
                              <div className="text-[11px] font-semibold text-red-700">
                                Stock: {stock}
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                }}
              </Grid>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-400">
                Measuring product area...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default ProductList;