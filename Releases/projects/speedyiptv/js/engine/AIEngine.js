// =============================================================
// AIEngine.js (FULL UPDATED VERSION)
// =============================================================
// Includes: unified rating system, rating_5based fallback,
// 2-letter & 3-letter language detection, aggressiveness levels,
// diversity, filters, cleaned scoring, performance optimizations.
// =============================================================

const AIEngine = (function () {

    // --------------------------------------------
    // BASE WEIGHTS (scaled by aggressiveness level)
    // --------------------------------------------
    const BASE_WEIGHTS = {
        GENRE: 4,
        RATING: 2,
        YEAR: 0.5,
        FAV_GENRE: 8,
        WATCH_PENALTY: -40,
        PARTIAL_PENALTY: -10,
        FAVORITE_WEIGHT: 3,
        LANGUAGE: 4
    };

    // --------------------------------------------
    // LANGUAGE CODE MAP (supports 2- and 3-letter)
    // --------------------------------------------
    const LANG_MAP = {
        // English
        'EN': 'en', 'ENG': 'en',

        // Arabic
        'AR': 'ar', 'ARA': 'ar',

        // Polish
        'PL': 'pl', 'POL': 'pl',

        // French
        'FR': 'fr', 'FRA': 'fr',

        // Russian
        'RU': 'ru', 'RUS': 'ru'
    };

    // --------------------------------------------
    // Detect language from title prefix:
    // Examples accepted:
    //  "EN - Title"
    //  "AR - Movie"
    //  "Eng - Title"
    //  "FRA - Something"
    // If no prefix → default "en"
    // --------------------------------------------
    function detectLanguageFromTitle(title) {
        if (!title || typeof title !== "string") return "en";

        // Match 2–3 letters optionally mixed case before "-"
        const m = title.match(/^\s*([A-Za-z]{2,3})\s*-\s*(.+)$/);
        if (m) {
            const code = m[1].toUpperCase();
            return LANG_MAP[code] || code.toLowerCase();
        }

        return "en";
    }

    // --------------------------------------------
    // Unified rating system (handles rating & rating_5based)
    // --------------------------------------------
    function getUnifiedRating(item) {
        let r10 = parseFloat(item.rating) || 0;
        let r5 = parseFloat(item.rating_5based) || 0;

        // Remove fake / unreliable perfect ratings
        if (r10 >= 10) r10 = 0;
        if (r5 >= 5) r5 = 0;

        // Valid /10 rating?
        if (r10 > 0 && r10 < 10) return r10;

        // Valid /5 rating? Convert → /10
        if (r5 > 0 && r5 < 5) return r5 * 2;

        return 0;
    }

    // --------------------------------------------
    // Analyze watching history and favorites
    // --------------------------------------------
    function analyzeHistory() {
        const history = userSettings.watching || {};
        const favorites = userSettings.favorites || [];

        const profile = {
            genres: Object.create(null),
            languages: Object.create(null),
            favGenres: Object.create(null),
            favLanguages: Object.create(null),
            avgRating: 0,
            count: 0
        };

        // watching entries
        for (const key in history) {
            const entry = history[key];
            if (!entry || entry.progress_sec < 300 || !entry.item) continue;

            const item = entry.item;

            // genres
            if (item.genre) {
                item.genre.split(",").forEach(g => {
                    g = g.trim();
                    if (g) profile.genres[g] = (profile.genres[g]||0)+1;
                });
            }

            // language
            const lang = detectLanguageFromTitle(item.name || item.title || "");
            profile.languages[lang] = (profile.languages[lang] || 0) + 1;

            // rating
            profile.avgRating += getUnifiedRating(item);
            profile.count++;
        }

        // favorites (strong impact)
        for (let i = 0; i < favorites.length; i++) {
            const item = favorites[i];
            if (!item) continue;

            if (item.genre) {
                item.genre.split(",").forEach(g => {
                    g = g.trim();
                    if (!g) return;
                    profile.genres[g] = (profile.genres[g] || 0) + BASE_WEIGHTS.FAVORITE_WEIGHT;
                    profile.favGenres[g] = 1;
                });
            }

            const lang = detectLanguageFromTitle(item.name || item.title || "");
            profile.languages[lang] = (profile.languages[lang] || 0) + BASE_WEIGHTS.FAVORITE_WEIGHT;
            profile.favLanguages[lang] = 1;

            profile.avgRating += getUnifiedRating(item) * BASE_WEIGHTS.FAVORITE_WEIGHT;
            profile.count += BASE_WEIGHTS.FAVORITE_WEIGHT;
        }

        if (profile.count > 0) {
            profile.avgRating = profile.avgRating / profile.count;
        } else {
            profile.avgRating = 5; // neutral
        }

        return profile;
    }

    // --------------------------------------------
    // ID getter (stream/series/etc.)
    // --------------------------------------------
    function getId(item) {
        return item.stream_id || item.series_id || item.id || item._id || null;
    }

    // --------------------------------------------
    // Normalize entire library’s ratings (0–1)
    // --------------------------------------------
    function normalizeRatings(allItems) {
        const rawRatings = new Array(allItems.length);
        let minR = Infinity;
        let maxR = -Infinity;

        for (let i = 0; i < allItems.length; i++) {
            const r = getUnifiedRating(allItems[i]);
            rawRatings[i] = r;
            if (r < minR) minR = r;
            if (r > maxR) maxR = r;
        }

        if (!isFinite(minR)) { minR = 0; maxR = 10; }

        const denom = (maxR - minR) || 1;
        const norm = rawRatings.map(r => (r - minR) / denom);

        return { rawRatings, norm };
    }

    // --------------------------------------------
    // Preload watching progress for all items
    // --------------------------------------------
    function preloadWatchingProgress(allItems) {
        const map = Object.create(null);

        // if bulk API exists, use it
        if (typeof getAllWatchingProgress === "function") {
            try {
                const bulk = getAllWatchingProgress();
                if (bulk) return bulk;
            } catch (e) {}
        }

        // fallback: per-item
        for (let i = 0; i < allItems.length; i++) {
            const id = getId(allItems[i]);
            if (!id || map[id]) continue;
            try { map[id] = getwatchingProgress(id) || null; }
            catch (e) { map[id] = null; }
        }

        return map;
    }

    // --------------------------------------------
    // MAIN FUNCTION
    // getRecommendations(type, items, limit, {genre, language, level})
    // --------------------------------------------
    function getRecommendations(type = null, items = null, limit = 20, options = {}) {
        // options
        const reqGenre = options.genre ? String(options.genre).trim() : null;
        const reqLang = options.language ? String(options.language).trim().toLowerCase() : null;
        let level = parseInt(options.level) || 1;
        if (level < 1) level = 1;
        if (level > 5) level = 5;

        // collect items
        let allItems = [];
        if (items && items.length) {
            allItems = items.slice();
        } else if (type && CacheManager?.MEMORY_CACHE?.[type]) {
            allItems = Object.values(CacheManager.MEMORY_CACHE[type]).flat();
        } else {
            return [];
        }

        // apply user-requested filters
        if (reqGenre || reqLang) {
            allItems = allItems.filter(it => {
                const itLang = (it.language && String(it.language).toLowerCase())
                                || detectLanguageFromTitle(it.name || it.title || "");

                if (reqLang && itLang !== reqLang) return false;

                if (reqGenre) {
                    if (!it.genre) return false;
                    const parts = it.genre.split(",").map(s => s.trim().toLowerCase());
                    if (!parts.includes(reqGenre.toLowerCase())) return false;
                }

                return true;
            });
        }

        if (allItems.length === 0) return [];

        // analyze profile
        const profile = analyzeHistory();
        const favorites = userSettings.favorites || [];

        // fallback if profile empty and level=1
        if (profile.count < 3 && level === 1) {
            return allItems
                .slice()
                .sort((a,b)=>getUnifiedRating(b)-getUnifiedRating(a))
                .slice(0, limit);
        }

        // aggressiveness multipliers
        const lvl = {
            1:{personal:0.6,favBoost:0.8,diversity:0.2},
            2:{personal:0.9,favBoost:1.0,diversity:0.35},
            3:{personal:1.2,favBoost:1.5,diversity:0.5},
            4:{personal:1.6,favBoost:2.0,diversity:0.7},
            5:{personal:2.2,favBoost:3.0,diversity:0.9}
        }[level];

        // effective weights
        const WEIGHTS = {
            GENRE: BASE_WEIGHTS.GENRE * lvl.personal,
            RATING: BASE_WEIGHTS.RATING * (1+(level-1)*0.15),
            YEAR: BASE_WEIGHTS.YEAR,
            FAV_GENRE: BASE_WEIGHTS.FAV_GENRE * lvl.favBoost,
            WATCH_PENALTY: BASE_WEIGHTS.WATCH_PENALTY,
            PARTIAL_PENALTY: BASE_WEIGHTS.PARTIAL_PENALTY,
            FAVORITE_WEIGHT: BASE_WEIGHTS.FAVORITE_WEIGHT,
            LANGUAGE: BASE_WEIGHTS.LANGUAGE * lvl.personal
        };

        // normalize rating
        const { rawRatings, norm } = normalizeRatings(allItems);

        // preload progress
        const watchMap = preloadWatchingProgress(allItems);

        // favorites lookup
        const favLookup = Object.create(null);
        favorites.forEach(f=>{
            const id = getId(f);
            if (id) favLookup[id] = 1;
        });

        // pre-cache genres & languages
        const genresCache = [];
        const langCache = [];

        for (let i = 0; i < allItems.length; i++) {
            const it = allItems[i];
            genresCache[i] = it.genre ?
                it.genre.split(",").map(s=>s.trim()).filter(Boolean) : [];
            langCache[i] =
                (it.language && it.language.toLowerCase()) ||
                detectLanguageFromTitle(it.name||it.title||"");
        }

        // pre calc
        let maxGenre = 1;
        for (const g in profile.genres)
            if (profile.genres[g] > maxGenre) maxGenre = profile.genres[g];

        let maxLang = 1;
        for (const l in profile.languages)
            if (profile.languages[l] > maxLang) maxLang = profile.languages[l];

        // scoring
        const scored = new Array(allItems.length);

        for (let i = 0; i < allItems.length; i++) {
            const it = allItems[i];
            let score = 0;
            const id = getId(it);

            // avoid recommending favorites again
            if (favLookup[id]) {
                scored[i] = { item: it, score: -1000, genre: genresCache[i][0]||null, lang: langCache[i] };
                continue;
            }

            const itGenres = genresCache[i];
            const itLang = langCache[i];

            // genre scoring
            let overlap = 0;
            for (let g of itGenres) {
                if (profile.genres[g]) {
                    score += (profile.genres[g] / maxGenre) * WEIGHTS.GENRE;
                }
                if (profile.favGenres[g]) overlap++;
            }
            if (overlap > 0) score += overlap * WEIGHTS.FAV_GENRE;

            // language scoring
            if (profile.languages[itLang]) {
                score += (profile.languages[itLang] / maxLang) * WEIGHTS.LANGUAGE;
            }
            if (profile.favLanguages[itLang]) {
                score += WEIGHTS.LANGUAGE * 0.5;
            }

            // user has no filter, allow profile-based language preference
            if (!reqLang && level > 1) {
                if (profile.languages[itLang] &&
                    (profile.languages[itLang]/profile.count) > 0.15) {
                    score += WEIGHTS.LANGUAGE * (level/5);
                }
            }

            // rating scoring
            const rNorm = norm[i];
            const avgNorm = Math.max(0, Math.min(1, (profile.avgRating/10)));
            const diffNorm = rNorm - avgNorm;
            if (diffNorm > 0) score += diffNorm * WEIGHTS.RATING;
            else score += diffNorm * 0.3 * WEIGHTS.RATING;

            // recency scoring
            const year = parseInt(it.year)||null;
            if (year) {
                const base = (new Date()).getFullYear() - 5;
                score += ((year-base)/Math.max(1,((new Date()).getFullYear()-2000)))
                         * WEIGHTS.YEAR;
            }

            // watched penalty
            const wp = watchMap[id] || null;
            if (wp) {
               const prog = wp.progress ||
                         (wp.progress_percent ? wp.progress_percent/100 :
                         (wp.progress_sec && it.duration_sec ?
                             Math.min(1, wp.progress_sec/(it.duration_sec)) :
                             0));
                if (prog>=0.95) score+=WEIGHTS.WATCH_PENALTY;
                else score+=WEIGHTS.PARTIAL_PENALTY;
            }

            scored[i] = { item: it, score, genre: itGenres[0]||"misc", lang: itLang };
        }

        // sort
        scored.sort((a,b)=>b.score-a.score);

        // diversity quotas
        const result = [];
        const gCount = Object.create(null);
        const lCount = Object.create(null);

        const maxPerGenre = Math.max(1, Math.floor(limit*(1-lvl.diversity)));
        const maxPerLang = Math.max(1, Math.floor(limit*(1-lvl.diversity)));

        // pick
        for (let s of scored) {
            if (result.length >= limit) break;
            if (s.score <= -999) continue;

            const g = s.genre;
            const l = s.lang;

            gCount[g] = gCount[g]||0;
            lCount[l] = lCount[l]||0;

            if (!reqGenre && !reqLang) {
                // enforce diversity
                if (gCount[g] >= maxPerGenre && Math.random() > (level/5)) continue;
                if (lCount[l] >= maxPerLang && Math.random() > (level/5)) continue;
            }

            result.push(s.item);
            gCount[g]++;
            lCount[l]++;
        }

        // fill if not enough
        if (result.length < limit) {
            for (let s of scored) {
                if (result.length >= limit) break;
                if (s.score <= -999) continue;
                if (result.includes(s.item)) continue;
                result.push(s.item);
            }
        }

        return result.slice(0, limit);
    }

    return { getRecommendations };

})();
//it56 = AIEngine.getRecommendations("vod",null,20,{level:1, language:"fr"})