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
const contactLink = document.getElementById('contact-link');
const contactModal = document.getElementById('contact-modal');
const modalClose = document.getElementById('modal-close');
const contactForm = document.getElementById('contact-form');

// Constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const SUPPORTED_TYPES = ['application/pdf'];
const PDF_OPTIONS = {
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/'
};

// State management
let currentPdfDocument = null;
let isProcessing = false;

// Contact modal functionality
contactLink.addEventListener('click', (e) => {
    e.preventDefault();
    contactModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
});

modalClose.addEventListener('click', () => {
    contactModal.style.display = 'none';
    document.body.style.overflow = 'auto';
});

contactModal.addEventListener('click', (e) => {
    if (e.target === contactModal) {
        contactModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
});

contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(contactForm);
    const data = Object.fromEntries(formData.entries());
    
    // Simulate form submission
    try {
        showToast('Sending message...', 'info');
        await new Promise(resolve => setTimeout(resolve, 1000));
        showToast('Message sent successfully!');
        contactForm.reset();
        contactModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    } catch (error) {
        showToast('Failed to send message. Please try again.', 'error');
    }
});

// Enhanced drag and drop functionality
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

// Enhanced file handling
uploadLabel.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;

    if (files.length > 0) {
        handleFileSelect(files[0]);
    }
}

// Improved toast notifications
function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = `toast toast-${type} show`;
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Enhanced file size formatting
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Improved file validation
function validateFile(file) {
    if (!SUPPORTED_TYPES.includes(file.type)) {
        throw new Error('Please select a PDF file.');
    }
    if (file.size > MAX_FILE_SIZE) {
        throw new Error('File size exceeds 10MB limit.');
    }
}

// Enhanced file selection handling
fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        handleFileSelect(file);
    }
});

async function handleFileSelect(file) {
    if (isProcessing) {
        showToast('Please wait for the current conversion to finish.', 'warning');
        return;
    }

    try {
        validateFile(file);
        isProcessing = true;
        updateUIForProcessing(file);
        const text = await convertPdfToText(file);
        outputText.value = text;
        showToast('PDF converted successfully!');
    } catch (error) {
        outputText.value = '';
        showToast(error.message || 'Error converting PDF.', 'error');
        console.error('Error:', error);
    } finally {
        isProcessing = false;
        updateUIAfterProcessing();
    }
}

function updateUIForProcessing(file) {
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
    pageCounter.style.display = 'none';
}

function updateUIAfterProcessing() {
    setTimeout(() => {
        progressBar.style.display = 'none';
        progressText.style.display = 'none';
    }, 1000);
}

// Improved PDF to text conversion
async function convertPdfToText(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ ...PDF_OPTIONS, data: arrayBuffer }).promise;
        currentPdfDocument = pdf;
        const totalPages = pdf.numPages;
        let text = '';

        pageCounter.textContent = `0/${totalPages} pages`;
        pageCounter.style.display = 'block';

        for (let i = 1; i <= totalPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items
                .map(item => ({
                    text: item.str,
                    x: Math.round(item.transform[4]),
                    y: Math.round(item.transform[5])
                }))
                .sort((a, b) => b.y - a.y || a.x - b.x)
                .map(item => item.text)
                .join(' ');

            text += `Page ${i}\n${pageText}\n\n`;
            
            // Update progress
            const progressPercent = (i / totalPages) * 100;
            progress.style.width = `${progressPercent}%`;
            progressText.textContent = `Converting page ${i} of ${totalPages}`;
            pageCounter.textContent = `${i}/${totalPages} pages`;

            // Allow UI to update
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        return text.trim();
    } finally {
        if (currentPdfDocument) {
            currentPdfDocument.destroy();
            currentPdfDocument = null;
        }
    }
}

// Enhanced copy functionality
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

// Improved download functionality
downloadButton.addEventListener('click', () => {
    if (!outputText.value) {
        showToast('No text to download.', 'error');
        return;
    }
    
    try {
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
    } catch (error) {
        showToast('Failed to download text.', 'error');
        console.error('Download error:', error);
    }
});

// Enhanced clear functionality
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