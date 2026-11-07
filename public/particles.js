const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];
const mouse = { x: -1000, y: -1000 };

// Configuration for Constellation Particle System
const config = {
    particleCount: 150,
    particleRadius: 1.5,
    maxDistance: 130, // Distance to draw connecting lines
    repelRadius: 180, // Antigravity cursor repel distance
    speed: 0.3,
    colorLight: 'rgba(0, 0, 0, 0.4)',    // Darker dots for light mode
    colorDark: 'rgba(255, 255, 255, 0.4)', // Lighter dots for dark mode
    strokeLight: 'rgba(0, 0, 0, ',       // Prefix for light mode connecting lines
    strokeDark: 'rgba(255, 255, 255, '   // Prefix for dark mode connecting lines 
};

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}

window.addEventListener('resize', () => {
    resize();
    initParticles(); // Re-initialize particles on resize to ensure even distribution
});
resize();

class Particle {
    constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * config.speed * 2;
        this.vy = (Math.random() - 0.5) * config.speed * 2;
        this.baseX = this.x;
        this.baseY = this.y;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Wrap around edges to keep particles flowing continuously
        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;

        // Instant Repel from Antigravity Cursor
        let dx = mouse.x - this.x;
        let dy = mouse.y - this.y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < config.repelRadius) {
            let forceDirectionX = dx / distance;
            let forceDirectionY = dy / distance;
            // The closer the mouse, the stronger the force
            let force = (config.repelRadius - distance) / config.repelRadius;
            
            // Push particle instantly away from cursor
            let pushX = forceDirectionX * force * 15;
            let pushY = forceDirectionY * force * 15;
            
            this.x -= pushX;
            this.y -= pushY;
        }
    }

    draw() {
        const isDark = window.isDarkMode;
        ctx.fillStyle = isDark ? config.colorDark : config.colorLight;
        ctx.beginPath();
        ctx.arc(this.x, this.y, config.particleRadius, 0, Math.PI * 2);
        ctx.fill();
    }
}

function initParticles() {
    particles = [];
    // Adjust particle count based on screen size (responsive)
    const count = Math.min(config.particleCount, (width * height) / 8000);
    for (let i = 0; i < count; i++) {
        particles.push(new Particle());
    }
}

function animate() {
    ctx.clearRect(0, 0, width, height);

    const isDark = window.isDarkMode;
    const strokePrefix = isDark ? config.strokeDark : config.strokeLight;

    for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();

        // Check for nearby particles and draw lines
        for (let j = i + 1; j < particles.length; j++) {
            let dx = particles[i].x - particles[j].x;
            let dy = particles[i].y - particles[j].y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < config.maxDistance) {
                let opacity = 1 - (distance / config.maxDistance);
                // Adjust opacity slightly lower for subtleness
                ctx.strokeStyle = strokePrefix + (opacity * 0.4) + ')';
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
            }
        }
    }

    requestAnimationFrame(animate);
}

window.addEventListener('mousemove', (e) => {
    mouse.x = e.x; // Gets cursor X
    mouse.y = e.y; // Gets cursor Y
});

window.addEventListener('mouseout', () => {
    // Reset mouse when leaving window so particles aren't repelled by an invisible cursor
    mouse.x = -1000;
    mouse.y = -1000;
});

// Start the particle system
initParticles();
animate();
