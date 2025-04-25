// Глобальные переменные
let aiModel = null;
let isModelLoading = false;
let selectedFile = null;
let isProcessing = false;

// Элементы DOM
const elements = {
    dropArea: document.getElementById('dropArea'),
    fileInput: document.getElementById('fileInput'),
    selectFilesBtn: document.getElementById('selectFiles'),
    optionsDiv: document.getElementById('options'),
    processBtn: document.getElementById('processBtn'),
    loadingDiv: document.getElementById('loading'),
    previewDiv: document.getElementById('preview'),
    originalImage: document.getElementById('originalImage'),
    resultImage: document.getElementById('resultImage'),
    originalInfo: document.getElementById('originalInfo'),
    resultInfo: document.getElementById('resultInfo'),
    downloadBtn: document.getElementById('downloadBtn'),
    denoiseStrength: document.getElementById('denoiseStrength'),
    denoiseValue: document.getElementById('denoiseValue'),
    finalDenoiseStrength: document.getElementById('finalDenoiseStrength'),
    finalDenoiseValue: document.getElementById('finalDenoiseValue'),
    scaleFactor: document.getElementById('scaleFactor'),
    qualitySlider: document.getElementById('quality'),
    qualityValue: document.getElementById('qualityValue'),
    smoothStrength: document.getElementById('smoothStrength'),
    smoothValue: document.getElementById('smoothValue'),
    sharpnessSlider: document.getElementById('sharpness'),
    sharpnessValue: document.getElementById('sharpnessValue'),
    aiEnhanceCheckbox: document.getElementById('aiEnhance'),
    progressBar: document.getElementById('progressBar'),
    modelStatus: document.getElementById('modelStatus'),
    modelStatusText: document.getElementById('modelStatusText')
};

// Инициализация приложения
function init() {
    setupEventListeners();
    updateAllLabels();
    loadAIModel();
}

// Настройка обработчиков событий
function setupEventListeners() {
    elements.denoiseStrength.addEventListener('input', () => updateLabel(elements.denoiseStrength, elements.denoiseValue, ['очень лёгкая', 'лёгкая', 'умеренная', 'сильная']));
    elements.finalDenoiseStrength.addEventListener('input', () => updateLabel(elements.finalDenoiseStrength, elements.finalDenoiseValue, ['очень лёгкая', 'лёгкая', 'умеренная', 'сильная']));
    elements.qualitySlider.addEventListener('input', () => updateLabel(elements.qualitySlider, elements.qualityValue, ['низкое', 'среднее', 'хорошее', 'отличное']));
    elements.smoothStrength.addEventListener('input', () => updateLabel(elements.smoothStrength, elements.smoothValue, ['умное', 'адаптивное', 'сильное', 'ультра-плавное']));
    elements.sharpnessSlider.addEventListener('input', () => updateLabel(elements.sharpnessSlider, elements.sharpnessValue, ['слабая', 'умеренная', 'сильная', 'экстремальная']));
    
    elements.selectFilesBtn.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', handleFiles);
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        elements.dropArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        elements.dropArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        elements.dropArea.addEventListener(eventName, unhighlight, false);
    });
    
    elements.dropArea.addEventListener('drop', handleDrop, false);
    elements.processBtn.addEventListener('click', processImage);
    elements.downloadBtn.addEventListener('click', downloadResult);
}

// Обновление всех меток
function updateAllLabels() {
    updateLabel(elements.denoiseStrength, elements.denoiseValue, ['очень лёгкая', 'лёгкая', 'умеренная', 'сильная']);
    updateLabel(elements.finalDenoiseStrength, elements.finalDenoiseValue, ['очень лёгкая', 'лёгкая', 'умеренная', 'сильная']);
    updateLabel(elements.qualitySlider, elements.qualityValue, ['низкое', 'среднее', 'хорошее', 'отличное']);
    updateLabel(elements.smoothStrength, elements.smoothValue, ['умное', 'адаптивное', 'сильное', 'ультра-плавное']);
    updateLabel(elements.sharpnessSlider, elements.sharpnessValue, ['слабая', 'умеренная', 'сильная', 'экстремальная']);
}

// Обновление конкретной метки
function updateLabel(slider, valueElement, labels) {
    const value = slider.value;
    let text = `${value}/10 (`;
    
    if (value < 3) text += labels[0];
    else if (value < 6) text += labels[1];
    else if (value < 8) text += labels[2];
    else text += labels[3];
    
    text += ')';
    valueElement.textContent = text;
}

// Загрузка ИИ модели
async function loadAIModel() {
    if (isModelLoading) return;
    isModelLoading = true;
    
    elements.modelStatus.classList.remove('hidden');
    elements.modelStatusText.textContent = 'Загрузка ИИ модели...';
    
    try {
        aiModel = await ort.InferenceSession.create(
            'https://your-model-host.com/models/real_esrgan.onnx',
            { executionProviders: ['webgl'] }
        );
        elements.modelStatusText.textContent = 'ИИ модель готова';
        setTimeout(() => elements.modelStatus.classList.add('hidden'), 2000);
    } catch (error) {
        console.error('Ошибка загрузки модели:', error);
        elements.modelStatusText.textContent = 'Ошибка загрузки ИИ модели';
        aiModel = null;
    } finally {
        isModelLoading = false;
    }
}

// Обработка загруженных файлов
function handleFiles(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.match('image.*')) {
        alert('Пожалуйста, выберите изображение');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
        alert('Файл слишком большой. Максимальный размер 10MB');
        return;
    }
    
    selectedFile = file;
    elements.optionsDiv.classList.remove('hidden');
    
    const reader = new FileReader();
    reader.onload = function(e) {
        elements.originalImage.src = e.target.result;
        
        const img = new Image();
        img.onload = function() {
            elements.originalInfo.textContent = `${img.width} × ${img.height}px | ${formatSize(file.size)}`;
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Обработка перетаскивания файлов
function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles({ target: { files } });
}

// Основная функция обработки изображения
async function processImage() {
    if (isProcessing || !selectedFile) return;
    isProcessing = true;
    
    elements.loadingDiv.classList.remove('hidden');
    elements.optionsDiv.classList.add('hidden');
    elements.previewDiv.classList.add('hidden');
    elements.progressBar.style.width = '0%';
    resetSteps();
    
    try {
        updateStep('step1');
        await updateProgress(5, 500);
        const img = await loadImage(selectedFile);
        await updateProgress(10, 300);
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const denoiseStrengthValue = parseFloat(elements.denoiseStrength.value);
        if (denoiseStrengthValue > 0) {
            updateStep('step2');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            await applyBilateralFilter(imageData, denoiseStrengthValue, (progress) => {
                elements.progressBar.style.width = `${10 + progress * 10}%`;
            });
            ctx.putImageData(imageData, 0, 0);
            await updateProgress(20, 300);
        }
        
        updateStep('step3');
        const scale = parseInt(elements.scaleFactor.value);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        await updateProgress(30, 800);
        
        const smoothStrengthValue = parseFloat(elements.smoothStrength.value);
        if (smoothStrengthValue > 0) {
            updateStep('step4');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            await applyFullSmoothing(imageData, smoothStrengthValue, (progress) => {
                elements.progressBar.style.width = `${30 + progress * 15}%`;
            });
            ctx.putImageData(imageData, 0, 0);
            await updateProgress(45, 300);
        }
        
        if (elements.aiEnhanceCheckbox.checked) {
            updateStep('step5');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            await applyAIEnhancement(imageData, (progress) => {
                elements.progressBar.style.width = `${45 + progress * 15}%`;
            });
            ctx.putImageData(imageData, 0, 0);
            await updateProgress(60, 500);
        }
        
        const sharpnessValue = parseFloat(elements.sharpnessSlider.value);
        if (sharpnessValue > 0) {
            updateStep('step6');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            await applySharpness(imageData, sharpnessValue, (progress) => {
                elements.progressBar.style.width = `${60 + progress * 15}%`;
            });
            ctx.putImageData(imageData, 0, 0);
            await updateProgress(75, 300);
        }
        
        const finalDenoiseStrengthValue = parseFloat(elements.finalDenoiseStrength.value);
        if (finalDenoiseStrengthValue > 0) {
            updateStep('step7');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            await applyBilateralFilter(imageData, finalDenoiseStrengthValue, (progress) => {
                elements.progressBar.style.width = `${75 + progress * 15}%`;
            });
            ctx.putImageData(imageData, 0, 0);
            await updateProgress(90, 300);
        }
        
        updateStep('step8');
        await updateProgress(95, 500);
        const quality = elements.qualitySlider.value / 10;
        elements.resultImage.src = canvas.toDataURL('image/jpeg', quality);
        await updateProgress(100, 300);
        
        elements.loadingDiv.classList.add('hidden');
        elements.previewDiv.classList.remove('hidden');
        elements.resultInfo.textContent = `${canvas.width} × ${canvas.height}px | ${formatSize(selectedFile.size * scale * quality * 0.5)}`;
        
    } catch (error) {
        console.error('Ошибка обработки:', error);
        elements.loadingDiv.classList.add('hidden');
        alert('Произошла ошибка при обработке изображения');
    } finally {
        isProcessing = false;
    }
}

// Билатеральный фильтр
async function applyBilateralFilter(imageData, strength, progressCallback) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    const sigmaSpace = 3 + strength * 0.5;
    const sigmaColor = 10 + strength * 2;
    const radius = Math.ceil(sigmaSpace * 1.5);
    const result = new Uint8ClampedArray(data.length);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const centerIdx = (y * width + x) * 4;
            const centerR = data[centerIdx];
            const centerG = data[centerIdx + 1];
            const centerB = data[centerIdx + 2];
            
            let totalWeight = 0;
            let sumR = 0, sumG = 0, sumB = 0;
            
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const nx = Math.min(width - 1, Math.max(0, x + dx));
                    const ny = Math.min(height - 1, Math.max(0, y + dy));
                    
                    const idx = (ny * width + nx) * 4;
                    const r = data[idx];
                    const g = data[idx + 1];
                    const b = data[idx + 2];
                    
                    const spaceDist = dx * dx + dy * dy;
                    const spaceWeight = Math.exp(-spaceDist / (2 * sigmaSpace * sigmaSpace));
                    
                    const colorDist = (
                        Math.pow(r - centerR, 2) + 
                        Math.pow(g - centerG, 2) + 
                        Math.pow(b - centerB, 2)
                    );
                    const colorWeight = Math.exp(-colorDist / (2 * sigmaColor * sigmaColor));
                    
                    const weight = spaceWeight * colorWeight;
                    
                    sumR += r * weight;
                    sumG += g * weight;
                    sumB += b * weight;
                    totalWeight += weight;
                }
            }
            
            const resultIdx = (y * width + x) * 4;
            result[resultIdx] = sumR / totalWeight;
            result[resultIdx + 1] = sumG / totalWeight;
            result[resultIdx + 2] = sumB / totalWeight;
            result[resultIdx + 3] = data[centerIdx + 3];
        }
        
        if (y % 10 === 0) {
            progressCallback(y / height * 0.8);
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }
    
    for (let i = 0; i < data.length; i++) {
        data[i] = result[i];
    }
    
    progressCallback(1);
}

// Полное сглаживание
async function applyFullSmoothing(imageData, strength, progressCallback) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    if (strength < 0.5) {
        progressCallback(1);
        return;
    }
    
    const radius = Math.ceil(1 + strength / 3);
    const edgeThreshold = 30 - strength * 2;
    
    const buffer1 = new Uint8ClampedArray(data);
    const buffer2 = new Uint8ClampedArray(data.length);
    
    // 1. Анизотропное размытие
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            
            // Детектор границ
            let gx = 0, gy = 0;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const nx = Math.min(width-1, Math.max(0, x + dx));
                    const ny = Math.min(height-1, Math.max(0, y + dy));
                    const nIdx = (ny * width + nx) * 4;
                    const gray = 0.3 * buffer1[nIdx] + 0.59 * buffer1[nIdx+1] + 0.11 * buffer1[nIdx+2];
                    
                    if (dx === -1) gx -= gray;
                    if (dx === 1) gx += gray;
                    if (dy === -1) gy -= gray;
                    if (dy === 1) gy += gray;
                }
            }
            const edgeStrength = Math.sqrt(gx*gx + gy*gy);
            
            if (edgeStrength > edgeThreshold) {
                for (let c = 0; c < 3; c++) {
                    buffer2[idx + c] = buffer1[idx + c];
                }
            } else {
                let sum = [0, 0, 0];
                let count = 0;
                
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const nx = Math.min(width-1, Math.max(0, x + dx));
                        const ny = Math.min(height-1, Math.max(0, y + dy));
                        const nIdx = (ny * width + nx) * 4;
                        
                        for (let c = 0; c < 3; c++) {
                            sum[c] += buffer1[nIdx + c];
                        }
                        count++;
                    }
                }
                
                for (let c = 0; c < 3; c++) {
                    buffer2[idx + c] = sum[c] / count;
                }
            }
            buffer2[idx + 3] = buffer1[idx + 3];
        }
        
        if (y % 10 === 0) {
            progressCallback(y / height * 0.5);
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }
    
    // 2. Билатеральная фильтрация
    const sigmaColor = 10 + strength * 2;
    for (let i = 0; i < data.length; i += 4) {
        const x = (i / 4) % width;
        const y = Math.floor((i / 4) / width);
        
        let sum = [0, 0, 0], totalWeight = 0;
        const centerR = buffer2[i], centerG = buffer2[i+1], centerB = buffer2[i+2];
        
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const nx = Math.min(width-1, Math.max(0, x + dx));
                const ny = Math.min(height-1, Math.max(0, y + dy));
                const nIdx = (ny * width + nx) * 4;
                
                const colorDist = Math.sqrt(
                    Math.pow(buffer2[nIdx] - centerR, 2) +
                    Math.pow(buffer2[nIdx+1] - centerG, 2) +
                    Math.pow(buffer2[nIdx+2] - centerB, 2)
                );
                
                const weight = Math.exp(-colorDist / (2 * sigmaColor * sigmaColor));
                
                for (let c = 0; c < 3; c++) {
                    sum[c] += buffer2[nIdx + c] * weight;
                }
                totalWeight += weight;
            }
        }
        
        for (let c = 0; c < 3; c++) {
            data[i + c] = sum[c] / totalWeight;
        }
        data[i + 3] = buffer2[i + 3];
        
        if (i % 4000 === 0) {
            progressCallback(0.5 + (i / data.length) * 0.5);
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }
    
    progressCallback(1);
}

// Улучшение с помощью ИИ
async function applyAIEnhancement(imageData, progressCallback) {
    try {
        if (!imageEnhancer.ready) {
            throw new Error('Модель не загружена');
        }
        
        const startTime = performance.now();
        await imageEnhancer.enhance(imageData, progressCallback);
        console.log(`ИИ обработка заняла ${(performance.now() - startTime).toFixed(1)}ms`);
    } catch (error) {
        console.error('Ошибка ИИ обработки:', error);
        // Fallback на базовое улучшение
        return applyBasicEnhancement(imageData, progressCallback);
    }
}

// Подготовка входных данных для ИИ
function prepareInputTensor(imageData) {
    const { data, width, height } = imageData;
    const inputData = new Float32Array(width * height * 3);
    
    for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
        inputData[j] = data[i] / 255.0;
        inputData[j + 1] = data[i + 1] / 255.0;
        inputData[j + 2] = data[i + 2] / 255.0;
    }
    
    return new ort.Tensor('float32', inputData, [1, height, width, 3]);
}

// Применение результатов ИИ
function applyModelOutput(imageData, outputTensor) {
    const outputData = outputTensor.data;
    for (let i = 0, j = 0; i < imageData.data.length; i += 4, j += 3) {
        imageData.data[i] = Math.round(outputData[j] * 255);
        imageData.data[i + 1] = Math.round(outputData[j + 1] * 255);
        imageData.data[i + 2] = Math.round(outputData[j + 2] * 255);
    }
}

// Базовое улучшение (без ИИ)
async function applyBasicEnhancement(imageData, progressCallback) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const originalData = new Uint8ClampedArray(data);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            
            const contrast = 1.2;
            data[idx] = clamp((((r / 255) - 0.5) * contrast + 0.5) * 255);
            data[idx + 1] = clamp((((g / 255) - 0.5) * contrast + 0.5) * 255);
            data[idx + 2] = clamp((((b / 255) - 0.5) * contrast + 0.5) * 255);
            
            const avg = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            const saturation = 1.3;
            data[idx] = clamp(avg + (data[idx] - avg) * saturation);
            data[idx + 1] = clamp(avg + (data[idx + 1] - avg) * saturation);
            data[idx + 2] = clamp(avg + (data[idx + 2] - avg) * saturation);
        }
        
        if (y % 10 === 0) {
            progressCallback(y / height * 0.8);
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }
    
    for (let i = 0; i < data.length; i++) {
        data[i] = Math.round(data[i] * 0.7 + originalData[i] * 0.3);
    }
    
    progressCallback(1);
}

// Увеличение резкости
async function applySharpness(imageData, sharpness, progressCallback) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    const blurred = new Uint8ClampedArray(data);
    const kernel = createGaussianKernel(3);
    
    const buffer = new Uint8ClampedArray(data.length);
    applyBlurPass(blurred, buffer, width, height, kernel, true);
    applyBlurPass(buffer, blurred, width, height, kernel, false);
    
    const amount = sharpness / 5;
    
    for (let i = 0; i < data.length; i++) {
        if (i % 4 === 3) continue;
        data[i] = clamp(data[i] + (data[i] - blurred[i]) * amount);
        
        if (i % 10000 === 0) {
            progressCallback(i / data.length * 0.8);
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }
    
    progressCallback(1);
}

// Вспомогательные функции
function applyBlurPass(src, dst, width, height, kernel, horizontal) {
    const radius = (kernel.length - 1) / 2;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, a = 0;
            let weightSum = 0;
            
            for (let k = -radius; k <= radius; k++) {
                let px = x, py = y;
                
                if (horizontal) {
                    px = Math.min(width - 1, Math.max(0, x + k));
                } else {
                    py = Math.min(height - 1, Math.max(0, y + k));
                }
                
                const idx = (py * width + px) * 4;
                const weight = kernel[k + radius];
                
                r += src[idx] * weight;
                g += src[idx + 1] * weight;
                b += src[idx + 2] * weight;
                a += src[idx + 3] * weight;
                weightSum += weight;
            }
            
            const idx = (y * width + x) * 4;
            dst[idx] = r / weightSum;
            dst[idx + 1] = g / weightSum;
            dst[idx + 2] = b / weightSum;
            dst[idx + 3] = a / weightSum;
        }
    }
}

function createGaussianKernel(radius) {
    const sigma = radius / 2;
    const kernelSize = radius * 2 + 1;
    const kernel = new Array(kernelSize);
    let sum = 0;
    
    for (let i = 0; i < kernelSize; i++) {
        const x = i - radius;
        kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
        sum += kernel[i];
    }
    
    for (let i = 0; i < kernelSize; i++) {
        kernel[i] /= sum;
    }
    
    return kernel;
}

function clamp(value) {
    return Math.max(0, Math.min(255, value));
}

function loadImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight() {
    elements.dropArea.classList.add('highlight');
}

function unhighlight() {
    elements.dropArea.classList.remove('highlight');
}

async function updateProgress(percent, duration) {
    return new Promise(resolve => {
        elements.progressBar.style.width = percent + '%';
        setTimeout(resolve, duration);
    });
}

function updateStep(stepId) {
    resetSteps();
    const step = document.getElementById(stepId);
    step.classList.add('active', 'pulse-animation');
}

function resetSteps() {
    document.querySelectorAll('.loading-step').forEach(step => {
        step.classList.remove('active', 'pulse-animation');
    });
}

function downloadResult() {
    if (!elements.resultImage.src) return;
    
    const link = document.createElement('a');
    link.href = elements.resultImage.src;
    link.download = `enhanced_${selectedFile.name}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' Б';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ';
    return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', init);
