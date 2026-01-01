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

function errorHandler(err) {
    console.error("Fetch error:", err);
    // If aborted, rethrow immediately to skip error modals
    if (err.name === 'AbortError' || err === 'ABORTED') {
        throw err;
    }

    let message = "Unexpected error occurred";
    let title = "Network Error";
    let returnValue = false;

    // FIX: Robust check for err being an object (e.g. {type:"AUTH_ERROR"}) or string
    const errCode = (err && typeof err === 'object' && err.type) ? err.type : err;

    // Use Translation Engine for Messages
    switch (errCode) {
        case "NO_INTERNET":
            message = typeof t !== 'undefined' ? t('error_network') : "No Internet Connection.";
            break;
        case "BAD_RESPONSE":
            message = typeof t !== 'undefined' ? t('error_connect_failed') : "Server returned an error.";
            break;
        case "TIMEOUT":
            message = typeof t !== 'undefined' ? t('boot_connection_error') : "Connection timed out.";
            break;
        case "FETCH_ERROR":
            message = typeof t !== 'undefined' ? t('error_connect_failed') : "Cannot reach server.";
            break;
        case "AUTH_ERROR":
            message = typeof t !== 'undefined' ? t('error_playlist_auth') : "Authentication Failed.";
            title = "Playlist Error";
            returnValue = -1;
            break;
        default:
            message = typeof t !== 'undefined' ? t('error_unknown') : "Unexpected error occurred.";
            break;
    }
    
    // Ensure showErrorModal is available before calling
    if (typeof showErrorModal === 'function') {
        showErrorModal(title, message, typeof errCode === 'string' ? errCode : 'ERR');
    } else {
        console.error("showErrorModal not defined!", message);
        // Fallback if UI common isn't loaded
        if(typeof showError === 'function') showError(message);
    }
    
    return returnValue;

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
        showError(typeof t !== 'undefined' ? t('error_incomplete_playlist') : "Invalid playlist configuration.");
        throw new Error("Invalid playlist configuration");
    }

    if(params.action === "get_user_info"){
        const _urlParams = new URLSearchParams({
            username: xtreamConfig.username,
            password: xtreamConfig.password,
            action:"get_user_info"
        });
        try {
            let new_url = await resolvePlaylistUrl(`${apiBaseUrl}?${_urlParams.toString()}`);
            new_url = new_url ? new_url.split("?")[0] : new_url;
            if(new_url !== apiBaseUrl){
                apiBaseUrl = new_url;
                // Only save if it is a valid setting structure
                if(userSettings && userSettings.xtreamConfig && userSettings.pl != null) {
                    userSettings.xtreamConfig[userSettings.pl].host = apiBaseUrl;
                    saveUserSettings();
                }
            }
        } catch (error) {
            console.error("Error resolving playlist URL:", error);
            showError("Failed to resolve playlist URL: " + error.message);
            return false;
        }

    }

    // Extract signal so it doesn't get stringified into URL params
    const { signal, ...apiParams } = params || {};

    const urlParams = new URLSearchParams({
        username: xtreamConfig.username,
        password: xtreamConfig.password,
        ...apiParams
    });

    let url = `${apiBaseUrl}?${urlParams.toString()}`;

    try {
        let response;
        try {
            // Pass signal to safeFetch
            response = await safeFetch(url, { signal });
        } catch (err) {
            return errorHandler(err);
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
        if(typeof showError === 'function') showError((typeof t !== 'undefined' ? t('boot_connection_error') : "Network Error") + ": " + error.message);
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
        res = getTestModeApi(action, params);
        console.log(action, params,res)
        return res;
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
var tesMod_vods = {};
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
        'get_user_info':         'get_user_info.json',
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
             return errorHandler(err);
        }
        const res = await response.json();
        if(action === "get_vod_streams"){
            CacheManager.MEMORY_CACHE.vod = {};
            CacheManager.MEMORY_CACHE.vod[12] = res;
            tesMod_vods = res;
            CacheManager.prepareSearchIndex("vod")
        }else if(action=="get_vod_info"){
            const vod = tesMod_vods && tesMod_vods.filter ? tesMod_vods.filter(v=>v.stream_id===params.vod_id)[0] : {};
            if(vod && res){
                res.movie_data.stream_id = vod.stream_id;
                res.movie_data.name = vod.name;
                res.movie_data.direct_source = vod.direct_source;
                res.info.movie_image = vod.stream_icon;
                res.info.rating = vod.rating;
                res.info.youtube_trailer = "";
            }
        }
        Loader.hide("");
        return res 
    } catch (error) {
        console.error("Test Mode Fetch Error:", error);
        return { error: "Failed to load test data" };
    }
}