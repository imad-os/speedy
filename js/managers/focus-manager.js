const FocusManager = (function() {
    // Layers definition
    const LAYERS = {
        PAGE: 'PAGE',       // Standard grid/list navigation
        PLAYER: 'PLAYER',   // Video player (OSD, controls)
        MODAL: 'MODAL',     // Popups, Track selection
        OVERLAY: 'OVERLAY'  // Tizen Player Overlay
    };

    // Use a stack to track history correctly
    let layerStack = [LAYERS.PAGE]; 
    let layerHandlers = {};

    function init() {
        console.log("[FocusManager] Initialized");
    }

    function register(layerName, handler) {
        layerHandlers[layerName] = handler;
    }

    function setLayer(layerName) {
        const current = getCurrentLayer();
        if (current === layerName) return;
        
        console.log(`[FocusManager] Push Layer: ${current} -> ${layerName}`);
        layerStack.push(layerName);
    }

    function restorePreviousLayer() {
        if (layerStack.length > 1) {
            const removed = layerStack.pop();
            const current = getCurrentLayer();
            console.log(`[FocusManager] Pop Layer: ${removed} -> ${current}`);
        } else {
            console.warn("[FocusManager] Cannot pop last layer (PAGE). Stack is empty.");
            if (layerStack.length === 0) layerStack.push(LAYERS.PAGE);
        }
    }

    function getCurrentLayer() {
        if (layerStack.length === 0) return LAYERS.PAGE;
        return layerStack[layerStack.length - 1];
    }
    
    function handleKey_addPlaylistModal(key) {
        const container = document.querySelector("#modal-add-playlist");
        
        if (container && !container.classList.contains('hidden') ) {
            
            // Define the focusable buttons in order
            const buttons = [
                document.querySelector("#btn-playlist-refresh"),
                document.querySelector("#btn-playlist-test"),
                document.querySelector("#btn-playlist-lang") // Added Language Button
            ].filter(el => el !== null);

            if (buttons.length === 0) return false;

            const focused = document.activeElement;
            let index = buttons.indexOf(focused);

            // If focus is lost or not on buttons, default to first
            if (index === -1) {
                buttons[0].focus();
                return true;
            }

            if ( InputManager.isLtrRight(key) ) {
                const nextIndex = (index + 1) % buttons.length;
                buttons[nextIndex].focus();
                return true;
            }

            if ( InputManager.isLtrLeft(key) ) {
                const prevIndex = (index - 1 + buttons.length) % buttons.length;
                buttons[prevIndex].focus();
                return true;
            }
            
            // Enter clicks the focused button (native activation is prevented in handleKey)
            if (key === "Enter") {
                focused.click();
                return true;
            }

            // Handle Back Button Logic
            if (InputManager.isBack(key)) {
                if (typeof navigationStack !== 'undefined' && navigationStack.length <= 1) {
                    if(typeof showExitModal === 'function') showExitModal();
                } else {
                    container.classList.add('hidden');
                    if(typeof unsubscribe_docref_firebase !== 'undefined' && unsubscribe_docref_firebase) {
                        unsubscribe_docref_firebase();
                    }
                    
                    // Restore focus to main page
                    const activePage = document.querySelector('.page[style*="block"]');
                    if(activePage) {
                        const btn = activePage.querySelector('button');
                        if(btn) btn.focus();
                    }
                }
                return true;
            }
            
            return true;
        }
        
        return false;
    }
    function handleKey_Modals(key) {
        const modalError = $("#modal-error");
        const modalAbout = $('#modal-about');
        const modalPrivacy = $('#modal-privacy-consent');
        const modalPrivacyView = $('#modal-privacy-view');
        
        // NEW: Speed Test Modal
        const modalSpeedTest = $('#modal-speedtest');
        
        const textArea = $('#privacy-full-text');
        let container = false;
        
        if(modalPrivacy && !modalPrivacy.classList.contains('hidden')){
            container = modalPrivacy;
            if(InputManager.isBack(key)){
                return true;
            }
        }else if(modalError && !modalError.classList.contains('hidden')){
            container = modalError;
        }else if(modalPrivacyView && !modalPrivacyView.classList.contains('hidden')){
            container = modalPrivacyView;
            if(InputManager.isBack(key)){
                hidePrivacySettings();
                return true;
            }
        }else if(modalAbout && !modalAbout.classList.contains('hidden')){
            container = modalAbout;
        }
        // NEW: Check for Speed Test
        else if(modalSpeedTest && !modalSpeedTest.classList.contains('hidden')){
            container = modalSpeedTest;
            if(InputManager.isBack(key)){
                hideSpeedTest();
                return true;
            }
        }
        
        if(container===false){ return false;}
        const buttons = Array.from( container.querySelectorAll("button") ).filter(b=> isVisible(b));
        const focused = document.activeElement;
        let index = buttons.indexOf(focused);

        if(container===modalPrivacyView && key=="ArrowUp"){
            if (textArea) textArea.scrollTop -= 50; // Scroll Up 50px
            return true; // Stop event
        }else if(container===modalPrivacyView && key=="ArrowDown"){
            if (textArea) textArea.scrollTop += 50; // Scroll Down 50px
            return true; // Stop event
        }else if (index === -1) {
            buttons[0].focus();
            return true;
        }else if (key === "ArrowRight") {
            const nextIndex = (index + 1) % buttons.length;
            console.log("nextIndex", nextIndex)
            buttons[nextIndex].focus();
        }else if (key === "ArrowLeft") {
            const prevIndex = (index - 1 + buttons.length) % buttons.length;
            console.log("nextIndex", prevIndex)
            buttons[prevIndex].focus();
        }else if (key === "Enter") {
            focused.click();
        }else if ( InputManager.isBack(key) ) {
            modalAbout.classList.add("hidden");
            modalError.classList.add("hidden");
            // Speed Test is handled above via explicit check, but good to have fallback
            if(modalSpeedTest) modalSpeedTest.classList.add("hidden"); 
            
            FocusManager.restorePreviousLayer();
        }
        return true;

    }

    function _isPlaybackActive() {
        if (typeof PlayerController === 'undefined') return false;
        const top = (typeof navigationStack !== 'undefined' && navigationStack.length)
            ? navigationStack[navigationStack.length - 1].pageId : null;
        return PlayerController.isActive || PlayerController.currentState.isFullscreen || top === 'page-player';
    }

    function handleKey(key, event) {
        const handled = _routeKey(key, event);
        // When the app already handled OK/Enter (e.g. by calling .click()), stop the
        // browser's native button activation, otherwise the button is clicked twice.
        if (handled && key === 'Enter' && event && event.preventDefault) {
            const tag = document.activeElement ? document.activeElement.tagName : '';
            if (tag !== 'INPUT' && tag !== 'TEXTAREA') event.preventDefault();
        }
        return handled;
    }

    function _routeKey(key, event) {
        const currentLayer = getCurrentLayer();
        const handler = layerHandlers[currentLayer];

        // STOP (trick play) works from any layer while something is playing:
        // fullscreen player, overlay, track/subtitle dialogs and live preview.
        if (key === 'MediaStop') {
            if (_isPlaybackActive()) {
                PlayerController.stopAndExit();
                if (event && event.preventDefault) event.preventDefault();
                return true;
            }
            return false;
        }

        // 1. MODAL LAYER HANDLING
        if(currentLayer === LAYERS.PAGE){
            if (handleKey_addPlaylistModal(key)) {
                return true;
            }
        }
        if (currentLayer === LAYERS.MODAL) {
            
            // --- EXIT MODAL LOGIC ---
            const exitModal = document.getElementById('modal-exit');
            if (exitModal && !exitModal.classList.contains('hidden')) {
                if (key === 'ArrowRight' || key === 'ArrowLeft') {
                    // Toggle between Yes/No
                    const yes = document.getElementById('btn-exit-yes');
                    const no = document.getElementById('btn-exit-no');
                    if (document.activeElement === yes) no.focus();
                    else yes.focus();
                    return true;
                }
                if ( InputManager.isBack(key) ) {
                    hideExitModal();
                    return true;
                }
                if (key === 'Enter') {
                    document.activeElement.click();
                    return true;
                }
                return true; // Trap focus
            }

            // --- ABOUT MODAL LOGIC ---
            const aboutModal = document.getElementById('modal-about');
            if (aboutModal && !aboutModal.classList.contains('hidden')) {
                if (InputManager.isBack(key)) {
                    hideAbout();
                    return true;
                }
            }

            const reconnectingModal = document.getElementById('modal-reconnecting');
            if (reconnectingModal && !reconnectingModal.classList.contains('hidden')) {
                if (InputManager.isBack(key) || key === 'Enter') {
                    VideoEngine.cancelRecovery();
                    return true;
                }else if ( ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes( key ) ){
                    const _button = reconnectingModal.querySelector("button");
                    if(_button){
                        _button.focus();
                        return true;
                    }
                }
            }
            // Trapped Vertical Navigation for Modal Lists
            if (['ArrowUp', 'ArrowDown'].includes(key)) {
                const modal = document.getElementById('tizen-track-modal');
                if (modal && modal.contains(document.activeElement)) {
                    // Standard simple list navigation logic
                    const items = Array.from(modal.querySelectorAll('.nav-item'));
                    const idx = items.indexOf(document.activeElement);
                    
                    let next = idx;
                    if (key === 'ArrowDown') next++;
                    if (key === 'ArrowUp') next--;
                    
                    if (next >= 0 && next < items.length) {
                        items[next].focus();
                        items[next].scrollIntoView({ block: 'center', behavior: 'smooth' });
                        return true;
                    }
                    return true;
                }
            }
            if(handleKey_Modals(key)){
                return true;
            }

            if (InputManager.isBack(key)) {
                console.log("[FocusManager] Closing MODAL layer via Back/Escape2");
                // Try to click the close button if it exists, otherwise force pop
                const modalTrack = document.getElementById('tizen-track-modal');
                const modalSub = document.getElementById('subtitle-settings-modal');
                
                if (modalTrack && !modalTrack.classList.contains('hidden')) {
                    playerOverlay.closeTrackModal();
                    return true;
                }else if (modalSub && !modalSub.classList.contains('hidden')) {
                    playerOverlay.closeSubtitleSettings();
                    return true;
                }
                restorePreviousLayer();
                return true;
            }
        }

        // 2. Delegate to specific handler
        if (handler && typeof handler.handleKey === 'function') {
            const handled = handler.handleKey(key, event);
            if (handled) {
                const activeTag = document.activeElement ? document.activeElement.tagName : '';
                const isInput = (activeTag === 'INPUT' || activeTag === 'TEXTAREA');

                if (!isInput) {
                    event.preventDefault();
                }
                event.stopPropagation();
                return true;
            }
        }

        // 3. Global Fallback for Back/Escape
        if (InputManager.isBack(key)) {
            if (currentLayer === LAYERS.MODAL || currentLayer === LAYERS.OVERLAY) {
                console.log("[FocusManager] Force closing layer via Back");
                if( playerOverlay.isBuffering && PlayerController._goBack() ){
                    return true;
                }
            }
        }
        
        return false;
    }

    return {
        init,
        register,
        setLayer,
        restorePreviousLayer,
        getCurrentLayer,
        handleKey,
        LAYERS
    };
})();