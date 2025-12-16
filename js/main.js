// === Initialization ===

function registerTizenKeys() {
    if (typeof tizen !== 'undefined' && tizen.tvinputdevice) {
        Object.values(InputManager.TIZEN_KEY_MAP).forEach(keyName => {
            try { tizen.tvinputdevice.registerKey(keyName); } catch (e) {}
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("App initializing...");

    // Initialize Firebase
    try {
        if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
            firebase.initializeApp(firebaseConfig);
            firebaseDb = firebase.firestore();
            console.log("Firebase Initialized");
        } else {
            console.warn("Firebase Config missing. Skipping.");
        }
    } catch (e) {
        console.error("Firebase Init Failed", e);
    }

    FocusManager.init();
    InputManager.init();
    PlayerController.init();

    FocusManager.register(FocusManager.LAYERS.PAGE, NavigationRouter);
    
    detectTizen();
    setupEventListeners();
    setupClock();
    loadWeather();
    // Initialize Language (if module loaded)
    if(typeof LanguageManager !== 'undefined') {
        console.log("Initializing Language Engine...");
        // This will be re-called in loadUserSettings() > loadTheme(), but good to have here too
        LanguageManager.updateDOM();
    }
    
    // --- PRIVACY CHECK ---
    // First, load settings to see if we have a user
    loadUserSettings();

    // Check if user has agreed to Privacy Policy
    if (checkPrivacyConsent()) {
        // If true, user has already agreed. Proceed to Login.
        // handleUserLogin will now show page-main and the Boot Status
        handleUserLogin();
    } else {
        // If false, Modal is now showing. 
        // Logic stops here. The Modal's "Agree" button will trigger grantPrivacyConsent() -> handleUserLogin()
        console.log("Waiting for Privacy Consent...");
    }
});

document.addEventListener("visibilitychange", function(){
    if (typeof PlayerController !== 'undefined' && typeof PlayerController.handleVisibilityChange === 'function') {
        PlayerController.handleVisibilityChange();
    }
});

function detectTizen() {
    try {
        if (typeof webapis !== 'undefined' && webapis.avplay) {
            console.log("Tizen platform detected.");
            registerTizenKeys();
        }
    } catch (e) { console.log("Error detecting Tizen", e); }
}

function setupEventListeners() {
    // --- Privacy Modal Listeners ---
    const btnAgree = $('#btn-privacy-agree');
    if (btnAgree) btnAgree.addEventListener('click', grantPrivacyConsent);

    const btnExit = $('#btn-privacy-exit');
    if (btnExit) btnExit.addEventListener('click', denyPrivacyConsent);

    const btnPrivClose = $('#btn-privacy-close');
    if (btnPrivClose) btnPrivClose.addEventListener('click', hidePrivacySettings);

    // --- Standard Listeners ---
    const loginBtn = $('#user-login-button');
    if(loginBtn) loginBtn.addEventListener('click', handleUserLogin);
    
    const usernameInput = $('#username');
    if(usernameInput) usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleUserLogin();
        if (e.key === 'ArrowDown') $("#user-login-button").focus();
    });

    const apiBtn = $('#api-connect-button');
    if(apiBtn) apiBtn.addEventListener('click', () => handleApiConnect(null, false));
    
    const plBtn = $('#header-playlists-button');
    if(plBtn) plBtn.addEventListener('click', showPlaylistsPage);
    
    const addPlBtn = $('#add-playlist-button');
    if(addPlBtn) addPlBtn.addEventListener('click', addNewPlaylist);
    
    const clearSearchBtn = $('#search-clear-btn');
    if(clearSearchBtn) clearSearchBtn.addEventListener('click', () => toggleSearchBar(false));
    
    const searchInput = $('#search-input');
    let searchDebounce; 
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value;
            searchState.query = query;
            console.log("Input detected:", query);

            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(() => {
                console.log("Executing Search:", query);
                ViewVOD.search();
            }, 300); 
        });
    }


    const logoutBtn = $('#logout-button');
    if(logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    const changeApiBtn = $('#change-api-button');
    if(changeApiBtn) changeApiBtn.addEventListener('click', () => {
        pushToNavStack($$('.page[style*="block"]')[0].id);
        const currentPL = userSettings.pl || 0;
        xtreamConfig = userSettings.xtreamConfig[currentPL] || {};
        $('#playlist-title').value = xtreamConfig.title || '';
        $('#host').value = xtreamConfig.host || '';
        $('#api-user').value = xtreamConfig.username || '';
        $('#api-pass').value = xtreamConfig.password || '';
        showPage('page-api-details');
    });
    
    // UPDATE: Use t() for alerts
    const clearFavBtn = $('#clear-favorites-button');
    if(clearFavBtn) clearFavBtn.addEventListener('click', () => {
            userSettings.favorites = [];
            saveUserSettings();
            showAlert(typeof t !== 'undefined' ? t('msg_fav_cleared') : 'Favorites cleared.');
    });
    
    const clearWatchBtn = $('#clear-watching-button');
    if(clearWatchBtn) clearWatchBtn.addEventListener('click', () => {
            userSettings.watching = {};
            saveUserSettings();
            showAlert(typeof t !== 'undefined' ? t('msg_watch_cleared') : 'Watching progress cleared.');
    });
    
    // === VIEW BINDINGS ===
    window.loadCategories = function(type) {
        if (type === 'live') ViewLiveTV.init();
        else ViewVOD.loadCategories(type);
    };
}