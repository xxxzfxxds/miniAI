let enhancementWeights = null;
let selectedFile = null;
let isProcessing = false;

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

// Загрузка весов модели
async function loadWeights() {
    try {
        const response = await fetch('weights.json');
        if (!response.ok) throw new Error('Failed to load weights');
        enhancementWeights = await response.json();
        console.log('Enhancement weights loaded successfully');
    } catch (error) {
        console.error('Error loading weights:', error);
        // Значения по умолчанию
        enhancementWeights = {
            models_coef: [
                [0.12, -0.23, 0.05, 0.18, -0.07, 0.31, 0.0005, 0.0003],
                [0.08, -0.15, 0.03, 0.12, -0.05, 0.21, 0.0003, 0.0002],
                [0.05, -0.1, 0.02, 0.08, -0.03, 0.15, 0.0002, 0.0001],
                [0.15, -0.18, 0.04, 0.15, -0.06, 0.25, 0.0004, 0.0003],
                [0.1, -0.2, 0.03, 0.13, -0.05, 0.22, 0.0003, 0.0002],
                [0.18, -0.25, 0.06, 0.2, -0.08, 0.35, 0.0006, 0.0004],
                [0.07, -0.12, 0.02, 0.1, -0.04, 0.18, 0.0002, 0.0001]
            ],
            models_intercept: [4.2, 2.8, 1.5, 6.8, 3.5, 4.8, 0.3],
            feature_names: ['mean', 'std', 'min', 'max', 'median', 'percentile_25', 'width', 'height'],
            target_params: [
                "denoise_strength",
                "final_denoise_strength",
                "scale_factor",
                "quality",
                "smooth_strength",
                "sharpness",
                "ai_enhance"
            ]
        };
    }
}

// Анализ изображения и расчет параметров
async function calculateEnhancementParams(img) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const grayValues = [];
    
    for (let i = 0; i < data.length; i += 4) {
        const gray = 0.3 * data[i] + 0.59 * data[i+1] + 0.11 * data[i+2];
        grayValues.push(gray / 255);
    }
    
    const mean = grayValues.reduce((a, b) => a + b, 0) / grayValues.length;
    const std = Math.sqrt(grayValues.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / grayValues.length);
    
    const features = {
        mean: mean,
        std: std,
        min: Math.min(...grayValues),
        max: Math.max(...grayValues),
        median: calculateMedian(grayValues),
        percentile_25: calculatePercentile(grayValues, 0.25),
        width: img.width,
        height: img.height
    };
    
    const params = {};
    enhancementWeights.target_params.forEach((param, i) => {
        const coef = enhancementWeights.models_coef[i];
        const intercept = enhancementWeights.models_intercept[i];
        
        let prediction = intercept;
        enhancementWeights.feature_names.forEach((feature, j) => {
            prediction += coef[j] * features[feature];
        });
        
        params[param] = Math.max(0, Math.min(prediction, 10));
    });
    
    params.scale_factor = Math.round(params.scale_factor);
    params.ai_enhance = params.ai_enhance > 0.5 ? 1 : 0;
    
    return params;
}

function calculateMedian(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function calculatePercentile(values, p) {
    const sorted = [...values].sort((a, b) => a - b);
    const pos = p * (sorted.length - 1);
    const base = Math.floor(pos);
    const rest = pos - base;
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
}

// Обновление интерфейса
function updateDenoiseLabel() {
    updateLabel(denoiseStrength, denoiseValue, ['очень лёгкая', 'лёгкая', 'умеренная', 'сильная']);
}

function updateFinalDenoiseLabel() {
    updateLabel(finalDenoiseStrength, finalDenoiseValue, ['очень лёгкая', 'лёгкая', 'умеренная', 'сильная']);
}

function updateQualityLabel() {
    updateLabel(qualitySlider, qualityValue, ['низкое', 'среднее', 'хорошее', 'отличное']);
}

function updateSmoothLabel() {
    updateLabel(smoothStrength, smoothValue, ['умное', 'адаптивное', 'сильное', 'ультра-плавное']);
}

function updateSharpnessLabel() {
    updateLabel(sharpnessSlider, sharpnessValue, ['слабая', 'умеренная', 'сильная', 'экстремальная']);
}

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

// Обработка изображения
async function processImage() {
    if (isProcessing || !selectedFile) return;
    isProcessing = true;
    
    if (!enhancementWeights) {
        await loadWeights();
    }
    
    loadingDiv.classList.remove('hidden');
    optionsDiv.classList.add('hidden');
    previewDiv.classList.add('hidden');
    progressBar.style.width = '0%';
    resetSteps();
    
    try {
        updateStep('step1');
        await updateProgress(5, 500);
        const img = await loadImage(selectedFile);
        await updateProgress(10, 300);
        
        const params = await calculateEnhancementParams(img);
        
        // Установка параметров
        denoiseStrength.value = params.denoise_strength;
        finalDenoiseStrength.value = params.final_denoise_strength;
        scaleFactor.value = params.scale_factor;
        qualitySlider.value = params.quality;
        smoothStrength.value = params.smooth_strength;
        sharpnessSlider.value = params.sharpness;
        aiEnhanceCheckbox.checked = params.ai_enhance > 0.5;
        
        updateDenoiseLabel();
        updateFinalDenoiseLabel();
        updateQualityLabel();
        updateSmoothLabel();
        updateSharpnessLabel();
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const denoiseStrengthValue = parseFloat(denoiseStrength.value);
        if (denoiseStrengthValue > 0) {
            updateStep('step2');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            await applyBilateralFilter(imageData, denoiseStrengthValue, (progress) => {
                progressBar.style.width = `${10 + progress * 10}%`;
            });
            ctx.putImageData(imageData, 0, 0);
            await updateProgress(20, 300);
        }
        
        updateStep('step3');
        const scale = parseInt(scaleFactor.value);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        await updateProgress(30, 800);
        
        const smoothStrengthValue = parseFloat(smoothStrength.value);
        if (smoothStrengthValue > 0) {
            updateStep('step4');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            await applyFullSmoothing(imageData, smoothStrengthValue, (progress) => {
                progressBar.style.width = `${30 + progress * 15}%`;
            });
            ctx.putImageData(imageData, 0, 0);
            await updateProgress(45, 300);
        }
        
        if (aiEnhanceCheckbox.checked) {
            updateStep('step5');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            await applyAIEnhancement(imageData, (progress) => {
                progressBar.style.width = `${45 + progress * 15}%`;
            });
            ctx.putImageData(imageData, 0, 0);
            await updateProgress(60, 500);
        }
        
        const sharpnessValue = parseFloat(sharpnessSlider.value);
        if (sharpnessValue > 0) {
            updateStep('step6');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            await applySharpness(imageData, sharpnessValue, (progress) => {
                progressBar.style.width = `${60 + progress * 15}%`;
            });
            ctx.putImageData(imageData, 0, 0);
            await updateProgress(75, 300);
        }
        
        const finalDenoiseStrengthValue = parseFloat(finalDenoiseStrength.value);
        if (finalDenoiseStrengthValue > 0) {
            updateStep('step7');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            await applyBilateralFilter(imageData, finalDenoiseStrengthValue, (progress) => {
                progressBar.style.width = `${75 + progress * 15}%`;
            });
            ctx.putImageData(imageData, 0, 0);
            await updateProgress(90, 300);
        }
        
        updateStep('step8');
        await updateProgress(95, 500);
        const quality = qualitySlider.value / 10;
        resultImage.src = canvas.toDataURL('image/jpeg', quality);
        await updateProgress(100, 300);
        
        loadingDiv.classList.add('hidden');
        previewDiv.classList.remove('hidden');
        resultInfo.textContent = `${canvas.width} × ${canvas.height}px | ${formatSize(selectedFile.size * scale * quality * 0.5)}`;
        
    } catch (error) {
        console.error('Ошибка обработки:', error);
        loadingDiv.classList.add('hidden');
        alert('Произошла ошибка при обработке изображения');
    } finally {
        isProcessing = false;
    }
}

// [Остальные функции: applyBilateralFilter, applyFullSmoothing, applyAIEnhancement, 
//  applySharpness, loadImage, preventDefaults, highlight, unhighlight, updateProgress,
//  updateStep, resetSteps, downloadResult, formatSize остаются без изменений]

// Инициализация
async function init() {
    await loadWeights();
    
    denoiseStrength.addEventListener('input', updateDenoiseLabel);
    finalDenoiseStrength.addEventListener('input', updateFinalDenoiseLabel);
    qualitySlider.addEventListener('input', updateQualityLabel);
    smoothStrength.addEventListener('input', updateSmoothLabel);
    sharpnessSlider.addEventListener('input', updateSharpnessLabel);
    
    updateDenoiseLabel();
    updateFinalDenoiseLabel();
    updateQualityLabel();
    updateSmoothLabel();
    updateSharpnessLabel();
    
    selectFilesBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFiles);
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });
    
    dropArea.addEventListener('drop', handleDrop, false);
    processBtn.addEventListener('click', processImage);
    downloadBtn.addEventListener('click', downloadResult);
}

document.addEventListener('DOMContentLoaded', init);
