import os
import urllib.request

def download_model():
    model_dir = "model"
    if not os.path.exists(model_dir):
        os.makedirs(model_dir)
        print(f"Created directory: {model_dir}")

    files = {
        "model.json": "https://raw.githubusercontent.com/google/tfjs-mnist-workshop/master/model/model.json",
        "group1-shard1of1": "https://raw.githubusercontent.com/google/tfjs-mnist-workshop/master/model/group1-shard1of1"
    }

    print("Starting download of pre-trained TensorFlow.js MNIST model...")
    for filename, url in files.items():
        filepath = os.path.join(model_dir, filename)
        print(f"Downloading {url} -> {filepath}...")
        try:
            urllib.request.urlretrieve(url, filepath)
            print(f"Successfully downloaded {filename} ({os.path.getsize(filepath)} bytes)")
        except Exception as e:
            print(f"Error downloading {filename}: {e}")
            return False
            
    print("Download complete! All model files are present in the 'model/' directory.")
    return True

if __name__ == "__main__":
    download_model()
