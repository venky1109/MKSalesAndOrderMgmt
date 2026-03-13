import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_BASE_URL;

// Delivery payment
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

      return data;
    } catch (error) {
      console.error('Delivery payment error:', error);
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Unknown error'
      );
    }
  }
);

// POS / general UPI payment initiation
export const initiateUpiPayment = createAsyncThunk(
  'payment/initiateUpiPayment',
  async (paymentData, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(
        `${BASE_URL}/payments/initiateJuspayPayment`,
        paymentData
      );
      return data?.data || data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.response?.data ||
          error.message ||
          'UPI payment initiation failed'
      );
    }
  }
);

// POS payment completion / verification after Juspay redirect
export const completePosUpiPayment = createAsyncThunk(
  'payment/completePosUpiPayment',
  async ({ orderId, amount, cartItems }, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(
        `${BASE_URL}/payments/completePosUpiPayment`,
        {
          orderId,
          amount,
          cartItems,
        }
      );

      return data;
    } catch (error) {
      console.error(
        'POS UPI completion error:',
        error.response?.data || error.message
      );
      return rejectWithValue(
        error.response?.data?.message ||
          error.response?.data ||
          error.message ||
          'UPI payment verification failed'
      );
    }
  }
);

const paymentSlice = createSlice({
  name: 'payment',
  initialState: {
    loading: false,
    error: null,

    // delivery
    paymentUrl: null,

    // UPI initiate response
    upiInitiateResponse: null,

    // UPI complete response
    upiCompleteResponse: null,

    // final verification flag
    upiVerified: false,
  },
  reducers: {
    clearPaymentState: (state) => {
      state.loading = false;
      state.error = null;
      state.paymentUrl = null;
      state.upiInitiateResponse = null;
      state.upiCompleteResponse = null;
      state.upiVerified = false;
    },
    clearUpiVerificationState: (state) => {
      state.error = null;
      state.upiCompleteResponse = null;
      state.upiVerified = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // delivery payment
      .addCase(initiateDeliveryPayment.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.paymentUrl = null;
      })
      .addCase(initiateDeliveryPayment.fulfilled, (state, action) => {
        state.loading = false;
        state.paymentUrl =
          action.payload?.redirect_url ||
          action.payload?.payment_links?.web ||
          null;
      })
      .addCase(initiateDeliveryPayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Payment failed';
      })

      // UPI initiate
      .addCase(initiateUpiPayment.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.upiInitiateResponse = null;
      })
      .addCase(initiateUpiPayment.fulfilled, (state, action) => {
        state.loading = false;
        state.upiInitiateResponse = action.payload;
      })
      .addCase(initiateUpiPayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'UPI payment initiation failed';
      })

      // UPI complete
      .addCase(completePosUpiPayment.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.upiCompleteResponse = null;
        state.upiVerified = false;
      })
      .addCase(completePosUpiPayment.fulfilled, (state, action) => {
        state.loading = false;
        state.upiCompleteResponse = action.payload;
        state.upiVerified = !!action.payload?.success;
      })
      .addCase(completePosUpiPayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'UPI payment verification failed';
        state.upiVerified = false;
      });
  },
});

export const { clearPaymentState, clearUpiVerificationState } =
  paymentSlice.actions;

export default paymentSlice.reducer;