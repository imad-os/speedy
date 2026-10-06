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

        "XF86AudioRewind": "MediaRewind",
        "XF86AudioNext": "MediaFastForward",
        "XF86AudioPlay": "MediaPlay",
        "XF86AudioPause": "MediaPause",

        "XF86AudioStop": "MediaStop",

        "XF86Red": "ColorF0Red",
        "XF86Green": "ColorF1Green",
        "XF86Yellow": "ColorF2Yellow",
        "XF86Blue": "ColorF3Blue"
    };
    // Samsung remote key codes. `e.key` is not reliable for remote/media keys
    // on every Tizen version (often "Unidentified"), the keyCode always is.
    const TIZEN_KEYCODE_MAP = {
        413: "MediaStop",
        415: "MediaPlay",
        19: "MediaPause",
        10252: "MediaPlayPause",
        412: "MediaRewind",
        417: "MediaFastForward",
        403: "ColorF0Red",
        404: "ColorF1Green",
        405: "ColorF2Yellow",
        406: "ColorF3Blue",
        427: "ChannelUp",
        428: "ChannelDown",
        457: "Info",
        10221: "Caption",
        458: "Guide"
    };
    // Keys the app needs to receive (registered through tizen.tvinputdevice).
    const KEYS_TO_REGISTER = [
        "MediaPlay", "MediaPause", "MediaPlayPause", "MediaStop",
        "MediaRewind", "MediaFastForward",
        "ChannelUp", "ChannelDown",
        "ColorF0Red", "ColorF1Green", "ColorF2Yellow", "ColorF3Blue",
        "Info", "Caption", "Guide"
    ];
    // NOTE: media (trick play) keys must only control playback, so they are
    // intentionally not mapped to app actions such as favorites.
    const FAVORITE_BUTTONS = ["ColorF0Red", "Red", "f"];
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

    function isLtrRight(key){
        return (LanguageManager.isLtr && key === 'ArrowRight') || (!LanguageManager.isLtr && key === 'ArrowLeft');
    }
    function isLtrLeft(key){
        return (LanguageManager.isLtr && key === 'ArrowLeft') || (!LanguageManager.isLtr && key === 'ArrowRight');
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
        if (TIZEN_KEYCODE_MAP[keyCode]) {
            keyName = TIZEN_KEYCODE_MAP[keyCode];
        } else if (TIZEN_KEY_MAP[keyName]) {
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
        KEYS_TO_REGISTER,
        isFavorite,
        isSearch,
        isPlayList,
        isBack,
        isSettings,
        isLtrRight,
        isLtrLeft,
    };
})();