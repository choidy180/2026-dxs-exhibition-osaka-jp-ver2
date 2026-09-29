import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import test from 'node:test';
import { MATERIAL_CAMERA_VIDEOS } from '../../constants/material-camera-videos';

function readVideoInfo(file: Buffer) {
  let duration = 0;
  let width = 0;
  let height = 0;
  const topLevel: string[] = [];
  const codecs: string[] = [];
  function readAtoms(start: number, end: number, depth = 0) {
    for (let offset = start; offset + 8 <= end;) {
      const size = file.readUInt32BE(offset);
      const type = file.toString('ascii', offset + 4, offset + 8);
      assert.ok(size >= 8 && offset + size <= end, `Invalid MP4 atom: ${type}`);
      const payload = offset + 8;
      if (depth === 0) topLevel.push(type);
      if (['moov', 'trak', 'mdia', 'minf', 'stbl'].includes(type)) readAtoms(payload, offset + size, depth + 1);
      if (type === 'mvhd') {
        const version = file[payload];
        const scaleOffset = payload + (version === 1 ? 20 : 12);
        const length = version === 1 ? Number(file.readBigUInt64BE(scaleOffset + 4)) : file.readUInt32BE(scaleOffset + 4);
        duration = length / file.readUInt32BE(scaleOffset);
      }
      if (type === 'tkhd') {
        width = Math.max(width, file.readUInt32BE(offset + size - 8) >>> 16);
        height = Math.max(height, file.readUInt32BE(offset + size - 4) >>> 16);
      }
      if (type === 'stsd') codecs.push(file.toString('ascii', payload + 12, payload + 16));
      offset += size;
    }
  }
  readAtoms(0, file.length);
  return { duration, width, height, codecs, topLevel };
}

test('all 11 material clips retain their duration with a bounded delivery bitrate and fast-start H.264', () => {
  assert.equal(MATERIAL_CAMERA_VIDEOS.length, 11);
  assert.equal(new Set(MATERIAL_CAMERA_VIDEOS).size, 11);
  let bytes = 0;
  for (const src of MATERIAL_CAMERA_VIDEOS) {
    const filePath = join('public', src);
    const optimized = readFileSync(filePath);
    const info = readVideoInfo(optimized);
    const originalPath = join('public/videos/material-inbound', basename(src));
    const original = readVideoInfo(readFileSync(originalPath));
    assert.ok(Math.abs(info.duration - original.duration) < 0.1, `${src}: preserve the complete clip`);
    assert.deepEqual(info.codecs, ['avc1'], `${src}: H.264 video without unused audio`);
    assert.ok(info.width <= 1280 && info.height <= 720 && info.width > 0 && info.height > 0, src);
    assert.ok(info.topLevel.indexOf('moov') >= 0 && info.topLevel.indexOf('moov') < info.topLevel.indexOf('mdat'), `${src}: metadata must precede video data`);
    assert.ok(optimized.length * 8 / info.duration < 1_300_000, `${src}: delivery bitrate budget`);
    assert.ok(optimized.length < statSync(originalPath).size / 4, `${src}: reduce network usage`);
    bytes += optimized.length;
  }
  assert.ok(bytes < 18_000_000, 'The entire rotating playlist must fit within 18 MB.');
});
