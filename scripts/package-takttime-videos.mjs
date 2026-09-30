import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
const renderRoot = resolve('tmp/takttime-conveyors');
const outputRoot = resolve('public/videos/takttime/web-v1');
const allNames = ['foaming', 'assembly-1', 'assembly-2'];
const names = process.argv.length > 2 ? process.argv.slice(2) : allNames;
if (names.some(name => !allNames.includes(name))) throw new Error('Unknown conveyor line');
mkdirSync(outputRoot, { recursive: true });

function run(args) {
  const result = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
    encoding: 'utf8', windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || `FFmpeg exited ${result.status}`);
}

async function meanDifference(a, b) {
  const [left, right] = await Promise.all([a, b].map(path => sharp(path).removeAlpha().raw().toBuffer()));
  if (left.length !== right.length) throw new Error('Frame dimensions differ');
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference += Math.abs(left[i] - right[i]);
  return difference / left.length;
}

const report = [];
for (const name of names) {
  const source = join(renderRoot, name);
  for (let frame = 1; frame <= 145; frame++) {
    if (!existsSync(join(source, `frame-${String(frame).padStart(4, '0')}.png`))) {
      throw new Error(`${name}: Missing rendered frame ${frame}`);
    }
  }
  // 145번 프레임은 다음 주기의 첫 화면이다. 같은 위치인지 검사한 뒤 영상에서는 제외한다.
  const cyclicMatchError = await meanDifference(join(source, 'frame-0001.png'), join(source, 'frame-0145.png'));
  const typicalFrameChange = await meanDifference(join(source, 'frame-0001.png'), join(source, 'frame-0002.png'));
  const seamFrameChange = await meanDifference(join(source, 'frame-0144.png'), join(source, 'frame-0001.png'));
  if (cyclicMatchError > 1.5) throw new Error(`${name}: Cycle boundary mismatch (${cyclicMatchError.toFixed(3)})`);
  if (seamFrameChange > typicalFrameChange * 1.5 + .5) throw new Error(`${name}: Unexpected seam motion`);

  const cycle = join(source, 'cycle.mp4');
  run(['-framerate', '24', '-start_number', '1', '-i', join(source, 'frame-%04d.png'),
    '-frames:v', '144', '-c:v', 'libx264', '-preset', 'slow', '-crf', '23',
    '-maxrate', '1800k', '-bufsize', '3600k', '-pix_fmt', 'yuv420p',
    '-profile:v', 'main', '-level:v', '3.1', '-g', '48', '-keyint_min', '48',
    '-sc_threshold', '0', '-an', '-map_metadata', '-1', '-movflags', '+faststart', cycle]);
  // 순방향 주기를 정확히 열 번 이어 60초 파일을 만든다. 역재생이나 전환 효과는 넣지 않는다.
  run(['-stream_loop', '9', '-i', cycle, '-t', '60', '-map', '0:v:0', '-c', 'copy',
    '-an', '-map_metadata', '-1', '-movflags', '+faststart', join(outputRoot, `${name}.mp4`)]);
  run(['-i', join(source, 'frame-0001.png'), '-frames:v', '1', '-q:v', '3', join(outputRoot, `${name}.jpg`)]);
  report.push({ name, width: 1280, height: 720, fps: 24, duration: 60, cycleSeconds: 6,
    cyclicMatchError, typicalFrameChange, seamFrameChange });
  console.log(`Packaged ${name}: 720p, 60 seconds, cyclic error ${cyclicMatchError.toFixed(4)}`);
}
writeFileSync(join(renderRoot, names.length === 3 ? 'loop-validation.json' : `loop-validation-${names.join('-')}.json`), `${JSON.stringify(report, null, 2)}\n`);
