// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// DOM Elements
const fileInput = document.getElementById('pdf-file');
const outputText = document.getElementById('output-text');
const copyButton = document.getElementById('copy-button');
const downloadButton = document.getElementById('download-button');
const clearButton = document.getElementById('clear-button');
const progressBar = document.getElementById('progress-bar');
const progress = document.getElementById('progress');
const progressText = document.getElementById('progress-text');
const fileInfo = document.getElementById('file-info');
const pageCounter = document.getElementById('page-counter');
const toast = document.getElementById('toast');

// Constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Add drag and drop functionality
const uploadLabel = document.querySelector('.upload-label');
let isDragging = false;

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    uploadLabel.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    uploadLabel.addEventListener(eventName, highlight, false);
    document.body.addEventListener(eventName, () => {
        if (!isDragging) {
            isDragging = true;
            uploadLabel.classList.add('highlight');
        }
    }, false);
});

['dragleave', 'drop'].forEach(eventName => {
    uploadLabel.addEventListener(eventName, unhighlight, false);
    document.body.addEventListener(eventName, () => {
        isDragging = false;
        uploadLabel.classList.remove('highlight');
    }, false);
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

    if (files.length > 0) {
        handleFileSelect(files[0]);
    }
}

// Show toast message
function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = `toast toast-${type} show`;
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
        showToast('Please select a PDF file.', 'error');
        return;
    }

    if (file.size > MAX_FILE_SIZE) {
        showToast('File size exceeds 10MB limit.', 'error');
        return;
    }

    // Update file info
    fileInfo.innerHTML = `
        <i class="fas fa-file-pdf"></i>
        <span>${file.name}</span>
        <span class="file-size">${formatFileSize(file.size)}</span>
    `;
    fileInfo.style.display = 'flex';

    outputText.value = 'Converting PDF to text...';
    progressBar.style.display = 'block';
    progressText.style.display = 'block';
    progress.style.width = '0%';

    try {
        const text = await convertPdfToText(file);
        outputText.value = text;
        progress.style.width = '100%';
        showToast('PDF converted successfully!');
        setTimeout(() => {
            progressBar.style.display = 'none';
            progressText.style.display = 'none';
        }, 1000);
    } catch (error) {
        outputText.value = 'Error converting PDF to text. Please try again.';
        showToast('Error converting PDF.', 'error');
        console.error('Error:', error);
        progressBar.style.display = 'none';
        progressText.style.display = 'none';
    }
}

async function convertPdfToText(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;
    let text = '';

    pageCounter.textContent = `0/${totalPages} pages`;
    pageCounter.style.display = 'block';

    for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map(item => item.str).join(' ');
        text += `Page ${i}\n${pageText}\n\n`;
        
        // Update progress
        const progressPercent = (i / totalPages) * 100;
        progress.style.width = `${progressPercent}%`;
        progressText.textContent = `Converting page ${i} of ${totalPages}`;
        pageCounter.textContent = `${i}/${totalPages} pages`;
    }

    return text.trim();
}

// Copy text functionality
copyButton.addEventListener('click', async () => {
    if (!outputText.value) {
        showToast('No text to copy.', 'error');
        return;
    }
    
    try {
        await navigator.clipboard.writeText(outputText.value);
        showToast('Text copied to clipboard!');
        
        const icon = copyButton.querySelector('i');
        const span = copyButton.querySelector('span');
        icon.className = 'fas fa-check';
        span.textContent = 'Copied!';
        
        setTimeout(() => {
            icon.className = 'fas fa-copy';
            span.textContent = 'Copy Text';
        }, 2000);
    } catch (err) {
        console.error('Failed to copy text:', err);
        showToast('Failed to copy text.', 'error');
    }
});

// Download text functionality
downloadButton.addEventListener('click', () => {
    if (!outputText.value) {
        showToast('No text to download.', 'error');
        return;
    }
    
    const blob = new Blob([outputText.value], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const fileName = fileInfo.querySelector('span')?.textContent || 'converted-text';
    
    a.href = url;
    a.download = `${fileName.replace('.pdf', '')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Text file downloaded!');
});

// Clear functionality
clearButton.addEventListener('click', () => {
    if (!outputText.value && !fileInfo.style.display) {
        showToast('Nothing to clear.', 'error');
        return;
    }
    
    outputText.value = '';
    fileInfo.style.display = 'none';
    pageCounter.style.display = 'none';
    fileInput.value = '';
    showToast('Cleared successfully!');
}); 