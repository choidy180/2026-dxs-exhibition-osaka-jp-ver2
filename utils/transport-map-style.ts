import Style, { type StyleFunction } from 'ol/style/Style';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Text from 'ol/style/Text';
import { get as getProjection } from 'ol/proj';
import { getWidth } from 'ol/extent';
import { color, font, fontSize, fontWeight, mapLayer, mapPalette } from '@/styles/design-tokens';

const ROAD_CONFIG = [
  { name: 'motorway', fill: mapPalette.motorway, outline: mapPalette.majorRoadOutline, width: 4.2, layer: mapLayer.motorway, minZoom: 9, labelZoom: 10 },
  { name: 'trunk', fill: mapPalette.motorway, outline: mapPalette.majorRoadOutline, width: 3.6, layer: mapLayer.trunkRoad, minZoom: 9, labelZoom: 10 },
  { name: 'primary', fill: mapPalette.primaryRoad, outline: mapPalette.majorRoadOutline, width: 3, layer: mapLayer.primaryRoad, minZoom: 9, labelZoom: 11 },
  { name: 'secondary', fill: mapPalette.road, outline: mapPalette.roadOutline, width: 2.5, layer: mapLayer.secondaryRoad, minZoom: 9, labelZoom: 12 },
  { name: 'tertiary', fill: mapPalette.road, outline: mapPalette.roadOutline, width: 1.8, layer: mapLayer.tertiaryRoad, minZoom: 11, labelZoom: 13 },
  { name: 'minor', fill: mapPalette.road, outline: mapPalette.roadOutline, width: 1.5, layer: mapLayer.minorRoad, minZoom: 13, labelZoom: 14 },
] as const;
const PARK_SUBCLASSES = new Set(['park', 'garden', 'recreation_ground', 'village_green', 'golf_course']);
const NAME_PROPERTIES = ['name:ko', 'name', 'name:latin', 'name:en', 'name:nonlatin'] as const;
const MAX_LABEL_LENGTH = 32;
const INITIAL_RESOLUTION = getWidth(getProjection('EPSG:3857')!.getExtent()) / 256;

function getPlaceName(get: (key: string) => unknown) {
  for (const key of NAME_PROPERTIES) {
    const value = get(key);
    if (typeof value !== 'string') continue;
    const name = value.trim().replace(/\s+/g, ' ');
    if (!name) continue;
    const characters = Array.from(name);
    return characters.length > MAX_LABEL_LENGTH
      ? `${characters.slice(0, MAX_LABEL_LENGTH).join('')}…`
      : name;
  }
  return undefined;
}

export function createTransportMapStyle(): StyleFunction {
  const residential = new Style({ fill: new Fill({ color: mapPalette.residential }), zIndex: mapLayer.landuse });
  const industrial = new Style({ fill: new Fill({ color: mapPalette.industrial }), zIndex: mapLayer.landuse });
  const park = new Style({ fill: new Fill({ color: mapPalette.park }), zIndex: mapLayer.park });
  const water = new Style({ fill: new Fill({ color: mapPalette.water }), zIndex: mapLayer.water });
  const waterway = new Style({ stroke: new Stroke({ color: mapPalette.waterOutline, width: 1.6 }), zIndex: mapLayer.water });
  const building = new Style({
    fill: new Fill({ color: mapPalette.building }),
    stroke: new Stroke({ color: mapPalette.buildingOutline, width: 0.6 }),
    zIndex: mapLayer.building,
  });
  const roads = ROAD_CONFIG.map(config => ({
    ...config,
    // 확대 단계별 스타일만 보관해 지형·이름 수에 따라 캐시가 증가하지 않게 한다.
    levels: [0.65, 1, 1.65].map(scale => [
      new Style({ stroke: new Stroke({ color: config.outline, width: config.width * scale + 1.4 }), zIndex: config.layer }),
      new Style({ stroke: new Stroke({ color: config.fill, width: config.width * scale }), zIndex: config.layer + 1 }),
    ]),
  }));
  const makePlaceStyle = (size: string, layer: number, emphasized = false) => new Style({
    zIndex: layer,
    text: new Text({
      font: `${emphasized ? fontWeight.semibold : fontWeight.medium} ${size} ${font.family}`,
      fill: new Fill({ color: emphasized ? mapPalette.label : mapPalette.labelMuted }),
      stroke: new Stroke({ color: color.surface, width: 3 }),
      placement: 'point',
      declutterMode: 'declutter',
    }),
  });
  const city = makePlaceStyle(fontSize.bodySm, mapLayer.cityLabel, true);
  const town = makePlaceStyle(fontSize.meta, mapLayer.townLabel);
  const district = makePlaceStyle(fontSize.caption, mapLayer.districtLabel);
  const roadName = new Style({
    zIndex: mapLayer.roadLabel,
    text: new Text({
      font: `${fontWeight.medium} ${fontSize.caption} ${font.family}`,
      fill: new Fill({ color: mapPalette.labelMuted }),
      stroke: new Stroke({ color: color.surface, width: 3 }),
      placement: 'line',
      repeat: 360,
      maxAngle: Math.PI / 6,
      overflow: false,
      declutterMode: 'declutter',
    }),
  });

  return (feature, resolution) => {
    const sourceLayer: unknown = feature.get('sourceLayer');
    const geometryType = feature.getGeometry()?.getType();
    const isLine = geometryType === 'LineString' || geometryType === 'MultiLineString';
    const isPolygon = geometryType === 'Polygon' || geometryType === 'MultiPolygon';
    const featureClass: unknown = feature.get('class');
    const zoom = Number.isFinite(resolution) && resolution > 0
      ? Math.log2(INITIAL_RESOLUTION / resolution)
      : 9;

    // 산림 전체와 봉우리·등고선은 숨기고 생활권의 면 구분만 은은하게 표시한다.
    if (sourceLayer === 'landuse') {
      if (!isPolygon) return undefined;
      if (featureClass === 'residential' || featureClass === 'suburb') return residential;
      if (featureClass === 'industrial' || featureClass === 'commercial' || featureClass === 'retail') return industrial;
      if (featureClass === 'pitch' || featureClass === 'playground' || featureClass === 'stadium') return park;
      return undefined;
    }
    if (sourceLayer === 'landcover') {
      return isPolygon && featureClass === 'grass' && PARK_SUBCLASSES.has(feature.get('subclass')) ? park : undefined;
    }
    if (sourceLayer === 'water') {
      return isPolygon ? water : undefined;
    }
    if (sourceLayer === 'waterway') {
      return isLine && (featureClass === 'river' || featureClass === 'canal') ? waterway : undefined;
    }
    if (sourceLayer === 'building') {
      return isPolygon && zoom >= 14 ? building : undefined;
    }

    if (sourceLayer === 'transportation') {
      if (!isLine) return undefined;
      const road = roads.find(item => item.name === featureClass);
      if (!road || zoom < road.minZoom) return undefined;
      return road.levels[zoom >= 14 ? 2 : zoom >= 11 ? 1 : 0];
    }
    if (sourceLayer === 'transportation_name') {
      if (!isLine) return undefined;
      const road = roads.find(item => item.name === featureClass);
      if (!road || zoom < road.labelZoom) return undefined;
      const name = getPlaceName(key => feature.get(key));
      const ref: unknown = feature.get('ref');
      const label = name || (typeof ref === 'string' && ref.trim().length <= 12 ? ref.trim() : undefined);
      if (!label) return undefined;
      roadName.getText()!.setText(label);
      return roadName;
    }
    if (sourceLayer !== 'place' || geometryType !== 'Point') return undefined;

    const placeClass = featureClass;
    const isDistrict = placeClass === 'suburb' || placeClass === 'quarter' || placeClass === 'neighbourhood';
    if (placeClass !== 'city' && placeClass !== 'town' && !isDistrict) return undefined;
    if (placeClass === 'town' && zoom < 11) return undefined;
    if (isDistrict && zoom < 12) return undefined;
    const rawRank: unknown = feature.get('rank');
    const rank = typeof rawRank === 'number'
      ? rawRank
      : typeof rawRank === 'string' && rawRank.trim() ? Number(rawRank) : NaN;
    // 실제 지역 타일의 창원·김해 지명 순위(8·11)를 포함하면서 작은 마을 표시는 제한한다.
    const maximumRank = isDistrict ? (zoom >= 14 ? 40 : zoom >= 13 ? 24 : 14) : 14;
    if (!Number.isFinite(rank) || rank < 1 || rank > maximumRank) return undefined;
    const name = getPlaceName(key => feature.get(key));
    if (!name) return undefined;

    // OpenLayers가 반환 직후 텍스트를 읽으므로 이름별 캐시 없이 스타일을 재사용한다.
    const style = placeClass === 'city' ? city : isDistrict ? district : town;
    style.getText()!.setText(name);
    return style;
  };
}
