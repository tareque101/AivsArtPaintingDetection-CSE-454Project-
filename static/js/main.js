document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const uploadArea = document.getElementById('uploadArea');
    const imageInput = document.getElementById('imageInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const previewSection = document.getElementById('previewSection');
    const previewImage = document.getElementById('previewImage');
    const detectBtn = document.getElementById('detectBtn');
    const resultSection = document.getElementById('resultSection');
    const resultCard = document.getElementById('resultCard');
    const resultImage = document.getElementById('resultImage');
    const resultText = document.getElementById('resultText');
    const confidenceValue = document.getElementById('confidenceValue');
    const progressFill = document.getElementById('progressFill');
    const loadingSection = document.getElementById('loadingSection');
    const errorSection = document.getElementById('errorSection');
    const errorText = document.getElementById('errorText');
    const resetBtn = document.getElementById('resetBtn');

    // Event Listeners
    uploadBtn.addEventListener('click', () => imageInput.click());
    uploadArea.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', handleFileSelect);
    detectBtn.addEventListener('click', detectArtwork);
    resetBtn.addEventListener('click', resetForm);

    // Drag and Drop
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);

    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.add('dragover');
    }

    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('dragover');
    }

    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            imageInput.files = files;
            handleFileSelect();
        }
    }

    function handleFileSelect() {
        const file = imageInput.files[0];
        
        if (!file) return;
        
        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            showError('Please select a valid image file (JPG, PNG, GIF, BMP, WEBP)');
            return;
        }
        
        // Validate file size (16MB)
        if (file.size > 16 * 1024 * 1024) {
            showError('File size must be less than 16MB');
            return;
        }
        
        // Show preview
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImage.src = e.target.result;
            previewSection.style.display = 'block';
            uploadArea.style.display = 'none';
            resultSection.style.display = 'none';
            errorSection.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }

    async function detectArtwork() {
        const file = imageInput.files[0];
        
        if (!file) {
            showError('Please select an image first');
            return;
        }
        
        // Show loading
        loadingSection.style.display = 'block';
        resultSection.style.display = 'none';
        errorSection.style.display = 'none';
        detectBtn.disabled = true;
        
        // Prepare form data
        const formData = new FormData();
        formData.append('image', file);
        
        try {
            const response = await fetch('/predict', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            // Hide loading
            loadingSection.style.display = 'none';
            detectBtn.disabled = false;
            
            if (response.ok && data.success) {
                // Show results
                resultImage.src = data.image_data;
                resultText.textContent = data.prediction;
                confidenceValue.textContent = data.confidence + '%';
                
                // Animate progress bar
                setTimeout(() => {
                    progressFill.style.width = data.confidence + '%';
                }, 100);
                
                // Style based on detection
                if (data.is_ai) {
                    resultCard.className = 'result-card ai-detected';
                } else {
                    resultCard.className = 'result-card human-detected';
                }
                
                resultSection.style.display = 'block';
            } else {
                showError(data.error || 'An error occurred during prediction');
            }
        } catch (error) {
            loadingSection.style.display = 'none';
            detectBtn.disabled = false;
            showError('Network error: Could not connect to server');
            console.error('Error:', error);
        }
    }

    function showError(message) {
        errorText.textContent = message;
        errorSection.style.display = 'block';
    }

    function resetForm() {
        imageInput.value = '';
        previewSection.style.display = 'none';
        resultSection.style.display = 'none';
        errorSection.style.display = 'none';
        uploadArea.style.display = 'block';
        detectBtn.disabled = false;
    }
});