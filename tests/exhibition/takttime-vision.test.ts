import assert from 'node:assert/strict';
import test from 'node:test';
import { TAKTTIME_TRACKING } from '../../data/takttime-tracking';
import { TAKTTIME_PLAYBACK_RATE } from '../../constants/takttime-camera-videos';
import type { VisionClock } from '../../types/takttime-vision';
import { advanceVisionClock, getTrackingFrame, projectCoverBox, projectCoverPoint } from '../../utils/takttime-vision';

test('accelerated media produces exactly one graph event for each part crossing, including native loops', () => {
  let clock: VisionClock | null = null;
  const events: { frame: number; kind: number; sequence: number }[] = [];
  // 60초 타임라인을 2회 반복: 미디어 120초, 실제 재생 80초.
  for (let frame = 0; frame <= 120 * 24; frame++) {
    const next = advanceVisionClock(clock, (frame / 24) % 60, 60, 2);
    clock = next.clock;
    if (next.recognition) events.push({ frame, ...next.recognition });
  }
  assert.equal(TAKTTIME_PLAYBACK_RATE, 1.5);
  assert.equal(events.length, 60);
  assert.deepEqual(events.slice(0, 3).map(event => event.kind), [2, 1, 0]);
  events.forEach((event, index) => {
    assert.equal(event.frame / 24 / TAKTTIME_PLAYBACK_RATE, (index + 1) * 2 / TAKTTIME_PLAYBACK_RATE);
    assert.equal(event.sequence, index + 1);
  });
});

test('paused or duplicated frames never create chart points and explicit seeking does not create a burst', () => {
  const start = advanceVisionClock(null, 1.95, 60, 2).clock;
  for (let index = 0; index < 100; index++) assert.equal(advanceVisionClock(start, 1.95, 60, 2).recognition, null);
  const crossing = advanceVisionClock(start, 2, 60, 2);
  assert.equal(crossing.recognition?.sequence, 1);
  assert.equal(advanceVisionClock(crossing.clock, 2, 60, 2).recognition, null);
  assert.equal(advanceVisionClock(crossing.clock, 32, 60, 2).recognition, null);
  assert.equal(advanceVisionClock(crossing.clock, 0, 60, 2).recognition, null);
});

test('rendered part tracking and detection gate agree at each crossing for all three conveyor scenes', () => {
  for (const timeline of Object.values(TAKTTIME_TRACKING)) {
    assert.equal(timeline.frames.length, 145);
    assert.equal(timeline.partIntervalSeconds, 2);
    for (let seconds = 0; seconds <= 60; seconds += 2) {
      const part = getTrackingFrame(timeline, seconds).find(item => Math.abs(item.worldX) < .00001);
      assert.ok(part, `Missing center part at ${seconds}s`);
      assert.equal(part.kind, ((-seconds / 2 % 3) + 3) % 3);
    }
    const before = getTrackingFrame(timeline, 6 - 1 / 24).find(part => part.id === -3)!;
    const after = getTrackingFrame(timeline, 6).find(part => part.id === 0)!;
    assert.ok(Math.abs(before.x - after.x) < .02, 'Tracking must remain continuous across the 6s media cycle');
    for (const frame of timeline.frames) {
      for (const part of frame) {
        assert.ok(part.width > 0 && part.height > 0);
        assert.ok(Object.values(part).every(Number.isFinite));
      }
    }
  }
});

test('bounding boxes follow object-fit cover at narrow and wide viewport sizes', () => {
  const source = { width: 1280, height: 720 };
  for (const viewport of [{ width: 400, height: 240 }, { width: 570, height: 190 }, { width: 340, height: 290 }]) {
    assert.deepEqual(projectCoverPoint(.5, .5, viewport, source), { x: viewport.width / 2, y: viewport.height / 2 });
    const box = projectCoverBox({ id: 0, kind: 0, worldX: 0, x: -.2, y: -.2, width: 1.4, height: 1.4 }, viewport, source);
    assert.deepEqual(box, { x: 0, y: 0, ...viewport });
    assert.equal(projectCoverBox({ id: 0, kind: 0, worldX: 0, x: 2, y: 2, width: .2, height: .2 }, viewport, source), null);
  }
});
