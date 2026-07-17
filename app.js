// AGROSCAN - Core SPA Application Controller

const state = {
    currentView: 'dashboard',
    inputMode: 'upload',
    activeObjects: [],
    selectedObjIdx: 0,
    inventory: [],
    stats: {
        totalScans: 0,
        avgFreshness: 0,
        gradeAPct: 0,
        alerts: 0
    },
    adviceTab: 'action',
    loadedImage: null,
    webcamStream: null
};

/* ── Toast notifications ─────────────────────────────── */
function showToast(type, title, msg, durationMs = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const icons = { success: '✅', warning: '⚠️', error: '❌', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
        <div class="toast-body">
            <div class="toast-title">${title}</div>
            ${msg ? `<div class="toast-msg">${msg}</div>` : ''}
        </div>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 350);
    }, durationMs);
}

/* ── Loading overlay on canvas area ─────────────────── */
function showCanvasLoader(message = 'Analyzing…') {
    const wrapper = document.querySelector('.visualizer-canvas-wrapper');
    if (!wrapper) return;
    let ov = wrapper.querySelector('.analysis-loading-overlay');
    if (!ov) {
        ov = document.createElement('div');
        ov.className = 'analysis-loading-overlay';
        ov.innerHTML = `<div class="spinner-ring"></div><div class="loading-label">${message}</div>`;
        wrapper.appendChild(ov);
    }
    ov.style.display = 'flex';
}

function hideCanvasLoader() {
    const ov = document.querySelector('.analysis-loading-overlay');
    if (ov) ov.style.display = 'none';
}

/* ── Scanning line on canvas ─────────────────────────── */
function showScanLine() {
    const wrapper = document.querySelector('.visualizer-canvas-wrapper');
    if (!wrapper) return;
    let line = wrapper.querySelector('.scan-line-overlay');
    if (!line) {
        line = document.createElement('div');
        line.className = 'scan-line-overlay';
        wrapper.appendChild(line);
    }
    line.style.display = 'block';
    setTimeout(() => { line.style.display = 'none'; }, 2200);
}


// Initialize Application on Window Load
window.addEventListener("DOMContentLoaded", () => {
    initApp();
});

function initApp() {
    // 1. Fetch and render demo samples
    loadDemoSamples();

    // 2. Setup Drag and Drop
    setupDragAndDrop();

    // 3. Setup File Input
    const fileInput = document.getElementById("file-input");
    const dropZone = document.getElementById("drop-zone");
    if (dropZone && fileInput) {
        dropZone.addEventListener("click", () => fileInput.click());
        fileInput.addEventListener("change", (e) => {
            if (e.target.files.length > 0) {
                processImageFile(e.target.files[0]);
            }
        });
    }

    );
    }

    // 5. Setup Canvas Click Listeners (Interactive selection)
    const canvas = document.getElementById("analysis-canvas");
    if (canvas) {
        canvas.addEventListener("click", handleCanvasClick);
    }

    // Mount state on window so VoiceAssistant can query it
    window.App = {
        getActiveObject: () => state.activeObjects[state.selectedObjIdx] || null,
        switchView: switchView,
        triggerAnalysis: () => {
            if (state.inputMode === 'webcam') {
                captureWebcamFrame();
            }
        }
    };
}

// ==========================================
// VIEW ROUTING & INPUT MODES
// ==========================================

function switchView(viewName) {
    state.currentView = viewName;

    // Toggle views active class
    document.querySelectorAll(".content-view").forEach(view => {
        view.classList.remove("active");
    });
    const targetView = document.getElementById(`view-view-${viewName}`) || document.getElementById(`view-${viewName}`);
    if (targetView) targetView.classList.add("active");

    // Toggle sidebar item active class
    document.querySelectorAll(".menu-item").forEach(btn => {
        btn.classList.remove("active");
    });
    const targetTab = document.getElementById(`tab-${viewName}`);
    if (targetTab) targetTab.classList.add("active");

    // Stop webcam if leaving dashboard
    if (viewName !== 'dashboard') {
        stopWebcam();
    }
}

function switchInputMode(mode) {
    state.inputMode = mode;
    
    // Toggle active tab buttons
    document.getElementById("btn-tab-upload").classList.toggle("active", mode === 'upload');
    document.getElementById("btn-tab-webcam").classList.toggle("active", mode === 'webcam');
    
    // Toggle containers
    document.getElementById("input-upload-container").classList.toggle("active", mode === 'upload');
    document.getElementById("input-webcam-container").classList.toggle("active", mode === 'webcam');

    if (mode === 'upload') {
        stopWebcam();
    }
}

// ==========================================
// DEMO SAMPLES LOADING
// ==========================================

async function loadDemoSamples() {
    const container = document.getElementById("samples-list-container");
    if (!container) return;

    try {
        const samples = await API.getSamples();
        container.innerHTML = "";

        if (samples.length === 0) {
            container.innerHTML = "<div class='demo-sample-loading'>No demo samples found. Make sure run.py generated them.</div>";
            return;
        }

        samples.forEach(sample => {
            const card = document.createElement("div");
            card.className = "sample-thumbnail-card";
            card.onclick = () => loadSampleByName(sample.filename);

            const img = document.createElement("img");
            img.src = sample.url;
            img.className = "sample-thumb-img";
            img.alt = sample.title;

            const title = document.createElement("div");
            title.className = "sample-thumb-title";
            title.innerText = sample.title;

            card.appendChild(img);
            card.appendChild(title);
            container.appendChild(card);
        });
    } catch (e) {
        container.innerHTML = "<div class='demo-sample-loading' style='color: var(--accent-red);'>Error loading samples from backend.</div>";
    }
}

async function loadSampleByName(filename) {
    // Show spinner/loading in visualizer status
    setVisualizerStatus("Analyzing...", "blue");
    
    const sampleUrl = API.getSampleImageUrl(filename);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = async () => {
        state.loadedImage = img;
        hideCanvasPlaceholder();
        
        try {
            // Trigger API analysis with filename parameter for golden demo mapping
            const data = await API.analyzeBase64("", filename);
            
            processAnalysisResults(data.objects);
            setVisualizerStatus("Analysis Complete", "green");
            
            
        } catch (e) {
            console.error(e);
            setVisualizerStatus("Analysis Error", "red");
        }
    };
    img.src = sampleUrl;
}

// ==========================================
// DRAG & DROP + UPLOADS
// ==========================================

function setupDragAndDrop() {
    const dropZone = document.getElementById("drop-zone");
    if (!dropZone) return;

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            processImageFile(files[0]);
        }
    });
}

function processImageFile(file) {
    if (!file.type.startsWith('image/')) {
        alert("Please upload an image file (PNG/JPG).");
        return;
    }

    setVisualizerStatus("Analyzing...", "blue");
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = async () => {
            state.loadedImage = img;
            hideCanvasPlaceholder();
            
            try {
                const data = await API.analyzeFile(file);
                processAnalysisResults(data.objects);
                setVisualizerStatus("Analysis Complete", "green");
            } catch (err) {
                console.error(err);
                setVisualizerStatus("Analysis Error", "red");
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// ==========================================
// WEBCAM INTERACTION
// ==========================================

async function toggleWebcam() {
    const video = document.getElementById("webcam-video");
    const toggleBtn = document.getElementById("btn-webcam-toggle");
    const captureBtn = document.getElementById("btn-webcam-capture");
    
    if (state.webcamStream) {
        stopWebcam();
        toggleBtn.innerText = "Start Camera";
        toggleBtn.className = "btn-primary";
        captureBtn.disabled = true;
    } else {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: "environment" } 
            });
            state.webcamStream = stream;
            video.srcObject = stream;
            toggleBtn.innerText = "Stop Camera";
            toggleBtn.className = "btn-danger";
            captureBtn.disabled = false;
        } catch (e) {
            alert("Could not access camera: " + e.message);
        }
    }
}

function stopWebcam() {
    const video = document.getElementById("webcam-video");
    const toggleBtn = document.getElementById("btn-webcam-toggle");
    const captureBtn = document.getElementById("btn-webcam-capture");
    
    if (state.webcamStream) {
        state.webcamStream.getTracks().forEach(track => track.stop());
        state.webcamStream = null;
    }
    if (video) video.srcObject = null;
    if (toggleBtn) {
        toggleBtn.innerText = "Start Camera";
        toggleBtn.className = "btn-primary";
    }
    if (captureBtn) captureBtn.disabled = true;
}

async function captureWebcamFrame() {
    const video = document.getElementById("webcam-video");
    const canvas = document.getElementById("webcam-capture-canvas");
    if (!video || !canvas || !state.webcamStream) return;

    setVisualizerStatus("Analyzing frame...", "blue");
    const ctx = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const base64Data = canvas.toDataURL("image/jpeg", 0.9);
    
    // Set as active visualizer source
    const img = new Image();
    img.onload = async () => {
        state.loadedImage = img;
        hideCanvasPlaceholder();
        
        try {
            const data = await API.analyzeBase64(base64Data);
            processAnalysisResults(data.objects);
            setVisualizerStatus("Webcam Scan Done", "green");
        } catch (e) {
            console.error(e);
            setVisualizerStatus("Webcam Scan Error", "red");
        }
    };
    img.src = base64Data;
}

// ==========================================
// RESULTS PROCESSING & RENDER
// ==========================================

function processAnalysisResults(objects) {
    state.activeObjects = objects;
    state.selectedObjIdx = 0;
    
    // Increment stats counter
    state.stats.totalScans += 1;
    document.getElementById("stats-total-scans").innerText = state.stats.totalScans;
    
    if (objects.length > 0) {
        // Redraw Canvas Overlay
        drawCanvasOverlay();
        
        // Show detail components
        document.getElementById("detected-items-selector-bar").style.display = "flex";
        document.getElementById("analysis-details-container").style.display = "grid";
        document.getElementById("quick-actions-bar").style.display = "flex";
        
        // Build badges row
        buildObjectBadgeRow();
        
        // Update details panel
        updateDetailPanels();
        
        // Recalculate rolling overall metrics
        recalcGlobalStats();
    } else {
        alert("No produce detected. Try adjusting lighting or framing.");
    }
}

function drawCanvasOverlay() {
    const canvas = document.getElementById("analysis-canvas");
    const img = state.loadedImage;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    // Size canvas to fit image resolution
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;

    // Draw base image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Draw bounding box for each object
    state.activeObjects.forEach((obj, idx) => {
        const [ymin, xmin, ymax, xmax] = obj.box;
        const x = xmin * canvas.width;
        const y = ymin * canvas.height;
        const w = (xmax - xmin) * canvas.width;
        const h = (ymax - ymin) * canvas.height;
        
        const isSelected = idx === state.selectedObjIdx;
        
        // Choose color based on freshness rating
        let accentColor = "#00e676"; // Green
        if (obj.freshness === "semi-fresh") accentColor = "#ffd600"; // Yellow
        if (obj.freshness === "rotten") accentColor = "#ff1744"; // Red
        
        // Draw main bounding box outline
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = isSelected ? 6 : 3;
        ctx.setLineDash([]);
        
        // Rounded corners bounding box
        drawRoundedRect(ctx, x, y, w, h, 8);

        // Draw selection pulse/glow if active
        if (isSelected) {
            ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
            ctx.lineWidth = 2;
            drawRoundedRect(ctx, x - 4, y - 4, w + 8, h + 8, 12);
            
            // Draw corners accent bars
            ctx.strokeStyle = accentColor;
            ctx.lineWidth = 8;
            ctx.beginPath();
            // Top Left corner
            ctx.moveTo(x - 2, y + 20); ctx.lineTo(x - 2, y - 2); ctx.lineTo(x + 20, y - 2);
            // Top Right
            ctx.moveTo(x + w + 2, y + 20); ctx.lineTo(x + w + 2, y - 2); ctx.lineTo(x + w - 20, y - 2);
            // Bottom Left
            ctx.moveTo(x - 2, y + h - 20); ctx.lineTo(x - 2, y + h + 2); ctx.lineTo(x + 20, y + h + 2);
            // Bottom Right
            ctx.moveTo(x + w + 2, y + h - 20); ctx.lineTo(x + w + 2, y + h + 2); ctx.lineTo(x + w - 20, y + h + 2);
            ctx.stroke();
        }

        // Draw label pill above box
        ctx.fillStyle = accentColor;
        const labelStr = `${obj.label} (${Math.round(obj.confidence*100)}%)`;
        ctx.font = `bold ${isSelected ? 16 : 12}px sans-serif`;
        const textWidth = ctx.measureText(labelStr).width;
        
        ctx.fillRect(x, y - (isSelected ? 26 : 20), textWidth + 12, isSelected ? 26 : 20);
        
        ctx.fillStyle = "#000";
        ctx.fillText(labelStr, x + 6, y - (isSelected ? 8 : 5));
    });
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.stroke();
}

function handleCanvasClick(e) {
    if (state.activeObjects.length === 0) return;
    
    const canvas = document.getElementById("analysis-canvas");
    const rect = canvas.getBoundingClientRect();
    
    // Client click coordinates relative to canvas layout
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Scale to original canvas resolution
    const canvasX = (clickX / rect.width) * canvas.width;
    const canvasY = (clickY / rect.height) * canvas.height;
    
    // Find if click falls in any object bounding box
    let clickedIdx = -1;
    let minArea = Infinity; // If nested boxes, choose smallest box (more specific)
    
    state.activeObjects.forEach((obj, idx) => {
        const [ymin, xmin, ymax, xmax] = obj.box;
        const x = xmin * canvas.width;
        const y = ymin * canvas.height;
        const w = (xmax - xmin) * canvas.width;
        const h = (ymax - ymin) * canvas.height;
        
        if (canvasX >= x && canvasX <= x+w && canvasY >= y && canvasY <= y+h) {
            const area = w * h;
            if (area < minArea) {
                minArea = area;
                clickedIdx = idx;
            }
        }
    });
    
    if (clickedIdx !== -1 && clickedIdx !== state.selectedObjIdx) {
        selectObject(clickedIdx);
    }
}

function buildObjectBadgeRow() {
    const container = document.getElementById("detected-badge-container");
    if (!container) return;
    container.innerHTML = "";

    state.activeObjects.forEach((obj, idx) => {
        const badge = document.createElement("div");
        badge.className = `obj-select-badge ${idx === state.selectedObjIdx ? 'active' : ''}`;
        badge.onclick = () => selectObject(idx);
        
        // Accent dot indicator
        const dot = document.createElement("span");
        dot.style.display = "inline-block";
        dot.style.width = "8px";
        dot.style.height = "8px";
        dot.style.borderRadius = "50%";
        
        let color = "var(--accent-green)";
        if (obj.freshness === "semi-fresh") color = "var(--accent-yellow)";
        if (obj.freshness === "rotten") color = "var(--accent-red)";
        dot.style.backgroundColor = color;
        
        const label = document.createElement("span");
        label.innerText = obj.label;
        
        badge.appendChild(dot);
        badge.appendChild(label);
        container.appendChild(badge);
    });
}

function selectObject(idx) {
    state.selectedObjIdx = idx;
    drawCanvasOverlay();
    buildObjectBadgeRow();
    updateDetailPanels();
}

function updateDetailPanels() {
    const obj = state.activeObjects[state.selectedObjIdx];
    if (!obj) return;

    // 1. Freshness gauge updates
    const freshnessPct = Math.round(obj.freshness_confidence * 100);
    const gaugePath = document.getElementById("freshness-gauge-path");
    const gaugeText = document.getElementById("freshness-gauge-text");
    
    if (gaugePath && gaugeText) {
        // Set gauge color class
        gaugePath.className.baseVal = `circle ${obj.freshness === "fresh" ? 'green' : (obj.freshness === "semi-fresh" ? 'yellow' : 'red')}`;
        // Set stroke percentage
        gaugePath.setAttribute("stroke-dasharray", `${freshnessPct}, 100`);
        gaugeText.textContent = `${freshnessPct}%`;
    }

    // 2. Ripeness & Grade Pills
    const ripenessPill = document.getElementById("ripeness-state-pill");
    const gradePill = document.getElementById("grade-state-pill");
    if (ripenessPill) {
        ripenessPill.innerText = obj.ripeness;
        ripenessPill.className = `ripeness-value-pill ${obj.ripeness}`;
    }
    if (gradePill) {
        gradePill.innerText = obj.grade;
    }
    
    // Reason
    const gradeReason = document.getElementById("grade-reason-text");
    if (gradeReason) gradeReason.innerText = obj.grade_reason;

    // 3. Nutrition panel updates
    document.getElementById("produce-scientific-name").innerText = obj.scientific_name || "";
    document.getElementById("weight-estimate-txt").innerText = obj.weight_est || "150g";
    
    // Nutrition bars filling
    const nutrition = obj.nutrition;
    
    document.getElementById("nutri-val-calories").innerText = nutrition.calories;
    document.getElementById("nutri-val-carbs").innerText = nutrition.carbs;
    document.getElementById("nutri-val-fiber").innerText = nutrition.fiber;
    document.getElementById("nutri-val-vitc").innerText = nutrition.vitamin_c;
    document.getElementById("nutri-val-potassium").innerText = nutrition.potassium || "120mg";

    // Progress bar width scaling
    const parseVal = (str) => parseInt(str) || 0;
    
    document.getElementById("nutri-bar-calories").style.width = `${Math.min(100, parseVal(nutrition.calories) * 0.8)}%`;
    document.getElementById("nutri-bar-carbs").style.width = `${Math.min(100, parseVal(nutrition.carbs) * 4)}%`;
    document.getElementById("nutri-bar-fiber").style.width = `${Math.min(100, parseVal(nutrition.fiber) * 15)}%`;
    document.getElementById("nutri-bar-vitc").style.width = `${Math.min(100, parseVal(nutrition.vitamin_c))}%`;
    document.getElementById("nutri-bar-potassium").style.width = `${Math.min(100, parseVal(nutrition.potassium) * 0.25)}%`;

    // 4. Disease Warning Card visibility
    const diseaseCard = document.getElementById("disease-warning-card");
    if (diseaseCard) {
        if (obj.disease) {
            diseaseCard.style.display = "block";
            document.getElementById("disease-name").innerText = obj.disease.name;
            document.getElementById("disease-pathogen").innerText = obj.disease.pathogen;
            document.getElementById("disease-severity").innerText = `${obj.disease.severity} Severity`;
            document.getElementById("disease-description").innerText = obj.disease.description;
            document.getElementById("disease-prevention").innerText = obj.disease.prevention;
        } else {
            diseaseCard.style.display = "none";
        }
    }

    // 5. Storage Advice Panel updates
    document.getElementById("storage-advice-text").innerText = obj.storage_tips;
    document.getElementById("recipe-advice-text").innerText = obj.recipe_advice;
    document.getElementById("action-advice-text").innerText = obj.action_advice;

    // Update Advice badge classes
    const actionBadge = document.getElementById("action-indicator-badge");
    if (actionBadge) {
        actionBadge.innerText = obj.action_advice.split('.')[0];
        actionBadge.className = `advice-pill-indicator ${obj.freshness === "fresh" ? 'green' : (obj.freshness === "semi-fresh" ? 'orange' : 'red')}`;
    }
}

function switchAdviceTab(tabKey) {
    state.adviceTab = tabKey;
    
    // Toggles button classes
    document.getElementById("btn-adv-action").classList.toggle("active", tabKey === 'action');
    document.getElementById("btn-adv-recipe").classList.toggle("active", tabKey === 'recipe');
    document.getElementById("btn-adv-storage").classList.toggle("active", tabKey === 'storage');
    
    // Toggles panes
    document.getElementById("pane-adv-action").classList.toggle("active", tabKey === 'action');
    document.getElementById("pane-adv-recipe").classList.toggle("active", tabKey === 'recipe');
    document.getElementById("pane-adv-storage").classList.toggle("active", tabKey === 'storage');
}

// Helpers
function setVisualizerStatus(txt, colorClass) {
    const badge = document.getElementById("visualizer-status");
    if (!badge) return;
    badge.innerText = txt;
    badge.className = `badge ${colorClass}`;
}

function hideCanvasPlaceholder() {
    const placeholder = document.getElementById("canvas-placeholder");
    if (placeholder) placeholder.style.display = "none";
}

// ==========================================
// ROLLING STATISTICS CALCULATIONS
// ==========================================

function recalcGlobalStats() {
    if (state.inventory.length === 0) {
        document.getElementById("stats-avg-freshness").innerText = "0%";
        document.getElementById("stats-grade-a").innerText = "0%";
        document.getElementById("stats-alerts").innerText = "0";
        return;
    }

    let totalFreshPct = 0;
    let gradeACount = 0;
    let warningAlerts = 0;

    state.inventory.forEach(item => {
        totalFreshPct += item.freshness_val;
        if (item.grade === "Grade A") gradeACount += 1;
        if (item.freshness === "rotten" || item.has_disease) warningAlerts += 1;
    });

    const avgFresh = Math.round(totalFreshPct / state.inventory.length);
    const gradeAPct = Math.round((gradeACount / state.inventory.length) * 100);

    document.getElementById("stats-avg-freshness").innerText = `${avgFresh}%`;
    document.getElementById("stats-grade-a").innerText = `${gradeAPct}%`;
    document.getElementById("stats-alerts").innerText = warningAlerts;

    // Glowing animations when warning updates
    const alertCard = document.getElementById("stats-alerts").closest(".stat-card");
    if (warningAlerts > 0) {
        alertCard.style.borderColor = "var(--accent-red)";
        alertCard.style.boxShadow = "0 0 15px rgba(255, 23, 68, 0.15)";
    } else {
        alertCard.style.borderColor = "var(--border-color)";
        alertCard.style.boxShadow = "var(--shadow-main)";
    }
}

// ==========================================
// SMART INVENTORY MODULE & CSV EXPORT
// ==========================================

function addSelectedItemToInventory() {
    const obj = state.activeObjects[state.selectedObjIdx];
    if (!obj) return;

    // Create unique batch identifier
    const date = new Date();
    const formattedDate = date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const shortUid = "B-" + Math.random().toString(36).substring(2, 7).toUpperCase();

    // Map to inventory model
    const item = {
        uid: shortUid,
        date: formattedDate,
        name: obj.label,
        freshness: obj.freshness,
        freshness_val: Math.round(obj.freshness_confidence * 100),
        grade: obj.grade,
        weight: obj.weight_est,
        shelf_life: obj.shelf_life_days,
        has_disease: obj.disease ? true : false,
        disease_name: obj.disease ? obj.disease.name : null,
        scientific: obj.scientific_name
    };

    state.inventory.push(item);

    // Redraw table
    renderInventoryTable();

    // Update global header stats
    recalcGlobalStats();

    // Auto visual confirmation
    alert(`Logged ${obj.label} (${shortUid}) to Smart Inventory.`);
}

function renderInventoryTable() {
    const tbody = document.getElementById("inventory-tbody");
    if (!tbody) return;

    if (state.inventory.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="empty-table-msg">Inventory is empty. Scan produce and click "Log to Smart Inventory" to track stock.</td></tr>`;
        return;
    }

    tbody.innerHTML = "";
    state.inventory.forEach((item, idx) => {
        const row = document.createElement("tr");

        let freshBadgeColor = "good";
        if (item.freshness === "semi-fresh") freshBadgeColor = "warning";
        if (item.freshness === "rotten") freshBadgeColor = "danger";

        let daysRemainingTag = "good";
        if (item.shelf_life <= 3) daysRemainingTag = "warning";
        if (item.shelf_life === 0) daysRemainingTag = "danger";

        row.innerHTML = `
            <td><code>${item.uid}</code></td>
            <td>${item.date}</td>
            <td><strong>${item.name}</strong> ${item.has_disease ? `<span class="badge red" style="font-size: 9px; padding: 2px 4px;">${item.disease_name}</span>` : ""}</td>
            <td><span class="shelf-life-tag ${freshBadgeColor}">${item.freshness} (${item.freshness_val}%)</span></td>
            <td><span class="badge blue">${item.grade}</span></td>
            <td>${item.weight}</td>
            <td><span class="shelf-life-tag ${daysRemainingTag}">${item.shelf_life} days</span></td>
            <td>
                <button class="btn-accent" style="padding: 4px 8px; font-size: 11px;" onclick="viewItemQRCode(${idx})">🔍 QR Label</button>
                <button class="btn-danger" style="padding: 4px 8px; font-size: 11px; margin-left: 5px;" onclick="deleteInventoryItem(${idx})">✕</button>
            </td>
        `;

        tbody.appendChild(row);
    });
}

function deleteInventoryItem(idx) {
    state.inventory.splice(idx, 1);
    renderInventoryTable();
    recalcGlobalStats();
    closeQRDrawer();
}

function clearInventory() {
    if (confirm("Are you sure you want to clear all inventory logs?")) {
        state.inventory = [];
        renderInventoryTable();
        recalcGlobalStats();
        closeQRDrawer();
    }
}

function filterInventoryTable() {
    const query = document.getElementById("inventory-search").value.toLowerCase();
    const freshnessFilter = document.getElementById("inventory-filter-freshness").value;

    const rows = document.querySelectorAll("#inventory-tbody tr");
    if (rows.length === 1 && rows[0].classList.contains("empty-table-msg")) return;

    rows.forEach((row, idx) => {
        const item = state.inventory[idx];
        if (!item) return;

        const matchesQuery = item.name.toLowerCase().includes(query) || item.uid.toLowerCase().includes(query);
        const matchesFreshness = freshnessFilter === "" || item.freshness === freshnessFilter;

        if (matchesQuery && matchesFreshness) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    });
}

function exportInventoryToCSV() {
    if (state.inventory.length === 0) {
        alert("Inventory is empty. Add items to log first.");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Batch ID,Date Logged,Produce Name,Scientific Name,Freshness State,Freshness Score (%),Quality Grade,Weight (g),Shelf Life (Days),Has Disease,Disease Name\r\n";

    state.inventory.forEach(item => {
        const row = [
            item.uid,
            item.date,
            item.name,
            item.scientific,
            item.freshness,
            item.freshness_val,
            item.grade,
            item.weight.replace("g", ""),
            item.shelf_life,
            item.has_disease ? "Yes" : "No",
            item.disease_name || "None"
        ].map(val => `"${val}"`).join(",");
        
        csvContent += row + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `agroscan_inventory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ==========================================
// DETERMINISTIC QR GENERATOR (ZERO DEPENDENCY)
// ==========================================

function viewItemQRCode(idx) {
    const item = state.inventory[idx];
    if (!item) return;

    // Show drawer
    const drawer = document.getElementById("qr-drawer");
    drawer.style.display = "flex";

    // Set fields
    document.getElementById("qr-item-name").innerText = item.name;
    document.getElementById("qr-uid").innerText = item.uid;
    document.getElementById("qr-date").innerText = item.date.split(" ")[0];
    document.getElementById("qr-freshness").innerText = `${item.freshness} (${item.freshness_val}%)`;
    document.getElementById("qr-grade").innerText = item.grade;

    // Draw QR on canvas
    generateDeterministicQR(item.uid, item.name, item.grade, item.freshness_val);
}

function closeQRDrawer() {
    document.getElementById("qr-drawer").style.display = "none";
}

function generateDeterministicQR(uid, name, grade, freshnessVal) {
    const canvas = document.getElementById("qr-canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const size = canvas.width;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);

    // Number of modules (25x25 grid)
    const modules = 25;
    const modSize = Math.floor((size - 20) / modules);
    const offset = Math.floor((size - (modules * modSize)) / 2);

    ctx.fillStyle = "#000000";

    // 1. Helper to draw finder patterns (7x7 nested squares)
    const drawFinderPattern = (row, col) => {
        // Outer 7x7 black
        ctx.fillRect(offset + col * modSize, offset + row * modSize, 7 * modSize, 7 * modSize);
        // Inner 5x5 white
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(offset + (col + 1) * modSize, offset + (row + 1) * modSize, 5 * modSize, 5 * modSize);
        // Center 3x3 black
        ctx.fillStyle = "#000000";
        ctx.fillRect(offset + (col + 2) * modSize, offset + (row + 2) * modSize, 3 * modSize, 3 * modSize);
    };

    // Draw three finder patterns
    drawFinderPattern(0, 0);                 // Top-Left
    drawFinderPattern(0, modules - 7);       // Top-Right
    drawFinderPattern(modules - 7, 0);       // Bottom-Left

    // Draw timing patterns (dashed lines connecting finders)
    for (let i = 8; i < modules - 8; i++) {
        if (i % 2 === 0) {
            ctx.fillRect(offset + i * modSize, offset + 6 * modSize, modSize, modSize); // Horizontal timing
            ctx.fillRect(offset + 6 * modSize, offset + i * modSize, modSize, modSize); // Vertical timing
        }
    }

    // Small alignment block at bottom right
    ctx.fillStyle = "#000000";
    ctx.fillRect(offset + (modules - 9) * modSize, offset + (modules - 9) * modSize, 5 * modSize, 5 * modSize);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(offset + (modules - 8) * modSize, offset + (modules - 8) * modSize, 3 * modSize, 3 * modSize);
    ctx.fillStyle = "#000000";
    ctx.fillRect(offset + (modules - 7) * modSize, offset + (modules - 7) * modSize, modSize, modSize);

    // 2. Generate pseudo-random matrix cells based on hash of details
    // Ensure it looks like a real QR code but is deterministic per batch
    const seedText = `${uid}-${name}-${grade}-${freshnessVal}`;
    let hash = 0;
    for (let i = 0; i < seedText.length; i++) {
        hash = seedText.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Fill matrix
    for (let r = 0; r < modules; r++) {
        for (let c = 0; c < modules; c++) {
            // Skip finder patterns
            if (r < 8 && c < 8) continue;
            if (r < 8 && c >= modules - 8) continue;
            if (r >= modules - 8 && c < 8) continue;
            // Skip timing lines
            if (r === 6 || c === 6) continue;
            // Skip alignment block
            if (r >= modules - 9 && r <= modules - 5 && c >= modules - 9 && c <= modules - 5) continue;

            // Pseudo-random bit based on position and hash
            const cellHash = Math.abs(Math.sin((r * 12.9898 + c * 78.233) * 43758.5453 + hash));
            if (cellHash > 0.5) {
                ctx.fillRect(offset + c * modSize, offset + r * modSize, modSize, modSize);
            }
        }
    }
}

function printQRCode() {
    const canvas = document.getElementById("qr-canvas");
    if (!canvas) return;

    const win = window.open("", "Print Label", "width=400,height=400");
    const date = document.getElementById("qr-date").innerText;
    const uid = document.getElementById("qr-uid").innerText;
    const name = document.getElementById("qr-item-name").innerText;
    const grade = document.getElementById("qr-grade").innerText;
    const freshness = document.getElementById("qr-freshness").innerText;

    win.document.write(`
        <html>
            <head>
                <title>Print QR Label</title>
                <style>
                    body { font-family: sans-serif; text-align: center; padding: 20px; }
                    .label-container { border: 2px solid #000; padding: 20px; display: inline-block; border-radius: 8px; }
                    h2 { margin: 0 0 10px 0; }
                    img { width: 160px; height: 160px; }
                    .details { font-size: 12px; margin-top: 10px; text-align: left; }
                </style>
            </head>
            <body>
                <div class="label-container">
                    <h2>AGROSCAN LOGISTICS</h2>
                    <img src="${canvas.toDataURL()}" />
                    <div class="details">
                        <div><strong>UID:</strong> ${uid}</div>
                        <div><strong>Produce:</strong> ${name}</div>
                        <div><strong>Quality:</strong> ${grade}</div>
                        <div><strong>Freshness:</strong> ${freshness}</div>
                        <div><strong>Logged Date:</strong> ${date}</div>
                        <div><strong>Origin:</strong> Smart Farms Ltd.</div>
                    </div>
                </div>
                <script>
                    window.onload = function() { window.print(); window.close(); }
                </script>
            </body>
        </html>
    `);
    win.document.close();
}
