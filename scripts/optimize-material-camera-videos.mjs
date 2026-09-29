import { mkdirSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';

// 원본은 유지하고 버전이 붙은 URL로 배포해 이전 고용량 캐시와 섞이지 않게 한다.
const sourceDir = resolve('public/videos/material-inbound');
const outputDir = join(sourceDir, 'web-v1');
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
const files = readdirSync(sourceDir).filter(name => /^\d{2}_.+\.mp4$/.test(name)).sort();
if (files.length !== 11) throw new Error('Expected all 11 material camera source videos.');
mkdirSync(outputDir, { recursive: true });

for (const file of files) {
  const result = spawnSync(ffmpeg, [
    '-hide_banner', '-loglevel', 'error', '-y', '-i', join(sourceDir, file),
    '-map', '0:v:0', '-vf', 'scale=1280:-2:flags=lanczos,fps=24',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '26',
    '-maxrate', '1200k', '-bufsize', '2400k',
    '-pix_fmt', 'yuv420p', '-profile:v', 'main', '-level:v', '3.1', '-g', '48',
    '-an', '-map_metadata', '-1', '-movflags', '+faststart', join(outputDir, file),
  ], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  console.log(`Optimized ${file}`);
}
