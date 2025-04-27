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
const smoothStrength = document.getElementById('smoothStrength');
const smoothValue = document.getElementById('smoothValue');
const sharpnessSlider = document.getElementById('sharpness');
const sharpnessValue = document.getElementById('sharpnessValue');
const aiEnhanceCheckbox = document.getElementById('aiEnhance');
const progressBar = document.getElementById('progressBar');

// Состояние приложения
let selectedFile = null;
let isProcessing = false;

// Инициализация приложения
function init() {
    console.log('Инициализация приложения...');
    
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
    smoothStrength.addEventListener('input', () => updateLabel(smoothStrength, smoothValue, ['умное', 'адаптивное', 'сильное', 'ультра-плавное']));
    sharpnessSlider.addEventListener('input', () => updateLabel(sharpnessSlider, sharpnessValue, ['слабая', 'умеренная', 'сильная', 'экстремальная']));
    
    // Инициализация значений
    updateLabel(denoiseStrength, denoiseValue, ['очень лёгкая', 'лёгкая', 'умеренная', 'сильная']);
    updateLabel(finalDenoiseStrength, finalDenoiseValue, ['очень лёгкая', 'лёгкая', 'умеренная', 'сильная']);
    updateLabel(qualitySlider, qualityValue, ['низкое', 'среднее', 'хорошее', 'отличное']);
    updateLabel(smoothStrength, smoothValue, ['умное', 'адаптивное', 'сильное', 'ультра-плавное']);
    updateLabel(sharpnessSlider, sharpnessValue, ['слабая', 'умеренная', 'сильная', 'экстремальная']);
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
    
    console.log('Начало обработки изображения...');
    isProcessing = true;
    
    loadingDiv.classList.remove('hidden');
    optionsDiv.classList.add('hidden');
    previewDiv.classList.add('hidden');
    progressBar.style.width = '0%';
    resetSteps();
    
    try {
        updateStep('step1');
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
            updateStep('step2');
            console.log('Применение первичного шумоподавления...');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            await applyBilateralFilter(imageData, denoiseStrengthValue, (progress) => {
                progressBar.style.width = `${10 + progress * 10}%`;
            });
            ctx.putImageData(imageData, 0, 0);
            await updateProgress(20, 300);
        }
        
        // Масштабирование
        updateStep('step3');
        const scale = parseInt(scaleFactor.value);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        console.log('Масштабирование завершено:', canvas.width, '×', canvas.height);
        await updateProgress(30, 800);
        
        // Сглаживание
        const smoothStrengthValue = parseFloat(smoothStrength.value);
        if (smoothStrengthValue > 0) {
            updateStep('step4');
            console.log('Применение сглаживания...');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            await applyFullSmoothing(imageData, smoothStrengthValue, (progress) => {
                progressBar.style.width = `${30 + progress * 15}%`;
            });
            ctx.putImageData(imageData, 0, 0);
            await updateProgress(45, 300);
        }
        
        // ИИ-улучшение
        if (aiEnhanceCheckbox.checked) {
            updateStep('step5');
            console.log('Применение ИИ-улучшения...');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            await applyAIEnhancement(imageData, (progress) => {
                progressBar.style.width = `${45 + progress * 15}%`;
            });
            ctx.putImageData(imageData, 0, 0);
            await updateProgress(60, 500);
        }
        
        // Увеличение резкости
        const sharpnessValue = parseFloat(sharpnessSlider.value);
        if (sharpnessValue > 0) {
            updateStep('step6');
            console.log('Увеличение резкости...');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            await applySharpness(imageData, sharpnessValue, (progress) => {
                progressBar.style.width = `${60 + progress * 15}%`;
            });
            ctx.putImageData(imageData, 0, 0);
            await updateProgress(75, 300);
        }
        
        // Финальное шумоподавление
        const finalDenoiseStrengthValue = parseFloat(finalDenoiseStrength.value);
        if (finalDenoiseStrengthValue > 0) {
            updateStep('step7');
            console.log('Финальное шумоподавление...');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            await applyBilateralFilter(imageData, finalDenoiseStrengthValue, (progress) => {
                progressBar.style.width = `${75 + progress * 15}%`;
            });
            ctx.putImageData(imageData, 0, 0);
            await updateProgress(90, 300);
        }
        
        // Сохранение результата
        updateStep('step8');
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
    // ... (остальной код функции без изменений)
}

// Полное сглаживание
async function applyFullSmoothing(imageData, strength, progressCallback) {
    console.log('Применение адаптивного сглаживания (сила:', strength, ')');
    // ... (остальной код функции без изменений)
}

// Имитация ИИ-улучшения
async function applyAIEnhancement(imageData, progressCallback) {
    console.log('Применение ИИ-улучшения');
    // ... (остальной код функции без изменений)
}

// Увеличение резкости
async function applySharpness(imageData, sharpness, progressCallback) {
    console.log('Увеличение резкости (сила:', sharpness, ')');
    // ... (остальной код функции без изменений)
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

function updateStep(stepId) {
    resetSteps();
    const step = document.getElementById(stepId);
    if (step) {
        step.classList.add('active', 'pulse-animation');
    }
}

function resetSteps() {
    document.querySelectorAll('.loading-step').forEach(step => {
        step.classList.remove('active', 'pulse-animation');
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
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM полностью загружен');
    init();
});

// Для отладки в глобальной области видимости
window.app = {
    debug: () => {
        console.log('Состояние приложения:', {
            selectedFile,
            isProcessing,
            elements: {
                fileInput,
                dropArea,
                originalImage,
                resultImage
            }
        });
    }
};
