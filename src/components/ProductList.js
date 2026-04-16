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

const SearchKeyboard = forwardRef(({ visible, onKeyPress, onClose }, ref) => {
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const updateLayout = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, []);

  if (!visible) return null;

  const rows = [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["Z", "X", "C", "V", "B", "N", "M"],
  ];

  const keyBaseClass =
    "flex-1 min-w-0 rounded-lg border border-gray-300 bg-gray-50 font-bold text-slate-800 active:scale-95 select-none";
  const portraitKeyClass = `${keyBaseClass} px-1 py-3 text-sm`;
  const landscapeKeyClass = `${keyBaseClass} px-1 py-2 text-[13px]`;

  if (isLandscape) {
    return (
      <div
        ref={ref}
        className="absolute inset-x-0 bottom-0 z-50 border-t border-gray-300 bg-white shadow-2xl"
      >
        <div className="w-full max-w-full overflow-x-auto">
          <div className="min-w-0 p-2">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-slate-700">
                Search Keyboard
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => onKeyPress("SPACE")}
                  className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-bold text-slate-800 active:scale-95"
                >
                  Space
                </button>

                <button
                  type="button"
                  onClick={() => onKeyPress("BACKSPACE")}
                  className="rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm font-bold text-yellow-800 active:scale-95"
                >
                  ⌫
                </button>

                <button
                  type="button"
                  onClick={() => onKeyPress("CLEAR")}
                  className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 active:scale-95"
                >
                  Clear
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg bg-gray-200 px-3 py-2 text-sm font-semibold text-slate-800 active:scale-95"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {rows.map((row, idx) => (
                <div key={idx} className="flex w-full gap-1.5">
                  {row.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => onKeyPress(key)}
                      className={landscapeKeyClass}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="absolute inset-x-0 bottom-0 z-50 border-t border-gray-300 bg-white shadow-2xl"
    >
      <div className="w-full p-2 sm:p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-slate-700">
            Search Keyboard
          </div>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClose}
            className="rounded-lg bg-gray-200 px-3 py-2 text-sm font-semibold text-slate-800 active:scale-95"
          >
            Close
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {rows.map((row, idx) => (
            <div key={idx} className="flex w-full gap-1.5">
              {row.map((key) => (
                <button
                  key={key}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onKeyPress(key)}
                  className={portraitKeyClass}
                >
                  {key}
                </button>
              ))}
            </div>
          ))}

          <div className="flex w-full gap-1.5 pt-1">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onKeyPress("SPACE")}
              className="flex-[2] min-w-0 rounded-lg border border-gray-300 bg-gray-50 px-2 py-3 text-sm font-bold text-slate-800 active:scale-95"
            >
              Space
            </button>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onKeyPress("BACKSPACE")}
              className="flex-1 min-w-0 rounded-lg border border-yellow-300 bg-yellow-50 px-2 py-3 text-sm font-bold text-yellow-800 active:scale-95"
            >
              ⌫
            </button>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onKeyPress("CLEAR")}
              className="flex-1 min-w-0 rounded-lg border border-red-300 bg-red-50 px-2 py-3 text-sm font-bold text-red-700 active:scale-95"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

const ProductList = forwardRef((props, ref) => {
  const dispatch = useDispatch();

  const token = useSelector((state) => state.posUser.userInfo?.token);
  const { loading, error } = useSelector((state) => state.products || {});
  const { productsList: safeProducts, barcodeMap } = useOfflineCatalog();

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showSearchKeyboard, setShowSearchKeyboard] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(270);
  const [useCustomSearchKeyboard, setUseCustomSearchKeyboard] = useState(false);

  const barcodeRef = useRef(null);
  const searchInputRef = useRef(null);
  const keyboardRef = useRef(null);
  const [barcodeInput, setBarcodeInput] = useState("");

  const gridWrapRef = useRef(null);
  const [gridSize, setGridSize] = useState({ width: 0, height: 0 });

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

  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  useEffect(() => {
    const updateKeyboardMode = () => {
      const isTabletOrMobile = window.innerWidth < 1024;
      setUseCustomSearchKeyboard(isTabletOrMobile);

      if (!isTabletOrMobile) {
        setShowSearchKeyboard(false);
      }
    };

    updateKeyboardMode();
    window.addEventListener("resize", updateKeyboardMode);

    return () => window.removeEventListener("resize", updateKeyboardMode);
  }, []);

  useEffect(() => {
    const updateKeyboardHeight = () => {
      setKeyboardHeight(window.innerWidth > window.innerHeight ? 190 : 270);
    };

    updateKeyboardHeight();
    window.addEventListener("resize", updateKeyboardHeight);
    return () => window.removeEventListener("resize", updateKeyboardHeight);
  }, []);

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

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!showSearchKeyboard) return;

      const clickedSearchInput = searchInputRef.current?.contains(e.target);
      const clickedKeyboard = keyboardRef.current?.contains(e.target);

      if (!clickedSearchInput && !clickedKeyboard) {
        setShowSearchKeyboard(false);
        setTimeout(() => barcodeRef.current?.focus(), 50);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showSearchKeyboard]);

  const handleClearFilters = useCallback(() => {
    setCategoryFilter("all");
    setBrandFilter("all");
    setSearch("");
    setShowSearchKeyboard(false);
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

      setShowSearchKeyboard(false);

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

          if (result) {
            dispatch(addToCart(result));
          } else {
            alert("❌ Product not found.");
          }
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

  const handleSearchKeyPress = useCallback((key) => {
    setSearch((prev) => {
      let next = prev;

      if (key === "BACKSPACE") next = prev.slice(0, -1);
      else if (key === "SPACE") next = prev + " ";
      else if (key === "CLEAR") next = "";
      else next = prev + key;

      setTimeout(() => {
        const el = searchInputRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(next.length, next.length);
        }
      }, 0);

      return next;
    });
  }, []);

  const openSearchKeyboard = useCallback(() => {
    if (!useCustomSearchKeyboard) return;

    setShowSearchKeyboard(true);

    setTimeout(() => {
      const el = searchInputRef.current;
      if (el) {
        el.focus();
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
    }, 0);
  }, [useCustomSearchKeyboard]);

  const handleDesktopSearchChange = useCallback((e) => {
    if (useCustomSearchKeyboard) return;
    setSearch(e.target.value);
  }, [useCustomSearchKeyboard]);

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
    gridSize.width > 0
      ? Math.floor(gridSize.width / columnCount)
      : MIN_CARD_WIDTH;

  const rowCount = Math.ceil(flatProducts.length / columnCount);

  return (
    <div
      ref={ref}
      className="relative flex h-full min-h-0 flex-col overflow-hidden bg-gray-50"
    >
      <div className="shrink-0 border-b bg-white p-2 sm:p-3">
        <div className="mb-2">
          <div className="relative">
            <CiBarcode className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xl text-slate-400" />
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

        <div className="mb-2 hidden items-center gap-2 md:flex">
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setShowSearchKeyboard(false);
              setTimeout(() => barcodeRef.current?.focus(), 50);
            }}
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
            onChange={(e) => {
              setBrandFilter(e.target.value);
              setShowSearchKeyboard(false);
              setTimeout(() => barcodeRef.current?.focus(), 50);
            }}
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
            className="shrink-0 rounded bg-red-600 px-2 py-1 text-xs font-bold text-white transition hover:bg-red-700 lg:px-3 lg:py-2 lg:text-sm xl:px-4 xl:py-2"
          >
            Clear
          </button>
        </div>

        <div>
          <input
            type="text"
            ref={searchInputRef}
            value={search}
            readOnly={useCustomSearchKeyboard}
            inputMode={useCustomSearchKeyboard ? "none" : "text"}
            onChange={handleDesktopSearchChange}
            onFocus={useCustomSearchKeyboard ? openSearchKeyboard : undefined}
            onClick={useCustomSearchKeyboard ? openSearchKeyboard : undefined}
            placeholder="🔍 Search product"
            className="w-full rounded border bg-white px-3 py-2 text-sm caret-slate-900"
          />
        </div>

        <div className="mt-2 md:hidden">
          <button
            type="button"
            onClick={handleClearFilters}
            className="w-full rounded bg-red-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-red-700 sm:px-4 sm:py-2.5 sm:text-base"
          >
            Clear
          </button>
        </div>
      </div>

      <div
        className="flex-1 min-h-0 overflow-hidden"
        style={{
          paddingBottom:
            showSearchKeyboard && useCustomSearchKeyboard
              ? `${keyboardHeight}px`
              : 0,
        }}
      >
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
          <div
            ref={gridWrapRef}
            className="h-full w-full overflow-hidden"
            onMouseDown={() => {
              if (showSearchKeyboard) {
                setShowSearchKeyboard(false);
                setTimeout(() => barcodeRef.current?.focus(), 50);
              }
            }}
            onTouchStart={() => {
              if (showSearchKeyboard) {
                setShowSearchKeyboard(false);
                setTimeout(() => barcodeRef.current?.focus(), 50);
              }
            }}
          >
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
                  const qtyLabel = `${Number(f?.quantity || 0)} ${
                    f?.units || ""
                  }`;
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
                              <div className="text-xs text-gray-400">
                                No Image
                              </div>
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

      <SearchKeyboard
        ref={keyboardRef}
        visible={showSearchKeyboard && useCustomSearchKeyboard}
        onKeyPress={handleSearchKeyPress}
        onClose={() => {
          setShowSearchKeyboard(false);
          setTimeout(() => barcodeRef.current?.focus(), 50);
        }}
      />
    </div>
  );
});

export default ProductList;