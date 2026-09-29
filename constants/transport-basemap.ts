export const TRANSPORT_VECTOR_BASEMAP = {
  maxZoom: 14,
  layers: ['transportation', 'place', 'water'],
  attributions: [{ label: 'EXHIBITION · LOCAL DEMO MAP', href: '/transport/realtime-status' }],
} as const;

export const TRANSPORT_BASEMAP = TRANSPORT_VECTOR_BASEMAP;
