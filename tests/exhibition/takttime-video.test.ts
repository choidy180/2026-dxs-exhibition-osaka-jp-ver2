import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { TAKTTIME_CAMERA_VIDEOS } from '../../constants/takttime-camera-videos';

function inspectVideo(file: Buffer) {
  let duration = 0;
  let width = 0;
  let height = 0;
  let frames = 0;
  const codecs: string[] = [];
  const boxes: string[] = [];
  const handlers: string[] = [];
  function walk(start: number, end: number, depth = 0) {
    for (let offset = start; offset + 8 <= end;) {
      const size = file.readUInt32BE(offset);
      const type = file.toString('ascii', offset + 4, offset + 8);
      assert.ok(size >= 8 && offset + size <= end, `Invalid MP4 box: ${type}`);
      const payload = offset + 8;
      if (depth === 0) boxes.push(type);
      if (['moov', 'trak', 'mdia', 'minf', 'stbl'].includes(type)) walk(payload, offset + size, depth + 1);
      if (type === 'mvhd') {
        const version = file[payload];
        const scale = payload + (version === 1 ? 20 : 12);
        const length = version === 1 ? Number(file.readBigUInt64BE(scale + 4)) : file.readUInt32BE(scale + 4);
        duration = length / file.readUInt32BE(scale);
      }
      if (type === 'tkhd') {
        width = Math.max(width, file.readUInt32BE(offset + size - 8) >>> 16);
        height = Math.max(height, file.readUInt32BE(offset + size - 4) >>> 16);
      }
      if (type === 'hdlr') handlers.push(file.toString('ascii', payload + 8, payload + 12));
      if (type === 'stsd') codecs.push(file.toString('ascii', payload + 12, payload + 16));
      if (type === 'stsz') frames += file.readUInt32BE(payload + 8);
      offset += size;
    }
  }
  walk(0, file.length);
  return { duration, width, height, frames, codecs, boxes, handlers };
}

test('takt cameras have distinct silent videos with matching posters and the current clip lengths', () => {
  const sources = Object.values(TAKTTIME_CAMERA_VIDEOS);
  assert.equal(sources.length, 3);
  assert.equal(new Set(sources).size, 3);
  const hashes = new Set<string>();
  for (const [line, src] of Object.entries(TAKTTIME_CAMERA_VIDEOS)) {
    const bytes = readFileSync(join('public', src));
    const info = inspectVideo(bytes);
    assert.equal(info.duration, line === 'C' ? 240 : 30, `${src}: current clip duration`);
    assert.equal(info.width, 640, src);
    assert.equal(info.height, 480, src);
    assert.equal(info.frames, line === 'C' ? 4800 : 900, `${src}: complete video frames`);
    assert.deepEqual(info.codecs, ['avc1'], `${src}: browser-compatible H.264`);
    assert.deepEqual(info.handlers, ['vide'], `${src}: no audio track`);
    assert.ok(info.boxes.indexOf('moov') < info.boxes.indexOf('mdat'), `${src}: fast-start MP4`);
    assert.ok(bytes.length < 16_000_000, `${src}: bounded network and decode cost`);
    assert.ok(existsSync(join('public', src.replace(/\.mp4$/, '.jpg'))), `${src}: matching first-frame poster`);
    hashes.add(createHash('sha256').update(bytes).digest('hex'));
  }
  assert.equal(hashes.size, 3, 'All three cameras must show distinct scenes');
});
