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
let allObjects: THREE.Mesh[] = []; // 存储所有创建的对象

// 光源引用
let ambientLight: THREE.AmbientLight;
let directionalLight: THREE.DirectionalLight;

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
  ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
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
const addObject = (params: { 
  type: string; 
  size?: number; 
  color?: string; 
  position?: { x?: number; y?: number; z?: number }; 
  rotation?: { x?: number; y?: number; z?: number }; 
  material?: string;
  wireframe?: boolean;
  name?: string;
}) => {
  const { 
    type, 
    size = 1, 
    color = '#ffffff', 
    position = { x: 0, y: 0, z: 0 },
    rotation = { x: 0, y: 0, z: 0 },
    material = 'standard',
    wireframe = false,
    name = `object_${Date.now()}`
  } = params;
  
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
    case 'torus':
      geometry = new THREE.TorusGeometry(size / 2, size / 8, 16, 100);
      break;
    case 'cone':
      geometry = new THREE.ConeGeometry(size / 2, size, 32);
      break;
    case 'plane':
      geometry = new THREE.PlaneGeometry(size, size);
      break;
    case 'tetrahedron':
      geometry = new THREE.TetrahedronGeometry(size / 2);
      break;
    case 'octahedron':
      geometry = new THREE.OctahedronGeometry(size / 2);
      break;
    case 'dodecahedron':
      geometry = new THREE.DodecahedronGeometry(size / 2);
      break;
    case 'icosahedron':
      geometry = new THREE.IcosahedronGeometry(size / 2);
      break;
    default:
      geometry = new THREE.BoxGeometry(size, size, size);
  }

  let threeMaterial: THREE.Material;
  
  switch (material.toLowerCase()) {
    case 'basic':
      threeMaterial = new THREE.MeshBasicMaterial({ color, wireframe });
      break;
    case 'lambert':
      threeMaterial = new THREE.MeshLambertMaterial({ color, wireframe });
      break;
    case 'phong':
      threeMaterial = new THREE.MeshPhongMaterial({ color, wireframe });
      break;
    case 'wireframe':
      threeMaterial = new THREE.MeshBasicMaterial({ color, wireframe: true });
      break;
    case 'standard':
    default:
      threeMaterial = new THREE.MeshStandardMaterial({ color, wireframe });
  }

  currentObject = new THREE.Mesh(geometry, threeMaterial);
  
  // 设置对象位置
  currentObject.position.x = position.x || 0;
  currentObject.position.y = position.y || 0;
  currentObject.position.z = position.z || 0;
  
  // 设置对象旋转
  currentObject.rotation.x = rotation.x || 0;
  currentObject.rotation.y = rotation.y || 0;
  currentObject.rotation.z = rotation.z || 0;
  
  // 设置对象名称
  currentObject.name = name;
  
  scene.add(currentObject);
  allObjects.push(currentObject); // 添加到对象列表
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

// 移动对象
const moveObject = (params: { x?: number; y?: number; z?: number }) => {
  if (!currentObject) return;
  
  const { x = 0, y = 0, z = 0 } = params;
  currentObject.position.x += x;
  currentObject.position.y += y;
  currentObject.position.z += z;
};

// 改变颜色
const changeColor = (params: { color: string }) => {
  if (!currentObject) return;
  
  if (currentObject.material instanceof THREE.MeshStandardMaterial) {
    currentObject.material.color.set(params.color);
  } else if (currentObject.material instanceof THREE.MeshBasicMaterial) {
    currentObject.material.color.set(params.color);
  } else if (currentObject.material instanceof THREE.MeshLambertMaterial) {
    currentObject.material.color.set(params.color);
  } else if (currentObject.material instanceof THREE.MeshPhongMaterial) {
    currentObject.material.color.set(params.color);
  }
};

// 改变材质
const changeMaterial = (params: { material: string; wireframe?: boolean }) => {
  if (!currentObject) return;
  
  const { material = 'standard', wireframe = false } = params;
  const color = currentObject.material instanceof THREE.Material ? currentObject.material.color.getHexString() : '#ffffff';
  
  let newMaterial: THREE.Material;
  
  switch (material.toLowerCase()) {
    case 'basic':
      newMaterial = new THREE.MeshBasicMaterial({ color: `#${color}`, wireframe });
      break;
    case 'lambert':
      newMaterial = new THREE.MeshLambertMaterial({ color: `#${color}`, wireframe });
      break;
    case 'phong':
      newMaterial = new THREE.MeshPhongMaterial({ color: `#${color}`, wireframe });
      break;
    case 'wireframe':
      newMaterial = new THREE.MeshBasicMaterial({ color: `#${color}`, wireframe: true });
      break;
    case 'standard':
    default:
      newMaterial = new THREE.MeshStandardMaterial({ color: `#${color}`, wireframe });
  }
  
  currentObject.material = newMaterial;
};

// 移除当前对象
const removeObject = () => {
  if (currentObject) {
    scene.remove(currentObject);
    currentObject = null;
  }
};

// 清空场景
const clearScene = () => {
  if (currentObject) {
    scene.remove(currentObject);
    currentObject = null;
  }
  
  // 移除所有非基础元素（保留相机、渲染器、控制器等）
  scene.children.forEach(child => {
    if (!(child instanceof THREE.AmbientLight) && !(child instanceof THREE.DirectionalLight) && 
        !(child instanceof THREE.GridHelper) && !(child instanceof THREE.AxesHelper)) {
      scene.remove(child);
    }
  });
  
  allObjects = []; // 清空对象列表
};

// 同时添加多个对象
const addMultipleObjects = (params: { objects: Array<{ type: string; size?: number; color?: string; position?: { x?: number; y?: number; z?: number }; rotation?: { x?: number; y?: number; z?: number }; name?: string }> }) => {
  const { objects = [] } = params;
  
  objects.forEach(objParams => {
    addObject(objParams);
  });
};

// 选择对象
const selectObject = (params: { name?: string; position?: { x?: number; y?: number; z?: number }; type?: string }) => {
  const { name, position, type } = params;
  
  // 按名称选择
  if (name) {
    const foundObject = allObjects.find(obj => obj.name === name);
    if (foundObject) {
      currentObject = foundObject;
      return;
    }
  }
  
  // 按位置选择
  if (position) {
    const { x = 0, y = 0, z = 0 } = position;
    const foundObject = allObjects.find(obj => 
      Math.abs(obj.position.x - x) < 0.1 && 
      Math.abs(obj.position.y - y) < 0.1 && 
      Math.abs(obj.position.z - z) < 0.1
    );
    if (foundObject) {
      currentObject = foundObject;
      return;
    }
  }
  
  // 按类型选择（选择第一个匹配的）
  if (type) {
    // 根据类型推断几何体类型
    let geometryType: string;
    switch (type.toLowerCase()) {
      case 'cube':
        geometryType = 'BoxGeometry';
        break;
      case 'sphere':
        geometryType = 'SphereGeometry';
        break;
      case 'cylinder':
        geometryType = 'CylinderGeometry';
        break;
      case 'torus':
        geometryType = 'TorusGeometry';
        break;
      case 'cone':
        geometryType = 'ConeGeometry';
        break;
      case 'plane':
        geometryType = 'PlaneGeometry';
        break;
      case 'tetrahedron':
        geometryType = 'TetrahedronGeometry';
        break;
      case 'octahedron':
        geometryType = 'OctahedronGeometry';
        break;
      case 'dodecahedron':
        geometryType = 'DodecahedronGeometry';
        break;
      case 'icosahedron':
        geometryType = 'IcosahedronGeometry';
        break;
      default:
        geometryType = '';
    }
    
    if (geometryType) {
      const foundObject = allObjects.find(obj => obj.geometry.type === geometryType);
      if (foundObject) {
        currentObject = foundObject;
        return;
      }
    }
  }
  
  console.warn('未找到匹配的对象:', params);
};

// 按名称移除对象
const removeObjectByName = (params: { name: string }) => {
  const { name } = params;
  const objectIndex = allObjects.findIndex(obj => obj.name === name);
  
  if (objectIndex !== -1) {
    const objectToRemove = allObjects[objectIndex];
    
    // 如果是当前选中对象，清除当前对象
    if (objectToRemove === currentObject) {
      currentObject = null;
    }
    
    scene.remove(objectToRemove);
    allObjects.splice(objectIndex, 1); // 从列表中移除
  } else {
    console.warn('未找到要移除的对象:', name);
  }
};

// 设置场景背景颜色
const setBackgroundColor = (params: { color: string }) => {
  scene.background = new THREE.Color(params.color);
};

// 设置环境光
const setEnvironment = (params: { color: string; intensity: number }) => {
  const { color, intensity } = params;
  
  // 移除现有的环境光
  scene.children.forEach(child => {
    if (child instanceof THREE.AmbientLight && child !== ambientLight) {
      scene.remove(child);
    }
  });
  
  // 更新环境光
  ambientLight.color.set(color);
  ambientLight.intensity = intensity;
};

// 添加平行光
const addDirectionalLight = (params: { color: string; intensity: number; position?: { x?: number; y?: number; z?: number } }) => {
  const { color, intensity, position = { x: 5, y: 5, z: 5 } } = params;
  
  const light = new THREE.DirectionalLight(color, intensity);
  light.position.set(position.x || 5, position.y || 5, position.z || 5);
  scene.add(light);
};

// 添加点光源
const addPointLight = (params: { color: string; intensity: number; position?: { x?: number; y?: number; z?: number }; distance?: number }) => {
  const { color, intensity, position = { x: 0, y: 0, z: 0 }, distance = 0 } = params;
  
  const light = new THREE.PointLight(color, intensity, distance);
  light.position.set(position.x || 0, position.y || 0, position.z || 0);
  scene.add(light);
};

// 添加聚光灯
const addSpotLight = (params: { color: string; intensity: number; position?: { x?: number; y?: number; z?: number }; target?: { x?: number; y?: number; z?: number }; angle?: number }) => {
  const { color, intensity, position = { x: 5, y: 5, z: 5 }, target = { x: 0, y: 0, z: 0 }, angle = Math.PI / 6 } = params;
  
  const light = new THREE.SpotLight(color, intensity);
  light.position.set(position.x || 5, position.y || 5, position.z || 5);
  light.target.position.set(target.x || 0, target.y || 0, target.z || 0);
  light.angle = angle;
  scene.add(light);
  scene.add(light.target);
};

// 设置相机位置
const setCameraPosition = (params: { x?: number; y?: number; z?: number }) => {
  const { x = 0, y = 0, z = 5 } = params;
  camera.position.set(x, y, z);
  controls.update();
};

// 让相机看向指定位置
const lookAt = (params: { x?: number; y?: number; z?: number }) => {
  const { x = 0, y = 0, z = 0 } = params;
  camera.lookAt(x, y, z);
  controls.update();
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
  addMultipleObjects,
  selectObject,
  removeObject,
  removeObjectByName,
  rotateObject,
  scaleObject,
  moveObject,
  changeColor,
  changeMaterial,
  clearScene,
  setBackgroundColor,
  setEnvironment,
  addDirectionalLight,
  addPointLight,
  addSpotLight,
  setCameraPosition,
  lookAt
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
