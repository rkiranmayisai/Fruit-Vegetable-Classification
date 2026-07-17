import http.server
import socketserver
import sys
import os

PORT = 8080

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS for development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200, "ok")
        self.end_headers()

def run_server():
    # Make sure we serve from the script's directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    handler = MyHTTPRequestHandler
    # Associate .bin files with octet-stream MIME type if needed
    handler.extensions_map.update({
        '.bin': 'application/octet-stream',
        '.json': 'application/json',
        '': 'application/octet-stream', # default
    })

    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(("", PORT), handler) as httpd:
            print(f"==================================================")
            print(f"  MNIST Advanced Digit Recognition Server Running ")
            print(f"  URL: http://localhost:{PORT}")
            print(f"  Serving files from: {script_dir}")
            print(f"  Press Ctrl+C to stop the server")
            print(f"==================================================")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
    except Exception as e:
        print(f"Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_server()
