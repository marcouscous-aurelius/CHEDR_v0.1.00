import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xfafafa);

// Debug visualization objects
const debugGroup = new THREE.Group();
scene.add(debugGroup);

// Debug materials
const debugMaterials = {
    detectionBox: new THREE.MeshBasicMaterial({ 
        color: 0x00ff00, 
        transparent: true, 
        opacity: 0.2,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide
    }),
    intersectionPoint: new THREE.MeshBasicMaterial({ 
        color: 0xff0000,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide
    }),
    activeZone: new THREE.MeshBasicMaterial({ 
        color: 0x0000ff, 
        transparent: true, 
        opacity: 0.3,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide
    })
};

// Create debug geometries with slightly larger size for detection (1.0 vs 0.9)
// Adding a small gap (0.1) between detection zones
const detectionBoxGeometry = new THREE.BoxGeometry(1.0, 1.0, 1.0);
const intersectionPointGeometry = new THREE.SphereGeometry(0.05, 8, 8);

// Helper function to create a wireframe version of a mesh
function createWireframeMesh(geometry, color) {
    const wireframe = new THREE.WireframeGeometry(geometry);
    const line = new THREE.LineSegments(
        wireframe,
        new THREE.LineBasicMaterial({ 
            color: color,
            transparent: true,
            opacity: 0.5,
            depthTest: false,
            depthWrite: false
        })
    );
    return line;
}

// Helper function to check if a point is inside a box with margin
function isPointInBox(point, boxCenter, boxSize, margin) {
    const halfSize = boxSize / 2;
    return Math.abs(point.x - boxCenter.x) <= halfSize - margin &&
           Math.abs(point.y - boxCenter.y) <= halfSize - margin &&
           Math.abs(point.z - boxCenter.z) <= halfSize - margin;
}

// Create a helper function to find the best cube to interact with
function findBestCubeToInteract(intersects) {
    // Clear previous debug visualization
    debugGroup.clear();

    // Check if any cube is currently animating
    isAnyCubeAnimating = false;
    cubeGroup.children.forEach(cube => {
        const anim = cubeAnimations.get(cube);
        if (anim.isAnimating) {
            isAnyCubeAnimating = true;
        }
    });
    
    // If any cube is animating or pushed out, only show its detection box and prevent new selections
    if (isAnyCubeAnimating || hoveredCube) {
        const targetCube = hoveredCube || Array.from(cubeAnimations.entries()).find(([cube, anim]) => anim.isAnimating)?.[0];
        if (targetCube) {
            // Show active detection zone
            const detectionBox = new THREE.Mesh(
                detectionBoxGeometry,
                debugMaterials.activeZone
            );
            detectionBox.position.copy(targetCube.position);
            detectionBox.renderOrder = 998;

            const wireframe = createWireframeMesh(
                detectionBoxGeometry, 
                0x0000ff
            );
            wireframe.position.copy(targetCube.position);
            wireframe.renderOrder = 998;
            
            debugGroup.add(detectionBox);
            debugGroup.add(wireframe);

            // Show intersection point if exists
            if (intersects.length > 0) {
                const intersectionPoint = new THREE.Mesh(
                    intersectionPointGeometry,
                    debugMaterials.intersectionPoint
                );
                intersectionPoint.position.copy(intersects[0].point);
                intersectionPoint.renderOrder = 999;
                debugGroup.add(intersectionPoint);

                // Check if we're still inside the active cube's detection zone
                if (!isPointInBox(intersects[0].point, targetCube.position, 1.0, 0.05)) {
                    // If we're outside and it's not already returning, start return animation
                    const anim = cubeAnimations.get(targetCube);
                    if (!anim.isReturning && hoveredCube === targetCube) {
                        hoveredCube.material.color.setHex(0xffffff);
                        anim.isAnimating = true;
                        anim.isReturning = true;
                        anim.startTime = performance.now() / 1000;
                        anim.startPos.copy(hoveredCube.position);
                        anim.targetPos.copy(originalPositions.get(hoveredCube));
                        hoveredCube = null;
                    }
                }
            } else if (hoveredCube === targetCube) {
                // If no intersection at all, definitely start return animation
                hoveredCube.material.color.setHex(0xffffff);
                const anim = cubeAnimations.get(targetCube);
                if (!anim.isReturning) {
                    anim.isAnimating = true;
                    anim.isReturning = true;
                    anim.startTime = performance.now() / 1000;
                    anim.startPos.copy(hoveredCube.position);
                    anim.targetPos.copy(originalPositions.get(hoveredCube));
                }
                hoveredCube = null;
            }

            return hoveredCube;
        }
    }

    // Only proceed with new selection if no cube is active
    if (intersects.length === 0) return null;

    // Get the closest intersection
    const intersection = intersects[0];
    const point = intersection.point;
    
    // Visualize intersection point
    const intersectionPoint = new THREE.Mesh(
        intersectionPointGeometry,
        debugMaterials.intersectionPoint
    );
    intersectionPoint.position.copy(point);
    intersectionPoint.renderOrder = 999;
    debugGroup.add(intersectionPoint);
    
    // Find the best cube to interact with
    let bestCube = null;
    let bestDistance = Infinity;
    const margin = 0.05;
    
    cubeGroup.children.forEach(cube => {
        // Show detection zone for each cube
        const detectionBox = new THREE.Mesh(
            detectionBoxGeometry,
            debugMaterials.detectionBox
        );
        detectionBox.position.copy(cube.position);
        detectionBox.renderOrder = 998;

        const wireframe = createWireframeMesh(
            detectionBoxGeometry, 
            0x00ff00
        );
        wireframe.position.copy(cube.position);
        wireframe.renderOrder = 998;
        
        debugGroup.add(detectionBox);
        debugGroup.add(wireframe);
        
        // Check if point is inside this cube's detection zone
        if (isPointInBox(point, cube.position, 1.0, margin)) {
            const distance = point.distanceTo(cube.position);
            if (distance < bestDistance) {
                bestDistance = distance;
                bestCube = cube;
            }
        }
    });
    
    return bestCube;
}

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
            cube.position.set(x, y + 1.35, z);
            cube.castShadow = true;
            cube.receiveShadow = true;
            // Store original position
            originalPositions.set(cube, cube.position.clone());
            // Initialize animation data
            cubeAnimations.set(cube, {
                isExtended: false,
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

// Helper function to check if a point is near a position
function isPointNearPosition(point, position, radius) {
    return point.distanceTo(position) < radius;
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Update raycaster
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(cubeGroup.children, false);
    
    // Find the closest intersection
    const intersection = intersects.length > 0 ? intersects[0].point : null;
    let newHoveredCube = null;

    // Check each cube for hover state
    cubeGroup.children.forEach(cube => {
        const anim = cubeAnimations.get(cube);
        const originalPos = originalPositions.get(cube);
        
        // Define hover zones
        const hoverRadius = 0.4; // Smaller than half cube size to create dead zones
        let isHovered = false;

        if (intersection) {
            // Check if mouse is near either the current position or original position
            isHovered = isPointNearPosition(intersection, cube.position, hoverRadius) ||
                       (anim.isExtended && isPointNearPosition(intersection, originalPos, hoverRadius));
        }

        // Update hover state
        if (isHovered) {
            newHoveredCube = cube;
            if (!anim.isExtended) {
                // Extend the cube
                const direction = new THREE.Vector3();
                direction.subVectors(cube.position, new THREE.Vector3(0, 1.35, 0)).normalize();
                anim.targetPosition.copy(originalPos).addScaledVector(direction, ANIMATION_CONFIG.moveDistance);
                anim.isExtended = true;
                cube.material.color.setHex(0xe0e0e0);
            }
        } else if (anim.isExtended) {
            // Retract the cube
            anim.targetPosition.copy(originalPos);
            anim.isExtended = false;
            cube.material.color.setHex(0xffffff);
        }

        // Smooth position update
        cube.position.lerp(anim.targetPosition, 0.15);
    });

    hoveredCube = newHoveredCube;

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