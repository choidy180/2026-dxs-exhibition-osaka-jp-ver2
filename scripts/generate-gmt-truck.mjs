/** 프로젝트 토큰과 기존 GMT 로고로 재생성하는 자체 제작 운송 차량 자산. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { color, mapPalette, tone } from '../styles/design-tokens.ts';

const root = new URL('../', import.meta.url);
const output = new URL('public/models/transport/gmt-red-white-container-truck.glb', root);
const logoPng = await readFile(new URL('public/logo/gmt_logo_copy.png', root));
const logoAspect = logoPng.readUInt32BE(16) / logoPng.readUInt32BE(20);
const parts = new Map();
const materials = new Map();

function material(name, tint, options = {}) {
  const result = new THREE.MeshStandardMaterial({ name, color: tint, roughness: .55, metalness: .1, ...options });
  materials.set(name, result);
  parts.set(name, []);
  return name;
}

const red = material('GMT red cab paint', color.brand, { metalness: .32, roughness: .29 });
const redDark = material('Cab seams and red recesses', color.brandStrong, { roughness: .4 });
const white = material('White container panels', color.surface, { metalness: .13, roughness: .43 });
const panelShade = material('White panel joints', color.borderSoft, { metalness: .2, roughness: .5 });
const silver = material('Brushed aluminium frame', color.borderStrong, { metalness: .78, roughness: .3 });
const chrome = material('Polished metal hardware', color.surface, { metalness: .94, roughness: .2 });
const chassis = material('Graphite chassis', color.ink2, { metalness: .6, roughness: .6 });
const black = material('Rubber and black trim', color.ink, { metalness: .02, roughness: .91 });
const tread = material('Tyre tread relief', color.ink2, { roughness: 1, metalness: 0 });
const glass = material('Blue grey cab glass', new THREE.Color(mapPalette.waterOutline).lerp(new THREE.Color(color.ink), .65), { metalness: .42, roughness: .13 });
const glassHighlight = material('Windshield reflected sky', mapPalette.waterOutline, { metalness: .4, roughness: .18 });
const headlamp = material('Headlamp lens', color.surface, { emissive: color.surface, emissiveIntensity: .16, metalness: .25, roughness: .18 });
const amber = material('Amber lamps and reflectors', tone.warning.fg, { emissive: tone.warning.fg, emissiveIntensity: .3, roughness: .3 });
const tailLamp = material('Red rear lamps', tone.danger.fg, { emissive: tone.danger.fg, emissiveIntensity: .4, roughness: .25 });
const logo = material('GMT embedded side logo', color.surface, { roughness: .52, metalness: 0 });

function add(geometry, name, position = [0, 0, 0], rotation = [0, 0, 0]) {
  const meshGeometry = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  geometry.dispose();
  if (!meshGeometry.getAttribute('normal')) meshGeometry.computeVertexNormals();
  if (!meshGeometry.getAttribute('uv')) meshGeometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(meshGeometry.getAttribute('position').count * 2), 2));
  meshGeometry.clearGroups();
  const transform = new THREE.Matrix4().compose(new THREE.Vector3(...position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(1, 1, 1));
  meshGeometry.applyMatrix4(transform);
  parts.get(name).push(meshGeometry);
}

function box(size, position, name, round = 0, rotation = [0, 0, 0]) {
  add(round ? new RoundedBoxGeometry(...size, 1, round) : new THREE.BoxGeometry(...size), name, position, rotation);
}

function cylinder(radius, height, position, name, rotation = [0, 0, 0], segments = 16) {
  add(new THREE.CylinderGeometry(radius, radius, height, segments, 1), name, position, rotation);
}

function rod(from, to, radius, name, segments = 8) {
  const start = new THREE.Vector3(...from);
  const end = new THREE.Vector3(...to);
  const geometry = new THREE.CylinderGeometry(radius, radius, start.distanceTo(end), segments, 1);
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize()));
  add(geometry, name, start.add(end).multiplyScalar(.5).toArray());
}

function quad(corners, name, reverse = false) {
  const indices = reverse ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(indices.flatMap(index => corners[index]), 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(indices.flatMap(index => [[0, 0], [1, 0], [1, 1], [0, 1]][index]), 2));
  geometry.computeVertexNormals();
  add(geometry, name);
}

// 캐빈 실루엣은 박스 대신 전면 유리와 지붕이 기울어진 압출 프로파일로 만든다.
function cabProfile(profile, width, name, bevel = .055) {
  const shape = new THREE.Shape();
  profile.forEach(([z, y], index) => index ? shape.lineTo(-z, y) : shape.moveTo(-z, y));
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: width, steps: 1, bevelEnabled: true, bevelSegments: 2, bevelSize: bevel, bevelThickness: bevel, curveSegments: 2 });
  add(geometry, name, [-width / 2, 0, 0], [0, Math.PI / 2, 0]);
}

// 사다리형 섀시, 크로스멤버, 축, 에어탱크와 알루미늄 연료탱크.
for (const side of [-1, 1]) box([.16, .27, 10.15], [side * .66, .72, -.1], chassis);
for (const z of [-4.9, -3.5, -2.1, -.7, .8, 2.2, 3.7, 4.55]) box([1.46, .18, .15], [0, .74, z], chassis);
for (const z of [3.9, -2.48, -3.86]) {
  cylinder(.105, 2.1, [0, .5, z], chassis, [0, 0, Math.PI / 2]);
  box([.5, .3, .42], [0, .54, z], chassis, .055);
  for (const side of [-1, 1]) {
    box([.17, .06, 1.04], [side * .7, .65, z], black);
    box([.18, .06, .82], [side * .7, .7, z], silver);
  }
}
box([.73, .63, 1.35], [-.76, .68, .4], silver, .085);
for (const z of [-.04, .84]) box([.745, .035, .065], [-.76, 1.01, z], chassis);
cylinder(.08, .05, [-.77, 1.015, .92], chrome);
for (const z of [.08, .67]) cylinder(.19, .64, [.87, .58, z], chassis, [Math.PI / 2, 0, 0]);
box([.76, .53, 1.13], [.78, .71, 1.52], black, .04);

// 앞 1축, 뒤 2축의 복륜 구성. 외측 허브와 볼트는 측면 근접 보기에도 남긴다.
function wheel(x, z, showHub) {
  const points = [[.255, -.16], [.41, -.16], [.466, -.125], [.495, -.06], [.495, .06], [.466, .125], [.41, .16], [.255, .16], [.255, -.16]].map(([r, y]) => new THREE.Vector2(r, y));
  add(new THREE.LatheGeometry(points, 24), black, [x, .495, z], [0, 0, Math.PI / 2]);
  for (let index = 0; index < 24; index += 1) {
    const angle = index / 24 * Math.PI * 2;
    box([.28, .012, .045], [x, .495 + Math.cos(angle) * .492, z + Math.sin(angle) * .492], tread, 0, [angle, 0, 0]);
  }
  cylinder(.27, .27, [x, .495, z], silver, [0, 0, Math.PI / 2], 24);
  if (!showHub) return;
  const side = Math.sign(x);
  const outerX = x + side * .177;
  cylinder(.224, .033, [outerX, .495, z], chrome, [0, 0, Math.PI / 2], 24);
  cylinder(.12, .062, [outerX + side * .018, .495, z], silver, [0, 0, Math.PI / 2], 20);
  for (let index = 0; index < 8; index += 1) {
    const angle = index / 8 * Math.PI * 2;
    cylinder(.025, .027, [outerX + side * .027, .495 + Math.cos(angle) * .162, z + Math.sin(angle) * .162], chassis, [0, 0, Math.PI / 2], 6);
  }
  const ring = new THREE.TorusGeometry(.293, .012, 4, 24);
  add(ring, black, [outerX, .495, z], [0, Math.PI / 2, 0]);
}
for (const side of [-1, 1]) {
  wheel(side * 1.055, 3.9, true);
  for (const z of [-2.48, -3.86]) {
    wheel(side * 1.05, z, true);
    wheel(side * .70, z, false);
  }
  for (const z of [-2.48, -3.86]) {
    box([.84, .07, 1.14], [side * .95, 1.05, z], black, .025);
    box([.82, .46, .045], [side * .95, .66, z - .56], black);
  }
}

cabProfile([[2.28, .98], [4.99, .98], [5.075, 1.38], [5.00, 2.02], [4.74, 3.13], [4.55, 3.28], [2.60, 3.28], [2.28, 2.87]], 2.13, red);
cabProfile([[2.33, 3.22], [4.58, 3.22], [4.29, 3.52], [2.43, 3.72]], 1.99, red, .04);
box([2.16, .18, 2.8], [0, 1.02, 3.62], redDark, .045);

// 두꺼운 검정 실링과 기울어진 전면 유리를 별도 표면으로 만든다.
quad([[-1.015, 2.045, 5.031], [1.015, 2.045, 5.031], [.966, 3.10, 4.783], [-.966, 3.10, 4.783]], black);
quad([[-.952, 2.12, 5.018], [.952, 2.12, 5.018], [.914, 3.025, 4.806], [-.914, 3.025, 4.806]], glass);
quad([[-.88, 2.80, 4.86], [.86, 2.80, 4.86], [.884, 2.88, 4.842], [-.884, 2.88, 4.842]], glassHighlight);
rod([0, 2.09, 5.03], [0, 3.06, 4.808], .012, black);
for (const x of [-.49, .49]) {
  rod([x, 2.105, 5.056], [x - .2, 2.38, 4.995], .014, black);
  rod([x - .4, 2.365, 5.001], [x + .14, 2.365, 5.001], .018, black);
}

// 측면 유리, 문 테두리, 손잡이, 금속 발판과 사이드미러.
for (const side of [-1, 1]) {
  const x = side * 1.127;
  const outline = [[x, 2.00, 2.56], [x, 2.00, 4.85], [x, 3.065, 4.62], [x, 3.12, 2.57]];
  quad(outline, black, side > 0);
  quad([[x + side * .005, 2.09, 2.63], [x + side * .005, 2.09, 4.755], [x + side * .005, 2.994, 4.555], [x + side * .005, 3.038, 2.635]], glass, side > 0);
  rod([x + side * .012, 2.04, 3.05], [x + side * .012, 3.075, 3.05], .023, black);
  const door = [[x + side * .011, 1.3, 2.52], [x + side * .011, 1.3, 4.77], [x + side * .011, 2.01, 4.84], [x + side * .011, 2.01, 2.52], [x + side * .011, 1.3, 2.52]];
  for (let i = 0; i < door.length - 1; i += 1) rod(door[i], door[i + 1], .012, redDark, 6);
  box([.025, .12, .38], [x + side * .022, 1.83, 2.81], black, .012);
  box([.035, .035, .23], [x + side * .045, 1.84, 2.79], chrome, .008);
  for (const [y, width] of [[.64, .88], [.87, .83]]) {
    box([.24, .07, width], [side * 1.11, y, 2.98], silver, .015);
    for (let i = 0; i < 7; i += 1) box([.245, .015, .025], [side * 1.11, y + .045, 2.62 + i * .1], black);
  }
  rod([side * 1.075, 2.58, 4.56], [side * 1.21, 2.60, 4.74], .024, chassis);
  rod([side * 1.075, 2.11, 4.70], [side * 1.21, 2.16, 4.74], .022, chassis);
  box([.12, .55, .20], [side * 1.205, 2.40, 4.77], black, .045);
  box([.125, .44, .025], [side * 1.205, 2.43, 4.663], silver, .025);
  box([.12, .20, .18], [side * 1.205, 2.02, 4.78], black, .035);
  box([.06, .13, .26], [side * 1.136, 1.76, 4.48], amber, .02);
}

// 전면 라디에이터 그릴, 분할 범퍼, 헤드램프와 보조등.
box([1.65, .64, .05], [0, 1.66, 5.104], black, .075);
for (let i = 0; i < 5; i += 1) box([1.5, .033, .031], [0, 1.43 + i * .105, 5.136], silver, .008);
box([.22, .2, .045], [0, 1.72, 5.169], chrome, .025);
box([2.22, .31, .34], [0, .96, 5.22], red, .075);
box([1.15, .13, .028], [0, .965, 5.399], black, .025);
box([.41, .11, .017], [0, .988, 5.421], silver, .012);
for (const side of [-1, 1]) {
  box([.52, .22, .10], [side * .84, 1.19, 5.24], black, .045);
  box([.38, .16, .025], [side * .82, 1.22, 5.3], headlamp, .025);
  box([.095, .16, .03], [side * 1.057, 1.22, 5.295], amber, .015);
  box([.3, .065, .025], [side * .77, 1.075, 5.345], headlamp, .015);
  cylinder(.065, .035, [side * .86, .86, 5.364], headlamp, [Math.PI / 2, 0, 0], 12);
  box([.16, .065, .10], [side * .78, 3.36, 4.49], amber, .02);
}

// 긴 화이트 컨테이너는 로고 높이에 평평한 패널을 남기고 위아래에만 낮은 리브를 둔다.
box([2.48, 2.70, 7.55], [0, 2.50, -1.60], white, .022);
for (const side of [-1, 1]) {
  for (const y of [1.19, 3.82]) box([.065, .065, 7.61], [side * 1.215, y, -1.6], silver, .008);
  for (const z of [-5.355, 2.155]) box([.067, 2.64, .065], [side * 1.214, 2.5, z], silver, .008);
  for (let i = 0; i < 23; i += 1) {
    const z = -5.18 + i * .326;
    for (const y of [1.59, 3.38]) box([.014, .66, .025], [side * 1.244, y, z], panelShade);
  }
  for (const z of [-4.93, -3.1, -1.25, .61, 1.9]) {
    box([.024, .074, .14], [side * 1.255, 1.245, z], amber, .008);
    for (const y of [1.225, 3.79]) cylinder(.014, .02, [side * 1.255, y, z], chrome, [0, 0, Math.PI / 2], 6);
  }
  for (const y of [.43, .68]) box([.07, .065, 3.7], [side * 1.11, y, -.03], silver, .01);
  for (const z of [-1.54, 1.49]) box([.06, .49, .065], [side * 1.11, .66, z], chassis);
  const logoWidth = 3.62;
  const geometry = new THREE.PlaneGeometry(logoWidth, logoWidth / logoAspect);
  // PNG를 GLB에 직접 넣으므로 glTF의 이미지 좌표계에 맞게 V축만 뒤집는다.
  const uv = geometry.getAttribute('uv');
  for (let index = 0; index < uv.count; index += 1) uv.setY(index, 1 - uv.getY(index));
  add(geometry, logo, [side * 1.251, 2.5, -1.39], [0, side * Math.PI / 2, 0]);
}

// 후면 양문, 경첩, 두 잠금봉과 핸들, 후미등 및 언더런 가드.
for (const side of [-1, 1]) {
  box([1.17, 2.49, .027], [side * .607, 2.5, -5.391], white, .006);
  for (const y of [1.275, 3.725]) box([1.18, .035, .03], [side * .604, y, -5.414], silver);
  for (const y of [1.52, 2.50, 3.46]) {
    box([.21, .064, .042], [side * 1.081, y, -5.412], silver, .008);
    cylinder(.036, .13, [side * 1.154, y, -5.438], chassis, [0, 0, 0], 8);
  }
  rod([side * .38, 1.33, -5.448], [side * .38, 3.69, -5.448], .019, silver);
  for (const y of [1.4, 2.06, 3.6]) box([.11, .1, .038], [side * .38, y, -5.449], chrome, .01);
  rod([side * .38, 2.12, -5.47], [side * .64, 2.12, -5.47], .027, chassis);
  box([.45, .19, .095], [side * .86, .99, -5.31], black, .025);
  box([.23, .12, .018], [side * .92, 1.005, -5.363], tailLamp, .015);
  box([.095, .12, .018], [side * .72, 1.005, -5.363], amber, .012);
  box([.09, .12, .018], [side * .58, 1.005, -5.363], headlamp, .012);
  box([.08, .51, .09], [side * .79, .61, -5.12], chassis);
}
box([.035, 2.5, .032], [0, 2.5, -5.425], black);
box([2.18, .14, .12], [0, .38, -5.24], silver, .018);
box([.45, .15, .018], [0, .93, -5.36], silver, .008);

// 재질별 결합으로 세부 부품 수와 무관하게 작은 드로콜 수를 유지한다.
const scene = new THREE.Scene();
scene.name = 'GMT red cab and white container truck';
for (const [name, geometries] of parts) {
  if (!geometries.length) continue;
  const merged = mergeGeometries(geometries, false);
  const compact = mergeVertices(merged, 1e-5);
  merged.dispose();
  geometries.forEach(geometry => geometry.dispose());
  const mesh = new THREE.Mesh(compact, materials.get(name));
  mesh.name = name;
  scene.add(mesh);
}
scene.updateMatrixWorld(true);
const initialBounds = new THREE.Box3().setFromObject(scene);
const initialSize = initialBounds.getSize(new THREE.Vector3());
const initialCenter = initialBounds.getCenter(new THREE.Vector3());
const normalize = new THREE.Matrix4().makeScale(2.55 / initialSize.x, 3.85 / initialSize.y, 10.8 / initialSize.z)
  .multiply(new THREE.Matrix4().makeTranslation(-initialCenter.x, -initialBounds.min.y, -initialCenter.z));
for (const mesh of scene.children) mesh.geometry.applyMatrix4(normalize);
scene.userData = { authoring: 'Project-authored procedural Three.js model; not generated by Tripo', units: 'metres', front: '+Z', dimensions: { length: 10.8, width: 2.55, height: 3.85 }, logoEmbedded: true };

// 텍스처 없는 GLTFExporter는 FileReader 보완만으로 Node에서 실행할 수 있다.
globalThis.FileReader = class {
  result = null;
  onloadend = null;
  onerror = null;
  readAsArrayBuffer(blob) { this.complete(blob.arrayBuffer()); }
  readAsDataURL(blob) { this.complete(blob.arrayBuffer().then(buffer => `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(buffer).toString('base64')}`)); }
  complete(promise) { promise.then(result => { this.result = result; this.onloadend?.({ target: this }); }).catch(error => this.onerror?.(error)); }
};
const gltf = await new GLTFExporter().parseAsync(scene, { binary: false, onlyVisible: true, trs: false });
const geometryBinary = Buffer.from(gltf.buffers[0].uri.split(',')[1], 'base64');
const align4 = value => Math.ceil(value / 4) * 4;
const imageOffset = align4(geometryBinary.length);
const imageView = gltf.bufferViews.length;
gltf.bufferViews.push({ buffer: 0, byteOffset: imageOffset, byteLength: logoPng.length });
gltf.images = [{ name: 'Project GMT loading-screen logo', mimeType: 'image/png', bufferView: imageView }];
gltf.samplers = [{ magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }];
gltf.textures = [{ name: 'Embedded GMT logo', sampler: 0, source: 0 }];
const logoMaterial = gltf.materials.find(item => item.name === logo);
logoMaterial.pbrMetallicRoughness.baseColorFactor = [1, 1, 1, 1];
logoMaterial.pbrMetallicRoughness.baseColorTexture = { index: 0 };
gltf.asset.generator = 'DXS project procedural truck generator / Three.js GLTFExporter';
gltf.asset.extras = { provenance: 'Self-authored procedural model with the repository GMT logo. No Tripo-generated geometry.' };
const binaryLength = imageOffset + logoPng.length;
gltf.buffers = [{ byteLength: binaryLength }];
const json = Buffer.from(JSON.stringify(gltf), 'utf8');
const jsonChunk = Buffer.alloc(align4(json.length), 0x20);
json.copy(jsonChunk);
const binaryChunk = Buffer.alloc(align4(binaryLength));
geometryBinary.copy(binaryChunk);
logoPng.copy(binaryChunk, imageOffset);
const result = Buffer.alloc(12 + 8 + jsonChunk.length + 8 + binaryChunk.length);
result.writeUInt32LE(0x46546c67, 0);
result.writeUInt32LE(2, 4);
result.writeUInt32LE(result.length, 8);
result.writeUInt32LE(jsonChunk.length, 12);
result.writeUInt32LE(0x4e4f534a, 16);
jsonChunk.copy(result, 20);
const binaryHeader = 20 + jsonChunk.length;
result.writeUInt32LE(binaryChunk.length, binaryHeader);
result.writeUInt32LE(0x004e4942, binaryHeader + 4);
binaryChunk.copy(result, binaryHeader + 8);

const bounds = new THREE.Box3().setFromObject(scene);
const size = bounds.getSize(new THREE.Vector3());
const triangles = scene.children.reduce((sum, mesh) => sum + (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count) / 3, 0);
if (triangles >= 30_000) throw new Error(`Triangle budget exceeded: ${triangles}`);
if (result.length >= 2_000_000) throw new Error(`Asset byte budget exceeded: ${result.length}`);
await mkdir(new URL('public/models/transport/', root), { recursive: true });
await writeFile(output, result);
const report = { file: fileURLToPath(output), bytes: result.length, triangles, meshes: scene.children.length, materials: gltf.materials.length, embeddedImages: gltf.images.length, boundingBox: { min: bounds.min.toArray(), max: bounds.max.toArray(), size: size.toArray() }, front: '+Z' };
console.log(JSON.stringify(report, null, 2));
