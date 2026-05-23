import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:6000';

const apiUrl = (path) => `${API_BASE_URL}${path}`;

const authConfig = (getState) => {
  const token = getState()?.posUser?.userInfo?.token;

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

const normalizeArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.products)) return payload.products;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
};

const normalizeText = (value) => String(value || '').trim().toLowerCase();

/* =========================
   INVENTORY PRODUCTS
========================= */

export const fetchInventoryProducts = createAsyncThunk(
  'stockManagerInventory/fetchInventoryProducts',
  async (_, thunkAPI) => {
    try {
      const { data } = await axios.get(
        apiUrl('/inventory-pg/products'),
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
        apiUrl('/inventory-pg/stock-transactions'),
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

export const fetchTransitProducts = createAsyncThunk(
  'stockManagerInventory/fetchTransitProducts',
  async (_, thunkAPI) => {
    try {
      const { data } = await axios.get(
        apiUrl('/inventory-pg/transit-products'),
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

/* =========================
   CATALOG
========================= */

export const fetchCatalogProducts = createAsyncThunk(
  'stockManagerInventory/fetchCatalogProducts',
  async (_, thunkAPI) => {
    try {
      const { data } = await axios.get(
        apiUrl('/catalog-pg/products/'),
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
        apiUrl('/catalog-pg/brands'),
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

export const fetchCategories = createAsyncThunk(
  'stockManagerInventory/fetchCategories',
  async (_, thunkAPI) => {
    try {
      const { data } = await axios.get(
        apiUrl('/catalog-pg/categories'),
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

export const fetchUnits = createAsyncThunk(
  'stockManagerInventory/fetchUnits',
  async (_, thunkAPI) => {
    try {
      const { data } = await axios.get(
        apiUrl('/catalog-pg/units'),
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

export const fetchSuppliers = createAsyncThunk(
  'stockManagerInventory/fetchSuppliers',
  async (_, thunkAPI) => {
    try {
      const { data } = await axios.get(
        apiUrl('/catalog-pg/stakeholders'),
        authConfig(thunkAPI.getState)
      );

      const list = normalizeArray(data);

      return list.filter(
        (item) =>
          item.stakeholder_type === 'supplier' ||
          item.stakeholder_type === 'Supplier' ||
          item.stakeholder_type === 'SUPPLIER'
      );
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

export const fetchDispatchStakeholders = createAsyncThunk(
  'stockManagerInventory/fetchDispatchStakeholders',
  async (_, thunkAPI) => {
    try {
      const { data } = await axios.get(
        apiUrl('/catalog-pg/stakeholders'),
        authConfig(thunkAPI.getState)
      );

      const list = normalizeArray(data);

      return list.filter((item) => {
        const type = normalizeText(item.stakeholder_type);
        return type.includes('vendor') || type.includes('customer');
      });
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

export const fetchWarehouses = createAsyncThunk(
  'stockManagerInventory/fetchWarehouses',
  async (_, thunkAPI) => {
    try {
      const { data } = await axios.get(
        apiUrl('/catalog-pg/warehouses'),
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

export const fetchOutlets = createAsyncThunk(
  'stockManagerInventory/fetchOutlets',
  async (_, thunkAPI) => {
    try {
      const { data } = await axios.get(
        apiUrl('/catalog-pg/outlets'),
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
      const { data } = await axios.get(
        apiUrl('/catalog-pg/product-barcodes'),
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

/* =========================
   PURCHASE ORDERS
========================= */

export const fetchPurchaseOrders = createAsyncThunk(
  'stockManagerInventory/fetchPurchaseOrders',
  async (_, thunkAPI) => {
    try {
      const { data } = await axios.get(
        apiUrl('/purchases/orders-detailed'),
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
        apiUrl('/purchases/orders-with-items'),
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
          apiUrl('/purchases/orders-with-items'),
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

export const updatePurchaseOrder = createAsyncThunk(
  'stockManagerInventory/updatePurchaseOrder',
  async ({ id, payload }, thunkAPI) => {
    try {
      const { data } = await axios.put(
        apiUrl(`/purchases/orders/${id}`),
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

export const updatePurchaseOrderItems = createAsyncThunk(
  'stockManagerInventory/updatePurchaseOrderItems',
  async ({ id, items }, thunkAPI) => {
    try {
      const { data } = await axios.put(
        apiUrl(`/purchases/orders/${id}/items`),
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
        apiUrl('/inventory-pg/receive-purchase-order'),
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

export const verifyReceivedPurchaseOrder = createAsyncThunk(
  'stockManagerInventory/verifyReceivedPurchaseOrder',
  async ({ id, items, remarks }, thunkAPI) => {
    try {
      const { data } = await axios.put(
        apiUrl(`/purchases/orders/${id}/verify-received`),
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

/* =========================
   INVENTORY DISPATCH
========================= */

export const fetchInventoryDispatchOrders = createAsyncThunk(
  'stockManagerInventory/fetchInventoryDispatchOrders',
  async (_, thunkAPI) => {
    try {
      const { data } = await axios.get(
        apiUrl('/dispatch-pg/orders'),
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

export const receiveDispatchToOutlet = createAsyncThunk(
  'stockManagerInventory/receiveDispatchToOutlet',
  async ({ dispatchOrderId, items = [] }, thunkAPI) => {
    try {
      const { data } = await axios.put(
        apiUrl(`/dispatch-pg/orders/${dispatchOrderId}/received-to-outlet`),
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

export const receiveDispatchToStakeholder = createAsyncThunk(
  'stockManagerInventory/receiveDispatchToStakeholder',
  async ({ dispatchOrderId }, thunkAPI) => {
    const endpoints = [
      `/dispatch-pg/orders/${dispatchOrderId}/received-to-stakeholder`,
      `/dispatch-pg/orders/${dispatchOrderId}/received-by-stakeholder`,
    ];

    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        const { data } = await axios.put(
          apiUrl(endpoint),
          {},
          authConfig(thunkAPI.getState)
        );

        return data;
      } catch (error) {
        lastError = error;

        if (error.response?.status !== 404) {
          return thunkAPI.rejectWithValue(
            error.response?.data?.message || error.message
          );
        }
      }
    }

    return thunkAPI.rejectWithValue(
      lastError?.response?.data?.message ||
        'Stakeholder receive is not available on the server yet'
    );
  }
);

export const completeInternalPackingDispatch = createAsyncThunk(
  'stockManagerInventory/completeInternalPackingDispatch',
  async ({ dispatchOrderId }, thunkAPI) => {
    const endpoints = [
      `/dispatch-pg/orders/${dispatchOrderId}/internal-packing-dispatched`,
      `/dispatch-pg/orders/${dispatchOrderId}/complete-internal-packing`,
      `/dispatch-pg/orders/${dispatchOrderId}/dispatch-to-packing`,
    ];

    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        const { data } = await axios.put(
          apiUrl(endpoint),
          {},
          authConfig(thunkAPI.getState)
        );

        return data;
      } catch (error) {
        lastError = error;

        if (error.response?.status !== 404) {
          return thunkAPI.rejectWithValue(
            error.response?.data?.message || error.message
          );
        }
      }
    }

    return thunkAPI.rejectWithValue(
      lastError?.response?.data?.message ||
        'Internal packing dispatch endpoint is not available on the server yet'
    );
  }
);

export const createInventoryDispatchOrder = createAsyncThunk(
  'stockManagerInventory/createInventoryDispatchOrder',
  async (payload, thunkAPI) => {
    try {
      const { data } = await axios.post(
        apiUrl('/dispatch-pg/orders'),
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

export const updateInventoryDispatchOrder = createAsyncThunk(
  'stockManagerInventory/updateInventoryDispatchOrder',
  async ({ id, payload }, thunkAPI) => {
    try {
      const { data } = await axios.put(
        apiUrl(`/dispatch-pg/orders/${id}`),
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

export const updateInventoryDispatchOrderItems = createAsyncThunk(
  'stockManagerInventory/updateInventoryDispatchOrderItems',
  async ({ id, items }, thunkAPI) => {
    try {
      const { data } = await axios.put(
        apiUrl(`/dispatch-pg/orders/${id}/items`),
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

export const updateInventoryDispatchStatus = createAsyncThunk(
  'stockManagerInventory/updateInventoryDispatchStatus',
  async ({ id, dispatch_status }, thunkAPI) => {
    try {
      const { data } = await axios.put(
        apiUrl(`/dispatch-pg/orders/${id}/status`),
        { dispatch_status },
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

export const deleteInventoryDispatchOrder = createAsyncThunk(
  'stockManagerInventory/deleteInventoryDispatchOrder',
  async (id, thunkAPI) => {
    try {
      await axios.delete(
        apiUrl(`/dispatch-pg/orders/${id}`),
        authConfig(thunkAPI.getState)
      );

      return id;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

/* =========================
   INITIAL STATE
========================= */

const initialState = {
  products: [], // keep separate for old purchase/product usage
  inventoryProducts: [], // inventory.inventory_products rows only
  transactions: [],
  transitProducts: [],
  purchaseOrders: [],

  catalogProducts: [],
  brands: [],
  units: [],
  suppliers: [],
  dispatchStakeholders: [],
  warehouses: [],
  categories: [],
  catalogBarcodes: [],
  outlets: [],

  inventoryDispatchOrders: [],
  inventoryDispatchLoading: false,
  inventoryDispatchError: null,
  inventoryDispatchSuccess: null,
  transitLoading: false,
  transitError: null,

  loading: false,
  receiving: false,
  error: null,
  successMessage: null,
};

/* =========================
   SLICE
========================= */

const stockManagerInventorySlice = createSlice({
  name: 'stockManagerInventory',
  initialState,
  reducers: {
    clearStockManagerMessage: (state) => {
      state.error = null;
      state.successMessage = null;
      state.inventoryDispatchError = null;
      state.inventoryDispatchSuccess = null;
      state.transitError = null;
    },
  },
  extraReducers: (builder) => {
    builder

      /* INVENTORY PRODUCTS */
      .addCase(fetchInventoryProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInventoryProducts.fulfilled, (state, action) => {
        state.loading = false;

        // IMPORTANT: keep inventory products separate.
        // Do not overwrite state.products because other purchase flows may use it.
        state.inventoryProducts = normalizeArray(action.payload);
      })
      .addCase(fetchInventoryProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch inventory products';
      })

      /* STOCK TRANSACTIONS */
      .addCase(fetchStockTransactions.fulfilled, (state, action) => {
        state.transactions = normalizeArray(action.payload);
      })

      /* TRANSIT PRODUCTS */
      .addCase(fetchTransitProducts.pending, (state) => {
        state.transitLoading = true;
        state.transitError = null;
      })
      .addCase(fetchTransitProducts.fulfilled, (state, action) => {
        state.transitLoading = false;
        state.transitProducts = normalizeArray(action.payload);
      })
      .addCase(fetchTransitProducts.rejected, (state, action) => {
        state.transitLoading = false;
        state.transitError =
          action.payload || 'Failed to fetch transit products';
      })

      /* CATALOG */
      .addCase(fetchCatalogProducts.fulfilled, (state, action) => {
        state.catalogProducts = normalizeArray(action.payload);
      })
      .addCase(fetchBrands.fulfilled, (state, action) => {
        state.brands = normalizeArray(action.payload);
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categories = normalizeArray(action.payload);
      })
      .addCase(fetchUnits.fulfilled, (state, action) => {
        state.units = normalizeArray(action.payload);
      })
      .addCase(fetchSuppliers.fulfilled, (state, action) => {
        state.suppliers = normalizeArray(action.payload);
      })
      .addCase(fetchDispatchStakeholders.fulfilled, (state, action) => {
        state.dispatchStakeholders = normalizeArray(action.payload);
      })
      .addCase(fetchWarehouses.fulfilled, (state, action) => {
        state.warehouses = normalizeArray(action.payload);
      })
      .addCase(fetchOutlets.fulfilled, (state, action) => {
        state.outlets = normalizeArray(action.payload);
      })
      .addCase(fetchCatalogBarcodes.fulfilled, (state, action) => {
        state.catalogBarcodes = normalizeArray(action.payload);
      })

      /* PURCHASE ORDERS */
      .addCase(fetchPurchaseOrders.fulfilled, (state, action) => {
        state.purchaseOrders = normalizeArray(action.payload);
      })
      .addCase(createPurchaseOrderWithItems.fulfilled, (state) => {
        state.successMessage = 'Purchase order created successfully';
      })
      .addCase(createPurchaseOrderWithItems.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(createPurchaseOrdersBySupplier.fulfilled, (state) => {
        state.successMessage = 'Purchase orders created supplier-wise';
      })
      .addCase(createPurchaseOrdersBySupplier.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(updatePurchaseOrder.fulfilled, (state) => {
        state.successMessage = 'Purchase order updated successfully';
      })
      .addCase(updatePurchaseOrder.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(updatePurchaseOrderItems.fulfilled, (state) => {
        state.successMessage = 'Purchase order items updated successfully';
      })
      .addCase(updatePurchaseOrderItems.rejected, (state, action) => {
        state.error = action.payload;
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
      })
      .addCase(verifyReceivedPurchaseOrder.fulfilled, (state) => {
        state.successMessage = 'Received products verified successfully';
      })
      .addCase(verifyReceivedPurchaseOrder.rejected, (state, action) => {
        state.error = action.payload;
      })

      /* INVENTORY DISPATCH */
      .addCase(fetchInventoryDispatchOrders.pending, (state) => {
        state.inventoryDispatchLoading = true;
        state.inventoryDispatchError = null;
      })
      .addCase(fetchInventoryDispatchOrders.fulfilled, (state, action) => {
        state.inventoryDispatchLoading = false;
        state.inventoryDispatchOrders = normalizeArray(action.payload);
      })
      .addCase(fetchInventoryDispatchOrders.rejected, (state, action) => {
        state.inventoryDispatchLoading = false;
        state.inventoryDispatchError =
          action.payload || 'Failed to fetch inventory dispatch orders';
      })

      .addCase(receiveDispatchToOutlet.pending, (state) => {
        state.inventoryDispatchLoading = true;
        state.inventoryDispatchError = null;
        state.inventoryDispatchSuccess = null;
      })
      .addCase(receiveDispatchToOutlet.fulfilled, (state, action) => {
        state.inventoryDispatchLoading = false;
        state.inventoryDispatchSuccess =
          action.payload?.message || 'Dispatch received to outlet successfully';

        const updatedOrder = action.payload?.order;

        if (updatedOrder) {
          const index = state.inventoryDispatchOrders.findIndex(
            (order) => String(order.id) === String(updatedOrder.id)
          );

          if (index !== -1) {
            state.inventoryDispatchOrders[index] = {
              ...state.inventoryDispatchOrders[index],
              ...updatedOrder,
            };
          }
        }
      })
      .addCase(receiveDispatchToOutlet.rejected, (state, action) => {
        state.inventoryDispatchLoading = false;
        state.inventoryDispatchError =
          action.payload || 'Failed to receive dispatch to outlet';
      })

      .addCase(receiveDispatchToStakeholder.pending, (state) => {
        state.inventoryDispatchLoading = true;
        state.inventoryDispatchError = null;
        state.inventoryDispatchSuccess = null;
      })
      .addCase(receiveDispatchToStakeholder.fulfilled, (state, action) => {
        state.inventoryDispatchLoading = false;
        state.inventoryDispatchSuccess =
          action.payload?.message || 'Dispatch received by stakeholder successfully';

        const updatedOrder = action.payload?.order || action.payload;

        if (updatedOrder?.id) {
          const index = state.inventoryDispatchOrders.findIndex(
            (order) => String(order.id) === String(updatedOrder.id)
          );

          if (index !== -1) {
            state.inventoryDispatchOrders[index] = {
              ...state.inventoryDispatchOrders[index],
              ...updatedOrder,
            };
          }
        }
      })
      .addCase(receiveDispatchToStakeholder.rejected, (state, action) => {
        state.inventoryDispatchLoading = false;
        state.inventoryDispatchError =
          action.payload || 'Failed to receive dispatch by stakeholder';
      })

      .addCase(completeInternalPackingDispatch.pending, (state) => {
        state.inventoryDispatchLoading = true;
        state.inventoryDispatchError = null;
        state.inventoryDispatchSuccess = null;
      })
      .addCase(completeInternalPackingDispatch.fulfilled, (state, action) => {
        state.inventoryDispatchLoading = false;
        state.inventoryDispatchSuccess =
          action.payload?.message ||
          'Internal packing dispatched, inventory reduced, and packing stock added';

        const updatedOrder = action.payload?.order || action.payload;

        if (updatedOrder?.id) {
          const index = state.inventoryDispatchOrders.findIndex(
            (order) => String(order.id) === String(updatedOrder.id)
          );

          if (index !== -1) {
            state.inventoryDispatchOrders[index] = {
              ...state.inventoryDispatchOrders[index],
              ...updatedOrder,
            };
          }
        }
      })
      .addCase(completeInternalPackingDispatch.rejected, (state, action) => {
        state.inventoryDispatchLoading = false;
        state.inventoryDispatchError =
          action.payload || 'Failed to complete internal packing dispatch';
      })

      .addCase(createInventoryDispatchOrder.pending, (state) => {
        state.inventoryDispatchLoading = true;
        state.inventoryDispatchError = null;
        state.inventoryDispatchSuccess = null;
      })
      .addCase(createInventoryDispatchOrder.fulfilled, (state, action) => {
        state.inventoryDispatchLoading = false;
        state.inventoryDispatchOrders = [
          action.payload,
          ...state.inventoryDispatchOrders,
        ];
        state.inventoryDispatchSuccess = 'Dispatch order created successfully';
      })
      .addCase(createInventoryDispatchOrder.rejected, (state, action) => {
        state.inventoryDispatchLoading = false;
        state.inventoryDispatchError =
          action.payload || 'Failed to create dispatch order';
      })

      .addCase(updateInventoryDispatchOrder.fulfilled, (state, action) => {
        const index = state.inventoryDispatchOrders.findIndex(
          (order) => String(order.id) === String(action.payload.id)
        );

        if (index !== -1) {
          state.inventoryDispatchOrders[index] = {
            ...state.inventoryDispatchOrders[index],
            ...action.payload,
          };
        }

        state.inventoryDispatchSuccess = 'Dispatch order updated successfully';
      })
      .addCase(updateInventoryDispatchOrder.rejected, (state, action) => {
        state.inventoryDispatchError =
          action.payload || 'Failed to update dispatch order';
      })

      .addCase(updateInventoryDispatchOrderItems.fulfilled, (state, action) => {
        const index = state.inventoryDispatchOrders.findIndex(
          (order) => String(order.id) === String(action.payload.id)
        );

        if (index !== -1) {
          state.inventoryDispatchOrders[index] = action.payload;
        }

        state.inventoryDispatchSuccess = 'Dispatch items updated successfully';
      })
      .addCase(updateInventoryDispatchOrderItems.rejected, (state, action) => {
        state.inventoryDispatchError =
          action.payload || 'Failed to update dispatch items';
      })

      .addCase(updateInventoryDispatchStatus.fulfilled, (state, action) => {
        const index = state.inventoryDispatchOrders.findIndex(
          (order) => String(order.id) === String(action.payload.id)
        );

        if (index !== -1) {
          state.inventoryDispatchOrders[index] = {
            ...state.inventoryDispatchOrders[index],
            ...action.payload,
          };
        }

        state.inventoryDispatchSuccess = 'Dispatch status updated successfully';
      })
      .addCase(updateInventoryDispatchStatus.rejected, (state, action) => {
        state.inventoryDispatchError =
          action.payload || 'Failed to update dispatch status';
      })

      .addCase(deleteInventoryDispatchOrder.fulfilled, (state, action) => {
        state.inventoryDispatchOrders = state.inventoryDispatchOrders.filter(
          (order) => String(order.id) !== String(action.payload)
        );

        state.inventoryDispatchSuccess = 'Dispatch order deleted successfully';
      })
      .addCase(deleteInventoryDispatchOrder.rejected, (state, action) => {
        state.inventoryDispatchError =
          action.payload || 'Failed to delete dispatch order';
      });
  },
});

export const { clearStockManagerMessage } = stockManagerInventorySlice.actions;

export default stockManagerInventorySlice.reducer;
