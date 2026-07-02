import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { API_BASE_URL } from "../../utils/apiConfig";

const parseWeight = (value) => {
  const text = String(value || "").trim();
  const match = text.match(/^([\d.]+)\s*([a-zA-Z]+|Qty)$/i);
  if (!match) return { packQuantity: "", unit: "" };
  return {
    packQuantity: Number(match[1]) || match[1],
    unit: match[2],
  };
};

const normalizeRows = (payload) => {
  const rows = Array.isArray(payload?.rows)
    ? payload.rows
    : Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
    ? payload
    : [];

  return rows.map((row, index) => {
    const parsedWeight = parseWeight(row.weight);
    const packs = Number(row.packs ?? row.qtySold ?? row.totalQty ?? 0);
    const packQuantity =
      row.packQuantity ?? row.quantity ?? parsedWeight.packQuantity ?? "";
    const unit = row.unit ?? row.units ?? parsedWeight.unit ?? "";

    return {
      rank: row.rank ?? index + 1,
      productId: row.productId ?? row.product_id ?? "",
      brandId: row.brandId ?? row.brand_id ?? "",
      financialId: row.financialId ?? row.financial_id ?? "",
      productCode: row.productCode ?? row.product_code ?? row.code ?? "-",
      generatedCode: row.mkid ?? row.MKID ?? row.generatedCode ?? row.generated_code ?? "-",
      productName: row.productName ?? row.name ?? row.item ?? "-",
      brand: row.brand ?? row.brandName ?? row.brand_name ?? "-",
      packQuantity,
      unit,
      rate: Number(row.rate ?? row.price ?? row.pricePerQty ?? 0),
      packs,
      totalQuantity: Number(
        row.totalQuantity ??
          row.totalQty ??
          (Number(packQuantity || 0) * packs || packs)
      ),
      orderLines: Number(row.orderLines ?? row.orderCount ?? 0),
      amount: Number(row.amount ?? row.revenue ?? row.totalRevenue ?? 0),
    };
  });
};

const buildTotals = (rows, payloadTotals = {}) => ({
  products: payloadTotals.products ?? rows.length,
  packs:
    payloadTotals.packs ??
    rows.reduce((sum, row) => sum + Number(row.packs || 0), 0),
  totalQuantity:
    payloadTotals.totalQuantity ??
    rows.reduce((sum, row) => sum + Number(row.totalQuantity || 0), 0),
});

export const fetchTopProductsReport = createAsyncThunk(
  "reports/fetchTopProducts",
  async ({ days = 30, limit = 150 } = {}, thunkAPI) => {
    try {
      const token = thunkAPI.getState().posUser?.userInfo?.token;
      const params = new URLSearchParams();
      params.set("days", String(days));
      params.set("limit", String(limit));

      const response = await fetch(
        `${API_BASE_URL}/orders/pos/reports/top-products?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to fetch top products report");
      }

      const rows = normalizeRows(data);

      return {
        rows,
        totals: buildTotals(rows, data?.totals),
        range: data?.range || {},
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(error?.message || "Report fetch failed");
    }
  }
);

const topProductsReportSlice = createSlice({
  name: "topProductsReport",
  initialState: {
    rows: [],
    totals: {},
    range: {},
    loading: false,
    error: "",
  },
  reducers: {
    clearTopProductsReport: (state) => {
      state.rows = [];
      state.totals = {};
      state.range = {};
      state.loading = false;
      state.error = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTopProductsReport.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(fetchTopProductsReport.fulfilled, (state, action) => {
        state.loading = false;
        state.rows = action.payload.rows;
        state.totals = action.payload.totals;
        state.range = action.payload.range;
      })
      .addCase(fetchTopProductsReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch top products report";
      });
  },
});

export const { clearTopProductsReport } = topProductsReportSlice.actions;
export default topProductsReportSlice.reducer;
