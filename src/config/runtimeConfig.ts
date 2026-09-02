export type DataMode = 'api' | 'demo';

const configuredDataMode = import.meta.env.VITE_DATA_MODE;

export const runtimeConfig = {
  dataMode: configuredDataMode === 'demo' ? 'demo' : 'api' as DataMode,
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api/v1',
};
