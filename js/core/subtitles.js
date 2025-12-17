"use strict";


var firebaseUrl = "https://us-central1-iptv-8b60c.cloudfunctions.net";

var SubtitleFetcher = {
    firebaseUrlFetch: `${firebaseUrl}/fetchSubtitles`,
    firebaseUrlDownload: `${firebaseUrl}/downloadSubtitle`,
    cache: {},
    isAvailable:true,
    /**
     * Call Firebase to get the list of subtitles
     */
    fetchSubtitles: function(movieData, movieType, successCallback, errorCallback) {
        if (!movieData) {
            if (errorCallback) errorCallback("No media data");
            return;
        }
        var cacheKey = movieData.name || movieData.title || "unknown";
        if (this.cache[cacheKey]) {
            console.log("Serving subtitles from cache");
            if (successCallback) successCallback(this.cache[cacheKey]);
            return;
        }
        const _year = movieData.releasedate ? movieData.releasedate.split("-")[0] : null;
        const episode = PlayerController?.currentState?.episode || {};
        const _movieData = {
            name : movieData.o_name || movieData.name || movieData.title,
            tmdb_id : movieData.tmdb_id || movieData.tmdb || 0,
            year:_year || movieData.year || "",
            season : episode.season,
            episode_num : episode.episode_num,
        }
        var payload = {
            movieData: _movieData,
            movieType: movieType
        };

        fetch(this.firebaseUrlFetch, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })
        .then(function(response) {
            if (!response.ok) throw new Error("HTTP " + response.status);
            return response.json();
        })
        .then(function(result) {
            if (result.status === "success" && result.subtitles) {
                // Cache the result
                SubtitleFetcher.cache[cacheKey] = result.subtitles;
                
                if (successCallback) successCallback(result.subtitles);
            } else {
                if (errorCallback) errorCallback("No subtitles found");
            }
        })
        .catch(function(err) {
            console.error("Fetch error:", err);
            if (errorCallback) errorCallback(err.message || "Fetch error");
        });
    },
    setSubtitle:function(fullPath){
        webapis.avplay.pause();
        webapis.avplay.setExternalSubtitlePath(fullPath);

        setTimeout(() => {
        webapis.avplay.play();
        }, 200);
    },
    /**
     * Tizen Download Logic using Firebase Proxy
     */
    downloadAndSetSubtitle: function(originalUrl, successCallback, errorCallback) {
        console.log("Requesting download for: " + originalUrl);

        if (typeof tizen === 'undefined') {
            if (errorCallback) errorCallback("Tizen API not available");
            return;
        }

        if (this.cache[originalUrl]) {
            console.log("Using cached file path:", this.cache[originalUrl]);
            try {
                 webapis.avplay.setExternalSubtitlePath(this.cache[originalUrl]);
                 if (successCallback) successCallback(this.cache[originalUrl]);
            } catch(e) {
                 console.error("Cached path failed, retrying download.");
            }
            return;
        }

        var proxyUrl = this.firebaseUrlDownload + "/?url=" + encodeURIComponent(originalUrl);

        try {
            var downloadRequest = new tizen.DownloadRequest(proxyUrl, "wgt-private-tmp");
            var self = this; 
            var listener = {
                onprogress: function(id, receivedSize, totalSize) {
                    // Optional: Update UI loading bar
                },
                onpaused: function(id) {},
                oncanceled: function(id) {},
                oncompleted: function(id, fullPath) {
                    console.log("Download completed to: " + fullPath);
                    try {
                        if (typeof webapis !== 'undefined' && webapis.avplay) {
                            SubtitleFetcher.setSubtitle(fullPath);
                            self.cache[originalUrl] = fullPath;
                            
                            if (successCallback) successCallback(fullPath);
                        } else {
                            if (errorCallback) errorCallback("AVPlay not available");
                        }
                    } catch (e) {
                        console.error("Failed to set subtitle path: " + e.message);
                        if (errorCallback) errorCallback("Set Path Failed: " + e.message);
                    }
                },
                onfailed: function(id, error) {
                    console.error("Download failed: " + error.message);
                    if (errorCallback) errorCallback("Download Failed: " + error.message);
                }
            };

            tizen.download.start(downloadRequest, listener);
            
        } catch (e) {
            console.error("Download exception: " + e.message);
            if (errorCallback) errorCallback("Exception: " + e.message);
        }
    }
};