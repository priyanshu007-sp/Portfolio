/**
 * Tilt.js - Premium 3D Tilt Effect with Dynamic Neon Glare
 * Adds 3D rotation, scaling, and cursor-aligned reflections to HTML elements on hover.
 */

class UniversalTilt {
    constructor(element, options = {}) {
        this.element = element;
        
        // Default Configuration
        this.settings = {
            max: options.max !== undefined ? options.max : 12,              // Max tilt rotation in degrees
            perspective: options.perspective !== undefined ? options.perspective : 1000, // Transform perspective
            scale: options.scale !== undefined ? options.scale : 1.03,      // Scale factor on hover
            speed: options.speed !== undefined ? options.speed : 600,       // Easing speed in ms
            easing: options.easing || 'cubic-bezier(0.1, 0.9, 0.2, 1)',     // Easing function
            glare: options.glare !== undefined ? options.glare : true,      // Enable glare reflection
            maxGlare: options.maxGlare !== undefined ? options.maxGlare : 0.35, // Max glare opacity (0 to 1)
            reverse: options.reverse ? -1 : 1,                              // Invert rotation direction
            gyroscope: options.gyroscope !== undefined ? options.gyroscope : true, // Enable mobile orientation
        };

        this.width = null;
        this.height = null;
        this.left = null;
        this.top = null;
        this.transitionTimeout = null;
        this.updateCall = null;

        this.onMouseEnter = this.onMouseEnter.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseLeave = this.onMouseLeave.bind(this);

        this.init();
    }

    init() {
        // Apply transform parent styles for 3D depth
        this.element.style.transformStyle = 'preserve-3d';
        
        // Prepare reflection/glare if enabled
        if (this.settings.glare) {
            this.prepareGlare();
        }

        // Event Listeners
        this.element.addEventListener('mouseenter', this.onMouseEnter);
        this.element.addEventListener('mousemove', this.onMouseMove);
        this.element.addEventListener('mouseleave', this.onMouseLeave);
        
        // Bind device orientation for mobile tilting
        if (this.settings.gyroscope && window.DeviceOrientationEvent) {
            this.onDeviceOrientation = this.onDeviceOrientation.bind(this);
            window.addEventListener('deviceorientation', this.onDeviceOrientation);
        }
    }

    prepareGlare() {
        // Create container
        this.glareElement = document.createElement('div');
        this.glareElement.classList.add('tilt-glare-container');
        Object.assign(this.glareElement.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            pointerEvents: 'none',
            borderRadius: window.getComputedStyle(this.element).borderRadius || '8px',
            zIndex: '99',
            transform: 'translateZ(0.1px)' // Render just above background
        });

        // Create light beam reflection inner div
        this.glareElementInner = document.createElement('div');
        this.glareElementInner.classList.add('tilt-glare-inner');
        
        // Dynamic gradient matching theme glow
        this.updateGlareColor();

        // Size it larger than parent to cover during rotation
        const maxDim = Math.max(this.element.offsetWidth, this.element.offsetHeight) * 2;
        Object.assign(this.glareElementInner.style, {
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: `${maxDim}px`,
            height: `${maxDim}px`,
            transform: 'translate(-50%, -50%)',
            opacity: '0',
            transition: `opacity ${this.settings.speed}ms ${this.settings.easing}`,
            mixBlendMode: 'screen'
        });

        this.glareElement.appendChild(this.glareElementInner);
        
        // Ensure parent layout supports absolute overlays
        if (window.getComputedStyle(this.element).position === 'static') {
            this.element.style.position = 'relative';
        }
        
        this.element.appendChild(this.glareElement);
    }

    updateGlareColor() {
        if (!this.glareElementInner) return;
        
        const isDark = window.isDarkMode ?? document.documentElement.classList.contains('dark');
        
        // In dark mode: use a sleek holographic indigo/violet/blue glare
        // In light mode: use a clean luminous white/light-blue glare
        if (isDark) {
            this.glareElementInner.style.backgroundImage = 'radial-gradient(circle, rgba(96, 165, 250, 0.4) 0%, rgba(121, 40, 202, 0.15) 45%, rgba(0,0,0,0) 80%)';
        } else {
            this.glareElementInner.style.backgroundImage = 'radial-gradient(circle, rgba(255, 255, 255, 0.85) 0%, rgba(59, 130, 246, 0.1) 50%, rgba(255,255,255,0) 85%)';
        }
    }

    onMouseEnter() {
        this.updateElementBounds();
        this.element.style.willChange = 'transform';
        this.setTransition();
    }

    onMouseMove(event) {
        if (this.updateCall !== null) {
            cancelAnimationFrame(this.updateCall);
        }
        
        this.updateCall = requestAnimationFrame(() => {
            this.update(event);
        });
    }

    onMouseLeave() {
        if (this.updateCall !== null) {
            cancelAnimationFrame(this.updateCall);
        }
        
        this.setTransition();
        this.reset();
    }

    updateElementBounds() {
        const rect = this.element.getBoundingClientRect();
        this.width = this.element.offsetWidth;
        this.height = this.element.offsetHeight;
        this.left = rect.left;
        this.top = rect.top;
    }

    update(event) {
        // Calculate mouse relative coordinates
        const x = event.clientX - this.left;
        const y = event.clientY - this.top;

        // Normalise inputs to range of [-0.5, 0.5]
        const nX = Math.min(Math.max(x / this.width, 0), 1) - 0.5;
        const nY = Math.min(Math.max(y / this.height, 0), 1) - 0.5;

        // Calculate rotation angles
        const rotateX = (-nY * this.settings.max * this.settings.reverse).toFixed(2);
        const rotateY = (nX * this.settings.max * this.settings.reverse).toFixed(2);

        // Apply styles
        this.element.style.transform = `perspective(${this.settings.perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${this.settings.scale}, ${this.settings.scale}, ${this.settings.scale})`;

        // Move glare reflecting angle
        if (this.settings.glare) {
            this.updateGlareColor(); // Dynamic light sync
            
            const glareX = (x / this.width) * 100;
            const glareY = (y / this.height) * 100;
            
            // Map distance from center to control glare opacity (stronger glare on edges)
            const distance = Math.hypot(nX, nY); // ranges 0 to 0.707
            const glareOpacity = (distance * 1.4 * this.settings.maxGlare).toFixed(3);

            this.glareElementInner.style.left = `${glareX}%`;
            this.glareElementInner.style.top = `${glareY}%`;
            this.glareElementInner.style.opacity = glareOpacity;
        }
    }

    setTransition() {
        clearTimeout(this.transitionTimeout);
        this.element.style.transition = `transform ${this.settings.speed}ms ${this.settings.easing}`;
        if (this.settings.glare) {
            this.glareElementInner.style.transition = `opacity ${this.settings.speed}ms ${this.settings.easing}, left ${this.settings.speed}ms ${this.settings.easing}, top ${this.settings.speed}ms ${this.settings.easing}`;
        }
        
        this.transitionTimeout = setTimeout(() => {
            this.element.style.transition = '';
            if (this.settings.glare) {
                this.glareElementInner.style.transition = '';
            }
        }, this.settings.speed);
    }

    reset() {
        this.element.style.transform = `perspective(${this.settings.perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
        if (this.settings.glare) {
            this.glareElementInner.style.opacity = '0';
        }
    }

    onDeviceOrientation(event) {
        if (!event.gamma || !event.beta) return;

        // Calculate rotation based on tilt angles gamma (left/right) and beta (front/back)
        this.updateElementBounds();
        
        const gamma = Math.min(Math.max(event.gamma, -30), 30); // clamp to +/- 30 deg
        const beta = Math.min(Math.max(event.beta, -30), 30);

        const nX = gamma / 30; // normalized to [-1, 1]
        const nY = beta / 30;

        const rotateX = (-nY * this.settings.max * 0.7).toFixed(2);
        const rotateY = (nX * this.settings.max * 0.7).toFixed(2);

        this.element.style.transform = `perspective(${this.settings.perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${this.settings.scale}, ${this.settings.scale}, ${this.settings.scale})`;
    }

    destroy() {
        clearTimeout(this.transitionTimeout);
        if (this.updateCall !== null) cancelAnimationFrame(this.updateCall);

        this.element.removeEventListener('mouseenter', this.onMouseEnter);
        this.element.removeEventListener('mousemove', this.onMouseMove);
        this.element.removeEventListener('mouseleave', this.onMouseLeave);
        
        if (this.settings.gyroscope && window.DeviceOrientationEvent) {
            window.removeEventListener('deviceorientation', this.onDeviceOrientation);
        }

        if (this.settings.glare) {
            this.glareElement.remove();
        }
        
        this.element.style.transform = '';
    }
}

// Auto-initialize elements with class 'js-tilt'
document.addEventListener('DOMContentLoaded', () => {
    const tiltElements = document.querySelectorAll('.js-tilt');
    tiltElements.forEach(el => {
        // Load custom config from data attributes if specified
        const max = el.getAttribute('data-tilt-max') ? parseFloat(el.getAttribute('data-tilt-max')) : undefined;
        const scale = el.getAttribute('data-tilt-scale') ? parseFloat(el.getAttribute('data-tilt-scale')) : undefined;
        const glare = el.getAttribute('data-tilt-glare') !== 'false';
        
        new UniversalTilt(el, { max, scale, glare });
    });
});
