import { createAsyncThunk, createSlice, isAnyOf } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api";
import type { AdminReview } from "@/lib/types";

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

export const fetchReviews = createAsyncThunk<
  AdminReview[],
  void,
  { state: StateWithAuth }
>("reviews/fetch", async (_, { getState }) => {
  return apiRequest<AdminReview[]>(
    "/admin/reviews",
    {},
    getState().auth.token,
  );
});

export const moderateReview = createAsyncThunk<
  AdminReview,
  { id: string; is_approved: boolean },
  { state: StateWithAuth }
>("reviews/moderate", async ({ id, is_approved }, { getState }) => {
  return apiRequest<AdminReview>(
    `/admin/reviews/${id}`,
    { method: "PATCH", body: JSON.stringify({ is_approved }) },
    getState().auth.token,
  );
});

export const deleteReview = createAsyncThunk<
  string,
  string,
  { state: StateWithAuth }
>("reviews/delete", async (id, { getState }) => {
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
