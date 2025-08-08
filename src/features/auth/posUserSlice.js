// src/features/auth/posUserSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const userFromStorage = localStorage.getItem('posUserInfo')
  ? JSON.parse(localStorage.getItem('posUserInfo'))
  : null;

export const loginPosUser = createAsyncThunk(
  'posUser/login',
  async ({ username, password,location }, { rejectWithValue }) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/posusers/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, location }),
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
      return data; // updated user (projection includes balance)
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);
// 🔹 NEW: Get balance only
export const getPosUserBalance = createAsyncThunk(
  'posUser/getBalance',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { _id, token } = getState().posUser.userInfo || {};
      // console.log('123'+getState().posUserInfo )

      if (!_id || !token) {
        throw new Error('User ID or token missing');
      }

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

      return data; // expected { _id, balance }
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

/**
 * Set balance to an exact value
 * PATCH /api/pos_users/:id/balance
 * body: { balance }
 */
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
      return data; // updated user (projection includes balance)
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
      }) 
            .addCase(setPosUserBalance.pending, (state) => {
        state.error = null;
      })
      .addCase(setPosUserBalance.fulfilled, (state, action) => {
        // action.payload is updated user with new balance
        const updated = action.payload;
        if (state.userInfo && state.userInfo._id === updated._id) {
          state.userInfo = { ...state.userInfo, balance: updated.balance };
          localStorage.setItem('posUserInfo', JSON.stringify(state.userInfo));
        }
      })
      .addCase(setPosUserBalance.rejected, (state, action) => {
        state.error = action.payload;
      })
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
      }) // Get balance only
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
