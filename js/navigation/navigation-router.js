const NavigationRouter = (function() {
    // We don't need searchTimeout here anymore, it's handled in main.js via event listener

    function handlekey_search(key, event) {
        if (document.activeElement.id !== "search-input") {
            console.log("search input not focused anymore");
            toggleSearchBar(false);
            return false;
        }

        // 1. Navigation Keys: Return FALSE to let the app handle focus movement
        if ([ 'Back', 'Escape'].includes(key)) {
            return false; 
        }

        if ([ 'Select', 'Enter',"ArrowDown"].includes(key) ){
            toggleSearchBar(false);
            return true;
        }
        return true;
    }

    function handleKey(key, event) {
        const activePageId = navigationStack[navigationStack.length - 1]?.pageId;
        const activePage = activePageId ? document.getElementById(activePageId) : null;

        if (!activePage) return false;

        // 1. Handle Global 'Back' Logic
        if (key === 'Back') {
            return _handleBack(activePageId);
        }
        
        console.log("handel key ,", !$("#search-bar-container").classList.contains("hidden"));
        
        if (!$("#search-bar-container").classList.contains("hidden")) {
            // Only stop propagation if handlekey_search explicitly returns true
            if (handlekey_search(key, event)) {
                return true;
            }
        }

        if (FocusManager.getCurrentLayer() === FocusManager.LAYERS.PAGE) {
            if ( InputManager.isSearch(key)) {
                setTimeout(() => {
                    toggleSearchBar(true);
                    
                }, 100);
                return true;
            }
            if ( InputManager.isSettings(key)) {
                setTimeout(() => {
                    showSettingsPage();
                    
                }, 100);
                return true;
            }
            if ( InputManager.isPlayList(key)) {
                setTimeout(() => {
                    showPlaylistsPage();
                }, 100);
                return true;
            }
        }

        // 2. Delegate to Specific Modules (PRIORITY)
        if (document.getElementById("details-view-panel")?.classList.contains("activeView")) {
            DetailsNav.handleKey(key);
            return true; 
        }
        // B. Virtual Grid (Content Page)
        if (activePageId === 'page-content') {
            const focused = document.activeElement;
            const inSidebar = focused && focused.closest('#vod-category-list');
            // If Focus is in Sidebar (Left Pane)
            if (inSidebar) {
                if (key === 'ArrowRight') {
                    return true;
                }
                if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ChannelUp' || key === 'ChannelDown') {
                     return _handleSimpleListNav(key, '#vod-category-list');
                }
                if (key === 'Enter') {
                    focused.click();
                    return true;
                }
            } else if (virtualList) {
                if (VirtualNav.handleKey(key)) return true;
            }
        }
        // C. Live TV Page
        if (activePageId === 'page-live-tv') {
            if (LiveNav.handleKey(key, activePageId)) return true;
        }
        // --- 3. AUTO-RECOVER FOCUS IF LOST ---
        if (document.activeElement === document.body && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(key)) {
            _recoverFocus(activePageId);
            return true; 
        }
        // D. Fallback: Default Spatial Navigation 
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
            _defaultSpatialNav(key, activePageId);
            return true;
        }
        // E. Default Enter
        if (key === 'Enter') {
            if (document.activeElement && document.activeElement !== document.body) {
                document.activeElement.click();
            } else {
                _recoverFocus(activePageId);
            }
            return true;
        }

        return false;
    }

    function _handleSimpleListNav(key, containerSel) {
        const items = Array.from(document.querySelectorAll(`${containerSel} .nav-item`));
        const currentIdx = items.indexOf(document.activeElement);
        if (currentIdx === -1) return false;
        const jumpSize = 10;
        let next = currentIdx;
        if (key === 'ArrowDown') next++;
        if (key === 'ArrowUp') next--;
        if (key === 'ChannelDown' || key === "PageDown") next = Math.min(items.length - 1, next + jumpSize);
        if (key === 'ChannelUp' || key === "PageUp") next = Math.max(0, next - jumpSize);
        
        if (next >= 0 && next < items.length) {
            items[next].focus({preventScroll:true});
            items[next].scrollIntoView({ behavior: 'instant', block: 'nearest' });
            return true;
        }
        return false;
    }

    function _recoverFocus(pageId) {
        if (pageId === 'page-content') {
            // Try sidebar first if grid empty
            const cat = document.querySelector('#vod-category-list .active-category') || document.querySelector('#vod-category-list .nav-item');
            if (cat) { cat.focus(); return; }
        }
        const root = document.getElementById(pageId);
        if (root) {
            const first = root.querySelector('.nav-item, .nav-item-sm');
            if (first) first.focus();
        }
    }

    function _handleBack(activePageId) {
        console.log('Back button pressed on page:', activePageId);
        if (typeof searchState !== 'undefined' && (searchState.active || (searchState.query && searchState.query.length > 0))) {
            clearSearch();
            return true;
        }
        
        if (isVisible($('#category-manager-modal'))) {
            hideCategoryManager();
            return true;
        }

        if (activePageId === 'page-content') {
            // BACK BUTTON LOGIC FOR SPLIT VIEW
            // If focus is inside grid -> Move focus to sidebar
            const focused = document.activeElement;
            const inGrid = focused && focused.closest('#content-grid');
            
            if (inGrid || (virtualList && document.activeElement.classList.contains('vitem'))) {

                const activeCat = document.querySelector('#vod-category-list .active-category') || document.querySelector('#vod-category-list .nav-item');
                if (activeCat) {
                    $('#vod-category-list').classList.remove("infocused-div");
                    $('#vod-content-area').classList.add("infocused-div");
                    activeCat.focus();
                    return true;
                }
            }
            $('#vod-category-list').classList.remove("infocused-div");
            // If focus is already in sidebar -> Go back to Main Menu
            goBack();
            return true;
        }

        // FIX: Ensure grid is un-dimmed when returning from details
        if (activePageId === 'page-movie-details') {
            const grid = document.getElementById("content-grid");
            //if(grid) grid.classList.remove("disabled");
            goBack();
            return true;
        }

        if (activePageId === 'page-live-tv') {
            const playerPage = document.getElementById('page-player');
            if (playerPage && playerPage.style.display === 'block') {
                if (typeof goPreviewLive === 'function') {
                    goPreviewLive(); 
                    return true;
                }
            }

            const focused = document.activeElement;
            const inChannelList = focused ? focused.closest('#live-channels-list') : null;
            const inCategoryList = focused ? focused.closest('#live-categories-list') : null;

            if (inChannelList) {
                const currentCat = $('#live-categories-list .nav-item.bg-primary') || $('#live-categories-list .nav-item');
                if (currentCat) currentCat.focus();
                return true;
            } else if (inCategoryList) {
                if (typeof stopPlayer === 'function') stopPlayer();
                goBack();
                return true;
            } 
            goBack();
            return true;
        }

        if ($("#details-view-panel") && $("#details-view-panel").classList.contains("activeView")) {
             const panel = document.getElementById("details-view-panel");
             panel.classList.remove("activeView");
             const grid = document.getElementById("content-grid");
             if(grid) grid.classList.remove("disabled");
             if(typeof reFocus === 'function') reFocus(activePageId);
            return true;
        }

        goBack();
        return true;
    }

    function _defaultSpatialNav(key, activePageId) {
        let parentSelector = null;
        if (isVisible($('#category-manager-modal'))) parentSelector = '#category-manager-modal';
        else if (activePageId === 'page-categories') parentSelector = '#category-grid';
        else if (activePageId === 'page-playlists') parentSelector = '#playlists-list';
        else if (activePageId === 'page-movie-details') parentSelector = '#page-movie-details'; 
        
        const root = parentSelector ? document.querySelector(parentSelector) : document.getElementById(activePageId);
        if (!root) return;

        // Get all focusables and filter visible ones
        let focusables = Array.from(root.querySelectorAll('.nav-item, .nav-item-sm, button')).filter(el => isVisible(el));
        
        if (!parentSelector && activePageId !== 'page-movie-details') {
            const header = document.getElementById('global-header');
            if (header && isVisible(header)) {
                focusables.unshift(...Array.from(header.querySelectorAll('button')).filter(el => isVisible(el)));
            }
        }

        const current = document.activeElement;
        const currentRect = current.getBoundingClientRect();
        const currentCenter = {
            x: currentRect.left + (currentRect.width / 2),
            y: currentRect.top + (currentRect.height / 2)
        };

        let next = null;
        let minScore = Infinity;

        focusables.forEach(item => {
            if (item === current) return;
            const r = item.getBoundingClientRect();
            const itemCenter = {
                x: r.left + (r.width / 2),
                y: r.top + (r.height / 2)
            };

            let isCandidate = false;
            
            // STRICT DIRECTIONAL BOUNDARIES
            // This prevents "Movies" -> "Live" when pressing Right
            if (key === 'ArrowRight' && r.left >= currentRect.right - 5) isCandidate = true;
            if (key === 'ArrowLeft'  && r.right <= currentRect.left + 5) isCandidate = true;
            if (key === 'ArrowDown'  && r.top >= currentRect.bottom - 5) isCandidate = true;
            if (key === 'ArrowUp'    && r.bottom <= currentRect.top + 5) isCandidate = true;

            if (isCandidate) {
                const dx = Math.abs(currentCenter.x - itemCenter.x);
                const dy = Math.abs(currentCenter.y - itemCenter.y);
                
                let score;
                if (key === 'ArrowLeft' || key === 'ArrowRight') {
                    // Horizontal priority: heavily penalize vertical offset
                    score = dx + (dy * 15); 
                } else {
                    // Vertical priority: heavily penalize horizontal offset
                    score = dy + (dx * 15);
                }

                if (score < minScore) {
                    minScore = score;
                    next = item;
                }
            }
        });

        if (next) {
            next.focus();
            // Using 'nearest' to prevent jumping the whole page
            next.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
    }
    return {
        handleKey
    };
})();