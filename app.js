/* ==========================================================================
   AuraDigit Application Logic - Pointer Events, Segmentation, Math & UI
   ========================================================================== */

// Global state variables
let currentMode = 'canvas'; // 'canvas', 'webcam', 'upload'
let activeTab = 'workspace';
let undoStack = [];
let redoStack = []; // Redo buffer
let drawingData = [];
let isDrawing = false;
let webcamStream = null;
let webcamInterval = null;
let currentProfile = { name: "Guest Student", role: "Right-Handed" };
let profiles = [];
let predictionHistory = [];
let correctedPool = { images: [], labels: [] }; // Adaptive retraining pool
let lastPreprocessedPixels = null; // Last primary segment pixels for saving to history

// DOM Elements
const sidebarButtons = document.querySelectorAll('.nav-menu .nav-btn');
const tabPanes = document.querySelectorAll('.tab-pane');
const subTabBtns = document.querySelectorAll('.sub-tab-btn');
const subPanes = document.querySelectorAll('.sub-pane');

// Canvas Elements
const canvas = document.getElementById('drawing-canvas');
const ctx = canvas.getContext('2d');
const brushSizeInput = document.getElementById('brush-size');
const brushSizeVal = document.getElementById('brush-size-val');
const gridOverlay = document.getElementById('grid-overlay');

// UI Controls
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const profileWidget = document.querySelector('.profile-widget');
const profileDropdownMenu = document.getElementById('profile-dropdown-menu');
const profileListContainer = document.getElementById('profile-list');
const createProfileBtn = document.getElementById('create-profile-btn');
const profileModal = document.getElementById('profile-modal');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalSubmitBtn = document.getElementById('modal-submit-btn');

// Workspace Outputs
const predictedDigit = document.getElementById('predicted-digit');
const predictionConfidence = document.getElementById('prediction-confidence');
const confidenceBar = document.getElementById('confidence-bar');
const inferenceLatency = document.getElementById('inference-latency');
const heatmapOverlayToggle = document.getElementById('heatmap-overlay-toggle');
const mathModeToggle = document.getElementById('math-mode-toggle');
const segmentsContainer = document.getElementById('segments-container');
const mathResultPanel = document.getElementById('math-result-panel');
const mathExprText = document.getElementById('math-expr-text');
const mathSolvedVal = document.getElementById('math-solved-val');

// Preprocessing Viewports
const preprocessedCanvas = document.getElementById('preprocessed-canvas');
const saliencyCanvas = document.getElementById('saliency-canvas');

// Coach Elements
const coachGaugeFill = document.getElementById('coach-gauge-fill');
const coachScoreText = document.getElementById('coach-score-text');
const coachRatingLabel = document.getElementById('coach-rating-label');
const coachFeedbackBox = document.getElementById('coach-feedback-box');

// Stats and Retraining Elements
const retrainSampleCount = document.getElementById('retrain-sample-count');
const retrainSampleBar = document.getElementById('retrain-sample-bar');
const startRetrainBtn = document.getElementById('start-retrain-btn');

// Charts references
let distributionChart = null;
let trendChart = null;
let trainingLossChart = null;
let trainingLossData = [];
let trainingEpochLabels = [];

/* ==========================================================================
   1. Tab & Mode Switching Navigation
   ========================================================================== */
sidebarButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        sidebarButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const tabName = btn.getAttribute('data-tab');
        activeTab = tabName;
        
        tabPanes.forEach(pane => pane.classList.remove('active'));
        document.getElementById(`pane-${tabName}`).classList.add('active');
        
        // Update top bar headers
        const headers = {
            'workspace': { title: 'Inference Lab', sub: 'Draw, upload, or use real-time camera recognition' },
            'coach': { title: 'Handwriting Coach', sub: 'Receive real-time clarity feedback and writing suggestions' },
            'analytics': { title: 'Analytics Dashboard', sub: 'Track your performance history and digit distribution' },
            'model-hub': { title: 'Model Retraining', sub: 'Tune parameters and train the neural network in-browser' },
            'help-guide': { title: 'Architecture Guide', sub: 'Explore structural components, preprocessing pipelines, and code logic' }
        };
        
        document.getElementById('current-tab-title').textContent = headers[tabName].title;
        document.getElementById('current-tab-subtitle').textContent = headers[tabName].sub;

        // Special initialization on tabs switch
        if (tabName === 'analytics') {
            initAnalyticsCharts();
            renderHistoryTable();
        } else if (tabName === 'model-hub') {
            initTrainingChart();
            updateRetrainingUI();
        } else if (tabName === 'coach') {
            updateCoachProfile();
        }

        // Manage webcam stream depending on active tab
        if (tabName !== 'workspace' || currentMode !== 'webcam') {
            stopWebcamStream();
        }
    });
});

subTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        subTabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const mode = btn.getAttribute('data-mode');
        currentMode = mode;
        
        subPanes.forEach(pane => pane.classList.remove('active'));
        document.getElementById(`sub-pane-${mode}`).classList.add('active');
        
        stopWebcamStream();
        
        if (mode === 'webcam') {
            // Placeholder shown until user explicitly grants access
            document.querySelector('.webcam-placeholder').style.display = 'flex';
        }
    });
});

/* ==========================================================================
   2. Canvas Drawing Implementation
   ========================================================================== */
function initCanvas() {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#ffffff'; // White stroke
    ctx.fillStyle = '#000000';   // Black background
    clearCanvas();
    
    // Pointer event listeners (supports mouse and touch)
    canvas.addEventListener('pointerdown', startDrawing);
    canvas.addEventListener('pointermove', draw);
    canvas.addEventListener('pointerup', stopDrawing);
    canvas.addEventListener('pointerleave', stopDrawing);
    
    // Undo support
    saveCanvasState();
    
    // Setup controls
    document.getElementById('canvas-clear-btn').addEventListener('click', () => {
        clearCanvas();
        clearPredictionsUI();
        redoStack = []; // Clear redo stack on clear
        undoStack = [];
        saveCanvasState();
    });
    
    document.getElementById('canvas-undo-btn').addEventListener('click', undoDrawing);
    document.getElementById('canvas-redo-btn').addEventListener('click', redoDrawing);
    document.getElementById('canvas-center-btn').addEventListener('click', centerDrawingVisually);
    
    // Grid Toggle
    const gridToggleBtn = document.getElementById('grid-toggle-btn');
    gridToggleBtn.addEventListener('click', () => {
        gridOverlay.classList.toggle('show');
        gridToggleBtn.classList.toggle('active');
    });

    // Brush Size range
    brushSizeInput.addEventListener('input', (e) => {
        const val = e.target.value;
        brushSizeVal.textContent = `${val}px`;
    });
}

function clearCanvas() {
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function startDrawing(e) {
    isDrawing = true;
    redoStack = []; // Clear redo stack on new action
    ctx.beginPath();
    // Get mouse coordinates relative to canvas
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    ctx.moveTo(x, y);
    ctx.lineWidth = brushSizeInput.value;
    
    // Prevent default touch gestures scrolling page
    if (e.pointerType === 'touch') e.preventDefault();
}

function draw(e) {
    if (!isDrawing) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    
    ctx.lineTo(x, y);
    ctx.stroke();
    
    if (e.pointerType === 'touch') e.preventDefault();
}

function stopDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
    ctx.closePath();
    
    saveCanvasState();
    // Trigger inference dynamically
    runSegmentationAndInference();
}

function saveCanvasState() {
    // Keep stack depth to 15
    if (undoStack.length >= 15) {
        undoStack.shift();
    }
    undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
}

function undoDrawing() {
    if (undoStack.length > 1) {
        const currentState = undoStack.pop();
        redoStack.push(currentState); // Push to redo stack
        const prevState = undoStack[undoStack.length - 1];
        ctx.putImageData(prevState, 0, 0);
        runSegmentationAndInference();
    } else if (undoStack.length === 1) {
        const currentState = undoStack.pop();
        redoStack.push(currentState);
        clearCanvas();
        clearPredictionsUI();
    }
}

function redoDrawing() {
    if (redoStack.length > 0) {
        const nextState = redoStack.pop();
        undoStack.push(nextState);
        ctx.putImageData(nextState, 0, 0);
        runSegmentationAndInference();
    }
}

// Bounding box sweep for drawn elements
function getDrawnBoundingBox() {
    const w = canvas.width;
    const h = canvas.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    let minX = w, maxX = 0, minY = h, maxY = 0;
    let hasPixels = false;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const val = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            if (val > 15) { // threshold active pixels
                hasPixels = true;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    if (!hasPixels) return null;
    
    return {
        x: Math.max(0, minX - 10),
        y: Math.max(0, minY - 10),
        w: Math.min(w - minX + 20, w),
        h: Math.min(h - minY + 20, h)
    };
}

// Visual auto-centering of canvas content
function centerDrawingVisually() {
    const bbox = getDrawnBoundingBox();
    if (!bbox) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.fillStyle = '#000000';
    tempCtx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw cropped box centered on temp canvas
    const drawX = (canvas.width - bbox.w) / 2;
    const drawY = (canvas.height - bbox.h) / 2;
    tempCtx.drawImage(canvas, bbox.x, bbox.y, bbox.w, bbox.h, drawX, drawY, bbox.w, bbox.h);

    // Copy back to main canvas
    ctx.drawImage(tempCanvas, 0, 0);
    saveCanvasState();
    runSegmentationAndInference();
}

/* ==========================================================================
   3. Multi-Digit Segmentation & Heuristic Parser
   ========================================================================== */
function segmentCanvasStrips() {
    const w = canvas.width;
    const h = canvas.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // 1. Calculate horizontal column occupancy
    const colActive = new Array(w).fill(false);
    const threshold = 15;
    for (let x = 0; x < w; x++) {
        for (let y = 0; y < h; y++) {
            const idx = (y * w + x) * 4;
            const val = (data[idx] + data[idx+1] + data[idx+2]) / 3;
            if (val > threshold) {
                colActive[x] = true;
                break;
            }
        }
    }

    // 2. Identify active segments/strips separated by blank space
    const strips = [];
    let inStrip = false;
    let startX = 0;
    
    for (let x = 0; x < w; x++) {
        if (colActive[x] && !inStrip) {
            inStrip = true;
            startX = x;
        } else if (!colActive[x] && inStrip) {
            inStrip = false;
            // Filter out noise elements (less than 4px wide)
            if (x - startX > 4) {
                strips.push({ startX, endX: x });
            }
        }
    }
    if (inStrip) {
        strips.push({ startX, endX: w });
    }

    // 3. Find vertical top-bottom bounds for each strip
    const bboxes = [];
    for (const strip of strips) {
        let minY = h;
        let maxY = 0;
        let active = false;
        
        for (let y = 0; y < h; y++) {
            for (let x = strip.startX; x < strip.endX; x++) {
                const idx = (y * w + x) * 4;
                const val = (data[idx] + data[idx+1] + data[idx+2]) / 3;
                if (val > threshold) {
                    active = true;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        
        if (active) {
            const pad = 12; // visual pad
            const bx = Math.max(0, strip.startX - pad);
            const by = Math.max(0, minY - pad);
            const bw = Math.min(w - bx, (strip.endX - strip.startX) + 2 * pad);
            const bh = Math.min(h - by, (maxY - minY) + 2 * pad);
            bboxes.push({ x: bx, y: by, w: bw, h: bh });
        }
    }
    
    return bboxes;
}

// Advanced custom heuristic classifier for operators
function evaluateOperatorHeuristic(bbox, canvasData) {
    const w = bbox.w;
    const h = bbox.h;
    const aspect = w / h;
    
    // 1. Minus Heuristic: extremely wide and flat aspect
    if (aspect > 1.8 && h < 45) {
        return '-';
    }
    
    // Helper to scan coordinates relative to bounding box
    const threshold = 15;
    let cornersCount = 0;
    let crossCount = 0;
    let centerCount = 0;
    let totalActive = 0;

    for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
            const idx = ((bbox.y + dy) * canvas.width + (bbox.x + dx)) * 4;
            const val = (canvasData[idx] + canvasData[idx+1] + canvasData[idx+2]) / 3;
            
            if (val > threshold) {
                totalActive++;
                const gridX = Math.floor((dx / w) * 3);
                const gridY = Math.floor((dy / h) * 3);
                
                // Corner cells of 3x3 grid
                if ((gridX === 0 || gridX === 2) && (gridY === 0 || gridY === 2)) {
                    cornersCount++;
                } else if (gridX === 1 && gridY === 1) {
                    centerCount++;
                } else {
                    crossCount++;
                }
            }
        }
    }

    if (totalActive === 0) return null;

    // 2. Plus Heuristic: Aspect ratio near 1.0, high density center & cross lines, empty corners
    const densityRatio = cornersCount / totalActive;
    if (aspect >= 0.7 && aspect <= 1.4) {
        if (densityRatio < 0.15 && crossCount > cornersCount * 2.2) {
            return '+';
        }
        
        // 3. Multiplication: high corners, high center intersection, empty cross elements
        if (densityRatio > 0.4 && cornersCount > crossCount * 0.9 && centerCount > 0) {
            return '*';
        }
    }

    // 4. Division stroke: /
    if (aspect >= 0.3 && aspect <= 0.9) {
        // Evaluate if pixels are concentrated along the diagonal
        let diagCount = 0;
        for (let dy = 0; dy < h; dy++) {
            // Expected diagonal x coordinate (bottom-left to top-right)
            const targetDx = Math.round(w - (dy / h) * w);
            for (let dx = Math.max(0, targetDx - 3); dx <= Math.min(w - 1, targetDx + 3); dx++) {
                const idx = ((bbox.y + dy) * canvas.width + (bbox.x + dx)) * 4;
                const val = (canvasData[idx] + canvasData[idx+1] + canvasData[idx+2]) / 3;
                if (val > threshold) diagCount++;
            }
        }
        if (diagCount > totalActive * 0.55 && aspect < 0.7) {
            return '/';
        }
    }

    return null; // Probable digit, fallback to neural net
}

/* ==========================================================================
   4. Core Inference, Heatmap & Coach Pipeline
   ========================================================================== */
async function runSegmentationAndInference() {
    if (!isModelLoaded) return;

    const bboxes = segmentCanvasStrips();
    
    if (bboxes.length === 0) {
        clearPredictionsUI();
        return;
    }

    const canvasData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const mathMode = mathModeToggle.checked;
    
    segmentsContainer.innerHTML = ''; // Clear segments UI
    
    let expressionParts = [];
    let processedImages = [];
    let mainResult = null;
    let totalLatency = 0;
    
    // We process each segment
    for (let i = 0; i < bboxes.length; i++) {
        const bbox = bboxes[i];
        
        // Render Segment canvas thumbnail
        const segCanvas = document.createElement('canvas');
        segCanvas.width = 28;
        segCanvas.height = 28;
        const segCtx = segCanvas.getContext('2d');
        
        // Run preprocessing to get Float32 array size 784
        const preprocessedPixels = preprocessSegment(canvas, bbox);
        processedImages.push(preprocessedPixels);

        // Render processed pixels onto the thumbnail canvas
        const imgData28 = segCtx.createImageData(28, 28);
        for (let j = 0; j < 784; j++) {
            const val = Math.round(preprocessedPixels[j] * 255);
            const idx = j * 4;
            imgData28.data[idx] = val;
            imgData28.data[idx+1] = val;
            imgData28.data[idx+2] = val;
            imgData28.data[idx+3] = 255;
        }
        segCtx.putImageData(imgData28, 0, 0);

        // Determine identity
        let symbol = null;
        let confidence = 1.0;
        let isOp = false;

        if (mathMode) {
            symbol = evaluateOperatorHeuristic(bbox, canvasData);
            if (symbol) isOp = true;
        }

        // If not operator, invoke TF.js prediction
        if (!symbol) {
            const predResults = await predictDigit(preprocessedPixels);
            symbol = predResults.prediction.toString();
            confidence = predResults.confidence;
            totalLatency += predResults.latency;
        }

        expressionParts.push({ symbol, confidence, isOp, pixels: preprocessedPixels });

        // Add segment item in horizontal strip list
        const segItem = document.createElement('div');
        segItem.className = 'segment-item';
        
        // Select dropdown for Manual Correction / Labeling
        const select = document.createElement('select');
        const options = ['0','1','2','3','4','5','6','7','8','9','+','-','*','/'];
        options.forEach(opt => {
            const el = document.createElement('option');
            el.value = opt;
            el.textContent = opt;
            if (opt === symbol) el.selected = true;
            select.appendChild(el);
        });

        // Event listener for manual label override (Adaptive learning training trigger)
        select.addEventListener('change', (e) => {
            const newVal = e.target.value;
            const oldVal = expressionParts[i].symbol;
            expressionParts[i].symbol = newVal;
            
            // If user corrections occur, add to retraining pool
            const isNewValDigit = !isNaN(parseInt(newVal));
            if (isNewValDigit && newVal !== oldVal) {
                correctedPool.images.push(preprocessedPixels);
                correctedPool.labels.push(parseInt(newVal));
                
                // Add system log notifications
                updateRetrainingUI();
                console.log(`Log added to Retraining pool: true class ${newVal}`);
            }
            
            recalculateExpression(expressionParts);
        });

        segItem.appendChild(segCanvas);
        segItem.appendChild(select);
        segmentsContainer.appendChild(segItem);
    }

    // Process first segment as primary single display output
    const primarySegment = expressionParts[0];
    if (primarySegment && !primarySegment.isOp) {
        predictedDigit.textContent = primarySegment.symbol;
        predictionConfidence.textContent = `${(primarySegment.confidence * 100).toFixed(1)}%`;
        confidenceBar.style.width = `${primarySegment.confidence * 100}%`;
        inferenceLatency.textContent = `${totalLatency}ms`;
        
        // Store pixels for history logging
        lastPreprocessedPixels = primarySegment.pixels;
        
        // Generate preprocessed preview viewport
        const pCtx = preprocessedCanvas.getContext('2d');
        const imgData28 = pCtx.createImageData(28, 28);
        for (let j = 0; j < 784; j++) {
            const val = Math.round(primarySegment.pixels[j] * 255);
            const idx = j * 4;
            imgData28.data[idx] = val;
            imgData28.data[idx+1] = val;
            imgData28.data[idx+2] = val;
            imgData28.data[idx+3] = 255;
        }
        pCtx.putImageData(imgData28, 0, 0);

        // Generate XAI Saliency Heatmap
        generateXAISaliency(primarySegment.pixels, parseInt(primarySegment.symbol));
        
        // Generate Coach feedback
        evaluateHandwritingQuality(primarySegment.pixels, bboxes[0]);
    } else if (primarySegment && primarySegment.isOp) {
        predictedDigit.textContent = primarySegment.symbol;
        predictionConfidence.textContent = '100%';
        confidenceBar.style.width = '100%';
        inferenceLatency.textContent = '0ms';
    }

    // Recalculate expression list
    recalculateExpression(expressionParts);
}

function recalculateExpression(parts) {
    const mathMode = mathModeToggle.checked;
    const translationPanel = document.getElementById('text-translation-panel');
    const translationVal = document.getElementById('text-translation-val');
    
    if (mathMode && parts.length > 0) {
        mathResultPanel.style.display = 'flex';
        
        // Construct string equation
        const equation = parts.map(p => p.symbol).join(' ');
        mathExprText.textContent = equation;
        
        try {
            // Secure basic math evaluator (only digit characters and operations allowed)
            if (/^[0-9+\-*/\s().]+$/.test(equation)) {
                // Replace * and / symbols if needed
                const cleanEquation = equation.replace(/x/g, '*');
                const result = Function(`"use strict"; return (${cleanEquation})`)();
                
                if (result !== undefined && !isNaN(result)) {
                    const resStr = Number.isInteger(result) ? result.toString() : result.toFixed(2);
                    mathSolvedVal.textContent = resStr;
                    
                    // Update digit to text
                    const words = convertNumberToWords(resStr);
                    translationVal.textContent = words;
                    translationPanel.style.display = 'block';
                } else {
                    mathSolvedVal.textContent = '?';
                    translationPanel.style.display = 'none';
                }
            } else {
                mathSolvedVal.textContent = '?';
                translationPanel.style.display = 'none';
            }
        } catch (e) {
            mathSolvedVal.textContent = '?';
            translationPanel.style.display = 'none';
        }
    } else {
        mathResultPanel.style.display = 'none';
        
        // If not in math mode, translate the multi-digit number
        if (parts.length > 0) {
            const numStr = parts.map(p => p.symbol).join('');
            if (/^[0-9]+$/.test(numStr)) {
                const words = convertNumberToWords(numStr);
                translationVal.textContent = words;
                translationPanel.style.display = 'block';
            } else {
                translationPanel.style.display = 'none';
            }
        } else {
            translationPanel.style.display = 'none';
        }
    }
}

// Get reference to the overlay heatmap canvas (separate from main drawing canvas)
const heatmapCanvas = document.getElementById('heatmap-canvas');

// Generate XAI Saliency overlay or side viewport
function generateXAISaliency(pixels, winningClass) {
    const saliencyValues = getSaliencyGradients(pixels, winningClass);
    
    const sCtx = saliencyCanvas.getContext('2d');
    const sImgData = sCtx.createImageData(28, 28);
    
    for (let i = 0; i < 784; i++) {
        const idx = i * 4;
        const score = saliencyValues[i]; // Normalized 0-1
        
        // Heatmap color mapping: Black -> Orange -> White
        // Red component: high response
        sImgData.data[idx] = Math.round(score * 255);
        // Green component: medium-high response
        sImgData.data[idx+1] = Math.round(Math.pow(score, 2) * 160);
        // Blue component: very low
        sImgData.data[idx+2] = Math.round(Math.pow(score, 4) * 50);
        // Alpha
        sImgData.data[idx+3] = 255;
    }
    
    sCtx.putImageData(sImgData, 0, 0);

    // Apply overlay on the SEPARATE heatmap canvas (not the main drawing canvas)
    if (heatmapOverlayToggle.checked) {
        overlayHeatmapOnCanvas(saliencyValues);
    } else {
        // Clear the heatmap overlay canvas if toggle is off
        const hmCtx = heatmapCanvas.getContext('2d');
        hmCtx.clearRect(0, 0, heatmapCanvas.width, heatmapCanvas.height);
    }
}

function overlayHeatmapOnCanvas(saliencyValues) {
    // Render the saliency overlay on the dedicated heatmap canvas (not the main drawing canvas)
    const hmCtx = heatmapCanvas.getContext('2d');
    hmCtx.clearRect(0, 0, heatmapCanvas.width, heatmapCanvas.height);

    // We scale the 28x28 saliency to 450x450
    const scaleX = heatmapCanvas.width / 28;
    const scaleY = heatmapCanvas.height / 28;

    hmCtx.save();
    for (let y = 0; y < 28; y++) {
        for (let x = 0; x < 28; x++) {
            const score = saliencyValues[y * 28 + x];
            if (score > 0.1) {
                // Color mapping: Glowing violet-pink overlay
                hmCtx.fillStyle = `rgba(${Math.round(score * 236)}, ${Math.round(score * 72)}, 254, ${score * 0.55})`;
                hmCtx.fillRect(x * scaleX, y * scaleY, scaleX, scaleY);
            }
        }
    }
    hmCtx.restore();
}

// Heatmap toggle event
heatmapOverlayToggle.addEventListener('change', () => {
    runSegmentationAndInference();
});

// Handwriting Coaching logic
function evaluateHandwritingQuality(pixels, bbox) {
    // Quality scoring elements
    let centeringScore = 100;
    let thicknessScore = 100;
    let continuityScore = 100;
    let contrastScore = 100;

    // 1. Centering evaluation using center of mass
    let sumX = 0, sumY = 0, count = 0;
    let minPix = 1.0, maxPix = 0.0;
    
    for (let y = 0; y < 28; y++) {
        for (let x = 0; x < 28; x++) {
            const val = pixels[y * 28 + x];
            if (val > maxPix) maxPix = val;
            if (val < minPix) minPix = val;
            if (val > 0.05) {
                sumX += x;
                sumY += y;
                count++;
            }
        }
    }

    if (count > 0) {
        const cx = sumX / count;
        const cy = sumY / count;
        const devX = Math.abs(14 - cx);
        const devY = Math.abs(14 - cy);
        const totalDev = devX + devY;
        centeringScore = Math.max(0, Math.round(100 - totalDev * 8));
    }

    // 2. Stroke thickness (density of white pixels in bounding box)
    const bboxArea = bbox.w * bbox.h;
    let activePixels = 0;
    const data = ctx.getImageData(bbox.x, bbox.y, bbox.w, bbox.h).data;
    for (let i = 0; i < data.length; i += 4) {
        if ((data[i] + data[i+1] + data[i+2]) / 3 > 15) activePixels++;
    }

    const density = activePixels / bboxArea;
    if (density < 0.12) { // Too thin
        thicknessScore = Math.max(20, Math.round(density * 800));
    } else if (density > 0.35) { // Too thick
        thicknessScore = Math.max(20, Math.round(100 - (density - 0.35) * 200));
    }

    // 3. Contrast evaluation (brightness of drawn strokes)
    contrastScore = Math.round(maxPix * 100);

    // 4. Bounding box size proportion
    const sizeProportion = bbox.w / canvas.width;
    if (sizeProportion < 0.08) {
        continuityScore = 40; // Too small to identify features reliably
    }

    // Calculate final aggregate clarity score
    const finalScore = Math.round((centeringScore + thicknessScore + contrastScore + continuityScore) / 4);

    // Render gauge circle animation
    // Circle circumference is 2 * PI * r = 2 * 3.14159 * 40 = 251.2
    const strokeOffset = 251.2 - (finalScore / 100) * 251.2;
    coachGaugeFill.style.strokeDashoffset = strokeOffset;
    coachScoreText.textContent = `${finalScore}%`;

    // Render bar meters in detailed tab
    document.getElementById('coach-metric-centering').style.width = `${centeringScore}%`;
    document.getElementById('coach-val-centering').textContent = `${centeringScore}%`;
    document.getElementById('coach-metric-thickness').style.width = `${thicknessScore}%`;
    document.getElementById('coach-val-thickness').textContent = `${thicknessScore}%`;
    document.getElementById('coach-metric-contrast').style.width = `${contrastScore}%`;
    document.getElementById('coach-val-contrast').textContent = `${contrastScore}%`;
    document.getElementById('coach-metric-continuity').style.width = `${continuityScore}%`;
    document.getElementById('coach-val-continuity').textContent = `${continuityScore}%`;

    // Rating Label text feedback
    let rating = "Fair stroke structure";
    if (finalScore >= 90) rating = "Excellent stroke structure!";
    else if (finalScore >= 75) rating = "Clear handwriting shape";
    else if (finalScore < 50) rating = "Requires improvements";
    
    coachRatingLabel.textContent = rating;

    // Compose suggestions panel text
    let feedbackHTML = '<div class="coach-advice-box">';
    
    if (centeringScore < 75) {
        feedbackHTML += `
            <div class="advice-item warning">
                <i class="fa-solid fa-align-center"></i>
                <div>
                    <strong>Stroke Translation Deviation</strong>
                    <p>Your digit is written off-center. Centering digits increases classification accuracy by eliminating variance in the classification layers.</p>
                </div>
            </div>`;
    } else {
        feedbackHTML += `
            <div class="advice-item success">
                <i class="fa-solid fa-circle-check"></i>
                <div>
                    <strong>Well Centered</strong>
                    <p>Excellent! The centroid is located near coordinate (14, 14), mapping perfectly to standard inputs.</p>
                </div>
            </div>`;
    }

    if (density < 0.12) {
        feedbackHTML += `
            <div class="advice-item warning">
                <i class="fa-solid fa-paintbrush"></i>
                <div>
                    <strong>Brush Stroke Too Thin</strong>
                    <p>The pixel weight is low. Try writing slower, applying higher pressure, or increasing the brush size slider to 28-32px.</p>
                </div>
            </div>`;
    } else if (density > 0.35) {
        feedbackHTML += `
            <div class="advice-item warning">
                <i class="fa-solid fa-fill-drip"></i>
                <div>
                    <strong>Stroke Blotting / Excess Thickness</strong>
                    <p>Strokes are bleeding into each other. Try drawing with a smaller brush size to preserve the character's internal hollow loops (like in '0', '8', '6').</p>
                </div>
            </div>`;
    } else {
        feedbackHTML += `
            <div class="advice-item success">
                <i class="fa-solid fa-circle-check"></i>
                <div>
                    <strong>Ideal Stroke Density</strong>
                    <p>Stroke weight matches standard MNIST line distributions, allowing optimal activation of pooling layers.</p>
                </div>
            </div>`;
    }

    if (sizeProportion < 0.08) {
        feedbackHTML += `
            <div class="advice-item warning">
                <i class="fa-solid fa-minimize"></i>
                <div>
                    <strong>Micro-writing Detected</strong>
                    <p>The character is too small. Small strokes lose spatial resolution during scaling down to 28x28, leading to pixelation errors. Write larger.</p>
                </div>
            </div>`;
    }

    feedbackHTML += '</div>';
    coachFeedbackBox.innerHTML = feedbackHTML;
}

function clearPredictionsUI() {
    predictedDigit.textContent = '-';
    predictionConfidence.textContent = '0.0%';
    confidenceBar.style.width = '0%';
    inferenceLatency.textContent = '0ms';
    lastPreprocessedPixels = null;
    
    // Clear crop/XAI canvases
    const pCtx = preprocessedCanvas.getContext('2d');
    pCtx.clearRect(0,0,28,28);
    const sCtx = saliencyCanvas.getContext('2d');
    sCtx.clearRect(0,0,28,28);
    
    // Clear heatmap overlay canvas
    const hmCtx = heatmapCanvas.getContext('2d');
    hmCtx.clearRect(0, 0, heatmapCanvas.width, heatmapCanvas.height);
    
    segmentsContainer.innerHTML = '<div class="placeholder-text">Draw multiple items separated by spaces to trigger segmentation.</div>';
    mathResultPanel.style.display = 'none';
    
    // Reset coach gauge
    coachGaugeFill.style.strokeDashoffset = 251.2;
    coachScoreText.textContent = '0%';
    coachRatingLabel.textContent = 'Draw a digit to begin coaching analysis';
    coachFeedbackBox.innerHTML = `
        <div class="coach-placeholder">
            <i class="fa-solid fa-compass-drafting animate-float"></i>
            <p>Draw any digit on the Canvas in the **Inference Lab** tab, then return here to receive professional feedback on your writing structure.</p>
        </div>`;
}

/* ==========================================================================
   5. Webcam Stream & Frame Capture
   ========================================================================== */
const startWebcamBtn = document.getElementById('start-webcam-btn');
const toggleStreamBtn = document.getElementById('toggle-stream-btn');
const webcamVideo = document.getElementById('webcam-video');

startWebcamBtn.addEventListener('click', initWebcam);
toggleStreamBtn.addEventListener('click', toggleWebcamInference);

async function initWebcam() {
    try {
        webcamStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 320, height: 240, facingMode: 'user' },
            audio: false
        });
        webcamVideo.srcObject = webcamStream;
        document.querySelector('.webcam-placeholder').style.display = 'none';
        toggleStreamBtn.disabled = false;
        
        // Start continuous processing
        startWebcamInference();
    } catch (e) {
        console.error("Camera access error: ", e);
        alert("Could not access webcam stream. Please verify browser media permissions.");
    }
}

function startWebcamInference() {
    toggleStreamBtn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause Inference';
    webcamInterval = setInterval(processWebcamFrame, 150); // Inference every 150ms
}

function stopWebcamStream() {
    if (webcamInterval) {
        clearInterval(webcamInterval);
        webcamInterval = null;
    }
    if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
        webcamStream = null;
    }
    toggleStreamBtn.disabled = true;
    toggleStreamBtn.textContent = 'Pause Inference';
}

function toggleWebcamInference() {
    if (webcamInterval) {
        clearInterval(webcamInterval);
        webcamInterval = null;
        toggleStreamBtn.innerHTML = '<i class="fa-solid fa-play"></i> Resume Inference';
    } else {
        startWebcamInference();
    }
}

function processWebcamFrame() {
    if (!isModelLoaded || !webcamStream) return;

    // Create a temporary canvas matching the crop box
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 180;
    tempCanvas.height = 180;
    const tempCtx = tempCanvas.getContext('2d');

    // Crop center square of video stream
    // Video aspect is 4:3 (320x240) -> square starts at x=70, y=30, size=180
    tempCtx.drawImage(webcamVideo, 70, 30, 180, 180, 0, 0, 180, 180);

    // Apply high-contrast binarization threshold (webcam uses white background usually, so invert)
    const imgData = tempCtx.getImageData(0, 0, 180, 180);
    const data = imgData.data;
    
    // Invert webcam stream (convert black ink on white background to white stroke on black background)
    const threshCanvas = document.createElement('canvas');
    threshCanvas.width = 180;
    threshCanvas.height = 180;
    const tCtx = threshCanvas.getContext('2d');
    const tImgData = tCtx.createImageData(180, 180);
    
    for (let i = 0; i < data.length; i += 4) {
        const grayscale = (data[i] + data[i+1] + data[i+2]) / 3;
        // Invert: if pixel is dark (ink), convert to bright white stroke.
        const val = grayscale < 110 ? 255 : 0;
        tImgData.data[i] = val;
        tImgData.data[i+1] = val;
        tImgData.data[i+2] = val;
        tImgData.data[i+3] = 255;
    }
    tCtx.putImageData(tImgData, 0, 0);

    // Feed binarized image to standard segmentation bounding boxes
    const bbox = { x: 0, y: 0, w: 180, h: 180 }; // Treat entire frame as bounding box
    const preprocessed = preprocessSegment(threshCanvas, bbox);
    
    predictDigit(preprocessed).then(results => {
        predictedDigit.textContent = results.prediction;
        predictionConfidence.textContent = `${(results.confidence * 100).toFixed(1)}%`;
        confidenceBar.style.width = `${results.confidence * 100}%`;
        inferenceLatency.textContent = `${results.latency}ms`;
        lastPreprocessedPixels = preprocessed;

        // Update preprocessed viewport preview
        const pCtx = preprocessedCanvas.getContext('2d');
        const imgData28 = pCtx.createImageData(28, 28);
        for (let j = 0; j < 784; j++) {
            const val = Math.round(preprocessed[j] * 255);
            const idx = j * 4;
            imgData28.data[idx] = val;
            imgData28.data[idx+1] = val;
            imgData28.data[idx+2] = val;
            imgData28.data[idx+3] = 255;
        }
        pCtx.putImageData(imgData28, 0, 0);

        generateXAISaliency(preprocessed, results.prediction);
    });
}

/* ==========================================================================
   6. Image Upload Processing
   ========================================================================== */
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');
const uploadPreview = document.getElementById('upload-preview');
const uploadedImagePreview = document.getElementById('uploaded-image-preview');
const resetUploadBtn = document.getElementById('reset-upload-btn');

uploadZone.addEventListener('click', () => fileInput.click());
uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
});
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) processUploadedFile(files[0]);
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) processUploadedFile(e.target.files[0]);
});

resetUploadBtn.addEventListener('click', () => {
    uploadPreview.style.display = 'none';
    uploadZone.style.display = 'flex';
    fileInput.value = '';
    clearPredictionsUI();
});

function processUploadedFile(file) {
    if (!file.type.match('image.*')) {
        alert("Error: Selected file is not a valid image format.");
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        uploadedImagePreview.src = e.target.result;
        uploadZone.style.display = 'none';
        uploadPreview.style.display = 'flex';
        
        uploadedImagePreview.onload = () => {
            // Draw image on canvas to run segmentations
            clearCanvas();
            // Calculate scale to fit canvas width/height
            const aspect = uploadedImagePreview.naturalWidth / uploadedImagePreview.naturalHeight;
            let dw = canvas.width;
            let dh = canvas.height;
            if (aspect > 1) {
                dh = canvas.width / aspect;
            } else {
                dw = canvas.height * aspect;
            }
            
            // Draw binarized centered image
            ctx.fillStyle = '#000000';
            ctx.fillRect(0,0,canvas.width,canvas.height);
            
            // Draw original in middle
            const dx = (canvas.width - dw) / 2;
            const dy = (canvas.height - dh) / 2;
            ctx.drawImage(uploadedImagePreview, dx, dy, dw, dh);

            // Binarize drawing to ensure white text on black background
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;
            for (let i = 0; i < data.length; i += 4) {
                const grayscale = (data[i] + data[i+1] + data[i+2]) / 3;
                // If background is bright (white paper), invert, else preserve
                // We threshold: if background is mostly bright, invert
                // Standard heuristic check: average brightness of corners
                const isLightBg = checkCornersBrightness(data, canvas.width, canvas.height);
                const val = isLightBg ? (grayscale < 160 ? 255 : 0) : (grayscale > 45 ? 255 : 0);
                data[i] = val;
                data[i+1] = val;
                data[i+2] = val;
            }
            ctx.putImageData(imgData, 0, 0);
            saveCanvasState();
            runSegmentationAndInference();
        };
    };
    reader.readAsDataURL(file);
}

function checkCornersBrightness(data, w, h) {
    // Check pixel brightness at 4 corners
    const idxs = [
        0, // Top-left
        (w - 1) * 4, // Top-right
        ((h - 1) * w) * 4, // Bottom-left
        ((h - 1) * w + (w - 1)) * 4 // Bottom-right
    ];
    let sum = 0;
    idxs.forEach(idx => {
        sum += (data[idx] + data[idx+1] + data[idx+2]) / 3;
    });
    return (sum / 4 > 120); // If corner averages are bright, invert
}

/* ==========================================================================
   7. Prediction Log Dashboard History
   ========================================================================== */
const saveHistoryBtn = document.getElementById('save-history-btn');
const exportCsvBtn = document.getElementById('export-csv-btn');
const printReportBtn = document.getElementById('print-report-btn');
const clearHistoryBtn = document.getElementById('clear-history-btn');
const historyTableBody = document.getElementById('history-table-body');

saveHistoryBtn.addEventListener('click', logPredictionToHistory);
exportCsvBtn.addEventListener('click', exportHistoryCSV);
printReportBtn.addEventListener('click', () => window.print());
clearHistoryBtn.addEventListener('click', resetPredictionHistory);

function loadHistoryFromStorage() {
    const data = localStorage.getItem('auradigit_history');
    if (data && JSON.parse(data).length > 0) {
        predictionHistory = JSON.parse(data);
    } else {
        // Pre-populate with mock predictions to show dashboard charts immediately on first load
        const mockThumb = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' style='background:%23000;'><text x='15' y='28' fill='%23fff' font-family='Outfit' font-size='24'>D</text></svg>";
        
        predictionHistory = [
            {
                id: "mock1",
                timestamp: new Date(Date.now() - 30 * 1000).toLocaleString(),
                imageBase64: mockThumb,
                predictedLabel: "5",
                confidence: 94.2,
                clarityScore: 88,
                trueLabel: "5",
                profile: "Guest Student"
            },
            {
                id: "mock2",
                timestamp: new Date(Date.now() - 5 * 60 * 1000).toLocaleString(),
                imageBase64: mockThumb,
                predictedLabel: "3",
                confidence: 91.5,
                clarityScore: 82,
                trueLabel: "3",
                profile: "Guest Student"
            },
            {
                id: "mock3",
                timestamp: new Date(Date.now() - 15 * 60 * 1000).toLocaleString(),
                imageBase64: mockThumb,
                predictedLabel: "8",
                confidence: 96.0,
                clarityScore: 91,
                trueLabel: "8",
                profile: "Guest Student"
            },
            {
                id: "mock4",
                timestamp: new Date(Date.now() - 45 * 60 * 1000).toLocaleString(),
                imageBase64: mockThumb,
                predictedLabel: "2",
                confidence: 88.5,
                clarityScore: 79,
                trueLabel: "2",
                profile: "Guest Student"
            },
            {
                id: "mock5",
                timestamp: new Date(Date.now() - 2 * 3600 * 1000).toLocaleString(),
                imageBase64: mockThumb,
                predictedLabel: "0",
                confidence: 98.1,
                clarityScore: 94,
                trueLabel: "0",
                profile: "Guest Student"
            }
        ];
        saveHistoryToStorage();
    }
}

function saveHistoryToStorage() {
    localStorage.setItem('auradigit_history', JSON.stringify(predictionHistory));
}

function logPredictionToHistory() {
    const digit = predictedDigit.textContent;
    if (digit === '-') {
        alert("Cannot log empty prediction. Draw a digit first.");
        return;
    }

    const bbox = getDrawnBoundingBox();
    if (!bbox) return;

    // Crop drawn box from canvas to make history thumbnail
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 40;
    thumbCanvas.height = 40;
    const thumbCtx = thumbCanvas.getContext('2d');
    thumbCtx.fillStyle = '#000000';
    thumbCtx.fillRect(0,0,40,40);
    thumbCtx.drawImage(canvas, bbox.x, bbox.y, bbox.w, bbox.h, 4, 4, 32, 32);

    const logItem = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString(),
        imageBase64: thumbCanvas.toDataURL(),
        predictedLabel: digit,
        confidence: parseFloat(predictionConfidence.textContent),
        clarityScore: parseInt(coachScoreText.textContent),
        trueLabel: digit, // Defaults to predicted
        profile: currentProfile.name,
        // Store pixels so we can retrain if the user corrects the label later
        pixels: lastPreprocessedPixels ? Array.from(lastPreprocessedPixels) : null
    };

    predictionHistory.unshift(logItem); // Add to top of list
    saveHistoryToStorage();
    
    // Animate button success state
    const originalHTML = saveHistoryBtn.innerHTML;
    saveHistoryBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Logged!';
    saveHistoryBtn.classList.remove('btn-secondary');
    saveHistoryBtn.classList.add('btn-primary');
    setTimeout(() => {
        saveHistoryBtn.innerHTML = originalHTML;
        saveHistoryBtn.classList.remove('btn-primary');
        saveHistoryBtn.classList.add('btn-secondary');
    }, 1200);

    updateAnalyticsDashboard();
}

function renderHistoryTable() {
    historyTableBody.innerHTML = '';
    
    // Filter history for current profile
    const profileHistory = predictionHistory.filter(h => h.profile === currentProfile.name);

    if (profileHistory.length === 0) {
        historyTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-table-msg">No predictions logged yet for this profile.</td>
            </tr>`;
        return;
    }

    profileHistory.forEach(item => {
        const row = document.createElement('tr');
        
        // True label correction dropdown
        let labelDropdown = `<select class="history-label-correct" data-id="${item.id}">`;
        for (let i = 0; i < 10; i++) {
            const selected = item.trueLabel === i.toString() ? 'selected' : '';
            labelDropdown += `<option value="${i}" ${selected}>${i}</option>`;
        }
        labelDropdown += `</select>`;

        row.innerHTML = `
            <td>${item.timestamp}</td>
            <td><img src="${item.imageBase64}" alt="Thumb"></td>
            <td><strong class="glow-text">${item.predictedLabel}</strong></td>
            <td>${item.confidence.toFixed(1)}%</td>
            <td>${item.clarityScore}%</td>
            <td class="true-label-cell">${labelDropdown}</td>
            <td>
                <button class="btn btn-danger btn-sm delete-log-btn" data-id="${item.id}">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        `;

        // Bind correction event
        row.querySelector('.history-label-correct').addEventListener('change', (e) => {
            const newLabel = e.target.value;
            correctLogLabel(item.id, newLabel);
        });

        // Bind delete event
        row.querySelector('.delete-log-btn').addEventListener('click', () => {
            deleteLogItem(item.id);
        });

        historyTableBody.appendChild(row);
    });
}

function correctLogLabel(id, newLabel) {
    const idx = predictionHistory.findIndex(h => h.id === id);
    if (idx !== -1) {
        const oldLabel = predictionHistory[idx].trueLabel;
        predictionHistory[idx].trueLabel = newLabel;
        saveHistoryToStorage();
        
        if (newLabel !== oldLabel) {
            // Rebuild the retraining pool from all history corrections
            loadRetrainingPoolFromHistory();
            updateAnalyticsDashboard();
        }
    }
}

// Scans the current profile's history and rebuilds the corrected retraining pool
// from any entries where trueLabel differs from predictedLabel and pixels are stored
function loadRetrainingPoolFromHistory() {
    correctedPool.images = [];
    correctedPool.labels = [];
    
    const profileHistory = predictionHistory.filter(h => h.profile === currentProfile.name);
    profileHistory.forEach(h => {
        const trueDigit = parseInt(h.trueLabel);
        const predDigit = parseInt(h.predictedLabel);
        // Only add corrected entries that have saved pixel arrays and are numeric
        if (!isNaN(trueDigit) && !isNaN(predDigit) && trueDigit !== predDigit && h.pixels && h.pixels.length === 784) {
            correctedPool.images.push(h.pixels);
            correctedPool.labels.push(trueDigit);
        }
    });
    
    updateRetrainingUI();
}

function deleteLogItem(id) {
    predictionHistory = predictionHistory.filter(h => h.id !== id);
    saveHistoryToStorage();
    loadRetrainingPoolFromHistory(); // Rebuild pool in case a corrected entry was deleted
    renderHistoryTable();
    updateAnalyticsDashboard();
}

function resetPredictionHistory() {
    if (confirm("Are you sure you want to clear the entire history database for this profile?")) {
        predictionHistory = predictionHistory.filter(h => h.profile !== currentProfile.name);
        saveHistoryToStorage();
        renderHistoryTable();
        updateAnalyticsDashboard();
    }
}

function updateAnalyticsDashboard() {
    const profileHistory = predictionHistory.filter(h => h.profile === currentProfile.name);
    
    const totalCount = profileHistory.length;
    let avgConfidence = 0;
    let avgClarity = 0;
    let errorCorrections = 0;

    if (totalCount > 0) {
        let sumConf = 0;
        let sumClarity = 0;
        profileHistory.forEach(h => {
            sumConf += h.confidence;
            sumClarity += h.clarityScore;
            if (h.predictedLabel !== h.trueLabel) errorCorrections++;
        });
        avgConfidence = sumConf / totalCount;
        avgClarity = sumClarity / totalCount;
    }

    document.getElementById('stats-total-predictions').textContent = totalCount;
    document.getElementById('stats-avg-confidence').textContent = `${avgConfidence.toFixed(1)}%`;
    document.getElementById('stats-avg-clarity').textContent = `${avgClarity.toFixed(1)}%`;
    document.getElementById('stats-corrected-count').textContent = errorCorrections;

    // Refresh charts if on analytics tab
    if (activeTab === 'analytics') {
        initAnalyticsCharts();
    }
}

function exportHistoryCSV() {
    const profileHistory = predictionHistory.filter(h => h.profile === currentProfile.name);
    if (profileHistory.length === 0) {
        alert("No history data to export.");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Timestamp,Model Prediction,Confidence (%),Handwriting Clarity (%),User Corrected Label\r\n";
    
    profileHistory.forEach(item => {
        csvContent += `"${item.timestamp}",${item.predictedLabel},${item.confidence},${item.clarityScore},${item.trueLabel}\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `auradigit_prediction_history_${currentProfile.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/* ==========================================================================
   8. Chart.js Graphs Setup
   ========================================================================== */
function initAnalyticsCharts() {
    const profileHistory = predictionHistory.filter(h => h.profile === currentProfile.name);
    
    // 1. Frequency Distribution Bar Chart
    const freq = new Array(10).fill(0);
    profileHistory.forEach(h => {
        const val = parseInt(h.predictedLabel);
        if (!isNaN(val) && val >= 0 && val <= 9) freq[val]++;
    });

    const ctxDist = document.getElementById('chart-distribution').getContext('2d');
    if (distributionChart) distributionChart.destroy();
    
    const isDark = document.body.classList.contains('dark-theme');
    const textColor = isDark ? '#9ca3af' : '#4b5563';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';

    distributionChart = new Chart(ctxDist, {
        type: 'bar',
        data: {
            labels: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
            datasets: [{
                label: 'Class Distribution',
                data: freq,
                backgroundColor: 'rgba(139, 92, 246, 0.65)',
                borderColor: '#8b5cf6',
                borderWidth: 1,
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    grid: { color: gridColor },
                    ticks: { color: textColor, stepSize: 1 }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: textColor }
                }
            }
        }
    });

    // 2. Trend Line Chart over time
    const trendCtx = document.getElementById('chart-history-trend').getContext('2d');
    if (trendChart) trendChart.destroy();

    // Take last 15 history items chronologically (reverse array order)
    const recentHistory = [...profileHistory].slice(0, 15).reverse();
    const trendLabels = recentHistory.map((_, i) => `Inference ${i+1}`);
    const trendConfidence = recentHistory.map(h => h.confidence);
    const trendClarity = recentHistory.map(h => h.clarityScore);

    trendChart = new Chart(trendCtx, {
        type: 'line',
        data: {
            labels: trendLabels,
            datasets: [
                {
                    label: 'Confidence (%)',
                    data: trendConfidence,
                    borderColor: '#06b6d4',
                    backgroundColor: 'rgba(6, 182, 212, 0.08)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3
                },
                {
                    label: 'Clarity Score (%)',
                    data: trendClarity,
                    borderColor: '#a855f7',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: textColor, font: { size: 10 } }
                }
            },
            scales: {
                y: {
                    min: 0,
                    max: 100,
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: textColor }
                }
            }
        }
    });
}

function initTrainingChart() {
    const ctxTrain = document.getElementById('chart-training-loss').getContext('2d');
    if (trainingLossChart) return; // avoid rebuild

    const isDark = document.body.classList.contains('dark-theme');
    const textColor = isDark ? '#9ca3af' : '#4b5563';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';

    trainingLossChart = new Chart(ctxTrain, {
        type: 'line',
        data: {
            labels: trainingEpochLabels,
            datasets: [{
                label: 'Training Loss',
                data: trainingLossData,
                borderColor: '#ec4899',
                backgroundColor: 'rgba(236, 72, 153, 0.08)',
                borderWidth: 2,
                fill: true,
                tension: 0.2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                },
                x: {
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                }
            }
        }
    });
}

/* ==========================================================================
   9. Browser Adaptive Retraining Engine
   ========================================================================== */
const retrainConsoleLogs = document.getElementById('train-console-logs');

function updateRetrainingUI() {
    const count = correctedPool.images.length;
    retrainSampleCount.textContent = `${count} samples collected`;
    
    // Scale progress bar to 10 samples (arbitrary target for retraining)
    const progress = Math.min(100, (count / 10) * 100);
    retrainSampleBar.style.width = `${progress}%`;
    
    // Enable button if at least 1 sample is corrected
    startRetrainBtn.disabled = (count === 0);
}

startRetrainBtn.addEventListener('click', triggerOnlineRetraining);

async function triggerOnlineRetraining() {
    if (correctedPool.images.length === 0) return;
    
    startRetrainBtn.disabled = true;
    startRetrainBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Fine-Tuning...';
    
    // Reset training charts
    trainingLossData.length = 0;
    trainingEpochLabels.length = 0;
    if (trainingLossChart) {
        trainingLossChart.data.labels = trainingEpochLabels;
        trainingLossChart.data.datasets[0].data = trainingLossData;
        trainingLossChart.update();
    }

    retrainConsoleLogs.innerHTML = '';
    logToConsole("Initializing Adaptive Training Loop...", 'system-log');
    logToConsole(`Loaded ${correctedPool.images.length} handwritten examples.`, 'info-log');
    logToConsole(`Compiling layers using standard Stochastic Gradient Descent...`, 'system-log');
    
    const epochs = parseInt(document.getElementById('param-epochs').value);
    const lr = parseFloat(document.getElementById('param-lr').value);
    const batch = parseInt(document.getElementById('param-batch').value);

    // Call fineTuneModel in model.js
    const success = await fineTuneModel(
        correctedPool.images, 
        correctedPool.labels, 
        epochs, 
        lr, 
        batch, 
        (epoch, loss, acc) => {
            // Epoch callback updates UI
            document.getElementById('train-current-epoch').textContent = `${epoch} / ${epochs}`;
            document.getElementById('train-current-loss').textContent = loss.toFixed(4);
            document.getElementById('train-current-acc').textContent = `${(acc * 100).toFixed(1)}%`;
            
            // Add point to chart
            trainingEpochLabels.push(`Ep ${epoch}`);
            trainingLossData.push(loss);
            if (trainingLossChart) trainingLossChart.update();
            
            logToConsole(`Epoch ${epoch}/${epochs} completed. Loss: ${loss.toFixed(4)}`, 'info-log');
        }
    );

    if (success) {
        logToConsole("Fine-tuning completed successfully! Local weights updated.", 'info-log');
        alert("Success! The model was successfully fine-tuned on your handwriting samples.");
        
        // Align trueLabel to predictedLabel for all corrected items so pool rebuilds to empty
        predictionHistory.forEach(h => {
            if (h.profile === currentProfile.name && h.trueLabel !== h.predictedLabel) {
                h.predictedLabel = h.trueLabel;
            }
        });
        saveHistoryToStorage();
        
        // Clear retraining pool on success
        correctedPool.images = [];
        correctedPool.labels = [];
        updateRetrainingUI();
    } else {
        logToConsole("ERROR: Training session crashed. Check browser console logs.", 'system-log');
        alert("Training failed. Ensure parameters are valid and redraw samples.");
    }
    
    startRetrainBtn.disabled = false;
    startRetrainBtn.innerHTML = '<i class="fa-solid fa-microchip"></i> Start Online Training';
}

function logToConsole(text, className = '') {
    const span = document.createElement('span');
    span.className = className;
    span.textContent = `> ${text}`;
    retrainConsoleLogs.appendChild(span);
    retrainConsoleLogs.scrollTop = retrainConsoleLogs.scrollHeight; // Autoscroll
}

/* ==========================================================================
   10. Profile Mock Authentication & Settings
   ========================================================================== */
function initProfiles() {
    // Load existing profiles from localStorage or create defaults
    const data = localStorage.getItem('auradigit_profiles');
    if (data) {
        profiles = JSON.parse(data);
    } else {
        profiles = [
            { name: "Guest Student", role: "Right-Handed" },
            { name: "Professor Reviewer", role: "Left-Handed" }
        ];
        localStorage.setItem('auradigit_profiles', JSON.stringify(profiles));
    }
    
    const activeProf = localStorage.getItem('auradigit_active_profile');
    if (activeProf) {
        const found = profiles.find(p => p.name === activeProf);
        if (found) currentProfile = found;
    }
    
    updateActiveProfileUI();
    renderProfileDropdownList();
    
    // Rebuild retraining pool from any previously corrected history entries
    loadRetrainingPoolFromHistory();
    
    // Toggle dropdown — use fixed positioning so backdrop-filter doesn't clip it
    profileWidget.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = profileDropdownMenu.classList.contains('show');
        if (!isVisible) {
            // Position dropdown exactly below the profile widget
            const rect = profileWidget.getBoundingClientRect();
            profileDropdownMenu.style.top = (rect.bottom + 8) + 'px';
            profileDropdownMenu.style.right = (window.innerWidth - rect.right) + 'px';
        }
        profileDropdownMenu.classList.toggle('show');
    });
    
    window.addEventListener('click', () => {
        profileDropdownMenu.classList.remove('show');
    });
}

function updateActiveProfileUI() {
    document.getElementById('user-display-name').textContent = currentProfile.name;
    document.getElementById('user-display-profile').textContent = currentProfile.role;
    localStorage.setItem('auradigit_active_profile', currentProfile.name);
    
    // Rebuild retraining pool for the newly active profile
    loadRetrainingPoolFromHistory();
    
    // Update data dashboards
    updateAnalyticsDashboard();
    updateCoachProfile();
}

function renderProfileDropdownList() {
    profileListContainer.innerHTML = '';
    profiles.forEach(prof => {
        const btn = document.createElement('button');
        btn.className = 'dropdown-item';
        btn.textContent = `${prof.name} (${prof.role})`;
        
        btn.addEventListener('click', () => {
            currentProfile = prof;
            updateActiveProfileUI();
            // Reload stats and tables
            renderHistoryTable();
        });
        
        profileListContainer.appendChild(btn);
    });
}

// Profile modal controls
createProfileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    profileModal.style.display = 'flex';
    profileDropdownMenu.classList.remove('show');
});

modalCancelBtn.addEventListener('click', () => {
    profileModal.style.display = 'none';
});

modalSubmitBtn.addEventListener('click', () => {
    const nameInput = document.getElementById('new-profile-name').value.trim();
    const roleSelect = document.getElementById('new-profile-role').value;
    
    if (nameInput === '') {
        alert("Please enter a valid profile name.");
        return;
    }

    // Check for duplicates
    if (profiles.some(p => p.name.toLowerCase() === nameInput.toLowerCase())) {
        alert("A profile with this name already exists.");
        return;
    }

    const newProf = { name: nameInput, role: roleSelect };
    profiles.push(newProf);
    localStorage.setItem('auradigit_profiles', JSON.stringify(profiles));
    
    currentProfile = newProf;
    
    updateActiveProfileUI();
    renderProfileDropdownList();
    
    // Reset modal
    document.getElementById('new-profile-name').value = '';
    profileModal.style.display = 'none';
    
    renderHistoryTable();
});

/* ==========================================================================
   11. Helper features: Voice, Themes, Initializations
   ========================================================================== */
// Text to speech voice synthesis
document.getElementById('speak-btn').addEventListener('click', () => {
    const digit = predictedDigit.textContent;
    const confidence = predictionConfidence.textContent;
    
    if (digit === '-') return;
    
    let text = `Predicted digit: ${digit} with ${confidence} confidence.`;
    
    // Check if words representation is active
    const translationPanel = document.getElementById('text-translation-panel');
    const translationVal = document.getElementById('text-translation-val');
    
    if (translationPanel && translationPanel.style.display !== 'none') {
        const words = translationVal.textContent;
        text = `Predicted value: ${words}`;
    }
    
    // Check if multi-digit expression is active
    const mathMode = mathModeToggle.checked;
    if (mathMode && mathResultPanel.style.display !== 'none') {
        const expression = mathExprText.textContent;
        const result = mathSolvedVal.textContent;
        let resWords = result;
        if (!isNaN(parseInt(result))) {
            resWords = convertNumberToWords(result);
        }
        text = `Calculated expression: ${expression} equals ${resWords}`;
    }

    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        // Select an English voice if available
        const voices = window.speechSynthesis.getVoices();
        const englishVoice = voices.find(v => v.lang.startsWith('en'));
        if (englishVoice) utterance.voice = englishVoice;
        
        window.speechSynthesis.speak(utterance);
    } else {
        alert("Web Speech API voice synthesis is not supported on this browser.");
    }
});

// Light/Dark Theme Switcher
themeToggleBtn.addEventListener('click', () => {
    const body = document.body;
    if (body.classList.contains('dark-theme')) {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
        localStorage.setItem('auradigit_theme', 'light');
    } else {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
        localStorage.setItem('auradigit_theme', 'dark');
    }
    
    // Trigger charts update to update grid lines and text colors
    if (activeTab === 'analytics') {
        initAnalyticsCharts();
    }
});

// Load saved theme preference
function loadSavedTheme() {
    const theme = localStorage.getItem('auradigit_theme');
    if (theme === 'light') {
        document.body.className = 'light-theme';
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    } else {
        document.body.className = 'dark-theme';
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }
}

// Global Handwriting Habits Analyzer for Coach Tab
let coachProgressChart = null;

function updateCoachProfile() {
    const profileHistory = predictionHistory.filter(h => h.profile === currentProfile.name);
    const habitsBody = document.getElementById('coach-habits-body');
    
    if (profileHistory.length === 0) {
        habitsBody.innerHTML = '<p class="empty-table-msg">Log some predictions to compile writing habits.</p>';
        if (coachProgressChart) coachProgressChart.destroy();
        return;
    }

    let sumClarity = 0;
    profileHistory.forEach(h => sumClarity += h.clarityScore);
    const avgClarity = Math.round(sumClarity / profileHistory.length);

    // Dynamic coach text advice
    let habitAdvice = "";
    if (avgClarity >= 90) {
        habitAdvice = "Excellent precision! You consistently write highly centered, clear strokes that conform well to the MNIST distribution.";
    } else if (avgClarity >= 75) {
        habitAdvice = "Great styling overall. To achieve 90%+, pay closer attention to stroke consistency and avoid writing too quickly.";
    } else {
        habitAdvice = "Your drawings average low clarity scores. Try using a thicker brush size (28-32px) and centering the digits manually in the canvas crop box.";
    }

    habitsBody.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:10px; font-size:0.85rem; line-height:1.4;">
            <div style="display:flex; justify-content:space-between;">
                <span>Historical Clarity Average:</span>
                <strong class="glow-text">${avgClarity}%</strong>
            </div>
            <div class="divider" style="margin: 5px 0;"></div>
            <p style="color: var(--text-secondary);">${habitAdvice}</p>
        </div>
    `;

    // Render Clarity progress line chart
    const recentHistory = [...profileHistory].slice(0, 10).reverse();
    const labels = recentHistory.map((_, i) => `Drawing ${i+1}`);
    const clarityData = recentHistory.map(h => h.clarityScore);

    const ctxProgress = document.getElementById('chart-coach-progress').getContext('2d');
    if (coachProgressChart) coachProgressChart.destroy();

    const isDark = document.body.classList.contains('dark-theme');
    const textColor = isDark ? '#9ca3af' : '#4b5563';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';

    coachProgressChart = new Chart(ctxProgress, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Clarity Score (%)',
                data: clarityData,
                borderColor: '#a855f7',
                backgroundColor: 'rgba(168, 85, 247, 0.08)',
                borderWidth: 2.5,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    min: 0,
                    max: 100,
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: textColor }
                }
            }
        }
    });
}

// Number Converter to words
function convertNumberToWords(numStr) {
    const num = Math.abs(parseInt(numStr));
    if (isNaN(num)) return "-";
    if (num === 0) return "Zero";

    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function g(n) {
        if (n < 20) return a[n];
        const digit = n % 10;
        return b[Math.floor(n / 10)] + (digit ? " " + a[digit] : "");
    }

    function h(n) {
        if (n < 100) return g(n);
        return a[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + g(n % 100) : "");
    }

    let n = num;
    let str = "";
    const units = ["", " Thousand", " Million", " Billion"];
    let unitIdx = 0;

    while (n > 0) {
        const chunk = n % 1000;
        if (chunk > 0) {
            str = h(chunk) + units[unitIdx] + (str ? " " + str : "");
        }
        n = Math.floor(n / 1000);
        unitIdx++;
    }

    return str.trim();
}

// Global initialization on page load
window.addEventListener('load', () => {
    loadSavedTheme();
    initCanvas();
    loadHistoryFromStorage();
    initProfiles();
    
    // Bind exporter button click
    const exportBtn = document.getElementById('export-model-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', downloadCurrentModel);
    }
});
