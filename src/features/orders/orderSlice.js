// 📁 src/features/orders/orderSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { updateProductStockOnly } from '../products/productSlice';
import { enqueueOrder, peekOrdersQueue, setOrdersQueue } from '../../utils/offlineStorage';
import { fetchCustomerByPhone, createCustomer } from '../customers/customerSlice'; 
// -----------------------------
// Save order offline (no network)
// -----------------------------
export const queueOrder = createAsyncThunk(
  'orders/queueOrder',
  async ({ payload, token, cartItems, phone }, thunkAPI) => {
    const localOrder = {
      _localId: `OFF-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      queuedAt: new Date().toISOString(),
      payload,                   // what createOrder needs as "payload"
      cartItems: cartItems || [],// snapshot for stock updates later
      __token: token || null,    // optionally capture per-order token
       phone: phone || null, 
    };
    enqueueOrder(localOrder);
    return localOrder;
  }
);

// -----------------------------
// Create order on server (yours)
// -----------------------------
export const createOrder = createAsyncThunk(
  'orders/create',
  async ({ payload, token, cartItems }, thunkAPI) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/orders/pos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Order creation failed');

      // Update product stocks sequentially (as you had)
      for (const item of (cartItems || [])) {
        const newStock = item.stock;
        if (newStock >= 0) {
          try {
            await thunkAPI.dispatch(
              updateProductStockOnly({
                productID: item.id,
                brandID: item.brandId,
                financialID: item.financialId,
                newQuantity: newStock,
                token,
              })
            );
          } catch (err) {
            console.warn('⚠️ Stock update failed for product:', item.id, err.message);
          }
        }
      }
      return data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);

// // ------------------------------------------------------
// // Publish queued orders, one-by-one, using createOrder()
// // ------------------------------------------------------
// export const publishQueuedOrdersSequential = createAsyncThunk(
//   'orders/publishQueuedSequential',
//   async ({ token }, thunkAPI) => {
//     if (typeof navigator !== 'undefined' && !navigator.onLine) {
//       return thunkAPI.rejectWithValue('Offline: cannot publish now');
//     }

//     const queue = peekOrdersQueue();
//     if (!queue.length) return { published: 0, failed: 0, results: [] };

//     const results = [];
//     const remaining = [];
//     let published = 0;

//     for (const item of queue) {
//       const { payload, cartItems, _localId, __token } = item;
//       const tok = __token || token || thunkAPI.getState().posUser?.userInfo?.token;

//       try {
//         const res = await thunkAPI
//           .dispatch(createOrder({ payload, token: tok, cartItems }))
//           .unwrap();

//         results.push({ localId: _localId, ok: true, serverId: res?._id });
//         published += 1;
//         // success → do not push to remaining
//       } catch (e) {
//         results.push({ localId: _localId, ok: false, error: e?.message || String(e) });
//         remaining.push(item); // keep failed ones
//       }
//     }

//     setOrdersQueue(remaining);
//     return { published, failed: remaining.length, results };
//   }
// );
// Publish queued orders sequentially, verifying/creating customer first
export const publishQueuedOrdersSequential = createAsyncThunk(
  'orders/publishQueuedSequential',
  async ({ token }, thunkAPI) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return thunkAPI.rejectWithValue('Offline: cannot publish now');
    }

    const state = thunkAPI.getState();
    const fallbackToken = state.posUser?.userInfo?.token;
    const queue = peekOrdersQueue();
    if (!queue.length) return { published: 0, failed: 0, results: [] };

    const remaining = [];
    const results = [];
    let published = 0;

    for (const item of queue) {
      const tok = item.__token || token || fallbackToken;
      let payload = { ...item.payload }; // don’t mutate the queued snapshot

      try {
        // 1) Ensure customer is valid on server (by phone if we have it)
        const phone = item.phone;
        if (phone) {
          let cust = null;
          try {
            cust = await thunkAPI.dispatch(fetchCustomerByPhone({ phone, token: tok })).unwrap();
          } catch {
            cust = null;
          }
          if (!cust?._id) {
            const name = item.customerMeta?.name || 'NA';
            // build address in whatever format your API expects
            const addr =
              item.customerMeta?.address || item.customerMeta?.city || item.customerMeta?.postalCode
                ? { street: item.customerMeta?.address || 'NA',
                    city: item.customerMeta?.city || 'NA',
                    postalCode: item.customerMeta?.postalCode || '000000' }
                : 'NA';
            try {
              cust = await thunkAPI
                .dispatch(createCustomer({ name, phone, address: addr, token: tok }))
                .unwrap();
            } catch (e) {
              results.push({ localId: item._localId, ok: false, error: 'Customer create failed: ' + (e?.message || e) });
              remaining.push(item);
              continue; // next queue item
            }
          }
          payload.user = cust._id;
        }

        // 2) Create order on server (sequential via await)
        const res = await thunkAPI
          .dispatch(createOrder({ payload, token: tok, cartItems: item.cartItems }))
          .unwrap();

        results.push({ localId: item._localId, ok: true, serverId: res?._id });
        published += 1;
        // success → not pushed to remaining
      } catch (e) {
        results.push({ localId: item._localId, ok: false, error: e?.message || String(e) });
        remaining.push(item); // keep to retry later
      }
    }

    setOrdersQueue(remaining);
    return { published, failed: remaining.length, results };
  }
);
// -----------------------------
// Other existing thunks (kept as-is)
// -----------------------------
export const fetchLatestOrders = createAsyncThunk(
  'orders/fetchLatest',
  async (_, thunkAPI) => {
    const token = thunkAPI.getState().posUser?.userInfo?.token;
    const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/orders/pos`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch orders');
    return data;
  }
);

export const fetchPackingOrders = createAsyncThunk(
  'orders/fetchPacking',
  async (_, thunkAPI) => {
    const token = thunkAPI.getState().posUser?.userInfo?.token;
    const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/orders/pos/orders/packing`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch packing orders');
    return data;
  }
);

export const fetchDispatchOrders = createAsyncThunk(
  'orders/fetchDispatch',
  async (_, thunkAPI) => {
    const token = thunkAPI.getState().posUser?.userInfo?.token;
    const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/orders/pos/orders/dispatch`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch dispatch orders');
    return data;
  }
);

export const fetchDeliveryOrders = createAsyncThunk(
  'orders/fetchDelivery',
  async (_, thunkAPI) => {
    const token = thunkAPI.getState().posUser?.userInfo?.token;
    const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/orders/pos/orders/delivery`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch delivery orders');
    return data;
  }
);

export const fetchAllOrdersWithTimers = createAsyncThunk(
  'orders/fetchAllTimers',
  async (_, thunkAPI) => {
    const token = thunkAPI.getState().posUser?.userInfo?.token;
    const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/orders/pos/orders/all`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch all timed orders');
    return data;
  }
);

export const markOrderAsPacked = createAsyncThunk(
  'orders/markPacked',
  async ({ id, token }, thunkAPI) => {
    const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/orders/pos/${id}/mark-packed`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to mark packed');
    return data;
  }
);

export const markOrderAsDispatched = createAsyncThunk(
  'orders/markDispatched',
  async ({ id, token }, thunkAPI) => {
    const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/orders/pos/${id}/mark-dispatched`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to mark dispatched');
    return data;
  }
);

export const markOrderAsDelivered = createAsyncThunk(
  'orders/markAsDelivered',
  async (orderId, { rejectWithValue, getState }) => {
    try {
      const token = getState().posUser?.userInfo?.token;
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/orders/pos/${orderId}/mark-delivered`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to mark as delivered');
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const markOrderAsPaid = createAsyncThunk(
  'orders/markAsPaid',
  async (orderId, { rejectWithValue, getState }) => {
    try {
      const token = getState().posUser?.userInfo?.token;
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/orders/pos/${orderId}/mark-paid`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to mark as paid');
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// -----------------------------
// Slice
// -----------------------------
const orderSlice = createSlice({
  name: 'orders',
  initialState: {
    all: [],
    latest: null,
    recent: [],
    packing: [],
    dispatch: [],
    delivery: [],
    managerView: [],
    loading: false,
    error: '',
    // offline queue/publish ui
    queueCount: peekOrdersQueue().length,
    publishStatus: 'idle',
    publishMsg: '',
    lastPublishResults: [],
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // queue locally
      .addCase(queueOrder.fulfilled, (state, action) => {
        state.recent = [{ ...action.payload, _status: 'QUEUED' }, ...state.recent].slice(0, 50);
        state.queueCount = peekOrdersQueue().length;
      })

      // create on server (existing)
      .addCase(createOrder.pending, (state) => {
        state.loading = true;
        state.error = '';
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.latest = action.payload;
        if (!Array.isArray(state.all)) state.all = [];
        state.all.unshift(action.payload);
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // publish queued → sequential
      .addCase(publishQueuedOrdersSequential.pending, (state) => {
        state.publishStatus = 'loading';
        state.publishMsg = '';
        state.lastPublishResults = [];
      })
      .addCase(publishQueuedOrdersSequential.fulfilled, (state, action) => {
        state.publishStatus = 'succeeded';
        const { published, failed, results } = action.payload || {};
        state.publishMsg = `Published ${published} order(s).${failed ? ` ${failed} failed.` : ''}`;
        state.queueCount = peekOrdersQueue().length;
        state.lastPublishResults = results || [];
      })
      .addCase(publishQueuedOrdersSequential.rejected, (state, action) => {
        state.publishStatus = 'failed';
        state.publishMsg = action.payload || action.error?.message || 'Publish failed';
      })

      // existing lists…
      .addCase(fetchLatestOrders.pending, (state) => {
        state.loading = true;
        state.error = '';
      })
      .addCase(fetchLatestOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.recent = action.payload;
      })
      .addCase(fetchLatestOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(fetchPackingOrders.pending, (state) => {
        state.loading = true;
        state.error = '';
      })
      .addCase(fetchPackingOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload;
      })
      .addCase(fetchPackingOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(fetchDispatchOrders.pending, (state) => {
        state.loading = true;
        state.error = '';
      })
      .addCase(fetchDispatchOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.dispatch = action.payload;
      })
      .addCase(fetchDispatchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(fetchDeliveryOrders.pending, (state) => {
        state.loading = true;
        state.error = '';
      })
      .addCase(fetchDeliveryOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.delivery = action.payload;
      })
      .addCase(fetchDeliveryOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(fetchAllOrdersWithTimers.pending, (state) => {
        state.loading = true;
        state.error = '';
      })
      .addCase(fetchAllOrdersWithTimers.fulfilled, (state, action) => {
        state.loading = false;
        state.managerView = action.payload;
      })
      .addCase(fetchAllOrdersWithTimers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(markOrderAsPacked.fulfilled, (state, action) => {
        state.updatedOrder = action.payload;
      })
      .addCase(markOrderAsDispatched.fulfilled, (state, action) => {
        state.updatedOrder = action.payload;
      })
      .addCase(markOrderAsDelivered.fulfilled, (state, action) => {
        state.updatedOrder = action.payload;
      })
      .addCase(markOrderAsPaid.pending, (state) => {
        state.paidStatus = { loading: true, success: false, error: null };
      })
      .addCase(markOrderAsPaid.fulfilled, (state) => {
        state.paidStatus = { loading: false, success: true, error: null };
      })
      .addCase(markOrderAsPaid.rejected, (state, action) => {
        state.paidStatus = { loading: false, success: false, error: action.payload };
      });
  },
});

export default orderSlice.reducer;
