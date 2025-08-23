// 📁 src/components/HeaderPOS.jsx
import { useDispatch, useSelector } from "react-redux";
// import { Link } from 'react-router-dom';
import { useState, useMemo, useEffect, useRef } from "react";
import { logout, getPosUserBalance } from "../features/auth/posUserSlice";
import { publishQueuedOrdersSequential } from "../features/orders/orderSlice";
import {setSearch } from "../features/products/productFiltersSlice";
import { addToCart } from "../features/cart/cartSlice";
import { pingBackend } from "../utils/network";
// import logo from "../assests/ManaKiranaLogo1024x1024.png";

function HeaderPOS() {
  const dispatch = useDispatch();

  // Auth / user
  const posUserInfo = useSelector((state) => state.posUser.userInfo);
  const token = posUserInfo?.token;
  const name = posUserInfo?.username || '';

  // Queue / publish
  const queueCount = useSelector((s) => s.orders?.queueCount ?? 0);
  const publishStatus = useSelector((s) => s.orders?.publishStatus || 'idle');
  const isPublishing = publishStatus === 'loading';

  // Earnings
  const [balance, setBalance] = useState(posUserInfo?.balance ?? 0);
  useEffect(() => {
    if (posUserInfo?.balance !== undefined) setBalance(posUserInfo.balance);
  }, [posUserInfo?.balance]);

  const earningsText = useMemo(() => {
    try {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(balance);
    } catch {
      return `₹${Number(balance).toLocaleString('en-IN')}`;
    }
  }, [balance]);

  // Mobile menu
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const handleMenuToggle = () => {
    const next = !showMobileMenu;
    setShowMobileMenu(next);
    if (next && posUserInfo?._id) dispatch(getPosUserBalance());
  };

  // Products (for filters + suggestions)
  const allProducts = useSelector((s) => s.products?.all);
  const { category, brand } = useSelector((s) => s.productFilters || { category: 'all', brand: 'all' });

  const safeProducts = useMemo(
    () => (Array.isArray(allProducts) ? allProducts : (allProducts?.products || [])),
    [allProducts]
  );

  const {  search } = useSelector(
    (s) => s.productFilters || { search: '' }
  );

  // const categories = useMemo(() => {
  //   return Array.from(new Set(
  //     safeProducts
  //       .filter(p => brand === 'all' || p.details?.some(d => (d.brand || '').toLowerCase() === brand))
  //       .map(p => (p.category || '').toLowerCase())
  //       .filter(Boolean)
  //   ));
  // }, [safeProducts, brand]);

  // const brands = useMemo(() => {
  //   return Array.from(new Set(
  //     safeProducts
  //       .filter(p => category === 'all' || (p.category || '').toLowerCase() === category)
  //       .flatMap(p => (p.details || []).map(d => (d.brand || 'unbranded').toLowerCase()))
  //       .filter(Boolean)
  //   ));
  // }, [safeProducts, category]);

  const handleLogout = () => {
    dispatch(logout());
    localStorage.removeItem("posUserInfo");
    window.location.href = "/login";
  };

  const handlePublish = async () => {
    if (!navigator.onLine) {
      alert('⚠️ No network. Connect to the internet to publish orders.');
      return;
    }
    const ok = await pingBackend(undefined, 2000, token);
    if (!ok) {
      alert('⚠️ Backend unreachable. Check the API server and try again.');
      return;
    }
    if (!queueCount) return;
    try {
      const res = await dispatch(publishQueuedOrdersSequential({ token })).unwrap();
      setShowMobileMenu(false);
      alert(
        res?.published
          ? `✅ Published ${res.published} order(s).${res.failed ? ` ${res.failed} failed.` : ''}`
          : 'No queued orders to publish.'
      );
    } catch (e) {
      alert('❌ Publish failed: ' + (e?.message || e));
    }
  };

  // ---------- Typeahead suggestions ----------
  const [showSug, setShowSug] = useState(false);
  const [sug, setSug] = useState([]); // [{p,d,f}]
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef(null);
  const sugBoxRef = useRef(null);
  // const DEBOUNCE_MS = 120;

  // const pickVariant = (p) => {
  //   const details = p?.details || [];
  //   for (const d of details) {
  //     const fins = d?.financials || [];
  //     const fin = fins.find(ff => (ff.countInStock ?? 0) > 0) || fins[0];
  //     if (fin) return { d, f: fin };
  //   }
  //   return null;
  // };

  useEffect(() => {
  const q = (search || '').trim().toLowerCase();
  if (!q) {
    setSug([]);
    setShowSug(false);
    setActiveIdx(-1);
    return;
  }

  const DEBOUNCE_MS = 150;
  const MAX_SUG = 40;

  const id = setTimeout(() => {
    const results = [];
    const catFilter = (category || 'all').toLowerCase();
    const brandFilter = (brand || 'all').toLowerCase();

    // tokenize query (so "sugar 1kg" matches both)
    const tokens = q.split(/\s+/).filter(Boolean);

    // helper: does haystack include all tokens?
    const matchesAll = (hay) => {
      const s = (hay || '').toLowerCase();
      return tokens.every(t => s.includes(t));
    };

    // iterate every product/detail/financial
    outer:
    for (const p of safeProducts) {
      if (catFilter !== 'all' && (p.category || '').toLowerCase() !== catFilter) continue;

      for (const d of (p.details || [])) {
        if (brandFilter !== 'all' && (d.brand || '').toLowerCase() !== brandFilter) continue;

        for (const f of (d.financials || [])) {
          const barcodeList = Array.isArray(f.barcode) ? f.barcode : [f.barcode || ''];
          const pack = `${f.quantity ?? ''}${f.units ?? ''}`; // e.g. "1Kg"

          // build a haystack of searchable fields
          const hay =
            `${p.name} ${d.brand || ''} ${p.category || ''} ${pack} ${f.price ?? ''} ${f.dprice ?? ''} ${barcodeList.join(' ')}`;

          // match if any token logic passes
          if (!matchesAll(hay)) continue;

          results.push({ p, d, f });

          if (results.length >= MAX_SUG) break outer;
        }
      }
    }

    setSug(results);
    setShowSug(true);
    setActiveIdx(results.length ? 0 : -1);
  }, DEBOUNCE_MS);

  return () => clearTimeout(id);
}, [search, safeProducts, category, brand]);

  useEffect(() => {
    const onClick = (e) => {
      const inBox = sugBoxRef.current?.contains(e.target);
      const inInput = inputRef.current?.contains(e.target);
      if (!inBox && !inInput) setShowSug(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const addSuggestionToCart = (item) => {
    if (!item?.p || !item?.d || !item?.f) return;
    const { p, d, f } = item;
    dispatch(addToCart({
      id: p._id,
      productName: p.name,
      category: p.category,
      brand: d.brand,
      brandId: d._id,
      financialId: f._id,
      MRP: f.price,
      dprice: f.dprice,
      quantity: f.quantity,
      countInStock: f.countInStock,
      units: f.units,
      image: d.images?.[0]?.image,
      catalogQuantity: f.quantity,
      discount: Math.round(((f.price - f.dprice) / f.price) * 100),
      qty: 1
    }));
    dispatch(setSearch(''));
    setShowSug(false);
    setActiveIdx(-1);
  };

  const onSearchKeyDown = (e) => {
    if (!showSug || sug.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((idx) => (idx + 1) % sug.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((idx) => (idx - 1 + sug.length) % sug.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0) addSuggestionToCart(sug[activeIdx]);
    } else if (e.key === 'Escape') {
      setShowSug(false);
    }
  };

  const publishBtnClasses =
    `relative px-3 py-1 rounded-md text-white transition
     ${queueCount && !isPublishing ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-400 cursor-not-allowed'}`;

  return (
    <header className="bg-yellow-500 shadow-md p-3 sticky top-0 z-50">
      {/* Row: (optional logo) | search (flex-1) | hamburger (mobile) | desktop actions */}
      <div className="flex items-center gap-2 w-full">
        {/* (Optional) Logo + Title — uncomment if you want it */}
        {/* <div className="shrink-0 flex items-center space-x-3">
          <Link to="/pos">
            <img src={logo} alt="ManaKirana Logo" className="h-10 w-10 rounded-full object-cover" />
          </Link>
          <h1 className="text-lg md:text-xl font-bold text-green-700">
            {process.env.REACT_APP_SHOP_NAME || "ManaKirana"} POS
          </h1>
        </div> */}

        {/* Search (grows to fill all space) */}
        <div className="relative flex-1 min-w-0">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => dispatch(setSearch(e.target.value))}
            onKeyDown={onSearchKeyDown}
            placeholder="Search products"
            className="w-full border px-2 py-1 rounded text-sm"
            onFocus={() => { if (sug.length) setShowSug(true); }}
          />
          {showSug && sug.length > 0 && (
            <div
              ref={sugBoxRef}
              className="absolute mt-1 w-full max-h-96 overflow-auto bg-white border rounded shadow-lg z-50"
            >
              {sug.map((it, idx) => (
                <button
                  key={`${it.p._id}-${it.d._id}-${it.f._id}`}
                  className={`w-full text-left px-2 py-2 flex items-center gap-2 hover:bg-indigo-50 ${
                    idx === activeIdx ? 'bg-indigo-50' : ''
                  }`}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addSuggestionToCart(it)}
                >
                  <img
                    src={it.d.images?.[0]?.image}
                    alt={it.p.name}
                    className="w-8 h-8 object-contain"
                    loading="lazy"
                  />
                  <div className="flex-1 truncate">
                    <div className="text-sm font-medium truncate">{it.p.name}</div>
                    <div className="text-xs text-gray-500 truncate">{it.d.brand}</div>
                  </div>
                  <div className="text-sm font-semibold whitespace-nowrap">{it.f.quantity}{it.f.units}</div>
                  <div className="text-sm font-semibold whitespace-nowrap">₹ {it.f.dprice}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mobile hamburger (inline with search) */}
        <div className="relative md:hidden shrink-0">
          <button className="text-2xl text-white" onClick={handleMenuToggle} aria-label="Toggle Mobile Menu">☰</button>
          {showMobileMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white border rounded shadow-lg z-50">
              <div className="p-2 border-b text-gray-700 font-medium">Hi {name}</div>

              {/* Publish Orders (mobile) */}
              <button
                onClick={handlePublish}
                disabled={isPublishing || !queueCount || !navigator.onLine}
                className={`w-full text-left px-4 py-2 text-sm ${queueCount ? 'text-indigo-700 hover:bg-indigo-50' : 'text-gray-400 cursor-not-allowed'}`}
              >
                {isPublishing ? 'Publishing…' : `Publish Orders${queueCount ? ` (${queueCount})` : ''}`}
              </button>

              {/* Mobile Filters
              <div className="px-4 py-3 border-y">
                <div className="text-xs text-gray-600 mb-2">Product Filters</div>

                <select
                  value={category}
                  onChange={(e) => dispatch(setCategory(e.target.value))}
                  className="w-full mb-2 border px-2 py-1 rounded text-sm"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>

                <select
                  value={brand}
                  onChange={(e) => dispatch(setBrand(e.target.value))}
                  className="w-full mb-2 border px-2 py-1 rounded text-sm"
                >
                  <option value="all">All Brands</option>
                  {brands.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>

                <button
                  className="w-full text-left px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 border rounded"
                  onClick={() => dispatch(clearFilters())}
                >
                  Clear Filters
                </button>
              </div> */}

              {/* Earnings (mobile) */}
              <div className="px-4 py-2 text-sm text-green-800 bg-green-50 border-b">
                <div className="flex items-baseline font-medium gap-2">
                  <div>Earnings:</div>
                  <div className="font-bold">{earningsText}</div>
                </div>
              </div>

              {/* Logout (mobile) */}
              <button
                onClick={() => { setShowMobileMenu(false); handleLogout(); }}
                className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-100"
              >
                Logout
              </button>
            </div>
          )}
        </div>

        {/* Desktop actions (inline, hidden on mobile) */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <button
            onClick={handlePublish}
            disabled={isPublishing || !queueCount || !navigator.onLine}
            className={publishBtnClasses}
            title={!navigator.onLine ? 'Offline – connect to publish' : (queueCount ? 'Publish queued orders' : 'No queued orders')}
          >
            {isPublishing ? 'Publishing…' : 'Publish Orders'}
            {queueCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center text-xs bg-white text-indigo-700 rounded-full w-6 h-6">
                {queueCount}
              </span>
            )}
          </button>

          <div className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-semibold">
            <span className="mr-2">Earnings</span>
            <span className="font-bold">{earningsText}</span>
          </div>

          <span className="text-gray-800 font-medium">Hi {name}</span>

          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

export default HeaderPOS;
