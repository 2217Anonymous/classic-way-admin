import { createAsyncThunk, createSlice, isAnyOf } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api";
import type { AdminReview } from "@/lib/types";
import { isDemoMockForced, mockAdminReviews, resolveDemoData } from "@/mock";

type StateWithAuth = { auth: { token: string | null } };

type ReviewsState = {
  items: AdminReview[];
  loading: boolean;
  error: string | null;
};

const initialState: ReviewsState = {
  items: [],
  loading: false,
  error: null,
};

let mockItems: AdminReview[] = mockAdminReviews.map((item) => ({ ...item }));

export const fetchReviews = createAsyncThunk<
  AdminReview[],
  void,
  { state: StateWithAuth }
>("reviews/fetch", async (_, { getState }) => {
  if (isDemoMockForced()) return mockItems.map((item) => ({ ...item }));
  try {
    const data = await apiRequest<AdminReview[]>(
      "/admin/reviews",
      {},
      getState().auth.token,
    );
    return resolveDemoData(data, mockAdminReviews);
  } catch {
    return resolveDemoData([], mockAdminReviews);
  }
});

export const moderateReview = createAsyncThunk<
  AdminReview,
  { id: number; is_approved: boolean },
  { state: StateWithAuth }
>("reviews/moderate", async ({ id, is_approved }, { getState }) => {
  if (isDemoMockForced()) {
    const index = mockItems.findIndex((item) => item.id === id);
    if (index < 0) throw new Error("Review not found");
    const updated: AdminReview = {
      ...mockItems[index],
      is_approved,
      updated_at: new Date().toISOString(),
    };
    mockItems = mockItems.map((item) => (item.id === id ? updated : item));
    return updated;
  }
  return apiRequest<AdminReview>(
    `/admin/reviews/${id}`,
    { method: "PATCH", body: JSON.stringify({ is_approved }) },
    getState().auth.token,
  );
});

export const deleteReview = createAsyncThunk<
  number,
  number,
  { state: StateWithAuth }
>("reviews/delete", async (id, { getState }) => {
  if (isDemoMockForced()) {
    mockItems = mockItems.filter((item) => item.id !== id);
    return id;
  }
  await apiRequest<void>(
    `/admin/reviews/${id}`,
    { method: "DELETE" },
    getState().auth.token,
  );
  return id;
});

const reviewsSlice = createSlice({
  name: "reviews",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchReviews.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReviews.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(moderateReview.fulfilled, (state, action) => {
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index >= 0) state.items[index] = action.payload;
      })
      .addCase(deleteReview.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.id !== action.payload);
      })
      .addMatcher(
        isAnyOf(
          fetchReviews.rejected,
          moderateReview.rejected,
          deleteReview.rejected,
        ),
        (state, action) => {
          state.loading = false;
          state.error = action.error?.message ?? "Review request failed";
        },
      );
  },
});

export default reviewsSlice.reducer;
