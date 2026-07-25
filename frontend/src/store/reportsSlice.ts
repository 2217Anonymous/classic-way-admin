import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api";
import type { ReportSummary } from "@/lib/types";
import { isDemoMockForced, mockReportSummaries, resolveDemoData } from "@/mock";

type StateWithAuth = { auth: { token: string | null } };

type ReportsState = {
  items: ReportSummary[];
  loading: boolean;
  error: string | null;
};

const initialState: ReportsState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchReports = createAsyncThunk<
  ReportSummary[],
  void,
  { state: StateWithAuth }
>("reports/fetch", async (_, { getState }) => {
  if (isDemoMockForced()) return mockReportSummaries.map((item) => ({ ...item }));
  try {
    const data = await apiRequest<ReportSummary[]>("/reports", {}, getState().auth.token);
    return resolveDemoData(data, mockReportSummaries);
  } catch {
    return resolveDemoData([], mockReportSummaries);
  }
});

const reportsSlice = createSlice({
  name: "reports",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchReports.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReports.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchReports.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message ?? "Report request failed";
      });
  },
});

export default reportsSlice.reducer;
