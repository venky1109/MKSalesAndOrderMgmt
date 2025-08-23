// 📁 src/features/products/productFiltersSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = { category: 'all', brand: 'all', search: '' };

const productFiltersSlice = createSlice({
  name: 'productFilters',
  initialState,
  reducers: {
    setCategory: (s, a) => { s.category = (a.payload ?? 'all').toLowerCase(); },
    setBrand: (s, a) => { s.brand = (a.payload ?? 'all').toLowerCase(); },
    setSearch: (s, a) => { s.search = a.payload ?? ''; },
    clearFilters: (s) => { s.category = 'all'; s.brand = 'all'; s.search = ''; },
  },
});
export const { setCategory, setBrand, setSearch, clearFilters } = productFiltersSlice.actions;
export default productFiltersSlice.reducer;
