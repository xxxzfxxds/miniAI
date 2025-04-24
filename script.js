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

let selectedFile = null;

// Инициализация
function init() {
    denoiseStrength.addEventListener('input', updateDenoiseLabel);
    finalDenoiseStrength.addEventListener('input', updateFinal
