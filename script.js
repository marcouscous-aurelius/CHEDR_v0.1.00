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

// Touch state tracking
const touchState = {
    isTouching: false,
    lastTouchX: 0,
    lastTouchY: 0,
    touchStartX: 0,
    touchStartY: 0,
    touchStartTime: 0
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

// Touch event handlers for 3D scene
const canvas = document.querySelector('#threejs-container');

// Prevent default touch behavior on canvas to avoid scrolling
canvas.addEventListener('touchstart', (event) => {
    event.preventDefault();
    const touch = event.touches[0];
    touchState.isTouching = true;
    touchState.lastTouchX = touch.clientX;
    touchState.lastTouchY = touch.clientY;
    touchState.touchStartX = touch.clientX;
    touchState.touchStartY = touch.clientY;
    touchState.touchStartTime = Date.now();
    
    // Update mouse position for 3D interaction
    mouse.target.x = (touch.clientX / window.innerWidth - 0.5) * 2;
    mouse.target.y = (touch.clientY / window.innerHeight - 0.5) * 2;
    mouse.isInWindow = true;
    
    // Update pointer for raycasting
    pointer.x = (touch.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(touch.clientY / window.innerHeight) * 2 + 1;
    pointerPixel.x = touch.clientX;
    pointerPixel.y = touch.clientY;
}, { passive: false });

canvas.addEventListener('touchmove', (event) => {
    event.preventDefault();
    const touch = event.touches[0];
    
    // Update mouse position for camera movement
    mouse.target.x = (touch.clientX / window.innerWidth - 0.5) * 2;
    mouse.target.y = (touch.clientY / window.innerHeight - 0.5) * 2;
    
    // Update pointer for raycasting
    pointer.x = (touch.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(touch.clientY / window.innerHeight) * 2 + 1;
    pointerPixel.x = touch.clientX;
    pointerPixel.y = touch.clientY;
    
    touchState.lastTouchX = touch.clientX;
    touchState.lastTouchY = touch.clientY;
}, { passive: false });

canvas.addEventListener('touchend', (event) => {
    event.preventDefault();
    touchState.isTouching = false;
    
    // Check if this was a tap (short duration, small movement)
    const touchDuration = Date.now() - touchState.touchStartTime;
    const touchDistance = Math.sqrt(
        Math.pow(touchState.lastTouchX - touchState.touchStartX, 2) +
        Math.pow(touchState.lastTouchY - touchState.touchStartY, 2)
    );
    
    // If it was a tap and not a drag, we could add tap functionality here
    if (touchDuration < 300 && touchDistance < 10) {
        // This was a tap - could add tap-to-focus or other tap interactions
    }
}, { passive: false });

// Prevent touch events from bubbling up to parent elements
canvas.addEventListener('touchcancel', (event) => {
    event.preventDefault();
    touchState.isTouching = false;
}, { passive: false });

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
    metalness: 0.1,
    transparent: true,
    opacity: 0.5
});

// Setup raycaster
const raycaster = new THREE.Raycaster();
raycaster.params.Mesh.threshold = 0;
const pointer = new THREE.Vector2();
const pointerPixel = { x: -10000, y: -10000 };
let originalPositions = new Map();
// const cubeAnimations = new Map(); // Removed unused variable

// Animation configuration
const ANIMATION_CONFIG = {
    moveDistance: 1.62    // 60% of cube size (0.9 * 0.6 = 0.54)
};

// Cursor influence radius in pixels (variable, controlled by slider)
let influenceRadius = 100;

// Track pointer movement for raycasting
window.addEventListener('pointermove', (event) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    pointerPixel.x = event.clientX;
    pointerPixel.y = event.clientY;
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
            // Unused animation data removed
            // cubeAnimations.set(cube, {
            //     isExtended: false,
            //     isReturning: false,
            //     targetPosition: cube.position.clone()
            // });
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

// ===============================
// UI: Toggle Inner Cubes
// ===============================
const toggleInnerCubesEl = document.getElementById('toggleInnerCubes');
if (toggleInnerCubesEl) {
    const updateInnerCubesVisibility = () => {
        const showInner = toggleInnerCubesEl.checked;
        cubeGroup.children.forEach(cube => {
            const { x, y, z } = cube.gridPosition;
            const isInner = x > 0 && x < gridSize - 1 &&
                            y > 0 && y < gridSize - 1 &&
                            z > 0 && z < gridSize - 1;
            if (isInner) {
                cube.visible = showInner;
                // Toggle corresponding hitbox visibility as well
                hitboxGroup.children.forEach(hitbox => {
                    if (hitbox.userData.visualCube === cube) {
                        hitbox.visible = showInner;
                    }
                });
            }
        });
    };

    // Initial state
    updateInnerCubesVisibility();

    // Listen for changes
    toggleInnerCubesEl.addEventListener('change', updateInnerCubesVisibility);
}

// UI: Toggle Transparency
// ===============================
const toggleTransparencyEl = document.getElementById('toggleTransparency');
if (toggleTransparencyEl) {
    const updateTransparency = () => {
        const transparent = toggleTransparencyEl.checked; // true => opacity 0.5, false => 1
        const newOpacity = transparent ? 0.5 : 1;
        cubeGroup.children.forEach(cube => {
            cube.material.opacity = newOpacity;
        });
    };

    // initial
    updateTransparency();
    toggleTransparencyEl.addEventListener('change', updateTransparency);
}

// Add js class to enable dynamic features
document.documentElement.classList.add('js');

// ===============================
// Slider: Influence Radius
// ===============================
const influenceSliderEl = document.getElementById('influenceSlider');
if (influenceSliderEl) {
    const rangeSlider = influenceSliderEl.closest('.range-slider');
    const output = rangeSlider.querySelector('output');

    const updateInfluence = () => {
        const value = parseInt(influenceSliderEl.value, 10);
        influenceRadius = value;
        
        // Calculate percentage position for the fill bar
        const min = parseInt(influenceSliderEl.min, 10);
        const max = parseInt(influenceSliderEl.max, 10);
        const percent = ((value - min) / (max - min)) * 100;

        // Update CSS custom property to drive the filled part of the slider
        rangeSlider.style.setProperty('--range-progress', `${percent}%`);
        
        // Update the label text with current value
        const influenceValue = document.getElementById('influenceValue');
        if (influenceValue) {
            influenceValue.textContent = value;
        }
        
        // Update output tooltip
        if (output) {
            output.textContent = value;
        }
    };

    // Add hover effect
    influenceSliderEl.addEventListener('mouseenter', () => {
        rangeSlider.classList.add('slider-hover');
    });
    
    influenceSliderEl.addEventListener('mouseleave', () => {
        rangeSlider.classList.remove('slider-hover');
    });

    updateInfluence();
    influenceSliderEl.addEventListener('input', updateInfluence);
}

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 8;
controls.maxDistance = 40;

// Enable touch controls for mobile devices
controls.enablePan = true;
controls.enableZoom = true;
controls.enableRotate = true;

// Adjust touch sensitivity for better mobile experience
controls.touches = {
    ONE: THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY_PAN
};

// Increase damping for smoother touch interaction
controls.dampingFactor = 0.1;
controls.rotateSpeed = 0.8;
controls.zoomSpeed = 0.8;
controls.panSpeed = 0.8;

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
        if (!cube.visible) return; // skip hidden inner cubes
        const originalPos = originalPositions.get(cube);
        const center = new THREE.Vector3(0, (gridSize - 1) / 2 + 0.5, 0);
        const relativePos = new THREE.Vector3().subVectors(originalPos, center);
        const direction = new THREE.Vector3();

        // Determine extension direction
        if (
            cube.gridPosition.y === gridSize - 1 &&
            cube.gridPosition.x > 0 && cube.gridPosition.x < gridSize - 1 &&
            cube.gridPosition.z > 0 && cube.gridPosition.z < gridSize - 1
        ) {
            direction.set(0, 1, 0);
        } else {
            if (Math.abs(relativePos.x) >= Math.abs(relativePos.z)) {
                direction.set(Math.sign(relativePos.x), 0, 0);
            } else {
                direction.set(0, 0, Math.sign(relativePos.z));
            }
        }

        // Project cube position to screen space to measure distance to cursor
        const screenPos = cube.position.clone().project(camera);
        const cubeScreenX = (screenPos.x + 1) * 0.5 * window.innerWidth;
        const cubeScreenY = (-screenPos.y + 1) * 0.5 * window.innerHeight;
        const dx = cubeScreenX - pointerPixel.x;
        const dy = cubeScreenY - pointerPixel.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        let influence = 1 - distance / influenceRadius;
        if (influence < 0) influence = 0;

        // Prevent overlapping by ensuring no neighbor along direction when influence > 0
        if (influence > 0 && hasNeighbor(cube, direction.x, direction.y, direction.z)) {
            influence = 0;
        }

        const desiredTarget = originalPos.clone().addScaledVector(direction, ANIMATION_CONFIG.moveDistance * influence);
        cube.position.lerp(desiredTarget, 0.1);

        // Optional color feedback – darker based on movement extent
        const colorIntensity = 1 - 0.88 * influence; // 0.7 (max dark) .. 1 (white)
        cube.material.color.setRGB(colorIntensity, colorIntensity, colorIntensity);
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

// ===============================
// Draggable toolbox with reset
// ===============================
const toolboxEl = document.querySelector('.toolbox');
if (toolboxEl) {
    // Capture original metrics once (after styles have applied)
    const originalRect = toolboxEl.getBoundingClientRect();
    const originalState = {
        top: originalRect.top,
        left: originalRect.left,
        width: originalRect.width
    };

    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    
    // Smooth dragging variables
    let currentLeft = originalRect.left;
    let currentTop = originalRect.top;
    let targetLeft = originalRect.left;
    let targetTop = originalRect.top;
    const dragEase = 0.15; // Controls the delay - lower = more delay
    
    // Momentum/flick variables
    let velocityX = 0;
    let velocityY = 0;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let lastTime = 0;
    const friction = 0.95; // How quickly momentum decays
    const maxVelocity = 50; // Maximum velocity to prevent excessive speed

    const isResizeHandle = (e) => {
        const rect = toolboxEl.getBoundingClientRect();
        const offsetRight = rect.right - e.clientX;
        const offsetBottom = rect.bottom - e.clientY;
        // Same 16 px corner allowance as native resize cursor
        return offsetRight <= 16 && offsetBottom <= 16;
    };

    toolboxEl.addEventListener('mousedown', (e) => {
        if (e.target.closest('input, label')) return; // do not start drag on UI controls
        if (isResizeHandle(e)) return;               // let native corner resize work

        isDragging = true;
        const rect = toolboxEl.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
        
        // Update current position to match actual position
        currentLeft = rect.left;
        currentTop = rect.top;
        targetLeft = rect.left;
        targetTop = rect.top;
        
        // Reset momentum when starting new drag
        velocityX = 0;
        velocityY = 0;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        lastTime = Date.now();

        // Switch anchoring to left/top for free movement
        toolboxEl.style.right = 'auto';
        toolboxEl.style.left = `${rect.left}px`;
        toolboxEl.style.top = `${rect.top}px`;
        document.body.style.userSelect = 'none';
    });

    // Touch event handlers for toolbox dragging
    toolboxEl.addEventListener('touchstart', (e) => {
        if (e.target.closest('input, label')) return; // do not start drag on UI controls
        
        const touch = e.touches[0];
        const rect = toolboxEl.getBoundingClientRect();
        
        // Check if touch is in resize handle area
        const offsetRight = rect.right - touch.clientX;
        const offsetBottom = rect.bottom - touch.clientY;
        if (offsetRight <= 16 && offsetBottom <= 16) return; // let native resize work
        
        e.preventDefault(); // Prevent default touch behavior
        
        isDragging = true;
        dragOffsetX = touch.clientX - rect.left;
        dragOffsetY = touch.clientY - rect.top;
        
        // Update current position to match actual position
        currentLeft = rect.left;
        currentTop = rect.top;
        targetLeft = rect.left;
        targetTop = rect.top;
        
        // Reset momentum when starting new drag
        velocityX = 0;
        velocityY = 0;
        lastMouseX = touch.clientX;
        lastMouseY = touch.clientY;
        lastTime = Date.now();

        // Switch anchoring to left/top for free movement
        toolboxEl.style.right = 'auto';
        toolboxEl.style.left = `${rect.left}px`;
        toolboxEl.style.top = `${rect.top}px`;
        document.body.style.userSelect = 'none';
    }, { passive: false });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        // Calculate velocity for momentum
        const currentTime = Date.now();
        const deltaTime = currentTime - lastTime;
        if (deltaTime > 0) {
            const deltaX = e.clientX - lastMouseX;
            const deltaY = e.clientY - lastMouseY;
            velocityX = (deltaX / deltaTime) * 16; // Scale for smooth motion
            velocityY = (deltaY / deltaTime) * 16;
            
            // Clamp velocity to prevent excessive speed
            velocityX = Math.max(-maxVelocity, Math.min(maxVelocity, velocityX));
            velocityY = Math.max(-maxVelocity, Math.min(maxVelocity, velocityY));
        }
        
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        lastTime = currentTime;
        
        // Update target position
        targetLeft = e.clientX - dragOffsetX;
        targetTop = e.clientY - dragOffsetY;
    });

    // Touch move handler for toolbox
    document.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        
        const touch = e.touches[0];
        
        // Calculate velocity for momentum
        const currentTime = Date.now();
        const deltaTime = currentTime - lastTime;
        if (deltaTime > 0) {
            const deltaX = touch.clientX - lastMouseX;
            const deltaY = touch.clientY - lastMouseY;
            velocityX = (deltaX / deltaTime) * 16; // Scale for smooth motion
            velocityY = (deltaY / deltaTime) * 16;
            
            // Clamp velocity to prevent excessive speed
            velocityX = Math.max(-maxVelocity, Math.min(maxVelocity, velocityX));
            velocityY = Math.max(-maxVelocity, Math.min(maxVelocity, velocityY));
        }
        
        lastMouseX = touch.clientX;
        lastMouseY = touch.clientY;
        lastTime = currentTime;
        
        // Update target position
        targetLeft = touch.clientX - dragOffsetX;
        targetTop = touch.clientY - dragOffsetY;
    }, { passive: false });

    const stopDrag = () => {
        if (!isDragging) return;
        isDragging = false;
        document.body.style.userSelect = '';
        // Keep the momentum going after release
    };

    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('mouseleave', stopDrag);
    document.addEventListener('touchend', stopDrag);
    document.addEventListener('touchcancel', stopDrag);

    // Smooth dragging animation with momentum
    function updateToolboxPosition() {
        if (isDragging) {
            // Smoothly interpolate current position towards target
            currentLeft += (targetLeft - currentLeft) * dragEase;
            currentTop += (targetTop - currentTop) * dragEase;
        } else {
            // Apply momentum when not dragging
            if (Math.abs(velocityX) > 0.1 || Math.abs(velocityY) > 0.1) {
                currentLeft += velocityX;
                currentTop += velocityY;
                
                // Apply friction to slow down momentum
                velocityX *= friction;
                velocityY *= friction;
                
                // Stop very small velocities
                if (Math.abs(velocityX) < 0.1) velocityX = 0;
                if (Math.abs(velocityY) < 0.1) velocityY = 0;
            }
        }
        
        // Apply the position
        toolboxEl.style.left = `${currentLeft}px`;
        toolboxEl.style.top = `${currentTop}px`;
        
        requestAnimationFrame(updateToolboxPosition);
    }
    updateToolboxPosition();

    // Double-click to reset size & position (with smooth animation)
    toolboxEl.addEventListener('dblclick', (e) => {
        if (e.target.closest('input, label')) return; // ignore if dbl-clicking controls

        // Enable transition for smooth return
        toolboxEl.style.transition = 'left 0.45s cubic-bezier(0.22, 1, 0.36, 1), top 0.45s cubic-bezier(0.22, 1, 0.36, 1), width 0.45s cubic-bezier(0.22, 1, 0.36, 1)';

        // Restore width
        toolboxEl.style.width = `${originalState.width}px`;
        // Restore position
        toolboxEl.style.left = `${originalState.left}px`;
        toolboxEl.style.top = `${originalState.top}px`;
        
        // Update current and target positions to match reset
        currentLeft = originalState.left;
        currentTop = originalState.top;
        targetLeft = originalState.left;
        targetTop = originalState.top;
        
        // Reset momentum when resetting position
        velocityX = 0;
        velocityY = 0;

        // After transition, clean up and re-anchor to right to stay fixed on resize
        const handleTransitionEnd = () => {
            toolboxEl.style.transition = '';
            toolboxEl.style.right = '20px';
            toolboxEl.style.left = 'auto';
            // Leave width fixed so user sees the intended size; they can still resize later.
            toolboxEl.removeEventListener('transitionend', handleTransitionEnd);
        };
        toolboxEl.addEventListener('transitionend', handleTransitionEnd);
    });

    // Double-tap to reset size & position (touch equivalent of double-click)
    let lastTapTime = 0;
    toolboxEl.addEventListener('touchend', (e) => {
        if (e.target.closest('input, label')) return; // ignore if tapping controls
        
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTapTime;
        
        if (tapLength < 500 && tapLength > 0) {
            // Double-tap detected
            e.preventDefault();
            
            // Enable transition for smooth return
            toolboxEl.style.transition = 'left 0.45s cubic-bezier(0.22, 1, 0.36, 1), top 0.45s cubic-bezier(0.22, 1, 0.36, 1), width 0.45s cubic-bezier(0.22, 1, 0.36, 1)';

            // Restore width
            toolboxEl.style.width = `${originalState.width}px`;
            // Restore position
            toolboxEl.style.left = `${originalState.left}px`;
            toolboxEl.style.top = `${originalState.top}px`;
            
            // Update current and target positions to match reset
            currentLeft = originalState.left;
            currentTop = originalState.top;
            targetLeft = originalState.left;
            targetTop = originalState.top;
            
            // Reset momentum when resetting position
            velocityX = 0;
            velocityY = 0;

            // After transition, clean up and re-anchor to right to stay fixed on resize
            const handleTransitionEnd = () => {
                toolboxEl.style.transition = '';
                toolboxEl.style.right = '20px';
                toolboxEl.style.left = 'auto';
                // Leave width fixed so user sees the intended size; they can still resize later.
                toolboxEl.removeEventListener('transitionend', handleTransitionEnd);
            };
            toolboxEl.addEventListener('transitionend', handleTransitionEnd);
            
            lastTapTime = 0; // Reset to prevent triple-tap
        } else {
            lastTapTime = currentTime;
        }
    }, { passive: false });
} 