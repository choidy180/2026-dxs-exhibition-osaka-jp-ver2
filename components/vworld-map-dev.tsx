
"use client";

import React, { useEffect, useRef } from "react";
import Map from "ol/Map";
import View from "ol/View";
import VectorTileLayer from "ol/layer/VectorTile";
import { TRANSPORT_VECTOR_BASEMAP } from "@/constants/transport-basemap";
import { createTransportMapStyle } from "@/utils/transport-map-style";
import { mapPalette } from "@/styles/design-tokens";
import { useTransportBasemap } from "@/hooks/use-transport-basemap";
import MapAttribution from "@/components/transport-map/MapAttribution";
import MapTileStatus from "@/components/transport-map/MapTileStatus";
import { MapFrame, MapSurface } from "@/components/transport-map/styles";
import { fromLonLat } from "ol/proj";
import { LineString, Point } from "ol/geom";
import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import { Style, Stroke, Circle as CircleStyle, Fill } from "ol/style";
import Feature from "ol/Feature";
import Overlay from "ol/Overlay";
import { boundingExtent } from "ol/extent";
import { Coordinate } from "ol/coordinate";
import { Geometry } from "ol/geom";

export interface VWorldMarker {
  id: string; 
  lat: number;
  lng: number;
  title?: string;
  imageUrl?: string;
  isFacility?: boolean;
  startLat?: number;
  startLng?: number;
  destLat?: number;
  destLng?: number;
  progress?: number;
  isFocused?: boolean;
  driver?: string;
  cargo?: string;
  eta?: string;
  vehicleNo?: string;
  remainingTime?: string; 
  routeColor?: string;
  routeLineStyle?: string;
  flip?: boolean;
}

type MarkerInfoMode = 'hidden' | 'all' | 'selected' | 'auto';

interface EtaData { toBusan: number; toLG: number; }

interface VWorldMapProps {
  markers?: VWorldMarker[];
  focusedTitle?: string | null;
  onEtaUpdate?: (eta: EtaData) => void;
  markerInfoMode?: MarkerInfoMode;
  selectedMarkerIds?: string[];
  onMarkerClick?: (marker: VWorldMarker) => void;
  onMapBlankClick?: () => void;
}

const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

// 🟢 [고정 경로 데이터] index 0: LG전자, index Last: 고모텍 부산
const FIXED_NAV_PATH = [
  [128.665967, 35.207494], [128.667333, 35.206717], [128.666675, 35.205953], [128.666686, 35.205829],
  [128.666654, 35.20562], [128.666284, 35.205149], [128.670354, 35.202816], [128.670434, 35.202671],
  [128.670478, 35.202572], [128.670513, 35.202491], [128.670524, 35.202398], [128.67052, 35.202274],
  [128.668013, 35.199278], [128.667289, 35.198389], [128.666853, 35.197954], [128.666681, 35.197865],
  [128.666394, 35.197724], [128.666353, 35.197716], [128.666316, 35.197699], [128.666286, 35.197674],
  [128.666265, 35.197645], [128.666254, 35.197611], [128.666254, 35.197577], [128.666264, 35.197543],
  [128.666285, 35.197513], [128.666315, 35.197489], [128.666351, 35.197471], [128.666017, 35.196933],
  [128.668354, 35.196195], [128.670413, 35.195055], [128.670736, 35.194878], [128.671904, 35.194217],
  [128.673246, 35.193474], [128.673885, 35.193104], [128.674814, 35.192464], [128.675605, 35.191698],
  [128.675792, 35.191441], [128.676063, 35.191094], [128.676707, 35.189897], [128.676851, 35.18963],
  [128.677079, 35.189205], [128.677316, 35.188811], [128.67751, 35.18853], [128.677805, 35.18814],
  [128.677925, 35.187991], [128.678515, 35.187288], [128.678773, 35.187023], [128.679173, 35.186689],
  [128.680048, 35.186061], [128.680951, 35.185553], [128.682313, 35.184987], [128.684167, 35.184264],
  [128.684818, 35.184034], [128.685543, 35.183778], [128.687345, 35.183078], [128.689093, 35.182403],
  [128.690724, 35.181875], [128.692142, 35.181587], [128.692798, 35.181484], [128.693454, 35.181407],
  [128.694799, 35.181272], [128.695441, 35.181218], [128.695917, 35.181178], [128.696755, 35.181106],
  [128.696965, 35.181087], [128.697175, 35.181078], [128.697596, 35.181067], [128.698022, 35.181064],
  [128.698631, 35.181076], [128.699583, 35.181114], [128.700226, 35.181175], [128.700618, 35.181225],
  [128.701257, 35.181294], [128.701604, 35.181346], [128.701774, 35.181374], [128.701958, 35.181412],
  [128.702592, 35.181584], [128.703363, 35.181773], [128.703794, 35.181929], [128.704658, 35.182268],
  [128.705507, 35.182633], [128.706937, 35.183301], [128.707686, 35.183634], [128.708745, 35.184108],
  [128.709748, 35.184502], [128.710707, 35.184865], [128.71189, 35.1853], [128.712567, 35.185501],
  [128.713294, 35.185609], [128.71423, 35.185715], [128.714837, 35.18576], [128.715627, 35.185781],
  [128.716536, 35.185756], [128.717183, 35.185706], [128.718083, 35.185549], [128.718277, 35.185515],
  [128.718797, 35.185404], [128.719664, 35.185167], [128.720354, 35.184931], [128.721263, 35.184579],
  [128.723691, 35.183624], [128.727195, 35.18283], [128.731126, 35.182116], [128.732744, 35.18196],
  [128.756425, 35.181444], [128.75725, 35.181376], [128.757874, 35.181321], [128.758272, 35.181314],
  [128.762506, 35.181162], [128.764525, 35.181191], [128.765417, 35.181257], [128.768719, 35.181505],
  [128.769076, 35.18151], [128.76987, 35.181505], [128.771311, 35.181399], [128.772841, 35.181183],
  [128.774338, 35.180877], [128.775704, 35.180464], [128.776269, 35.180249], [128.776826, 35.179995],
  [128.778159, 35.179189], [128.778752, 35.178771], [128.779504, 35.17811], [128.779904, 35.177738],
  [128.783108, 35.174603], [128.78322, 35.174511], [128.783424, 35.174345], [128.783767, 35.174064],
  [128.784696, 35.17351], [128.785346, 35.173191], [128.786266, 35.172796], [128.786962, 35.172599],
  [128.787844, 35.172394], [128.78933, 35.172219], [128.790426, 35.172212], [128.791383, 35.172273],
  [128.792618, 35.172409], [128.793965, 35.1725], [128.795116, 35.1725], [128.795952, 35.172478],
  [128.797559, 35.172295], [128.798952, 35.171931], [128.799834, 35.171567], [128.800949, 35.170876],
  [128.802461, 35.169669], [128.803159, 35.16916], [128.80445, 35.168279], [128.805862, 35.167383],
  [128.806651, 35.166928], [128.807431, 35.166503], [128.808824, 35.165872], [128.809735, 35.165554],
  [128.810775, 35.165273], [128.812242, 35.164969], [128.813273, 35.164832], [128.816449, 35.164438],
  [128.818003, 35.164139], [128.819797, 35.163723], [128.820995, 35.163439], [128.822135, 35.163054],
  [128.822615, 35.162897], [128.822884, 35.162802], [128.824357, 35.162194], [128.825462, 35.161669],
  [128.828299, 35.16029], [128.829473, 35.159677], [128.830599, 35.15903], [128.832107, 35.157742],
  [128.834483, 35.155607], [128.835678, 35.154671], [128.836433, 35.154185], [128.836638, 35.154075],
  [128.837112, 35.153891], [128.837655, 35.153688], [128.83803, 35.153559], [128.838715, 35.153383],
  [128.839282, 35.153252], [128.840528, 35.153036], [128.842422, 35.152772], [128.843422, 35.152602],
  [128.84494, 35.152345], [128.8474, 35.151958], [128.847742, 35.151911], [128.848634, 35.151752],
  [128.850031, 35.151467], [128.851295, 35.151063], [128.852563, 35.150482], [128.853883, 35.149751],
  [128.854632, 35.149246], [128.856125, 35.148007], [128.859201, 35.145156], [128.859806, 35.144695],
  [128.860222, 35.144306], [128.86049, 35.144054], [128.860778, 35.143664], [128.860982, 35.143319],
  [128.861179, 35.142913], [128.861271, 35.142564], [128.861309, 35.142237], [128.861305, 35.141496],
  [128.861448, 35.141478], [128.861448, 35.141509], [128.861452, 35.142134], [128.86146, 35.143657],
  [128.861461, 35.143934], [128.861468, 35.145143], [128.861471, 35.145659], [128.861328, 35.145658],
  [128.860623, 35.145673], [128.860122, 35.145699], [128.859814, 35.145833], [128.859629, 35.145946],
  [128.859443, 35.146283], [128.859382, 35.146635], [128.859367, 35.148732]
];

export default function VWorldMap({
  markers = [],
  focusedTitle,
  onEtaUpdate,
  markerInfoMode = 'auto',
  selectedMarkerIds = [],
  onMarkerClick,
  onMapBlankClick,
}: VWorldMapProps) {
  const basemap = useTransportBasemap();
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const routeSourceRef = useRef<VectorSource<Feature<Geometry>> | null>(null);
  const remainingRouteSourceRef = useRef<VectorSource<Feature<Geometry>> | null>(null);
  const markerHitSourceRef = useRef<VectorSource<Feature<Geometry>> | null>(null);
  const routeGeomRef = useRef<LineString | null>(null);
  const markerStoreRef = useRef<globalThis.Map<string, VWorldMarker>>(new globalThis.Map());
  const lastDomMarkerClickRef = useRef<{ id: string; at: number }>({ id: "", at: 0 });
  const suppressNextClickRef = useRef(false);
  const handledPointerIdsRef = useRef<Set<number>>(new Set());
  const activateMarkerByIdRef = useRef<(markerId: string, event?: Event, source?: "dom" | "map") => boolean>(() => false);
  const onMarkerClickRef = useRef<typeof onMarkerClick>(onMarkerClick);
  const onMapBlankClickRef = useRef<typeof onMapBlankClick>(onMapBlankClick);

  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick;
  }, [onMarkerClick]);

  useEffect(() => {
    onMapBlankClickRef.current = onMapBlankClick;
  }, [onMapBlankClick]);

  const getMarkerCoordinate = (marker: VWorldMarker): Coordinate => {
    const routeGeom = routeGeomRef.current;
    if (routeGeom && typeof marker.progress === 'number') {
      const progress = Math.max(0, Math.min(1, marker.progress));
      const isLgStart = (marker.startLat || 0) > 35.18;
      return isLgStart ? routeGeom.getCoordinateAt(progress) : routeGeom.getCoordinateAt(1 - progress);
    }
    return fromLonLat([marker.lng, marker.lat]);
  };

  const focusMarkerOnMap = (marker: VWorldMarker) => {
    const map = mapRef.current;
    if (!map) return;

    const coordinate = getMarkerCoordinate(marker);
    const view = map.getView();
    const currentZoom = view.getZoom() || 10;

    view.cancelAnimations();
    view.animate({
      center: coordinate,
      zoom: Math.max(currentZoom, 11),
      duration: 380,
    });
  };

  const markNextClickSuppressed = () => {
    suppressNextClickRef.current = true;
    window.setTimeout(() => {
      suppressNextClickRef.current = false;
    }, 420);
  };

  const rememberPointer = (event: PointerEvent) => {
    handledPointerIdsRef.current.add(event.pointerId);
    window.setTimeout(() => {
      handledPointerIdsRef.current.delete(event.pointerId);
    }, 520);
  };

  activateMarkerByIdRef.current = (markerId: string, event?: Event, source: "dom" | "map" = "map") => {
    const marker = markerStoreRef.current.get(String(markerId));
    if (!marker) return false;

    if (source === "dom") {
      lastDomMarkerClickRef.current = { id: String(markerId), at: Date.now() };
    }

    event?.preventDefault?.();
    event?.stopPropagation?.();

    if (typeof PointerEvent !== "undefined" && event instanceof PointerEvent) {
      rememberPointer(event);
      markNextClickSuppressed();
      const target = event.target as HTMLElement | null;
      try { target?.releasePointerCapture?.(event.pointerId); } catch {}
    } else if (event?.type === "keydown") {
      markNextClickSuppressed();
    }

    (document.activeElement as HTMLElement | null)?.blur?.();
    focusMarkerOnMap(marker);
    onMarkerClickRef.current?.(marker);
    return true;
  };


  useEffect(() => {
    if (!mapElement.current || mapRef.current) return;

    const routeSource = new VectorSource<Feature<Geometry>>();
    const remainingRouteSource = new VectorSource<Feature<Geometry>>();
    const markerHitSource = new VectorSource<Feature<Geometry>>();
    routeSourceRef.current = routeSource;
    remainingRouteSourceRef.current = remainingRouteSource;
    markerHitSourceRef.current = markerHitSource;

    const baseLayer = new VectorTileLayer({
      source: basemap.source,
      background: mapPalette.land,
      declutter: true,
      style: createTransportMapStyle(),
    });
    const markerHitLayer = new VectorLayer({
      source: markerHitSource,
      zIndex: 60,
      style: new Style({
        image: new CircleStyle({ radius: 34, fill: new Fill({ color: "rgba(15,23,42,0.01)" }) })
      })
    });

    const map = new Map({
      target: mapElement.current,
      layers: [
        baseLayer,
        new VectorLayer({ source: routeSource, zIndex: 10 }),
        new VectorLayer({ source: remainingRouteSource, zIndex: 15 }),
        markerHitLayer,
      ],
      view: new View({ center: fromLonLat([128.76, 35.18]), zoom: 9, minZoom: 9, maxZoom: 16 }),
      controls: [],
    });
    mapRef.current = map;

    const viewport = map.getViewport();
    viewport.querySelectorAll<HTMLElement>('.ol-overlaycontainer, .ol-overlaycontainer-stopevent').forEach((container) => {
      container.style.zIndex = '2147481000';
    });

    const handleMapSingleClick = (event: any) => {
      if (suppressNextClickRef.current) {
        suppressNextClickRef.current = false;
        event.originalEvent?.preventDefault?.();
        event.originalEvent?.stopPropagation?.();
        return;
      }

      let clickedMarkerId: string | null = null;
      map.forEachFeatureAtPixel(
        event.pixel,
        (feature) => {
          const markerId = feature.get('markerId');
          if (!markerId) return undefined;
          clickedMarkerId = String(markerId);
          return true;
        },
        { hitTolerance: 12, layerFilter: layer => layer === markerHitLayer }
      );

      if (clickedMarkerId) {
        const lastDomClick = lastDomMarkerClickRef.current;
        if (lastDomClick.id === clickedMarkerId && Date.now() - lastDomClick.at < 650) return;
        activateMarkerByIdRef.current(clickedMarkerId, event.originalEvent, 'map');
        return;
      }

      onMapBlankClickRef.current?.();
    };

    const handlePointerMove = (event: any) => {
      if (event.dragging) return;
      const hit = map.hasFeatureAtPixel(event.pixel, { hitTolerance: 12, layerFilter: layer => layer === markerHitLayer });
      viewport.style.cursor = hit ? 'pointer' : '';
    };

    map.on('singleclick', handleMapSingleClick);
    map.on('pointermove', handlePointerMove);

    const facilities = [
      { lat: 35.207843, lng: 128.666263, title: "LG전자", imageUrl: "/icons/LG.jpg" },
      { lat: 35.148734, lng: 128.859885, title: "고모텍 부산", imageUrl: "/icons/GMT.png" }
    ];

    facilities.forEach(fac => {
      const mPos = fromLonLat([fac.lng, fac.lat]);
      const el = document.createElement('div');
      const isLG = fac.title.includes("LG");
      const borderColor = isLG ? '#ce0037' : '#2563eb';

      el.innerHTML = `
        <div data-vworld-static-overlay="facility" style="display:flex; flex-direction:column; align-items:center;">
          <div style="width: 54px; height: 54px; background: #ffffff; border: 2px solid ${borderColor}; box-shadow: 0 8px 18px rgba(15,23,42,.16); border-radius: 16px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
            <img src="${fac.imageUrl}" style="width: 76%; height: auto; object-fit: contain;">
          </div>
          <div style="margin-top: 6px; font-size: 11px; font-weight: 700; color: #0f172a; background: #ffffff; padding: 4px 9px; border-radius: 999px; border:1px solid #e2e8f0; white-space: nowrap;">
            ${escapeHtml(fac.title)}
          </div>
        </div>
      `;
      map.addOverlay(new Overlay({ position: mPos, element: el, positioning: 'center-center' }));
    });

    const projectedCoords = FIXED_NAV_PATH.map(coord => fromLonLat([coord[0], coord[1]]));
    const routeGeom = new LineString(projectedCoords);
    routeGeomRef.current = routeGeom;

    const routeFeature = new Feature({ geometry: routeGeom });
    routeFeature.setStyle([
      new Style({ stroke: new Stroke({ color: 'rgba(255,255,255,.95)', width: 8, lineCap: 'round' }), zIndex: 1 }),
      new Style({ stroke: new Stroke({ color: '#64748b', width: 3, lineDash: [8, 10], lineCap: 'round' }), zIndex: 2 })
    ]);
    routeSource.addFeature(routeFeature);

    const extent = boundingExtent(projectedCoords);
    map.getView().fit(extent, { padding: [110, 430, 190, 430], duration: 1000, maxZoom: 12 });

    if (onEtaUpdate) onEtaUpdate({ toBusan: 2400, toLG: 2400 });

    return () => {
      map.un('singleclick', handleMapSingleClick);
      map.un('pointermove', handlePointerMove);
      viewport.style.cursor = '';
      map.setTarget(undefined);
      mapRef.current = null;
      markerHitSourceRef.current = null;
    };
  }, [basemap.source]);

  useEffect(() => {
    const remainingRouteSource = remainingRouteSourceRef.current;
    const markerHitSource = markerHitSourceRef.current;
    const map = mapRef.current;
    const routeGeom = routeGeomRef.current;
    if (!map || !remainingRouteSource || !markerHitSource || !routeGeom) return;

    remainingRouteSource.clear();
    markerHitSource.clear();

    const cars = markers.filter(m => !m.isFacility);
    markerStoreRef.current = new globalThis.Map<string, VWorldMarker>(
      cars.map((m, index) => [String(m.id || index), m] as [string, VWorldMarker])
    );
    const activeCarIds = new Set(cars.map(m => String(m.id)));
    const selectedSet = new Set(selectedMarkerIds.map(String));
    const shouldShowInfo = (car: VWorldMarker) => {
      const id = String(car.id);
      if (markerInfoMode === 'hidden') return false;
      if (markerInfoMode === 'all') return true;
      if (markerInfoMode === 'selected') return selectedSet.has(id);
      return !!car.isFocused || (!!focusedTitle && String(car.id) === String(focusedTitle));
    };
    const infoIds = new Set(cars.filter(shouldShowInfo).map(m => String(m.id)));

    const existingOverlays = map.getOverlays().getArray();
    [...existingOverlays].forEach(overlay => {
      const oid = overlay.getId?.();
      if (!oid) return;
      const idStr = String(oid);
      if (idStr.startsWith('icon-')) {
        const carId = idStr.slice('icon-'.length);
        if (!activeCarIds.has(carId)) map.removeOverlay(overlay);
      }
      if (idStr.startsWith('popup-')) {
        const carId = idStr.slice('popup-'.length);
        if (!infoIds.has(carId)) map.removeOverlay(overlay);
      }
    });

    const infoCars = cars.map((m, index) => {
      const progress = Math.max(0, Math.min(1, m.progress || 0));
      const isLgStart = (m.startLat || 0) > 35.18;
      return { id: String(m.id || index), absoluteProgress: isLgStart ? progress : (1 - progress), marker: m };
    }).filter(item => shouldShowInfo(item.marker)).sort((a, b) => a.absoluteProgress - b.absoluteProgress);

    const stackIndexes: Record<string, number> = {};
    infoCars.forEach((car, i) => {
      if (i === 0) { stackIndexes[car.id] = 0; return; }
      const prevCar = infoCars[i - 1];
      if (Math.abs(car.absoluteProgress - prevCar.absoluteProgress) < 0.04) {
        stackIndexes[car.id] = stackIndexes[prevCar.id] + 1;
      } else {
        stackIndexes[car.id] = 0;
      }
    });

    cars.forEach((car, index) => {
      const carId = String(car.id || index);
      const isLgStart = (car.startLat || 0) > 35.18;
      const themeColor = isLgStart ? '#ce0037' : '#0f172a';
      const themeRgb = isLgStart ? '206,0,55' : '15,23,42';
      const progress = Math.max(0, Math.min(1, car.progress || 0));
      const showPopup = shouldShowInfo(car);
      const selected = selectedSet.has(carId) || showPopup;
      const carPos: Coordinate = typeof car.progress === 'number'
        ? (isLgStart ? routeGeom.getCoordinateAt(progress) : routeGeom.getCoordinateAt(1 - progress))
        : fromLonLat([car.lng, car.lat]);

      const markerHitFeature = new Feature({ geometry: new Point(carPos) });
      markerHitFeature.set('markerId', carId);
      markerHitSource.addFeature(markerHitFeature);

      if (showPopup) {
        const flatCoords = routeGeom.getCoordinates();
        let remainingCoords: Coordinate[] = [];
        if (isLgStart) {
          const nextIndex = Math.ceil((flatCoords.length - 1) * progress);
          remainingCoords = [carPos, ...flatCoords.slice(nextIndex)];
        } else {
          const prevIndex = Math.floor((flatCoords.length - 1) * (1 - progress));
          remainingCoords = [carPos, ...flatCoords.slice(0, prevIndex + 1).reverse()];
        }

        if (remainingCoords.length > 1) {
          const remainingFeature = new Feature({ geometry: new LineString(remainingCoords) });
          remainingFeature.setStyle([
            new Style({ stroke: new Stroke({ color: 'rgba(255,255,255,.95)', width: 8, lineDash: [14, 12], lineCap: 'round' }), zIndex: 3 }),
            new Style({ stroke: new Stroke({ color: themeColor, width: 4, lineDash: [14, 12], lineCap: 'round' }), zIndex: 4 })
          ]);
          remainingRouteSource.addFeature(remainingFeature);
        }
      }

      const totalLengthMeters = routeGeom.getLength();
      const remainingMeters = totalLengthMeters * (1 - progress);
      const remainingKm = remainingMeters / 1000;
      const avgSpeedKmH = 60;
      const remainingMinutesTotal = Math.max(0, Math.round((remainingKm / avgSpeedKmH) * 60));
      const hours = Math.floor(remainingMinutesTotal / 60);
      const minutes = remainingMinutesTotal % 60;
      let computedRemainingTimeStr = hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`;
      if (remainingMinutesTotal <= 1) computedRemainingTimeStr = "도착 임박";

      const iconOverlayId = `icon-${carId}`;
      const iconOverlay = map.getOverlayById(iconOverlayId);
      const iconSize = showPopup ? 62 : 52;
      const innerSize = showPopup ? 40 : 34;
      const iconHtml = `
        <button type="button" data-vworld-interactive-overlay="marker" data-marker-id="${escapeHtml(carId)}" aria-label="${escapeHtml(car.vehicleNo || car.title || '차량')} 상세 보기" style="position: relative; z-index:${showPopup ? 1000004 : 1000002}; width: ${iconSize}px; height: ${iconSize}px; display: flex; align-items: center; justify-content: center; cursor: pointer; pointer-events:auto; touch-action: manipulation; border:0; background:transparent; padding:0;">
          <span style="width:${iconSize}px; height:${iconSize}px; border-radius:${showPopup ? '18px' : '16px'}; display:flex; align-items:center; justify-content:center; background:#ffffff; border:1px solid #e2e8f0; box-shadow:0 8px 18px rgba(15,23,42,.16); pointer-events:none;">
            <span style="width:${innerSize}px; height:${innerSize}px; border-radius:12px; display:flex; align-items:center; justify-content:center; background:${themeColor}; pointer-events:none;">
              <svg width="${showPopup ? 24 : 20}" height="${showPopup ? 24 : 20}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform: ${isLgStart ? 'none' : 'scaleX(-1)'}; pointer-events:none;">
                <rect x="3" y="6" width="12" height="15" rx="2"></rect>
                <path d="M15 11h4l3 4v6h-7"></path>
                <circle cx="7" cy="21" r="2.2"></circle>
                <circle cx="19" cy="21" r="2.2"></circle>
              </svg>
            </span>
          </span>
          ${selected ? `<span style="position:absolute; right:7px; top:7px; width:8px; height:8px; border-radius:50%; background:#10b981; border:2px solid white; pointer-events:none;"></span>` : ''}
        </button>
      `;

      const prepareMarkerElement = (element: HTMLElement, markerId: string) => {
        type ClickBoundElement = HTMLElement & { __vworldMarkerClickBound?: boolean };
        const overlayElement = element as ClickBoundElement;
        overlayElement.dataset.vworldInteractiveOverlay = 'marker';
        overlayElement.dataset.markerId = markerId;
        overlayElement.style.pointerEvents = 'auto';
        overlayElement.style.cursor = 'pointer';
        overlayElement.style.touchAction = 'manipulation';
        overlayElement.style.userSelect = 'none';

        const markerNode = (element.matches('[data-marker-id]') ? element : element.querySelector('[data-marker-id]')) as HTMLElement | null;
        if (markerNode) {
          markerNode.style.pointerEvents = 'auto';
          markerNode.style.cursor = 'pointer';
          markerNode.style.touchAction = 'manipulation';
          markerNode.style.userSelect = 'none';
        }

        if (!overlayElement.__vworldMarkerClickBound) {
          const getClickedMarkerId = (event: Event) => {
            const target = event.target instanceof Element ? event.target : null;
            const markerElement = target?.closest('[data-marker-id]') as HTMLElement | null;
            return markerElement?.dataset.markerId || overlayElement.dataset.markerId || null;
          };

          overlayElement.addEventListener('pointerdown', (event: PointerEvent) => {
            if (event.pointerType === 'mouse' && event.button !== 0) return;
            if (handledPointerIdsRef.current.has(event.pointerId)) return;

            const clickedMarkerId = getClickedMarkerId(event);
            if (!clickedMarkerId) return;
            activateMarkerByIdRef.current(clickedMarkerId, event, 'dom');
          });

          overlayElement.addEventListener('click', (event) => {
            if (suppressNextClickRef.current) {
              suppressNextClickRef.current = false;
              event.preventDefault();
              event.stopPropagation();
              return;
            }

            const clickedMarkerId = getClickedMarkerId(event);
            if (!clickedMarkerId) return;
            activateMarkerByIdRef.current(clickedMarkerId, event, 'dom');
          });

          overlayElement.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            const clickedMarkerId = getClickedMarkerId(event);
            if (!clickedMarkerId) return;
            activateMarkerByIdRef.current(clickedMarkerId, event, 'dom');
          });

          overlayElement.__vworldMarkerClickBound = true;
        }
      };


      if (iconOverlay) {
        iconOverlay.setPosition(carPos);
        const iconEl = iconOverlay.getElement();
        if (iconEl) {
          iconEl.style.zIndex = String(showPopup ? 1000004 : 1000002);
          iconEl.style.pointerEvents = 'auto';
          iconEl.innerHTML = iconHtml;
          prepareMarkerElement(iconEl, carId);
        }
      } else {
        const iconEl = document.createElement('div');
        iconEl.style.zIndex = String(showPopup ? 1000004 : 1000002);
        iconEl.style.pointerEvents = 'auto';
        iconEl.innerHTML = iconHtml;
        prepareMarkerElement(iconEl, carId);
        map.addOverlay(new Overlay({ id: iconOverlayId, element: iconEl, position: carPos, positioning: 'center-center', stopEvent: true }));
      }

      const popupOverlayId = `popup-${carId}`;
      const popupOverlay = map.getOverlayById(popupOverlayId);
      if (showPopup) {
        const sIndex = stackIndexes[carId] || 0;
        const popupHeight = 172;
        const yOffset = -58 - (sIndex * popupHeight);
        const progressPct = Math.floor(progress * 100);
        const tailHtml = sIndex > 0
          ? `<div style="position:absolute; bottom:-${(sIndex * popupHeight)-12}px; left:calc(50% - 1px); width:0; height:${(sIndex * popupHeight)-18}px; border-left:2px dashed rgba(${themeRgb}, .35); z-index:-1;"></div>`
          : `<div style="position:absolute; bottom:-8px; left:50%; transform:translateX(-50%); width:0; height:0; border-left:8px solid transparent; border-right:8px solid transparent; border-top:8px solid #ffffff;"></div>`;

        const popupContent = `
          <div data-vworld-top-overlay="popup" style="z-index:${1000008 - sIndex}; position:relative; width:242px; padding:16px; border-radius:24px; background:#ffffff; border:1px solid #e2e8f0; box-shadow:0 10px 28px rgba(15,23,42,.14); pointer-events:none;">
            ${tailHtml}
            <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:14px;">
              <div>
                <div style="font-size:19px; font-weight: 700; color:#0f172a; letter-spacing:-.7px;">${escapeHtml(car.vehicleNo || car.title || '차량정보 없음')}</div>
                <div style="margin-top:3px; font-size:11px; color:#64748b; font-weight: 700;">${escapeHtml(car.cargo || '화물 정보 없음')}</div>
              </div>
              <span style="background:#f8fafc; color:${themeColor}; border:1px solid #e2e8f0; font-size:11px; font-weight: 700; padding:5px 9px; border-radius:999px; white-space:nowrap;">이동중</span>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:12px;">
              <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:10px;">
                <div style="font-size:10px; color:#64748b; font-weight: 700; margin-bottom:4px;">기사명</div>
                <div style="font-size:13px; color:#0f172a; font-weight: 700;">${escapeHtml(car.driver || '-')}</div>
              </div>
              <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:10px;">
                <div style="font-size:10px; color:#64748b; font-weight: 700; margin-bottom:4px;">남은 시간</div>
                <div style="font-size:13px; color:${themeColor}; font-weight: 700;">${escapeHtml(computedRemainingTimeStr)}</div>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:9px; padding-top:12px; border-top:1px solid #e2e8f0;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${themeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform:${isLgStart ? 'none' : 'scaleX(-1)'};"><rect x="3" y="6" width="12" height="15" rx="2"/><path d="M15 11h4l3 4v6h-7"/><circle cx="7" cy="21" r="2.2"/><circle cx="19" cy="21" r="2.2"/></svg>
              <div style="flex:1; height:7px; background:#e2e8f0; border-radius:999px; position:relative; overflow:hidden;">
                <div style="position:absolute; left:0; top:0; height:100%; width:${progressPct}%; background:${themeColor}; border-radius:inherit;"></div>
              </div>
              <span style="font-size:12px; font-weight: 700; color:#0f172a; width:36px; text-align:right;">${progressPct}%</span>
            </div>
          </div>`;

        if (popupOverlay) {
          popupOverlay.setPosition(carPos);
          popupOverlay.setOffset([0, yOffset]);
          const popupEl = popupOverlay.getElement();
          if (popupEl) {
            popupEl.style.zIndex = String(1000008 - sIndex);
            popupEl.style.pointerEvents = 'none';
            popupEl.innerHTML = popupContent;
          }
        } else {
          const popupEl = document.createElement('div');
          popupEl.style.zIndex = String(1000008 - sIndex);
          popupEl.style.pointerEvents = 'none';
          popupEl.innerHTML = popupContent;
          map.addOverlay(new Overlay({ id: popupOverlayId, element: popupEl, position: carPos, positioning: 'bottom-center', offset: [0, yOffset], stopEvent: false }));
        }
      }
    });
  }, [markers, markerInfoMode, selectedMarkerIds, focusedTitle]);

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ol@v9.0.0/ol.css" />
      <MapFrame>
        <MapSurface ref={mapElement} />
        <MapTileStatus status={basemap.status} onRetry={basemap.retry} />
        <MapAttribution sources={TRANSPORT_VECTOR_BASEMAP.attributions} compactAlign="left" />
      </MapFrame>
    </>
  );
}
