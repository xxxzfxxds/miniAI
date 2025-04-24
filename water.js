class WaterEffect {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.points = [];
        this.mouse = { x: null, y: null, radius: 100 };
        
        this.resize();
        this.init();
        this.animate();
        
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.x;
            this.mouse.y = e.y;
            this.createRipple();
        });
        
        window.addEventListener('resize', () => this.resize());
    }
    
    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }
    
    init() {
        const cols = Math.floor(this.width / 30);
        const rows = Math.floor(this.height / 30);
        
        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                this.points.push({
                    x: i * 30,
                    y: j * 30,
                    originalX: i * 30,
                    originalY: j * 30,
                    vx: 0,
                    vy: 0
                });
            }
        }
    }
    
    createRipple() {
        if (!this.mouse.x || !this.mouse.y) return;
        
        this.points.forEach(point => {
            const dx = point.x - this.mouse.x;
            const dy = point.y - this.mouse.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.mouse.radius) {
                const angle = Math.atan2(dy, dx);
                const force = (this.mouse.radius - distance) / this.mouse.radius;
                
                point.vx = force * Math.cos(angle) * 5;
                point.vy = force * Math.sin(angle) * 5;
            }
        });
    }
    
    update() {
        this.points.forEach(point => {
            const dx = point.originalX - point.x;
            const dy = point.originalY - point.y;
            
            point.vx += dx * 0.02;
            point.vy += dy * 0.02;
            
            point.vx *= 0.9;
            point.vy *= 0.9;
            
            point.x += point.vx;
            point.y += point.vy;
        });
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.fillStyle = '#ff69b4';
        
        this.ctx.beginPath();
        const cols = Math.floor(this.width / 30);
        
        for (let i = 0; i < this.points.length; i++) {
            const point = this.points[i];
            
            if (i % cols !== 0) {
                const prev = this.points[i - 1];
                this.ctx.moveTo(prev.x, prev.y);
                this.ctx.lineTo(point.x, point.y);
            }
            
            if (i >= cols) {
                const above = this.points[i - cols];
                this.ctx.moveTo(above.x, above.y);
                this.ctx.lineTo(point.x, point.y);
            }
        }
        
        this.ctx.strokeStyle = 'rgba(255, 105, 180, 0.2)';
        this.ctx.stroke();
        
        this.points.forEach(point => {
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, 1, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    animate() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('waterCanvas');
    new WaterEffect(canvas);
});
