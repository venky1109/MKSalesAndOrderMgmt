import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const API = `${process.env.REACT_APP_API_BASE_URL}/users`;

// 📦 Fetch customer by phone number
export const fetchCustomerByPhone = createAsyncThunk(
  'customers/fetchByPhone',
  async ({ phone, token }, thunkAPI) => {
    try {
      const res = await fetch(`${API}/pos/${phone}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
       console.log(data);
      if (!res.ok) throw new Error(data.message || 'Customer fetch failed');
      return data;
     
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

// ➕ Create a new customer
export const createCustomer = createAsyncThunk(
  'customers/create',
  async ({ name, phone, address = {}, token }, thunkAPI) => {
    try {
      const res = await fetch(`${API}/pos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          phone,
          deliveryAddress: {
            street: address.street || 'N/A',
            city: address.city || 'Unknown',
            postalCode: address.postalCode || '000000'
          },
          location: {
            latitude:0, 
            longitude: 0
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Customer creation failed');
      return data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);


// ✏️ Update a customer by phone number
export const updateCustomerByPhone = createAsyncThunk(
  'customers/updateByPhone',
  async ({ phoneNo, updates, token }, thunkAPI) => {
    try {
      const res = await fetch(`${API}/pos/phone/${phoneNo}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Customer update failed');
      return data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

// ❌ Delete a customer by phone number
export const deleteCustomerByPhone = createAsyncThunk(
  'customers/deleteByPhone',
  async ({ phoneNo, token }, thunkAPI) => {
    try {
      const res = await fetch(`${API}/pos/phone/${phoneNo}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Customer delete failed');
      }
      return phoneNo;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

// 🧠 Customer slice
const customerSlice = createSlice({
  name: 'customers',
  initialState: {
    customer: null,
    loading: false,
    error: '',
    success: false
  },
  reducers: {
    clearCustomer: (state) => {
      state.customer = null;
      state.error = '';
      state.success = false;
    }
  },
  extraReducers: (builder) => {
    builder
      // FETCH
      .addCase(fetchCustomerByPhone.pending, (state) => {
        state.loading = true;
        state.error = '';
        state.success = false;
      })
      .addCase(fetchCustomerByPhone.fulfilled, (state, action) => {
        state.loading = false;
        state.customer = action.payload;
        state.success = true;
      })
      .addCase(fetchCustomerByPhone.rejected, (state, action) => {
        state.loading = false;
        state.customer = null;
        state.error = action.payload;
      })

      // CREATE
      .addCase(createCustomer.pending, (state) => {
        state.loading = true;
        state.error = '';
        state.success = false;
      })
      .addCase(createCustomer.fulfilled, (state, action) => {
        state.loading = false;
        state.customer = action.payload;
        state.success = true;
      })
      .addCase(createCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // UPDATE BY PHONE
      .addCase(updateCustomerByPhone.pending, (state) => {
        state.loading = true;
        state.error = '';
        state.success = false;
      })
      .addCase(updateCustomerByPhone.fulfilled, (state, action) => {
        state.loading = false;
        state.customer = action.payload;
        state.success = true;
      })
      .addCase(updateCustomerByPhone.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // DELETE BY PHONE
      .addCase(deleteCustomerByPhone.pending, (state) => {
        state.loading = true;
        state.error = '';
        state.success = false;
      })
      .addCase(deleteCustomerByPhone.fulfilled, (state) => {
        state.loading = false;
        state.customer = null;
        state.success = true;
      })
      .addCase(deleteCustomerByPhone.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearCustomer } = customerSlice.actions;
export default customerSlice.reducer;
