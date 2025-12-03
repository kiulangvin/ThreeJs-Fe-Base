<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// 场景引用
const sceneRef = ref<HTMLDivElement | null>(null);

// Three.js 核心对象
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let currentObject: THREE.Mesh | null = null;

// 初始化Three.js场景
const initScene = () => {
  if (!sceneRef.value) return;

  // 创建场景
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // 创建相机
  camera = new THREE.PerspectiveCamera(
    75,
    sceneRef.value.clientWidth / sceneRef.value.clientHeight,
    0.1,
    1000
  );
  camera.position.z = 5;

  // 创建渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(sceneRef.value.clientWidth, sceneRef.value.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  sceneRef.value.appendChild(renderer.domElement);

  // 添加轨道控制器
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  // 添加光源
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 5, 5);
  scene.add(directionalLight);

  // 添加网格辅助线
  const gridHelper = new THREE.GridHelper(10, 10);
  scene.add(gridHelper);

  // 添加坐标轴
  const axesHelper = new THREE.AxesHelper(5);
  scene.add(axesHelper);

  // 开始动画循环
  animate();

  // 监听窗口大小变化
  window.addEventListener('resize', onWindowResize);
};

// 动画循环
const animate = () => {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
};

// 窗口大小变化处理
const onWindowResize = () => {
  if (!sceneRef.value) return;
  
  camera.aspect = sceneRef.value.clientWidth / sceneRef.value.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(sceneRef.value.clientWidth, sceneRef.value.clientHeight);
};

// 添加对象
const addObject = (params: { type: string; size?: number; color?: string; position?: { x?: number; y?: number; z?: number } }) => {
  const { type, size = 1, color = '#ffffff', position = { x: 0, y: 0, z: 0 } } = params;
  
  // 移除当前对象
  if (currentObject) {
    scene.remove(currentObject);
  }

  let geometry: THREE.BufferGeometry;
  
  switch (type.toLowerCase()) {
    case 'cube':
      geometry = new THREE.BoxGeometry(size, size, size);
      break;
    case 'sphere':
      geometry = new THREE.SphereGeometry(size / 2, 32, 32);
      break;
    case 'cylinder':
      geometry = new THREE.CylinderGeometry(size / 2, size / 2, size, 32);
      break;
    default:
      geometry = new THREE.BoxGeometry(size, size, size);
  }

  const material = new THREE.MeshStandardMaterial({ color });
  currentObject = new THREE.Mesh(geometry, material);
  
  // 设置对象位置
  currentObject.position.x = position.x || 0;
  currentObject.position.y = position.y || 0;
  currentObject.position.z = position.z || 0;
  
  scene.add(currentObject);
};

// 旋转对象
const rotateObject = (params: { x?: number; y?: number; z?: number }) => {
  if (!currentObject) return;
  
  const { x = 0, y = 0, z = 0 } = params;
  currentObject.rotation.x += x;
  currentObject.rotation.y += y;
  currentObject.rotation.z += z;
};

// 缩放对象
const scaleObject = (params: { x?: number; y?: number; z?: number }) => {
  if (!currentObject) return;
  
  const { x = 1, y = 1, z = 1 } = params;
  currentObject.scale.x *= x;
  currentObject.scale.y *= y;
  currentObject.scale.z *= z;
};

// 改变颜色
const changeColor = (params: { color: string }) => {
  if (!currentObject || !(currentObject.material instanceof THREE.MeshStandardMaterial)) return;
  
  currentObject.material.color.set(params.color);
};

// 清空场景
const clearScene = () => {
  if (currentObject) {
    scene.remove(currentObject);
    currentObject = null;
  }
};

// 组件挂载时初始化
onMounted(() => {
  initScene();
});

// 组件卸载时清理
onUnmounted(() => {
  window.removeEventListener('resize', onWindowResize);
  if (renderer && sceneRef.value) {
    sceneRef.value.removeChild(renderer.domElement);
    renderer.dispose();
  }
});

// 暴露方法给父组件
defineExpose({
  addObject,
  rotateObject,
  scaleObject,
  changeColor,
  clearScene
});
</script>

<template>
  <div ref="sceneRef" class="three-scene"></div>
</template>

<style scoped>
.three-scene {
  width: 100%;
  height: 100%;
  cursor: grab;
}

.three-scene:active {
  cursor: grabbing;
}
</style>
