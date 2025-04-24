class RippleEffect {
    constructor() {
        this.canvas = document.getElementById('backgroundCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.points = [];
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
        window.addEventListener('mousemove', (e) => this.addPoint(e));
    }

    addPoint(e) {
        this.points.push({
            x: e.clientX,
            y: e.clientY,
            size: 0,
            maxSize: 50 + Math.random() * 100,
            speed: 1 + Math.random() * 2,
            alpha: 0.5
        });
    }

    drawWave() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#1a0a0f';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.points.forEach((point, index) => {
            point.size += point.speed;
            point.alpha = Math.max(0, 1 - point.size / point.maxSize);

            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, point.size, 0, Math.PI * 2);
            this.ctx.strokeStyle = `rgba(255, 105, 180, ${point.alpha})`;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            if (point.size > point.maxSize) {
                this.points.splice(index, 1);
            }
        });
    }

    animate() {
        this.drawWave();
        requestAnimationFrame(() => this.animate());
    }
}

new RippleEffect();
