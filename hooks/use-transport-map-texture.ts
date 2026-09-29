'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CanvasTexture, SRGBColorSpace } from 'three';
import { demoMapPlaces, demoMapRoads } from '@/data/demo-map';
import { mapPalette, font } from '@/styles/design-tokens';
interface TileRange { zoom: number; tileSize: number; minX: number; maxX: number; minY: number; maxY: number }
export function useTransportMapTexture({ zoom, tileSize, minX, maxX, minY, maxY }: TileRange) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ texture: CanvasTexture | null; status: 'loading' | 'ready' | 'error' | 'empty' }>({ texture: null, status: 'loading' });
  const width = 2048;
  const height = Math.max(1, Math.round(width * (maxY - minY + 1) / (maxX - minX + 1)));
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  useEffect(() => {
    let texture: CanvasTexture | null = null;
    try {
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');
      ctx.fillStyle = mapPalette.land; ctx.fillRect(0, 0, width, height);
      const point = ([lon, lat]: number[]) => {
        const n = 2 ** zoom;
        const x = (lon + 180) / 360 * n;
        const rad = lat * Math.PI / 180;
        const y = (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * n;
        return [(x - minX) / (maxX - minX + 1) * width, (y - minY) / (maxY - minY + 1) * height];
      };
      const line = (road: number[][], color: string, weight: number) => {
        ctx.beginPath(); road.forEach((coordinate, index) => { const [x,y] = point(coordinate); if(index) ctx.lineTo(x,y); else ctx.moveTo(x,y); });
        ctx.strokeStyle = color; ctx.lineWidth = weight; ctx.stroke();
      };
      for(let x=128.4; x<129.2; x+=0.016) line([[x,35.02],[x+0.03,35.40]],mapPalette.road,3);
      for(let y=35.02; y<35.40; y+=0.012) line([[128.4,y],[129.2,y+0.02]],mapPalette.road,3);
      for(const road of demoMapRoads) { line(road,mapPalette.majorRoadOutline,14);line(road,mapPalette.motorway,10); }
      ctx.fillStyle = mapPalette.label; ctx.font = '600 24px ' + font.family;
      for(const place of demoMapPlaces) {const [x,y]=point(place.coordinate);ctx.fillText(place.name,x,y);}
      texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace;
      setState({ texture, status: 'ready' });
    } catch { setState({texture:null,status:'error'}); }
    return () => texture?.dispose();
  }, [zoom,tileSize,minX,maxX,minY,maxY,height,attempt]);
  return { ...state, retry, surfaceRef, surfaceSize: {width,height} };
}
