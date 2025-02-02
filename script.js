// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// DOM Elements
const fileInput = document.getElementById('pdf-file');
const outputText = document.getElementById('output-text');
const copyButton = document.getElementById('copy-button');
const downloadButton = document.getElementById('download-button');
const progressBar = document.getElementById('progress-bar');
const progress = document.getElementById('progress');

// Add drag and drop functionality
const uploadLabel = document.querySelector('.upload-label');

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    uploadLabel.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    uploadLabel.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    uploadLabel.addEventListener(eventName, unhighlight, false);
});

function highlight(e) {
    uploadLabel.classList.add('highlight');
}

function unhighlight(e) {
    uploadLabel.classList.remove('highlight');
}

uploadLabel.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;

    if (files.length > 0 && files[0].type === 'application/pdf') {
        fileInput.files = files;
        handleFileSelect(files[0]);
    }
}

// Handle file selection
fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        handleFileSelect(file);
    }
});

async function handleFileSelect(file) {
    if (file.type !== 'application/pdf') {
        alert('Please select a PDF file.');
        return;
    }

    outputText.value = 'Converting PDF to text...';
    progressBar.style.display = 'block';
    progress.style.width = '0%';

    try {
        const text = await convertPdfToText(file);
        outputText.value = text;
        progress.style.width = '100%';
        setTimeout(() => {
            progressBar.style.display = 'none';
        }, 1000);
    } catch (error) {
        outputText.value = 'Error converting PDF to text. Please try again.';
        console.error('Error:', error);
        progressBar.style.display = 'none';
    }
}

async function convertPdfToText(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;
    let text = '';

    for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map(item => item.str).join(' ');
        text += pageText + '\n\n';
        
        // Update progress bar
        progress.style.width = `${(i / totalPages) * 100}%`;
    }

    return text.trim();
}

// Copy text functionality
copyButton.addEventListener('click', () => {
    if (!outputText.value) return;
    
    navigator.clipboard.writeText(outputText.value)
        .then(() => {
            const originalText = copyButton.textContent;
            copyButton.textContent = 'Copied!';
            setTimeout(() => {
                copyButton.textContent = originalText;
            }, 2000);
        })
        .catch(err => {
            console.error('Failed to copy text:', err);
            alert('Failed to copy text to clipboard');
        });
});

// Download text functionality
downloadButton.addEventListener('click', () => {
    if (!outputText.value) return;
    
    const blob = new Blob([outputText.value], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'converted-text.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}); 