'use client';
import { useCallback, useState } from 'react';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import { fromLonLat } from 'ol/proj';
import { demoMapPlaces, demoMapRoads } from '@/data/demo-map';

export function useTransportBasemap() {
  const [source] = useState(() => {
    const features: Feature[] = demoMapRoads.map(road => new Feature({ geometry: new LineString(road.map(point => fromLonLat(point))), sourceLayer: 'transportation', class: 'motorway' }));
    for (let x = 128.50; x < 129.08; x += 0.025) {
      features.push(new Feature({ geometry: new LineString([[x, 35.09], [x + 0.02, 35.33]].map(point => fromLonLat(point))), sourceLayer: 'transportation', class: 'secondary' }));
    }
    for (let y = 35.09; y < 35.33; y += 0.017) {
      features.push(new Feature({ geometry: new LineString([[128.50, y], [129.08, y + 0.01]].map(point => fromLonLat(point))), sourceLayer: 'transportation', class: 'secondary' }));
    }
    features.push(new Feature({ geometry: new Polygon([[[128.48, 35.02], [129.15, 35.02], [129.15, 35.09], [128.96, 35.08], [128.80, 35.06], [128.64, 35.10], [128.48, 35.02]].map(point => fromLonLat(point))]), sourceLayer: 'water' }));
    demoMapPlaces.forEach(place => features.push(new Feature({ geometry: new Point(fromLonLat(place.coordinate)), sourceLayer: 'place', class: 'city', rank: 1, name: place.name })));
    return new VectorSource({ features });
  });
  return { source, status: 'ready' as const, retry: useCallback(() => source.changed(), [source]) };
}
