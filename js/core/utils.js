// === DOM Elements & Utilities ===
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

function setGlobalFontScale(scale) {
    document.documentElement.style.setProperty('--font-scale', scale);
    localStorage.setItem('user_font_scale', scale);
}

// Toasts are ARIA live regions: they must be visible *before* their text changes,
// otherwise the TV Voice Guide does not announce them.
const _toastTimers = {};
function _showToast(toast, text, durationMs) {
    toast.style.display = 'block';
    toast.textContent = '';
    clearTimeout(_toastTimers[toast.id]);
    setTimeout(() => { toast.textContent = text; }, 30);
    _toastTimers[toast.id] = setTimeout(() => {
        toast.style.display = 'none';
        toast.textContent = '';
    }, durationMs);
}

function showError(message) {
    const toast = $('#error-toast');
    if(!toast) return;
    
    // Use translation for default error message
    const defaultMsg = typeof t !== 'undefined' ? t('error_unknown') : 'An error occurred.';
    _showToast(toast, message || defaultMsg, 5000);
}

function showAlert(message) {
    const toast = $('#alert-toast');
    if(!toast || !message) return;
    _showToast(toast, message, 2000);
}

// === Icon Utilities ===
function getHeartIcon(isFav) {
     return isFav ? 
     '<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 fill-primary" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd" /></svg>' : 
     '<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 fill-text" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>';
}

const isVisible = el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);

function calcRating(item){
    let rating = 0;
    if (item.rating_5based != null) {
        rating = Number(item.rating_5based * 2).toFixed(1);
    } else if (item.rating != null) {
        rating = Number(item.rating).toFixed(1);
    }
    return rating;
}
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}