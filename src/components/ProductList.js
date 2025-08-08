import React, {
  forwardRef, useEffect, useRef, useState, useMemo, useCallback,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllProducts, fetchProductByBarcode } from '../features/products/productSlice';
import { addToCart } from '../features/cart/cartSlice';
import { FixedSizeGrid as Grid } from 'react-window';

const ProductList = forwardRef((props, ref) => {
  const dispatch = useDispatch();
  const barcodeRef = useRef(null);

  const token = useSelector((state) => state.posUser.userInfo?.token);
  const { all: products = [], loading, error } = useSelector((state) => state.products || {});
  const safeProducts = useMemo(() => (
    Array.isArray(products)
      ? products
      : Array.isArray(products?.products)
        ? products.products
        : []
  ), [products]);

  const [categoryFilter, setCategoryFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [showFilters, setShowFilters] = useState(false); 

  useEffect(() => {
    if (token && safeProducts.length === 0) {
      dispatch(fetchAllProducts(token));
    }
  }, [dispatch, token, safeProducts.length]);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  const handleBarcodeScan = async (e) => {
    if (e.key === 'Enter' && barcodeInput.trim()) {
      handleBarcode(barcodeInput.trim());
      setBarcodeInput('');
    }
  };

  const handleBarcode = useCallback(async (scannedRaw) => {
    let scanned = scannedRaw;

    if (typeof scannedRaw === 'string') {
      try {
        const parsed = JSON.parse(scannedRaw);
        if (Array.isArray(parsed)) scanned = parsed[0];
      } catch {
        scanned = scannedRaw.replace(/\[\]"]+/g, '');
      }
    }

    const matchedProduct = safeProducts.find((p) =>
      p.details?.some((d) =>
        d.financials?.some((f) =>
          (Array.isArray(f.barcode) ? f.barcode : [f.barcode || ""]).includes(scanned)
        )
      )
    );

    if (matchedProduct) {
      const detail = matchedProduct.details.find((d) =>
        d.financials?.some((f) =>
          (Array.isArray(f.barcode) ? f.barcode : [f.barcode || ""]).includes(scanned)
        )
      );
      const financial = detail.financials.find((f) =>
        (Array.isArray(f.barcode) ? f.barcode : [f.barcode || ""]).includes(scanned)
      );

      dispatch(addToCart({
        id: matchedProduct._id,
        productName: matchedProduct.name,
        category: matchedProduct.category,
        brand: detail.brand,
        brandId: detail._id,
        financialId: financial._id,
        MRP: financial.price,
        dprice: financial.dprice,
        quantity: financial.quantity,
        countInStock: financial.countInStock,
        units: financial.units,
        image: detail.images?.[0]?.image,
        catalogQuantity: financial.quantity,
        discount: Math.round(((financial.price - financial.dprice) / financial.price) * 100),
        qty: 1
      }));
    } else {
      try {
        const result = await dispatch(fetchProductByBarcode({ barcode: scanned, token })).unwrap();
        if (result) {
          dispatch(addToCart(result));
        } else {
          alert('❌ Product not found');
        }
      } catch (err) {
        alert('❌ Error: ' + err.message);
      }
    }

    setTimeout(() => barcodeRef.current?.focus(), 100);
  }, [dispatch, token, safeProducts]);

  const filteredProducts = useMemo(() => {
    return safeProducts.filter((product) => {
      const matchCategory = categoryFilter === 'all' || (product.category || '').toLowerCase() === categoryFilter;
      const matchBrand = brandFilter === 'all' || product.details.some(d => (d.brand || '').toLowerCase() === brandFilter);
      const matchSearch =
        !search ||
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.details.some(d => d.brand.toLowerCase().includes(search.toLowerCase()));

      return matchCategory && matchBrand && matchSearch;
    });
  }, [safeProducts, categoryFilter, brandFilter, search]);

  const filteredCategories = useMemo(() => {
    return [...new Set(
      safeProducts
        .filter(p =>
          brandFilter === 'all' ||
          p.details.some(d => (d.brand || '').toLowerCase() === brandFilter)
        )
        .map(p => (p.category || '').toLowerCase())
        .filter(Boolean)
    )];
  }, [safeProducts, brandFilter]);

  const filteredBrands = useMemo(() => {
    return [...new Set(
      safeProducts
        .filter(p =>
          categoryFilter === 'all' || (p.category || '').toLowerCase() === categoryFilter
        )
        .flatMap(p => (p.details || []).map(d => (d.brand || 'unbranded').toLowerCase()))
        .filter(Boolean)
    )];
  }, [safeProducts, categoryFilter]);

  const flatProducts = useMemo(() => (
    filteredProducts.flatMap(p =>
      (p.details || []).flatMap(d =>
        (d.financials || []).map(f => ({ p, d, f }))
      )
    )
  ), [filteredProducts]);

  const COLUMN_COUNT = windowWidth < 768 ? 2 : 3;
  const ROW_HEIGHT = 250;
  const COLUMN_WIDTH = windowWidth < 768 ? windowWidth / 2 - 24 : 240;

  const ProductCell = ({ columnIndex, rowIndex, style, data }) => {
    const index = rowIndex * COLUMN_COUNT + columnIndex;
    const item = data[index];
    if (!item) return null;

    const { p, d, f } = item;

    return (
      <div
        style={style}
        onClick={() =>
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
          }))
        }
        className="bg-gray-100 w-full border p-2 rounded shadow text-center cursor-pointer hover:bg-blue-100 m-1"
      >
        <img
          src={d.images?.[0]?.image}
          alt={p.name}
          className="w-full h-20 object-contain mb-2"
          loading="lazy"
        />
        <div className="text-xs text-red-600 font-semibold">Qty: {f.quantity} {f.units}</div>
        <div className="font-bold text-sm">{p.name}</div>
        <div className="text-xs text-gray-500 italic">{d.brand}</div>
        <div className="text-green-700 font-semibold">₹ {f.dprice}</div>
        <div className="text-gray-500 line-through text-xs">₹ {f.price}</div>
        <div className="text-xs text-red-800 font-semibold">Stock: {f.countInStock}</div>
      </div>
    );
  };

  return (
     <div className="p-4 bg-white border rounded shadow-sm h-full overflow-y-auto">

      {/* Barcode Scan */}
      <div className="mb-4">
        <input
          type="text"
          ref={barcodeRef}
          value={barcodeInput}
          onChange={(e) => setBarcodeInput(e.target.value)}
          onKeyDown={handleBarcodeScan}
          placeholder="📷 Scan barcode to add"
          className="border p-2 w-full text-lg text-center"
        />
      </div>
<div className="mb-3">
    <button
      onClick={() => setShowFilters((prev) => !prev)}
      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded w-full md:w-auto"
    >
      {showFilters ? "Hide Filters & Search" : "Show Filters & Search"}
    </button>
  </div>

  {/* Filters + Product Grid — only shown when toggled */}
  {showFilters && (
    <>
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-3">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border px-2 py-1 rounded text-sm flex-1 min-w-[130px]"
        >
          <option value="all">All Categories</option>
          {filteredCategories.map((cat, idx) => (
            <option key={idx} value={cat}>{cat}</option>
          ))}
        </select>

        <select
          value={brandFilter}
          onChange={(e) => setBrandFilter(e.target.value)}
          className="border px-2 py-1 rounded text-sm flex-1 min-w-[130px]"
        >
          <option value="all">All Brands</option>
          {filteredBrands.map((brand, idx) => (
            <option key={idx} value={brand}>{brand}</option>
          ))}
        </select>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search product"
          className="border px-2 py-1 rounded text-sm flex-1 min-w-[150px]"
        />
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="text-center text-blue-500 font-medium">
          Loading products...
        </div>
      ) : error ? (
        <div className="text-red-600 text-sm">{error}</div>
      ) : flatProducts.length === 0 ? (
        <div className="text-gray-500 italic">No matching products found.</div>
      ) : (
        <Grid
          columnCount={COLUMN_COUNT}
          columnWidth={COLUMN_WIDTH}
          height={window.innerHeight - 250}
          rowCount={Math.ceil(flatProducts.length / COLUMN_COUNT)}
          rowHeight={ROW_HEIGHT}
          width={COLUMN_WIDTH * COLUMN_COUNT}
          itemData={flatProducts}
        >
          {ProductCell}
        </Grid>
      )}
    </>
  )}
</div>
  
  );
});

export default ProductList;
