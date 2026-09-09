const cartoKey = process.env.NEXT_PUBLIC_CARTO_BASEMAP_API_KEY?.trim();

// 2D 관제 지도는 필요한 지형만 직접 그리는 벡터 지도를 사용한다.
export const TRANSPORT_VECTOR_BASEMAP = {
  manifestUrl: 'https://tiles.openfreemap.org/planet',
  maxZoom: 14,
  layers: ['landuse', 'landcover', 'water', 'waterway', 'building', 'transportation', 'transportation_name', 'place'],
  attributions: [
    { label: 'OpenFreeMap', href: 'https://openfreemap.org/' },
    { label: '© OpenMapTiles', href: 'https://www.openmaptiles.org/' },
    { label: '© OpenStreetMap contributors', href: 'https://www.openstreetmap.org/copyright' },
  ],
} as const;

// 3D 바닥 텍스처용 래스터 지도. 키가 없으면 공개 기본지도를 사용한다.
export const TRANSPORT_BASEMAP = {
  provider: cartoKey ? 'carto' : 'osm',
  url: cartoKey
    ? `https://basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}.png?key=${encodeURIComponent(cartoKey)}`
    : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attributions: [
    { label: '© OpenStreetMap contributors', href: 'https://www.openstreetmap.org/copyright' },
    ...(cartoKey ? [{ label: '© CARTO', href: 'https://carto.com/attributions' }] : []),
  ],
} as const;

export function getTransportTileUrl(z: number, x: number, y: number) {
  return TRANSPORT_BASEMAP.url.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y));
}
