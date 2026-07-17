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
* **Dynamic Contour Segmentation**: Leverages client-side elements to overlay object boundaries, bounding boxes, and pixel-area estimates.
* **Advanced Color Space Masking**: Segments distinct produce colors and tracks multiple objects simultaneously.
* **Defect/Spot Ratio Calculation**: Calculates the percentage of surface blemishes to detect decay or disease.

### 3. 📊 Freshness, Ripeness & Quality Grading
* **Ripeness State Engine**: Classifies produce maturity stage into **Unripe**, **Ripe**, or **Overripe** based on hue averages and surface characteristics.
* **Quality Grade Allocation**: Automatically assigns a commercial grade:
  * **Grade A**: Excellent size, high symmetry, and negligible surface defects.
  * **Grade B**: Standard market quality with minor blemishes or slight asymmetry.
  * **Grade C**: Substantial markings, spots, shape anomalies, or active rot/defects.
* **Circular Freshness Gauge**: Visualizes exact freshness confidence scores from 0% to 100% with color-changing SVG meters.

### 4. 📦 Smart Digital Inventory & QR Ledger
* **One-Click Ledger Logging**: Log graded produce batches with a click to save ID, capture date, freshness metrics, quality grade, and estimated weight.
* **Supply Chain QR Generator**: Generates unique, printable QR codes containing batch UIDs, harvest data, and freshness profiles for inventory tracking and logistics.
* **Data Portability**: Supports search filtering, freshness classification filters, full list clearance, and instant CSV spreadsheet exports.

### 5. ⚠️ Pathogen Diagnostic Alerts
* **Blemish & Decay Identification**: Automatically alerts users if a high spot ratio or surface rotting is detected.
* **Disease & Pathogen Mapping**: Identifies specific crop diseases including Apple Scab, Tomato Blight, Banana Sigatoka, Citrus Canker, and Potato Early Blight.
* **Prevention & Treatment Advice**: Offers prevention suggestions alongside disposal instructions (e.g., composting vs. burning).

### 6. 🌾 Storage Hacks & Harvest Timing Guide
* **Ethylene Management**: Detailed storage advice to prevent gas-producing fruits (like apples and bananas) from accelerating spoilage in ethylene-sensitive crops.
* **AI Harvest Recommendations**: Actionable schedules for logistics (Unripe, Ripe, Overripe stages).

---

## 🛠️ Technology Stack

* **Frontend Interface**:
  * Semantic HTML5 & Responsive CSS3 (Glassmorphism layout, Outfit & Space Grotesk fonts, HSL variable palettes, and fade-in animations)
  * Vanilla ES6+ JavaScript (API integration, canvas rendering, SVG progress gauges)
  * [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) (Speech synthesis greeting engine and speech recognition voice assistant)

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/fruit-vegetable-classification.git
cd fruit-vegetable-classification
```

### 2. Run the Application
Open `index.html` directly in your web browser, or serve it using a lightweight local server:
* **Python**: `python -m http.server 8000`
* **Node.js**: `npx serve`

---

## 📁 Project Structure

```
Fruit & Vegetable Classification/
├── api.js             # API communications & network calls
├── app.js             # View switching, canvas overlay drawing, circular gauges, inventory
├── voice.js           # Speech-to-text recognition handler
├── styles.css         # Modern glassmorphism UI & responsive styling
├── index.html         # Main dashboard, inventory table, and harvest guides
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
