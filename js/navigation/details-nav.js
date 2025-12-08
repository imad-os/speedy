const DetailsNav = (function() {

    function handleKey(key) {
        // Now handles both the old side-panel (if any) AND the new #page-movie-details
        // But since we switched to full page for movie details, we just check active page
        
        const moviePage = document.getElementById('page-movie-details');
        const sidePanel = document.getElementById('details-view-panel');
        
        // Determine which "details" view is active
        let activeRoot = null;
        
        if (moviePage && moviePage.style.display === 'block') {
            activeRoot = moviePage;
        } else if (sidePanel && sidePanel.classList.contains('activeView')) {
            activeRoot = sidePanel;
        }

        if (!activeRoot) return false;

        const buttons = Array.from(activeRoot.querySelectorAll('button:not(.hidden), .nav-item:not(.hidden)'));
        if (buttons.length === 0) return false;

        const focused = document.activeElement;
        
        // Focus Recovery
        if (!focused || focused === document.body || !activeRoot.contains(focused)) {
            buttons[0].focus();
            return true;
        }

        // Spatial Nav
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
            return _spatialNav(key, buttons);
        }
        
        if (key === 'Enter') {
            if (focused) focused.click();
            return true;
        }
        
        return false;
    }

    function _spatialNav(key, items) {
        const currentRect = document.activeElement.getBoundingClientRect();
        let nextItem = null;
        let minDist = Infinity;

        items.forEach(item => {
            if (item === document.activeElement) return;
            const rect = item.getBoundingClientRect();
            let isCandidate = false;
            
            if (key === 'ArrowRight' && rect.left >= currentRect.right) isCandidate = true;
            if (key === 'ArrowLeft' && rect.right <= currentRect.left) isCandidate = true;
            if (key === 'ArrowDown' && rect.top >= currentRect.bottom) isCandidate = true;
            if (key === 'ArrowUp' && rect.bottom <= currentRect.top) isCandidate = true;
            
            if (isCandidate) {
                // Euclidean distance for better button hopping
                const dist = Math.sqrt(Math.pow(rect.left - currentRect.left, 2) + Math.pow(rect.top - currentRect.top, 2));
                if (dist < minDist) { minDist = dist; nextItem = item; }
            }
        });

        if (nextItem) { nextItem.focus(); return true; }
        return false;
    }

    return { handleKey };
})();