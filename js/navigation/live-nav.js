const LiveNav = (function() {

    function handleKey(key, activePage) {
        const focused = document.activeElement;
        const inCategoryList = focused.closest('#live-categories-list');
        const inChannelList = focused.closest('#live-channels-list');
        if(inChannelList && (key == "MediaPlayPause" || key == "m")){
            PlayerController.togglePlay();
            return true;
        }
        if (inChannelList && ( InputManager.isFavorite(key) || key === 'f') ){
            try{
                const item = JSON.parse(focused?.dataset?.item);
                if (item) {
                   toggleFavorite(item.stream_id || item.series_id, virtualListType, item);
                }
                return true;
    
            }catch(e){}
        }
        // --- CHANNEL UP/DOWN (SCROLL 10 ITEMS) ---
        if (key === 'ChannelUp' || key === 'ChannelDown' || key === 'PageUp' || key === 'PageDown') {
            let parentSelector = null;
            if (inCategoryList) parentSelector = '#live-categories-list';
            else if (inChannelList) parentSelector = '#live-channels-list';

            if (parentSelector) {
                return _channelUpDown(key, parentSelector);
            }
        }

        // Left/Right: Pane Switching
        if ( InputManager.isLtrRight(key) ) {
            if (inCategoryList) {
                const firstChannel = $('#live-channels-list .nav-item');
                if (firstChannel) firstChannel.focus();
                return true;
            }
            return true; // Stop here
        } 
        
        if ( InputManager.isLtrLeft(key) ) {
            if (inChannelList) {
                const currentCat = $('#live-categories-list .nav-item.bg-primary') || $('#live-categories-list .nav-item');
                if (currentCat) currentCat.focus();
                return true;
            }
            return true;
        }

        // Up/Down: Constrained Vertical Nav
        if (key === 'ArrowUp' || key === 'ArrowDown') {
            let parentSelector = null;
            if (inCategoryList) parentSelector = '#live-categories-list';
            else if (inChannelList) parentSelector = '#live-channels-list';
            
            if (parentSelector) {
                return _handleVerticalListNav(key, parentSelector);
            }
        }
        
        // Enter: Interaction
        if (key === 'Enter') {
            if (inChannelList || inCategoryList) {
                focused.click();
                return true;
            }
        }

        return false;
    }

    function _handleVerticalListNav(key, parentSelector) {
        const items = Array.from(document.querySelectorAll(`${parentSelector} .nav-item`));
        const currentIdx = items.indexOf(document.activeElement);
        
        if (currentIdx === -1) return false;

        let nextIdx = currentIdx;
        if (key === 'ArrowDown') nextIdx++;
        if (key === 'ArrowUp') nextIdx--;

        if (nextIdx >= 0 && nextIdx < items.length) {
            items[nextIdx].focus();
            items[nextIdx].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return true;
        }
        return true; 
    }

    // New Helper: Jumps 10 items in a DOM list
    function _channelUpDown(key, parentSelector) {
        const items = Array.from(document.querySelectorAll(`${parentSelector} .nav-item`));
        const currentIdx = items.indexOf(document.activeElement);
        
        if (currentIdx === -1 || items.length === 0) return false;

        const jumpSize = 10;
        let nextIdx = currentIdx;

        if (key === 'ChannelUp' || key === 'PageUp') {
            nextIdx = Math.max(0, currentIdx - jumpSize);
        } else if (key === 'ChannelDown' || key === 'PageDown') {
            nextIdx = Math.min(items.length - 1, currentIdx + jumpSize);
        }

        if (nextIdx !== currentIdx ) {
            items[nextIdx].focus();
            items[nextIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });
            return true;
        }
        return false;
    }

    return { handleKey };
})();