/* - Fixed Double Back Issue */

const InputManager = (function() {
    const TIZEN_KEY_MAP = {
        "XF86PlayBack": "MediaPlayPause",
        "XF86RaiseChannel": "ChannelUp",
        "XF86LowerChannel": "ChannelDown",
        "XF86ChannelGuide": "Guide",
        "XF86Voice": "Microphone",
        "XF86Info": "Info",
        "XF86Caption": "Caption",
        "XF86Return": "Back",
        "Escape": "Back",
        "10009": "Back",

        // Trick Play Keys
        "XF86Rewind": "MediaRewind",
        "XF86Forward": "MediaFastForward",
        "XF86Play": "MediaPlay",
        "XF86Pause": "MediaPause",
        "XF86Stop": "MediaStop",

        "XF86Red": "ColorF0Red",
        "XF86Green": "ColorF1Green",
        "XF86Yellow": "ColorF2Yellow",
        "XF86Blue": "ColorF3Blue"
    };
    const FAVORITE_BUTTONS = ["ColorF0Red","MediaPlayPause", "Red", "f"];
    const SEARCH_BUTTONS = ["ColorF1Green","Guide", "Green","s"];
    const PLAYLIST_BUTTONS = ["ColorF2Yellow","Yellow","p"];
    const SETTINGS_BUTTONS = ["ColorF3Blue","Blue","c"];
    const BACK_BUTTONS=["Back", "Escape"];
    function init() {
        document.addEventListener('keydown', _onKeyDown);
        
        // Specific Tizen Hardware Key Listener
        // CRITICAL: This is required to prevent the app from closing when Back is pressed
        document.addEventListener('tizenhwkey', function(e) {
            if (e.keyName === "back" || e.keyName === "10009") {
                // We handle "Back" here exclusively for Tizen
                const handled = FocusManager.handleKey("Back", e);
                
                // Preventing default here often stops the app from exiting
                // (depending on Tizen version/config)
                if (handled) {
                   // e.preventDefault(); 
                }
            }
        });

        console.log("[InputManager] Listening for keys...");
    }
    function isBack(key){
        return BACK_BUTTONS.includes(key);
    }
    function isFavorite(key){
        return FAVORITE_BUTTONS.includes(key);
    }
    function isSearch(key){
        return SEARCH_BUTTONS.includes(key);
    }
    function isPlayList(key){
        return PLAYLIST_BUTTONS.includes(key);
    }
    function isSettings(key){
        return SETTINGS_BUTTONS.includes(key);
    }
    function _onKeyDown(e) {
        // --- FIX START ---
        // If this is the Tizen Back Key (10009), IGNORE it in this listener.
        // It is already being handled by the 'tizenhwkey' listener above.
        // This prevents the "Double Back" bug.
        if (e.keyCode === 10009 || e.key === 'XF86Return') {
            return;
        }
        // --- FIX END ---

        let keyName = e.key;
        const keyCode = e.keyCode;

        // Map Tizen specific keys to standard names
        if (TIZEN_KEY_MAP[keyName]) {
            keyName = TIZEN_KEY_MAP[keyName];
        } else if (TIZEN_KEY_MAP[keyCode]) {
             keyName = TIZEN_KEY_MAP[keyCode];
        }

        // Pass to Focus Manager
        FocusManager.handleKey(keyName, e);
    }

    return {
        init,
        TIZEN_KEY_MAP,
        isFavorite,
        isSearch,
        isPlayList,
        isBack,
        isSettings,
    };
})();