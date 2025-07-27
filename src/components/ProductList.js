import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAllProducts,
  fetchProductByBarcode
} from '../features/products/productSlice';
import { addToCart } from '../features/cart/cartSlice';

const ProductList = forwardRef((props, ref) => {
  const dispatch = useDispatch();

  const token = useSelector((state) => state.posUser.userInfo?.token);
  const barcodeRef = useRef(null); // ✅ Step 1: Create ref

  const { all: products = [], loading, error } = useSelector(
    (state) => state.products || {}
  );
  // const safeProducts = Array.isArray(products) ? products : [];
  const safeProducts = Array.isArray(products)
  ? products
  : Array.isArray(products?.products)
    ? products.products
    : [];



  const [categoryFilter, setCategoryFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');



  useEffect(() => {
    if (token) dispatch(fetchAllProducts(token));
    console.log('fetchAllProducts triggered')
  }, [dispatch, token]);

  const filteredForFilters = safeProducts.filter((product) => {
  return !search || product.name.toLowerCase().includes(search.toLowerCase());
});
const filteredCategories = [
  ...new Set(
    filteredForFilters
      .filter((p) =>
        brandFilter === 'all' ||
        p.details.some((d) =>
          (d.brand || '').toLowerCase() === brandFilter
        )
      )
      .map((p) => (p.category || '').toLowerCase())
      .filter(Boolean)
  )
];

const filteredBrands = [
  ...new Set(
    filteredForFilters
      .filter((p) =>
        categoryFilter === 'all' || (p.category || '').toLowerCase() === categoryFilter
      )
      .flatMap((p) =>
        (p.details || []).map((d) => (d.brand || 'unbranded').toLowerCase())
      )
      .filter(Boolean)
  )
];

  const handleBarcodeScan = async (e) => {
    if (e.key === 'Enter' && barcodeInput.trim()) {
      const scanned = barcodeInput.trim();
      try {
        const result = await dispatch(
          fetchProductByBarcode({ barcode: scanned, token })
        ).unwrap();
        if (result) {
          dispatch(addToCart(result));
          // alert(`✅ ${result.productName} added to cart`);
        } else {
          alert('❌ Product not found');
        }
      } catch (err) {
        alert('❌ Error: ' + err.message);
      } finally {
        setBarcodeInput('');
        setTimeout(() => barcodeRef.current?.focus(), 100); // ✅ Step 3: Refocus
      }
    }
  };
   useEffect(() => {
    barcodeRef.current?.focus(); // ✅ Step 2: Focus on mount
  }, []);

  const filteredProducts = safeProducts.filter((product) => {
  const matchCategory =
    categoryFilter === 'all' ||
    (product.category || '').toLowerCase() === categoryFilter;

  const matchBrand =
    brandFilter === 'all' ||
    product.details.some(
      (d) => (d.brand || 'unbranded').toLowerCase() === brandFilter
    );

  const matchSearch =
    !search ||
    product.name.toLowerCase().includes(search.toLowerCase()) ||
    product.details.some((d) =>
      d.brand.toLowerCase().includes(search.toLowerCase())
    );

  return matchCategory && matchBrand && matchSearch;
});

// console.log(safeProducts);
  // const uniqueCategories = [
  //   ...new Set(
  //     products
  //       .map((p) => (p.categoryName || '').toLowerCase())
  //       .filter(Boolean)
  //   )
  // ];
  // const uniqueBrands = [
  //   ...new Set(products.map((p) => (p.brand || 'unbranded').toLowerCase()))
  // ];
//   const uniqueCategories = [
//   ...new Set(safeProducts.map((p) => (p.category || '').toLowerCase()))
// ];
// const uniqueBrands = [
//   ...new Set(
//     safeProducts.flatMap((p) =>
//       p.details.map((d) => (d.brand || 'unbranded').toLowerCase())
//     )
//   )
// ];


  return (
    <div className="p-4 bg-white border rounded shadow-sm h-full overflow-y-auto">
      {/* Barcode Scanner Input */}
      <div className="mb-4">
        <input
          type="text"
          value={barcodeInput}
          onChange={(e) => setBarcodeInput(e.target.value)}
          onKeyDown={handleBarcodeScan}
          placeholder="📷 Scan barcode to add"
          className="border p-2 w-full text-lg text-center"
          autoFocus
        />
      </div>

      {/* Filters */}
      {/* <div className="flex gap-2 mb-3">
        <select
  value={categoryFilter}
  onChange={(e) => setCategoryFilter(e.target.value)}
>
  <option value="all">All Categories</option>
  {filteredCategories.map((cat, idx) => (
    <option key={idx} value={cat}>
      {cat}
    </option>
  ))}
</select>


        <select
  value={brandFilter}
  onChange={(e) => setBrandFilter(e.target.value)}
>
  <option value="all">All Brands</option>
  {filteredBrands.map((brand, idx) => (
    <option key={idx} value={brand}>
      {brand}
    </option>
  ))}
</select>


        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search product"
          className="border px-2 py-1 rounded text-sm w-1/3"
        />
      </div> */}
      <div className="flex flex-wrap gap-2 mb-3">
  <select
    value={categoryFilter}
    onChange={(e) => setCategoryFilter(e.target.value)}
    className="border px-2 py-1 rounded text-sm flex-1 min-w-[130px]"
  >
    <option value="all">All Categories</option>
    {filteredCategories.map((cat, idx) => (
      <option key={idx} value={cat}>
        {cat}
      </option>
    ))}
  </select>

  <select
    value={brandFilter}
    onChange={(e) => setBrandFilter(e.target.value)}
    className="border px-2 py-1 rounded text-sm flex-1 min-w-[130px]"
  >
    <option value="all">All Brands</option>
    {filteredBrands.map((brand, idx) => (
      <option key={idx} value={brand}>
        {brand}
      </option>
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
      ) : filteredProducts.length === 0 ? (
        <div className="text-gray-500 italic">No matching products found.</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filteredProducts.flatMap((p) =>
  (p.details || []).flatMap((d, i) =>
    (d.financials || []).map((f, j) => (
      <div
        key={`${p._id}-${i}-${j}`}
        onClick={() =>
          dispatch(
  addToCart({
  id: p._id, // use productId ONLY
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
})

)

        }
        className="bg-green-100 border p-2 rounded shadow text-center cursor-pointer hover:bg-green-200"
      >
        <img
          src={d.images?.[0]?.image}
          alt={p.name}
          className="w-full h-24 object-contain mb-2"
        />
        <div className="text-xs text-red-600 font-semibold">
          Qty: {f.quantity} {f.units}
        </div>
        <div className="font-bold text-sm">{p.name}</div>
        <div className="text-xs text-gray-500 italic">{d.brand}</div>
        <div className="text-green-700 font-semibold">₹ {f.dprice}</div>
        <div className="text-gray-500 line-through text-xs">₹ {f.price}</div>
        <div className="text-xs text-red-800 font-semibold"> Stock: {f.countInStock} </div>
      </div>
    ))
  )
)
}

        </div>
      )}
    </div>
  );
});

export default ProductList;
