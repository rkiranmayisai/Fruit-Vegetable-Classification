from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import base64
import os
import uvicorn
from backend.analyzer import ProduceAnalyzer

app = FastAPI(
    title="Fruit & Vegetable Classification API",
    description="AI-powered classification, freshness, and disease detection backend",
    version="1.0.0"
)

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instantiate the image analyzer
analyzer = ProduceAnalyzer()

class Base64AnalysisRequest(BaseModel):
    image_data: str # Base64 encoded image
    filename: str = None

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "fruit-vegetable-classifier"}

@app.get("/api/samples")
async def get_samples():
    """
    Returns the list of available demo sample files in the samples directory.
    """
    samples_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "samples")
    if not os.path.exists(samples_dir):
        return []
    
    # List files ending with jpg/png/jpeg
    files = [
        f for f in os.listdir(samples_dir) 
        if f.lower().endswith(('.png', '.jpg', '.jpeg'))
    ]
    
    samples_data = []
    # Add descriptive titles mapping to our known samples
    titles = {
        "fresh_apple.jpg": "Fresh Red Apple (Grade A)",
        "spotted_banana.jpg": "Spotted Banana (Grade B - Semi-Fresh/Overripe)",
        "diseased_tomato.jpg": "Tomato with Blight Disease (Grade C)",
        "mixed_produce.jpg": "Mixed Produce Plate (Multi-Object Detection)"
    }
    
    for f in files:
        samples_data.append({
            "filename": f,
            "title": titles.get(f, f.replace("_", " ").title()),
            "url": f"/samples/{f}"
        })
        
    return samples_data

@app.post("/api/analyze")
async def analyze_file(file: UploadFile = File(...)):
    """
    Accepts an uploaded image file, processes it using OpenCV, and returns predictions.
    """
    try:
        contents = await file.read()
        filename = file.filename
        results = analyzer.analyze(image_bytes=contents, filename=filename)
        return {"filename": filename, "objects": results}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to analyze image: {str(e)}")

@app.post("/api/analyze-base64")
async def analyze_base64(payload: Base64AnalysisRequest):
    """
    Accepts a base64 encoded image stream (e.g. from webcam) and returns predictions.
    If image_data is empty and a known filename is provided, falls through to the
    golden demo-sample database lookup in the analyzer.
    """
    try:
        data = payload.image_data or ""
        
        # Strip data URL header if present (e.g., "data:image/jpeg;base64,…")
        if "," in data:
            data = data.split(",")[1]

        if data:
            # Real image bytes from webcam or upload
            image_bytes = base64.b64decode(data)
            results = analyzer.analyze(image_bytes=image_bytes, filename=payload.filename)
        else:
            # Demo-sample shortcut: filename present, no raw bytes needed
            results = analyzer.analyze(filename=payload.filename)

        return {"filename": payload.filename or "webcam_capture.jpg", "objects": results}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to analyze image: {str(e)}")

# Mount folders for static serving
# Mount samples folder so frontend can load them
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
samples_path = os.path.join(project_root, "samples")
frontend_path = os.path.join(project_root, "frontend")

# Create folders if they don't exist
os.makedirs(samples_path, exist_ok=True)
os.makedirs(frontend_path, exist_ok=True)

app.mount("/samples", StaticFiles(directory=samples_path), name="samples")
app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")

if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
