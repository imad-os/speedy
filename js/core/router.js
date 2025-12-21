const Router = (function() {
    // === Navigation & Routing ===

    function cleanupVirtualisation() {
        if (typeof virtualList !== 'undefined' && virtualList) {
            virtualList.destroy();
            virtualList = null;
        }
        virtualListItems = [];
        focusedVirtualIndex = 0;
        
        const grid = document.getElementById('content-grid');
        if (grid) {
            grid.className = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4 p-4'; // Default
            grid.style.height = 'auto';
        }
    }

    function reFocus(pageId){
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            // Force visibility
            if (targetPage.classList.contains('hidden-but-layout')) {
                targetPage.classList.remove('hidden-but-layout');
            }
            if (targetPage.style.display !== 'block') {
                targetPage.style.display = 'block';
            }

            // 1. Virtual List Focus Restoration
            if (pageId === 'page-content' && typeof virtualList !== 'undefined' && virtualList) {
                virtualList.ensureVisible(focusedVirtualIndex);
                virtualList.highlight(focusedVirtualIndex);
                return; 
            }

            // 2. Standard DOM Focus Restoration
            let itemToFocus;
            
            // Check history first
            if (focus_history[pageId] && document.body.contains(focus_history[pageId])) {
                const el = focus_history[pageId];
                if (el.offsetParent !== null) { 
                    itemToFocus = el;
                }
            }

            // Fallback defaults
            if (!itemToFocus) {
                if (pageId === 'page-content') {
                    itemToFocus = targetPage.querySelector('#content-grid .nav-item');
                } else if (pageId === 'page-series-details') {
                    itemToFocus = targetPage.querySelector('#series-episodes-list .nav-item');
                } else if (pageId === 'page-movie-details') {
                    itemToFocus = targetPage.querySelector('#detail-play-btn');
                } else if (pageId === 'page-live-tv') {
                    itemToFocus = targetPage.querySelector('#live-categories-list .nav-item');
                } else {
                    itemToFocus = targetPage.querySelector('.nav-item, .nav-item-sm');
                }
            }

            if (itemToFocus) {
                setTimeout(() => {
                    itemToFocus.focus();
                    //itemToFocus.scrollIntoView({ behavior: 'auto', block: 'center' });
                }, 50);
            }
        }
    }

    function showPage(pageId) {
        // 1. SAVE FOCUS OF CURRENT PAGE
        const activePage = document.querySelector('.page[style*="block"]');
        if (activePage && activePage.id && activePage.id !== 'page-player') {
            if (document.activeElement && activePage.contains(document.activeElement)) {
                focus_history[activePage.id] = document.activeElement;
            }
        }

        // Header Logic
        const globalHeader = document.getElementById('global-header');
        const globalBackButton = document.getElementById('global-back-button');
        const globalTitle = document.getElementById('global-header-title');

        if (pageId === 'page-player' || pageId === 'page-user-login' || pageId === 'page-api-details') {
            if(globalHeader) globalHeader.style.display = 'none'; 
        } else {
            if(globalHeader) globalHeader.style.display = 'flex';
            if (pageId === 'page-main') {
                if(globalBackButton) globalBackButton.style.display = 'none';
                if(globalTitle) globalTitle.style.display = 'none';
                PlayerController.stop();
            } else {
                if(globalBackButton) globalBackButton.style.display = 'block';
                if(globalTitle) globalTitle.style.display = 'block';
            }
        }
        
        // Virtualization Cleanup
        const pagesWithVirtualLists = ['page-content','page-series-details'];
        if(pageId !== "page-player" && pageId !== "page-movie-details" && !pagesWithVirtualLists.includes(pageId)) {
            cleanupVirtualisation();
        }
        
        // Page Switching Logic
        if (pageId === 'page-player') {
            const p = document.getElementById(pageId);
            if(p) p.style.display = 'block';
            
            const others = Array.from(document.querySelectorAll('.page')).filter(p => p.style.display === 'block' && p.id !== 'page-player');
            others.forEach(p => p.classList.add('hidden-but-layout'));
        } else {
            document.querySelectorAll('.page').forEach(page => {
                page.style.display = 'none';
                page.classList.remove('hidden-but-layout');
            });
            const p = document.getElementById(pageId);
            if(p) p.style.display = 'block';
        }

        // Context updates
        if(pageId=="page-categories" && navigationStack.length > 0 && navigationStack[navigationStack.length-1]?.context?.type){
            currentType = navigationStack[navigationStack.length-1]?.context?.type;
        }else if(pageId=="page-live-tv"){
            currentType = 'live';
        }
        
        if (pageId !== 'page-player') reFocus(pageId);
    }

    function pushToNavStack(pageId, context = {}) {
        if (navigationStack.length > 0 && navigationStack[navigationStack.length-1].pageId === pageId) {
            navigationStack[navigationStack.length-1].context = context; 
            return;
        }
        navigationStack.push({ pageId, context });
    }

    function goBack() {
        const current = navigationStack[navigationStack.length - 1];
        if (current && current.pageId === 'page-main') {
             if(typeof showExitModal === 'function') showExitModal();
             return;
        }
        CacheManager.cancel();
        const currentPage = navigationStack.pop(); 
        
        if (navigationStack.length === 0) {
            showPage('page-main');
            pushToNavStack('page-main');
            return;
        }

        const lastState = navigationStack[navigationStack.length - 1];
        
        if (currentPage.pageId === 'page-player') {
            const player = document.getElementById('page-player');
            if(player) player.style.display = 'none';
            
            const prevPage = document.getElementById(lastState.pageId);
            if (prevPage) prevPage.classList.remove('hidden-but-layout');

            if (lastState.pageId !== 'page-user-login' && lastState.pageId !== 'page-api-details') {
                const h = document.getElementById('global-header');
                if(h) h.style.display = 'flex';
            }
            window.playerOverlay.hideOverlay();
            reFocus(lastState.pageId);
        } else {
            if(document.activeElement.classList.contains('vitem')) {
                focus_history[currentPage.pageId] = document.activeElement;
                if(typeof $ !== 'undefined') $(".active-category").focus();
                return
            }
            if (lastState) {
                showPage(lastState.pageId);
                const titleEl = document.getElementById('global-header-title');
                
                // UPDATE: Use Translation Engine for History Titles
                if(titleEl && 1==2) {
                    if(lastState.pageId === 'page-categories') {
                        titleEl.textContent = typeof t !== 'undefined' ? t('vod_categories') : 'Categories';
                    }
                    else if (lastState.pageId === 'page-content') {
                        // Try to restore context-aware title if possible, otherwise generic
                        titleEl.textContent = typeof t !== 'undefined' ? t('vod_categories') : 'Content';
                    }
                }
            }
        }
    }

    return {
        showPage,
        pushToNavStack,
        goBack,
        reFocus,
        cleanupVirtualisation
    };
})();

// Global Aliases for legacy code calling these directly
window.showPage = Router.showPage;
window.pushToNavStack = Router.pushToNavStack;
window.goBack = Router.goBack;
window.reFocus = Router.reFocus;
window.cleanupVirtualisation = Router.cleanupVirtualisation;