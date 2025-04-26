// Глобальные переменные
let selectedFile = null;
let isProcessing = false;
let cachedModel = null;

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', init);

function init() {
    initSliders();
    initFileUpload();
    initProcessButton();
    checkWebGLSupport();
}

// Проверка поддержки WebGL
function checkWebGLSupport() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
        showWarning('Ваше устройство может медленно обрабатывать ИИ. Рекомендуется Chrome с GPU.');
    }
}

function showWarning(message) {
    const warning = document.createElement('div');
    warning.className = 'ai-warning';
    warning.textContent = message;
    document.body.appendChild(warning);
    setTimeout(() => warning.remove(), 5000);
}

// Инициализация слайдеров
function initSliders() {
    const sliders = {
        denoiseStrength: ['очень лёгкая', 'лёгкая', 'умеренная', 'сильная'],
        finalDenoiseStrength: ['очень лёгкая', 'лёгкая', 'умеренная', 'сильная'],
        quality: ['низкое', 'среднее', 'хорошее', 'отличное']
    };

    Object.keys(sliders).forEach(id => {
        const slider = document.getElementById(id);
        const valueElement = document.getElementById(`${id}Value`);
        slider.addEventListener('input', () => updateSliderLabel(slider, valueElement, sliders[id]));
        updateSliderLabel(slider, valueElement, sliders[id]);
    });
}

function updateSliderLabel(slider, element, labels) {
    const value = slider.value;
    let text = `${value}/10 (`;
    if (value < 3) text += labels[0];
    else if (value < 6) text += labels[1];
    else if (value < 8) text += labels[2];
    else text += labels[3];
    element.textContent = text + ')';
}

// Загрузка файлов
function initFileUpload() {
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.add('highlight'));
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.remove('highlight'));
    });

    dropArea.addEventListener('drop', handleDrop);
    document.getElementById('selectFiles').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFiles);
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles({ target: { files } });
}

function handleFiles(e) {
    const file = e.target.files?.[0];
    if (!file || !file.type.match('image.*')) {
        showWarning('Пожалуйста, выберите изображение');
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        showWarning('Файл слишком большой (макс. 10MB)');
        return;
    }

    selectedFile = file;
    document.getElementById('options').classList.remove('hidden');

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            document.getElementById('originalImage').src = e.target.result;
            document.getElementById('originalInfo').textContent = 
                `${this.width}×${this.height}px | ${formatSize(file.size)}`;
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Кнопка обработки
function initProcessButton() {
    document.getElementById('processBtn').addEventListener('click', processImage);
    document.getElementById('downloadBtn').addEventListener('click', downloadResult);
}

async function processImage() {
    if (isProcessing || !selectedFile) return;
    isProcessing = true;

    const loadingDiv = document.getElementById('loading');
    const previewDiv = document.getElementById('preview');
    const progressBar = document.getElementById('progressBar');

    loadingDiv.classList.remove('hidden');
    previewDiv.classList.add('hidden');
    progressBar.style.width = '0%';

    try {
        updateProgress(5, 'Загрузка изображения');
        const img = await loadImage(selectedFile);
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Этапы обработки
        await applyProcessingPipeline(canvas, ctx, progressBar);

        // Сохранение результата
        updateProgress(95, 'Финальная обработка');
        const quality = document.getElementById('quality').value / 10;
        document.getElementById('resultImage').src = canvas.toDataURL('image/jpeg', quality);
        document.getElementById('resultInfo').textContent = 
            `${canvas.width}×${canvas.height}px | ~${formatSize(selectedFile.size * 2)}`;

        previewDiv.classList.remove('hidden');
    } catch (error) {
        console.error('Ошибка обработки:', error);
        showWarning('Ошибка: ' + error.message);
    } finally {
        isProcessing = false;
        loadingDiv.classList.add('hidden');
    }
}

async function applyProcessingPipeline(canvas, ctx, progressBar) {
    const updateProg = (p) => progressBar.style.width = `${p}%`;

    // Первичное шумоподавление
    const denoiseStr = document.getElementById('denoiseStrength').value;
    if (denoiseStr > 0) {
        updateProgress(10, 'Первичная очистка шумов');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        await applyBilateralFilter(imageData, denoiseStr, p => updateProg(10 + p * 15));
        ctx.putImageData(imageData, 0, 0);
    }

    // Масштабирование
    updateProgress(30, 'Увеличение изображения');
    const scale = parseInt(document.getElementById('scaleFactor').value);
    canvas.width = canvas.width * scale;
    canvas.height = canvas.height * scale;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(ctx.canvas, 0, 0, canvas.width, canvas.height);

    // ИИ-улучшение
    if (document.getElementById('aiEnhance').checked) {
        updateProgress(50, 'ИИ-улучшение');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        await applyAIEnhancement(imageData, p => updateProg(50 + p * 30));
        ctx.putImageData(imageData, 0, 0);
    }

    // Финальное шумоподавление
    const finalDenoiseStr = document.getElementById('finalDenoiseStrength').value;
    if (finalDenoiseStr > 0) {
        updateProgress(85, 'Финальная очистка');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        await applyBilateralFilter(imageData, finalDenoiseStr, p => updateProg(85 + p * 10));
        ctx.putImageData(imageData, 0, 0);
    }
}

// Реальные алгоритмы обработки
async function applyBilateralFilter(imageData, strength, progressCallback) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const result = new Uint8ClampedArray(data.length);

    const sigma = 3 + strength * 0.5;
    const radius = Math.ceil(sigma * 1.5);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = data[idx], g = data[idx+1], b = data[idx+2];

            let totalWeight = 0, sumR = 0, sumG = 0, sumB = 0;

            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const nx = clamp(x + dx, 0, width-1);
                    const ny = clamp(y + dy, 0, height-1);
                    const nIdx = (ny * width + nx) * 4;

                    const spaceDist = dx*dx + dy*dy;
                    const colorDist = Math.pow(data[nIdx]-r,2) + Math.pow(data[nIdx+1]-g,2) + Math.pow(data[nIdx+2]-b,2);
                    const weight = Math.exp(-(spaceDist/(2*sigma*sigma) - colorDist/100);

                    sumR += data[nIdx] * weight;
                    sumG += data[nIdx+1] * weight;
                    sumB += data[nIdx+2] * weight;
                    totalWeight += weight;
                }
            }

            result[idx] = sumR / totalWeight;
            result[idx+1] = sumG / totalWeight;
            result[idx+2] = sumB / totalWeight;
            result[idx+3] = data[idx+3];
        }

        if (y % 10 === 0) await delay(progressCallback(y / height));
    }

    for (let i = 0; i < data.length; i++) data[i] = result[i];
    progressCallback(1);
}

async function applyAIEnhancement(imageData, progressCallback) {
    if (!cachedModel) {
        try {
            progressCallback(0.1);
            cachedModel = await tf.loadGraphModel('/models/scale2.0x_model.json', {
                onProgress: p => progressCallback(0.1 + p * 0.3)
            });
        } catch (error) {
            showWarning('Не удалось загрузить ИИ-модель. Используется базовое улучшение.');
            return fakeAIEnhancement(imageData, progressCallback);
        }
    }

    const tensor = tf.tidy(() => {
        return tf.browser.fromPixels(imageData)
            .toFloat()
            .div(255.0)
            .expandDims(0);
    });

    try {
        progressCallback(0.5);
        const output = await cachedModel.predict(tensor);
        progressCallback(0.8);
        await tf.browser.toPixels(output.squeeze().mul(255.0), imageData);
    } finally {
        tf.dispose([tensor]);
        progressCallback(1);
    }
}

function fakeAIEnhancement(imageData, progressCallback) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        data[i] = clamp(data[i] * 1.1, 0, 255);     // R
        data[i+1] = clamp(data[i+1] * 1.1, 0, 255); // G
        data[i+2] = clamp(data[i+2] * 1.1, 0, 255); // B
        if (i % 4000 === 0) delay(progressCallback(i / data.length));
    }
    progressCallback(1);
}

// Вспомогательные функции
function updateProgress(percent, message = '') {
    document.getElementById('progressBar').style.width = percent + '%';
    if (message) console.log(message);
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' Б';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ';
    return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
}

function loadImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
}

function downloadResult() {
    const resultImg = document.getElementById('resultImage');
    if (!resultImg.src) return;

    const link = document.createElement('a');
    link.href = resultImg.src;
    link.download = `enhanced_${selectedFile.name.replace(/\.[^/.]+$/, '')}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function clamp(value, min = 0, max = 255) {
    return Math.max(min, Math.min(max, value));
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
