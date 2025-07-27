import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xfafafa);

// Camera
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
const cameraStartPosition = new THREE.Vector3(8, 5, 8);
camera.position.copy(cameraStartPosition);
camera.lookAt(0, 0, 0);

// Mouse position for camera movement
const mouse = {
    x: 0,
    y: 0,
    target: { x: 0, y: 0 },
    isInWindow: false
};

// Track mouse movement
window.addEventListener('mousemove', (event) => {
    mouse.target.x = (event.clientX / window.innerWidth - 0.5) * 2;  // -1 to 1
    mouse.target.y = (event.clientY / window.innerHeight - 0.5) * 2; // -1 to 1
    mouse.isInWindow = true;
});

// Track when mouse leaves window
window.addEventListener('mouseout', () => {
    mouse.isInWindow = false;
});

// Track when mouse enters window
window.addEventListener('mouseover', () => {
    mouse.isInWindow = true;
});

// Renderer
const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector('#threejs-container'),
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Enable shadow mapping with higher quality settings
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
scene.add(ambientLight);

// Main directional light with enhanced shadows
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(20, 20, 10); // Positioned for long shadows
directionalLight.castShadow = true;

// Enhance shadow quality
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 1;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -10;
directionalLight.shadow.camera.right = 10;
directionalLight.shadow.camera.top = 10;
directionalLight.shadow.camera.bottom = -10;
directionalLight.shadow.bias = -0.0001;
directionalLight.shadow.normalBias = 0.001;

// Uncomment these lines to see the shadow camera frustum
// const helper = new THREE.CameraHelper(directionalLight.shadow.camera);
// scene.add(helper);

scene.add(directionalLight);

// Axis and labels helper
const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

function createAxisLabel(text, position) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const size = 128;
    canvas.width = size;
    canvas.height = size;

    context.font = `Bold 60px Arial`;
    context.fillStyle = 'rgba(0, 0, 0, 1.0)';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, size / 2, size / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(0.5, 0.5, 0.5);
    sprite.position.copy(position);
    sprite.renderOrder = 999;
    return sprite;
}

scene.add(createAxisLabel('X', new THREE.Vector3(5.5, 0, 0)));
scene.add(createAxisLabel('Y', new THREE.Vector3(0, 5.5, 0)));
scene.add(createAxisLabel('Z', new THREE.Vector3(0, 0, 5.5)));

// Floor with improved material for better shadow reception
const floorGeometry = new THREE.PlaneGeometry(30, 30); // Larger floor for longer shadows
const floorMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0.1,
    envMapIntensity: 0.5
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// Create 3x3x3 cube structure with improved materials
const cubeGroup = new THREE.Group();
const smallCubeGeometry = new THREE.BoxGeometry(0.9, 0.9, 0.9);
const smallCubeMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffffff,
    roughness: 0.7,
    metalness: 0.1
});

// Setup raycaster
const raycaster = new THREE.Raycaster();
raycaster.params.Mesh.threshold = 0;
const pointer = new THREE.Vector2();
let hoveredCube = null;
let originalPositions = new Map();
const cubeAnimations = new Map();

// Animation configuration
const ANIMATION_CONFIG = {
    moveDistance: 0.54    // 60% of cube size (0.9 * 0.6 = 0.54)
};

// Track pointer movement for raycasting
window.addEventListener('pointermove', (event) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

// Create and position small cubes
for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
            const cube = new THREE.Mesh(smallCubeGeometry, smallCubeMaterial.clone());
            cube.position.set(x, y + 1.45, z);
            cube.castShadow = true;
            cube.receiveShadow = true;
            // Store original position
            originalPositions.set(cube, cube.position.clone());
            // Initialize animation data
            cubeAnimations.set(cube, {
                isExtended: false,
                isReturning: false,
                targetPosition: cube.position.clone()
            });
            cubeGroup.add(cube);
        }
    }
}

scene.add(cubeGroup);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 5;
controls.maxDistance = 20;

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Update raycaster
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(cubeGroup.children, false);
    const intersectedCube = intersects.length > 0 ? intersects[0].object : null;

    // Handle cube retraction
    if (hoveredCube && hoveredCube !== intersectedCube) {
        const anim = cubeAnimations.get(hoveredCube);
        if (anim.isExtended && !anim.isReturning) {
            anim.isReturning = true;
            anim.targetPosition.copy(originalPositions.get(hoveredCube));
            hoveredCube.material.color.setHex(0xffffff);
        }
    }

    // Handle cube extension
    if (intersectedCube) {
        const anim = cubeAnimations.get(intersectedCube);
        if (!anim.isExtended && !anim.isReturning) {
            const direction = new THREE.Vector3();
            const originalPos = originalPositions.get(intersectedCube);
            direction.subVectors(intersectedCube.position, new THREE.Vector3(0, 1.45, 0)).normalize();
            
            // For the bottom cubes, project movement onto the floor plane
            if (originalPos.y < 0.6) {
                direction.y = 0;
                direction.normalize(); 
            }

            anim.targetPosition.copy(originalPos).addScaledVector(direction, ANIMATION_CONFIG.moveDistance);
            anim.isExtended = true;
            intersectedCube.material.color.setHex(0xe0e0e0);
        }
    }
    
    hoveredCube = intersectedCube;

    // Animate all cubes
    cubeGroup.children.forEach(cube => {
        const anim = cubeAnimations.get(cube);
        cube.position.lerp(anim.targetPosition, 0.1);

        // Reset returning flag when cube is back in place
        if (anim.isReturning && cube.position.distanceTo(anim.targetPosition) < 0.01) {
            anim.isReturning = false;
            anim.isExtended = false;
        }
    });
    
    // Update camera position based on mouse
    const ease = 0.05;
    if (mouse.isInWindow) {
        mouse.x += (mouse.target.x - mouse.x) * ease;
        mouse.y += (mouse.target.y - mouse.y) * ease;
    } else {
        // Return to center when mouse leaves window
        mouse.x += (0 - mouse.x) * ease;
        mouse.y += (0 - mouse.y) * ease;
    }
    
    // Update camera position
    const cameraOffset = {
        x: mouse.x * 0.5,
        y: -mouse.y * 0.3,
        z: -mouse.x * 0.3
    };
    
    camera.position.x = cameraStartPosition.x + cameraOffset.x;
    camera.position.y = cameraStartPosition.y + cameraOffset.y;
    camera.position.z = cameraStartPosition.z + cameraOffset.z;
    
    // Always look at the center
    camera.lookAt(0, 0, 0);

    // Update camera controls
    controls.update();
    
    // Render the scene
    renderer.render(scene, camera);
}

animate(); 