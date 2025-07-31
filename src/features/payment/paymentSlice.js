import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_BASE_URL;

// 🚀 Async Thunk for Payment Initiation (Delivery Agent)
export const initiateDeliveryPayment = createAsyncThunk(
  'payment/initiateDeliveryPayment',
  async ({ customerId, order_id, amount }, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(
        `${BASE_URL}/payments/initiateJuspayPaymentAtDelivery`,
        {
          customerId,
          order_id,
          amount,
        }
      );
      //  console.log('Order payment response from 1 backend:', data);
      return data; // Should include redirect_url
    } catch (error) {
      console.error('🚨 Payment error:', error);
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Unknown error'
      );
    }
  }
);


export const handleUpiPayment = createAsyncThunk(
  'payment/handleUpiPayment',
  async (paymentData, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(
        `${BASE_URL}/payments/initiateJuspayPayment`, // ✅ Make sure this backend route exists
        paymentData
      );
      return data;
    } catch (error) {
      console.error('UPI Payment error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);


const paymentSlice = createSlice({
  name: 'payment',
  initialState: {
    loading: false,
    error: null,
    paymentUrl: null,
  },
  reducers: {
    clearPaymentState: (state) => {
      state.loading = false;
      state.error = null;
      state.paymentUrl = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initiateDeliveryPayment.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.paymentUrl = null;
      })
      .addCase(initiateDeliveryPayment.fulfilled, (state, action) => {
        state.loading = false;
        state.paymentUrl = action.payload?.redirect_url || null;
      })
      .addCase(initiateDeliveryPayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Payment failed';
      })
      .addCase(handleUpiPayment.pending, (state) => {
  state.loading = true;
  state.error = null;
})
.addCase(handleUpiPayment.fulfilled, (state, action) => {
  state.loading = false;
  state.paymentResponse = action.payload;
})
.addCase(handleUpiPayment.rejected, (state, action) => {
  state.loading = false;
  state.error = action.payload;
});

  },
});

export const { clearPaymentState } = paymentSlice.actions;

export default paymentSlice.reducer;
