import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xfafafa);

// Global state for the fog color, initialized to default
let currentFogColor = new THREE.Color(0xfafafa);

// Lightning effects state
let lightningEnabled = true;
let lightningStrength = 10.0; // Increased by 500% (from 2.0 to 10.0)
let lightningColor = new THREE.Color(0x00ffff);
let lightningFadeSpeed = 0.05;
let lightningEffects = new Map(); // Track lightning state for each cube



// Fog will be initialized by the fog controls

// Camera - Use window.innerHeight initially, will be updated by stable viewport system
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
const cameraStartPosition = new THREE.Vector3(15, 12, 15);
camera.position.copy(cameraStartPosition);
camera.lookAt(0, 0, 0);

// Camera orbit controls for all devices
let orbitControls = null;
let isDesktop = !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                  'ontouchstart' in window || 
                  navigator.maxTouchPoints > 0);

// Passive orbit variables
let passiveOrbitActive = false;
let passiveOrbitTarget = new THREE.Vector3();
let passiveOrbitSmoothness = 0.02; // Very slow and smooth movement
let passiveOrbitIntensity = 0.1; // Subtle movement intensity



// Setup raycaster and pointer (moved up to avoid reference errors)
const raycaster = new THREE.Raycaster();
raycaster.params.Mesh.threshold = 0;
const pointer = new THREE.Vector2();
const pointerPixel = { x: -10000, y: -10000 };



const canvas = document.querySelector('#threejs-container');

// Initialize camera orbit controls for all devices
console.log('Device detection:', isDesktop ? 'Desktop detected' : 'Mobile detected');
console.log('OrbitControls available:', typeof OrbitControls !== 'undefined' ? 'Yes' : 'No');

// Initialize orbit controls for all devices
try {
    orbitControls = new OrbitControls(camera, canvas);
    console.log('OrbitControls initialized successfully');
} catch (error) {
    console.error('Failed to initialize OrbitControls:', error);
}
    
    // Configure orbit controls for proper interaction
    orbitControls.enabled = false; // Start disabled by default (cube interaction mode)
    orbitControls.enableDamping = true; // Enable damping for smooth movement
    orbitControls.dampingFactor = 0.05; // Smooth damping
    orbitControls.enableZoom = true; // Enable zoom
    orbitControls.enablePan = true; // Enable pan
    orbitControls.enableRotate = true; // Enable rotate
    orbitControls.autoRotate = false; // Disable auto-rotation
    orbitControls.autoRotateSpeed = 0;
    
    // Mobile-specific orbit controls configuration
    if (!isDesktop) {
        orbitControls.enableZoom = true;
        orbitControls.enablePan = true;
        orbitControls.enableRotate = true;
        orbitControls.zoomSpeed = 0.5; // Slower zoom for mobile
        orbitControls.panSpeed = 0.5; // Slower pan for mobile
        orbitControls.rotateSpeed = 0.5; // Slower rotation for mobile
        orbitControls.enableDamping = true;
        orbitControls.dampingFactor = 0.1; // More damping for mobile
    }
    
    // Set up orbit controls target and limits
    orbitControls.target.set(0, 0, 0);
    orbitControls.minDistance = 5; // Minimum zoom distance
    orbitControls.maxDistance = 30; // Maximum zoom distance
    orbitControls.maxPolarAngle = Math.PI * 0.85; // Prevent camera from going too low
    
    // Add visual feedback for orbit controls
    canvas.addEventListener('mouseenter', () => {
        console.log('Mouse entered canvas - orbit controls active');
        canvas.style.cursor = 'grab';
    });
    
    canvas.addEventListener('mousedown', () => {
        canvas.style.cursor = 'grabbing';
    });
    
    canvas.addEventListener('mouseup', () => {
        canvas.style.cursor = 'grab';
    });
    
    canvas.addEventListener('mouseleave', () => {
        canvas.style.cursor = 'default';
    });

// Enhanced touch handling for iPad/mobile
let touchInteractionActive = false;
let lastTouchedCube = null;

canvas.addEventListener('touchstart', (event) => {
    const touch = event.touches[0];
    pointer.x = (touch.clientX / STABLE_WIDTH) * 2 - 1;
    pointer.y = -(touch.clientY / STABLE_HEIGHT) * 2 + 1;
    pointerPixel.x = touch.clientX;
    pointerPixel.y = touch.clientY;

    // Raycast to see if we're hitting a cube
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(hitboxGroup.children, false);
    
    if (intersects.length > 0) {
        // We're touching a cube - prevent scrolling and orbit controls
        event.preventDefault();
        touchInteractionActive = true;
        lastTouchedCube = intersects[0].object.userData.visualCube;
        // Also prevent scrolling on the body temporarily
        document.body.style.overflow = 'hidden';
        
        // Add visual feedback for touch interaction
        canvas.style.cursor = 'grab';
    } else {
        // Not touching a cube - allow orbit controls if enabled
        touchInteractionActive = false;
        lastTouchedCube = null;
        document.body.style.overflow = '';
        canvas.style.cursor = 'default';
        
        // If orbit controls are enabled, let them handle the touch
        if (orbitControls && orbitControls.enabled) {
            // Don't prevent default - let orbit controls handle it
        }
    }
}, { passive: false });

canvas.addEventListener('touchmove', (event) => {
    const touch = event.touches[0];
    pointer.x = (touch.clientX / STABLE_WIDTH) * 2 - 1;
    pointer.y = -(touch.clientY / STABLE_HEIGHT) * 2 + 1;
    pointerPixel.x = touch.clientX;
    pointerPixel.y = touch.clientY;
    
    // Passive orbit logic for touch
    if (passiveOrbitActive && !orbitControls.enabled) {
        // Calculate normalized touch position (-1 to 1)
        const touchX = (touch.clientX / STABLE_WIDTH) * 2 - 1;
        const touchY = -(touch.clientY / STABLE_HEIGHT) * 2 + 1;
        
        // Calculate target camera position based on touch movement
        const radius = cameraStartPosition.length();
        const spherical = new THREE.Spherical();
        spherical.setFromVector3(cameraStartPosition);
        
        // Apply rotation based on touch position with 150% increase for mobile
        const mobileIntensity = passiveOrbitIntensity * 2.5; // 150% increase for mobile
        const rotationX = touchY * mobileIntensity; // Vertical rotation
        const rotationY = touchX * mobileIntensity; // Horizontal rotation
        
        // Apply rotations to spherical coordinates
        spherical.theta += rotationY;
        spherical.phi += rotationX;
        
        // Clamp phi to prevent camera from going upside down
        spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
        
        // Convert back to cartesian coordinates
        const newPosition = new THREE.Vector3();
        newPosition.setFromSpherical(spherical);
        
        // Update passive orbit target
        passiveOrbitTarget.copy(newPosition);
    }
    
    // Only prevent default if we're actively interacting with cubes
    if (touchInteractionActive) {
        event.preventDefault();
    } else if (orbitControls && orbitControls.enabled) {
        // Let orbit controls handle the touch movement
        // Don't prevent default
    }
}, { passive: false });

canvas.addEventListener('touchend', () => {
    // Re-enable scrolling
    touchInteractionActive = false;
    lastTouchedCube = null;
    document.body.style.overflow = '';
    canvas.style.cursor = 'default';
}, { passive: false });

canvas.addEventListener('touchcancel', () => {
    // Handle touch cancel (e.g., when user swipes to navigate)
    touchInteractionActive = false;
    lastTouchedCube = null;
    document.body.style.overflow = '';
    canvas.style.cursor = 'default';
}, { passive: false });

// Renderer
const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector('#threejs-container'),
    antialias: true
});
// Initial size - will be updated by stable viewport system
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
const floorGeometry = new THREE.PlaneGeometry(46, 46); // Larger floor for longer shadows
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

// Add a wireframe grid helper to the floor
const gridHelper = new THREE.GridHelper(46, 46, 0xcccccc, 0xdddddd);
gridHelper.position.y = 0.01; // Position slightly above the floor to prevent z-fighting
scene.add(gridHelper);

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
    opacity: 0.5,
    emissive: new THREE.Color(0x000000) // Initialize emissive property for lightning effects
});

// Setup raycaster (pointer and pointerPixel already defined above)
raycaster.params.Mesh.threshold = 0;
let originalPositions = new Map();
// const cubeAnimations = new Map(); // Removed unused variable

// Animation configuration
const ANIMATION_CONFIG = {
    moveDistance: 2,   // 60% of cube size (0.9 * 0.6 = 0.54)
    colorDarkness: 0.0    // How dark cubes get (0 = black, 1 = no color change)
};

// Cursor influence radius in pixels (variable, controlled by slider)
let influenceRadius = 100;

// Track pointer movement for raycasting
window.addEventListener('pointermove', (event) => {
    pointer.x = (event.clientX / STABLE_WIDTH) * 2 - 1;
    pointer.y = -(event.clientY / STABLE_HEIGHT) * 2 + 1;
    pointerPixel.x = event.clientX;
    pointerPixel.y = event.clientY;
    
    // Passive orbit logic
    if (passiveOrbitActive && !orbitControls.enabled) {
        // Calculate normalized mouse position (-1 to 1)
        const mouseX = (event.clientX / STABLE_WIDTH) * 2 - 1;
        const mouseY = -(event.clientY / STABLE_HEIGHT) * 2 + 1;
        
        // Calculate target camera position based on mouse movement
        const radius = cameraStartPosition.length();
        const spherical = new THREE.Spherical();
        spherical.setFromVector3(cameraStartPosition);
        
        // Apply subtle rotation based on mouse position
        const rotationX = mouseY * passiveOrbitIntensity; // Vertical rotation
        const rotationY = mouseX * passiveOrbitIntensity; // Horizontal rotation
        
        // Apply rotations to spherical coordinates
        spherical.theta += rotationY;
        spherical.phi += rotationX;
        
        // Clamp phi to prevent camera from going upside down
        spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
        
        // Convert back to cartesian coordinates
        const newPosition = new THREE.Vector3();
        newPosition.setFromSpherical(spherical);
        
        // Update passive orbit target
        passiveOrbitTarget.copy(newPosition);
    }
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

// Add js class to enable dynamic features
document.documentElement.classList.add('js');

// Fix mobile viewport height to prevent jittery movement when browser UI shrinks/expands
let STABLE_WIDTH = window.innerWidth;
let STABLE_HEIGHT = window.innerHeight;
let isInitialized = false;

function initializeStableViewport() {
    if (isInitialized) return;
    
    // Use the visual viewport API if available (most modern browsers)
    if (window.visualViewport) {
        STABLE_WIDTH = window.visualViewport.width;
        STABLE_HEIGHT = window.visualViewport.height;
    } else {
        // Fallback: use document.documentElement dimensions which are more stable
        STABLE_WIDTH = document.documentElement.clientWidth;
        STABLE_HEIGHT = document.documentElement.clientHeight;
    }
    
    // Set CSS custom property for viewport height
    const vh = STABLE_HEIGHT * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    
    // Update three.js with locked dimensions
    camera.aspect = STABLE_WIDTH / STABLE_HEIGHT;
    camera.updateProjectionMatrix();
    renderer.setSize(STABLE_WIDTH, STABLE_HEIGHT);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    isInitialized = true;
    console.log(`Viewport locked at: ${STABLE_WIDTH}x${STABLE_HEIGHT}`);
    
    // Update version counter to show viewport info (for debugging)
    const versionCounter = document.getElementById('version-counter');
    if (versionCounter) {
        versionCounter.textContent = `Viewport: ${STABLE_WIDTH}x${STABLE_HEIGHT}`;
    }
}

// Initialize immediately
initializeStableViewport();

// Also initialize after a short delay to ensure all elements are loaded
setTimeout(() => {
    if (!isInitialized) {
        initializeStableViewport();
    }
}, 100);

// Enhanced mobile viewport handling
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                 'ontouchstart' in window || 
                 navigator.maxTouchPoints > 0;

if (isMobile) {
    // Use visual viewport API for the most stable experience on mobile
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
            // Only update on significant size changes (orientation changes)
            const newWidth = window.visualViewport.width;
            const newHeight = window.visualViewport.height;
            
            // Check if this is a significant change (likely orientation change)
            const widthDiff = Math.abs(newWidth - STABLE_WIDTH);
            const heightDiff = Math.abs(newHeight - STABLE_HEIGHT);
            const significantChange = widthDiff > 50 || heightDiff > 50;
            
            if (significantChange) {
                STABLE_WIDTH = newWidth;
                STABLE_HEIGHT = newHeight;
                
                // Update CSS custom property
                const vh = STABLE_HEIGHT * 0.01;
                document.documentElement.style.setProperty('--vh', `${vh}px`);
                
                // Update three.js
                camera.aspect = STABLE_WIDTH / STABLE_HEIGHT;
                camera.updateProjectionMatrix();
                renderer.setSize(STABLE_WIDTH, STABLE_HEIGHT);
                
                console.log(`Viewport updated to: ${STABLE_WIDTH}x${STABLE_HEIGHT}`);
                
                // Update debug info
                const versionCounter = document.getElementById('version-counter');
                if (versionCounter) {
                    versionCounter.textContent = `Viewport: ${STABLE_WIDTH}x${STABLE_HEIGHT}`;
                }
            }
        });
        
        // Also listen for scroll events to prevent any viewport changes during scroll
        window.visualViewport.addEventListener('scroll', () => {
            // Prevent any viewport changes during scroll
            // The visual viewport API handles this automatically, but we ensure stability
        });
    } else {
        // Fallback for older browsers: only respond to orientation changes
        let orientationChangeTimeout;
        window.addEventListener('orientationchange', () => {
            clearTimeout(orientationChangeTimeout);
            orientationChangeTimeout = setTimeout(() => {
                // Reset for orientation change
                isInitialized = false;
                initializeStableViewport();
            }, 500);
        });
        
        // Block resize events on mobile to prevent jitter
        let lastResizeTime = 0;
        window.addEventListener('resize', (e) => {
            e.stopImmediatePropagation();
            const now = Date.now();
            
            // Only allow resize events that are far apart (likely orientation changes)
            if (now - lastResizeTime > 1000) {
                lastResizeTime = now;
                setTimeout(() => {
                    isInitialized = false;
                    initializeStableViewport();
                }, 100);
            }
        });
    }
} else {
    // On desktop, allow normal resize behavior
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            isInitialized = false;
            initializeStableViewport();
        }, 100);
    });
}

// ===============================
// TOOLBOX V2
// ===============================

// DOM Elements
const toolboxV2 = document.getElementById('toolbox-v2');
const toolboxToggleBtn = document.getElementById('toolbox-toggle-btn');

const toggleInnerCubesV2 = document.getElementById('toggleInnerCubes-v2');
const toggleFloorV2 = document.getElementById('toggleFloor-v2');
const toggleOrbitControlsV2 = document.getElementById('toggleOrbitControls-v2');
const togglePassiveOrbitV2 = document.getElementById('togglePassiveOrbit-v2');
const passiveOrbitStrengthSliderV2 = document.getElementById('passiveOrbitStrengthSlider-v2');
const passiveOrbitStrengthValueV2 = document.getElementById('passiveOrbitStrengthValue-v2');
const influenceSliderV2 = document.getElementById('influenceSlider-v2');
const influenceValueV2 = document.getElementById('influenceValue-v2');
const toggleFogV2 = document.getElementById('toggleFog-v2');
const fogNearSliderV2 = document.getElementById('fogNearSlider-v2');
const fogNearValueV2 = document.getElementById('fogNearValue-v2');
const fogFarSliderV2 = document.getElementById('fogFarSlider-v2');
const fogFarValueV2 = document.getElementById('fogFarValue-v2');
const fogColorPickerV2 = document.getElementById('fogColorPicker-v2');
const bgColorPickerV2 = document.getElementById('bgColorPicker-v2');
const cubeColorPickerV2 = document.getElementById('cubeColorPicker-v2');
const cubeOpacitySliderV2 = document.getElementById('cubeOpacitySlider-v2');
const cubeOpacityValueV2 = document.getElementById('cubeOpacityValue-v2');
const toggleLightningV2 = document.getElementById('toggleLightning-v2');
const lightningStrengthSliderV2 = document.getElementById('lightningStrengthSlider-v2');
const lightningStrengthValueV2 = document.getElementById('lightningStrengthValue-v2');
const lightningColorPickerV2 = document.getElementById('lightningColorPicker-v2');
const lightningFadeSliderV2 = document.getElementById('lightningFadeSlider-v2');
const lightningFadeValueV2 = document.getElementById('lightningFadeValue-v2');

const setSettingsBtnV2 = document.getElementById('setSettingsBtn-v2');
const resetSettingsBtnV2 = document.getElementById('resetSettingsBtn-v2');

// Toolbox Collapse/Expand
const toolboxButton = document.querySelector('.toolbox-button');
if (toolboxButton) {
    toolboxButton.addEventListener('click', () => {
        const isCollapsing = !toolboxV2.classList.contains('collapsed');
        toolboxV2.classList.toggle('collapsed');
        
        // Update button icon direction with animation timing
        const icon = toolboxToggleBtn.querySelector('i');
        if (isCollapsing) {
            icon.className = 'fas fa-chevron-down';
        } else {
            icon.className = 'fas fa-chevron-up';
        }
    });
}



// Display Controls
if (toggleInnerCubesV2) {
    toggleInnerCubesV2.addEventListener('change', () => {
        const showInner = toggleInnerCubesV2.checked;
        cubeGroup.children.forEach(cube => {
            if (isInnerCube(cube)) {
                cube.visible = showInner;
                // Make both bottom layer (y=1) and layer above (y=2) non-interactive by hiding their hitboxes
                const hitbox = hitboxGroup.children.find(h => h.userData.visualCube === cube);
                if (hitbox) {
                    // Both bottom layers should not be interactive
                    if (cube.gridPosition.y === 1 || cube.gridPosition.y === 2) {
                        hitbox.visible = false; // Always hide hitboxes for both bottom layers
                    } else {
                        hitbox.visible = showInner; // Normal behavior for other inner cubes
                    }
                }
            }
        });
    });
}

// Floor Toggle
if (toggleFloorV2) {
    toggleFloorV2.addEventListener('change', () => {
        const showFloor = toggleFloorV2.checked;
        floor.visible = showFloor;
        gridHelper.visible = showFloor;
    });
}

// Orbit Controls Toggle
if (toggleOrbitControlsV2) {
    toggleOrbitControlsV2.addEventListener('change', () => {
        const orbitEnabled = toggleOrbitControlsV2.checked;
        
        if (orbitControls) {
            // Toggle orbit controls
            orbitControls.enabled = orbitEnabled;
            
            // Update cursor and touch-action based on mode
            if (orbitEnabled) {
                canvas.style.cursor = 'grab';
                canvas.style.touchAction = 'none'; // Allow orbit controls to handle all touch
                console.log('Active orbit controls enabled');
            } else {
                canvas.style.cursor = 'default';
                canvas.style.touchAction = 'pan-y'; // Allow vertical scrolling only
                console.log('Active orbit controls disabled - cube interaction mode');
            }
        } else {
            // If orbit controls not available, just update the toggle state
            console.log('Orbit controls not available on this device');
            toggleOrbitControlsV2.checked = false;
        }
    });
}

// Passive Orbit Controls Toggle
if (togglePassiveOrbitV2) {
    togglePassiveOrbitV2.addEventListener('change', () => {
        passiveOrbitActive = togglePassiveOrbitV2.checked;
        
        if (passiveOrbitActive) {
            console.log('Passive orbit controls enabled');
            // Initialize passive orbit target to current camera position
            passiveOrbitTarget.copy(camera.position);
        } else {
            console.log('Passive orbit controls disabled');
        }
    });
}

// Passive Orbit Strength Slider
if (passiveOrbitStrengthSliderV2) {
    passiveOrbitStrengthSliderV2.addEventListener('input', () => {
        const newStrength = parseFloat(passiveOrbitStrengthSliderV2.value);
        passiveOrbitIntensity = newStrength;
        passiveOrbitStrengthValueV2.textContent = `[${newStrength.toFixed(2)}]`;
        
        // Update slider track background
        const min = parseFloat(passiveOrbitStrengthSliderV2.min);
        const max = parseFloat(passiveOrbitStrengthSliderV2.max);
        const percent = ((newStrength - min) / (max - min)) * 100;
        passiveOrbitStrengthSliderV2.style.background = `linear-gradient(to right, var(--golden-yellow) ${percent}%, rgba(0, 0, 0, 0.15) ${percent}%)`;
    });
}

// New Cube Color and Opacity Controls
let cubeBaseColor = new THREE.Color(0xffffff);

if (cubeColorPickerV2) {
    cubeColorPickerV2.addEventListener('input', () => {
        cubeBaseColor.set(cubeColorPickerV2.value);
    });
}

if (cubeOpacitySliderV2) {
    cubeOpacitySliderV2.addEventListener('input', () => {
        const newOpacity = parseFloat(cubeOpacitySliderV2.value);
        cubeOpacityValueV2.textContent = `[${newOpacity.toFixed(2)}]`;
        cubeGroup.children.forEach(cube => {
            cube.material.opacity = newOpacity;
        });

        // Update slider track background
        const min = parseFloat(cubeOpacitySliderV2.min);
        const max = parseFloat(cubeOpacitySliderV2.max);
        const percent = ((newOpacity - min) / (max - min)) * 100;
        cubeOpacitySliderV2.style.background = `linear-gradient(to right, var(--golden-yellow) ${percent}%, rgba(0, 0, 0, 0.15) ${percent}%)`;
    });
}


// Helper function to update slider visuals
function setupStyledSlider(sliderEl, valueEl, options = {}) {
    const { isFloat = false, format = val => `[${val}]` } = options;

    const updateSliderVisuals = () => {
        const value = isFloat ? parseFloat(sliderEl.value) : parseInt(sliderEl.value, 10);
        const min = isFloat ? parseFloat(sliderEl.min) : parseInt(sliderEl.min, 10);
        const max = isFloat ? parseFloat(sliderEl.max) : parseInt(sliderEl.max, 10);
        
        // Update label
        if (valueEl) {
            valueEl.textContent = format(isFloat ? value.toFixed(2) : value);
        }
        
        // Update track background
        const percent = ((value - min) / (max - min)) * 100;
        sliderEl.style.background = `linear-gradient(to right, var(--golden-yellow) ${percent}%, rgba(0, 0, 0, 0.15) ${percent}%)`;
    };

    if (sliderEl && valueEl) {
        sliderEl.addEventListener('input', updateSliderVisuals);
        // Initial update
        updateSliderVisuals();
    }
}


// Setup all styled sliders
document.addEventListener('DOMContentLoaded', () => {
    setupStyledSlider(influenceSliderV2, influenceValueV2, { format: val => `[${val}]` });
    setupStyledSlider(passiveOrbitStrengthSliderV2, passiveOrbitStrengthValueV2, { isFloat: true, format: val => `[${val}]` });
    setupStyledSlider(fogNearSliderV2, fogNearValueV2, { format: val => `[${val}]` });
    setupStyledSlider(fogFarSliderV2, fogFarValueV2, { format: val => `[${val}]` });
    setupStyledSlider(cubeOpacitySliderV2, cubeOpacityValueV2, { isFloat: true, format: val => `[${val}]` });
    setupStyledSlider(lightningStrengthSliderV2, lightningStrengthValueV2, { isFloat: true, format: val => `[${val}]` });
    setupStyledSlider(lightningFadeSliderV2, lightningFadeValueV2, { isFloat: true, format: val => `[${val}]` });
});


// Interaction Controls
if (influenceSliderV2) {
    influenceSliderV2.addEventListener('input', () => {
        influenceRadius = parseInt(influenceSliderV2.value, 10);
    });
}

// Environment Controls
if (toggleFogV2) {
    toggleFogV2.addEventListener('change', updateFogSettings);
}
if (fogNearSliderV2) {
    fogNearSliderV2.addEventListener('input', () => {
        updateFogSettings();
    });
}
if (fogFarSliderV2) {
    fogFarSliderV2.addEventListener('input', () => {
        updateFogSettings();
    });
}
if (fogColorPickerV2) {
    fogColorPickerV2.addEventListener('input', () => {
        currentFogColor.set(fogColorPickerV2.value);
        updateFogSettings();
    });
}
if (bgColorPickerV2) {
    bgColorPickerV2.addEventListener('input', () => {
        scene.background.set(bgColorPickerV2.value);
    });
}

// Lightning Controls
if (toggleLightningV2) {
    toggleLightningV2.addEventListener('change', () => {
        lightningEnabled = toggleLightningV2.checked;
        if (!lightningEnabled) {
            // Reset all lightning effects when disabled
            lightningEffects.clear();
            cubeGroup.children.forEach(cube => {
                if (cube.material.emissive) {
                    cube.material.emissive.setHex(0x000000);
                }
            });
        }
    });
}

if (lightningStrengthSliderV2) {
    lightningStrengthSliderV2.addEventListener('input', () => {
        lightningStrength = parseFloat(lightningStrengthSliderV2.value);
        lightningStrengthValueV2.textContent = `[${lightningStrength.toFixed(1)}]`;
        
        // Update slider track background
        const min = parseFloat(lightningStrengthSliderV2.min);
        const max = parseFloat(lightningStrengthSliderV2.max);
        const percent = ((lightningStrength - min) / (max - min)) * 100;
        lightningStrengthSliderV2.style.background = `linear-gradient(to right, var(--golden-yellow) ${percent}%, rgba(0, 0, 0, 0.15) ${percent}%)`;
    });
}

if (lightningColorPickerV2) {
    lightningColorPickerV2.addEventListener('input', () => {
        lightningColor.set(lightningColorPickerV2.value);
    });
}

if (lightningFadeSliderV2) {
    lightningFadeSliderV2.addEventListener('input', () => {
        lightningFadeSpeed = parseFloat(lightningFadeSliderV2.value);
        lightningFadeValueV2.textContent = `[${lightningFadeSpeed.toFixed(2)}]`;
        
        // Update slider track background
        const min = parseFloat(lightningFadeSliderV2.min);
        const max = parseFloat(lightningFadeSliderV2.max);
        const percent = ((lightningFadeSpeed - min) / (max - min)) * 100;
        lightningFadeSliderV2.style.background = `linear-gradient(to right, var(--golden-yellow) ${percent}%, rgba(0, 0, 0, 0.15) ${percent}%)`;
    });
}



// Function to update fog settings with current values
function updateFogSettings() {
    if (toggleFogV2.checked) {
        const fogNear = parseInt(fogNearSliderV2.value, 10);
        const fogFar = parseInt(fogFarSliderV2.value, 10);

        if (scene.fog) {
            scene.fog.color.copy(currentFogColor);
            scene.fog.near = fogNear;
            scene.fog.far = fogFar;
        } else {
            scene.fog = new THREE.Fog(currentFogColor, fogNear, fogFar);
        }
        scene.background.copy(currentFogColor);
    } else {
        scene.fog = null;
        scene.background.set(bgColorPickerV2.value);
    }
}

// Initialize fog with default settings on page load
function initializeFog() {
    updateFogSettings();
}

// Re-enable fog initialization to ensure it's set on load
setTimeout(initializeFog, 100);

// ===============================
// Spline Falloff Control
// ===============================

class SplineController {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.isDragging = false;
        this.draggedPoint = null;
        this.logicalWidth = 0;
        this.logicalHeight = 0;
        
        // Control points (x, y) in normalized coordinates (0-1)
        this.controlPoints = [
            { x: 0, y: 1 },    // Start: full influence at distance 0
            { x: 0.5, y: 0.5 }, // Middle control point
            { x: 1, y: 0 }     // End: no influence at max distance
        ];
        
        // Preset curves
        this.presets = {
            linear: [
                { x: 0, y: 1 },
                { x: 0.5, y: 0.5 },
                { x: 1, y: 0 }
            ],
            easeIn: [
                { x: 0, y: 1 },
                { x: 0.3, y: 0.8 },
                { x: 1, y: 0 }
            ],
            easeOut: [
                { x: 0, y: 1 },
                { x: 0.7, y: 0.2 },
                { x: 1, y: 0 }
            ],
            exponential: [
                { x: 0, y: 1 },
                { x: 0.2, y: 0.9 },
                { x: 1, y: 0 }
            ],
            bezier: [
                { x: 0, y: 1 },
                { x: 0.25, y: 0.9 },
                { x: 0.75, y: 0.1 },
                { x: 1, y: 0 }
            ]
        };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupCanvasResize();
        this.draw();
        this.setupPresetButtons();
    }
    
    setupCanvasResize() {
        // Make canvas responsive while maintaining aspect ratio
        const resizeCanvas = () => {
            const container = this.canvas.parentElement;
            const containerWidth = container.clientWidth - 8; // Reduced padding for more width
            const aspectRatio = 5/3; // Width/Height ratio
            const newHeight = containerWidth / aspectRatio;
            
            this.logicalWidth = containerWidth;
            this.logicalHeight = newHeight;
            
            this.canvas.style.width = this.logicalWidth + 'px';
            this.canvas.style.height = this.logicalHeight + 'px';
            
            // Update canvas resolution
            this.canvas.width = this.logicalWidth * window.devicePixelRatio;
            this.canvas.height = this.logicalHeight * window.devicePixelRatio;
            this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
            
            this.draw();
        };
        
        // Initial resize
        resizeCanvas();
        
        // Resize on window resize
        window.addEventListener('resize', resizeCanvas);
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.handleMouseUp());
        this.canvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e));
        
    }
    
    setupPresetButtons() {
        const resetBtn = document.getElementById('resetSplineBtn');
        const easeInBtn = document.getElementById('easeInBtn');
        const easeOutBtn = document.getElementById('easeOutBtn');
        const exponentialBtn = document.getElementById('exponentialBtn');
        const bezierBtn = document.getElementById('bezierBtn');
        
        if (resetBtn) resetBtn.addEventListener('click', () => this.setPreset('linear'));
        if (easeInBtn) easeInBtn.addEventListener('click', () => this.setPreset('easeIn'));
        if (easeOutBtn) easeOutBtn.addEventListener('click', () => this.setPreset('easeOut'));
        if (exponentialBtn) exponentialBtn.addEventListener('click', () => this.setPreset('exponential'));
        if (bezierBtn) bezierBtn.addEventListener('click', () => this.setPreset('bezier'));
    }
    
    handleDoubleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = 1 - ((e.clientY - rect.top) / rect.height); // Invert Y axis

        // Check if double-clicking an existing point to remove it
        let closestPointIndex = -1;
        let minDistance = Infinity;

        this.controlPoints.forEach((point, index) => {
            // Cannot remove start or end points
            if (index === 0 || index === this.controlPoints.length - 1) return;

            const distance = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
            if (distance < minDistance) {
                minDistance = distance;
                closestPointIndex = index;
            }
        });

        if (closestPointIndex !== -1 && minDistance < 0.05) { // 5% threshold for removal
            this.controlPoints.splice(closestPointIndex, 1);
        } else {
            // Add a new point
            const newPoint = { x, y };
            // Find the correct index to insert the new point, keeping the array sorted by x
            const insertIndex = this.controlPoints.findIndex(p => p.x > x);
            
            if (insertIndex !== -1) {
                this.controlPoints.splice(insertIndex, 0, newPoint);
            }
        }
        
        this.draw();
        this.updateFalloffFunction();
    }
    
    setPreset(presetName) {
        this.controlPoints = JSON.parse(JSON.stringify(this.presets[presetName]));
        this.draw();
        this.updateFalloffFunction();
    }
    
    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = 1 - ((e.clientY - rect.top) / rect.height); // Invert Y axis
        
        // Find closest control point
        let closestPoint = null;
        let minDistance = Infinity;
        
        this.controlPoints.forEach((point, index) => {
            const distance = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
            if (distance < minDistance && distance < 0.1) { // 10% threshold
                minDistance = distance;
                closestPoint = index;
            }
        });
        
        if (closestPoint !== null) {
            this.isDragging = true;
            this.draggedPoint = closestPoint;
        }
    }
    
    handleMouseMove(e) {
        if (!this.isDragging || this.draggedPoint === null) return;
        
        const rect = this.canvas.getBoundingClientRect();
        let x = (e.clientX - rect.left) / rect.width;
        let y = 1 - ((e.clientY - rect.top) / rect.height); // Invert Y axis
        
        // Constrain to canvas bounds
        x = Math.max(0, Math.min(1, x));
        y = Math.max(0, Math.min(1, y));
        
        // Constrain first and last points to edges
        if (this.draggedPoint === 0) {
            x = 0;
        } else if (this.draggedPoint === this.controlPoints.length - 1) {
            x = 1;
        } else {
            // For other points, constrain their x between their neighbours
            const prevPointX = this.controlPoints[this.draggedPoint - 1].x;
            const nextPointX = this.controlPoints[this.draggedPoint + 1].x;
            x = Math.max(prevPointX + 0.001, Math.min(nextPointX - 0.001, x));
        }
        
        this.controlPoints[this.draggedPoint] = { x, y };
        this.draw();
        this.updateFalloffFunction();
    }
    
    handleMouseUp() {
        this.isDragging = false;
        this.draggedPoint = null;
    }
    
    draw() {
        const ctx = this.ctx;
        const width = this.logicalWidth;
        const height = this.logicalHeight;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw grid
        this.drawGrid();
        
        // Draw curve
        this.drawCurve();
        
        // Draw control points
        this.drawControlPoints();
    }
    
    drawGrid() {
        const ctx = this.ctx;
        const width = this.logicalWidth;
        const height = this.logicalHeight;
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        
        // Vertical lines
        for (let i = 0; i <= 10; i++) {
            const x = (i / 10) * width;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        // Horizontal lines
        for (let i = 0; i <= 10; i++) {
            const y = (i / 10) * height;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
    }
    
    drawCurve() {
        const ctx = this.ctx;
        const width = this.logicalWidth;
        const height = this.logicalHeight;
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        // Draw smooth curve through control points
        for (let i = 0; i <= 100; i++) {
            const t = i / 100;
            const point = this.evaluateSpline(t);
            
            const x = point.x * width;
            const y = (1 - point.y) * height; // Invert Y for canvas coordinates
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();
    }
    
    drawControlPoints() {
        const ctx = this.ctx;
        const width = this.logicalWidth;
        const height = this.logicalHeight;
        
        this.controlPoints.forEach((point, index) => {
            const x = point.x * width;
            const y = (1 - point.y) * height; // Invert Y for canvas coordinates
            
            // Draw point
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw border
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.lineWidth = 1;
            ctx.stroke();
        });
    }
    
    evaluateSpline(t) {
        // Use Bezier curve interpolation for smoother curves
        if (t <= 0) return this.controlPoints[0];
        if (t >= 1) return this.controlPoints[this.controlPoints.length - 1];
        
        const result = this.generalBezier(t, this.controlPoints);
        
        // Ensure final result is constrained to 0-1 range
        result.x = Math.max(0, Math.min(1, result.x));
        result.y = Math.max(0, Math.min(1, result.y));
        
        return result;
    }
    
    generalBezier(t, points) {
        if (points.length === 1) {
            return points[0];
        }
        const newPoints = [];
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i+1];
            const newPoint = {
                x: (1 - t) * p1.x + t * p2.x,
                y: (1 - t) * p1.y + t * p2.y
            };
            newPoints.push(newPoint);
        }
        return this.generalBezier(t, newPoints);
    }
    
    quadraticBezier(t) {
        const p0 = this.controlPoints[0];
        const p1 = this.controlPoints[1];
        const p2 = this.controlPoints[2];
        
        const mt = 1 - t;
        const result = {
            x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
            y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y
        };
        
        // Constrain to 0-1 range
        result.x = Math.max(0, Math.min(1, result.x));
        result.y = Math.max(0, Math.min(1, result.y));
        
        return result;
    }
    
    cubicBezier(t) {
        const p0 = this.controlPoints[0];
        const p1 = this.controlPoints[1];
        const p2 = this.controlPoints[2];
        const p3 = this.controlPoints[3];
        
        const mt = 1 - t;
        const mt2 = mt * mt;
        const mt3 = mt2 * mt;
        const t2 = t * t;
        const t3 = t2 * t;
        
        const result = {
            x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
            y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y
        };
        
        // Constrain to 0-1 range
        result.x = Math.max(0, Math.min(1, result.x));
        result.y = Math.max(0, Math.min(1, result.y));
        
        return result;
    }
    
    getFalloffValue(normalizedDistance) {
        // normalizedDistance is 0-1, where 0 = at cursor, 1 = at influence radius
        const point = this.evaluateSpline(normalizedDistance);
        return Math.max(0, Math.min(1, point.y)); // Clamp to 0-1
    }
    
    updateFalloffFunction() {
        // This will be called whenever the spline changes
        // The falloff function is now available via splineController.getFalloffValue()
    }
}

// Initialize spline controller
let splineController;
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('falloffSpline');
    if (canvas) {
        splineController = new SplineController('falloffSpline');
    }
});



// ===============================
// Settings Caching (V2)
// ===============================
const settingsKeyV2 = 'portfolio3DSettings-v2';

const defaultSettingsV2 = {
    innerCubes: true,
    floor: true,
    orbitControls: false, // Default to cube interaction mode
    passiveOrbit: false, // Default to disabled
    passiveOrbitStrength: 0.1, // Default strength
    influence: 88,
    fogEnabled: true,
    fogNear: 20,
    fogFar: 60,
    fogColor: '#fafafa',
    bgColor: '#fafafa',
    cubeColor: '#ffffff',
    cubeOpacity: 1.0,
    lightningEnabled: true,
    lightningStrength: 10.0,
    lightningColor: '#00ffff',
    lightningFadeSpeed: 0.05,
    splinePoints: [
        { x: 0, y: 1 },
        { x: 0.5, y: 0.5 },
        { x: 1, y: 0 }
    ]
};

function saveSettingsV2() {
    const settings = {
        innerCubes: toggleInnerCubesV2.checked,
        floor: toggleFloorV2.checked,
        orbitControls: toggleOrbitControlsV2.checked,
        passiveOrbit: togglePassiveOrbitV2.checked,
        passiveOrbitStrength: passiveOrbitStrengthSliderV2.value,
        influence: influenceSliderV2.value,
        fogEnabled: toggleFogV2.checked,
        fogNear: fogNearSliderV2.value,
        fogFar: fogFarSliderV2.value,
        fogColor: fogColorPickerV2.value,
        bgColor: bgColorPickerV2.value,
        cubeColor: cubeColorPickerV2.value,
        cubeOpacity: cubeOpacitySliderV2.value,
        lightningEnabled: toggleLightningV2.checked,
        lightningStrength: lightningStrengthSliderV2.value,
        lightningColor: lightningColorPickerV2.value,
        lightningFadeSpeed: lightningFadeSliderV2.value,
        splinePoints: splineController ? splineController.controlPoints : defaultSettingsV2.splinePoints
    };
    localStorage.setItem(settingsKeyV2, JSON.stringify(settings));
    setSettingsBtnV2.innerHTML = '<i class="fas fa-check"></i> SAVED!';
    setTimeout(() => {
        setSettingsBtnV2.innerHTML = '<i class="fas fa-save"></i> SET';
    }, 1500);
}

function applySettingsV2(settings) {
    toggleInnerCubesV2.checked = settings.innerCubes;
    toggleFloorV2.checked = settings.floor !== undefined ? settings.floor : true;
    toggleOrbitControlsV2.checked = settings.orbitControls || false;
    togglePassiveOrbitV2.checked = settings.passiveOrbit || false;
    passiveOrbitStrengthSliderV2.value = settings.passiveOrbitStrength || 0.1;
    influenceSliderV2.value = settings.influence;
    toggleFogV2.checked = settings.fogEnabled;
    fogNearSliderV2.value = settings.fogNear;
    fogFarSliderV2.value = settings.fogFar;
    fogColorPickerV2.value = settings.fogColor;
    bgColorPickerV2.value = settings.bgColor;
    cubeColorPickerV2.value = settings.cubeColor;
    cubeOpacitySliderV2.value = settings.cubeOpacity;
    toggleLightningV2.checked = settings.lightningEnabled !== undefined ? settings.lightningEnabled : true;
    lightningStrengthSliderV2.value = settings.lightningStrength || 10.0;
    lightningColorPickerV2.value = settings.lightningColor || '#00ffff';
    lightningFadeSliderV2.value = settings.lightningFadeSpeed || 0.05;

    // Apply spline settings if available
    if (splineController && settings.splinePoints) {
        splineController.controlPoints = JSON.parse(JSON.stringify(settings.splinePoints));
        splineController.draw();
    }

    // Manually trigger updates for sliders to refresh visuals
    document.querySelectorAll('.styled-slider').forEach(slider => {
        slider.dispatchEvent(new Event('input'));
    });
    
    // Trigger other non-slider control updates
    toggleInnerCubesV2.dispatchEvent(new Event('change'));
    toggleFloorV2.dispatchEvent(new Event('change'));
    toggleOrbitControlsV2.dispatchEvent(new Event('change'));
    togglePassiveOrbitV2.dispatchEvent(new Event('change'));
    fogColorPickerV2.dispatchEvent(new Event('input'));
    bgColorPickerV2.dispatchEvent(new Event('input'));
    cubeColorPickerV2.dispatchEvent(new Event('input'));
    toggleLightningV2.dispatchEvent(new Event('change'));
    lightningColorPickerV2.dispatchEvent(new Event('input'));
    updateFogSettings();
}

function loadSettingsV2() {
    const savedSettings = localStorage.getItem(settingsKeyV2);
    if (savedSettings) {
        applySettingsV2(JSON.parse(savedSettings));
    } else {
        applySettingsV2(defaultSettingsV2);
    }
}

function resetSettingsV2() {
    applySettingsV2(defaultSettingsV2);
    resetSettingsBtnV2.innerHTML = '<i class="fas fa-check"></i> RESET!';
    setTimeout(() => {
        resetSettingsBtnV2.innerHTML = '<i class="fas fa-undo"></i> RESET';
    }, 1500);
    localStorage.removeItem(settingsKeyV2);
}

if (setSettingsBtnV2 && resetSettingsBtnV2) {
    setSettingsBtnV2.addEventListener('click', saveSettingsV2);
    resetSettingsBtnV2.addEventListener('click', resetSettingsV2);
}

document.addEventListener('DOMContentLoaded', loadSettingsV2);


// Window resize is now handled by the stable viewport system above
// This prevents the three.js scene from jumping during mobile browser UI changes

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

// Helper function to check if a cube is an inner cube (not on the outer surface)
function isInnerCube(cube) {
    const { x, y, z } = cube.gridPosition;
    // Include both the bottom layer (y=1) and the layer above it (y=2) as inner cubes
    if (y === 1 || y === 2) {
        return x > 0 && x < gridSize - 1 && z > 0 && z < gridSize - 1;
    }
    // Regular inner cube check for main grid (y=3, y=4)
    return x > 0 && x < gridSize - 1 &&
           y > 0 && y < gridSize - 1 &&
           z > 0 && z < gridSize - 1;
}

// Helper function to check if a cube is behind another cube in the direction of movement
function isBehindCube(innerCube, outerCube, direction) {
    const innerPos = innerCube.gridPosition;
    const outerPos = outerCube.gridPosition;
    
    // Check if inner cube is directly behind the outer cube in the movement direction
    return innerPos.x === outerPos.x - direction.x &&
           innerPos.y === outerPos.y - direction.y &&
           innerPos.z === outerPos.z - direction.z;
}

// Function to update lightning effects
function updateLightningEffects() {
    if (!lightningEnabled) return;
    
    // Reset all lightning effects
    lightningEffects.clear();
    
    // Find all outer cubes that have moved from their original position
    const movedOuterCubes = [];
    cubeGroup.children.forEach(cube => {
        if (!isInnerCube(cube)) { // Only check outer cubes
            const originalPos = originalPositions.get(cube);
            const distanceMoved = cube.position.distanceTo(originalPos);
            
            if (distanceMoved > 0.1) { // Threshold for considering a cube "moved"
                // Determine the primary direction of movement
                const movement = new THREE.Vector3().subVectors(cube.position, originalPos);
                let direction = new THREE.Vector3(0, 0, 0);
                
                // Find the axis with the largest movement
                const absX = Math.abs(movement.x);
                const absY = Math.abs(movement.y);
                const absZ = Math.abs(movement.z);
                
                if (absX >= absY && absX >= absZ) {
                    direction.x = Math.sign(movement.x);
                } else if (absY >= absX && absY >= absZ) {
                    direction.y = Math.sign(movement.y);
                } else {
                    direction.z = Math.sign(movement.z);
                }
                
                movedOuterCubes.push({ cube, direction });
            }
        }
    });
    
    // Apply lightning effects to inner cubes behind moved outer cubes
    cubeGroup.children.forEach(innerCube => {
        if (isInnerCube(innerCube)) {
            let maxLightningIntensity = 0;
            
            // Check if this inner cube is behind any moved outer cube
            movedOuterCubes.forEach(({ cube: outerCube, direction }) => {
                if (isBehindCube(innerCube, outerCube, direction)) {
                    // Calculate lightning intensity based on how far the outer cube moved
                    const originalPos = originalPositions.get(outerCube);
                    const distanceMoved = outerCube.position.distanceTo(originalPos);
                    const maxMoveDistance = ANIMATION_CONFIG.moveDistance;
                    const intensity = Math.min(distanceMoved / maxMoveDistance, 1.0) * lightningStrength;
                    
                    maxLightningIntensity = Math.max(maxLightningIntensity, intensity);
                }
            });
            
            // Special case: Apply lightning to both bottom layers (y=1 and y=2) when their outer cube neighbors move
            if (innerCube.gridPosition.y === 1 || innerCube.gridPosition.y === 2) {
                movedOuterCubes.forEach(({ cube: outerCube, direction }) => {
                    const innerPos = innerCube.gridPosition;
                    const outerPos = outerCube.gridPosition;
                    
                    // For y=1 layer: check if directly below or adjacent to moved outer cubes
                    if (innerPos.y === 1) {
                        const isDirectlyBelow = innerPos.x === outerPos.x && innerPos.z === outerPos.z && outerPos.y === 2;
                        const isAdjacentAtSameLevel = (Math.abs(innerPos.x - outerPos.x) === 1 && innerPos.z === outerPos.z && outerPos.y === 1) ||
                                                     (Math.abs(innerPos.z - outerPos.z) === 1 && innerPos.x === outerPos.x && outerPos.y === 1);
                        
                        if (isDirectlyBelow || isAdjacentAtSameLevel) {
                            const originalPos = originalPositions.get(outerCube);
                            const distanceMoved = outerCube.position.distanceTo(originalPos);
                            const maxMoveDistance = ANIMATION_CONFIG.moveDistance;
                            const intensity = Math.min(distanceMoved / maxMoveDistance, 1.0) * lightningStrength * 0.7;
                            
                            maxLightningIntensity = Math.max(maxLightningIntensity, intensity);
                        }
                    }
                    
                    // For y=2 layer: check if behind moved outer cubes (same as regular inner cubes)
                    if (innerPos.y === 2) {
                        if (isBehindCube(innerCube, outerCube, direction)) {
                            const originalPos = originalPositions.get(outerCube);
                            const distanceMoved = outerCube.position.distanceTo(originalPos);
                            const maxMoveDistance = ANIMATION_CONFIG.moveDistance;
                            const intensity = Math.min(distanceMoved / maxMoveDistance, 1.0) * lightningStrength * 0.7;
                            
                            maxLightningIntensity = Math.max(maxLightningIntensity, intensity);
                        }
                    }
                });
            }
            
            // Store the lightning effect for this cube
            if (maxLightningIntensity > 0) {
                lightningEffects.set(innerCube, maxLightningIntensity);
            }
        }
    });
}



// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Update OrbitControls
    if (orbitControls) {
        orbitControls.update();
    }
    
    // Update passive orbit camera movement
    if (passiveOrbitActive && !orbitControls.enabled) {
        // Smoothly move camera towards passive orbit target
        camera.position.lerp(passiveOrbitTarget, passiveOrbitSmoothness);
        camera.lookAt(0, 0, 0);
    }
    
    // Update raycaster to intersect with hitboxes
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(hitboxGroup.children, false);
    const intersectedHitbox = intersects.length > 0 ? intersects[0].object : null;
    const intersectedCube = intersectedHitbox ? intersectedHitbox.userData.visualCube : null;

    // Update lightning effects based on cube movements
    updateLightningEffects();
    
    // Debug: Log lightning effects occasionally (commented out to prevent console spam)
    // if (Math.random() < 0.01) { // Log 1% of frames
    //     const activeLightningCount = lightningEffects.size;
    //     if (activeLightningCount > 0) {
    //         console.log(`Lightning: ${activeLightningCount} cubes`);
    //     }
    // }
    
    // Test function for debugging lightning effects
    window.testLightningEffects = function() {
        console.log('Testing lightning effects...');
        console.log('Lightning enabled:', lightningEnabled);
        console.log('Lightning strength:', lightningStrength);
        console.log('Lightning color:', lightningColor);
        console.log('Active lightning effects:', lightningEffects.size);
        
        // Find some inner cubes
        const innerCubes = cubeGroup.children.filter(cube => isInnerCube(cube));
        console.log('Inner cubes found:', innerCubes.length);
        
        // Manually trigger lightning on a few inner cubes for testing
        innerCubes.slice(0, 3).forEach(cube => {
            lightningEffects.set(cube, lightningStrength);
            console.log('Applied lightning to cube at:', cube.gridPosition);
        });
    };
    
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

        // Project the cube's original position to screen space to measure distance to cursor
        const screenPos = originalPositions.get(cube).clone().project(camera);
        const cubeScreenX = (screenPos.x + 1) * 0.5 * STABLE_WIDTH;
        const cubeScreenY = (-screenPos.y + 1) * 0.5 * STABLE_HEIGHT;
        const dx = cubeScreenX - pointerPixel.x;
        const dy = cubeScreenY - pointerPixel.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Calculate influence using spline falloff if available, otherwise use linear falloff
        let influence = 0;
        if (splineController) {
            const normalizedDistance = Math.min(distance / influenceRadius, 1);
            influence = splineController.getFalloffValue(normalizedDistance);
        } else {
            // Fallback to linear falloff
            influence = 1 - distance / influenceRadius;
            if (influence < 0) influence = 0;
        }

        // Prevent overlapping by ensuring no neighbor along direction when influence > 0
        if (influence > 0 && hasNeighbor(cube, direction.x, direction.y, direction.z)) {
            influence = 0;
        }

        const desiredTarget = originalPos.clone().addScaledVector(direction, ANIMATION_CONFIG.moveDistance * influence);
        cube.position.lerp(desiredTarget, 0.1);

        // Color feedback based on influence, not lagging position
        const colorIntensity = 1 - influence * (1 - ANIMATION_CONFIG.colorDarkness);
        cube.material.color.copy(cubeBaseColor).multiplyScalar(colorIntensity);
        
        // Apply lightning effects to inner cubes
        if (lightningEnabled && isInnerCube(cube)) {
            const lightningIntensity = lightningEffects.get(cube) || 0;
            
            if (lightningIntensity > 0) {
                // Apply emissive material with lightning color and intensity
                const emissiveColor = lightningColor.clone().multiplyScalar(lightningIntensity);
                cube.material.emissive.copy(emissiveColor);
            } else {
                // Fade out lightning effect
                const currentEmissive = cube.material.emissive;
                if (currentEmissive.r > 0 || currentEmissive.g > 0 || currentEmissive.b > 0) {
                    currentEmissive.multiplyScalar(1 - lightningFadeSpeed);
                    
                    // Reset to black if very close to zero
                    if (currentEmissive.r < 0.01 && currentEmissive.g < 0.01 && currentEmissive.b < 0.01) {
                        currentEmissive.setHex(0x000000);
                    }
                }
            }
        }
    });
    
    // Debug: Log camera position occasionally (desktop only) - commented out to prevent console spam
    // if (isDesktop && Math.random() < 0.001) { // Log 0.1% of frames to avoid spam
    //     console.log('Animation frame - Camera position:', camera.position.toArray().map(v => v.toFixed(2)));
    // }
    
    // Render the scene
    renderer.render(scene, camera);
}

animate(); 

 