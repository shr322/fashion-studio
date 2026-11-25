import { readFileSync, statSync } from 'node:fs';
import assert from 'node:assert/strict';
const data = JSON.parse(readFileSync(new URL('../public/data/looks.json', import.meta.url), 'utf8'));
assert(Array.isArray(data.looks) && data.looks.length > 0, 'looks must be a nonempty array');
const ids = new Set();
for (const look of data.looks) {
  assert(typeof look.id === 'string' && !ids.has(look.id), 'IDs must be unique');
  ids.add(look.id);
  if (!look.published) continue;
  assert(typeof look.model === 'string' && /^models\/[\w.-]+\.glb$/.test(look.model), `${look.id}: use a local models/*.glb path`);
  const path = new URL('../public/' + look.model, import.meta.url);
  const file = readFileSync(path);
  assert.equal(file.toString('ascii', 0, 4), 'glTF');
  assert.equal(file.readUInt32LE(4), 2);
  assert.equal(file.readUInt32LE(8), file.length);
  const jsonLength = file.readUInt32LE(12);
  assert.equal(file.toString('ascii', 16, 20), 'JSON');
  const gltf = JSON.parse(file.toString('utf8', 20, 20 + jsonLength));
  assert(gltf.meshes?.length > 0, `${look.id}: no meshes`);
  assert(!look.animation || gltf.animations?.some(clip => clip.name === look.animation), `${look.id}: missing animation ${look.animation}`);
  const binOffset = 20 + jsonLength;
  assert(binOffset + 8 <= file.length);
  const binLength = file.readUInt32LE(binOffset);
  assert.equal(file.toString('ascii', binOffset + 4, binOffset + 7), 'BIN');
  assert(binOffset + 8 + binLength <= file.length);
  assert(gltf.buffers[0].byteLength <= binLength);
  for (const buffer of gltf.buffers) assert(!buffer.uri, `${look.id}: external buffer not embedded`);
  for (const image of gltf.images ?? []) assert(!image.uri || image.uri.startsWith('data:'), `${look.id}: external texture not embedded`);
  for (const view of gltf.bufferViews ?? []) {
    const buffer = gltf.buffers[view.buffer];
    assert(buffer && (view.byteOffset ?? 0) + view.byteLength <= buffer.byteLength, `${look.id}: buffer view exceeds its declared buffer`);
    const meshopt = view.extensions?.EXT_meshopt_compression;
    if (meshopt) {
      assert.equal(meshopt.buffer, 0, `${look.id}: compressed data must be embedded`);
      assert((meshopt.byteOffset ?? 0) + meshopt.byteLength <= binLength, `${look.id}: compressed payload exceeds BIN chunk`);
      assert.equal(meshopt.count * meshopt.byteStride, view.byteLength, `${look.id}: decoded length mismatch`);
    } else {
      assert.equal(view.buffer, 0, `${look.id}: noncompressed view must reference embedded buffer`);
      assert((view.byteOffset ?? 0) + view.byteLength <= binLength);
    }
  }
  console.log(`${look.id}: ${Math.round(statSync(path).size / 1024)} KB, ${gltf.meshes.length} meshes, ${(gltf.animations ?? []).map(clip => clip.name).join(', ') || 'static'}, ${gltf.extensionsRequired?.includes('EXT_meshopt_compression') ? 'Meshopt' : 'uncompressed'}`);
}
console.log('Asset checks passed.');
