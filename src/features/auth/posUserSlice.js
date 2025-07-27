// src/features/auth/posUserSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const userFromStorage = localStorage.getItem('posUserInfo')
  ? JSON.parse(localStorage.getItem('posUserInfo'))
  : null;

export const loginPosUser = createAsyncThunk(
  'posUser/login',
  async ({ username, password }, { rejectWithValue }) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/posusers/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        // credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const posUserSlice = createSlice({
  name: 'posUser',
  initialState: {
    userInfo: userFromStorage,
    loading: false,
    error: null,
  },
  reducers: {
    logout: (state) => {
      state.userInfo = null;
      localStorage.removeItem('posUserInfo');
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginPosUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginPosUser.fulfilled, (state, action) => {
        state.loading = false;
        state.userInfo = action.payload;
        localStorage.setItem('posUserInfo', JSON.stringify(action.payload));
      })
      .addCase(loginPosUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { logout } = posUserSlice.actions;
export default posUserSlice.reducer;
