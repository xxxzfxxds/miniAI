class RippleEffect {
    constructor() {
        this.canvas = document.getElementById('backgroundCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.points = [];
        this.mouse = { x: null, y: null };
        this.resize();
        this.init();
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.gridSize = Math.floor(this.width / 30);
        this.cols = Math.floor(this.width / this.gridSize) + 1;
        this.rows = Math.floor(this.height / this.gridSize) + 1;
    }

    init() {
        // Создаем сетку точек
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                this.points.push({
                    x: x * this.gridSize,
                    y: y * this.gridSize,
                    originX: x * this.gridSize,
                    originY: y * this.gridSize,
                    vx: 0,
                    vy: 0
                });
            }
        }

        // Обработчики событий
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });

        window.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.mouse.x = e.touches[0].clientX;
            this.mouse.y = e.touches[0].clientY;
        });

        window.addEventListener('resize', () => {
            this.resize();
            this.points = [];
            this.init();
        });

        this.animate();
    }

    animate() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Обновляем позиции точек
        this.points.forEach(point => {
            const dx = this.mouse.x - point.x;
            const dy = this.mouse.y - point.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Эффект волны при движении мыши
            if (distance < 200 && this.mouse.x) {
                const force = (200 - distance) / 200;
                const angle = Math.atan2(dy, dx);
                
                point.vx = force * Math.cos(angle) * 5;
                point.vy = force * Math.sin(angle) * 5;
            }
            
            // Возвращение в исходное положение
            point.vx += (point.originX - point.x) * 0.02;
            point.vy += (point.originY - point.y) * 0.02;
            
            // Трение
            point.vx *= 0.9;
            point.vy *= 0.9;
            
            // Обновление позиции
            point.x += point.vx;
            point.y += point.vy;
        });
        
        // Рисуем соединения между точками
        this.ctx.strokeStyle = 'rgba(255, 105, 180, 0.1)';
        this.ctx.lineWidth = 1;
        
        for (let y = 0; y < this.rows - 1; y++) {
            for (let x = 0; x < this.cols - 1; x++) {
                const i = y * this.cols + x;
                const p1 = this.points[i];
                const p2 = this.points[i + 1];
                const p3 = this.points[i + this.cols];
                
                this.ctx.beginPath();
                this.ctx.moveTo(p1.x, p1.y);
                this.ctx.lineTo(p2.x, p2.y);
                this.ctx.lineTo(p3.x, p3.y);
                this.ctx.closePath();
                this.ctx.stroke();
            }
        }
        
        // Рисуем точки (опционально)
        this.ctx.fillStyle = 'rgba(255, 105, 180, 0.3)';
        this.points.forEach(point => {
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, 1, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        requestAnimationFrame(() => this.animate());
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    new RippleEffect();
});
