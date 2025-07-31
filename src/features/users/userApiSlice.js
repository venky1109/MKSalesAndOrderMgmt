import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_BASE_URL;

// 🔍 Async Thunk: Fetch user by phone number
export const getUserByPhoneNo = createAsyncThunk(
  'user/getUserByPhoneNo',
  async (phoneNo, { rejectWithValue, getState }) => {
    try {
      const {
        posUser: { userInfo },
      } = getState(); // Get token from store

      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userInfo?.token}`,
        },
      };

      const { data } = await axios.get(`${BASE_URL}/users/pos/${phoneNo}`, config);

      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'User not found or fetch failed'
      );
    }
  }
);
export const createUser = createAsyncThunk(
  'user/createUser',
  async (userData, { rejectWithValue, getState }) => {
    try {
      const {
        posUser: { userInfo },
      } = getState();

      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userInfo?.token}`,
        },
      };

      const { data } = await axios.post(`${BASE_URL}/users/pos`, userData, config);

      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'User creation failed'
      );
    }
  }
);


// 🧠 Slice
const userSlice = createSlice({
  name: 'user',
  initialState: {
    userInfo: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearUserState: (state) => {
      state.userInfo = null;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getUserByPhoneNo.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUserByPhoneNo.fulfilled, (state, action) => {
        state.loading = false;
        state.userInfo = action.payload;
      })
      .addCase(getUserByPhoneNo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.userInfo = null;
      })

      .addCase(createUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.loading = false;
        state.userInfo = action.payload;
      })
      .addCase(createUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearUserState } = userSlice.actions;
export default userSlice.reducer;
