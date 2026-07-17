/* ==========================================================================
   AuraDigit Model Management - TensorFlow.js Inference, XAI & Fine-Tuning
   ========================================================================== */

let model = null;
let isModelLoaded = false;
let modelType = "Default Logistic Regression";

// Helper to update the model status indicator in the UI
function updateModelStatus(status, message) {
    const dot = document.querySelector('.status-dot');
    const text = document.getElementById('model-status-text');
    
    if (dot && text) {
        dot.className = 'status-dot ' + status;
        text.textContent = message;
    }
}

// Load the TensorFlow.js model
async function initModel() {
    updateModelStatus('warning', 'Loading Local Model...');
    try {
        // Attempt to load from the local python server first
        model = await tf.loadLayersModel('./model/model.json');
        isModelLoaded = true;
        modelType = "Local MNIST Model";
        updateModelStatus('online', 'Model Connected (Local)');
        console.log("Local model loaded successfully.");
    } catch (e) {
        console.warn("Could not load local model from server, attempting CDN fallback. Error: ", e);
        try {
            // CDN Fallback to load the official model JSON directly from GitHub Pages or Google CDN
            // We use the same google workshop model hosted on raw github as fallback
            model = await tf.loadLayersModel('https://raw.githubusercontent.com/google/tfjs-mnist-workshop/master/model/model.json');
            isModelLoaded = true;
            modelType = "CDN Fallback Model";
            updateModelStatus('online', 'Model Connected (CDN)');
            console.log("CDN model loaded successfully.");
        } catch (cdnError) {
            console.error("Failed to load model from both local server and CDN: ", cdnError);
            updateModelStatus('offline', 'Model Disconnected');
            alert("Warning: AuraDigit model could not be loaded. Please ensure python server.py is running on http://localhost:8000, or verify your internet connection.");
        }
    }
}

// Compile the model with basic parameters (needed if loaded or for fine-tuning)
function compileLoadedModel(learningRate = 0.01) {
    if (!model) return;
    model.compile({
        optimizer: tf.train.sgd(learningRate),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
    });
}

/**
 * Preprocesses a cropped bounding box region of a digit from the canvas.
 * Resizes the digit to 20x20 and centers it inside a 28x28 grid using the Center of Mass.
 * 
 * @param {HTMLCanvasElement} canvasElement Original canvas
 * @param {Object} bbox Bounding box {x, y, w, h}
 * @returns {Array} Grayscale normalized float32 array of size 784 (28x28)
 */
function preprocessSegment(canvasElement, bbox) {
    // 1. Extract raw bounding box pixels
    const ctx = canvasElement.getContext('2d');
    const imgData = ctx.getImageData(bbox.x, bbox.y, bbox.w, bbox.h);
    
    // Create temporary canvas to hold cropped digit
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = bbox.w;
    cropCanvas.height = bbox.h;
    const cropCtx = cropCanvas.getContext('2d');
    cropCtx.putImageData(imgData, 0, 0);

    // 2. Resize maintaining aspect ratio to fit inside a 20x20 box
    const maxDim = Math.max(bbox.w, bbox.h);
    const scale = 20 / maxDim;
    const scaledW = bbox.w * scale;
    const scaledH = bbox.h * scale;

    const scaleCanvas = document.createElement('canvas');
    scaleCanvas.width = 20;
    scaleCanvas.height = 20;
    const scaleCtx = scaleCanvas.getContext('2d');
    
    // Draw centered on the 20x20 scale canvas
    const dx = (20 - scaledW) / 2;
    const dy = (20 - scaledH) / 2;
    scaleCtx.drawImage(cropCanvas, dx, dy, scaledW, scaledH);

    // Extract the scaled 20x20 pixels
    const scaledImgData = scaleCtx.getImageData(0, 0, 20, 20);
    const data = scaledImgData.data;

    // 3. Place in 28x28 canvas and center by Center of Mass (Centroid)
    // First construct a 2D array of intensity values
    const grid20 = new Float32Array(20 * 20);
    let totalWeight = 0;
    let sumX = 0;
    let sumY = 0;

    for (let i = 0; i < 400; i++) {
        // Convert RGBA to single channel grayscale
        // In canvas draw, we write white digits on black background
        // Grayscale = (R + G + B) / 3
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        const val = (r + g + b) / 3;
        grid20[i] = val;

        if (val > 10) { // Threshold background noise
            totalWeight += val;
            sumX += (i % 20) * val;
            sumY += Math.floor(i / 20) * val;
        }
    }

    // Centroid of the digit in the 20x20 box
    let centroidX = 10;
    let centroidY = 10;
    if (totalWeight > 0) {
        centroidX = sumX / totalWeight;
        centroidY = sumY / totalWeight;
    }

    // Now place it into the 28x28 grid
    const grid28 = new Float32Array(28 * 28); // Filled with 0 (black background)
    
    // We want the centroid to map to (14, 14) of the 28x28 grid
    // Offset translation:
    const offsetX = Math.round(14 - centroidX);
    const offsetY = Math.round(14 - centroidY);

    for (let y = 0; y < 20; y++) {
        for (let x = 0; x < 20; x++) {
            const val = grid20[y * 20 + x];
            const targetX = x + offsetX;
            const targetY = y + offsetY;

            // Boundary check
            if (targetX >= 0 && targetX < 28 && targetY >= 0 && targetY < 28) {
                // Normalize value to 0.0 - 1.0 (MNIST format)
                grid28[targetY * 28 + targetX] = val / 255.0;
            }
        }
    }

    return grid28;
}

/**
 * Runs inference on the preprocessed 1D array of 784 pixels.
 * 
 * @param {Float32Array} pixels 784 grayscale values normalized
 * @returns {Promise<Object>} Output containing prediction, scores, confidence, and latency
 */
async function predictDigit(pixels) {
    if (!isModelLoaded) {
        return { prediction: -1, confidence: 0, scores: new Array(10).fill(0), latency: 0 };
    }

    const tStart = performance.now();
    
    // Run prediction wrapped in tf.tidy to avoid tensor leaks
    const results = tf.tidy(() => {
        // Reshape 784 array to 2D tensor [1, 784] as expected by the model
        const inputTensor = tf.tensor2d(pixels, [1, 784]);
        
        // Predict
        const prediction = model.predict(inputTensor);
        
        // Find predicted class index and scores
        const winningClassTensor = prediction.argMax(1);
        const winningClass = winningClassTensor.dataSync()[0];
        const scores = prediction.dataSync(); // 10 classes
        
        return {
            prediction: winningClass,
            confidence: scores[winningClass],
            scores: Array.from(scores)
        };
    });

    const tEnd = performance.now();
    results.latency = Math.round(tEnd - tStart);
    
    return results;
}

/**
 * Computes Saliency Map (XAI Explainability) for the input tensor.
 * Gradients of winning class score with respect to input image pixels.
 * 
 * @param {Float32Array} pixels 784 grayscale values normalized
 * @param {number} winningClass Index of predicted digit
 * @returns {Float32Array} Saliency values normalized to 0-1 for rendering
 */
function getSaliencyGradients(pixels, winningClass) {
    if (!isModelLoaded) return new Float32Array(784);

    return tf.tidy(() => {
        const inputTensor = tf.tensor2d(pixels, [1, 784]);
        
        // Define a gradient function of the model score for the winning class
        const gradFn = tf.grad(x => {
            const pred = model.predict(x);
            return tf.slice(pred, [0, winningClass], [1, 1]).asScalar();
        });

        // Calculate gradients relative to input
        const grads = gradFn(inputTensor);
        
        // Saliency is the absolute value of gradients
        const absGrads = grads.abs();
        
        // Normalize between 0 and 1
        const maxVal = absGrads.max();
        const normalized = absGrads.div(maxVal.add(1e-5)); // Avoid div by zero
        
        return normalized.dataSync();
    });
}

/**
 * Online retraining of the model inside the browser using IndexedDB/memory.
 * Trains the model on user corrected drawings.
 * 
 * @param {Array} images Array of Float32Array arrays (784 length)
 * @param {Array} labels Array of integer labels (0-9)
 * @param {number} epochs Number of epochs to train
 * @param {number} learningRate Learning rate for optimizer
 * @param {number} batchSize Batch size for SGD
 * @param {Function} onEpochCallback Callback fired on each epoch end
 * @returns {Promise<boolean>} Success status
 */
async function fineTuneModel(images, labels, epochs, learningRate, batchSize, onEpochCallback) {
    if (!isModelLoaded || images.length === 0) return false;

    // Convert inputs to Tensors
    // Flatten the array of Float32Arrays into a single flat Float32Array for tf.tensor2d
    const flatData = new Float32Array(images.length * 784);
    images.forEach((img, i) => {
        flatData.set(img, i * 784);
    });
    const xs = tf.tensor2d(flatData, [images.length, 784]);
    // One-hot encode labels
    const ys = tf.oneHot(tf.tensor1d(labels, 'int32'), 10);

    // Compile model with custom settings
    model.compile({
        optimizer: tf.train.sgd(learningRate),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
    });

    try {
        await model.fit(xs, ys, {
            batchSize: batchSize,
            epochs: epochs,
            shuffle: true,
            callbacks: {
                onEpochEnd: (epoch, logs) => {
                    onEpochCallback(epoch + 1, logs.loss, logs.acc || logs.accuracy || 0);
                }
            }
        });
        
        // Recompile with standard learning rate for normal operation
        compileLoadedModel(0.01);
        
        xs.dispose();
        ys.dispose();
        return true;
    } catch (err) {
        console.error("Error in browser retraining: ", err);
        xs.dispose();
        ys.dispose();
        return false;
    }
}

// Expose model downloading capabilities from the browser
async function downloadCurrentModel() {
    if (!isModelLoaded || !model) {
        alert("Model not loaded yet.");
        return;
    }
    try {
        await model.save('downloads://auradigit_model');
        console.log("Model files exported successfully.");
    } catch (e) {
        console.error("Model download error: ", e);
        alert("Failed to download model files: " + e.message);
    }
}

// Initialise the model on file load
window.addEventListener('load', () => {
    initModel();
});
