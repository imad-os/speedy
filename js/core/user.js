// === User & Settings Management ===

function saveUserSettings() {
    if (!currentUsername) return;
    const { favorites, watching, hiddenCategories, pinnedCategories, ..._userSettings } = userSettings;
    localStorage.setItem(`settings_${currentUsername}`, JSON.stringify(_userSettings));
    localStorage.setItem(`favorites_${currentUsername}`, JSON.stringify(favorites));
    localStorage.setItem(`watching_${currentUsername}`, JSON.stringify(watching));

    localStorage.setItem(`pinned_${currentUsername}`, JSON.stringify(pinnedCategories));
    localStorage.setItem(`hidden_${currentUsername}`, JSON.stringify(hiddenCategories));
}

function _detectSystemLanguage() {
    try {
        let sysLang = navigator.language || 'en'; // Default to browser language (works on Tizen)
        
        // Tizen Specific Check (Optional but more accurate for TV settings)
        if (typeof tizen !== 'undefined' && tizen.systeminfo) {
            try {
                // Synchronous check if available, otherwise navigator.language is fine
                const capability = tizen.systeminfo.getCapability("http://tizen.org/feature/system.locale");
                if (capability) sysLang = capability;
            } catch(e) {}
        }

        const shortLang = sysLang.split('-')[0].toLowerCase(); // "en-US" -> "en"
        const supported = ['en', 'fr', 'es', 'ar'];
        
        return supported.includes(shortLang) ? shortLang : 'en';
    } catch (e) {
        return 'en';
    }
}

function loadUserSettings() {
    currentUsername = defaultUserSettings.username || 'default';
    const savedSettings = localStorage.getItem(`settings_${currentUsername}`);
    let favorites = localStorage.getItem(`favorites_${currentUsername}`);
    let watching = localStorage.getItem(`watching_${currentUsername}`);

    let pinnedCategories = localStorage.getItem(`pinned_${currentUsername}`);
    let hiddenCategories = localStorage.getItem(`hidden_${currentUsername}`);
    if(favorites) {
        try { favorites = JSON.parse(favorites); } catch (e) { favorites = []; }
    }
    if(watching) {
        try { watching = JSON.parse(watching); } catch (e) { watching = []; }
    }
    if(pinnedCategories) {
        try { pinnedCategories = JSON.parse(pinnedCategories); } catch (e) { pinnedCategories = []; }
    }
    if(hiddenCategories) {
        try { hiddenCategories = JSON.parse(hiddenCategories); } catch (e) { hiddenCategories = []; }
    }
    let parsed;
    if (savedSettings) {
        parsed = JSON.parse(savedSettings);
        if (parsed.xtreamConfig && !Array.isArray(parsed.xtreamConfig)) {
            parsed.xtreamConfig = [parsed.xtreamConfig];
        }
        userSettings = {
            ...defaultUserSettings,
            ...parsed,
            favorites: favorites || [],
            watching: watching || {},
            pinnedCategories: pinnedCategories || [],
            hiddenCategories: hiddenCategories || [],
        };
        // Fallback if saved settings somehow have no language
        if (!userSettings.language) userSettings.language = 'en'; 
    } else {
        // --- FIRST RUN: Detect Language ---
        const detectedLang = _detectSystemLanguage();
        console.log(`First run detected language: ${detectedLang}`);
        
        userSettings = { 
            ...defaultUserSettings, 
            language: detectedLang, // Set detected language here
            favorites: favorites || [], 
            watching: watching || {} 
        }; 
    }
    loadTheme();
}
// ... (rest of the file remains unchanged)
async function signupDevice(docRef) {
    if (!firebaseDb) {
        console.error("Firebase DB not initialized");
        return;
    }

    try {
        const deviceData = getCapabilitiesObject();
        if(!docRef){
            docRef = firebaseDb.collection("devices").doc(MacAddr);
        }
        // Use set with merge: true to prevent overwriting existing custom data
        deviceData.status = "waiting";
        deviceData.app_secret = "sec";
        
        // Add createdAt timestamp
        deviceData.createdAt = firebase.firestore.FieldValue.serverTimestamp();

        await docRef.set(deviceData, { merge: true });
        
        console.log(`Device ${MacAddr} registered successfully.`);
    } catch (e) {
        console.error("Failed to register device in Firebase:", e);
    }
}
function getCapabilitiesObject() {
    if (typeof tizen === 'undefined' || typeof tizen.systeminfo === 'undefined') {
        return { error: "Tizen SystemInfo API is not available on this device." };
    }

    const results = {};

    for (const uri of capabilityKeys ) {
        try {
            // tizen.systeminfo.getCapability() is synchronous and returns the value directly
            const value = tizen.systeminfo.getCapability(uri);
            const capabilityName = uri.split('/').pop();
            results[capabilityName] = value;
        } catch (e) {
            // Catch errors (e.g., SecurityError, TypeMismatchError, or if the URI is invalid)
            console.error(`Error retrieving capability for ${uri}:`, e.message);
            results[uri] = `ERROR: ${e.message}`;
        }
    }
    results.mac = MacAddr;
    return results;
}

/**
 * Mock API handler for GitHub Pages (Static Hosting)
 * @param {string} action - The XC API action (e.g., 'get_live_streams')
 * @param {object} params - The parameters (e.g., {series_id: 123}), mostly ignored in static mode
 */
async function handleUserLogin() {
    // 1. Show page-main immediately with boot status
    showPage('page-main');
    $("#add-playlist-status").textContent = "No playlist found";

    // 2. Initial Status
    updateBootStatus("Loading user playlists...");

    loadUserSettings(); 
    
    if(isTestMode){
        updateBootStatus("Entering Test Mode...");
        // Short delay for visual effect
        setTimeout(() => {
            handleApiConnect(null, true);
        }, 500);
        _hideModal();
        return true;
    }

    // --- FIREBASE CHECK ---
    const deviceId = typeof MacAddr !== 'undefined' ? MacAddr : "web-test-device";
    console.log("Checking Firebase for Device:", deviceId);

    try {
        if (firebaseDb) {
            updateBootStatus("Verifying device...");
            const docRef = firebaseDb.collection("devices").doc(deviceId);
            const doc = await docRef.get();

            if (doc.exists) {
                updateBootStatus("Fetching user info...");
                const data = doc.data();
                console.log("Playlist found via Firebase!", data);
                
                // RENDER SUBSCRIPTION INFO (NEW)
                if (typeof renderSubscriptionInfo === 'function') {
                    renderSubscriptionInfo(data);
                }

                let playlists;
                try{
                    playlists = data.playlists.xtreamConfig;
                    console.log("Decoded Playlists:", playlists);
                    // Merge Firebase Data
                    if (playlists && Array.isArray(playlists)) {
                        userSettings.xtreamConfig = playlists;
                        userSettings.pl = 0; // Default to first
                        
                        if(handleApiConnect(null, true)){
                            saveUserSettings();
                        }
                        
                        return;
                    }else{
                        console.log("ERRORR NOT VALID PLAYLIST");
                        updateBootStatus("Invalid Playlist Data");
                        _showQrModal()
                        return
                    }
                }catch(e){
                     updateBootStatus("Data Error");
                     _showQrModal();
                     return;
                }

            }else{
                console.log("No playlist found in Firebase for this device.");
                updateBootStatus("Registering device...");
                signupDevice(docRef);
            }
            if(!doc.exists || !doc.data()?.playlists) {
                console.log(" ---------- No playlist found. Showing QR Code.");
                $("#add-playlist-status").textContent = "No playlist found";
                // Show QR directly, status remains visible behind it
                _showQrModal(docRef);
                Loader.hide()
                return; // Stop here, wait for QR scan
            }
        } else {
            console.warn("Firebase not initialized.");
            updateBootStatus("Firebase Init Failed");
            return
        }
    } catch (e) {
        console.error("Firebase Error:", e);
        updateBootStatus("Connection Error");
    }

    // Fallback to local config if Firebase fails or is skipped
    const currentPL = userSettings.pl || 0;
    const config = userSettings.xtreamConfig[currentPL];
    
    Loader.hide();

    if (config && config.host && config.username && config.password) {
        handleApiConnect(null, true); 
    } else {
        console.log("-------- no config, show login/setup")
        const u = document.getElementById('api-username');
        if(u) u.textContent = currentUsername;
        _showQrModal();

    }
}
let unsubscribe_docref_firebase;
function unsubscribe_docref(){
    if (unsubscribe_docref_firebase) {
        console.log("Stopping Firebase listener...");
        unsubscribe_docref_firebase();
        unsubscribe_docref_firebase = null;
    }
}
function _hideModal(){
    console.log("$$$$$$$ hide modal")
    const modal = document.getElementById('modal-add-playlist');
    const qrContainer = document.getElementById('qrcode-container');

    modal.classList.add('hidden');
    qrContainer.innerHTML = '';
    unsubscribe_docref();

}
function _showQrModal(docRef) {
    // === FIX: STOP PREVIOUS LISTENER FIRST ===
    unsubscribe_docref(); 

    Loader.hide();
    const modal = $('#modal-add-playlist');
    const qrContainer = $('#qrcode-container');
    const macDisplay = $('#device-mac-display');
    const btnRefresh = $('#btn-playlist-refresh');
    
    if (modal && qrContainer) {
        macDisplay.textContent = _MacAddr;
        qrContainer.innerHTML = '';
        new QRCode(qrContainer, {
            text: `https://speedy.geekspro.us/#id=${MacAddr}`,
            width: 512,
            height: 512
        });
        
        modal.classList.remove('hidden');
        if(!docRef){
            docRef = firebaseDb.collection("devices").doc(MacAddr);
        }
        if(unsubscribe_docref_firebase){
            unsubscribe_docref();
        }
        // Real-time Listener for when user adds playlist
        unsubscribe_docref_firebase = docRef.onSnapshot((doc) => {
            if (doc.exists) {
                const data = doc.data();

                // 1. IGNORE IF EMPTY (Don't error out on initial load)
                if (!data.playlists || !data.playlists.xtreamConfig) {
                    console.log("Listener fired, but no playlist data yet. Waiting...");
                    return; 
                }

                // 2. CHECK IF VALID
                if (checkPlaylist(data.playlists.xtreamConfig)) {
                    console.log("Playlist added remotely!");
                    unsubscribe_docref();
                    modal.classList.add('hidden');
                    handleUserLogin(); // Retry login
                } else {
                     // Only show error if data exists but is BAD
                    console.log("Playlist data received but incomplete/invalid.");
                    // Optional: showError("Received invalid playlist data");
                }
            }
        });

        setTimeout(() => {
            if( btnRefresh ) btnRefresh.focus();
        }, 100);
    }
}

function handleLogout() {
    currentUsername = '';
    userSettings = { ...defaultUserSettings };
    navigationStack = [];
    showPage('page-user-login');
}

function checkPlaylist(playlists){
    // FIX: Added '!' before playlists[0].username
    if(!playlists || !playlists[0] || !playlists[0].host || !playlists[0].username || !playlists[0].password){
        return false;
    }
    return true
}
async function handleApiConnect(e, isAutoLogin = false) {
    let currentIndex = userSettings.pl;
    if (typeof currentIndex === 'undefined' || currentIndex < 0 || currentIndex >= userSettings.xtreamConfig.length) {
        currentIndex = 0;
        userSettings.pl = 0;
    }

    xtreamConfig = userSettings.xtreamConfig[currentIndex];
    
    if (!xtreamConfig) {
        if (!isAutoLogin) showError('No playlist config found.');
        console.log("--------- no playlist")
        _showQrModal();

        return false; // Return false to indicate failure
    }

    if (!xtreamConfig.host || !xtreamConfig.username || !xtreamConfig.password) {
        if (!isAutoLogin) showError('playlist is not valid.');
        console.log(`xtreamConfig.host:${xtreamConfig.host} || xtreamConfig.username : ${xtreamConfig.username} || xtreamConfig.password : ${xtreamConfig.password}`)
        _showQrModal();

        return false;
    }
    
    if (!xtreamConfig.host.startsWith('http')) xtreamConfig.host = 'http://' + xtreamConfig.host;
    if (xtreamConfig.host.endsWith('/')) xtreamConfig.host = xtreamConfig.host.slice(0, -1);

    apiBaseUrl = `${xtreamConfig.host}/player_api.php`;
    
    // UPDATE STATUS
    if (xtreamConfig.host.startsWith("https")) {
        updateBootStatus("Trying HTTPS connection...");
    } else {
        updateBootStatus("Trying HTTP connection...");
    }

    try {
        const data = await fetchXtream({ action: 'get_user_info' });
        if (data) {
            console.log('API Connected');
            updateBootStatus("Connection Successful!");

            userSettings.xtreamConfig[currentIndex] = xtreamConfig;
            saveUserSettings();

            // === CALL RENDER UI HERE ===
            if (typeof renderUserInfo === 'function') {
                renderUserInfo(data);
            }
            
            showPage('page-main');
            pushToNavStack('page-main');
            
            // === SUCCESS: REVEAL UI ===
            _hideModal();
            setTimeout(() => {
                revealMainMenu();
            }, 500); // Small delay so user sees "Success"
            
            return true;

        } else {
            throw new Error("Auth failed");
        }
    } catch (error) {
        console.error('Connect failed:', error);
        
        updateBootStatus("Connection Failed");
        
        setTimeout(() => {
             // Only show QR if it was an auto-login attempt at startup
             if(isAutoLogin) _showQrModal();
             else showError(`API Error: ${error.message}`);
        }, 1000);
        
        return false;
    }

}

function TestMod(){
    unsubscribe_docref();
    isTestMode = true;
    handleUserLogin();
}
function Refresh(){
    unsubscribe_docref();
    handleUserLogin()
}