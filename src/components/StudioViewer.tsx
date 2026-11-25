import { Component, Suspense, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { asset, type Look } from '../types';

export type ViewerApi = {
  reset: () => void;
  /** 1 moves closer, -1 moves farther away. */
  zoom: (direction: 1 | -1) => void;
};

type ViewerProps = {
  look: Look;
  playing: boolean;
  onReady: (animated: boolean) => void;
  onError: (message: string) => void;
  apiRef?: MutableRefObject<ViewerApi | null>;
};

type CachedModel = { promise: Promise<GLTF>; users: number; touched: number; model?: GLTF };
const modelCache = new Map<string, CachedModel>();
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
// Older GLBs (including the user's Bee) may store their color only in this
// legacy extension. Keep its diffuse texture; approximate the old gloss model.
loader.register(parser => ({
  name: 'KHR_materials_pbrSpecularGlossiness',
  extendMaterialParams(materialIndex, params) {
    const legacy = parser.json.materials[materialIndex]?.extensions?.KHR_materials_pbrSpecularGlossiness;
    if (!legacy) return Promise.resolve();
    const factor = legacy.diffuseFactor ?? [1, 1, 1, 1];
    params.color = new THREE.Color().fromArray(factor);
    params.opacity = factor[3];
    params.metalness = 0;
    params.roughness = 1 - (legacy.glossinessFactor ?? 0.5);
    return legacy.diffuseTexture
      ? parser.assignTexture(params, 'map', legacy.diffuseTexture, THREE.SRGBColorSpace).then(() => undefined)
      : Promise.resolve();
  },
}));
const CACHE_LIMIT = 3;

async function loadModel(look: Look): Promise<GLTF> {
  return loader.loadAsync(asset(look.model));
}

function disposeAsset(gltf: GLTF) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  gltf.scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      Object.values(material).forEach((value) => {
        if (value instanceof THREE.Texture) textures.add(value);
      });
    }
  });
  textures.forEach((texture) => texture.dispose());
  materials.forEach((material) => material.dispose());
  geometries.forEach((geometry) => geometry.dispose());
}

function trimCache() {
  const unused = [...modelCache.entries()]
    .filter(([, entry]) => entry.users === 0 && entry.model)
    .sort((a, b) => a[1].touched - b[1].touched);
  while (modelCache.size > CACHE_LIMIT && unused.length) {
    const [url, entry] = unused.shift()!;
    modelCache.delete(url);
    if (entry.model) disposeAsset(entry.model);
  }
}

function getModel(look: Look): CachedModel {
  const url = asset(look.model);
  const cached = modelCache.get(url);
  if (cached) {
    cached.touched = performance.now();
    return cached;
  }
  const entry: CachedModel = {
    users: 0,
    touched: performance.now(),
    promise: loadModel(look),
  };
  modelCache.set(url, entry);
  entry.promise = entry.promise.then((model) => {
    entry.model = model;
    trimCache();
    return model;
  }).catch((error: unknown) => {
    if (modelCache.get(url) === entry) modelCache.delete(url);
    throw error;
  });
  return entry;
}

/** The next look is fetched by the same loader and cache used by the live viewer. */
export async function preloadLook(look: Look): Promise<void> {
  await getModel(look).promise;
}

function inPlaceClip(source: THREE.AnimationClip, scene: THREE.Object3D): THREE.AnimationClip {
  const clip = source.clone();
  const roots = new Set([scene.name, ...scene.children.map((child) => child.name)]);
  scene.traverse((node) => {
    if (node instanceof THREE.Bone && !(node.parent instanceof THREE.Bone)) roots.add(node.name);
  });
  for (const track of clip.tracks) {
    if (!track.name.endsWith('.position')) continue;
    const target = track.name.slice(0, -'.position'.length);
    if (!roots.has(target)) continue;
    // Preserve vertical gait, but remove forward travel from a root-motion clip.
    // LINEAR/STEP glTF vector tracks use one XYZ sample per keyframe.
    if (track.getValueSize() !== 3) continue;
    for (let index = 0; index < track.values.length; index += 3) {
      track.values[index] = track.values[0];
      track.values[index + 2] = track.values[2];
    }
  }
  return clip;
}

type ModelBounds = { width: number; height: number; depth: number };

function Garment({ look, playing, onReady, onError, onBounds }: ViewerProps & { onBounds: (bounds: ModelBounds) => void }) {
  const [gltf, setGltf] = useState<GLTF | null>(null);
  const callbacks = useRef({ onReady, onError });
  callbacks.current = { onReady, onError };

  useEffect(() => {
    let active = true;
    const entry = getModel(look);
    entry.users += 1;
    setGltf(null);
    entry.promise.then((model) => {
      if (active) setGltf(model);
    }).catch(() => {
      if (active) callbacks.current.onError('3D 의상을 불러오지 못했습니다. 파일을 확인하거나 다시 시도해 주세요.');
    });
    return () => {
      active = false;
      entry.users = Math.max(0, entry.users - 1);
      entry.touched = performance.now();
      trimCache();
    };
  }, [look.model]);

  const prepared = useMemo(() => {
    if (!gltf) return null;
    const scene = cloneSkeleton(gltf.scene);
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      object.frustumCulled = false;
    });
    const group = new THREE.Group();
    group.add(scene);
    group.rotation.y = look.rotationY ?? 0;
    group.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(group);
    const size = bounds.getSize(new THREE.Vector3());
    if (!Number.isFinite(size.y) || size.y <= 0) throw new Error('모델의 크기를 읽을 수 없습니다.');
    const scale = (2 / size.y) * (look.scale ?? 1);
    const center = bounds.getCenter(new THREE.Vector3());
    group.scale.setScalar(scale);
    group.position.set(-center.x * scale, -bounds.min.y * scale + 0.025, -center.z * scale);
    const sourceClip = gltf.animations.find((clip) => clip.name === look.animation) ?? gltf.animations[0];
    const clip = sourceClip ? inPlaceClip(sourceClip, scene) : null;
    return { group, scene, clip, mixer: new THREE.AnimationMixer(scene), bounds: { width: size.x * scale, height: size.y * scale, depth: size.z * scale } };
  }, [gltf, look.animation, look.rotationY, look.scale]);

  useEffect(() => {
    if (!prepared) return;
    onBounds(prepared.bounds);
    if (prepared.clip) {
      prepared.mixer.clipAction(prepared.clip).reset().setLoop(THREE.LoopRepeat, Infinity).play();
      prepared.mixer.update(0);
    }
    callbacks.current.onReady(Boolean(prepared.clip));
    return () => {
      prepared.mixer.stopAllAction();
      prepared.mixer.uncacheRoot(prepared.scene);
      prepared.scene.traverse((node) => {
        if (node instanceof THREE.SkinnedMesh) node.skeleton.dispose();
      });
    };
  }, [prepared, onBounds]);

  useFrame((_, delta) => {
    if (playing && !document.hidden && prepared) prepared.mixer.update(Math.min(delta, 0.05));
  });
  return prepared ? <primitive object={prepared.group} dispose={null} /> : null;
}

function CameraControls({ apiRef, bounds }: Pick<ViewerProps, 'apiRef'> & { bounds: ModelBounds }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera, size } = useThree();
  const aspect = Math.max(size.width / size.height, 0.2);
  const halfField = Math.tan(THREE.MathUtils.degToRad(32 / 2));
  const initialDistance = Math.max(bounds.height / (2 * halfField), bounds.width / (2 * halfField * aspect)) * 1.19 + bounds.depth / 2;
  const targetHeight = bounds.height * 0.52 + 0.025;
  const maxDistance = Math.max(8.5, initialDistance * 1.8);
  const resetRef = useRef<() => void>(() => {});
  resetRef.current = () => {
    const orbit = controls.current;
    // Flush an unfinished drag's damping before restoring the front view.
    if (orbit) {
      orbit.enableDamping = false;
      orbit.update();
      orbit.enableDamping = true;
    }
    camera.position.set(0, targetHeight + 0.02, initialDistance);
    orbit?.target.set(0, targetHeight, 0);
    orbit?.update();
  };

  useEffect(() => {
    resetRef.current();
  }, [initialDistance, targetHeight]);

  useEffect(() => {
    if (!apiRef) return;
    apiRef.current = {
      reset: () => resetRef.current(),
      zoom: (direction) => {
        const orbit = controls.current;
        if (!orbit) return;
        const offset = camera.position.clone().sub(orbit.target);
        const distance = THREE.MathUtils.clamp(offset.length() * (direction === 1 ? 0.82 : 1.22), 1.65, maxDistance);
        camera.position.copy(orbit.target).add(offset.setLength(distance));
        orbit.update();
      },
    };
    return () => { apiRef.current = null; };
  }, [apiRef, camera, maxDistance]);

  return <OrbitControls
    ref={controls}
    makeDefault
    target={[0, targetHeight, 0]}
    enablePan={false}
    enableDamping
    dampingFactor={0.07}
    rotateSpeed={0.65}
    zoomSpeed={0.8}
    minDistance={1.65}
    maxDistance={maxDistance}
    minPolarAngle={Math.PI * 0.24}
    maxPolarAngle={Math.PI * 0.65}
  />;
}

type BoundaryProps = { resetKey: string; onError: (message: string) => void; children: ReactNode };

class ViewerErrorBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError('3D 화면을 시작하지 못했습니다. WebGL을 지원하는 브라우저에서 다시 시도해 주세요.'); }
  componentDidUpdate(previous: BoundaryProps) {
    if (previous.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: false });
  }
  render() { return this.state.failed ? null : this.props.children; }
}

function ContextHealth({ onError }: { onError: ViewerProps['onError'] }) {
  const { gl } = useThree();
  useEffect(() => {
    const lost = (event: Event) => {
      event.preventDefault();
      onError('3D 화면 연결이 중단되었습니다. 다시 불러오기를 눌러 주세요.');
    };
    gl.domElement.addEventListener('webglcontextlost', lost);
    return () => { gl.domElement.removeEventListener('webglcontextlost', lost); };
  }, [gl, onError]);
  return null;
}

export function StudioViewer(props: ViewerProps) {
  const [bounds, setBounds] = useState<ModelBounds>({ width: 1.2, height: 2, depth: 0.5 });
  return <ViewerErrorBoundary resetKey={props.look.id} onError={props.onError}>
    <Canvas
      shadows
      dpr={[1, 1.7]}
      camera={{ position: [0, 1.08, 4.4], fov: 32, near: 0.05, far: 40 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      style={{ touchAction: 'none' }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.15;
        gl.outputColorSpace = THREE.SRGBColorSpace;
      }}
      aria-label="마우스 또는 터치로 회전할 수 있는 3D 의상"
    >
      <hemisphereLight args={['#e6e4ee', '#332d29', 1.8]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[-3, 5, 4]} color="#fff1df" intensity={3.2} castShadow shadow-mapSize={[1024, 1024]} shadow-normalBias={0.025} shadow-camera-left={-3} shadow-camera-right={3} shadow-camera-top={4} shadow-camera-bottom={-2} />
      <directionalLight position={[3, 2.5, 2]} color="#dce3ff" intensity={1.1} />
      <directionalLight position={[1, 3, -3]} color="#f6e9d9" intensity={3} />
      <Suspense fallback={null}>
        <Garment key={props.look.id} {...props} onBounds={setBounds} />
        <ContactShadows position={[0, 0.01, 0]} scale={5} opacity={0.5} blur={2.6} far={3} resolution={256} color="#000000" />
      </Suspense>
      <CameraControls apiRef={props.apiRef} bounds={bounds} />
      <ContextHealth onError={props.onError} />
    </Canvas>
  </ViewerErrorBoundary>;
}

export default StudioViewer;
