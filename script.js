// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// DOM Elements
const fileInput = document.getElementById('pdf-file');
const dropzone = document.getElementById('dropzone');
const outputText = document.getElementById('output-text');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const fileInfo = document.getElementById('file-info');
const pageCounter = document.getElementById('page-counter');
const copyButton = document.getElementById('copy-button');
const downloadButton = document.getElementById('download-button');
const clearButton = document.getElementById('clear-button');
const contactLink = document.getElementById('contact-link');
const contactModal = document.getElementById('contact-modal');
const modalClose = document.getElementById('modal-close');
const contactForm = document.getElementById('contact-form');
const toast = document.getElementById('toast');
const loadingSpinner = document.getElementById('loading-spinner');
const themeSwitch = document.getElementById('theme-switch');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');
const wordCountBtn = document.getElementById('word-count');
const exportButton = document.getElementById('export-button');

// Constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const SUPPORTED_TYPES = ['application/pdf'];
const PDF_OPTIONS = {
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/'
};

// State
let currentPdf = null;
let currentPage = 1;
let totalPages = 0;
let extractedText = '';
let fontSize = 16;

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// Initialize AOS
document.addEventListener('DOMContentLoaded', function() {
    AOS.init({
        duration: 800,
        once: true,
        offset: 100
    });
    initTheme();
});

// File Upload Handling
function handleFile(file) {
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
        showToast('File size exceeds 10MB limit', 'error');
        return;
    }

    if (file.type !== 'application/pdf') {
        showToast('Please upload a PDF file', 'error');
        return;
    }

    resetUI();
    showLoadingSpinner();
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const typedarray = new Uint8Array(e.target.result);
        loadPDF(typedarray);
    };
    reader.readAsArrayBuffer(file);
}

// PDF Processing
async function loadPDF(data) {
    try {
        currentPdf = await pdfjsLib.getDocument(data).promise;
        totalPages = currentPdf.numPages;
        updateFileInfo();
        extractTextFromPage(1);
    } catch (error) {
        hideLoadingSpinner();
        showToast('Error loading PDF: ' + error.message, 'error');
    }
}

async function extractTextFromPage(pageNum) {
    try {
        const page = await currentPdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        extractedText = textContent.items
            .map(item => item.str)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();

        outputText.value = extractedText;
        updatePageCounter();
        showResultSection();
        hideLoadingSpinner();
        
        // Enable/disable navigation buttons
        prevPageBtn.disabled = pageNum === 1;
        nextPageBtn.disabled = pageNum === totalPages;
        
    } catch (error) {
        hideLoadingSpinner();
        showToast('Error extracting text: ' + error.message, 'error');
    }
}

// UI Updates
function updateFileInfo() {
    document.querySelector('.result-section').style.display = 'block';
    fileInfo.innerHTML = `
        <i class="fas fa-file-pdf"></i>
        <span>PDF Document (${totalPages} ${totalPages === 1 ? 'page' : 'pages'})</span>
    `;
}

function updatePageCounter() {
    pageCounter.textContent = `Page ${currentPage} of ${totalPages}`;
}

function showResultSection() {
    document.querySelector('.result-section').style.display = 'block';
}

function resetUI() {
    outputText.value = '';
    currentPage = 1;
    document.querySelector('.result-section').style.display = 'none';
    progressBar.style.display = 'none';
    progressText.textContent = '';
}

// Loading Spinner
function showLoadingSpinner() {
    loadingSpinner.style.display = 'flex';
}

function hideLoadingSpinner() {
    loadingSpinner.style.display = 'none';
}

// Toast Notifications
function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = `toast show toast-${type}`;
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Text Operations
function copyText() {
    if (!outputText.value) {
        showToast('No text to copy', 'warning');
        return;
    }
    
    navigator.clipboard.writeText(outputText.value)
        .then(() => showToast('Text copied to clipboard', 'success'))
        .catch(() => showToast('Failed to copy text', 'error'));
}

function downloadText(format = 'txt') {
    if (!outputText.value) {
        showToast('No text to download', 'warning');
        return;
    }

    let content = outputText.value;
    let mimeType = 'text/plain';
    let extension = format;

    switch (format) {
        case 'doc':
            content = `<html><body>${content.replace(/\n/g, '<br>')}</body></html>`;
            mimeType = 'application/msword';
            break;
        case 'md':
            // Add basic markdown formatting
            content = `# PDF Text Extract\n\n${content}`;
            mimeType = 'text/markdown';
            break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extracted-text.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast(`Text downloaded as ${extension.toUpperCase()}`, 'success');
}

function countWords() {
    const text = outputText.value.trim();
    if (!text) {
        showToast('No text to count', 'warning');
        return;
    }
    
    const wordCount = text.split(/\s+/).length;
    const charCount = text.length;
    showToast(`Words: ${wordCount} | Characters: ${charCount}`, 'info');
}

// Text Size Controls
function adjustFontSize(delta) {
    fontSize = Math.max(8, Math.min(24, fontSize + delta));
    outputText.style.fontSize = `${fontSize}px`;
}

// Event Listeners
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
});

dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('drag-over');
});

dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    handleFile(e.dataTransfer.files[0]);
});

copyButton.addEventListener('click', copyText);
downloadButton.addEventListener('click', () => downloadText('txt'));
clearButton.addEventListener('click', resetUI);
contactLink.addEventListener('click', () => contactModal.style.display = 'block');
modalClose.addEventListener('click', () => contactModal.style.display = 'none');
themeSwitch.addEventListener('click', toggleTheme);

prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        extractTextFromPage(currentPage);
    }
});

nextPageBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
        currentPage++;
        extractTextFromPage(currentPage);
    }
});

zoomInBtn.addEventListener('click', () => adjustFontSize(2));
zoomOutBtn.addEventListener('click', () => adjustFontSize(-2));
wordCountBtn.addEventListener('click', countWords);

// Export format handling
document.querySelectorAll('.dropdown-content button').forEach(button => {
    button.addEventListener('click', () => {
        downloadText(button.dataset.format);
    });
});

contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    // Here you would typically handle the form submission
    showToast('Message sent successfully!', 'success');
    contactModal.style.display = 'none';
    contactForm.reset();
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === contactModal) {
        contactModal.style.display = 'none';
    }
});

// Handle keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
            case 'c':
                if (document.activeElement !== outputText) {
                    e.preventDefault();
                    copyText();
                }
                break;
            case 's':
                e.preventDefault();
                downloadText('txt');
                break;
            case '=':
            case '+':
                e.preventDefault();
                adjustFontSize(2);
                break;
            case '-':
                e.preventDefault();
                adjustFontSize(-2);
                break;
        }
    }
}); 