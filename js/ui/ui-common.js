// === UI Utilities ===
// Theming, Search Bar, Playlists UI

let lastErrorRetryCallback = null;

// --- PRIVACY POLICY TEXT REMOVED ---
// (Now handled dynamically via LanguageManager using key 'privacy_policy_full')

function setupClock() {
    const updateTime = () => {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const el = $('#current-time');
        if (el) el.textContent = `${hours}:${minutes}`;
    };
    updateTime();
    clockInterval = setInterval(updateTime, 30000);
}

function setTheme(themeName) {
    document.body.className = themeName;
    userSettings.theme = themeName;
    saveUserSettings();
}

function loadTheme() {
    document.body.className = userSettings.theme || 'theme-default';
    document.documentElement.style.setProperty('--font-scale', userSettings.fontScale || 1.2);
    
    // Also load language here as part of initial UI setup
    if(typeof LanguageManager !== 'undefined') {
        LanguageManager.updateDOM();
    }
}

// === BOOT SEQUENCE UI (NEW) ===

function updateBootStatus(text) {
    const label = document.getElementById('boot-status-label');
    const container = document.getElementById('main-boot-status');
    const grid = document.getElementById('main-menu-grid');
    const actions = document.getElementById('main-menu-actions');

    // Ensure Boot UI is visible
    if (container) {
        container.classList.remove('hidden');
        container.style.display = 'flex';
    }
    
    // Ensure Main Grid is hidden while loading
    if (grid) grid.classList.add('hidden');
    if (actions) actions.classList.add('hidden');

    if (label) {
        // Translate message if possible, otherwise use raw text
        // Note: Calls to updateBootStatus in user.js should ideally pass keys like 'boot_loading_user'
        label.textContent = (typeof t !== 'undefined' && text.startsWith('boot_')) ? t(text) : text;
    }
}

function revealMainMenu() {
    const bootContainer = document.getElementById('main-boot-status');
    const grid = document.getElementById('main-menu-grid');
    const actions = document.getElementById('main-menu-actions');

    // Hide Boot Status
    if (bootContainer) {
        bootContainer.classList.add('hidden');
        bootContainer.style.display = 'none'; // Force hide
    }

    // Reveal Grid
    if (grid) {
        grid.classList.remove('hidden');
        // Small delay for fade effect
        requestAnimationFrame(() => {
            grid.classList.remove('opacity-0');
        });
    }

    // Reveal Actions
    if (actions) {
        actions.classList.remove('hidden');
        requestAnimationFrame(() => {
            actions.classList.remove('opacity-0');
        });
    }
    
    // Focus on Live TV by default
    setTimeout(() => {
       const firstBtn = grid.querySelector('button');
       if(firstBtn) firstBtn.focus();
    }, 100);
}


// === PRIVACY CONSENT LOGIC ===

function checkPrivacyConsent() {
    // Returns TRUE if already accepted, FALSE if we need to show modal
    if (userSettings.privacyAccepted === true) {
        return true;
    }
    
    showPrivacyConsentModal();
    return false;
}

function showPrivacyConsentModal() {
    Loader.hide("showPrivacyConsentModal")
    const modal = document.getElementById('modal-privacy-consent');
    if (modal) {
        modal.classList.remove('hidden');
        
        // Trap focus in Modal Layer
        if (typeof FocusManager !== 'undefined') {
            FocusManager.setLayer(FocusManager.LAYERS.MODAL);
        }

        // Focus AGREE by default
        setTimeout(() => {
            const btn = document.getElementById('btn-privacy-agree');
            if (btn) btn.focus();
        }, 150);
    }
}

function grantPrivacyConsent() {
    console.log("Privacy Policy Accepted.");
    userSettings.privacyAccepted = true;
    saveUserSettings();

    const modal = document.getElementById('modal-privacy-consent');
    if (modal) modal.classList.add('hidden');

    // Restore layer and continue to login
    if (typeof FocusManager !== 'undefined') {
        FocusManager.restorePreviousLayer();
    }

    // Trigger the login flow now that we have consent
    if (typeof handleUserLogin === 'function') {
        handleUserLogin();
    }
}

function denyPrivacyConsent() {
    console.log("Privacy Policy Refused. Exiting.");
    exitApp();
}

// === PRIVACY SETTINGS VIEW (SCROLLABLE) ===

function showPrivacySettings() {
    console.log("showPrivacySettings")
    const modal = document.getElementById('modal-privacy-view');
    const textContainer = document.getElementById('privacy-full-text');
    
    // Populate text using Translation Engine
    if(textContainer) {
        textContainer.textContent = typeof t !== 'undefined' ? t('privacy_policy_full') : "Loading...";
    }

    if (modal) {
        modal.classList.remove('hidden');
        
        if (typeof FocusManager !== 'undefined') {
            FocusManager.setLayer(FocusManager.LAYERS.MODAL);
        }

        setTimeout(() => {
            const btn = document.getElementById('btn-privacy-close');
            if (btn) btn.focus();
        }, 150);
    }
}

function hidePrivacySettings() {
    const modal = document.getElementById('modal-privacy-view');
    if (modal) modal.classList.add('hidden');
    
    if (typeof FocusManager !== 'undefined') {
        FocusManager.restorePreviousLayer();
    }
    
    // Return focus to the Settings button that opened this
    setTimeout(() => {
        const btn = document.querySelector('#page-settings #settings-privacy-button');
        if (btn) btn.focus();
    }, 150);
}


// === LANGUAGE UI ===
function changeLanguage(langCode) {
    console.log(`Changing language to: ${langCode}`);
    userSettings.language = langCode;
    saveUserSettings();
    
    if(typeof LanguageManager !== 'undefined') {
        LanguageManager.updateDOM();
    }
    
    const msg = typeof t !== 'undefined' ? t('msg_lang_updated') : "Language Updated";
    showAlert(`${msg}: ${langCode.toUpperCase()}`);
    updateLanguageSelectionUI();
}

function cycleLanguage() {
    const langs = ['en', 'fr', 'es', 'ar'];
    const current = userSettings.language || 'en';
    let idx = langs.indexOf(current);
    if (idx === -1) idx = 0;
    
    const nextIdx = (idx + 1) % langs.length;
    changeLanguage(langs[nextIdx]);
}

function updateLanguageSelectionUI() {
    const lang = userSettings.language || 'en';
    const theme = userSettings.theme.split("-")[1] || 'Default';
    const themeP = userSettings.player_skin.split("-")?.slice(1)?.join("-") || 'Default';
    
    // Reset all language buttons to default state
    document.querySelectorAll('.btn-lang').forEach(btn => {
        btn.classList.remove('bg-primary', 'text-white');
        btn.classList.add('bg-card', 'text-main');
    });
    
    // Highlight the active language button
    const active = document.querySelector(`.btn-lang[data-lang="${lang}"]`);
    if(active) {
        active.classList.remove('bg-card', 'text-main');
        active.classList.add('bg-primary', 'text-white');
    }

    document.querySelectorAll('#app-theme-options button').forEach(btn => {
        btn.classList.remove('scale-130');
    });
    
    const activeT = document.querySelector(`#app-theme-options button[title="${theme}"]`);
    if(activeT) {
        activeT.classList.add('scale-130');
        activeT.classList.add('!border-b-white');
    }

    document.querySelectorAll('#player-theme-options button').forEach(btn => {
        btn.classList.remove('scale-130');
    });
    
    const activeP = document.querySelector(`#player-theme-options button[title="${themeP}"]`);
    if(activeP) {
        activeP.classList.add('scale-130');
        activeP.classList.add('!border-b-white');
    }

    // Color swatches have no text: give them a spoken name and selected state.
    const tr = (k, f) => (typeof t !== 'undefined' ? t(k) : f);
    document.querySelectorAll('#app-theme-options button').forEach(btn => {
        btn.setAttribute('aria-label', `${tr('aria_app_theme', 'App theme')} ${btn.title}`);
        btn.setAttribute('aria-pressed', btn === activeT ? 'true' : 'false');
    });
    document.querySelectorAll('#player-theme-options button').forEach(btn => {
        btn.setAttribute('aria-label', `${tr('aria_player_theme', 'Player theme')} ${btn.title}`);
        btn.setAttribute('aria-pressed', btn === activeP ? 'true' : 'false');
    });
    document.querySelectorAll('.btn-lang').forEach(btn => {
        btn.setAttribute('aria-pressed', btn === active ? 'true' : 'false');
    });

}

// === EXIT MODAL LOGIC ===
function showExitModal() {
    const modal = document.getElementById('modal-exit');
    if (!modal) return;
    
    modal.classList.remove('hidden');
    // Switch to Modal Layer
    if (typeof FocusManager !== 'undefined') {
        FocusManager.setLayer(FocusManager.LAYERS.MODAL);
    }
    
    // Default focus to NO for safety
    setTimeout(() => {
        const btnNo = document.getElementById('btn-exit-no');
        if (btnNo) btnNo.focus();
    }, 100);
}

function hideExitModal() {
    const modal = document.getElementById('modal-exit');
    if (modal) modal.classList.add('hidden');
    
    // Restore previous layer
    if (typeof FocusManager !== 'undefined') {
        FocusManager.restorePreviousLayer();
    }
    
    // Refocus on main content usually
    if (typeof reFocus === 'function') {
        // If we were on page-main, refocus it
        const activePage = document.querySelector('.page[style*="block"]');
        if(activePage) reFocus(activePage.id);
    }
}

function exitApp() {
    console.log("Exiting Application...");
    if (typeof tizen !== 'undefined' && tizen.application) {
        try {
            tizen.application.getCurrentApplication().exit();
        } catch (e) {
            console.error("Tizen Exit Failed:", e);
        }
    } else {
        window.close(); // For browser testing
    }
}

// === Search UI ===
function toggleSearchBar(show=null) {
    if( isVisible( $("#main-menu-grid") ) ){
        return;
    }
    const container = $('#search-bar-container');
    const input = $('#search-input');
    if(show===null){
        show = container.classList.contains("hidden");
    }
    if (show) {
        container.classList.remove('hidden');
        input.value = searchState.query || '';
        input.focus();
        searchState.active = true;
    } else {
        container.classList.add('hidden');
        input.blur();
        searchState.active = false;
    }
}

function clearSearch(goback=false) {
    const input = $('#search-input');
    const currentCategoryBtn= $(".active-category");
    if(input) input.value = '';
    searchState.query = '';
    toggleSearchBar(false);
    if(currentCategoryBtn && goback){
        currentCategoryBtn.click();
        return;
    }
    const event = new Event('input', {
        bubbles: true,
        cancelable: true,
    });

    input.dispatchEvent(event);
}

// === Playlist Management UI ===
function showPlaylistsPage() {
    renderPlaylists();
    showPage('page-playlists');
    pushToNavStack('page-playlists');
}

function renderPlaylists() {
    const list = $('#playlists-list');
    list.innerHTML = '';
    
    if (!userSettings.xtreamConfig || userSettings.xtreamConfig.length === 0) {
        list.innerHTML = `<p class="text-alt text-center">${typeof t !== 'undefined' ? t('msg_no_playlists') : 'No playlists found.'}</p>`;
        return;
    }

    userSettings.xtreamConfig.forEach((config, index) => {
        const isActive = (index === userSettings.pl);
        
        const btn = document.createElement('button');
        btn.className = `nav-item w-full p-4 rounded-lg text-left transition-all flex justify-between items-center ${isActive ? 'bg-primary text-white' : 'bg-card text-main hover:bg-opacity-80'}`;
        
        const title = config.title || `Playlist ${index + 1}`;
        const url = config.host || 'No URL';

        btn.innerHTML = `
            <div>
                <h3 class="font-bold text-lg">${title}</h3>
                <p class="text-sm opacity-70">${url}</p>
            </div>
            ${isActive ? '<span class="font-bold bg-white text-primary px-2 py-1 rounded">ACTIVE</span>' : ''}
        `;
        
        btn.onclick = () => selectPlaylist(index);
        list.appendChild(btn);
    });
}

async function selectPlaylist(index) {
    console.log(`Switching to playlist index: ${index}`);
    userSettings.pl = index;
    saveUserSettings();
    
    xtreamConfig = userSettings.xtreamConfig[index];
    if (xtreamConfig && xtreamConfig.host && xtreamConfig.username) {
        let host = xtreamConfig.host;
        if (!host.startsWith('http')) host = 'http://' + host;
        if (host.endsWith('/')) host = host.slice(0, -1);
        apiBaseUrl = `${host}/player_api.php`;

        handleApiConnect(null, true); 
    } else {
        showError(typeof t !== 'undefined' ? t('error_incomplete_playlist') : 'Selected playlist is incomplete. Please update the details.');
    }
}

function addNewPlaylist() {
    const newConfig = {
        title: `Playlist ${userSettings.xtreamConfig.length + 1}`,
        host: '',
        username: '',
        password: ''
    };
    userSettings.xtreamConfig.push(newConfig);
    const newIndex = userSettings.xtreamConfig.length - 1;
    userSettings.pl = newIndex; 
    
    $('#playlist-title').value = newConfig.title;
    $('#host').value = '';
    $('#api-user').value = '';
    $('#api-pass').value = '';
    
    showPage('page-api-details');
}

// === Settings Page Logic ===
function showSettingsPage() {
    const userSpan = $('#setting-username');
    if(userSpan) userSpan.textContent = currentUsername || 'Guest';
    
    showPage('page-settings');
    pushToNavStack('page-settings');
    
    updateLanguageSelectionUI(); // Refresh UI to show correct language
    updateSettingsCache();
    // Focus first button
    const firstBtn = document.querySelector('#page-settings button');
    if(firstBtn) firstBtn.focus();
}

// === Category Manager UI ===
async function showCategoryManager(type) {
    let action = '';
    let title = '';
    if (type === 'live') { 
        action = 'get_live_categories'; 
        title = typeof t !== 'undefined' ? t('btn_manage_live') : 'Manage Live Categories'; 
    }
    else if (type === 'vod') { 
        action = 'get_vod_categories'; 
        title = typeof t !== 'undefined' ? t('btn_manage_movies') : 'Manage Movie Categories'; 
    }
    else if (type === 'series') { 
        action = 'get_series_categories'; 
        title = typeof t !== 'undefined' ? t('btn_manage_series') : 'Manage Series Categories'; 
    }

    Loader.show("");
    try {
        const categories = await fetchXtream({ action });
        if (categories && Array.isArray(categories)) {
            _renderCategoryManagerList(categories, type);
            $('#category-manager-title').textContent = title;
            $('#category-manager-modal').style.display = 'flex';
            const firstItem = $('#category-manager-list .nav-item');
            if (firstItem) firstItem.focus();
        }
    } catch (e) {
        showError("Could not load categories.");
    } finally {
        Loader.hide();
    }
}

function _renderCategoryManagerList(categories, type) {
    const list = $('#category-manager-list');
    list.innerHTML = '';

    const isHidden = (id) => userSettings.hiddenCategories.includes(String(id));
    const isPinned = (id) => userSettings.pinnedCategories.includes(String(id));

    categories.forEach(cat => {
        const id = String(cat.category_id);
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between p-3 bg-card rounded-lg';
        
        item.innerHTML = `
            <span class="cat-name font-semibold text-main flex-1 truncate mr-2"></span>
            <div class="flex gap-2">
                <button class="btn-pin nav-item p-2 rounded border-2 ${isPinned(id) ? 'bg-primary border-primary text-white' : 'bg-alt border-transparent text-alt'}"><span aria-hidden="true">📌</span></button>
                <button class="btn-hide nav-item p-2 rounded border-2 ${isHidden(id) ? 'bg-red-600 border-red-600 text-white' : 'bg-alt border-transparent text-alt'}"><span aria-hidden="true">👁️</span></button>
            </div>
        `;
        item.querySelector('.cat-name').textContent = cat.category_name;

        const btnPin = item.querySelector('.btn-pin');
        const btnHide = item.querySelector('.btn-hide');
        const tr = (k, f) => (typeof t !== 'undefined' ? t(k) : f);
        btnPin.setAttribute('aria-label', `${tr('aria_pin', 'Pin category')}: ${cat.category_name}`);
        btnHide.setAttribute('aria-label', `${tr('aria_hide', 'Hide category')}: ${cat.category_name}`);
        btnPin.setAttribute('aria-pressed', isPinned(id) ? 'true' : 'false');
        btnHide.setAttribute('aria-pressed', isHidden(id) ? 'true' : 'false');

        btnPin.onclick = () => {
            togglePinned(id);
            btnPin.className = `btn-pin nav-item p-2 rounded border-2 ${isPinned(id) ? 'bg-primary border-primary text-white' : 'bg-alt border-transparent text-alt'}`;
            btnPin.setAttribute('aria-pressed', isPinned(id) ? 'true' : 'false');
        };

        btnHide.onclick = () => {
            toggleHidden(id);
            btnHide.className = `btn-hide nav-item p-2 rounded border-2 ${isHidden(id) ? 'bg-red-600 border-red-600 text-white' : 'bg-alt border-transparent text-alt'}`;
            btnHide.setAttribute('aria-pressed', isHidden(id) ? 'true' : 'false');
        };

        list.appendChild(item);
    });
}

function togglePinned(id) {
    const index = userSettings.pinnedCategories.indexOf(id);
    if (index > -1) userSettings.pinnedCategories.splice(index, 1);
    else userSettings.pinnedCategories.push(id);
}

function toggleHidden(id) {
    const index = userSettings.hiddenCategories.indexOf(id);
    if (index > -1) userSettings.hiddenCategories.splice(index, 1);
    else userSettings.hiddenCategories.push(id);
}

function hideCategoryManager() {
    $('#category-manager-modal').style.display = 'none';
    const btn = $$('#page-settings button')[0];
    if(btn) btn.focus();
    saveUserSettings();
}

// === UTILS EXPORT FOR ICONS ===
function getHeartIcon(isFav) {
     return isFav ? 
     '<svg class="icon text-red-500"><use href="#icon-heart-full"></use></svg>' : 
     '<svg class="icon text-gray-400"><use href="#icon-heart-empty"></use></svg>';
}

// === SKIN / THEME SELECTION UI ===
function showSkinSelector() {
    const modal = $('#tizen-track-modal');
    const list = $('#tizen-track-modal-list');
    const title = $('#tizen-track-modal-title');

    if (!modal || !list) return;

    title.textContent = "Select Player Skin";
    list.innerHTML = '';

    playerSkins.forEach(skin => {
        const btn = document.createElement('button');
        const isActive = (userSettings.player_skin === skin.id);
        
        btn.className = `nav-item w-full text-left p-3 rounded ${isActive ? 'bg-primary text-white' : 'bg-card text-main'} hover:bg-opacity-80 mb-1`;
        btn.textContent = skin.name;
        
        btn.onclick = () => {
            changePlayerSkin(skin.id);
            modal.classList.add('hidden');
            if (typeof FocusManager !== 'undefined') FocusManager.restorePreviousLayer();
            $('#change-skin-button').focus();
        };
        
        list.appendChild(btn);
    });

    modal.classList.remove('hidden');
    
    if (typeof FocusManager !== 'undefined') FocusManager.setLayer(FocusManager.LAYERS.MODAL);
    setTimeout(() => {
        const first = list.querySelector('.nav-item');
        if(first) first.focus();
    }, 100);

}


function changeAppTheme(themeName) {
    console.log("Changing App Theme to:", themeName);
    document.body.className = themeName;
    userSettings.theme = themeName;
    saveUserSettings();
    updateLanguageSelectionUI();
    showAlert(typeof t !== 'undefined' ? t('msg_theme_updated') : "App Theme Updated");
}

function changePlayerSkin(skinName) {
    console.log("Changing Player Skin to:", skinName);
    
    userSettings.player_skin = skinName;
    saveUserSettings();
    updateLanguageSelectionUI();
    
    if (window.playerOverlay && typeof window.playerOverlay.init === 'function') {
        window.playerOverlay.init();
    }
    showAlert(typeof t !== 'undefined' ? t('msg_skin_updated') : "Player Skin Updated");
}

function showAbout(){
    const modal = document.getElementById('modal-about');
    // Show the real package version (config.xml) instead of a hard-coded one
    try {
        const v = tizen.application.getAppInfo().version;
        if (v) document.getElementById('about-version-val').textContent = v;
    } catch (e) {}
    modal.classList.remove('hidden');
    FocusManager.setLayer(FocusManager.LAYERS.MODAL);
    const closeBtn = modal.querySelector('button');

    setTimeout(() => {
        if (closeBtn) closeBtn.focus();
    }, 100);
}

function hideAbout(){
    document.getElementById('modal-about').classList.add('hidden');
    FocusManager.restorePreviousLayer();

}

function showErrorModal(title, message, errorCode = "", retryCallback = null) {
    const modal = $('#modal-error');
    
    // Auto-translate generic error titles if passed as "Error"
    const displayTitle = (title === "Error" && typeof t !== 'undefined') ? t('boot_connection_error') : title;
    
    // SAFE DOM UPDATE: use getElementById and textContent
    const titleEl = document.getElementById('modal-error-title');
    const msgEl = document.getElementById('modal-error-message');
    const codeEl = document.getElementById('modal-error-code');
    
    if(titleEl) titleEl.textContent = displayTitle || "Error";
    if(msgEl) msgEl.textContent = message || "An unknown error occurred.";
    if(codeEl) codeEl.textContent = errorCode ? `${typeof t !== 'undefined' ? t('error_code') : 'Code'}: ${errorCode}` : "";
    
    const closeBtn = document.getElementById('btn-error-close');
    const retryBtn = document.getElementById('btn-error-retry');

    if (retryCallback && typeof retryCallback === 'function') {
        lastErrorRetryCallback = retryCallback;
        if(retryBtn) {
            retryBtn.style.display = 'flex';
            requestAnimationFrame(() => retryBtn.focus());
        }
    } else {
        lastErrorRetryCallback = null;
        if(retryBtn) retryBtn.style.display = 'none';
        if(closeBtn) {
            requestAnimationFrame(() => closeBtn.focus());
        }
    }

    if(modal) modal.classList.remove('hidden');    
    if (typeof FocusManager !== 'undefined') {
        FocusManager.setLayer(FocusManager.LAYERS.MODAL);
    }
    
}

function hideErrorModal() {
    $('#modal-error').classList.add('hidden');
    if (typeof FocusManager !== 'undefined') {
        FocusManager.restorePreviousLayer(); 
    }
    
    // === NEW LOGIC: Go to Home Page on Close ===
    // This ensures the user isn't stuck on a blank screen if the data load failed
    if (typeof showPage === 'function') {
        showPage('page-main');
        pushToNavStack('page-main');
        
        // Ensure main menu is visible/reset
        if(typeof revealMainMenu === 'function') revealMainMenu();
        
        // Reset focus
        setTimeout(() => {
             const firstBtn = document.querySelector('#main-menu-grid button');
             if(firstBtn) firstBtn.focus();
        }, 150);
    }
}

function retryLastAction() {
    hideErrorModal();
    if (lastErrorRetryCallback) {
        // Add a small delay so the modal closes before operation starts
        setTimeout(() => {
            lastErrorRetryCallback();
        }, 200);
    }
}

/**
 * Updates the User Info Panel on the Main Menu using static selectors
 * @param {Object} data - The JSON response from get_user_info
 */
function renderUserInfo(data) {
    // 1. Get Elements
    const container = $('#main-user-info');
    const badge = $('#user-trial-badge');
    const statusVal = $('#user-status-val');
    const expDate = $('#user-exp-date');
    const formatsVal = $('#user-formats-val');
    const serverVal = $('#user-server-val');

    if (!container || !data?.user_info || !data?.server_info) return;

    const u = data.user_info;
    const s = data.server_info;

    // 2. Update Values
    
    // Trial Badge
    if (u.is_trial === "1" || u.is_trial === 1) {
        badge.classList.remove('hidden');
        if(typeof t !== 'undefined') badge.textContent = t('user_trial_tag');
    } else {
        badge.classList.add('hidden');
    }

    // Status
    const rawStatus = u.status || "Unknown";
    let localizedStatus = rawStatus;
    // Attempt basic mapping for active/expired if straightforward
    if (rawStatus === "Active") localizedStatus = typeof t !== 'undefined' ? t('user_active') : "Active";
    if (rawStatus === "Expired") localizedStatus = typeof t !== 'undefined' ? t('user_expired') : "Expired";
    
    statusVal.textContent = localizedStatus;
    statusVal.className = (rawStatus === "Active") ? "font-bold text-green-400" : "font-bold text-gray-400";

    // Expiration Date
    if (u.exp_date && u.exp_date !== "null" && u.exp_date !== null) {
        const expTimestamp = parseInt(u.exp_date, 10);
        if (!isNaN(expTimestamp)) {
            const date = new Date(expTimestamp * 1000);
            const now = new Date();
            
            // Format date based on locale if supported by browser
            const userLang = (typeof userSettings !== 'undefined' && userSettings.language) ? userSettings.language : 'en';
            let daysLeftTextFull = "";
            try {
                daysLeftTextFull = date.toLocaleDateString(userLang, { year: 'numeric', month: 'short', day: 'numeric' });
            } catch(e) {
                daysLeftTextFull = date.toLocaleDateString();
            }
            
            const diffTime = date - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            const daysLeftText = typeof t !== 'undefined' ? t('user_days_left') : 'days left';
            const expiredText = typeof t !== 'undefined' ? t('user_expired') : 'Expired';
            if (diffDays > 0) {
                daysLeftTextFull += ` (${diffDays} ${daysLeftText})`; // Fixed: use translated 'days left'
            } else {
                daysLeftTextFull += ` (${expiredText})`;
            }
            expDate.textContent = daysLeftTextFull
        } else {
            expDate.textContent = "N/A";
        }
    } else {
        expDate.textContent = typeof t !== 'undefined' ? t('user_unlimited') : "Unlimited";
    }

    // Formats
    formatsVal.textContent = (u.allowed_output_formats || []).join(", ");
    formatsVal.title = formatsVal.textContent;

    // Server
    const proto = s.server_protocol || "http";
    const url = s.url || "N/A";
    serverVal.textContent = `${proto}://${url}`;
}

/**
 * Updates the Device/Subscription Info Panel on the Main Menu using static selectors
 * @param {Object} data - The Firebase document data
 */
function renderSubscriptionInfo(data) {
    const container = $('#main-sub-info');
    const statusVal = $('#sub-status-val');
    const macVal = $('#sub-mac-val');
    const createdVal = $('#sub-created-val');
    const playlistsVal = $('#sub-playlists-val');

    if (!container || !data) return;

    // 1. Status
    const rawStatus = data?.activation?.toLowerCase() || "waiting";
    let localizedStatus = rawStatus;
    
    if (rawStatus === "active") localizedStatus = typeof t !== 'undefined' ? t('sub_active') : "Active";
    else if (rawStatus === "trial") localizedStatus = typeof t !== 'undefined' ? t('sub_trial') : "Trial";
    else if (rawStatus === "waiting") localizedStatus = typeof t !== 'undefined' ? t('sub_waiting') : "Waiting";
    
    statusVal.textContent = localizedStatus.toUpperCase();
    switch (rawStatus) {
        case "active":
        case "trial":
            statusVal.className = "font-bold text-green-400"
            break;
        case "expired":
            statusVal.className = "font-bold text-red-400"
            break;
        default:
            statusVal.className = "font-bold text-yellow-400"
            break;
    }
    // 2. MAC Address (Use displayed one if available, otherwise global)
    macVal.textContent = data.macAddress || (typeof MacAddr !== 'undefined' ? MacAddr : "Unknown");

    // 3. Created At
    if (data.createdAt) {
        try {
            // Firebase timestamps might be objects with .seconds
            let date;
            if (data.createdAt.seconds) {
                date = new Date(data.createdAt.seconds * 1000);
            } else {
                date = new Date(data.createdAt); // Try parsing standard string/number
            }
            
            const userLang = (typeof userSettings !== 'undefined' && userSettings.language) ? userSettings.language : 'en';
            createdVal.textContent = date.toLocaleDateString(userLang, { year: 'numeric', month: 'short', day: 'numeric' });
        } catch(e) {
            createdVal.textContent = "N/A";
        }
    } else {
        createdVal.textContent = "N/A";
    }

    // 4. Playlists Count
    let count = 0;
    if (data.playlists && data.playlists.xtreamConfig && Array.isArray(data.playlists.xtreamConfig)) {
        count = data.playlists.xtreamConfig.length;
    }
    playlistsVal.textContent = count;
}
function showInfos(){
    $$('#main-sub-info,#main-user-info').forEach((d)=>{
        d.classList.remove("hidden");
        d.style.display="flex";
    })
}
function hideInfos(){
    $$('#main-sub-info,#main-user-info').forEach((d)=>{
        d.classList.add("hidden");
        d.style.display="none";
    })
}

async function loadWeather(){
    const url = "https://api.weatherapi.com/v1/current.json?key=46ba2a7baf9c416a8cc165112251612&q=auto:ip";
    console.log(`[loadWeather] Fetching: ${url}`);
    let response;
    try {
        response = await safeFetch(url);
        response = await response.json();
    } catch (err) {   
        return false;
    }
    let icon_url = response?.current?.condition?.icon;
    icon_url = icon_url && icon_url.slice(0,2)=="//"? `https:${icon_url}` : icon_url;
    $("#current-weather img").src = icon_url;
    $("#current-weather span").textContent = `${response?.current?.temp_c}C`;
}
function setupWeather(){
    loadWeather();
    setInterval(loadWeather,30*60*1000); // Refresh every 30 minutes
}
function hideSpeedTest() {
    const modal = document.getElementById('modal-speedtest');
    if (modal) {
        modal.classList.add('hidden');
        
        // Restore layer
        if (typeof FocusManager !== 'undefined') {
            FocusManager.restorePreviousLayer();
        }
        
        // Refocus Main Menu Trigger
        setTimeout(() => {
            const btn = document.getElementById('btn-open-speedtest');
            if (btn) btn.focus();
        }, 150);
    }
}

function updateSpeedGauge(speedMbps, avgMbps) {
    const needle = document.getElementById('speed-needle');
    //const speedVal = document.getElementById('speed-val');
    const avgVal = document.getElementById('speed-avg-val');

    //if(speedVal) speedVal.textContent = speedMbps;
    if(avgVal) avgVal.textContent = avgMbps;

    if (needle) {
        // Map 0-100 Mbps to -90 to 90 degrees
        // Simple linear scale for 0-100Mbps
        let speed = parseFloat(avgMbps);
        if (isNaN(speed)) speed = 0;
        
        let percent = Math.min(speed, 100) / 100; 
        let deg = (percent * 180) - 90;
        needle.style.transform = `translateX(-50%) rotate(${deg}deg)`;
    }
}

// === SPEED TEST LOGIC ===
function showSpeedTest() {
    const modal = document.getElementById('modal-speedtest');
    if (modal) {
        modal.classList.remove('hidden');
        if (typeof FocusManager !== 'undefined') {
            FocusManager.setLayer(FocusManager.LAYERS.MODAL);
        }
        
        updateSpeedGauge(0, 0);
        updateSpeedProgress(0);
        
        const btnStart = document.getElementById('btn-speed-start');
        const btnClose = document.getElementById('btn-speed-close');
        const progressContainer = document.getElementById('speed-progress-container');
        
        if (btnStart) {
            btnStart.style.display = 'block';
            btnStart.disabled = false;
        }
        if (btnClose) btnClose.disabled = false;
        if (progressContainer) progressContainer.classList.add('hidden');

        setTimeout(() => {
            if (btnStart) btnStart.focus();
        }, 150);
    }
}

// ... existing hideSpeedTest() and updateSpeedGauge() ...
function updateSpeedProgress(percent) {
    const progressBar = document.getElementById('speed-progress-bar');
    if (progressBar) {
        progressBar.style.width = `${percent}%`;
    }
}

function runSpeedTest() {
    const btnStart = document.getElementById('btn-speed-start');
    const btnClose = document.getElementById('btn-speed-close');
    const progressContainer = document.getElementById('speed-progress-container');
    
    if(btnStart) {
        btnStart.disabled = true;
        btnStart.style.display = 'none'; // Hide Start button
    }
    if(btnClose) btnClose.disabled = true;
    if(progressContainer) progressContainer.classList.remove('hidden'); // Show progress bar

    // Use a robust CDN file (25MB)
    const url = 'https://speed.cloudflare.com/__down?bytes=2500000000'; 
    
    // Check if speedTest.js is loaded
    if (typeof testDownloadSpeedByTime === 'undefined') {
        showError("Speed Test module not loaded.");
        if(btnStart) {
            btnStart.disabled = false;
            btnStart.style.display = 'block';
        }
        if(btnClose) btnClose.disabled = false;
        if(progressContainer) progressContainer.classList.add('hidden');
        return;
    }

    testDownloadSpeedByTime({
        url: url,
        durationMs: 10000,
        intervalMs: 200, // Update every 200ms to save CPU
        onUpdate: (data) => {
            // Check if modal is still open, otherwise stop updating UI
            if (document.getElementById('modal-speedtest').classList.contains('hidden')) return;

            // Convert bits/sec to Mbps
            const mbps = (data.speed / 1000000).toFixed(1);
            const avgMbps = (data.speed_avg / 1000000).toFixed(1);
            
            updateSpeedGauge(mbps, avgMbps);
            updateSpeedProgress(data.progress);
            
            if (data.is_done) {
                if(btnStart) {
                    btnStart.disabled = false;
                    btnStart.style.display = 'block';
                    btnStart.focus();
                }
                if(btnClose) btnClose.disabled = false;
                if(progressContainer) progressContainer.classList.add('hidden');
            }
        }
    }).catch(err => {
        console.error("Speed test error", err);
        if(btnStart) {
            btnStart.disabled = false;
            btnStart.style.display = 'block';
             btnStart.focus();
        }
        if(btnClose) btnClose.disabled = false;
        if(progressContainer) progressContainer.classList.add('hidden');
        
        // Handle AbortError gracefully (user closed modal)
        if (err.name !== 'AbortError') {
             showError(typeof t !== 'undefined' ? t('error_network') : "Network Error");
        }
    });
}

function showReconenctingModal() {
    const modal = document.getElementById('modal-reconnecting');
    if(modal) {
        modal.classList.remove('hidden');
        const p = modal.querySelector('p');
        if(p) p.textContent = "Waiting for network to recover...";
        
        const btn = modal.querySelector('button');
        FocusManager.setLayer(FocusManager.LAYERS.MODAL);
        if(btn) btn.focus();
    }
}
function hideRecoveryModal() {
    const modal = document.getElementById('modal-reconnecting');
    if(modal) modal.classList.add('hidden');
    FocusManager.restorePreviousLayer();
} 