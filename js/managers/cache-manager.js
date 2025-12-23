const CacheManager = (function() {
    
    // In-Memory Cache Storage
    const MEMORY_CACHE = {
        live: null,   // { catId: [streams...] }
        vod: null,    // { catId: [streams...] }
        series: null  // { catId: [streams...] }
    };

    const CATEGORY_LIST_CACHE = {
        live: null,
        vod: null,
        series: null
    };

    // Track the active download controller
    let activeAbortController = null;

    // --- Helpers ---

    function getCategoryList(type) {
        if (!userSettings.useCache) return null;
        if (CATEGORY_LIST_CACHE[type]) {
            console.log(`[Cache] Hit for ${type} list`);
            return CATEGORY_LIST_CACHE[type];
        }
        return null;
    }

    function setCategoryList(type, data) {
        if (!userSettings.useCache) return;
        CATEGORY_LIST_CACHE[type] = data;
    }

    function getCategoryItems(type, categoryId) {
        if (!userSettings.useCache) return null;
        if (MEMORY_CACHE[type] && MEMORY_CACHE[type][categoryId]) {
            // console.log(`[Cache] Hit for ${type} items (Cat: ${categoryId})`);
            return MEMORY_CACHE[type][categoryId];
        }
        return null;
    }

    function setCategoryItems(type, categoryId, data) {
        if (!userSettings.useCache) return;
        if (!MEMORY_CACHE[type]) MEMORY_CACHE[type] = {};
        MEMORY_CACHE[type][categoryId] = data;
    }

    function hasAll(type) {
        return !!MEMORY_CACHE[type];
    }

    function setAll(type, dataMap) {
        MEMORY_CACHE[type] = dataMap;
    }

    function clear() {
        MEMORY_CACHE.live = null;
        MEMORY_CACHE.vod = null;
        MEMORY_CACHE.series = null;
        CATEGORY_LIST_CACHE.live = null;
        CATEGORY_LIST_CACHE.vod = null;
        CATEGORY_LIST_CACHE.series = null;
        console.log("[Cache] Cleared memory.");
    }

    // --- Cancellation ---
    function cancel() {
        if (activeAbortController) {
            console.log("[CacheManager] Cancelling current operation...");
            activeAbortController.abort();
            activeAbortController = null;
            if (typeof Loader !== 'undefined') Loader.hide("Cancelled");
            Loader.hide("canceled");
        }
    }

    // --- Advanced Load All Feature ---
    
    /**
     * Loads all streams for a specific type, reporting progress to the Loader.
     * @param {string} type - 'live', 'vod', or 'series'
     * @param {Function} fetcherCallback - The fetchFreshXtream function from api.js
     */
    async function loadAll(type, fetcherCallback) {
        // Cancel any existing background loads first
        cancel();

        const actionMap = {
            vod: "get_vod_streams",
            live: "get_live_streams",
            series: "get_series"
        };

        const action = actionMap[type];
        if (!action) throw new Error("Invalid type for loadAll: " + type);

        // 1. Check if already loaded
        if (MEMORY_CACHE[type]) {
            console.log("loadAll: Data already in memory.");
            return MEMORY_CACHE[type];
        }

        console.log(`[CacheManager] Starting loadAll for ${type}`);
        
        // Create new controller for this request
        activeAbortController = new AbortController();
        const signal = activeAbortController.signal;

        // --- 2. Smart Progress Estimation Setup ---
        // Try to retrieve the last known size for this type from LocalStorage
        let estimatedTotal = null;
        try {
            const stored = localStorage.getItem("XTREAM_LAST_DOWNLOAD_SIZE");
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed[type] && parsed[type] > 0) {
                    estimatedTotal = parsed[type];
                    console.log(`[CacheManager] Using historical size for ${type}: ${(estimatedTotal/1024/1024).toFixed(2)} MB`);
                }
            }
        } catch (e) {
            console.warn("[CacheManager] Failed to read last download stats", e);
        }

        // Initial Loader State
        if (Loader) Loader.show(`LOADING ${type.toUpperCase()}...`);

        let finalLoadedBytes = 0;

        try {
            // 3. Fetch from Network with Progress
            // We pass the signal inside the params object
            const data = await fetcherCallback({ action, signal }, (percent, loaded, total) => {
                finalLoadedBytes = loaded; // Track bytes to save later

                if (Loader) {
                    // Priority 1: Server provided explicit Content-Length (percent is valid)
                    if (percent !== null) {
                        Loader.progress(percent);
                    } 
                    // Priority 2: Use historical data to estimate percentage
                    else if (estimatedTotal) {
                        // Calculate percentage based on last known size
                        // Cap at 99% to avoid confusion if current playlist is larger than history
                        const estimatedPct = Math.min(99, Math.floor((loaded / estimatedTotal) * 100));
                        Loader.progress(estimatedPct);
                    }
                    // Priority 3: Fallback to raw MB display
                    else {
                        // Convert bytes to MB with 1 decimal place
                        const mb = (loaded / (1024 * 1024)).toFixed(1);
                        Loader.show(`DL: ${mb} MB`);
                    }
                }
            });

            // --- 4. Save Download Stats ---
            // Update the historical size for next time
            if (finalLoadedBytes > 0) {
                try {
                    const stored = JSON.parse(localStorage.getItem("XTREAM_LAST_DOWNLOAD_SIZE") || "{}");
                    stored[type] = finalLoadedBytes;
                    localStorage.setItem("XTREAM_LAST_DOWNLOAD_SIZE", JSON.stringify(stored));
                } catch (e) {
                    console.warn("[CacheManager] Failed to save download stats", e);
                }
            }

            // 5. Process & Categorize (Non-blocking)
            if (Loader) {
                Loader.show("PARSING..."); 
            }

            const categorized = {};
            if (Array.isArray(data)) {
                const totalItems = data.length;
                let processed = 0;
                let lastReportTime = Date.now();

                // Process in chunks to prevent UI freeze
                for (const item of data) {
                    // Check cancel during processing loop
                    if (signal.aborted) throw new DOMException("Aborted", "AbortError");

                    const cid = item.category_id || "0";
                    item.stream_type= type;

                    // Filter hidden categories
                    if(userSettings && userSettings.hiddenCategories && userSettings.hiddenCategories.includes(cid)){
                        processed++;
                        continue;
                    }

                    if (!categorized[cid]) categorized[cid] = [];
                    categorized[cid].push(item);

                    processed++;

                    // Update UI every 500 items or ~50ms
                    const now = Date.now();
                    if (processed % 500 === 0 || processed === totalItems) {
                        if (now - lastReportTime > 50) {
                            const pct = Math.floor((processed / totalItems) * 100);
                            
                            if (Loader) {
                                Loader.progress(pct);
                                // Hack to update text specifically for categorization
                                const label = document.getElementById('text-label');
                                if(label) label.textContent = `CATEGORIZING ${pct}%`; 
                            }
                            
                            // Yield to main thread
                            await new Promise(r => setTimeout(r, 0));
                            lastReportTime = now;
                        }
                    }
                }
            }

            // 6. Save to RAM
            MEMORY_CACHE[type] = categorized;
            
            prepareSearchIndex(type);            
            console.log(`[CacheManager] loadAll complete. Cached ${Object.keys(categorized).length} categories.`);
            
            if (Loader) Loader.hide(`Loaded ${type}`);
            
            return categorized;

        } catch (error) {
            // Handle Cancellation Gracefully
            if (error.name === 'AbortError' || (activeAbortController && activeAbortController.signal.aborted)) {
                console.log("[CacheManager] Load operation cancelled by user.");
                if (Loader) Loader.hide("Cancelled");
                return null; 
            }

            console.error("[CacheManager] loadAll failed:", error);
            if (Loader) Loader.hide("Error loading data");
            throw error;
        } finally {
            activeAbortController = null;
        }
    }

    /**
     * Searches for items within the loaded cache for a specific type.
     * @param {string} type - 'live', 'vod', or 'series'
     * @param {string} query - The text to search for
     * @returns {Array} List of matching items
     */
    function search_traditional(type){
        const query = searchState.query;

        console.log("Start SEARCH ",type,query)
        // Return empty if no cache exists for this type
        if (!MEMORY_CACHE[type]) {
            console.warn(`[CacheManager] Cannot search ${type}: Data not loaded in memory.`);
            return [];
        }
        if (!query || query.trim() === "") return [];

        const q = query.toLowerCase();
        const results = [];
        const allCategories = MEMORY_CACHE[type];

        // Iterate through all categories in the cache
        // Using for..in loop is generally faster than Object.values().flat() for large datasets
        for (const catId in allCategories) {
            const items = allCategories[catId];
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                // Check common name fields (VOD uses 'name', Live often uses 'name' or 'stream_display_name')
                const name = item.name || item.stream_display_name || item.title || "";
                
                if (name.toLowerCase().includes(q)) {
                    results.push(item);
                }
            }
        }

        console.log(`[CacheManager] Search for "${query}" in ${type} found ${results.length} results.`);
        return results;
    }

    function normalize(str) {
        return str
            .toLowerCase()
            .replace(/^[a-z0-9]{2}\s?-/gu, "")
            .replace(/[^\p{L}\p{N}\s]/gu, "")
            .trim()
            .replace(/\s+/g, " ");
    }
    

    function fastLev(a, b, maxDist) {
        const aLen = a.length, bLen = b.length;
    
        if (Math.abs(aLen - bLen) > maxDist) return maxDist + 1;
    
        const prev = new Array(bLen + 1);
        const curr = new Array(bLen + 1);
    
        for (let j = 0; j <= bLen; j++) prev[j] = j;
    
        for (let i = 1; i <= aLen; i++) {
            curr[0] = i;
            let minRow = curr[0];
    
            for (let j = 1; j <= bLen; j++) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                curr[j] = Math.min(
                    prev[j] + 1,
                    curr[j - 1] + 1,
                    prev[j - 1] + cost
                );
                if (curr[j] < minRow) minRow = curr[j];
            }
    
            if (minRow > maxDist) return maxDist + 1;
    
            for (let k = 0; k <= bLen; k++) prev[k] = curr[k];
        }
    
        return prev[bLen];
    }
    function prepareSearchIndex(type) {
        const cache = CacheManager.MEMORY_CACHE[type];
        if (!cache) return;
    
        for (const cid in cache) {
            const items = cache[cid];
            for (let i = 0; i < items.length; i++) {
                const raw = items[i].name || items[i].stream_display_name || items[i].title || "";
                const norm = normalize(raw);
    
                // store once, reuse forever
                items[i]._n = norm;
                items[i]._t = norm.split(" ");
            }
        }
    }
    
    function tokenScore(query, tokens) {
        const qLen = query.length;
        const MAX_DIST = qLen <= 5 ? 1 : 2;
        let score  = 0;
        const MAX_VAL = 999;
        for (let i = 0; i < tokens.length; i++) {
            const t = tokens[i];
    
            if (t === query){
                score += 100;
                continue;
            }
            if (t.includes(query) || query.includes(t)) {
                score += 50;
                continue;
            }
    
            const d = fastLev(query, t, MAX_DIST);
            if (d <= MAX_DIST) {
                const s = (50 - d * 20);
                ;
                score += s;
            }
        }
        return score;
    }
    
    function search(type) {
        const query = searchState.query;
        if (!query || query.trim() === "") return [];
        if (!CacheManager.MEMORY_CACHE[type]) return [];

        const q = normalize(query);
        const results = [];
        const cache = CacheManager.MEMORY_CACHE[type];
        
        const MAX_DIST = q.length <= 5 ? 1 : 2;

        for (const cid in cache) {
            const items = cache[cid];
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                item._s = 0;

                if (!item || !item._n || !item._t || !item._t.length) continue;
                // 1️⃣ Exact match (fastest)
                if (item._n === q) {
                    item._s = 999;
                    results.push(item);
                    continue;
                }
                if (item._n.includes(query) || query.includes(item._n)) {
                    item._s = 200;
                    results.push(item);
                    continue;
                }
        
                const d = fastLev(q, item._n, MAX_DIST);
                if (d <= MAX_DIST) {
                    const s = (50 - d * 20);
                    item._s = score;
                    results.push(item);
                    continue;

                }

                // 2️⃣ Token-based scoring
                /*
                const score = tokenScore(q, item._t);
                if (score > 0) {
                    item._s = score;
                    results.push(item);
                    continue;
                }
                */
            }
        }
        if(results.length===0){
            for (const cid in cache) {
                const items = cache[cid];
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    const score = tokenScore(q, item._t);
                    if (score > 0) {
                        item._s = score;
                        results.push(item);
                        continue;
                    }
                }
            }
        }
        results.sort((a, b) => b._s - a._s);
        return results;
    }
    

    return {
        getCategoryList,
        setCategoryList,
        getCategoryItems,
        setCategoryItems,
        hasAll,
        setAll,
        clear,
        loadAll,
        cancel, // Expose cancel
        search,
        tokenScore,
        fastLev,
        prepareSearchIndex,
        get MEMORY_CACHE(){
            return MEMORY_CACHE
        }
    };
})();