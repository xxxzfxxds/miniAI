// DOM элементы
const dropArea = document.getElementById('dropArea');
const fileInput = document.getElementById('fileInput');
const selectFilesBtn = document.getElementById('selectFiles');
const optionsDiv = document.getElementById('options');
const processBtn = document.getElementById('processBtn');
const loadingDiv = document.getElementById('loading');
const previewDiv = document.getElementById('preview');
const originalImage = document.getElementById('originalImage');
const resultImage = document.getElementById('resultImage');
const originalInfo = document.getElementById('originalInfo');
const resultInfo = document.getElementById('resultInfo');
const downloadBtn = document.getElementById('downloadBtn');
const denoiseStrength = document.getElementById('denoiseStrength');
const denoiseValue = document.getElementById('denoiseValue');
const finalDenoiseStrength = document.getElementById('finalDenoiseStrength');
const finalDenoiseValue = document.getElementById('finalDenoiseValue');
const scaleFactor = document.getElementById('scaleFactor');
const qualitySlider = document.getElementById('quality');
const qualityValue = document.getElementById('qualityValue');
const aiEnhanceCheckbox = document.getElementById('aiEnhance');
const progressBar = document.getElementById('progressBar');

// Состояние приложения
let selectedFile = null;
let isProcessing = false;
let model = null;

// Инициализация приложения
async function init() {
    console.log('Инициализация приложения...');
    
    // Загрузка модели
    try {
        console.log('Загрузка модели Waifu2x...');
        model = await tf.loadGraphModel('scale2.0x_model.json');
        console.log('Модель успешно загружена');
    } catch (error) {
        console.error('Ошибка загрузки модели:', error);
        alert('Не удалось загрузить модель улучшения. Проверьте консоль для подробностей.');
    }
    
    // Проверка существования элементов
    if (!fileInput || !dropArea) {
        console.error('Критические элементы DOM не найдены!');
        return;
    }

    // Настройка слайдеров
    setupSliders();
    
    // Обработчики событий
    setupEventListeners();
    
    console.log('Приложение инициализировано');
}

// Настройка слайдеров
function setupSliders() {
    denoiseStrength.addEventListener('input', () => updateLabel(denoiseStrength, denoiseValue, ['очень лёгкая', 'лёгкая', 'умеренная', 'сильная']));
    finalDenoiseStrength.addEventListener('input', () => updateLabel(finalDenoiseStrength, finalDenoiseValue, ['очень лёгкая', 'лёгкая', 'умеренная', 'сильная']));
    qualitySlider.addEventListener('input', () => updateLabel(qualitySlider, qualityValue, ['низкое', 'среднее', 'хорошее', 'отличное']));
    
    // Инициализация значений
    updateLabel(denoiseStrength, denoiseValue, ['очень лёгкая', 'лёгкая', 'умеренная', 'сильная']);
    updateLabel(finalDenoiseStrength, finalDenoiseValue, ['очень лёгкая', 'лёгкая', 'умеренная', 'сильная']);
    updateLabel(qualitySlider, qualityValue, ['низкое', 'среднее', 'хорошее', 'отличное']);
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Выбор файлов
    selectFilesBtn.addEventListener('click', () => {
        console.log('Кнопка выбора файла нажата');
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        console.log('Файл выбран через input');
        handleFiles(e);
    });

    // Drag and Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    dropArea.addEventListener('drop', (e) => {
        console.log('Файл перетащен в dropArea');
        handleDrop(e);
    });

    // Обработка изображения
    processBtn.addEventListener('click', processImage);
    downloadBtn.addEventListener('click', downloadResult);
}

// Обработка выбранных файлов
function handleFiles(e) {
    console.log('Обработка файлов...');
    
    const file = e.target.files?.[0] || e.dataTransfer?.files?.[0];
    
    if (!file) {
        console.error('Файл не найден в событии');
        return;
    }

    console.log('Выбран файл:', file.name, file.type, formatSize(file.size));

    // Проверка типа файла
    if (!file.type.match('image.*')) {
        alert('Пожалуйста, выберите изображение (JPG, PNG, WEBP)');
        return;
    }

    // Проверка размера
    if (file.size > 10 * 1024 * 1024) {
        alert('Файл слишком большой. Максимальный размер 10MB');
        return;
    }

    selectedFile = file;
    optionsDiv.classList.remove('hidden');
    previewDiv.classList.add('hidden');

    const reader = new FileReader();
    
    reader.onload = function(e) {
        console.log('Файл успешно прочитан');
        originalImage.src = e.target.result;
        
        originalImage.onload = function() {
            originalInfo.textContent = `${this.naturalWidth} × ${this.naturalHeight}px | ${formatSize(file.size)}`;
            console.log('Изображение загружено:', this.naturalWidth, '×', this.naturalHeight);
        };
        
        originalImage.onerror = function() {
            console.error('Ошибка загрузки изображения');
            alert('Ошибка при загрузке изображения');
        };
    };
    
    reader.onerror = function() {
        console.error('Ошибка чтения файла');
        alert('Ошибка при чтении файла');
    };
    
    reader.readAsDataURL(file);
}

// Обработка перетаскивания файлов
function handleDrop(e) {
    console.log('Обработка drop события');
    e.preventDefault();
    unhighlight();
    handleFiles(e);
}

// Основная функция обработки изображения
async function processImage() {
    if (isProcessing || !selectedFile) {
        console.warn('Обработка уже идет или файл не выбран');
        return;
    }
    
    if (aiEnhanceCheckbox.checked && !model) {
        alert('Модель улучшения не загружена. Пожалуйста, попробуйте позже.');
        return;
    }
    
    console.log('Начало обработки изображения...');
    isProcessing = true;
    
    loadingDiv.classList.remove('hidden');
    optionsDiv.classList.add('hidden');
    previewDiv.classList.add('hidden');
    progressBar.style.width = '0%';
    
    try {
        await updateProgress(5, 500);
        
        console.log('Загрузка изображения...');
        const img = await loadImage(selectedFile);
        await updateProgress(10, 300);
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Первичное шумоподавление
        const denoiseStrengthValue = parseFloat(denoiseStrength.value);
        if (denoiseStrengthValue > 0) {
            console.log('Применение первичного шумоподавления...');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            await applyBilateralFilter(imageData, denoiseStrengthValue, (progress) => {
                progressBar.style.width = `${10 + progress * 10}%`;
            });
            ctx.putImageData(imageData, 0, 0);
            await updateProgress(20, 300);
        }
        
        // Масштабирование
        const scale = parseInt(scaleFactor.value);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        console.log('Масштабирование завершено:', canvas.width, '×', canvas.height);
        await updateProgress(30, 800);
        
        // ИИ-улучшение
        if (aiEnhanceCheckbox.checked) {
            console.log('Применение ИИ-улучшения...');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // Применяем модель несколько раз если нужно 4x увеличение
            const iterations = scale === 4 ? 2 : 1;
            
            for (let i = 0; i < iterations; i++) {
                await applyAIEnhancement(imageData, (progress) => {
                    const totalProgress = 30 + (i + progress) * (30 / iterations);
                    progressBar.style.width = `${totalProgress}%`;
                });
                
                // После первого прохода (2x) масштабируем canvas для второго прохода
                if (i === 0 && iterations > 1) {
                    const tempCanvas = document.createElement('canvas');
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCanvas.width = canvas.width * 2;
                    tempCanvas.height = canvas.height * 2;
                    tempCtx.putImageData(imageData, 0, 0);
                    
                    canvas.width = tempCanvas.width;
                    canvas.height = tempCanvas.height;
                    ctx.putImageData(imageData, 0, 0);
                }
            }
            
            ctx.putImageData(imageData, 0, 0);
            await updateProgress(60, 500);
        }
        
        // Финальное шумоподавление
        const finalDenoiseStrengthValue = parseFloat(finalDenoiseStrength.value);
        if (finalDenoiseStrengthValue > 0) {
            console.log('Финальное шумоподавление...');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            await applyBilateralFilter(imageData, finalDenoiseStrengthValue, (progress) => {
                progressBar.style.width = `${60 + progress * 20}%`;
            });
            ctx.putImageData(imageData, 0, 0);
            await updateProgress(80, 300);
        }
        
        // Сохранение результата
        await updateProgress(95, 500);
        const quality = qualitySlider.value / 10;
        resultImage.src = canvas.toDataURL('image/jpeg', quality);
        await updateProgress(100, 300);
        
        console.log('Обработка завершена успешно');
        
        loadingDiv.classList.add('hidden');
        previewDiv.classList.remove('hidden');
        resultInfo.textContent = `${canvas.width} × ${canvas.height}px | ${formatSize(selectedFile.size * scale * quality * 0.5)}`;
        
    } catch (error) {
        console.error('Ошибка обработки:', error);
        loadingDiv.classList.add('hidden');
        alert('Произошла ошибка при обработке изображения: ' + error.message);
    } finally {
        isProcessing = false;
    }
}

// ====================== ФУНКЦИИ ОБРАБОТКИ ИЗОБРАЖЕНИЙ ======================

// Билатеральный фильтр
async function applyBilateralFilter(imageData, strength, progressCallback) {
    console.log('Применение билатерального фильтра (сила:', strength, ')');
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // Упрощенная реализация билатерального фильтра
    const radius = Math.floor(strength);
    const sigma = strength * 2;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            let r = 0, g = 0, b = 0, total = 0;
            
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const ni = (ny * width + nx) * 4;
                        const dist = Math.sqrt(dx*dx + dy*dy);
                        const weight = Math.exp(-(dist*dist)/(2*sigma*sigma));
                        
                        r += data[ni] * weight;
                        g += data[ni+1] * weight;
                        b += data[ni+2] * weight;
                        total += weight;
                    }
                }
            }
            
            data[i] = r / total;
            data[i+1] = g / total;
            data[i+2] = b / total;
        }
        
        if (progressCallback && y % 10 === 0) {
            progressCallback(y / height);
        }
    }
    
    if (progressCallback) progressCallback(1);
    return imageData;
}

// Реальное ИИ-улучшение с Waifu2x
async function applyAIEnhancement(imageData, progressCallback) {
    console.log('Применение реального ИИ-улучшения...');
    
    // Проверка, что модель загружена
    if (!model) {
        throw new Error('Модель улучшения не загружена');
    }
    
    // Создаем тензор из ImageData
    const inputTensor = tf.browser.fromPixels({
        data: new Uint8Array(imageData.data),
        width: imageData.width,
        height: imageData.height
    }).toFloat().div(tf.scalar(255)).expandDims(0);

    // Применяем модель
    let outputTensor;
    try {
        outputTensor = model.predict(inputTensor);
    } catch (error) {
        console.error('Ошибка предсказания:', error);
        throw error;
    }

    // Конвертируем результат обратно в ImageData
    const outputData = await tf.browser.toPixels(outputTensor.squeeze().mul(tf.scalar(255)).clipByValue(0, 255));
    
    // Копируем данные обратно в оригинальный ImageData
    for (let i = 0; i < outputData.length; i++) {
        imageData.data[i] = outputData[i] * 255;
    }

    // Освобождаем память
    inputTensor.dispose();
    outputTensor.dispose();
    
    if (progressCallback) progressCallback(1);
    return imageData;
}

// ====================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ======================

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

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight() {
    dropArea.classList.add('highlight');
    dropArea.style.borderColor = '#ff1493';
}

function unhighlight() {
    dropArea.classList.remove('highlight');
    dropArea.style.borderColor = '#ff69b4';
}

function loadImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            console.log('Изображение загружено в память');
            resolve(img);
        };
        img.onerror = (e) => {
            console.error('Ошибка загрузки изображения', e);
            reject(new Error('Не удалось загрузить изображение'));
        };
        img.src = URL.createObjectURL(file);
    });
}

async function updateProgress(percent, duration) {
    return new Promise(resolve => {
        progressBar.style.width = percent + '%';
        setTimeout(resolve, duration);
    });
}

function downloadResult() {
    if (!resultImage.src) {
        console.warn('Нет результата для скачивания');
        return;
    }
    
    const link = document.createElement('a');
    link.href = resultImage.src;
    link.download = `enhanced_${selectedFile.name.replace(/\.[^/.]+$/, '')}.jpg`;
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
