// src/features/auth/posUserSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchAllProductsFresh } from '../products/productSlice'; // ⬅️ add this

const userFromStorage = localStorage.getItem('posUserInfo')
  ? JSON.parse(localStorage.getItem('posUserInfo'))
  : null;

// Small helper so we don't repeat keys everywhere
const clearProductCache = () => {
  try {
    localStorage.removeItem('mkpos.products');
    localStorage.removeItem('mk_products_v1');
  } catch {}
};

export const loginPosUser = createAsyncThunk(
  'posUser/login',
  async ({ username, password, location }, thunkAPI) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/posusers/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, location }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');

      // After successful login:
      const tokenFromLogin = data?.token;

      // If we're online, clear old product cache and fetch fresh from DB.
      // If offline, keep cache so POS still works.
      const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (tokenFromLogin && online) {
        clearProductCache();
        thunkAPI.dispatch(fetchAllProductsFresh(tokenFromLogin));
      }

      return data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);

export const adjustPosUserBalance = createAsyncThunk(
  'posUser/adjustBalance',
  async ({ id, delta, token }, { rejectWithValue }) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/posusers/${id}/balance/adjust`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ delta }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to adjust balance');
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const getPosUserBalance = createAsyncThunk(
  'posUser/getBalance',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { _id, token } = getState().posUser.userInfo || {};
      if (!_id || !token) throw new Error('User ID or token missing');

      const res = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/posusers/balance/${_id}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch balance');
      return data; // { _id, balance }
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const setPosUserBalance = createAsyncThunk(
  'posUser/setBalance',
  async ({ id, balance, token }, { rejectWithValue }) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/pos_users/${id}/balance`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ balance }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to set balance');
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
      // clear user + product caches
      localStorage.removeItem('posUserInfo');
      clearProductCache();
    },
  },
  extraReducers: (builder) => {
    builder
      // login
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
      })

      // set balance
      .addCase(setPosUserBalance.pending, (state) => {
        state.error = null;
      })
      .addCase(setPosUserBalance.fulfilled, (state, action) => {
        const updated = action.payload;
        if (state.userInfo && state.userInfo._id === updated._id) {
          state.userInfo = { ...state.userInfo, balance: updated.balance };
          localStorage.setItem('posUserInfo', JSON.stringify(state.userInfo));
        }
      })
      .addCase(setPosUserBalance.rejected, (state, action) => {
        state.error = action.payload;
      })

      // adjust balance
      .addCase(adjustPosUserBalance.pending, (state) => {
        state.error = null;
      })
      .addCase(adjustPosUserBalance.fulfilled, (state, action) => {
        const updated = action.payload;
        if (state.userInfo && state.userInfo._id === updated._id) {
          state.userInfo = { ...state.userInfo, balance: updated.balance };
          localStorage.setItem('posUserInfo', JSON.stringify(state.userInfo));
        }
      })
      .addCase(adjustPosUserBalance.rejected, (state, action) => {
        state.error = action.payload;
      })

      // get balance
      .addCase(getPosUserBalance.fulfilled, (state, action) => {
        const updated = action.payload;
        if (state.userInfo && state.userInfo._id === updated._id) {
          state.userInfo = { ...state.userInfo, balance: updated.balance };
          localStorage.setItem('posUserInfo', JSON.stringify(state.userInfo));
        }
      })
      .addCase(getPosUserBalance.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { logout } = posUserSlice.actions;
export default posUserSlice.reducer;
