import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';
import { API_BASE_URL } from '../../utils/apiConfig';

const API_BASE = `${API_BASE_URL}/advertisements`;

const getConfig = (getState) => {
  const token = getState().posUser?.userInfo?.token;
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
};

export const fetchRepositories = createAsyncThunk(
  'advertisements/fetchRepositories',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.get(`${API_BASE}/repositories`, getConfig(getState));
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const createRepository = createAsyncThunk(
  'advertisements/createRepository',
  async (payload, { getState, dispatch, rejectWithValue }) => {
    try {
      const { data } = await axios.post(`${API_BASE}/repositories`, payload, getConfig(getState));
      dispatch(fetchRepositories());
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const updateRepository = createAsyncThunk(
  'advertisements/updateRepository',
  async ({ id, payload }, { getState, dispatch, rejectWithValue }) => {
    try {
      const { data } = await axios.put(`${API_BASE}/repositories/${id}`, payload, getConfig(getState));
      dispatch(fetchRepositories());
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const deleteRepository = createAsyncThunk(
  'advertisements/deleteRepository',
  async (id, { getState, dispatch, rejectWithValue }) => {
    try {
      await axios.delete(`${API_BASE}/repositories/${id}`, getConfig(getState));
      dispatch(fetchRepositories());
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const fetchAdvertisements = createAsyncThunk(
  'advertisements/fetchAdvertisements',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.get(API_BASE, getConfig(getState));
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const uploadAdvertisementMedia = createAsyncThunk(
  'advertisements/uploadMedia',
  async (file, { getState, rejectWithValue }) => {
    try {
      const token = getState().posUser?.userInfo?.token;
      const formData = new FormData();
      formData.append('media', file);
      const { data } = await axios.post(`${API_BASE}/media`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const createAdvertisement = createAsyncThunk(
  'advertisements/createAdvertisement',
  async ({ advertisement, details }, { getState, dispatch, rejectWithValue }) => {
    try {
      const { data: created } = await axios.post(API_BASE, advertisement, getConfig(getState));
      for (const detail of details) {
        await axios.post(`${API_BASE}/${created.id}/details`, detail, getConfig(getState));
      }
      dispatch(fetchAdvertisements());
      return created;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const updateAdvertisement = createAsyncThunk(
  'advertisements/updateAdvertisement',
  async ({ id, payload }, { getState, dispatch, rejectWithValue }) => {
    try {
      const { data } = await axios.put(`${API_BASE}/${id}`, payload, getConfig(getState));
      dispatch(fetchAdvertisements());
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const deleteAdvertisement = createAsyncThunk(
  'advertisements/deleteAdvertisement',
  async (id, { getState, dispatch, rejectWithValue }) => {
    try {
      await axios.delete(`${API_BASE}/${id}`, getConfig(getState));
      dispatch(fetchAdvertisements());
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const generateCanvaAdvertisementExport = createAsyncThunk(
  'advertisements/generateCanvaExport',
  async (id, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.post(`${API_BASE}/${id}/canva-export`, {}, getConfig(getState));
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);

const advertisementSlice = createSlice({
  name: 'advertisements',
  initialState: {
    repositories: [],
    items: [],
    loading: false,
    saving: false,
    error: null,
    successMessage: null,
    canvaExportMessage: null,
  },
  reducers: {
    clearAdvertisementMessage: (state) => {
      state.error = null;
      state.successMessage = null;
      state.canvaExportMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRepositories.fulfilled, (state, action) => {
        state.repositories = action.payload || [];
      })
      .addCase(fetchAdvertisements.fulfilled, (state, action) => {
        state.items = action.payload || [];
      })
      .addMatcher(
        (action) => action.type.startsWith('advertisements/') && action.type.endsWith('/pending'),
        (state, action) => {
          state.error = null;
          if (action.type.includes('create') || action.type.includes('update')) {
            state.saving = true;
          } else {
            state.loading = true;
          }
        }
      )
      .addMatcher(
        (action) => action.type.startsWith('advertisements/') && action.type.endsWith('/fulfilled'),
        (state, action) => {
          state.loading = false;
          state.saving = false;
          if (action.type.includes('generateCanvaExport')) {
            state.canvaExportMessage = action.payload?.message || 'Canva export started';
            return;
          }
          if (!action.type.includes('fetch')) {
            state.successMessage = 'Advertisement saved successfully';
          }
        }
      )
      .addMatcher(
        (action) => action.type.startsWith('advertisements/') && action.type.endsWith('/rejected'),
        (state, action) => {
          state.loading = false;
          state.saving = false;
          state.error = action.payload?.message || action.payload || 'Something went wrong';
          if (action.type.includes('generateCanvaExport') && action.payload?.canvaPayload) {
            state.canvaExportMessage = `${state.error} Configuration payload is ready.`;
          }
        }
      );
  },
});

export const { clearAdvertisementMessage } = advertisementSlice.actions;
export default advertisementSlice.reducer;
