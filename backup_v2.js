import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xfafafa);

// Camera
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
const cameraStartPosition = new THREE.Vector3(15, 10, 15);
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

scene.add(directionalLight);

// Axis and labels helper
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
    sprite.scale.set(0.17, 0.17, 0.17);
    sprite.position.copy(position);
    sprite.renderOrder = 999;
    return sprite;
}

const gizmoGroup = new THREE.Group();
const axesHelper = new THREE.AxesHelper(0.66);
gizmoGroup.add(axesHelper);

gizmoGroup.add(createAxisLabel('X', new THREE.Vector3(0.85, 0, 0)));
gizmoGroup.add(createAxisLabel('Y', new THREE.Vector3(0, 0.85, 0)));
gizmoGroup.add(createAxisLabel('Z', new THREE.Vector3(0, 0, 0.85)));

gizmoGroup.position.set(6, 0.5, 0);
scene.add(gizmoGroup);

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

// Create cube structure with improved materials
const cubeGroup = new THREE.Group();
const hitboxGroup = new THREE.Group();
scene.add(hitboxGroup);
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
let originalPositions = new Map();
const cubeAnimations = new Map();

// Animation configuration
const ANIMATION_CONFIG = {
    moveDistance: 1.62    // 60% of cube size (0.9 * 0.6 = 0.54)
};

// Track pointer movement for raycasting
window.addEventListener('pointermove', (event) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

// Create and position small cubes
const gridSize = 6;
const gridCenterOffset = (gridSize - 1) / 2;
for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
        for (let z = 0; z < gridSize; z++) {
            const cube = new THREE.Mesh(smallCubeGeometry, smallCubeMaterial.clone());
            const xPos = (x - gridCenterOffset);
            const yPos = y + 0.5;
            const zPos = (z - gridCenterOffset);
            cube.position.set(xPos, yPos, zPos);
            cube.castShadow = true;
            cube.receiveShadow = true;
            // Store original position
            originalPositions.set(cube, cube.position.clone());
            // Add grid position for collision detection
            cube.gridPosition = { x, y, z };
            // Initialize animation data
            cubeAnimations.set(cube, {
                isExtended: false,
                isReturning: false,
                targetPosition: cube.position.clone()
            });
            cubeGroup.add(cube);

            // Create invisible hitbox at the original position
            const hitbox = new THREE.Mesh(
                smallCubeGeometry,
                new THREE.MeshBasicMaterial({ visible: false })
            );
            hitbox.position.copy(cube.position);
            hitbox.userData.visualCube = cube;
            hitboxGroup.add(hitbox);
        }
    }
}

scene.add(cubeGroup);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 8;
controls.maxDistance = 40;

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Helper function to check if a cube has a neighbor at a given grid offset
function hasNeighbor(cube, dx, dy, dz) {
    const { x, y, z } = cube.gridPosition;
    const newX = x + dx;
    const newY = y + dy;
    const newZ = z + dz;
    return cubeGroup.children.some(c => 
        c.gridPosition.x === newX &&
        c.gridPosition.y === newY &&
        c.gridPosition.z === newZ
    );
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Update raycaster to intersect with hitboxes
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(hitboxGroup.children, false);
    const intersectedHitbox = intersects.length > 0 ? intersects[0].object : null;
    const intersectedCube = intersectedHitbox ? intersectedHitbox.userData.visualCube : null;

    cubeGroup.children.forEach(cube => {
        const anim = cubeAnimations.get(cube);
        const isCurrentlyHovered = (cube === intersectedCube);

        if (isCurrentlyHovered && !anim.isExtended && !anim.isReturning) {
            // Extend
            const originalPos = originalPositions.get(cube);
            const center = new THREE.Vector3(0, (gridSize - 1) / 2 + 0.5, 0);
            const relativePos = new THREE.Vector3().subVectors(originalPos, center);
            const direction = new THREE.Vector3();

            if (Math.abs(relativePos.x) >= Math.abs(relativePos.z)) {
                direction.set(Math.sign(relativePos.x), 0, 0);
            } else {
                direction.set(0, 0, Math.sign(relativePos.z));
            }

            if (!hasNeighbor(cube, direction.x, direction.y, direction.z)) {
                anim.targetPosition.copy(originalPos).addScaledVector(direction, ANIMATION_CONFIG.moveDistance);
                anim.isExtended = true;
                cube.material.color.setHex(0xe0e0e0);
            }
        } else if (!isCurrentlyHovered && anim.isExtended && !anim.isReturning) {
            // Retract
            anim.isReturning = true;
            anim.targetPosition.copy(originalPositions.get(cube));
            cube.material.color.setHex(0xffffff);
        }
    });

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