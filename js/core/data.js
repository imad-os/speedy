// === Favorites & Watching Progress Logic ===

function isFavorite(stream_id) {
    if (!stream_id) return false;
    // Check if any item in the array matches the ID
    return userSettings.favorites.some(item => 
        String(item.stream_id || item.series_id) === String(stream_id)
    );
}

function toggleFavorite(stream_id, type, item) {
    if (!stream_id) return false;  
    
    const idStr = String(stream_id);
    let added = false;
    
    if (isFavorite(idStr)) {
        // Remove: Filter out the item with matching ID
        userSettings.favorites = userSettings.favorites.filter(fav => 
            String(fav.stream_id || fav.series_id) !== idStr
        );
        console.log("Removed from favorites");
        added = false;
    } else {
        if (item) {
            // Add: Push the FULL item object
            // Ensure stream_type is set so we can filter by 'vod'/'series'/'live' later
            const stream_type = item.stream_id ? "vod" : "series";
            const favItem = { ...item, stream_type: item.stream_type||stream_type };
            userSettings.favorites.push(favItem);
            console.log("Added to favorites");
            added = true;
        } else {
            console.warn("Cannot add favorite: Item data missing");
            return false;
        }
    }
    
    saveUserSettings();
    
    // UPDATE: Translate Alert
    const msg = added ? 
        (typeof t !== 'undefined' ? t('msg_fav_added') : "Added to Favorites") : 
        (typeof t !== 'undefined' ? t('msg_fav_removed') : "Removed from Favorites");
        
    showAlert(msg);
    refreshItemProps(item);
    ViewDetails.updateFavButton();
    playerOverlay.updateFavIcon();
    return added;
}

function getwatchingProgress(id, episode_id = null) {
    const record = userSettings.watching[String(id)];
    if (!record) return null;

    if (record.stream_type === 'series' && episode_id) {
        if (record.episodes && record.episodes[String(episode_id)]) {
            return record.episodes[String(episode_id)];
        }
        if (record.episode && String(record.episode.id) === String(episode_id)) {
            return record; 
        }
        
        return null;
    }
    return record;
}

function saveProgress(item, currentTime, duration, type, episodeData = null) {
    if (!item || !duration || duration === 0) return;

    let idStr;

    if (type === 'series' && episodeData) {
        idStr = String(item.series_id);
        const episodeId = String(episodeData.id || episodeData.stream_id);
        
        // 1. Get existing series record or create a new container
        let seriesRecord = userSettings.watching[idStr];
        if (!seriesRecord) {
            seriesRecord = {
                stream_type: 'series',
                item: item,
                episodes: {} // Container for individual episode progress
            };
        }

        // 2. Create the progress object for THIS specific episode
        const episodeProgress = {
            progress_sec: Math.floor(currentTime),
            duration_sec: Math.floor(duration),
            episode: episodeData,
            last_updated: Date.now()
        };

        // 3. Save specific episode progress into the 'episodes' map
        if (!seriesRecord.episodes) seriesRecord.episodes = {};
        seriesRecord.episodes[episodeId] = episodeProgress;

        // 4. Update the "Main" Series record to reflect this as the "Last Watched"
        // This ensures the Series Card on the UI shows the progress of this specific episode
        seriesRecord.progress_sec = episodeProgress.progress_sec;
        seriesRecord.duration_sec = episodeProgress.duration_sec;
        seriesRecord.episode = episodeData; // Store last watched episode metadata at root
        seriesRecord.last_updated = Date.now();

        // 5. Save back to global settings
        userSettings.watching[idStr] = seriesRecord;

    } else if (type === 'vod') {
        idStr = String(item.stream_id); 
        const progressData = {
            progress_sec: Math.floor(currentTime),
            duration_sec: Math.floor(duration),
            stream_type: 'vod',
            item: item,
            last_updated: Date.now()
        };
        userSettings.watching[idStr] = progressData;
    } else {
        return; 
    }
}

function filterContent() {
    const q = searchState.query.toLowerCase().trim();
    let filtered = [];
    
    // 1. Filter Data
    if (!q) {
        filtered = searchState.originalItems;
    } else {
        filtered = searchState.originalItems.filter(item => 
            (item.name || '').toLowerCase().includes(q)
        );
    }
    console.log("Filtered items count:", filtered.length);
    // 2. Determine Context and Re-render
    return filtered;
}

function toggleCacheAllItems(){
    userSettings.cacheAllCategorieItems = !userSettings.cacheAllCategorieItems;
    updateSettingsCache();
}
function updateSettingsCache(){
    if(userSettings.cacheAllCategorieItems){
        $("#btn-toggle-cache .custom-checkbox").classList.add("checked")
    }else{
        $("#btn-toggle-cache .custom-checkbox").classList.remove("checked")

    }
    $("#btn-toggle-cache").setAttribute('aria-pressed', userSettings.cacheAllCategorieItems ? 'true' : 'false');
}