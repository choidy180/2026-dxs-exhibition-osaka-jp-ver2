import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import {
  createFoamingSensorSnapshot,
  createInspectionHistoryForDate,
  createPointInspectionSnapshot,
  createSingleInspectionSnapshot,
  DEMO_CAMERA_VIDEO,
  DEMO_FACTORY_IMAGE,
  DEMO_INSPECTION_IMAGE,
} from '../../data/exhibition-inspection';
import { GLASS_GAP_HISTORY_LOGS } from '../../data/glassGapInspectionHistory';
import { SIX_POINT_HISTORY_LOGS } from '../../data/sixPointInspectionHistory';
import { createCctvDemoSnapshot } from '../../utils/cctv-monitoring-api';
import { createFcmSender, sendAndroidPushNotification } from '../../lib/push-test/fcm';

const root = resolve(__dirname, '../..');
const frontendRoots = ['app', 'components', 'hooks', 'utils', 'constants', 'data'];

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(file) : [file];
  });
}

const sources = frontendRoots.flatMap(directory => filesUnder(join(root, directory)))
  .filter(file => /\.(?:ts|tsx|css)$/.test(file));

test('frontend cannot open API, socket, peer or external notification connections', () => {
  const violations: string[] = [];
  for (const file of sources.filter(file => /\.tsx?$/.test(file))) {
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const name = relative(root, file).replaceAll('\\', '/');
    const visit = (node: ts.Node) => {
      if (ts.isNewExpression(node) && /^(?:(?:window|globalThis)\.)?(WebSocket|EventSource|XMLHttpRequest|RTCPeerConnection)$/.test(node.expression.getText(source))) {
        violations.push(`${name}: ${node.expression.getText(source)}`);
      }
      if (ts.isCallExpression(node)) {
        const callee = node.expression.getText(source);
        if (/^(?:(?:window|globalThis)\.)?fetch$|^axios(?:\.|$)|^(?:navigator\.)?sendBeacon$/.test(callee)) {
          const isLocalModel = name === 'hooks/use-gmt-truck-model.ts'
            && callee === 'fetch' && node.arguments[0]?.getText(source) === 'GMT_TRUCK_MODEL_URL'
            && /const GMT_TRUCK_MODEL_URL = '\/models\/[^']+\.glb'/.test(source.text);
          if (!isLocalModel) violations.push(`${name}: ${callee}`);
        }
        if (callee === 'useGLTF' || callee === 'useGLTF.preload') {
          const decoder = node.arguments[1];
          if (!decoder || !ts.isStringLiteral(decoder) || decoder.text !== '/draco/') {
            violations.push(`${name}: model loader must use the bundled Draco decoder`);
          }
        }
      }
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(source);
        if (tag === 'Stage') {
          const environment = node.attributes.properties.find(attribute => ts.isJsxAttribute(attribute) && attribute.name.getText(source) === 'environment');
          if (!environment || !ts.isJsxAttribute(environment) || environment.initializer?.getText(source) !== '{null}') {
            violations.push(`${name}: Stage must not load its default remote environment`);
          }
        }
        if (tag === 'Environment' && node.attributes.properties.some(attribute => ts.isJsxAttribute(attribute) && attribute.name.getText(source) === 'preset')) {
          violations.push(`${name}: remote Environment presets are disabled`);
        }
        for (const attribute of node.attributes.properties) {
          if (ts.isJsxAttribute(attribute) && /^(src|href)$/.test(attribute.name.getText(source))
            && attribute.initializer && ts.isStringLiteral(attribute.initializer)
            && /^https?:\/\//.test(attribute.initializer.text) && tag !== 'a') {
            violations.push(`${name}: external resource ${attribute.initializer.text}`);
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  for (const file of sources.filter(file => file.endsWith('.css'))) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), /@import[^;]*https?:|url\(["']?https?:/i, file);
  }
  assert.deepEqual(violations, []);
});

test('static local media paths and offline Draco resources exist', () => {
  const media = new Set([DEMO_CAMERA_VIDEO, DEMO_FACTORY_IMAGE, DEMO_INSPECTION_IMAGE]);
  for (const file of sources) {
    for (const match of readFileSync(file, 'utf8').matchAll(/["'`](\/[A-Za-z0-9_./() -]+\.(?:png|jpg|jpeg|gif|webp|svg|mp4|webm|glb|gltf|woff2?))(?:[?#][^"'`]*)?["'`]/g)) media.add(match[1]);
  }
  for (const file of media) assert.ok(existsSync(join(root, 'public', file)), file);
  for (const file of ['draco_decoder.js', 'draco_wasm_wrapper.js', 'draco_decoder.wasm', 'LICENSE']) {
    assert.ok(existsSync(join(root, 'public/draco', file)), file);
  }
  const wasm = readFileSync(join(root, 'public/draco/draco_decoder.wasm'));
  assert.equal(wasm.subarray(0, 4).toString('hex'), '0061736d');
});

test('bundled GLB assets contain no external buffers or image resources', () => {
  for (const file of filesUnder(join(root, 'public')).filter(file => file.endsWith('.glb'))) {
    const buffer = readFileSync(file);
    assert.equal(buffer.subarray(0, 4).toString(), 'glTF');
    const json = JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString()) as {
      images?: { uri?: string }[]; buffers?: { uri?: string }[];
    };
    for (const resource of [...(json.images ?? []), ...(json.buffers ?? [])]) {
      if (resource.uri) assert.doesNotMatch(resource.uri, /^(?:https?:)?\/\//, file);
    }
  }
});

test('inspection simulation stays populated and counters agree across 200 cycles', () => {
  for (let cycle = 0; cycle < 200; cycle += 1) {
    const snapshot = createPointInspectionSnapshot(cycle);
    assert.equal(snapshot.totalStats.total_count, 1248 + cycle);
    assert.ok(snapshot.totalStats.normal_count <= snapshot.totalStats.total_count);
    assert.ok(snapshot.totalStats.normal_count > 0);
    assert.equal(snapshot.isDefectMode, snapshot.apiData.RESULT !== '정상');
    assert.ok(snapshot.apiData.TIMEVALUE);
    for (const station of ['film', 'gasket'] as const) {
      const single = createSingleInspectionSnapshot(cycle, station);
      assert.equal(single.apiData.FILEPATH1, DEMO_INSPECTION_IMAGE);
      assert.equal(single.apiData.COUNT_NUM, String(snapshot.totalStats.total_count));
    }
  }
  assert.equal(createPointInspectionSnapshot(17).isDefectMode, true);
  assert.equal(createPointInspectionSnapshot(18).isDefectMode, false);
});

test('every foaming process supplies changing finite sensor histories', () => {
  for (const process of ['GR2', 'GR3', 'GR5', 'GR9']) {
    const now = new Date('2026-09-18T03:00:00.000Z');
    const snapshot = createFoamingSensorSnapshot(process, now);
    const next = createFoamingSensorSnapshot(process, new Date(now.getTime() + 5000));
    assert.ok(snapshot.ok);
    assert.equal(snapshot.process, process);
    assert.equal(snapshot.series.length, 3);
    for (const series of snapshot.series) {
      assert.equal(series.readings.length, 40);
      assert.ok(series.readings.every(reading => Number.isFinite(reading.value)));
      assert.deepEqual(series.latest, series.readings.at(-1));
      assert.notEqual(series.latest?.value, next.series.find(item => item.seq === series.seq)?.latest?.value);
    }
  }
});

test('inspection histories follow selected dates and preserve empty future dates', () => {
  for (const samples of [GLASS_GAP_HISTORY_LOGS, SIX_POINT_HISTORY_LOGS]) {
    const history = createInspectionHistoryForDate('2026-01-01', samples);
    assert.equal(history.length, 4);
    assert.ok(history.every(item => item.wo.includes('20260101')));
    assert.equal(createInspectionHistoryForDate('2999-01-01', samples).length, 0);
    assert.equal(createInspectionHistoryForDate('', samples).length, 0);
    for (const item of history) {
      for (const image of Object.values(item.images)) assert.ok(existsSync(join(root, 'public', image)), image);
    }
  }
});

test('CCTV demo returns local playable media and advances revisions', () => {
  const first = createCctvDemoSnapshot();
  const next = createCctvDemoSnapshot();
  assert.equal(first.cameras.length, 15);
  assert.ok(next.revision > first.revision);
  assert.ok(first.cameras.every(camera => camera.status === 'online' && camera.stream.transport === 'local'
    && camera.stream.path === DEMO_CAMERA_VIDEO && camera.thumbnailUrl === DEMO_FACTORY_IMAGE));
});

test('Android notification compatibility functions cannot invoke an injected transport', async () => {
  let requests = 0;
  const send = createFcmSender({ httpRequest: async () => { requests += 1; throw new Error('Outbound call'); } });
  const token = 'exhibition-local-device-token';
  const subscription = { platform: 'android' as const, token, endpoint: `fcm:${token}` };
  const payload = { title: 'Demo', body: 'Local notification', url: '/lab/push' as const, tag: 'exhibition' };
  await send(subscription, payload);
  await sendAndroidPushNotification(subscription, payload);
  assert.equal(requests, 0);
});
