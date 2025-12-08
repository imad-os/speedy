"use strict";

/**
 * Not available yet, backend not ready
 */
const domain="iptv-subtitle.geekspro.us";
var SubtitleFetcher = {
    apiBaseUrl: `https://${domain}`,
    apiUrl: `https://${domain}/api/get-subtitles`,
    isAvailable:true,
    cache:{},
    fixUrl(url){
        return url.rplace(domain, atob('ZXhvYXBwLnR2'));
    },
    fetchSubtitles: function(movieData, movieType, successCallback, errorCallback) {
        if (!movieData) {
            if(errorCallback) errorCallback("No media data");
            return;
        }

        var subtitleRequestData = {};
        
        if (movieType === 'movie') {
            var originalName = movieData.name || '';
            var cleanedName = originalName;
            var yearMatch = cleanedName.match(/\((\d{4})\)/);
            var extractedYear = null;
            if (yearMatch) {
                extractedYear = parseInt(yearMatch[1]);
                cleanedName = cleanedName.replace(/\s*\(\d{4}\)\s*/, '').trim();
            }
            // Cleanup patterns
            cleanedName = cleanedName.replace(/\s*\b(HD|4K|1080p|720p|480p|BluRay|BRRip|WEB-DL|WEBRip|DVDRip|CAMRip|TS|TC|HDTV|PDTV|XviD|x264|x265|HEVC|DivX|AC3|AAC|MP3|Dubbed|Subbed|MultiAudio)\b\s*/gi, ' ').trim();
            cleanedName = cleanedName.replace(/\[.*?\]/g, '').trim();
            cleanedName = cleanedName.replace(/\{.*?\}/g, '').trim();
            
            subtitleRequestData = { movie_name: cleanedName };
            if (movieData.tmdb_id) subtitleRequestData.tmdb_id = movieData.tmdb_id;
            if (extractedYear) subtitleRequestData.year = extractedYear;
            else if (movieData.year) subtitleRequestData.year = movieData.year;
            
        } else {
            // Series/Episode logic
            // 1. Try data structure first (e.g. passed from player controller)
            if (movieData.season && movieData.episode_num) {
                 var seriesName = movieData.series_name || movieData.name || "";
                 seriesName = seriesName.replace(/S\d+/i, '').trim();
                 
                 var s = String(movieData.season).padStart(2,'0');
                 var e = String(movieData.episode_num).padStart(2,'0');
                 
                 // Construct "Series S01E01"
                 subtitleRequestData = {
                     movie_name: `${seriesName} S${s}E${e}`
                 };
                 
                 // Add fallback IDs if available
                 if (movieData.series_tmdb_id) subtitleRequestData.tmdb_id = movieData.series_tmdb_id;
            } 
            else {
                // 2. Fallback to name parsing
                var episodeName = movieData.title || movieData.name || movieData.episode_name || '';
                var parsed = this.parseEpisodeName(episodeName);
                
                if (parsed.season_number && parsed.episode_number) {
                    subtitleRequestData = {
                        season_number: parseInt(parsed.season_number),
                        episode_number: parseInt(parsed.episode_number),
                        // We ideally need series name or TMDB ID here too
                    };
                    if (parsed.series_name) subtitleRequestData.movie_name = `${parsed.series_name} S${String(parsed.season_number).padStart(2,'0')}E${String(parsed.episode_number).padStart(2,'0')}`;
                } else {
                    subtitleRequestData = { movie_name: episodeName };
                }
            }
        }
        if(this.cache[subtitleRequestData.movie_name]){
            successCallback( this.cache[subtitleRequestData.movie_name] )
            return ;
        }
        this.makeSubtitleRequest(subtitleRequestData, successCallback, errorCallback);
    },
    
    makeSubtitleRequest: function(requestData, successCallback, errorCallback) {
        requestData.langage = 'ar';
        requestData.lang = 'ar'; // Default to Arabic as per previous code

        fetch(this.fixUrl(this.apiUrl), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestData)
        })
        .then(response => {
            if (!response.ok) throw new Error("HTTP " + response.status);
            return response.json();
        })
        .then(result => {
            if (result.status === "success" && result.subtitles && result.subtitles.length > 0) {
                // Filter logic if needed
                if (successCallback){
                    this.cache[requestData.movie_name] = result.subtitles;
                    successCallback(result.subtitles);
                } else {
                    errorCallback("No subtitles found");
                }
            }
        })
        .catch(err => {
            if (errorCallback) errorCallback(err.message || "Fetch error");
        });
    },
    // New: Tizen Download & Apply Logic
    downloadAndSetSubtitle: function(url, successCallback, errorCallback) {
        console.log("Starting subtitle download: " + url);
        
        if (typeof tizen === 'undefined') {
            if(errorCallback) errorCallback("Tizen API not available");
            return;
        }
        if(this.cache[url]){
            webapis.avplay.setExternalSubtitlePath(this.cache[url]);
            if (successCallback) successCallback(this.cache[url]);
            return ;
        }
        const fullUrl = url.startsWith('http') ? url : this.apiBaseUrl + url;
        try {
            // Ensure the directory exists or use a safe temp one like 'wgt-private-tmp'
            // Tizen allows downloading to virtual roots like 'downloads', 'wgt-private', etc.
            var downloadRequest = new tizen.DownloadRequest(this.fixUrl(fullUrl), "wgt-private-tmp");
            
            var listener = {
                onprogress: function(id, receivedSize, totalSize) {
                    // Optional: Report progress if needed
                },
                onpaused: function(id) {},
                oncanceled: function(id) {},
                oncompleted: (id, fullPath) => {
                    console.log("Download completed: " + fullPath);
                    try {
                        // Tizen AVPlay needs absolute path or specific format.
                        if (typeof webapis !== 'undefined' && webapis.avplay) {
                            webapis.avplay.setExternalSubtitlePath(fullPath);
                            if (successCallback) successCallback(fullPath);
                            this.cache[url] = fullPath;

                        } else {
                            if(errorCallback) errorCallback("AVPlay not available");
                        }
                    } catch (e) {
                        console.error("Failed to set subtitle path: " + e);
                        if(errorCallback) errorCallback("Set Path Failed: " + e.message);
                    }
                },
                onfailed: function(id, error) {
                    console.error("Download failed: " + error.message);
                    if(errorCallback) errorCallback("Download Failed: " + error.message);
                }
            };

            tizen.download.start(downloadRequest, listener);
            
        } catch (e) {
            console.error("Download exception: " + e.message);
            if(errorCallback) errorCallback("Exception: " + e.message);
        }
    },

    parseEpisodeName: function(episodeName) {
        var result = { series_name: null, season_number: null, episode_number: null };
        if (!episodeName) return result;
        var cleanedName = episodeName.trim();
        // "Series S01E01"
        var match = cleanedName.match(/^(.+?)\s+S(\d{1,2})\s*E(\d{1,2})/i);
        if (match) {
            result.series_name = match[1].trim();
            result.season_number = parseInt(match[2]);
            result.episode_number = parseInt(match[3]);
        }
        return result;
    }
};