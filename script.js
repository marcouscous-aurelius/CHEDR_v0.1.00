import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xfafafa);

// Global state for the fog color, initialized to default
let currentFogColor = new THREE.Color(0xfafafa);

// Fog will be initialized by the fog controls

// Camera
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
const cameraStartPosition = new THREE.Vector3(15, 12, 15);
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

// Setup raycaster and pointer (moved up to avoid reference errors)
const raycaster = new THREE.Raycaster();
raycaster.params.Mesh.threshold = 0;
const pointer = new THREE.Vector2();
const pointerPixel = { x: -10000, y: -10000 };

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
    opacity: 0.5
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

// Add js class to enable dynamic features
document.documentElement.classList.add('js');

// ===============================
// TOOLBOX V2
// ===============================

// DOM Elements
const toolboxV2 = document.getElementById('toolbox-v2');
const toolboxToggleBtn = document.getElementById('toolbox-toggle-btn');

const toggleInnerCubesV2 = document.getElementById('toggleInnerCubes-v2');
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
const setSettingsBtnV2 = document.getElementById('setSettingsBtn-v2');
const resetSettingsBtnV2 = document.getElementById('resetSettingsBtn-v2');

// Toolbox Collapse/Expand
if (toolboxToggleBtn) {
    toolboxToggleBtn.addEventListener('click', () => {
        toolboxV2.classList.toggle('collapsed');
    });
}

// Display Controls
if (toggleInnerCubesV2) {
    toggleInnerCubesV2.addEventListener('change', () => {
        const showInner = toggleInnerCubesV2.checked;
        cubeGroup.children.forEach(cube => {
            const { x, y, z } = cube.gridPosition;
            const isInner = x > 0 && x < gridSize - 1 &&
                            y > 0 && y < gridSize - 1 &&
                            z > 0 && z < gridSize - 1;
            if (isInner) {
                cube.visible = showInner;
                hitboxGroup.children.find(h => h.userData.visualCube === cube).visible = showInner;
            }
        });
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
        cubeOpacitySliderV2.style.background = `linear-gradient(to right, #ffd700 ${percent}%, rgba(0, 0, 0, 0.15) ${percent}%)`;
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
        sliderEl.style.background = `linear-gradient(to right, #ffd700 ${percent}%, rgba(0, 0, 0, 0.15) ${percent}%)`;
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
    setupStyledSlider(fogNearSliderV2, fogNearValueV2, { format: val => `[${val}]` });
    setupStyledSlider(fogFarSliderV2, fogFarValueV2, { format: val => `[${val}]` });
    setupStyledSlider(cubeOpacitySliderV2, cubeOpacityValueV2, { isFloat: true, format: val => `[${val}]` });
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
        
        // Touch support
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleMouseDown(e.touches[0]);
        }, { passive: false });
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.handleMouseMove(e.touches[0]);
        }, { passive: false });
        this.canvas.addEventListener('touchend', () => this.handleMouseUp());
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

// ===============================
// Settings Caching (V2)
// ===============================
const settingsKeyV2 = 'portfolio3DSettings-v2';

const defaultSettingsV2 = {
    innerCubes: true,
    influence: 88,
    fogEnabled: true,
    fogNear: 20,
    fogFar: 60,
    fogColor: '#fafafa',
    bgColor: '#fafafa',
    cubeColor: '#ffffff',
    cubeOpacity: 1.0,
    splinePoints: [
        { x: 0, y: 1 },
        { x: 0.5, y: 0.5 },
        { x: 1, y: 0 }
    ]
};

function saveSettingsV2() {
    const settings = {
        innerCubes: toggleInnerCubesV2.checked,
        influence: influenceSliderV2.value,
        fogEnabled: toggleFogV2.checked,
        fogNear: fogNearSliderV2.value,
        fogFar: fogFarSliderV2.value,
        fogColor: fogColorPickerV2.value,
        bgColor: bgColorPickerV2.value,
        cubeColor: cubeColorPickerV2.value,
        cubeOpacity: cubeOpacitySliderV2.value,
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
    influenceSliderV2.value = settings.influence;
    toggleFogV2.checked = settings.fogEnabled;
    fogNearSliderV2.value = settings.fogNear;
    fogFarSliderV2.value = settings.fogFar;
    fogColorPickerV2.value = settings.fogColor;
    bgColorPickerV2.value = settings.bgColor;
    cubeColorPickerV2.value = settings.cubeColor;
    cubeOpacitySliderV2.value = settings.cubeOpacity;

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
    fogColorPickerV2.dispatchEvent(new Event('input'));
    bgColorPickerV2.dispatchEvent(new Event('input'));
    cubeColorPickerV2.dispatchEvent(new Event('input'));
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

        // Project the cube's original position to screen space to measure distance to cursor
        const screenPos = originalPositions.get(cube).clone().project(camera);
        const cubeScreenX = (screenPos.x + 1) * 0.5 * window.innerWidth;
        const cubeScreenY = (-screenPos.y + 1) * 0.5 * window.innerHeight;
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
        x: mouse.x * 0.83,
        y: -mouse.y * 0.5,
        z: -mouse.x * 0.5
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
// Physics-based Draggable Toolbox
// ===============================
if (toolboxV2) {
    const header = toolboxV2.querySelector('.toolbox-header');
    let isDragging = false;
    
    // Physics state
    let posX = 20; // Initial position from CSS right: 20px
    let posY = 20; // Initial position from CSS top: 20px
    let velocityX = 0;
    let velocityY = 0;
    let targetX = posX;
    let targetY = posY;
    
    // Tracking for momentum
    let lastMouseX = 0;
    let lastMouseY = 0;
    let lastUpdateTime = 0;
    const velocityHistory = [];
    const VELOCITY_SAMPLES = 5;
    
    // Physics constants - tuned for smooth feel
    const SPRING = 0.4;      // Increased from 0.2 for tighter following
    const FRICTION = 0.92;   // Air friction (1 = no friction, 0 = full stop)
    const BOUNCE = 0.7;      // Bounciness on collision (1 = perfect bounce, 0 = no bounce)
    const MASS = 1.2;        // Higher mass = more momentum
    const MARGIN = 20;       // Distance from window edges
    const DRAG_DAMPING = 0.6; // New: Additional damping while dragging
    
    // Initialize position based on current CSS position
    function initPosition() {
        const rect = toolboxV2.getBoundingClientRect();
        posX = window.innerWidth - rect.width - MARGIN;
        posY = MARGIN;
        targetX = posX;
        targetY = posY;
        
        // Switch to transform-based positioning
        toolboxV2.style.right = 'auto';
        toolboxV2.style.left = '0';
        toolboxV2.style.top = '0';
        updateToolboxPosition();
    }
    
    function updateToolboxPosition() {
        toolboxV2.style.transform = `translate3d(${posX}px, ${posY}px, 0)`;
    }
    
    function updateVelocity(currentX, currentY, deltaTime) {
        if (deltaTime === 0) return;
        
        const velocityX = (currentX - lastMouseX) / deltaTime;
        const velocityY = (currentY - lastMouseY) / deltaTime;
        
        velocityHistory.push({ x: velocityX, y: velocityY });
        if (velocityHistory.length > VELOCITY_SAMPLES) {
            velocityHistory.shift();
        }
    }
    
    function getAverageVelocity() {
        if (velocityHistory.length === 0) return { x: 0, y: 0 };
        
        const sum = velocityHistory.reduce((acc, val) => ({
            x: acc.x + val.x,
            y: acc.y + val.y
        }), { x: 0, y: 0 });
        
        return {
            x: (sum.x / velocityHistory.length) * MASS,
            y: (sum.y / velocityHistory.length) * MASS
        };
    }
    
    function applyConstraints() {
        const toolboxWidth = toolboxV2.offsetWidth;
        const toolboxHeight = toolboxV2.offsetHeight;
        
        // Window boundaries with margin
        const minX = MARGIN;
        const maxX = window.innerWidth - toolboxWidth - MARGIN;
        const minY = MARGIN;
        const maxY = window.innerHeight - toolboxHeight - MARGIN;
        
        // Bounce on X axis
        if (posX < minX) {
            posX = minX;
            velocityX = Math.abs(velocityX) * BOUNCE;
        } else if (posX > maxX) {
            posX = maxX;
            velocityX = -Math.abs(velocityX) * BOUNCE;
        }
        
        // Bounce on Y axis
        if (posY < minY) {
            posY = minY;
            velocityY = Math.abs(velocityY) * BOUNCE;
        } else if (posY > maxY) {
            posY = maxY;
            velocityY = -Math.abs(velocityY) * BOUNCE;
        }
    }
    
    let animationFrameId = null;
    
    function updatePhysics() {
        if (isDragging) {
            // Spring motion towards target while dragging
            const dx = targetX - posX;
            const dy = targetY - posY;
            
            // Apply spring force with additional damping while dragging
            velocityX = velocityX * DRAG_DAMPING + dx * SPRING;
            velocityY = velocityY * DRAG_DAMPING + dy * SPRING;
            
            // Direct position adjustment for more precise control
            posX += dx * 0.5;
            posY += dy * 0.5;
        } else {
            // Apply velocity
            velocityX *= FRICTION;
            velocityY *= FRICTION;
            posX += velocityX;
            posY += velocityY;
        }
        
        // Bounce off window edges
        applyConstraints();
        
        // Update position
        updateToolboxPosition();
        
        // Stop animation when nearly still
        const isMoving = Math.abs(velocityX) > 0.01 || Math.abs(velocityY) > 0.01;
        if (!isDragging && !isMoving) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        } else {
            animationFrameId = requestAnimationFrame(updatePhysics);
        }
    }
    
    function startDrag(clientX, clientY) {
        isDragging = true;
        header.style.cursor = 'grabbing';
        
        // Get current transform position
        const style = window.getComputedStyle(toolboxV2);
        const transform = new WebKitCSSMatrix(style.transform);
        const currentX = transform.m41;
        const currentY = transform.m42;
        
        // Calculate offset from current position
        const offsetX = clientX - currentX;
        const offsetY = clientY - currentY;
        
        // Set initial target to current position
        targetX = currentX;
        targetY = currentY;
        
        // Reset physics state
        velocityX = 0;
        velocityY = 0;
        lastMouseX = clientX;
        lastMouseY = clientY;
        lastUpdateTime = performance.now();
        velocityHistory.length = 0;
        
        function onMove(e) {
            const currentX = e.clientX;
            const currentY = e.clientY;
            
            // Update target based on mouse position and initial offset
            targetX = currentX - offsetX;
            targetY = currentY - offsetY;
            
            const currentTime = performance.now();
            const deltaTime = currentTime - lastUpdateTime;
            updateVelocity(currentX, currentY, deltaTime);
            
            lastMouseX = currentX;
            lastMouseY = currentY;
            lastUpdateTime = currentTime;
            
            if (!animationFrameId) {
                animationFrameId = requestAnimationFrame(updatePhysics);
            }
        }
        
        function onEnd() {
            isDragging = false;
            header.style.cursor = 'grab';
            
            // Apply flick velocity
            const avgVelocity = getAverageVelocity();
            velocityX = avgVelocity.x * 20; // Amplify the flick effect
            velocityY = avgVelocity.y * 20;
            
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onEnd);
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onEnd);
        }
        
        function onTouchMove(e) {
            e.preventDefault();
            onMove(e.touches[0]);
        }
        
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onEnd);
    }
    
    // Mouse events
    header.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return;
        startDrag(e.clientX, e.clientY);
    });
    
    // Touch events
    header.addEventListener('touchstart', (e) => {
        if (e.target.closest('button')) return;
        e.preventDefault();
        const touch = e.touches[0];
        startDrag(touch.clientX, touch.clientY);
    }, { passive: false });
    
    // Initialize position
    initPosition();
    
    // Handle window resize
    window.addEventListener('resize', () => {
        applyConstraints();
        updateToolboxPosition();
    });
} 