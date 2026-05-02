import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// const API_BASE = 'http://localhost:5000/api/catalog-pg';
// const API_URL = process.env.REACT_APP_API_BASE_URL || '';
const API_URL = process.env.REACT_APP_API_BASE_URL || '';

const API_BASE = `${API_URL}/catalog-pg`;

const getConfig = (getState) => {
  const token = getState().posUser?.userInfo?.token;
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
};

export const fetchCatalogEntity = createAsyncThunk(
  'catalogCrud/fetchEntity',
  async (entity, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.get(`${API_BASE}/${entity}`, getConfig(getState));
      return { entity, data: Array.isArray(data) ? data : data.data || [] };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const createCatalogEntity = createAsyncThunk(
  'catalogCrud/createEntity',
  async ({ entity, payload }, { getState, rejectWithValue, dispatch }) => {
    try {
      const { data } = await axios.post(`${API_BASE}/${entity}`, payload, getConfig(getState));
      dispatch(fetchCatalogEntity(entity));
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const updateCatalogEntity = createAsyncThunk(
  'catalogCrud/updateEntity',
  async ({ entity, id, payload }, { getState, rejectWithValue, dispatch }) => {
    try {
      const { data } = await axios.put(`${API_BASE}/${entity}/${id}`, payload, getConfig(getState));
      dispatch(fetchCatalogEntity(entity));
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const deleteCatalogEntity = createAsyncThunk(
  'catalogCrud/deleteEntity',
  async ({ entity, id }, { getState, rejectWithValue, dispatch }) => {
    try {
      await axios.delete(`${API_BASE}/${entity}/${id}`, getConfig(getState));
      dispatch(fetchCatalogEntity(entity));
      return { entity, id };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

const catalogCrudSlice = createSlice({
  name: 'catalogCrud',
  initialState: {
    data: {},
    loading: false,
    error: null,
    successMessage: null,
  },
  reducers: {
    clearCatalogCrudMessage: (state) => {
      state.error = null;
      state.successMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addMatcher((action) => action.type.startsWith('catalogCrud/') && action.type.endsWith('/pending'), (state) => {
        state.loading = true;
        state.error = null;
      })
      .addMatcher((action) => action.type.startsWith('catalogCrud/') && action.type.endsWith('/fulfilled'), (state, action) => {
        state.loading = false;

        if (action.type.includes('fetchEntity')) {
          state.data[action.payload.entity] = action.payload.data;
        } else {
          state.successMessage = 'Saved successfully';
        }
      })
      .addMatcher((action) => action.type.startsWith('catalogCrud/') && action.type.endsWith('/rejected'), (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Something went wrong';
      });
  },
});

export const { clearCatalogCrudMessage } = catalogCrudSlice.actions;
export default catalogCrudSlice.reducer;