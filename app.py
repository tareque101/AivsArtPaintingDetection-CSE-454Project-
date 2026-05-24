from flask import Flask, render_template, request, jsonify
from werkzeug.utils import secure_filename
import os
import numpy as np
import base64
import traceback
import torch
import torch.nn.functional as F
from torchvision import transforms
from PIL import Image

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)


model = None
device = torch.device('cpu')


class_names = ['AI', 'Human']

model_path = 'modelPainting_cpu.pth'

print("="*50)
print(" LOADING EFFICIENTNET MODEL")
print("="*50)

if os.path.exists(model_path):
    model = torch.load(model_path, map_location=device, weights_only=False)
    model.eval()
    print(f" Model loaded: {type(model).__name__}")
    print(f" Classes: {class_names}")
else:
    print(f" Model not found: {model_path}")

print("="*50 + "\n")


def preprocess_image(image_path):
    
    transform = transforms.Compose([
        transforms.Resize(256, interpolation=transforms.InterpolationMode.BILINEAR, 
                          max_size=None, antialias=True),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], 
                             std=[0.229, 0.224, 0.225])
    ])
    
    image = Image.open(image_path).convert('RGB')
    image_tensor = transform(image).unsqueeze(0)
    return image_tensor.to(device)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/steps')
def steps():
    return render_template('steps.html')

@app.route('/detection')
def detection():
    return render_template('detection.html')

@app.route('/details')
def details():
    return render_template('details.html')


@app.route('/predict', methods=['POST'])
def predict():
    if model is None:
        return jsonify({'error': 'Model not loaded'}), 500
    
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400
    
    file = request.files['image']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    try:
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
     
        image_tensor = preprocess_image(filepath)
        
       
        with torch.no_grad():
            outputs = model(image_tensor)
            probabilities = F.softmax(outputs, dim=1)[0]
            
      
            ai_prob = float(probabilities[0])      
            human_prob = float(probabilities[1])    
            
            print(f"\n📊 Probabilities - AI: {ai_prob:.4f} ({ai_prob*100:.2f}%) | Human: {human_prob:.4f} ({human_prob*100:.2f}%)")
            
            if ai_prob > human_prob:
                result = "AI-Generated Art"
                confidence = ai_prob
            else:
                result = "Human-Created Art"
                confidence = human_prob
        
        print(f"🎯 Result: {result} (Confidence: {confidence:.2%})")
        
       
        with open(filepath, 'rb') as f:
            img_base64 = base64.b64encode(f.read()).decode('utf-8')
        
        os.remove(filepath)
        
        return jsonify({
            'success': True,
            'prediction': result,
            'confidence': round(confidence * 100, 2),
            'image_data': f'data:image/{filename.rsplit(".", 1)[1]};base64,{img_base64}',
            'is_ai': 'AI' in result,
            'debug': {
                'ai_probability': round(ai_prob * 100, 2),
                'human_probability': round(human_prob * 100, 2)
            }
        })
        
    except Exception as e:
        print(f"Error: {traceback.format_exc()}")
        if os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({'error': str(e)}), 500

@app.route('/health')
def health():
    return jsonify({
        'status': 'healthy', 
        'model_loaded': model is not None,
        'classes': class_names
    })

if __name__ == '__main__':
    print(f"Starting server at http://127.0.0.1:5000")
    print(f"Model expects: EfficientNet")
    print(f" Classes: {class_names}")
    app.run(debug=True, host='0.0.0.0', port=5000)