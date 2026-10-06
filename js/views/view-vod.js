const ViewVOD = (function() {

    // Internal State
    let currentType = '';
    let currentCategoryList = [];
    let lastLoadedCategoryId = null;
    const contentTypes={
        "vod":["vod","movie"],
        "live":["live","tv","channel"],
        "series":["series","serie","srs"],
    };
    const brokenImages = new Set();

    // --- Optimization: Pre-create Static Icons ---
    const _iconHeart = document.createElement('div');
    _iconHeart.innerHTML = `<svg class=" text-red-500 drop-shadow-md icon_fav hidden"><use href="#icon-heart-full"></use></svg>`;
    
    const _iconStar = document.createElement('div');
    _iconStar.innerHTML = `<svg class="icon-lg text-yellow-400"><use href="#icon-star"></use></svg>`;

    //const PLACEHOLDER_IMG = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // Transparent 1x1

    // --- 1. Initialization (Split View Setup) ---
    async function init(type) {
        currentType = type;
        
        let action = '', title = '';
        $('#header-search-button').onclick = () => toggleSearchBar(true);
        
        if (type === 'vod') {
            action = 'get_vod_categories'; 
            title = typeof t !== 'undefined' ? t('menu_movies') : 'Movies';
            currnetCategory = "movies";
        } else if (type === 'series') {
            action = 'get_series_categories'; 
            title = typeof t !== 'undefined' ? t('menu_series') : 'Series';
            currnetCategory = "series";
        }

        $('#global-header-title').textContent = title;
        
        // Dynamic Translation for "Movies Categories"
        const catSuffix = typeof t !== 'undefined' ? t('vod_categories') : 'Categories';
        $('#vod-category-title').textContent = `${title} ${catSuffix}`;
        
        if (virtualList) cleanupVirtualisation();
        
        const contentArea = $('#vod-content-area');
        if (contentArea) contentArea.style.height = '100%'; 

        $('#content-grid').innerHTML = '';
        $('#content-grid').style.height = '100%'; 
        
        // Translate Empty State
        const emptyState = $('#vod-empty-state');
        const emptyText = emptyState.querySelector('p');
        if(emptyText) emptyText.textContent = typeof t !== 'undefined' ? t('vod_select_hint') : 'Select a category to load content';
        emptyState.classList.remove('hidden');

        showPage('page-content');
        pushToNavStack('page-content', { type, mode: 'split' });
        
        const listContainer = $('#vod-category-list');
        listContainer.innerHTML = '';
        
        try {
            const categories = await fetchXtream({ action });
            if (categories && Array.isArray(categories)) {
                _renderSidebar(categories, type);
            }
        } catch (e) {
            listContainer.innerHTML = '<p class="text-red-500 p-2">Error loading categories</p>';
        }
    }

    // --- 2. Sidebar Rendering ---
    function _renderSidebar(categories, type) {
        const listContainer = $('#vod-category-list');
        listContainer.innerHTML = '';
        
        let visibleCategories = categories.filter(cat =>
            !userSettings.hiddenCategories.includes(String(cat.category_id))
        );

        visibleCategories.sort((a, b) => {
            const isPinnedA = userSettings.pinnedCategories.includes(String(a.category_id));
            const isPinnedB = userSettings.pinnedCategories.includes(String(b.category_id));
            if (isPinnedA && !isPinnedB) return -1;
            if (!isPinnedA && isPinnedB) return 1;
            return 0;
        });
        
        // Translate "Favorites"
        if (userSettings.favorites.length > 0) {
            const favLabel = typeof t !== 'undefined' ? t('btn_favorite') : 'Favorites';
            listContainer.appendChild(_createSidebarItem(favLabel, 'favorites', type, { special: 'favorites' }));
        }
        
        // Translate "Continue Watching" (using English fallback if key missing)
        const watchingItems = Object.values(userSettings.watching).filter(w => w.stream_type === type && w.progress_sec > 0);
        if (watchingItems.length > 0) {
            listContainer.appendChild(_createSidebarItem('Continue Watching', 'watching', type, { special: 'watching' }));
        }

        visibleCategories.forEach(cat => {
            const _name_split = cat.category_name.split('-');
            const _name = _name_split.length >1 ? _name_split.slice(1).join('-').trim() : cat.category_name;
            listContainer.appendChild(_createSidebarItem(_name, cat.category_id, type));
        });

        const first = listContainer.querySelector('.nav-item');
        if (first) first.focus();
    }

    function _createSidebarItem(name, id, type, context = {}) {
        const btn = document.createElement('button');
        btn.className = 'nav-item w-full text-left p-4 rounded bg-card text-main hover:bg-opacity-80 mb-1 font-semibold truncate transition-colors';
        btn.textContent = name;
        btn.dataset.id = id;
        
        let iconHtml = '';
        if(id==='favorites') iconHtml = `<svg class="icon-lg mr-2 inline-block text-red-500 icon_fav"><use href="#icon-heart-full"></use></svg>`;
        else if(id==='watching') iconHtml = `<svg class="icon-lg mr-2 inline-block text-primary icon_fav"><use href="#icon-watching"></use></svg>`;
        else if(userSettings.pinnedCategories.includes(String(id))) iconHtml = '<span aria-hidden="true">📌 </span>';

        btn.innerHTML = iconHtml;
        btn.appendChild(document.createTextNode(name));
        if (userSettings.pinnedCategories.includes(String(id))) {
            const sr = document.createElement('span');
            sr.className = 'sr-only';
            sr.textContent = `, ${typeof t !== 'undefined' ? t('aria_pinned') : 'Pinned'}`;
            btn.appendChild(sr);
        }

        btn.onclick = async () => {
            $$('#vod-category-list .nav-item').forEach(b => b.classList.remove('active-category'));
            btn.classList.add('active-category');
            
            await loadContent(type, id, name, context);

            if (virtualList && virtualListItems.length > 0) {
                const targetIndex = focusedVirtualIndex || 0;
                virtualList.highlight(targetIndex);
                setTimeout(() => {
                    const gridItem = document.querySelector('.vitem.focused');
                    if (gridItem) gridItem.focus();
                    $('#vod-category-list').classList.add("infocused-div");
                    $('#vod-content-area').classList.remove("infocused-div");
                    

                }, 50); 
            }
        };
        
        return btn;
    }

    // --- 3. Content Loading ---
    async function loadContent(type, categoryId, categoryName, context = {}) {
        if (lastLoadedCategoryId === categoryId && virtualList && categoryId!=="searching") return;
        lastLoadedCategoryId = categoryId;

        if (virtualList) cleanupVirtualisation();
        
        $('#content-grid').style.height = '100%';
        $('#content-grid').innerHTML = '';
        
        $('#vod-empty-state').classList.add('hidden');
        $('#global-header-title').textContent = `${categoryName}  (-)`;

        let items = [];
        const ct_types = contentTypes[type] || [type,];

        try {
            if (context.special === 'watching') {
                const ct_types = contentTypes[type] || [type,];
                items = Object.values(userSettings.watching)
                    .filter(i => ct_types.includes(i.stream_type) && i.progress_sec > 0 && i.item)
                    .map(w => w.item);
                    
            } else if (context.special === 'favorites') {
                items = userSettings.favorites.filter(i => ct_types.includes(i.stream_type) );
            } else if (context.special === 'searching') {
                items = CacheManager.search(type);
                // UPDATE: Translate Search Title
                categoryName = typeof t !== 'undefined' ? t('title_searching') : "Search Results";
            } else {
                let action = (type === 'vod') ? 'get_vod_streams' : 'get_series';
                const params = { action };
                if (categoryId !== 'all') params.category_id = categoryId;
                items = await fetchXtream(params);
            }
            $('#global-header-title').textContent = `${categoryName}  (${items.length})`;
            brokenImages .clear();

            renderItems(items, type, context);

        } catch (e) {
            console.log(e);
            $('#content-grid').innerHTML = '<p class="text-red-500 text-center mt-10">Error loading content</p>';
        }
    }

    function renderItems(items, type, context = {}) {

        const grid = $('#content-grid');
        grid.innerHTML = ''; 
        
        if (!items || items.length === 0) {
            // Translate No Items
            const msg = typeof t !== 'undefined' ? t('No items found.') : 'No items found.';
            grid.innerHTML = `<p class="text-alt p-10 text-center">${msg}</p>`;
            return;
        }

        searchState.originalItems = items;
        virtualListItems = items;
        virtualListType = type;
        virtualListContext = context;
        focusedVirtualIndex = 0;

        virtualListMap = new Map();
        virtualListItems.forEach(it => {
            const key = it.stream_id || it.series_id;
            if (key) virtualListMap.set(String(key), it);
        });

        virtualList = createVirtualList({
            container: grid,
            itemCount: virtualListItems.length,
            renderItem: _renderVirtualItem,
            cols: userSettings.gridCols || 5, 
        });
    }

    // --- 4. OPTIMIZED Virtual Item Rendering ---
    function _renderVirtualItem(index, dom) {
        const item = virtualListItems[index];
        if(!dom || !item) {
            if(dom) dom.style.display = 'none';
            return;
        }
        
        const stream_id = String ( item.stream_id || item.series_id);
        // Calculate poster early so we can use it in the dirty check
        const poster = item.movie_image || item.icon || item.stream_icon|| item.cover || PLACEHOLDER_IMG;

        // --- DIRTY CHECKING (Fixed) ---
        if (dom.__lastStreamId === stream_id) {
             if (index === focusedVirtualIndex) dom.classList.add('focused');
             else dom.classList.remove('focused');
             dom.setAttribute('aria-label', _cardLabel(item, calcRating(item), stream_id, getwatchingProgress(stream_id)));

             // FIX: If we are NOT scrolling, but the current image is a placeholder (or starts with data:),
             // force the real image to load.
             const isErrroed = brokenImages.has(stream_id);
             if (virtualList && !virtualList.isScrolling() && !isErrroed) {
                 if (
                    (dom.__v.img.src==PLACEHOLDER_IMG && poster!=PLACEHOLDER_IMG) ||
                    (dom.__v.img.src!=PLACEHOLDER_IMG && poster!=PLACEHOLDER_IMG && dom.__v.img.src != poster)
                ) {
                     dom.__v.img.src = poster;
                     dom.__v.imgCurrent = poster;
                 }
             }else if(isErrroed && dom.__v.imgCurrent!==ERRORED_IMG){
                dom.__v.img.src = ERRORED_IMG;
                dom.__v.imgCurrent = ERRORED_IMG;

             }
             return; 
        }

        // Setup DOM Structure (Once)
        if (!dom.__v) {
            dom.__v = {};
            dom.classList.add('nav-item');
            dom.classList.add('virtual-card');
            dom.setAttribute('tabindex', '-1');
            dom.setAttribute('role', 'button');

            const inner = document.createElement('div');
            inner.className = 'virtual-card-inner';
            dom.appendChild(inner);
            dom.__v.inner = inner;
            
            const img = document.createElement('img');

            img.className = 'w-full h-full object-cover transition-opacity duration-200';
            img.onerror = function() { 
                this.src = ERRORED_IMG;
                this.imgCurrent = ERRORED_IMG;
                if(this.__currentStreamId) brokenImages.add(this.__currentStreamId);
            };
            inner.appendChild(img);
            dom.__v.img = img;

            const favIcon = _iconHeart.cloneNode(true).firstChild;
            inner.appendChild(favIcon);
            dom.__v.favIcon = favIcon;

            const ratingBox = document.createElement('div');
            ratingBox.className = 'rating_box bg-black/70 rounded-full font-bold text-yellow-400 flex items-center gap-1';
            
            const starIcon = _iconStar.cloneNode(true).firstChild;
            ratingBox.appendChild(starIcon);
            
            const ratingVal = document.createElement('span');
            ratingVal.className = 'rating-val';
            ratingBox.appendChild(ratingVal);
            
            inner.appendChild(ratingBox); 
            dom.__v.ratingBox = ratingBox;
            dom.__v.ratingVal = ratingVal;

            const bottom = document.createElement('div');
            bottom.className = 'absolute bottom-0 left-0 right-0 p-1 pt-3 bg-gradient-to-t from-black/100 to-transparent';

            // NEW: Episode Info Label
            const epInfo = document.createElement('div');
            epInfo.className = 'text-lg text-primary font-bold truncate mb-1';
            epInfo.style.display = 'none';
            bottom.appendChild(epInfo);
            dom.__v.epInfo = epInfo;

            const progressBar = document.createElement('div');
            progressBar.className = 'card-progress-bar progress-bar w-full mb-1 hidden';
            const progressInner = document.createElement('div');
            progressInner.className = 'card-progress-bar-inner progress-bar-inner';
            progressBar.appendChild(progressInner);
            bottom.appendChild(progressBar);
            dom.__v.progressInner = progressInner;
            


            const nameEl = document.createElement('h4');
            nameEl.className = 'card-name font-semibold text-main truncate'; 
            bottom.appendChild(nameEl);
            dom.__v.nameEl = nameEl;

            inner.appendChild(bottom);
            dom.onclick = () => _onVirtualCardClick(dom);
        }

        // --- Data Binding ---
        dom.dataset.streamId = stream_id;
        dom.dataset.virtualIndex = index;
        dom.dataset.type = virtualListType;
        dom.__lastStreamId = stream_id; // Mark as dirty-checked
        if (dom.__v && dom.__v.img) {
            dom.__v.img.__currentStreamId = stream_id;
        }
        if (!dom.__v.imgCurrent) dom.__v.imgCurrent = ""; // init

        if (virtualList && virtualList.isScrolling()) {
            // Only apply placeholder if it changed
            if (dom.__v.imgCurrent !== PLACEHOLDER_IMG) {
            }
            // we add placeholder for all nodes , to make the crolling faaast; (scrolling through the posters is sloooow)
            dom.__v.img.src = PLACEHOLDER_IMG;
            dom.__v.imgCurrent = PLACEHOLDER_IMG;

        } else {
            // Only load real poster when not scrolling
            const isErrored= brokenImages.has(stream_id);
            if (dom.__v.imgCurrent !== poster && !isErrored) {
                dom.__v.img.src = poster;
                dom.__v.imgCurrent = poster;
            }else if(isErrored && dom.__v.imgCurrent!==ERRORED_IMG){
                dom.__v.img.src = ERRORED_IMG;
                dom.__v.imgCurrent = ERRORED_IMG;
            }
        }

        const rating = calcRating(item);
        dom.__v.ratingVal.textContent = Number(rating).toFixed(1);
        dom.__v.ratingBox.style.display = (rating > 0) ? 'flex' : 'none';

        if (isFavorite(stream_id)) {
            dom.__v.favIcon.classList.remove('hidden');
        } else {
            dom.__v.favIcon.classList.add('hidden');
        }

        // --- Progress & Episode Info Logic ---
        const progressInfo = getwatchingProgress(stream_id);
        
        if(progressInfo && progressInfo.progress_sec > 0){
            const pct = (progressInfo && progressInfo.duration_sec > 0) ? (progressInfo.progress_sec / progressInfo.duration_sec) * 100 : 0;
            dom.__v.progressInner.style.width = `${pct}%`;
            dom.__v.progressInner.parentElement.classList.remove('hidden');
            
            // SHOW LAST WATCHED EPISODE
            if (progressInfo.stream_type === 'series' && progressInfo.episode) {
                const s = progressInfo.episode.season || 0;
                const e = progressInfo.episode.episode_num || 0;
                dom.__v.epInfo.textContent = `S${s} E${e}`;
                dom.__v.epInfo.style.display = 'block';
            } else {
                 dom.__v.epInfo.style.display = 'none';
            }
            
        } else {
            dom.__v.progressInner.parentElement.classList.add('hidden');
            dom.__v.epInfo.style.display = 'none';
        }

        dom.__v.nameEl.textContent = item.name || '';
        dom.setAttribute('aria-label', _cardLabel(item, rating, stream_id, progressInfo));

        if (index === focusedVirtualIndex) dom.classList.add('focused');
        else dom.classList.remove('focused');

        dom.style.display = 'block';
    }

    // Spoken by Voice Guide when a card gets focus: "Title, Rating 7.5, Favorite, S1 E2"
    function _cardLabel(item, rating, stream_id, progressInfo) {
        const tr = (k, f) => (typeof t !== 'undefined' ? t(k) : f);
        const parts = [item.name || ''];
        if (rating > 0) parts.push(`${tr('aria_rating', 'Rating')} ${Number(rating).toFixed(1)}`);
        if (isFavorite(stream_id)) parts.push(tr('btn_favorite', 'Favorite'));
        if (progressInfo && progressInfo.progress_sec > 0) {
            if (progressInfo.stream_type === 'series' && progressInfo.episode) {
                parts.push(`${tr('aria_season', 'Season')} ${progressInfo.episode.season || 0} ${tr('aria_episode', 'Episode')} ${progressInfo.episode.episode_num || 0}`);
            } else if (progressInfo.duration_sec > 0) {
                parts.push(`${Math.round(progressInfo.progress_sec / progressInfo.duration_sec * 100)}% ${tr('aria_watched', 'watched')}`);
            }
        }
        return parts.join(', ');
    }

    function _onVirtualCardClick(dom) {
        const streamId = dom.dataset.streamId;
        const type = dom.dataset.type;
        if (!streamId) return;
        const currentItem = virtualListMap && virtualListMap.get(streamId);
        if (!currentItem) return;

        if (type === 'vod') {
            if(typeof handleMovieClick === 'function') handleMovieClick(currentItem);
        }
        else if (type === 'series') loadSeriesInfo(currentItem);
    }

    // ... (rest of the file: loadSeriesInfo, _loadSeasonEpisodes - unchanged) ...
    async function loadSeriesInfo(seriesItem) {
        Loader.show("");
        try {
            const info = await fetchXtream({ action: 'get_series_info', series_id: seriesItem.series_id });
            if (!info) throw new Error("No info");
            
            $('#series-cover-image').src = info?.info?.cover || seriesItem?.cover || PLACEHOLDER_IMG;
            $('#series-title').textContent = info?.info?.name || seriesItem?.name;
            $('#series-plot').textContent = info?.info?.plot || 'No description.';
            $('#series-year').textContent = info?.info?.releaseDate || seriesItem?.releaseDate || '';

            const fullSeriesItem = { ...seriesItem, ...info?.info, series_id: seriesItem?.series_id };
            const seriesId = seriesItem.series_id;
            
            const seriesFavButton = $('#series-fav-button');
            seriesFavButton.onclick = (e) => {
                e.stopPropagation();
                toggleFavorite(seriesId, 'series', fullSeriesItem); 
            };
            
            const seasonTabs = $('#series-seasons-tabs');
            seasonTabs.innerHTML = '';
            const episodesBySeason = info.episodes;
            
            const seasonNumbers = Object.keys(episodesBySeason).sort((a, b) => Number(a) - Number(b));
            seasonNumbers.forEach((seasonNum) => {
                const tab = document.createElement('button');
                tab.className = 'nav-item season-tab px-4 py-2 rounded-lg bg-alt text-alt font-semibold';
                tab.textContent = `${typeof t !== 'undefined' ? t('aria_season') : 'Season'} ${seasonNum}`;
                tab.onclick = () => {
                    $$('.season-tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    _loadSeasonEpisodes(episodesBySeason[seasonNum], fullSeriesItem);
                };
                seasonTabs.appendChild(tab);
            });

            if (seasonNumbers.length > 0) {
                _loadSeasonEpisodes(episodesBySeason[seasonNumbers[0]], fullSeriesItem);
                setTimeout(() => { const first = $('.season-tab'); if(first) first.classList.add('active'); }, 0);
            }

            showPage('page-series-details');
            pushToNavStack('page-series-details', { seriesItem: fullSeriesItem });

        } catch (e) {
            showError("Could not load series.");
            console.log(e)
        } finally { Loader.hide("sersinfo"); }
    }

    function _loadSeasonEpisodes(episodes, seriesItem) {
        const episodesList = $('#series-episodes-list');
        episodesList.innerHTML = '';
        episodes.forEach(episode => {
            const epCard = document.createElement('button');
            epCard.className = 'nav-item w-full p-4 rounded-lg bg-card text-left text-main hover:bg-opacity-80 flex justify-between items-center';
            // UPDATE: Check for specific episode progress
            const progress = getwatchingProgress(seriesItem.series_id, episode.id);
            const pct = (progress && progress.duration_sec > 0) ? (progress.progress_sec / progress.duration_sec) * 100 : 0;
            epCard.innerHTML = `<div class="flex-1"><span class="text-primary font-bold">E${episode.episode_num}</span>: <span class="ep-title"></span>${pct>0?`<div class="progress-bar w-full mt-2" aria-hidden="true"><div class="progress-bar-inner" style="width:${pct}%;"></div></div>`:''}</div><span class="text-alt text-lg">${episode.duration||''}</span>`;
            epCard.querySelector('.ep-title').textContent = episode.title || '';
            const epLabel = `${typeof t !== 'undefined' ? t('aria_episode') : 'Episode'} ${episode.episode_num}, ${episode.title || ''}${episode.duration ? ', ' + episode.duration : ''}${pct > 0 ? `, ${Math.round(pct)}% ${typeof t !== 'undefined' ? t('aria_watched') : 'watched'}` : ''}`;
            epCard.setAttribute('aria-label', epLabel);
            epCard.onclick = () => {
                if(typeof playEpisode === 'function') playEpisode(episode, seriesItem, progress ? progress.progress_sec : 0);
            };
            episodesList.appendChild(epCard);
        });
        const first = episodesList.querySelector('.nav-item');
        if (first) first.focus();
    }
    async function search(){
        return loadContent(currentType, "searching", "searching", {special:"searching"});
    }
    return {
        loadCategories: (type) => init(type), 
        loadSeriesInfo,
        search,
        get brokenImages(){
            return brokenImages;
        },
        _iconHeart,
        _iconStar,
    };
})();