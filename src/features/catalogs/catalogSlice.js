// 📁 src/features/catalogs/catalogSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchCatalogs = createAsyncThunk(
  'catalogs/fetchAll',
  async ({ token }) => { // destructure token from object
    const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/catalogs`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    // console.log("📡 Fetched catalogs from API:", data);
    if (!res.ok) throw new Error(data.error || 'Failed to fetch catalogs');
    return data;
  }
);


// ➕ Add a new catalog
export const addCatalog = createAsyncThunk(
  'catalogs/add',
  async ({ token, payload }) => {
    const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/catalogs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload), // ✅ This must be { categoryName, productName, quantity, ... }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add catalog');
    return data;
  }
);


const catalogSlice = createSlice({
  name: 'catalogs',
  initialState: {
    all: [],
    loading: false,
    error: '',
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCatalogs.pending, (state) => {
        state.loading = true;
        state.error = '';
      })
      .addCase(fetchCatalogs.fulfilled, (state, action) => {
        // console.log("✅ catalogs fetched from API:", action.payload);
        state.loading = false;
        state.all = action.payload;
      })
      .addCase(fetchCatalogs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(addCatalog.fulfilled, (state, action) => {
        state.all.push(action.payload);
      })
      .addCase(addCatalog.rejected, (state, action) => {
        state.error = action.error.message;
      });
  },
});

export default catalogSlice.reducer;
