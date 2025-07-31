// 📁 src/features/orders/orderSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { updateProductStockOnly } from '../products/productSlice';

// ➕ Create POS Order
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
  
      // console.log( JSON.stringify(payload))
//      console.log('Status:', response.status); // should be 201
// console.log('Response OK:', response.ok); // should be true
// console.log('Data:', data);



      if (!response.ok) throw new Error(data.message || 'Order creation failed');
      // console.log('stock update '+JSON.stringify(cartItems));
      for (const item of cartItems) {
        const newStock = item.stock;
        if (newStock >= 0) {
          // // await thunkAPI.dispatch(
          //   updateProductStockOnly({
          //     productID: item.id,
          //     brandID:item.brandId,
          //     financialID:item.financialId,
          //     newQuantity: newStock,
          //     token,
          //   })
          // // );
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


export const fetchLatestOrders = createAsyncThunk(
  'orders/fetchLatest',
  async (_, thunkAPI) => {
    const token = thunkAPI.getState().posUser?.userInfo?.token;

    const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/orders/pos`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
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
      headers: {
        Authorization: `Bearer ${token}`,
      },
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
      headers: {
        Authorization: `Bearer ${token}`,
      },
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
      headers: {
        Authorization: `Bearer ${token}`,
      },
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
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch all timed orders');
    return data;
  }
);

// Mark Packed
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

// Mark Dispatched
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

// Mark Delivered
// export const markOrderAsDelivered = createAsyncThunk(
//   'orders/markDelivered',
//   async ({ id, token }, thunkAPI) => {
//     const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/orders/pos/${id}/mark-delivered`, {
//       method: 'PUT',
//       headers: { Authorization: `Bearer ${token}` },
//     });
//     const data = await res.json();
//     if (!res.ok) throw new Error(data.message || 'Failed to mark delivered');
//     return data;
//   }
// );
// features/orders/orderSlice.js
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



const orderSlice = createSlice({
  name: 'orders',
 initialState: {
  // orders:[],
  all: [],
  latest: null,
  recent: [],
   packing: [],
  dispatch: [],
  delivery: [],
  managerView: [],
  loading: false,
  error: '',
},
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(createOrder.pending, (state) => {
        state.loading = true;
        state.error = '';
      })
    .addCase(createOrder.fulfilled, (state, action) => {
  state.loading = false;
  state.latest = action.payload;

  if (!Array.isArray(state.all)) {
    console.warn('⚠️ state.all was not an array. Reinitializing it.');
    state.all = [];
  }

  state.all.unshift(action.payload);
})



      .addCase(createOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

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
            // 🟨 Packing Orders
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

      // 🟧 Dispatch Orders
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

      // 🟩 Delivery Orders
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

      // 🟦 All Orders for ONLINE_ORDER_MANAGER
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
