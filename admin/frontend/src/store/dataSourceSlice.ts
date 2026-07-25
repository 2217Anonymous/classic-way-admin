import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import {
  getDataSource,
  getEnvDataSourceDefault,
  setDataSource,
  type DataSourceMode,
} from "@/mock/config";

type DataSourceState = {
  mode: DataSourceMode;
  /** Bumped on mode change so panels remount and refetch. */
  revision: number;
  hydrated: boolean;
};

const initialState: DataSourceState = {
  mode: typeof window === "undefined" ? getEnvDataSourceDefault() : getDataSource(),
  revision: 0,
  hydrated: typeof window !== "undefined",
};

const dataSourceSlice = createSlice({
  name: "dataSource",
  initialState,
  reducers: {
    hydrateDataSource(state) {
      state.mode = getDataSource();
      state.hydrated = true;
    },
    setDataSourceMode(state, action: PayloadAction<DataSourceMode>) {
      const next = action.payload;
      if (state.mode === next && state.hydrated) return;
      setDataSource(next);
      state.mode = next;
      state.hydrated = true;
      state.revision += 1;
    },
  },
});

export const { hydrateDataSource, setDataSourceMode } = dataSourceSlice.actions;
export default dataSourceSlice.reducer;
