class ImageEnhancer {
    constructor() {
        this.model = null;
        this.ready = false;
    }

    async load() {
        // Показываем статус загрузки
        document.getElementById('modelStatus').classList.remove('hidden');
        document.getElementById('modelStatusText').textContent = 'Загрузка модели...';
        
        try {
            // Упрощенная модель ESRGAN для браузера
            this.model = tf.sequential();
            
            // Входной слой
            this.model.add(tf.layers.inputLayer({inputShape: [null, null, 3]}));
            
            // Первый сверточный блок
            this.model.add(tf.layers.conv2d({
                filters: 64,
                kernelSize: 3,
                padding: 'same',
                activation: 'relu'
            }));
            
            // 8 остаточных блоков (упрощенных для браузера)
            for (let i = 0; i < 8; i++) {
                this.model.add(this.residualBlock(64));
            }
            
            // Блок увеличения разрешения
            this.model.add(tf.layers.conv2d({
                filters: 256,
                kernelSize: 3,
                padding: 'same'
            }));
            this.model.add(tf.layers.depthToSpace({blockSize: 2}));
            this.model.add(tf.layers.leakyReLU({alpha: 0.2}));
            
            // Финальный сверточный слой
            this.model.add(tf.layers.conv2d({
                filters: 3,
                kernelSize: 3,
                padding: 'same',
                activation: 'tanh'
            }));
            
            // Загрузка предобученных весов
            await this.loadWeights();
            
            this.ready = true;
            document.getElementById('modelStatusText').textContent = 'Модель готова';
            setTimeout(() => {
                document.getElementById('modelStatus').classList.add('hidden');
            }, 2000);
            
            console.log('Модель загружена и готова к использованию');
        } catch (error) {
            console.error('Ошибка загрузки модели:', error);
            document.getElementById('modelStatusText').textContent = 'Ошибка загрузки модели';
            this.ready = false;
        }
    }
    
    async loadWeights() {
        // В реальном проекте загружаем веса с сервера
        // Здесь просто инициализируем случайными весами для примера
        const weights = [];
        for (const layer of this.model.layers) {
            if (layer.getWeights().length > 0) {
                const shapes = layer.getWeights().map(w => w.shape);
                weights.push(...shapes.map(shape => tf.randomNormal(shape)));
            }
        }
        this.model.setWeights(weights);
    }
    
    residualBlock(filters) {
        const block = tf.sequential();
        
        block.add(tf.layers.conv2d({
            filters: filters,
            kernelSize: 3,
            padding: 'same',
            activation: 'relu'
        }));
        
        block.add(tf.layers.conv2d({
            filters: filters,
            kernelSize: 3,
            padding: 'same'
        }));
        
        block.add(tf.layers.add());
        
        return block;
    }
    
    async enhance(imageData, progressCallback) {
        if (!this.ready) {
            throw new Error('Модель не загружена');
        }
        
        // Преобразование ImageData в тензор
        const {data, width, height} = imageData;
        const inputData = new Float32Array(width * height * 3);
        
        // Нормализация и удаление альфа-канала
        for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
            inputData[j] = data[i] / 127.5 - 1;
            inputData[j + 1] = data[i + 1] / 127.5 - 1;
            inputData[j + 2] = data[i + 2] / 127.5 - 1;
        }
        
        const inputTensor = tf.tensor4d(inputData, [1, height, width, 3]);
        
        // Прогнозирование
        const outputTensor = this.model.predict(inputTensor);
        const outputData = await outputTensor.data();
        
        // Денормализация и запись результатов
        for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
            data[i] = Math.max(0, Math.min(255, (outputData[j] + 1) * 127.5));
            data[i + 1] = Math.max(0, Math.min(255, (outputData[j + 1] + 1) * 127.5));
            data[i + 2] = Math.max(0, Math.min(255, (outputData[j + 2] + 1) * 127.5));
            // Альфа-канал оставляем без изменений
        }
        
        // Очистка памяти
        tf.dispose([inputTensor, outputTensor]);
        
        progressCallback(1);
    }
}

// Создаем глобальный экземпляр модели
const imageEnhancer = new ImageEnhancer();

// Загрузка модели при старте
document.addEventListener('DOMContentLoaded', async () => {
    await imageEnhancer.load();
});
