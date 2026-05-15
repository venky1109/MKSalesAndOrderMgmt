import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { API_BASE_URL } from "../../utils/apiConfig";

const emptySection = {
  data: {},
  loading: false,
  error: "",
};

const endpointBySection = {
  summary: "/inventory-dashboard/summary",
  products: "/inventory-dashboard/products",
  orders: "/inventory-dashboard/orders",
  customers: "/inventory-dashboard/customers",
  finance: "/inventory-dashboard/finance",
};

const buildQuery = (filters = {}) => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  const query = params.toString();
  return query ? `?${query}` : "";
};

const readError = async (response) => {
  try {
    const data = await response.json();
    return data?.message || data?.error || "Dashboard request failed";
  } catch {
    return "Dashboard request failed";
  }
};

export const fetchInventoryDashboardSection = createAsyncThunk(
  "inventoryDashboard/fetchSection",
  async ({ section, filters = {} }, thunkAPI) => {
    const endpoint = endpointBySection[section];

    if (!endpoint) {
      return thunkAPI.rejectWithValue({
        section,
        message: "Unknown dashboard section",
      });
    }

    try {
      const token = thunkAPI.getState().posUser?.userInfo?.token;
      const response = await fetch(
        `${API_BASE_URL}${endpoint}${buildQuery(filters)}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const data = await response.json();
      return { section, data };
    } catch (error) {
      return thunkAPI.rejectWithValue({
        section,
        message: error?.message || "Dashboard request failed",
      });
    }
  }
);

export const fetchInventoryDashboard = createAsyncThunk(
  "inventoryDashboard/fetchAll",
  async (filters = {}, thunkAPI) => {
    const sections = Object.keys(endpointBySection);

    const results = await Promise.all(
      sections.map((section) =>
        thunkAPI
          .dispatch(fetchInventoryDashboardSection({ section, filters }))
          .unwrap()
          .catch((error) => ({
            section,
            error: error?.message || "Dashboard request failed",
          }))
      )
    );

    const data = {};
    const errors = {};

    results.forEach((result) => {
      if (result?.error) {
        errors[result.section] = result.error;
      } else {
        data[result.section] = result.data;
      }
    });

    return { data, errors };
  }
);

const inventoryDashboardSlice = createSlice({
  name: "inventoryDashboard",
  initialState: {
    summary: { ...emptySection },
    products: { ...emptySection },
    orders: { ...emptySection },
    customers: { ...emptySection },
    finance: { ...emptySection },
    loading: false,
    lastUpdated: "",
  },
  reducers: {
    clearInventoryDashboardErrors: (state) => {
      Object.keys(endpointBySection).forEach((section) => {
        state[section].error = "";
      });
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInventoryDashboard.pending, (state) => {
        state.loading = true;
        Object.keys(endpointBySection).forEach((section) => {
          state[section].loading = true;
          state[section].error = "";
        });
      })
      .addCase(fetchInventoryDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.lastUpdated = new Date().toISOString();

        Object.entries(action.payload.data || {}).forEach(([section, data]) => {
          state[section].data = data || {};
          state[section].loading = false;
        });

        Object.entries(action.payload.errors || {}).forEach(
          ([section, message]) => {
            state[section].error = message;
            state[section].loading = false;
          }
        );
      })
      .addCase(fetchInventoryDashboardSection.pending, (state, action) => {
        const section = action.meta.arg.section;
        if (state[section]) {
          state[section].loading = true;
          state[section].error = "";
        }
      })
      .addCase(fetchInventoryDashboardSection.fulfilled, (state, action) => {
        const { section, data } = action.payload;
        if (state[section]) {
          state[section].data = data || {};
          state[section].loading = false;
          state[section].error = "";
          state.lastUpdated = new Date().toISOString();
        }
      })
      .addCase(fetchInventoryDashboardSection.rejected, (state, action) => {
        const section = action.payload?.section || action.meta.arg.section;
        if (state[section]) {
          state[section].loading = false;
          state[section].error =
            action.payload?.message || "Dashboard request failed";
        }
      });
  },
});

export const { clearInventoryDashboardErrors } =
  inventoryDashboardSlice.actions;

export default inventoryDashboardSlice.reducer;
