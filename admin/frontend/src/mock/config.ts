/**
 * Demo mock vs SQL data source for Classic Way.
 *
 * Preference order:
 * 1. Runtime override (set by the header Mock/SQL switch)
 * 2. localStorage (`valaiyagam_data_source`)
 * 3. NEXT_PUBLIC_DEMO_MOCK env default (force → mock; off → sql)
 */

export type DataSourceMode = "mock" | "sql";

export const DATA_SOURCE_STORAGE_KEY = "valaiyagam_data_source";

let runtimeOverride: DataSourceMode | null = null;

function normalizeEnvMode(raw: string | undefined): DataSourceMode {
  const mode = (raw ?? "force").toLowerCase();
  if (mode === "0" || mode === "false" || mode === "off") return "sql";
  return "mock";
}

export function getEnvDataSourceDefault(): DataSourceMode {
  return normalizeEnvMode(process.env.NEXT_PUBLIC_DEMO_MOCK);
}

export function getDemoMockMode() {
  return (process.env.NEXT_PUBLIC_DEMO_MOCK ?? "force").toLowerCase();
}

export function readStoredDataSource(): DataSourceMode | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(DATA_SOURCE_STORAGE_KEY);
    if (saved === "mock" || saved === "sql") return saved;
  } catch {
    // ignore storage errors
  }
  return null;
}

/** Effective data source used by slices / mock helpers. */
export function getDataSource(): DataSourceMode {
  if (runtimeOverride) return runtimeOverride;
  const stored = readStoredDataSource();
  if (stored) {
    runtimeOverride = stored;
    return stored;
  }
  return getEnvDataSourceDefault();
}

export function setDataSource(mode: DataSourceMode) {
  runtimeOverride = mode;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(DATA_SOURCE_STORAGE_KEY, mode);
    } catch {
      // ignore storage errors
    }
  }
}

/** True when lists/mutations should use in-memory mock data. */
export function isDemoMockForced() {
  return getDataSource() === "mock";
}

export function resolveDemoData<T>(apiItems: T[], mockItems: T[]): T[] {
  if (isDemoMockForced()) return mockItems;
  return apiItems;
}

export function resolveDemoItem<T extends { id: number }>(
  apiItem: T | null | undefined,
  mockItems: T[],
  id: number,
): T | null {
  if (isDemoMockForced()) {
    return mockItems.find((item) => item.id === id) ?? apiItem ?? null;
  }
  if (apiItem) return apiItem;
  return null;
}
