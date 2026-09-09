'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import VectorTileSource from 'ol/source/VectorTile';
import MVT from 'ol/format/MVT';
import type Tile from 'ol/Tile';
import { unByKey } from 'ol/Observable';
import { TRANSPORT_VECTOR_BASEMAP } from '@/constants/transport-basemap';
import type { MapLoadStatus } from '@/components/transport-map/MapTileStatus';

const LOAD_TIMEOUT_MS = 15_000;

export function useTransportBasemap() {
  const [source] = useState(() => new VectorTileSource({
    format: new MVT({ layers: [...TRANSPORT_VECTOR_BASEMAP.layers], layerName: 'sourceLayer' }),
    attributions: TRANSPORT_VECTOR_BASEMAP.attributions.map(item => `<a href="${item.href}" target="_blank" rel="noopener noreferrer">${item.label}</a>`),
    maxZoom: TRANSPORT_VECTOR_BASEMAP.maxZoom,
    tileSize: 512,
  }));
  const [status, setStatus] = useState<MapLoadStatus>('loading');
  const retryRef = useRef<() => void>(() => {});

  useEffect(() => {
    const pending = new Set<Tile>();
    const failed = new Set<Tile>();
    let timedOut = false;
    let active = true;
    let manifestReady = false;
    let controller: AbortController | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startDeadline = () => {
      if (timer) return;
      timer = setTimeout(() => { timedOut = true; controller?.abort(); setStatus('error'); }, LOAD_TIMEOUT_MS);
    };
    const update = () => {
      if (manifestReady && !pending.size) {
        clearTimeout(timer);
        timer = undefined;
        if (!failed.size) timedOut = false;
      }
      setStatus(timedOut || failed.size ? 'error' : !manifestReady || pending.size ? 'loading' : 'ready');
    };
    const listeners = [
      source.on('tileloadstart', event => { if (manifestReady) { pending.add(event.tile); startDeadline(); update(); } }),
      source.on('tileloadend', event => { if (pending.delete(event.tile)) { failed.delete(event.tile); update(); } }),
      source.on('tileloaderror', event => { if (pending.delete(event.tile)) { failed.add(event.tile); update(); } }),
    ];
    const load = async () => {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      manifestReady = false;
      pending.clear();
      failed.clear();
      timedOut = false;
      clearTimeout(timer);
      timer = undefined;
      setStatus('loading');
      startDeadline();
      try {
        // 날짜가 붙는 PBF 경로를 고정하지 않고 최신 타일 목록을 읽는다.
        const response = await fetch(TRANSPORT_VECTOR_BASEMAP.manifestUrl, { signal: request.signal });
        if (!response.ok) throw new Error('Basemap manifest request failed');
        const manifest: unknown = await response.json();
        if (!active || request.signal.aborted || controller !== request) return;
        if (!manifest || typeof manifest !== 'object') throw new Error('Invalid basemap manifest');
        const { tiles, scheme, maxzoom } = manifest as { tiles?: unknown; scheme?: unknown; maxzoom?: unknown };
        if (!Array.isArray(tiles) || (scheme !== undefined && scheme !== 'xyz') ||
          typeof maxzoom !== 'number' || maxzoom < TRANSPORT_VECTOR_BASEMAP.maxZoom ||
          !tiles.every(url => typeof url === 'string' && url.startsWith('https://') &&
            ['{z}', '{x}', '{y}'].every(placeholder => url.includes(placeholder)))) {
          throw new Error('Invalid basemap tile configuration');
        }
        if (!tiles.length) {
          clearTimeout(timer);
          timer = undefined;
          source.setTileUrlFunction(() => undefined, 'empty');
          source.refresh();
          setStatus('empty');
          return;
        }
        manifestReady = true;
        source.setUrls(tiles);
        // HTTP 캐시를 유지하며 현재 화면 범위만 새로 읽는다.
        source.refresh();
      } catch {
        if (!active || controller !== request) return;
        clearTimeout(timer);
        timer = undefined;
        setStatus('error');
      }
    };
    retryRef.current = () => { void load(); };
    void load();
    return () => {
      active = false;
      controller?.abort();
      clearTimeout(timer);
      unByKey(listeners);
      retryRef.current = () => {};
    };
  }, [source]);

  return { source, status, retry: useCallback(() => retryRef.current(), []) };
}
