const ViewLiveTV = (function() {
    
    let currentPreviewStreamId = null;

    async function init() {
        $('#global-header-title').textContent = typeof t !== 'undefined' ? t('menu_live') : 'Live TV';
        $('#header-search-button').onclick = () => toggleSearchBar(true);
        
        // Translate Labels
        const catsLabel = $('#live-categories-list').previousElementSibling.querySelector('h3');
        if(catsLabel) catsLabel.textContent = typeof t !== 'undefined' ? t('live_categories') : 'Categories';
        
        const channelsLabel = $('#live-channels-title');
        if(channelsLabel) channelsLabel.textContent = typeof t !== 'undefined' ? t('live_select_category') : 'Select Category';

        showPage('page-live-tv');
        pushToNavStack('page-live-tv');
        
        const categoryList = $('#live-categories-list');
        categoryList.innerHTML = '';
        $('#live-channels-list').innerHTML = ''; 
        
        // Clear details panel
        $('#live-channel-name').textContent = '';
        const previewHint = typeof t !== 'undefined' ? t('live_preview_hint') : 'Select a channel to preview';
        $('#live-preview-container p').textContent = previewHint;
        
        $('#live-channel-epg').innerHTML = `<p class="text-alt">${typeof t !== 'undefined' ? t('live_preview_hint') : 'Select a channel'}</p>`;

        try {
            const categories = await fetchXtream({ action: 'get_live_categories' });
            categoryList.innerHTML = ''; 
            
            if (categories && Array.isArray(categories)) {
                let visibleCategories = categories.filter(cat => !userSettings.hiddenCategories.includes(String(cat.category_id)));
                
                visibleCategories.sort((a, b) => {
                    const isPinnedA = userSettings.pinnedCategories.includes(String(a.category_id));
                    const isPinnedB = userSettings.pinnedCategories.includes(String(b.category_id));
                    if (isPinnedA && !isPinnedB) return -1;
                    if (!isPinnedA && isPinnedB) return 1;
                    return 0;
                });
                if (userSettings.favorites.length > 0) {
                     // Translate 'Favorites'
                     const favLabel = typeof t !== 'undefined' ? t('btn_favorite') : 'Favorites';
                     categoryList.appendChild(_createCategoryItem(favLabel, 'favorites'));
                }
                
                visibleCategories.forEach(cat => {
                    categoryList.appendChild(_createCategoryItem(cat.category_name, cat.category_id));
                });
                
                const first = categoryList.querySelector('.nav-item');
                if(first) first.focus();
            }
        } catch (e) { 
            categoryList.innerHTML = '<p class="text-red-500 p-2">Error loading categories</p>'; 
        }
    }

    function _createCategoryItem(name, id) {
        const btn = document.createElement('button');
        btn.className = 'nav-item w-full text-left p-3 pl-13 rounded bg-card text-main hover:bg-opacity-80 mb-1 text-sm font-semibold truncate';
        const iconHtml="";
        if(userSettings.pinnedCategories.includes(String(id))) iconHtml = '📌 ';
        // UPDATE: Use Sprite for Favorites
        if (id === 'favorites') {
            const favIcon = ViewVOD._iconHeart.cloneNode(true);
            favIcon.firstChild.classList.remove("hidden")
            btn.innerHTML = `${favIcon.innerHTML} ${name}`;
        } else {
            btn.textContent = `${iconHtml}${name}`;
        }
        
        btn.dataset.id = id;
        btn.onclick = () => loadChannels(id, name);
        return btn;
    }

    async function loadChannels(categoryId, categoryName) {
        // Highlight Category
        $$('#live-categories-list .nav-item').forEach(b => b.classList.remove('active-category'));
        const currnetCat = $('#live-categories-list .nav-item[data-id="' + categoryId + '"]');
        if(currnetCat) {
            currnetCat.classList.add('active-category');
        }

        const channelList = $('#live-channels-list');
        $('#live-channels-title').textContent = categoryName;
        channelList.innerHTML = '';
        
        try {
            let streams = [];
            if (categoryId === 'favorites') {
                 streams = userSettings.favorites.filter(item => item && item.stream_type === 'live');
            } else {
                streams = await fetchXtream({ action: 'get_live_streams', category_id: categoryId });
            }
            
            // Set search context
            searchState.originalItems = streams || [];
            
            renderChannels(streams);
        } catch (e) { 
            channelList.innerHTML = '<p class="text-red-500 p-2">Error loading channels</p>'; 
        }
    }

    function renderChannels(streams) {
        const channelList = $('#live-channels-list');
        channelList.innerHTML = '';
        
        if (!streams || streams.length === 0) {
            // Translate 'No channels'
            const msg = typeof t !== 'undefined' ? t('No items found.') : 'No channels found.';
            channelList.innerHTML = `<p class="text-alt p-2">${msg}</p>`;
            return;
        }
        
        streams.forEach(stream => {
            const favIcon = ViewVOD._iconHeart.cloneNode(true).firstChild;
            const fav = isFavorite(stream.stream_id);
            if(fav){
                favIcon.classList.remove("hidden");
            }
            const btn = document.createElement('button');
            btn.dataset.id=stream.stream_id;
            btn.className = 'nav-item w-full flex items-center gap-3 p-2 rounded bg-card text-main hover:bg-opacity-80 mb-1 text-sm text-left';
            const iconSrc = stream.stream_icon || 'img/tv-icon.png'; 
            btn.innerHTML = `<img src="${iconSrc}" class="w-8 h-8 object-contain bg-black rounded" onerror="this.style.display='none'"><span class="truncate flex-1">${stream.name}</span>`;

            btn.appendChild(favIcon)

            btn.dataset.item = JSON.stringify(stream);
            btn.onclick = () => _handleChannelClick(stream, btn);
            channelList.appendChild(btn);
        });
        
        if (!channelList.contains(document.activeElement)) {
            const first = channelList.querySelector('.nav-item');
            if(first) first.focus();
        }
    }

    function _handleChannelClick(stream, btnElement) {
        // 1. Update Details Panel
        const nameEl = $('#live-channel-name');
        const epgEl = $('#live-channel-epg');
        
        if (nameEl) nameEl.textContent = stream.name;
        if (epgEl) {
            const epgTitle = stream.epg_title || "No Program Information";
            
            // Translate Hints
            const hintPlay = typeof t !== 'undefined' ? t('live_hint_play') : 'Press OK to play.';
            const hintFull = typeof t !== 'undefined' ? t('live_hint_fullscreen') : 'Press OK again for Fullscreen.';
            
            epgEl.innerHTML = `
                <p class="text-lg text-alt mb-2">${epgTitle}</p>
                <div class="text-lg text-gray-300 mt-4">
                    <p>Stream ID: ${stream.stream_id}</p>
                    <p>${hintPlay}</p>
                    <p>${hintFull}</p>
                </div>
            `;
        }

        // 2. Highlight List Item
        $$('#live-channels-list .nav-item').forEach(b => b.classList.remove('active-category'));
        btnElement.classList.add('active-category');

        // 3. Play Logic
        if (currentPreviewStreamId === stream.stream_id) {
            // Already playing -> Fullscreen
            if (typeof goFullscreenLive === 'function') {
                goFullscreenLive(); 
            }
        } else {
            // New Channel -> Preview
            currentPreviewStreamId = stream.stream_id;
            if (typeof playLive === 'function') {
                playLive(stream, !PlayerController.currentState.isFullscreen);
            }
        }
    }

    return {
        init,
        loadChannels,
        renderChannels,
        currentPreviewStreamId
    };
})();