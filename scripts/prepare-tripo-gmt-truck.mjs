/** 원본 GLB 지오메트리·재질을 보존하고 방향·GMT 로고·텍스처 크기만 후처리한다. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
import { color } from '../styles/design-tokens.ts';

const HELP = `Usage:
  node scripts/prepare-tripo-gmt-truck.mjs INPUT.glb OUTPUT.glb [options]
  node scripts/prepare-tripo-gmt-truck.mjs INPUT.glb --inspect [orientation options]

Options:
  --yaw-deg NUMBER              Y rotation; original truck front must become +Z (default 0)
  --pitch-deg NUMBER            X rotation (default 0)
  --roll-deg NUMBER             Z rotation (default 0)
  --length NUMBER              Normalized vehicle length in metres (default 10.8)
  --logo-width-ratio NUMBER     Logo width / vehicle length (default 0.38)
  --logo-height-ratio NUMBER    Logo centre Y / vehicle height (default 0.65)
  --logo-z-ratio NUMBER         Logo centre Z / vehicle length (default -0.12)
  --logo-offset NUMBER          Side offset in metres from raycast surface (default 0.004)
  --logo-grid-columns NUMBER    Surface projection grid columns (default 32)
  --logo-grid-rows NUMBER       Surface projection grid rows (default 8)
  --logo PATH                   Logo PNG (default public/logo/gmt_logo_copy.png)
  --max-texture-size NUMBER     Resize original JPG/PNG to fit 1024/2048; 0 preserves bytes
  --inspect                     Print bounds, compression and image dimensions without writing

Input is never overwritten. No network requests or new dependencies are used.
The output retains original mesh data, materials and compression extensions.
`;

const defaults = {
  'yaw-deg': 0, 'pitch-deg': 0, 'roll-deg': 0, length: 10.8,
  'logo-width-ratio': .38, 'logo-height-ratio': .65, 'logo-z-ratio': -.12,
  'logo-offset': .004, 'logo-grid-columns': 32, 'logo-grid-rows': 8, 'max-texture-size': 0,
};
const options = { ...defaults, inspect: false, logo: fileURLToPath(new URL('../public/logo/gmt_logo_copy.png', import.meta.url)) };
const positional = [];
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index += 1) {
  const item = args[index];
  if (item === '--help' || item === '-h') { console.log(HELP); process.exit(0); }
  if (item === '--inspect') { options.inspect = true; continue; }
  if (!item.startsWith('--')) { positional.push(item); continue; }
  const key = item.slice(2);
  if (!(key in defaults) && key !== 'logo') throw new Error(`Unknown option: ${item}`);
  const value = args[++index];
  if (value === undefined) throw new Error(`Missing value: ${item}`);
  options[key] = key === 'logo' ? resolve(value) : Number(value);
  if (key !== 'logo' && !Number.isFinite(options[key])) throw new Error(`Invalid number: ${item}`);
}
if (!positional[0] || (!options.inspect && !positional[1])) { console.log(HELP); process.exit(1); }
if (positional.length > 2) throw new Error('Expected one input and one output path.');
const inputPath = resolve(positional[0]);
const outputPath = positional[1] ? resolve(positional[1]) : null;
if (outputPath && inputPath.toLowerCase() === outputPath.toLowerCase()) throw new Error('The source GLB must not be overwritten.');
if (options.length <= 0 || options['logo-width-ratio'] <= 0 || options['logo-offset'] < 0) throw new Error('Length and logo width must be positive; offset must be non-negative.');
for (const key of ['logo-grid-columns', 'logo-grid-rows']) {
  if (!Number.isInteger(options[key]) || options[key] < 1 || options[key] > 128) throw new Error(`${key} must be an integer from 1 to 128.`);
}
if (![0, 1024, 2048].includes(options['max-texture-size'])) throw new Error('--max-texture-size must be 0, 1024 or 2048.');

const source = await readFile(inputPath);
if (source.length < 20 || source.readUInt32LE(0) !== 0x46546c67 || source.readUInt32LE(4) !== 2 || source.readUInt32LE(8) !== source.length) throw new Error('Input is not a complete GLB 2.0 file.');
let document;
let sourceBinary;
for (let offset = 12; offset < source.length;) {
  const length = source.readUInt32LE(offset);
  const type = source.readUInt32LE(offset + 4);
  const data = source.subarray(offset + 8, offset + 8 + length);
  if (data.length !== length) throw new Error('Truncated GLB chunk.');
  if (type === 0x4e4f534a) document = JSON.parse(data.toString('utf8'));
  if (type === 0x004e4942) sourceBinary = data;
  offset += 8 + length;
}
if (!document || !sourceBinary) throw new Error('GLB must contain JSON and BIN chunks.');
const originalViewCount = document.bufferViews?.length ?? 0;
const originalMeshCount = document.meshes?.length ?? 0;
const originalMaterialCount = document.materials?.length ?? 0;
const originalNodeCount = document.nodes?.length ?? 0;
const buffers = document.buffers.map((buffer, index) => {
  if (index === 0 && !buffer.uri) return sourceBinary.subarray(0, buffer.byteLength);
  if (buffer.uri?.startsWith('data:')) return Buffer.from(buffer.uri.slice(buffer.uri.indexOf(',') + 1), 'base64');
  if (buffer.extensions?.EXT_meshopt_compression?.fallback) return null;
  throw new Error(`Buffer ${index} is external; export a self-contained GLB first.`);
});

function bufferSlice(bufferIndex, offset, length) {
  const buffer = buffers[bufferIndex];
  if (!buffer || offset < 0 || length < 0 || offset + length > buffer.length) throw new Error(`Invalid embedded buffer range: ${bufferIndex}:${offset}+${length}`);
  return buffer.subarray(offset, offset + length);
}

const viewCache = new Map();
async function readView(index) {
  if (!viewCache.has(index)) {
    viewCache.set(index, (async () => {
      const view = document.bufferViews[index];
      const ext = view.extensions?.EXT_meshopt_compression;
      if (ext) {
        const bytes = bufferSlice(ext.buffer, ext.byteOffset ?? 0, ext.byteLength);
        return MeshoptDecoder.decodeGltfBufferAsync(ext.count, ext.byteStride, bytes, ext.mode, ext.filter);
      }
      return bufferSlice(view.buffer, view.byteOffset ?? 0, view.byteLength);
    })());
  }
  return viewCache.get(index);
}

const componentInfo = {
  5120: { size: 1, get: 'getInt8', max: 127 }, 5121: { size: 1, get: 'getUint8', max: 255 },
  5122: { size: 2, get: 'getInt16', max: 32767 }, 5123: { size: 2, get: 'getUint16', max: 65535 },
  5125: { size: 4, get: 'getUint32', max: 4294967295 }, 5126: { size: 4, get: 'getFloat32' },
};
const elementSize = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

function getComponent(data, offset, type, normalized = false) {
  const info = componentInfo[type];
  if (!info) throw new Error(`Unsupported accessor component type: ${type}`);
  const value = data[info.get](offset, true);
  return normalized && info.max ? Math.max(value / info.max, -1) : value;
}

async function readAccessor(index) {
  const accessor = document.accessors[index];
  const components = elementSize[accessor.type];
  const bytesPerComponent = componentInfo[accessor.componentType]?.size;
  if (!components || !bytesPerComponent) throw new Error(`Unsupported accessor ${index}.`);
  const array = new Float64Array(accessor.count * components);
  if (accessor.bufferView !== undefined) {
    const bytes = await readView(accessor.bufferView);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const stride = document.bufferViews[accessor.bufferView].byteStride ?? bytesPerComponent * components;
    for (let element = 0; element < accessor.count; element += 1) {
      for (let component = 0; component < components; component += 1) {
        array[element * components + component] = getComponent(view, (accessor.byteOffset ?? 0) + element * stride + component * bytesPerComponent, accessor.componentType, accessor.normalized);
      }
    }
  }
  if (accessor.sparse) {
    const { count, indices, values } = accessor.sparse;
    const indexBytes = await readView(indices.bufferView);
    const valueBytes = await readView(values.bufferView);
    const indexView = new DataView(indexBytes.buffer, indexBytes.byteOffset, indexBytes.byteLength);
    const valueView = new DataView(valueBytes.buffer, valueBytes.byteOffset, valueBytes.byteLength);
    for (let sparseIndex = 0; sparseIndex < count; sparseIndex += 1) {
      const element = getComponent(indexView, (indices.byteOffset ?? 0) + sparseIndex * componentInfo[indices.componentType].size, indices.componentType);
      for (let component = 0; component < components; component += 1) {
        array[element * components + component] = getComponent(valueView, (values.byteOffset ?? 0) + (sparseIndex * components + component) * bytesPerComponent, accessor.componentType, accessor.normalized);
      }
    }
  }
  return array;
}

let dracoModule;
async function decodeDraco(primitive) {
  if (!dracoModule) dracoModule = import('draco3d').then(module => module.default.createDecoderModule({}));
  const D = await dracoModule;
  const ext = primitive.extensions.KHR_draco_mesh_compression;
  const bytes = await readView(ext.bufferView);
  const decoder = new D.Decoder();
  const buffer = new D.DecoderBuffer();
  const mesh = new D.Mesh();
  const copy = (count, Type, read) => {
    const pointer = D._malloc(count * 4);
    try {
      if (!read(pointer)) throw new Error('Draco attribute extraction failed.');
      return new Type(D.HEAPU8.buffer, pointer, count).slice();
    } finally { D._free(pointer); }
  };
  try {
    buffer.Init(new Int8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength), bytes.byteLength);
    const status = decoder.DecodeBufferToMesh(buffer, mesh);
    if (!status.ok() || !mesh.ptr) throw new Error(status.error_msg());
    const attribute = decoder.GetAttributeByUniqueId(mesh, ext.attributes.POSITION);
    if (!attribute?.ptr || attribute.num_components() !== 3) throw new Error('Draco primitive lacks POSITION.');
    const count = mesh.num_points() * 3;
    const positions = copy(count, Float32Array, pointer => decoder.GetAttributeDataArrayForAllPoints(mesh, attribute, D.DT_FLOAT32, count * 4, pointer));
    const accessor = document.accessors[primitive.attributes.POSITION];
    const normalization = accessor.normalized && componentInfo[accessor.componentType]?.max;
    if (normalization) for (let index = 0; index < positions.length; index += 1) positions[index] = Math.max(positions[index] / normalization, -1);
    const indexCount = mesh.num_faces() * 3;
    const indices = copy(indexCount, Uint32Array, pointer => decoder.GetTrianglesUInt32Array(mesh, indexCount * 4, pointer));
    return { positions, indices };
  } finally { D.destroy(mesh); D.destroy(buffer); D.destroy(decoder); }
}

const rotation = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(
  THREE.MathUtils.degToRad(options['pitch-deg']), THREE.MathUtils.degToRad(options['yaw-deg']), THREE.MathUtils.degToRad(options['roll-deg']), 'XYZ',
));
const raycastGroup = new THREE.Group();
const raycastMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
let sourceTriangles = 0;
async function visitNode(index, parentMatrix, ancestors = new Set()) {
  if (ancestors.has(index)) throw new Error('Node cycle detected.');
  const node = document.nodes[index];
  const local = node.matrix ? new THREE.Matrix4().fromArray(node.matrix) : new THREE.Matrix4().compose(
    new THREE.Vector3(...(node.translation ?? [0, 0, 0])), new THREE.Quaternion(...(node.rotation ?? [0, 0, 0, 1])), new THREE.Vector3(...(node.scale ?? [1, 1, 1])),
  );
  const world = parentMatrix.clone().multiply(local);
  if (node.mesh !== undefined) {
    if (node.extensions?.EXT_mesh_gpu_instancing) throw new Error('Instanced mesh input requires expansion before logo projection.');
    for (const primitive of document.meshes[node.mesh].primitives) {
      if ((primitive.mode ?? 4) !== 4 || primitive.attributes?.POSITION === undefined) continue;
      const data = primitive.extensions?.KHR_draco_mesh_compression ? await decodeDraco(primitive) : {
        positions: await readAccessor(primitive.attributes.POSITION),
        indices: primitive.indices !== undefined ? await readAccessor(primitive.indices) : null,
      };
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
      if (data.indices) geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(data.indices), 1));
      geometry.applyMatrix4(world);
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      sourceTriangles += (geometry.index?.count ?? geometry.getAttribute('position').count) / 3;
      raycastGroup.add(new THREE.Mesh(geometry, raycastMaterial));
    }
  }
  const nextAncestors = new Set(ancestors).add(index);
  for (const child of node.children ?? []) await visitNode(child, world, nextAncestors);
}
const sceneIndex = document.scene ?? 0;
const scene = document.scenes?.[sceneIndex];
if (!scene?.nodes?.length) throw new Error('Default scene contains no root nodes.');
for (const index of scene.nodes) await visitNode(index, rotation);
if (!raycastGroup.children.length) throw new Error('No triangle geometry is available for logo projection.');
raycastGroup.updateMatrixWorld(true);
const rotatedBounds = new THREE.Box3().setFromObject(raycastGroup);
const rotatedSize = rotatedBounds.getSize(new THREE.Vector3());
const rotatedCenter = rotatedBounds.getCenter(new THREE.Vector3());
if (!Number.isFinite(rotatedSize.z) || rotatedSize.z <= 0) throw new Error('Model length is not finite and positive.');
const normalization = new THREE.Matrix4().makeScale(...Array(3).fill(options.length / rotatedSize.z))
  .multiply(new THREE.Matrix4().makeTranslation(-rotatedCenter.x, -rotatedBounds.min.y, -rotatedCenter.z));
for (const mesh of raycastGroup.children) mesh.geometry.applyMatrix4(normalization);
raycastGroup.updateMatrixWorld(true);
const bounds = new THREE.Box3().setFromObject(raycastGroup);
const size = bounds.getSize(new THREE.Vector3());

const imageReports = [];
const imageOverrides = new Map();
for (let index = 0; index < (document.images?.length ?? 0); index += 1) {
  const image = document.images[index];
  if (image.bufferView === undefined) throw new Error(`Image ${index} is not embedded; export a self-contained GLB first.`);
  const bytes = await readView(image.bufferView);
  const metadata = await sharp(bytes).metadata();
  const report = { image: index, mimeType: image.mimeType, width: metadata.width, height: metadata.height, beforeBytes: bytes.length };
  const maxSize = options['max-texture-size'];
  if (!options.inspect && maxSize && Math.max(metadata.width ?? 0, metadata.height ?? 0) > maxSize && ['image/png', 'image/jpeg'].includes(image.mimeType)) {
    const pipeline = sharp(bytes).resize(maxSize, maxSize, { fit: 'inside', withoutEnlargement: true });
    const optimized = await (image.mimeType === 'image/png' ? pipeline.png({ compressionLevel: 9, adaptiveFiltering: true }) : pipeline.jpeg({ quality: 92, chromaSubsampling: '4:4:4' })).toBuffer();
    imageOverrides.set(image.bufferView, optimized);
    report.afterBytes = optimized.length;
  } else report.afterBytes = bytes.length;
  imageReports.push(report);
}

const summary = {
  input: inputPath, sourceBytes: source.length, sourceTriangles, originalMeshCount, originalMaterialCount,
  extensions: document.extensionsUsed ?? [], sourceRotatedBounds: { min: rotatedBounds.min.toArray(), max: rotatedBounds.max.toArray() },
  outputBounds: { min: bounds.min.toArray(), max: bounds.max.toArray(), size: size.toArray() }, images: imageReports,
};
if (options.inspect) { console.log(JSON.stringify(summary, null, 2)); process.exit(0); }

// 기존 압축 payload와 참조를 유지하며 이미지가 줄어든 만큼 BIN을 다시 조립한다.
const binaryParts = [];
let binarySize = 0;
function appendBinary(bytes) {
  const padding = (4 - binarySize % 4) % 4;
  if (padding) { binaryParts.push(Buffer.alloc(padding)); binarySize += padding; }
  const offset = binarySize;
  binaryParts.push(Buffer.from(bytes));
  binarySize += bytes.length;
  return offset;
}
for (let index = 0; index < originalViewCount; index += 1) {
  const view = document.bufferViews[index];
  const ext = view.extensions?.EXT_meshopt_compression;
  if (ext) {
    const compressed = bufferSlice(ext.buffer, ext.byteOffset ?? 0, ext.byteLength);
    const offset = appendBinary(compressed);
    ext.buffer = 0;
    ext.byteOffset = offset;
  }
  if (buffers[view.buffer]) {
    const bytes = imageOverrides.get(index) ?? bufferSlice(view.buffer, view.byteOffset ?? 0, view.byteLength);
    view.byteOffset = appendBinary(bytes);
    view.byteLength = bytes.length;
    view.buffer = 0;
  } else if (!ext) throw new Error(`Missing data for bufferView ${index}.`);
}

function appendAccessor(array, type, target, includeBounds = false) {
  const bytes = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
  const view = document.bufferViews.length;
  document.bufferViews.push({ buffer: 0, byteOffset: appendBinary(bytes), byteLength: bytes.length, target });
  const components = elementSize[type];
  const accessor = { bufferView: view, componentType: array instanceof Float32Array ? 5126 : 5123, count: array.length / components, type };
  if (includeBounds) {
    accessor.min = Array(components).fill(Infinity);
    accessor.max = Array(components).fill(-Infinity);
    for (let index = 0; index < array.length; index += 1) {
      const component = index % components;
      accessor.min[component] = Math.min(accessor.min[component], array[index]);
      accessor.max[component] = Math.max(accessor.max[component], array[index]);
    }
  }
  const index = document.accessors.length;
  document.accessors.push(accessor);
  return index;
}

const logoBytes = await readFile(options.logo);
const logoMeta = await sharp(logoBytes).metadata();
if (logoMeta.format !== 'png' || !logoMeta.width || !logoMeta.height) throw new Error('--logo must point to a valid PNG.');
const logoView = document.bufferViews.length;
document.bufferViews.push({ buffer: 0, byteOffset: appendBinary(logoBytes), byteLength: logoBytes.length });
document.images ??= [];
document.textures ??= [];
document.samplers ??= [];
document.materials ??= [];
const imageIndex = document.images.length;
document.images.push({ name: 'GMT loading screen logo', bufferView: logoView, mimeType: 'image/png' });
const samplerIndex = document.samplers.length;
document.samplers.push({ magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 });
const textureIndex = document.textures.length;
document.textures.push({ source: imageIndex, sampler: samplerIndex });
const materialIndex = document.materials.length;
document.materials.push({ name: 'GMT original loading logo', alphaMode: 'MASK', alphaCutoff: .12, pbrMetallicRoughness: { baseColorFactor: [...new THREE.Color(color.surface).toArray(), 1], baseColorTexture: { index: textureIndex }, metallicFactor: 0, roughnessFactor: .58 } });

const columns = options['logo-grid-columns'];
const rows = options['logo-grid-rows'];
const logoWidth = size.z * options['logo-width-ratio'];
const logoHeight = logoWidth * logoMeta.height / logoMeta.width;
const centerY = size.y * options['logo-height-ratio'];
const centerZ = size.z * options['logo-z-ratio'];
const raycaster = new THREE.Raycaster();
const logoMeshes = [];
for (const side of [1, -1]) {
  const positions = [];
  const uvs = [];
  const indices = [];
  const projectedXs = [];
  for (let row = 0; row <= rows; row += 1) {
    for (let column = 0; column <= columns; column += 1) {
      const y = centerY - logoHeight / 2 + row / rows * logoHeight;
      const z = centerZ + side * logoWidth / 2 - side * column / columns * logoWidth;
      raycaster.set(new THREE.Vector3(side * (size.x + size.z), y, z), new THREE.Vector3(-side, 0, 0));
      const hit = raycaster.intersectObject(raycastGroup, true)[0];
      if (!hit) throw new Error(`Logo projection missed the truck on side ${side}, row ${row}, column ${column}. Adjust --logo-width-ratio/--logo-height-ratio/--logo-z-ratio.`);
      positions.push(hit.point.x + side * options['logo-offset'], y, z);
      projectedXs.push(hit.point.x);
      // GLB 내부 PNG의 위쪽은 v=0이며 양 측면에서 글자가 정방향으로 읽힌다.
      uvs.push(column / columns, 1 - row / rows);
    }
  }
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const a = row * (columns + 1) + column;
      const b = a + 1;
      const d = a + columns + 1;
      const c = d + 1;
      indices.push(a, b, c, a, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const primitive = {
    attributes: {
      POSITION: appendAccessor(new Float32Array(positions), 'VEC3', 34962, true),
      NORMAL: appendAccessor(geometry.getAttribute('normal').array, 'VEC3', 34962),
      TEXCOORD_0: appendAccessor(new Float32Array(uvs), 'VEC2', 34962),
    },
    indices: appendAccessor(new Uint16Array(indices), 'SCALAR', 34963), material: materialIndex, mode: 4,
  };
  const meshIndex = document.meshes.length;
  document.meshes.push({ name: side > 0 ? 'GMT container right side decal' : 'GMT container left side decal', primitives: [primitive] });
  const nodeIndex = document.nodes.length;
  document.nodes.push({ mesh: meshIndex, name: side > 0 ? 'GMT right logo' : 'GMT left logo' });
  logoMeshes.push({ node: nodeIndex, side, surfaceX: { min: Math.min(...projectedXs), max: Math.max(...projectedXs) } });
  geometry.dispose();
}

// 원래 노드/애니메이션은 그대로 두고 단일 부모로 방향과 균일 축척만 적용한다.
const wrapperIndex = document.nodes.length;
document.nodes.push({ name: 'GMT normalized Tripo original', children: [...scene.nodes], matrix: normalization.clone().multiply(rotation).toArray() });
scene.nodes = [wrapperIndex, ...logoMeshes.map(item => item.node)];
scene.extras = { ...scene.extras, logoEmbedded: true, sourceProvider: 'Tripo', front: '+Z', units: 'metres' };
document.asset.extras = { ...document.asset.extras, gmtPostprocessing: { script: 'scripts/prepare-tripo-gmt-truck.mjs', sourceSha256: createHash('sha256').update(source).digest('hex'), originalMeshCount, originalMaterialCount, originalNodeCount, orientationDegrees: { x: options['pitch-deg'], y: options['yaw-deg'], z: options['roll-deg'] }, sourceGeometryPreserved: true } };
document.buffers[0] = { ...document.buffers[0], byteLength: binarySize };
delete document.buffers[0].uri;
const json = Buffer.from(JSON.stringify(document));
const jsonChunk = Buffer.alloc(Math.ceil(json.length / 4) * 4, 0x20);
json.copy(jsonChunk);
const binaryPadding = Buffer.alloc((4 - binarySize % 4) % 4);
const binaryChunk = Buffer.concat([...binaryParts, binaryPadding]);
const output = Buffer.alloc(28 + jsonChunk.length + binaryChunk.length);
output.writeUInt32LE(0x46546c67, 0);
output.writeUInt32LE(2, 4);
output.writeUInt32LE(output.length, 8);
output.writeUInt32LE(jsonChunk.length, 12);
output.writeUInt32LE(0x4e4f534a, 16);
jsonChunk.copy(output, 20);
const binHeader = 20 + jsonChunk.length;
output.writeUInt32LE(binaryChunk.length, binHeader);
output.writeUInt32LE(0x004e4942, binHeader + 4);
binaryChunk.copy(output, binHeader + 8);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, output);
for (const mesh of raycastGroup.children) mesh.geometry.dispose();
raycastMaterial.dispose();
console.log(JSON.stringify({ ...summary, output: outputPath, outputBytes: output.length, logoMeshes, logoTriangles: columns * rows * 4, outputSha256: createHash('sha256').update(output).digest('hex') }, null, 2));
