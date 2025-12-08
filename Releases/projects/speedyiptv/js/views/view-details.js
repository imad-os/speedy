// === Full Page Movie Details (Optimized) ===

const ViewDetails = (function(){
    
    // 1. CACHE DOM ELEMENTS
    // On low CPU devices, document.getElementById is expensive if called repeatedly.
    // We store references once at the top level.
    const UI = {
        playBtn: $('#detail-play-btn'),
        favBtn: $('#detail-fav-btn'),
        favIconUse: $('#detail-fav-btn use'), // Target the <use> tag directly
        favText: $('#detail-fav-btn span'),   // Assume you wrap text in a span
        title: $('#detail-title'),
        poster: $('#detail-poster'),
        rating: $('#detail-rating'),
        plot: $('#detail-plot'),
        year: $('#detail-year'),
        duration: $('#detail-duration'),
        genre: $('#detail-genre'),
        director: $('#detail-director'),
        cast: $('#detail-cast')
        // trailerBtn: document.getElementById('detail-trailer-btn') 
    };

    let currentStreamId = null;
    let currentItemData = null; // We will mutate this object instead of creating new ones

    // 2. STATIC EVENT LISTENERS
    // Setup listeners once. 
    UI.playBtn.onclick = () => {
        if (!currentItemData) return;
        const info = getwatchingProgress(currentStreamId);
        // Use logic short-circuiting for speed
        const start = (info && info.progress_sec) || 0;
        PlayerController.playMovie(currentItemData, start);
    };
    
    UI.favBtn.onclick = () => {
        if (!currentStreamId) return;
        toggleFavorite(currentStreamId, 'vod', currentItemData);
        updateFavButton();
    };

    // 3. OPTIMIZED UI UPDATES
    // Avoid innerHTML. It forces the browser to re-parse strings into DOM nodes.
    // Instead, we update the attributes of the existing SVG and text node.
    function updateFavButton() {
        const isFav = isFavorite(currentStreamId);
        
        // Pre-calculate translations if they exist, or fallback
        const textKey = isFav ? 'btn_remove_fav' : 'btn_add_fav';
        const fallback = isFav ? 'Remove Favorite' : 'Add Favorite';
        const label = (typeof t !== 'undefined') ? t(textKey) : fallback;

        // Efficient DOM updates:
        // Update the SVG icon reference directly
        const iconHref = isFav ? '#icon-heart-full' : '#icon-heart-empty';
        if (UI.favIconUse) UI.favIconUse.setAttribute('href', iconHref);

        // Toggle color classes (assuming tailwind/css classes)
        if (isFav) {
            UI.favBtn.classList.remove('text-gray-400');
            UI.favBtn.classList.add('text-red-500');
        } else {
            UI.favBtn.classList.remove('text-red-500');
            UI.favBtn.classList.add('text-gray-400');
        }

        // Update text node only
        if (UI.favText) {
            UI.favText.textContent = label;
        } else {
            // Fallback if no span exists (though adding a span in HTML is recommended)
            // This is the only place we might touch innerHTML, but try to avoid it.
             UI.favBtn.innerHTML = `<svg class="icon mr-2"><use href="${iconHref}"></use></svg> ${label}`;
        }
    }

    async function show(item) {
        // 4. MEMORY MANAGEMENT
        // Clear previous large strings/images to free memory immediately
        UI.poster.src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="; // Tiny transparent placeholder
        UI.plot.textContent = ""; 
        
        currentStreamId = item.stream_id;
        // Shallow copy input to break reference, but avoid creating deep copies unnecessarily
        currentItemData = item; 

        // Direct Text Updates (Fastest)
        UI.title.textContent = item.name || '';
        UI.rating.textContent = item.rating || 0;
        
        // Handle Image
        // On TV, decoding large images blocks the UI thread. 
        // Ensure PLACEHOLDER_IMG is small in file size.
        const newImg = item.movie_image || item.stream_icon || PLACEHOLDER_IMG;
        UI.poster.src = newImg;

        // Set loading state
        UI.plot.textContent = (typeof t !== 'undefined') ? t('loading') : 'Loading details...';
        
        updateFavButton();

        showPage('page-movie-details');
        pushToNavStack('page-movie-details', { item });
        setTimeout(() => {
            UI.playBtn.focus();
        }, 100);
        try {
            // Fetch extra info
            const data = await fetchXtream({ action: 'get_vod_info', vod_id: item.stream_id }, false);
            
            // Check if user has navigated away while fetch was running
            if (currentStreamId !== item.stream_id) return;

            if (data && data.info) {
                // 5. AVOID OBJECT SPREAD (...)
                // Object spread `{...a, ...b}` creates a NEW object and garbages the old one.
                // On low RAM, this causes "jank". Use Object.assign to mutate.
                Object.assign(currentItemData, data.info, { stream_id: item.stream_id });
                
                const info = data.info;
                
                // Batch DOM updates
                // Using requestAnimationFrame ensures these paint in one frame
                requestAnimationFrame(() => {
                    UI.year.textContent = info.releasedate || info.year || '';
                    UI.duration.textContent = info.duration || '';
                    UI.genre.textContent = info.genre || '';
                    UI.director.textContent = info.director || '';
                    UI.cast.textContent = info.cast || info.actors || '';
                    
                    const desc = info.plot || info.description || (typeof t !== 'undefined' ? t('about_desc') : 'No description.');
                    UI.plot.textContent = desc;

                    // if (info.youtube_trailer) UI.trailerBtn.classList.remove('hidden');
                });
            }
        } catch (e) {
            console.error(e); // Good for debugging on TV
            if (currentStreamId === item.stream_id) {
                UI.plot.textContent = 'Details could not be loaded.';
            }
        }
    }

    return {
        show,
        fetchFullDetails: (item) => show(item) 
    };
})();