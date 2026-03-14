import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { createOrder } from '../orders/orderSlice';

const BASE_URL = process.env.REACT_APP_API_BASE_URL;

const generateMKOrderId = () =>
  Number(`${Date.now()}${Math.floor(Math.random() * 90 + 10)}`);

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
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Unknown error'
      );
    }
  }
);

export const initiateUpiPayment = createAsyncThunk(
  'payment/initiateUpiPayment',
  async ({ payload, token, cartItems, phoneNumber }, thunkAPI) => {
    try {
      const mkOrderId = payload?.MK_order_id || generateMKOrderId();

      const finalPayload = {
        ...payload,
        MK_order_id: mkOrderId,
      };

      const orderRes = await thunkAPI.dispatch(
        createOrder({ payload: finalPayload, token, cartItems })
      ).unwrap();

      const orderId = orderRes?._id;
      if (!orderId) {
        throw new Error('Order created but order ID missing');
      }

      const { data } = await axios.post(
        `${BASE_URL}/payments/initiateJuspayPaymentAtDelivery`,
        {
          customerId: phoneNumber,
          order_id: orderId,
          amount: orderRes.totalPrice || finalPayload.totalPrice,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return {
        ...data,
        createdOrder: orderRes,
        MK_order_id: mkOrderId,
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message || 'UPI payment failed'
      );
    }
  }
);

const extractPaymentUrl = (payload) =>
  payload?.redirect_url ||
  payload?.paymentUrl ||
  payload?.webUrl ||
  payload?.data?.payment_links?.web ||
  null;

const paymentSlice = createSlice({
  name: 'payment',
  initialState: {
    loading: false,
    error: null,
    success: false,
    paymentUrl: null,
    data: null,
  },
  reducers: {
    clearPaymentState: (state) => {
      state.loading = false;
      state.error = null;
      state.success = false;
      state.paymentUrl = null;
      state.data = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initiateDeliveryPayment.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
        state.paymentUrl = null;
        state.data = null;
      })
      .addCase(initiateDeliveryPayment.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.paymentUrl = extractPaymentUrl(action.payload);
        state.data = action.payload;
      })
      .addCase(initiateDeliveryPayment.rejected, (state, action) => {
        state.loading = false;
        state.success = false;
        state.error = action.payload || 'Payment failed';
      })
      .addCase(initiateUpiPayment.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
        state.paymentUrl = null;
        state.data = null;
      })
      .addCase(initiateUpiPayment.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.paymentUrl = extractPaymentUrl(action.payload);
        state.data = action.payload;
      })
      .addCase(initiateUpiPayment.rejected, (state, action) => {
        state.loading = false;
        state.success = false;
        state.error = action.payload || 'UPI payment failed';
      });
  },
});

export const { clearPaymentState } = paymentSlice.actions;
export default paymentSlice.reducer;
