import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { cacheProducts, getCachedProducts } from '../../utils/offlineStorage'; 

export const fetchAllProductsFresh = createAsyncThunk(
  'products/fetchAllFresh',
  async (arg, thunkAPI) => {
    const token = typeof arg === 'string' ? arg : (arg && arg.token);
    if (!token) return thunkAPI.rejectWithValue('missing-token');

    // Must be online to hit DB
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return thunkAPI.rejectWithValue('offline');
    }

    // Drop any stale local copy before fetching (your two keys are kept;
    // add any others you may have used in the past)
    try {
      localStorage.removeItem('mkpos.products');
      localStorage.removeItem('mk_products_v1');
      // localStorage.removeItem('products');      // (optional)
      // localStorage.removeItem('allProducts');   // (optional)
      // localStorage.removeItem('catalog');       // (optional)
    } catch {}

    const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/products`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to fetch products');

    const arr = Array.isArray(data) ? data : (data && data.products) ? data.products : [];
    try { cacheProducts(arr); } catch {}
    return arr; // always an array
  },
  {
    // Always run; do NOT skip even if state already has data
    condition: () => true,
  }
);
export const fetchAllProducts = createAsyncThunk(
  'products/fetchAll',
  async (arg, thunkAPI) => {
    const token = typeof arg === 'string' ? arg : arg?.token;
    const localFirst = typeof arg === 'object' ? (arg.localFirst ?? true) : true;

    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const cached = getCachedProducts();
    const hasCache = Array.isArray(cached) && cached.length > 0;

    // 1) Use cache when available (local-first), regardless of online state
    if (localFirst && hasCache) {
      // console.log('🔁 Using cached products');
      return cached; // <-- returns the array; reducer stays simple
    }

    // 2) If offline and no cache, fail gracefully
    if (!online && !hasCache) {
      return thunkAPI.rejectWithValue('offline-no-cache');
    }

    // 3) Fetch from API (first load / cache miss)
    const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/products`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch products');

    const arr = Array.isArray(data) ? data : (data?.products || []);
    // Persist for next offline session
    try { cacheProducts(arr); } catch {}
    return arr; // <-- always an array
  },
  {
    // Optional: if Redux already has products loaded, skip running the thunk
    condition: (arg, { getState }) => {
      const all = getState()?.products?.all;
      return !(Array.isArray(all) && all.length > 0);
    }
  }
);
export const deleteProduct = createAsyncThunk(
  'products/delete',
  async ({ id, token }, thunkAPI) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/products/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete product');
      return { id };
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);

export const addProduct = createAsyncThunk(
  'products/add',
  async ({ payload, token }) => {
    const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add product');
    return data;
  }
);

export const fetchProductByBarcode = createAsyncThunk(
  'products/fetchByBarcode',
  async ({ barcode, token }) => {
    const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/pos-products/barcode/${barcode}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    // console.log('123'+JSON.stringify(data));
    if (!res.ok) throw new Error(data.error || 'Product not found');
    return data;
  }
);

export const suggestProducts = createAsyncThunk(
  'products/suggest',
  async ({ query, token }) => {
    const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/products/suggest?q=${query}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Suggest fetch failed');
    return data;
  }
);
// PUT /api/products/:id with updated quantity (new stock)
export const updateProduct = createAsyncThunk(
  'products/update',
  async ({ id, data, token }, thunkAPI) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/pos-products/update-financial`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to update financial data');
      return result;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);

export const updateProductStockOnly = createAsyncThunk(
  'products/updateStockOnly',
  async ({ productID, brandID, financialID, newQuantity, token }, thunkAPI) => {
    // console.log(productID);
    // console.log(brandID);
    // console.log(financialID);
    // console.log(newQuantity);

    const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/products/stock/${productID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ brandID, financialID, newQuantity }),
    });

    const data = await response.json();
//   console.log('📦 Response status:', response.status);
// console.log('📦 Response OK:', response.ok);
// console.log('📦 Response body:', data);

    if (!response.ok) throw new Error(data.message || 'Stock update failed');
       return {
      productID,
      brandID,
      financialID,
      countInStock: data?.quantity ?? newQuantity,
    };
  }
);

// Async thunk
export const fetchProductByCatalogId = createAsyncThunk(
  'products/fetchByCatalogId',
  async ({ catalogId, token }) => {
    const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/products/catalog/${catalogId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Product not found by catalogId');
    return data;
  }
);

export const addFinancialToPOSProduct = createAsyncThunk(
  'products/addFinancialToPOSProduct',
  async ({ productId, brandId, data, token }, thunkAPI) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/pos-products/add-financial`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId, brandId, financialData: data }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to add financial');
      return result;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);
export const deletePOSProductFinancial = createAsyncThunk(
  'products/deletePOSProductFinancial',
  async ({ productId, brandId, financialId, token }, thunkAPI) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/pos-products/delete-financial`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId, brandId, financialId }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to delete financial');
      return result;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);
export const addBrandToPOSProduct = createAsyncThunk(
  'products/addBrandToPOSProduct',
  async ({ productId, brandData, token }, thunkAPI) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/pos-products/add-brand`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId, brandData }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to add brand');
      return result;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);
export const deletePOSProductBrand = createAsyncThunk(
  'products/deletePOSProductBrand',
  async ({ productId, brandId, token }, thunkAPI) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/pos-products/delete-brand`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId, brandId }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to delete brand');
      return result;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);

const productSlice = createSlice({
  name: 'products',
  initialState: {
    // all: [],
    all: getCachedProducts(),  
    selected: null,
    suggestions: [],
    loading: false,
    error: ''
  },
  reducers: {
    clearProduct: (state) => {
      state.selected = null;
      state.suggestions = [];
      state.error = '';
    },
    hydrateFromCache: (state) => {     // 🆕 allow manual hydration (optional)
      state.all = getCachedProducts();
    }
  },
  extraReducers: (builder) => {
  builder
    .addCase(fetchAllProducts.pending, (state) => {
      state.loading = true;
      state.error = '';
    })
    .addCase(fetchAllProducts.fulfilled, (state, action) => {
      state.loading = false;
      state.all = action.payload; // ✅ This is the missing line
      cacheProducts(state.all);   
    })
    // .addCase(fetchAllProducts.rejected, (state, action) => {
    //   state.loading = false;
    //   // state.all = [];
    //   state.all = getCachedProducts(); //
    //   state.error = action.error.message;
    // })
    .addCase(fetchAllProducts.rejected, (state, action) => {
  state.loading = false;
  if (action.payload === 'offline-no-cache') {
    state.error = 'Offline and no local products available';
    state.all = [];                   // or keep previous
  } else {
    state.error = action.error.message;
  }
})

    .addCase(fetchProductByBarcode.pending, (state) => {
      state.loading = true;
      state.error = '';
    })
    .addCase(fetchProductByBarcode.fulfilled, (state, action) => {
      state.loading = false;
      state.selected = action.payload;
    })
    .addCase(fetchProductByBarcode.rejected, (state, action) => {
      state.loading = false;
      state.selected = null;
      state.error = action.error.message;
    })

    .addCase(suggestProducts.fulfilled, (state, action) => {
      state.suggestions = action.payload;
    })
// .addCase(updateProductStockOnly.fulfilled, (state, action) => {
//   const updated = action.payload;

//   if (!Array.isArray(state.all)) {
//     console.warn('❌ state.all is corrupted or not an array in updateProductStockOnly:', state.all);
//     state.all = [];
//     return;
//   }

//   const productIndex = state.all.findIndex((p) => p._id === updated._id);
//   if (productIndex === -1) {
//     console.warn('⚠️ Product not found:', updated._id);
//     return;
//   }

//   const product = state.all[productIndex];
//   const brand = product.details?.find(b => b._id === updated.brandID);
//   if (!brand) {
//     console.warn('⚠️ Brand not found in product:', updated.brandID);
//     return;
//   }

//   const financial = brand.financials?.find(f => f._id === updated.financialID);
//   if (!financial) {
//     console.warn('⚠️ Financial not found:', updated.financialID);
//     return;
//   }

//   // ✅ Safely update quantity
//   financial.quantity = updated.quantity;
//   cacheProducts(state.all);
// })
.addCase(updateProductStockOnly.fulfilled, (state, { payload }) => {
  const { productID, brandID, financialID, countInStock } = payload || {};

  if (!Array.isArray(state.all)) return;

  const pIndex = state.all.findIndex(p => p._id === productID);
  if (pIndex === -1) return;

  const product = state.all[pIndex];
  const brand = product.details?.find(b => b._id === brandID);
  if (!brand) return;

  const financial = brand.financials?.find(f => f._id === financialID);
  if (!financial) return;

  financial.countInStock = countInStock;         // ✅ apply update
  // optional: financial.countInStock = quantity;
  try { cacheProducts(state.all); } catch {}
})


    .addCase(updateProductStockOnly.rejected, (state, action) => {
      state.error = action.payload || 'Stock update failed';
    })
    .addCase(fetchProductByCatalogId.pending, (state) => {
  state.loading = true;
  state.error = '';
})
.addCase(fetchProductByCatalogId.fulfilled, (state, action) => {
  state.loading = false;
  state.selected = action.payload;
})
.addCase(fetchProductByCatalogId.rejected, (state, action) => {
  state.loading = false;
  state.selected = null;
  state.error = action.error.message;
})
.addCase(deleteProduct.fulfilled, (state, action) => {
    const { id } = action.payload;
    state.all = state.all.filter((p) => p._id !== id);
     cacheProducts(state.all); 
  })
.addCase(deleteProduct.rejected, (state, action) => {
    state.error = action.payload || 'Delete failed';
  });

}

});

export const { clearProduct ,hydrateFromCache  } = productSlice.actions;
export default productSlice.reducer;
