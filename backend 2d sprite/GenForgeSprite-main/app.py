from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_restx import Api
from routes.sprite import sprite_ns
import os

app = Flask(__name__)
CORS(app)

# Setup Swagger/ReDoc API documentation
api = Api(
    app,
    version='1.0',
    title='Sprite Generator API',
    description='Generate game-ready sprite sheets and animations using BRIA FIBO',
    doc='/docs',  # Swagger UI at /docs
    prefix='/api'
)

# Register namespaces
api.add_namespace(sprite_ns, path='/sprite')

# Serve output files
@app.route("/outputs/<path:filename>")
def serve_output(filename):
    return send_from_directory("outputs", filename)

@app.route("/health")
def health():
    return {"status": "ok", "service": "sprite-generator"}

# ReDoc endpoint
@app.route("/redoc")
def redoc():
    return '''
    <!DOCTYPE html>
    <html>
    <head>
        <title>Sprite Generator API - ReDoc</title>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
        <style>body { margin: 0; padding: 0; }</style>
    </head>
    <body>
        <redoc spec-url='/api/swagger.json'></redoc>
        <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
    </body>
    </html>
    '''

if __name__ == "__main__":
    os.makedirs("outputs", exist_ok=True)
    os.makedirs("temp", exist_ok=True)
    print("\n" + "="*50)
    print("Sprite Generator API")
    print("="*50)
    print("Swagger UI: http://localhost:5000/docs")
    print("ReDoc:      http://localhost:5000/redoc")
    print("API Base:   http://localhost:5000/api")
    print("="*50 + "\n")
    app.run(debug=True, port=5000)
