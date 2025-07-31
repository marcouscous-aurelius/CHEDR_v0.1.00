// ===============================
// Physics-based Draggable Toolbox (BENCHED)
// ===============================
// This code was removed from the main script but preserved here for potential future use

function initializePhysicsToolbox(toolboxV2) {
    if (!toolboxV2) return;
    
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
        
        // Use stable viewport dimensions for boundaries
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
        }

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
    }
    
    // Mouse events
    header.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return;
        startDrag(e.clientX, e.clientY);
    });
    
    // Initialize position
    initPosition();
    
    // Handle window resize
    window.addEventListener('resize', () => {
        applyConstraints();
        updateToolboxPosition();
    });
}

// Export for potential future use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initializePhysicsToolbox };
} 