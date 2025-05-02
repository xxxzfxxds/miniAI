class RippleEffect {
    constructor() {
        this.canvas = document.getElementById('backgroundCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.points = [];
        this.mouse = { x: 0, y: 0 };
        this.lastMouse = { x: 0, y: 0 };
        this.resize();
        this.initEvents();
        this.animate();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    initEvents() {
        window.addEventListener('resize', () => this.resize());
        
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
            
            const dx = this.mouse.x - this.lastMouse.x;
            const dy = this.mouse.y - this.lastMouse.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 10) {
                this.createRipples(this.mouse.x, this.mouse.y, distance / 5);
                this.lastMouse.x = this.mouse.x;
                this.lastMouse.y = this.mouse.y;
            }
        });
        
        window.addEventListener('click', (e) => {
            this.createRipples(e.clientX, e.clientY, 15);
        });
    }

    createRipples(x, y, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 20;
            const offsetX = Math.cos(angle) * distance;
            const offsetY = Math.sin(angle) * distance;
            
            this.points.push({
                x: x + offsetX,
                y: y + offsetY,
                size: 0,
                maxSize: 30 + Math.random() * 70,
                speed: 0.5 + Math.random() * 1.5,
                alpha: 0.3 + Math.random() * 0.4,
                color: this.getRandomPinkColor()
            });
        }
    }

    getRandomPinkColor() {
        const colors = [
            '255, 105, 180',
            '255, 20, 147',
            '255, 182, 193',
            '219, 112, 147',
            '199, 21, 133'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    drawWave() {
        this.ctx.fillStyle = 'rgba(26, 10, 15, 0.05)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.points.forEach((point, index) => {
            point.size += point.speed;
            point.alpha = Math.max(0, 0.7 * (1 - point.size / point.maxSize));

            const gradient = this.ctx.createRadialGradient(
                point.x, point.y, 0,
                point.x, point.y, point.size
            );
            gradient.addColorStop(0, `rgba(${point.color}, ${point.alpha})`);
            gradient.addColorStop(0.8, `rgba(${point.color}, ${point.alpha * 0.5})`);
            gradient.addColorStop(1, `rgba(${point.color}, 0)`);

            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, point.size, 0, Math.PI * 2);
            this.ctx.fillStyle = gradient;
            this.ctx.fill();

            if (point.size > point.maxSize) {
                this.points.splice(index, 1);
            }
        });

        if (this.points.length > 0) {
            const dx = this.mouse.x - this.lastMouse.x;
            const dy = this.mouse.y - this.lastMouse.y;
            const velocity = Math.sqrt(dx * dx + dy * dy);
            
            if (velocity > 2) {
                this.createRipples(this.mouse.x, this.mouse.y, 1);
            }
        }
    }

    animate() {
        this.drawWave();
        requestAnimationFrame(() => this.animate());
    }
}

new RippleEffect();
