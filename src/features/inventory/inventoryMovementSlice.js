import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

export const receiveVerifiedPurchaseToInventory = createAsyncThunk(
  'inventoryMovement/receiveVerifiedPurchaseToInventory',
  async (payload, thunkAPI) => {
    try {
      const token = thunkAPI.getState().posUser?.userInfo?.token;

      const res = await fetch(
        `${API_BASE_URL}/inventory-pg/receive-verified-purchase`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to add verified purchase to inventory');
      }

      return data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

const inventoryMovementSlice = createSlice({
  name: 'inventoryMovement',
  initialState: {
    loading: false,
    error: null,
    successMessage: null,
    lastInventoryProduct: null,
    lastStockTransaction: null,
  },
  reducers: {
    clearInventoryMovementMessage: (state) => {
      state.error = null;
      state.successMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(receiveVerifiedPurchaseToInventory.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(receiveVerifiedPurchaseToInventory.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage =
          action.payload?.message || 'Inventory updated successfully';
        state.lastInventoryProduct = action.payload?.inventoryProduct || null;
        state.lastStockTransaction = action.payload?.stockTransaction || null;
      })
      .addCase(receiveVerifiedPurchaseToInventory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Inventory update failed';
      });
  },
});

export const { clearInventoryMovementMessage } = inventoryMovementSlice.actions;

export default inventoryMovementSlice.reducer;