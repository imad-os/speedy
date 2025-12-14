// === UI Utilities ===
// Theming, Search Bar, Playlists UI

let lastErrorRetryCallback = null;

// --- PRIVACY POLICY TEXT (EMBEDDED FOR SPEED) ---
const PRIVACY_POLICY_TEXT = `PRIVACY POLICY FOR SPEEDY IPTV

Last Updated: December 6, 2025

1. Data Collection & Purpose
Speedy IPTV strictly limits data collection to the minimum necessary for the application to function. We collect the following device identifiers:
* MAC Address & Tizen ID: Used as unique identifiers for your user profile. This allows the app to save your playlists, favorites, and settings without requiring a login or password.
* Model Name: Used to detect your TV's technical capabilities (resolution, supported codecs) to ensure smooth video playback.

2. Data Usage
This information is used solely for:
* Authenticating your device.
* Restoring your user preferences.
* Technical troubleshooting.

3. Third-Party Sharing
We do not sell, trade, or transfer your data (MAC Address, Tizen ID, or Model Name) to outside parties. We do not use this data for advertising or tracking purposes.

4. User Consent
By launching Speedy IPTV and clicking "Agree," you consent to this collection. You may withdraw consent by uninstalling the application.

5. Contact
If you have questions regarding this policy, please contact us at: support@geekspro.us`;


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
    
    // Populate text
    if(textContainer) textContainer.textContent = PRIVACY_POLICY_TEXT;

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
    }

    document.querySelectorAll('#player-theme-options button').forEach(btn => {
        btn.classList.remove('scale-130');
    });
    
    const activeP = document.querySelector(`#player-theme-options button[title="${themeP}"]`);
    if(activeP) {
        activeP.classList.add('scale-130');
    }

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

function clearSearch() {
    const input = $('#search-input');
    if(input) input.value = '';
    searchState.query = '';
    toggleSearchBar(false);
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
        list.innerHTML = `<p class="text-alt text-center">${typeof t !== 'undefined' ? t('No playlists found.') : 'No playlists found.'}</p>`;
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
        showError('Selected playlist is incomplete. Please update the details.');
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
            <span class="font-semibold text-main flex-1 truncate mr-2">${cat.category_name}</span>
            <div class="flex gap-2">
                <button class="btn-pin nav-item p-2 rounded border-2 ${isPinned(id) ? 'bg-primary border-primary text-white' : 'bg-alt border-transparent text-alt'}" title="Pin">📌</button>
                <button class="btn-hide nav-item p-2 rounded border-2 ${isHidden(id) ? 'bg-red-600 border-red-600 text-white' : 'bg-alt border-transparent text-alt'}" title="Hide">👁️</button>
            </div>
        `;

        const btnPin = item.querySelector('.btn-pin');
        const btnHide = item.querySelector('.btn-hide');

        btnPin.onclick = () => {
            togglePinned(id);
            btnPin.className = `btn-pin nav-item p-2 rounded border-2 ${isPinned(id) ? 'bg-primary border-primary text-white' : 'bg-alt border-transparent text-alt'}`;
        };

        btnHide.onclick = () => {
            toggleHidden(id);
            btnHide.className = `btn-hide nav-item p-2 rounded border-2 ${isHidden(id) ? 'bg-red-600 border-red-600 text-white' : 'bg-alt border-transparent text-alt'}`;
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
            applySkin(skin.id);
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
function applySkin(skinId) {
    console.log("Applying Skin:", skinId);
    userSettings.player_skin = skinId;
    saveUserSettings();

    if (window.playerOverlay && typeof window.playerOverlay.init === 'function') {
        window.playerOverlay.init();
    }
    
    showAlert("Skin Applied: " + skinId.replace('skin-', ''));
}


function changeAppTheme(themeName) {
    console.log("Changing App Theme to:", themeName);
    document.body.className = themeName;
    userSettings.theme = themeName;
    saveUserSettings();
    showAlert("App Theme Updated");
}

function changePlayerSkin(skinName) {
    console.log("Changing Player Skin to:", skinName);
    
    userSettings.player_skin = skinName;
    saveUserSettings();
    
    if (window.playerOverlay && typeof window.playerOverlay.init === 'function') {
        window.playerOverlay.init();
    }
    showAlert("Player Skin Updated");
}

function showAbout(){
    const modal = document.getElementById('modal-about');
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
    $('#modal-error-title').innerText = title || "Error";
    $('#modal-error-message').innerText = message || "An unknown error occurred.";
    $('#modal-error-code').innerText = errorCode ? `Code: ${errorCode}` : "";
    const closeBtn = $('#btn-error-close');

    const retryBtn = $('#btn-error-retry');
    if (retryCallback && typeof retryCallback === 'function') {
        lastErrorRetryCallback = retryCallback;
        retryBtn.style.display = 'flex';

        requestAnimationFrame(() => {
            if(retryBtn)retryBtn.focus();
        });
    } else {
        lastErrorRetryCallback = null;
        retryBtn.style.display = 'none';

        requestAnimationFrame(() => {
            if(closeBtn)closeBtn.focus();
        });
    }

    modal.classList.remove('hidden');    
    if (typeof FocusManager !== 'undefined') {
        FocusManager.setLayer(FocusManager.LAYERS.MODAL);
    }
    
}

function hideErrorModal() {
    $('#modal-error').classList.add('hidden');
    FocusManager.restorePreviousLayer(); 
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