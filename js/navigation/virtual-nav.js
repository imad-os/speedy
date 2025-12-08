const VirtualNav = (function() {
    function handleKey(key) {
        if (!virtualList || typeof virtualListItems === 'undefined') return false;

        const cols = virtualList.getCols();
        const itemCount = virtualListItems.length;
        let newIndex = focusedVirtualIndex; 

        let handled = false;

        // --- FAVORITES TOGGLE (Refreshed Immediately) ---
        if ( InputManager.isFavorite(key)  || key === 'f') {
            const item = virtualListItems[focusedVirtualIndex];
            if (item) {
                // 1. Toggle Data
                const isFav = toggleFavorite(item.stream_id || item.series_id, virtualListType, item);                
                // 3. Ensure highlight stays
                virtualList.highlight(focusedVirtualIndex); 
            }
            return true;
        }

        // --- CHANNEL UP/DOWN (SCROLL 5 ROWS) ---
        if (key === 'ChannelUp' || key === 'ChannelDown' || key === 'PageUp' || key === 'PageDown') {
            return _channelUpDown(key, cols, itemCount);
        }

        // --- STANDARD NAV ---
        if (key === 'ArrowRight') {
            if (newIndex + 1 < itemCount) { newIndex++; handled = true; }
        } else if (key === 'ArrowLeft') {
            if (newIndex - 1 >= 0) { newIndex--; handled = true; }
            else if(newIndex===0){handled = true;}
            /* trap the focus on virtual items side
            if (newIndex % cols !== 0) { 
                if (newIndex - 1 >= 0) { newIndex--; handled = true; }
            }
            */
        } else if (key === 'ArrowDown') {
            if (newIndex + cols < itemCount) { newIndex += cols; handled = true; }
            else if (newIndex < itemCount - 1) { handled = true; } 
        } else if (key === 'ArrowUp') {
            if (newIndex - cols >= 0) { 
                newIndex -= cols; 
                handled = true; 
            } else {
                const searchBtn = document.getElementById('header-search-button');
                if (searchBtn) {
                    searchBtn.focus();
                    virtualList.highlight(-1);
                    return true;
                }
            }
        } else if (key === 'Enter') {
            const item = virtualListItems[newIndex];
            if (item) {
                const focusedEl = document.querySelector('.vitem.focused');
                if (focusedEl){
                    focusedEl.click();
                    return true;
                } 
                
            }
        }
        if (handled && newIndex !== focusedVirtualIndex) {
            focusedVirtualIndex = newIndex;
            virtualList.ensureVisible(focusedVirtualIndex);
            virtualList.highlight(focusedVirtualIndex);
            return true;
        }

        return handled;
    }

    // New Helper: Scrolls 5 rows at a time
    function _channelUpDown(key, cols, itemCount) {
        const jumpSize = cols * 5; // 5 Rows
        let newIndex = focusedVirtualIndex;

        if (key === 'ChannelUp' || key === "PageUp") {
            newIndex = Math.max(0, newIndex - jumpSize);
        } else if (key === 'ChannelDown' || key === "PageDown") {
            newIndex = Math.min(itemCount - 1, newIndex + jumpSize);
        }

        if (newIndex !== focusedVirtualIndex) {
            focusedVirtualIndex = newIndex;
            virtualList.ensureVisible(focusedVirtualIndex);
            virtualList.highlight(focusedVirtualIndex);
            return true;
        }
        return false;
    }

    return { handleKey };
})();