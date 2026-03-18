import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { createOrder } from '../orders/orderSlice';

const BASE_URL = process.env.REACT_APP_API_BASE_URL;

const generateMKOrderId = () =>
  Number(`${Date.now()}${Math.floor(Math.random() * 90 + 10)}`);

// -----------------------------
// Initiate payment for existing delivery order
// -----------------------------
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

// -----------------------------
// Create POS UPI order + save snapshot + initiate payment
// -----------------------------
export const initiateUpiPayment = createAsyncThunk(
  'payment/initiateUpiPayment',
  async ({ payload, token, cartItems, phoneNumber }, thunkAPI) => {
    try {
      const mkOrderId = payload?.MK_order_id || generateMKOrderId();

      const finalPayload = {
        ...payload,
        MK_order_id: mkOrderId,
      };

      // 1) Create order first
      const orderRes = await thunkAPI.dispatch(
        createOrder({ payload: finalPayload, token, cartItems })
      ).unwrap();

      const orderId = orderRes?._id;
      if (!orderId) {
        throw new Error('Order created but order ID missing');
      }

      // 2) Save invoice snapshot with REAL order id
      const upiInvoiceSnapshot = {
        orderId,
        mkOrderId,
        items: (cartItems || []).map((item) => ({
          item: item.item,
          name: item.item,
          catalogQuantity: item.catalogQuantity,
          quantity: item.catalogQuantity,
          units: item.units,
          brand: item.brand,
          qty: item.qty,
          image: item.image || '',
          dprice: item.dprice,
          price: item.dprice,
          id: item.id,
          productId: item.id,
          brandId: item.brandId,
          financialId: item.financialId,
        })),
        total: Number(orderRes?.totalPrice || finalPayload?.totalPrice || 0),
        totalPrice: Number(orderRes?.totalPrice || finalPayload?.totalPrice || 0),
        totalQty: (cartItems || []).reduce(
          (sum, item) => sum + Number(item.qty || 0),
          0
        ),
        totalDiscount: Number(orderRes?.totalDiscount || 0),
        phone: phoneNumber || payload?.phoneNo || '',
        paymentMethod: 'UPI',
        datetime: orderRes?.createdAt || new Date().toISOString(),
        posUserName: payload?.posUserName || '',
        posLocation: payload?.posLocation || '',
        source: payload?.source || 'POS',
      };

      localStorage.setItem(
        'upiInvoiceSnapshot',
        JSON.stringify(upiInvoiceSnapshot)
      );

      // 3) Initiate payment using SAME created order
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
        orderId,
        MK_order_id: mkOrderId,
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message || 'UPI payment failed'
      );
    }
  }
);

// -----------------------------
// Retry payment for SAME existing order
// -----------------------------
export const retryExistingUpiPayment = createAsyncThunk(
  'payment/retryExistingUpiPayment',
  async ({ orderId, token }, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(
        `${BASE_URL}/payments/retry/${orderId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return {
        ...data,
        orderId,
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Retry payment failed'
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
      // initiate delivery payment
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

      // initiate UPI payment
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
      })

      // retry same order payment
      .addCase(retryExistingUpiPayment.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
        state.paymentUrl = null;
        state.data = null;
      })
      .addCase(retryExistingUpiPayment.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.paymentUrl = extractPaymentUrl(action.payload);
        state.data = action.payload;
      })
      .addCase(retryExistingUpiPayment.rejected, (state, action) => {
        state.loading = false;
        state.success = false;
        state.error = action.payload || 'Retry payment failed';
      });
  },
});

export const { clearPaymentState } = paymentSlice.actions;
export default paymentSlice.reducer;