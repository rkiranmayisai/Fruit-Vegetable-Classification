# 🌿 AgroScan – AI Produce Classifier & Freshness Detector

Welcome to **AgroScan**! A premium, interactive, and responsive web application designed for farmers, distributors, and retailers to classify fresh produce, evaluate ripeness and quality grades, identify pathogen diseases, and manage supply chain inventory.

This project features a fully integrated **AI Farming Assistant** that greets you with a personalized voice greeting (tailored for Kiran), a dynamic **Computer Vision Spatial Overlay** for multi-object segmentation, an automated **Freshness & Ripeness Status Gauge**, a **Digital Supply Chain QR Code Generator**, and actionable culinary and storage insights to minimize agricultural waste.

---

## ✨ Features

### 1. 🎙️ Voice Greeting & AI Farming Assistant
* **Personalized Welcome**: Welcomes user "Kiran" on startup using the Web Speech API with a detailed overview of AgroScan's grading features.
* **Hands-Free Voice Console**: Supports voice queries such as *"What is the freshness of this banana?"* or *"Show nutrition for apple"* for busy warehouse or field operations.
* **Interactive Assist Console**: Features a live logger showing active voice recognition states and processing feedback.

### 2. 🔬 Real-Time Computer Vision & Image Segmentation
* **Dynamic Contour Segmentation**: Leverages OpenCV to extract high-accuracy object contours, bounding boxes, and pixel-area estimates client-side.
* **Advanced Color Space Masking**: Utilizes multi-channel HSV thresholding to segment distinct produce colors (red, yellow, orange, green, brown) and track multiple objects simultaneously.
* **Defect/Spot Ratio Calculation**: Calculates the percentage of brown/dark surface spots and blemishes relative to the total fruit surface area to detect decay or disease.

### 3. 📊 Freshness, Ripeness & Quality Grading
* **Ripeness State Engine**: Classifies produce maturity stage into **Unripe**, **Ripe**, or **Overripe** based on hue averages and surface characteristics.
* **Quality Grade Allocation**: Automatically assigns a commercial grade:
  * **Grade A**: Excellent size, high symmetry, and negligible surface defects (<1.5% spot ratio).
  * **Grade B**: Standard market quality with minor blemishes or slight asymmetry (1.5% - 6% spot ratio).
  * **Grade C**: Substantial markings, spots, shape anomalies, or active rot/defects (>6% spot ratio).
* **Circular Freshness Gauge**: Visualizes exact freshness confidence scores from 0% to 100% with color-changing SVG meters.

### 4. 📦 Smart Digital Inventory & QR Ledger
* **One-Click Ledger Logging**: Log graded produce batches with a click to save ID, capture date, freshness metrics, quality grade, and estimated weight.
* **Supply Chain QR Generator**: Generates unique, printable QR codes containing batch UIDs, harvest data, and freshness profiles for inventory tracking and logistics.
* **Data Portability**: Supports search filtering, freshness classification filters, full list clearance, and instant CSV spreadsheet exports.

### 5. ⚠️ Pathogen Diagnostic Alerts
* **Blemish & Decay Identification**: Automatically alerts users if a high spot ratio or surface rotting is detected.
* **Disease & Pathogen Mapping**: Identifies specific crop diseases including:
  * **Apple Scab** (*Venturia inaequalis* fungus)
  * **Tomato Blight** (*Alternaria solani* blight)
  * **Banana Sigatoka** (*Pseudocercospora fijiensis* fungus)
  * **Citrus Canker** (*Xanthomonas citri* bacteria)
  * **Potato Early Blight** (*Alternaria solani* fungus)
* **Prevention & Treatment Advice**: Offers chemical and organic prevention suggestions alongside disposal instructions (e.g., composting vs. burning).

### 6. 🌾 Storage Hacks & Harvest Timing Guide
* **Ethylene Management**: Detailed storage advice to prevent gas-producing fruits (like apples and bananas) from accelerating spoilage in ethylene-sensitive crops.
* **AI Harvest Recommendations**: Actionable schedules for logistics:
  * **Stage 1 (Unripe)**: Delay harvest; ideal for long-distance export.
  * **Stage 2 (Ripe)**: Harvest immediately; retail-ready.
  * **Stage 3 (Overripe)**: Bypass retail; route directly to food processing.

---

## 🛠️ Technology Stack

* **Frontend Interface**:
  * Semantic HTML5 & Responsive CSS3 (Glassmorphism layout, Outfit & Space Grotesk fonts, HSL variable palettes, and fade-in animations)
  * Vanilla ES6+ JavaScript (API integration, canvas rendering, SVG progress gauges, and embedded Base64 image loaders)
  * [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) (Speech synthesis greeting engine and speech recognition voice assistant)

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/fruit-vegetable-classification.git
cd fruit-vegetable-classification
```

### 2. Run the Application
Open `index.html` directly in your web browser, or serve it using a lightweight local web server:
* **Python**: `python -m http.server 8000`
* **Node.js**: `npx serve`

---

## 📁 Project Structure

```
Fruit & Vegetable Classification/
├── samples/           # Input samples (fresh_apple.jpg, spotted_banana.jpg, etc.)
├── api.js             # API communication logic & embedded Base64 fallback datasets
├── app.js             # Main controller (view switching, canvas overlay drawing, gauges, inventory ledger)
├── voice.js           # Interactive Speech-to-text voice assistant module
├── styles.css         # Modern glassmorphic styling and UI responsiveness rules
├── index.html         # Main app dashboard layout, ledger templates, and storage guides
└── README.md          # Project documentation
```

---

## 🤝 Contributing
Contributions to improve detection parameters, add new fruit/vegetable classes, or localize to more regional languages are welcome!
1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📝 License
Distributed under the MIT License. See `LICENSE` for more information.
