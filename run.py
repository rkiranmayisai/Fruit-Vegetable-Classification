import os
import sys
import subprocess

def check_dependencies():
    print("Checking dependencies...")
    required = ["fastapi", "uvicorn", "cv2", "numpy", "PIL"]
    missing = []
    
    # Try importing each
    for lib in required:
        try:
            if lib == "cv2":
                import cv2
            elif lib == "PIL":
                import PIL
            else:
                __import__(lib)
        except ImportError:
            missing.append(lib)
            
    if missing:
        print(f"Error: Missing required Python packages: {missing}")
        print("Please install them using: python -m pip install fastapi uvicorn opencv-python numpy pillow")
        sys.exit(1)
    print("All Python dependencies are available.")

def ensure_samples():
    project_root = os.path.dirname(os.path.abspath(__file__))
    samples_dir = os.path.join(project_root, "samples")
    os.makedirs(samples_dir, exist_ok=True)
    
    # List files in samples
    files = os.listdir(samples_dir)
    if not files:
        print("Samples directory is empty. Running generator to create demo sample images...")
        try:
            # We can import and run the generator directly or call it as a script
            sys.path.append(project_root)
            from backend.generate_samples import generate_all_samples
            generate_all_samples(samples_dir)
            print("Successfully generated default sample images.")
        except Exception as e:
            print(f"Warning: Failed to generate sample images: {str(e)}")

if __name__ == "__main__":
    check_dependencies()
    ensure_samples()
    
    print("\n--------------------------------------------------------------")
    print("Starting Fruit & Vegetable Classification Server...")
    print("Navigate to: http://127.0.0.1:8000")
    print("Press Ctrl+C to terminate.")
    print("--------------------------------------------------------------\n")
    
    try:
        import uvicorn
        # Run the server
        uvicorn.run("backend.app:app", host="127.0.0.1", port=8000, reload=True)
    except KeyboardInterrupt:
        print("\nStopping server.")
        sys.exit(0)
