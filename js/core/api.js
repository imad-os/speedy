// === API Interaction Layer ===

// Helpers
function nonBlockingParse(text) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            try { resolve(JSON.parse(text)); } catch (e) { reject(e); }
        }, 0);
    });
}

const ACTION_TYPE_MAP = {
    "get_live_categories": "live",
    "get_vod_categories": "vod",
    "get_series_categories": "series",
    "get_live_streams": "live",
    "get_vod_streams": "vod",
    "get_series": "series"
};

function isCategoryListAction(action) {
    return action.includes("_categories");
}
function isCategoryItemsAction(action) {
    return action === "get_live_streams" || action === "get_vod_streams" || action === "get_series";
}


/**
 * Fetch with Download Progress Support
 * @param {Object} params - API parameters (may include { signal })
 * @param {Function} [onProgress] - Callback(percent, loaded, total)
 */
async function fetchFreshXtream(params, onProgress) {
    console.log("Xtream API Request:", params.action);

    if (!xtreamConfig || !xtreamConfig.host) {
        if(typeof Loader !== 'undefined') Loader.hide("");
        showError("Invalid playlist configuration.");
        throw new Error("Invalid playlist configuration");
    }

    // Extract signal so it doesn't get stringified into URL params
    const { signal, ...apiParams } = params || {};

    const urlParams = new URLSearchParams({
        username: xtreamConfig.username,
        password: xtreamConfig.password,
        ...apiParams
    });

    const url = `${apiBaseUrl}?${urlParams.toString()}`;

    try {
        let response;
        try {
            // Pass signal to safeFetch
            response = await safeFetch(url, { signal });
        } catch (err) {   
            // If aborted, rethrow immediately to skip error modals
            if (err.name === 'AbortError' || err === 'ABORTED') {
                throw err;
            }

            let message="Unexpected error occurred";
            switch (err) {
                case "NO_INTERNET":
                    message = "No Internet Connection. Check your Wi-Fi or Ethernet.";
                    break;
                case "BAD_RESPONSE":
                    message = "Server returned an error. Please try again later.";
                    break;
                case "TIMEOUT":
                    message = "Connection timed out. The server took too long to respond.";
                    break;
                case "FETCH_ERROR":
                    message = "Cannot reach server. Please try again later.";
                    break;
                default:
                    message = "Unexpected error occurred.";
                    break;
            }
            showErrorModal("Internet Error", message, err)
            return false;
        }

        // If onProgress is provided and streams are supported, use the reader
        if (onProgress && response.body && response.body.getReader) {
            const contentLength = response.headers.get('Content-Length');
            const totalBytes = contentLength ? parseInt(contentLength, 10) : null;
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            
            let receivedBytes = 0;
            let chunks = [];
            let lastEmit = Date.now();

            try {
                while(true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    chunks.push(value);
                    receivedBytes += value.length;

                    // Throttle progress updates (every 80ms)
                    const now = Date.now();
                    if (now - lastEmit > 80) {
                        const pct = totalBytes ? Math.min(100, Math.round((receivedBytes / totalBytes) * 100)) : null;
                        onProgress(pct, receivedBytes, totalBytes);
                        lastEmit = now;
                    }
                }
            } catch (streamErr) {
                // Handle read aborts
                if (streamErr.name === 'AbortError') {
                    throw streamErr; 
                }
                throw streamErr;
            }
            
            const finalPct = totalBytes ? 100 : null;
            onProgress(finalPct, receivedBytes, totalBytes);

            let fullText = '';
            for (const chunk of chunks) {
                fullText += decoder.decode(chunk, { stream: true });
            }
            fullText += decoder.decode(); 

            const data = await nonBlockingParse(fullText);
            if (data.user_info && data.user_info.auth === 0) throw new Error("Auth failed");
            return data;

        } else {
            // Fallback for no progress support
            if (onProgress) onProgress(null, 0, null); 
            const text = await response.text();
            if (onProgress) onProgress(100, text.length, text.length); 
            
            const data = await nonBlockingParse(text);
            if (data.user_info && data.user_info.auth === 0) throw new Error("Auth failed");
            return data;
        }

    } catch (error) {
        // Suppress UI alerts for user cancellations
        if (error.name === 'AbortError') {
            throw error;
        }

        console.error('Fetch error:', error);
        if(typeof showError === 'function') showError("Network Error: " + error.message);
        throw error;
    }
}

// --- Public Wrapper (With Caching & LoadAll) ---
async function fetchXtream(params, loading = true) {
    if (loading && typeof Loader !== 'undefined') Loader.show("");

    const action = params.action;
    const type = ACTION_TYPE_MAP[action];
    const categoryId = params.category_id;
    const useCache = (typeof userSettings !== 'undefined' && userSettings.useCache);
    if(isTestMode){
        return getTestModeApi(action);
    }
    try {
        // --- FEATURE: Load All Logic ---
        if (type && isCategoryListAction(action)) {
            if (typeof userSettings !== 'undefined' && userSettings.cacheAllCategorieItems) {
                
                await CacheManager.loadAll(type, fetchFreshXtream);
                
            }
        }

        // 1. Check Cache via Manager
        if (type && useCache) {
            if (isCategoryListAction(action)) {
                const cached = CacheManager.getCategoryList(type);
                if (cached) {
                    if (loading && typeof Loader !== 'undefined') Loader.hide("Cache Hit");
                    return cached;
                }
            } else if (isCategoryItemsAction(action) && categoryId) {
                const cached = CacheManager.getCategoryItems(type, categoryId);
                if (cached) {
                    if (loading && typeof Loader !== 'undefined') Loader.hide("Cache Hit");
                    return cached;
                }
            }
        }

        // 2. Network Fetch (Standard)
        const data = await fetchFreshXtream(params);

        // 3. Save to Cache via Manager
        if (type && useCache) {
            if (isCategoryListAction(action)) {
                CacheManager.setCategoryList(type, data);
            } else if (isCategoryItemsAction(action) && categoryId) {
                CacheManager.setCategoryItems(type, categoryId, data);
            }
        }

        return data;

    } catch (err) {
        throw err;
    } finally {
        if (loading && typeof Loader !== 'undefined') Loader.hide("Complete");
    }
}

async function getTestModeApi(action, params = {}) {
    // ... existing test mode code (unchanged) ...
    const GITHUB_BASE_URL = "https://speedy.geekspro.us/testmode/";
    const apiMap = {
        'get_live_categories':   'get_live_categories.json',
        'get_live_streams':      'get_live_streams.json',
        'get_vod_categories':    'get_vod_categories.json',
        'get_vod_streams':       'get_vod_streams.json',
        'get_series_categories': 'get_series_categories.json',
        'get_series':            'get_series.json',
        'get_series_info':       'get_series_info.json',
        'get_vod_info':          'get_vod_info.json',
    };
    const fileName = !action ? "player_api.json" : apiMap[action];
    if (!fileName) return null;

    const fullUrl = `${GITHUB_BASE_URL}${fileName}`;
    try {
        console.log(`[TestMode] Fetching: ${fullUrl}`);
        let response;
        try {
            response = await safeFetch(fullUrl);
        } catch (err) {   
             // ... error handling ...
            return false;
        }

        Loader.hide("");
        return await response.json();
    } catch (error) {
        console.error("Test Mode Fetch Error:", error);
        return { error: "Failed to load test data" };
    }
}