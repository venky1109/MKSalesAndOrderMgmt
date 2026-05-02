import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_BASE_URL || '';

const authConfig = (getState) => {
  const token = getState()?.posUser?.userInfo?.token;

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const fetchInventoryProducts = createAsyncThunk(
  'stockManagerInventory/fetchInventoryProducts',
  async (_, thunkAPI) => {
    try {
      const { data } = await axios.get(
        `${API_URL}/inventory-pg/products`,
        authConfig(thunkAPI.getState)
      );
      return data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

export const fetchStockTransactions = createAsyncThunk(
  'stockManagerInventory/fetchStockTransactions',
  async (_, thunkAPI) => {
    try {
      const { data } = await axios.get(
        `${API_URL}/inventory-pg/stock-transactions`,
        authConfig(thunkAPI.getState)
      );
      return data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

export const fetchPurchaseOrders = createAsyncThunk(
  'stockManagerInventory/fetchPurchaseOrders',
  async (_, thunkAPI) => {
    try {
      const { data } = await axios.get(
        `${API_URL}/purchases/orders-detailed`,
        authConfig(thunkAPI.getState)
      );
      return data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

export const fetchCatalogBarcodes = createAsyncThunk(
  'stockManagerInventory/fetchCatalogBarcodes',
  async (_, thunkAPI) => {
    try {
      const { userInfo } = thunkAPI.getState().posUser || {};

      const { data } = await axios.get(
        `${API_URL}/catalog-pg/product-barcodes`,
        {
          headers: {
            Authorization: `Bearer ${userInfo?.token}`,
          },
        }
      );

      return data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);


export const verifyReceivedPurchaseOrder = createAsyncThunk(
  'stockManagerInventory/verifyReceivedPurchaseOrder',
  async ({ id, items, remarks }, thunkAPI) => {
    try {
      const { data } = await axios.put(
        `${API_URL}/purchases/orders/${id}/verify-received`,
        { items, remarks },
        authConfig(thunkAPI.getState)
      );

      return data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);
export const updatePurchaseOrderItems = createAsyncThunk(
  'stockManagerInventory/updatePurchaseOrderItems',
  async ({ id, items }, thunkAPI) => {
    try {
      const { data } = await axios.put(
        `${API_URL}/purchases/orders/${id}/items`,
        { items },
        authConfig(thunkAPI.getState)
      );

      return data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);
export const receivePurchaseOrder = createAsyncThunk(
  'stockManagerInventory/receivePurchaseOrder',
  async (payload, thunkAPI) => {
    try {
      const { data } = await axios.post(
        `${API_URL}/inventory-pg/receive-purchase-order`,
        payload,
        authConfig(thunkAPI.getState)
      );
      return data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);
export const createPurchaseOrderWithItems = createAsyncThunk(
  'stockManagerInventory/createPurchaseOrderWithItems',
  async (payload, thunkAPI) => {
    try {
      const { data } = await axios.post(
        `${API_URL}/purchases/orders-with-items`,
        payload,
        authConfig(thunkAPI.getState)
      );
      return data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);
export const fetchCategories = createAsyncThunk(
  'stockManagerInventory/fetchCategories',
  async (_, thunkAPI) => {
    const { data } = await axios.get(
      `${API_URL}/catalog-pg/categories`,
      authConfig(thunkAPI.getState)
    );
    return data;
  }
);
export const createDispatchOrderWithItems = createAsyncThunk(
  'stockManagerInventory/createDispatchOrderWithItems',
  async (payload, thunkAPI) => {
    try {
      const { data } = await axios.post(
        `${API_URL}/dispatch-pg/orders-with-items`,
        payload,
        authConfig(thunkAPI.getState)
      );
      return data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const updatePurchaseOrder = createAsyncThunk(
  'stockManagerInventory/updatePurchaseOrder',
  async ({ id, payload }, thunkAPI) => {
    try {
      const { data } = await axios.put(
        `${API_URL}/purchases/orders/${id}`,
        payload,
        authConfig(thunkAPI.getState)
      );

      return data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);


export const createPurchaseOrdersBySupplier = createAsyncThunk(
  'stockManagerInventory/createPurchaseOrdersBySupplier',
  async (payload, thunkAPI) => {
    try {
      const {
        warehouse_id,
        supplierGroups,
        expected_date = null,
        remarks = null,
      } = payload;

      const results = [];

      for (const group of supplierGroups) {
        const { data } = await axios.post(
          `${API_URL}/purchases/orders-with-items`,
          {
            supplier_id: Number(group.supplier_id),
            warehouse_id: Number(warehouse_id),
            expected_date,
            remarks,
            status: 'draft',
            bill_details: {
              created_from: 'stock_manager',
              supplier_name: group.supplier_name,
              items_count: group.items.length,
            },
            items: group.items,
          },
          authConfig(thunkAPI.getState)
        );

        results.push(data);
      }

      return results;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);
export const fetchCatalogProducts = createAsyncThunk(
  'stockManagerInventory/fetchCatalogProducts',
  async (_, thunkAPI) => {
    try {
      const { data } = await axios.get(
        `${API_URL}/catalog-pg/products/`,
        authConfig(thunkAPI.getState)
      );

      return data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);
export const fetchBrands = createAsyncThunk(
  'stockManagerInventory/fetchBrands',
  async (_, thunkAPI) => {
    try {
      const { data } = await axios.get(
        `${API_URL}/catalog-pg/brands`,
        authConfig(thunkAPI.getState)
      );
      return data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const fetchUnits = createAsyncThunk(
  'stockManagerInventory/fetchUnits',
  async (_, thunkAPI) => {
    try {
      const { data } = await axios.get(
        `${API_URL}/catalog-pg/units`,
        authConfig(thunkAPI.getState)
      );
      return data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const fetchSuppliers = createAsyncThunk(
  'stockManagerInventory/fetchSuppliers',
  async (_, thunkAPI) => {
    try {
      const { data } = await axios.get(
        `${API_URL}/catalog-pg/stakeholders`,
        authConfig(thunkAPI.getState)
      );

      return data.filter((item) => item.stakeholder_type === 'supplier');
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const fetchWarehouses = createAsyncThunk(
  'stockManagerInventory/fetchWarehouses',
  async (_, thunkAPI) => {
    try {
      const { data } = await axios.get(
        `${API_URL}/catalog-pg/warehouses`,
        authConfig(thunkAPI.getState)
      );
      return data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);
const initialState = {
  products: [],
  transactions: [],
  purchaseOrders: [],
  catalogProducts: [],
  brands: [],
units: [],
suppliers: [],
warehouses: [],
categories: [],
catalogBarcodes: [],
  loading: false,
  receiving: false,
  error: null,
  successMessage: null,
};

const stockManagerInventorySlice = createSlice({
  name: 'stockManagerInventory',
  initialState,
  reducers: {
    clearStockManagerMessage: (state) => {
      state.error = null;
      state.successMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder

      .addCase(fetchInventoryProducts.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchInventoryProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = Array.isArray(action.payload)
          ? action.payload
          : action.payload?.data || [];
      }).addCase(createPurchaseOrdersBySupplier.fulfilled, (state) => {
  state.successMessage = 'Purchase orders created supplier-wise';
})
.addCase(createPurchaseOrdersBySupplier.rejected, (state, action) => {
  state.error = action.payload;
}).addCase(updatePurchaseOrder.fulfilled, (state) => {
  state.successMessage = 'Purchase order updated successfully';
})
.addCase(updatePurchaseOrder.rejected, (state, action) => {
  state.error = action.payload;
}).addCase(verifyReceivedPurchaseOrder.fulfilled, (state) => {
  state.successMessage = 'Received products verified successfully';
})
.addCase(verifyReceivedPurchaseOrder.rejected, (state, action) => {
  state.error = action.payload;
}).addCase(fetchCategories.fulfilled, (state, action) => {
  state.categories = Array.isArray(action.payload)
    ? action.payload
    : action.payload?.data || [];
})
      .addCase(fetchInventoryProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      }).addCase(createPurchaseOrderWithItems.fulfilled, (state) => {
  state.successMessage = 'Purchase order created successfully';
}).addCase(fetchCatalogProducts.fulfilled, (state, action) => {
  state.catalogProducts = Array.isArray(action.payload)
    ? action.payload
    : action.payload?.data || [];
}).addCase(fetchBrands.fulfilled, (state, action) => {
  state.brands = Array.isArray(action.payload) ? action.payload : action.payload?.data || [];
}).addCase(updatePurchaseOrderItems.fulfilled, (state) => {
  state.successMessage = 'Purchase order items updated successfully';
})
.addCase(updatePurchaseOrderItems.rejected, (state, action) => {
  state.error = action.payload;
})
.addCase(fetchUnits.fulfilled, (state, action) => {
  state.units = Array.isArray(action.payload) ? action.payload : action.payload?.data || [];
})
.addCase(fetchSuppliers.fulfilled, (state, action) => {
  state.suppliers = Array.isArray(action.payload) ? action.payload : action.payload?.data || [];
})
.addCase(fetchWarehouses.fulfilled, (state, action) => {
  state.warehouses = Array.isArray(action.payload) ? action.payload : action.payload?.data || [];
})
.addCase(createPurchaseOrderWithItems.rejected, (state, action) => {
  state.error = action.payload;
})
.addCase(createDispatchOrderWithItems.fulfilled, (state) => {
  state.successMessage = 'Dispatch order created successfully';
})
.addCase(createDispatchOrderWithItems.rejected, (state, action) => {
  state.error = action.payload;
}).addCase(fetchCatalogBarcodes.fulfilled, (state, action) => {
  state.catalogBarcodes = action.payload || [];
})

      .addCase(fetchStockTransactions.fulfilled, (state, action) => {
        state.transactions = Array.isArray(action.payload)
          ? action.payload
          : action.payload?.data || [];
      })

      .addCase(fetchPurchaseOrders.fulfilled, (state, action) => {
        state.purchaseOrders = Array.isArray(action.payload)
          ? action.payload
          : action.payload?.data || [];
      })

      .addCase(receivePurchaseOrder.pending, (state) => {
        state.receiving = true;
        state.error = null;
      })
      .addCase(receivePurchaseOrder.fulfilled, (state, action) => {
        state.receiving = false;
        state.successMessage =
          action.payload?.message || 'Purchase order received successfully';
      })
      .addCase(receivePurchaseOrder.rejected, (state, action) => {
        state.receiving = false;
        state.error = action.payload;
      });
  },
});

export const { clearStockManagerMessage } = stockManagerInventorySlice.actions;

export default stockManagerInventorySlice.reducer;