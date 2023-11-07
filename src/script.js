import GUI from "lil-gui";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import firefliesVertexShader from "./shaders/fireflies/vertex.glsl";
import firefliesFragmentShader from "./shaders/fireflies/fragment.glsl";
import portalVertexShader from "./shaders/portal/vertex.glsl";
import portalFragmentShader from "./shaders/portal/fragment.glsl";

/**
 * Base
 */
// Debug
const debugObject = {};
debugObject.clearColor = "#201919";
debugObject.portalColorStart = "#000000";
debugObject.portalColorEnd = "#ffffff";

const gui = new GUI({
  width: 400,
});

// Canvas
const canvas = document.querySelector("canvas.webgl");

// Scene
const scene = new THREE.Scene();

/**
 * Loaders
 */
// Texture loader
const textureLoader = new THREE.TextureLoader();

const bakedTexture = textureLoader.load(
  process.env.NODE_ENV === "development" ? "baked.jpg" : "/portal/baked.jpg"
);
bakedTexture.flipY = false; // 블랜더와 three.js의 y값이 달라서
bakedTexture.colorSpace = THREE.SRGBColorSpace;

// Draco loader
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath(
  process.env.NODE_ENV === "development" ? "draco/" : "/portal/draco/"
);

// GLTF loader
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

/**
 * Object
 */
const bakedMaterial = new THREE.MeshBasicMaterial({ map: bakedTexture });
const poleLightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffe5 });

gltfLoader.load(
  process.env.NODE_ENV === "development" ? "portal.glb" : "/portal/portal.glb",
  (gltf) => {
    scene.add(gltf.scene);
    // Get each object
    const bakedMesh = gltf.scene.children.find(
      (child) => child.name === "baked"
    );

    // Get each object
    const portalLightMesh = gltf.scene.children.find(
      (child) => child.name === "portalLight"
    );
    const poleLightAMesh = gltf.scene.children.find(
      (child) => child.name === "poleLightA"
    );
    const poleLightBMesh = gltf.scene.children.find(
      (child) => child.name === "poleLightB"
    );

    // Apply materials
    bakedMesh.material = bakedMaterial;
    portalLightMesh.material = portalLightMaterial;
    poleLightAMesh.material = poleLightMaterial;
    poleLightBMesh.material = poleLightMaterial;
  }
);

/**
 * Fireflies
 */
// Geometry
const firefliesGeometry = new THREE.BufferGeometry();
const firefliesCount = 30;
const positionArray = new Float32Array(firefliesCount * 3);

for (let i = 0; i < firefliesCount; i++) {
  positionArray[i * 3 + 0] = (Math.random() - 0.5) * 4;
  positionArray[i * 3 + 1] = Math.random() * 1.5;
  positionArray[i * 3 + 2] = (Math.random() - 0.5) * 4;
}

firefliesGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(positionArray, 3)
);

// Material

const scaleArray = new Float32Array(firefliesCount);

for (let i = 0; i < firefliesCount; i++) {
  // ...

  scaleArray[i] = Math.random();
}

const firefliesMaterial = new THREE.ShaderMaterial({
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  transparent: true,
  uniforms: {
    uTime: { value: 0 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    uSize: { value: 100 },
  },
  vertexShader: firefliesVertexShader,
  fragmentShader: firefliesFragmentShader,
});

firefliesGeometry.setAttribute(
  "aScale",
  new THREE.BufferAttribute(scaleArray, 1)
);
// Points
const fireflies = new THREE.Points(firefliesGeometry, firefliesMaterial);
scene.add(fireflies);

// Portal light material
const portalLightMaterial = new THREE.ShaderMaterial({
  vertexShader: portalVertexShader,
  fragmentShader: portalFragmentShader,
  uniforms: {
    uTime: { value: 0 },
    uColorStart: { value: new THREE.Color(debugObject.portalColorStart) },
    uColorEnd: { value: new THREE.Color(debugObject.portalColorEnd) },
  },
});

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(
  45,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.x = 4;
camera.position.y = 2;
camera.position.z = 4;
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/**
 * Animate
 */
const clock = new THREE.Clock();

const tick = () => {
  const elapsedTime = clock.getElapsedTime();

  // Update controls
  controls.update();

  // Update materials
  firefliesMaterial.uniforms.uTime.value = elapsedTime;
  portalLightMaterial.uniforms.uTime.value = elapsedTime;

  // Render
  renderer.render(scene, camera);

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();

renderer.setClearColor(debugObject.clearColor);

gui.addColor(debugObject, "clearColor").onChange(() => {
  renderer.setClearColor(debugObject.clearColor);
});

gui
  .add(firefliesMaterial.uniforms.uSize, "value")
  .min(0)
  .max(500)
  .step(1)
  .name("firefliesSize");

gui.addColor(debugObject, "portalColorStart").onChange(() => {
  portalLightMaterial.uniforms.uColorStart.value.set(
    debugObject.portalColorStart
  );
});

gui.addColor(debugObject, "portalColorEnd").onChange(() => {
  portalLightMaterial.uniforms.uColorEnd.value.set(debugObject.portalColorEnd);
});
