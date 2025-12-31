// video-engine.js

const VideoEngine = (function() {

    let tizenPlayer = null;
    let webPlayer = null;
    let _callbacks = {};
    let _isTizen = false;
    let allowOverlay = true;
    
    // Store current URL internally to allow restarting without passing it back in
    let currentUrl = ""; 
    let currentRect = null;
    let connection_error = false;

    // RECOVERY STATE
    let isRecovering = false;
    let lastPlaybackTime = 0;
    let wasLive = false;

    let playerTracks = { 
            video:{}, 
            currentSubtitle: {},
            currentOnlineSubtitle: null,
            currentAudio: {},
            subtitles: [], 
            audios: [],
            downloadedSubtitles:[],
         };

    function init() {
        _isTizen = (typeof webapis !== 'undefined' && webapis.avplay);
        webPlayer = document.getElementById('web-video-player');

        console.log("[VideoEngine] Using HTML5 Network Listeners (Fallback).");
        window.addEventListener('offline', function() {
            console.log("[Network-HTML5] Offline");
            _handleNetworkLoss();
        });
        window.addEventListener('online', function() {
            console.log("[Network-HTML5] Online");
            _performRecovery();
        });
    }

    // === NETWORK LOSS HANDLING ===
    function _handleNetworkLoss() {
        if (!PlayerController.isActive) return;
        console.log("[VideoEngine] Network Lost. Suspending...");
        isRecovering = true;
        // 2. UI Updates
        Loader.hide("Network Lost"); // Hide generic loader
        const modal = document.getElementById('modal-reconnecting');
        if(modal) {
            modal.classList.remove('hidden');
            const p = modal.querySelector('p');
            if(p) p.textContent = "Waiting for network to recover...";
            
            const btn = modal.querySelector('button');
            if(btn) btn.focus();
        }

        // 3. Suspend Player
        try { webapis.avplay.suspend(); } catch(e) {}
    }

    // === NETWORK RECOVERY ===
    function _performRecovery() {
        console.log("[VideoEngine] Network Recovered. Resuming...");

        // 1. Update UI
        const modal = document.getElementById('modal-reconnecting');
        if(modal) {
            const p = modal.querySelector('p');
            if(p) p.textContent = "Network found! Resuming video...";
        }
        reload(); // Soft restart
        if(modal) modal.classList.add('hidden');
        setTimeout(() => {
            isRecovering = false;
            
        }, 2500);
    }

    function cancelRecovery() {
        console.log("[VideoEngine] Recovery Cancelled by User");
        isRecovering = false;
        const modal = document.getElementById('modal-reconnecting');
        if(modal) modal.classList.add('hidden');

        PlayerController._handleEnded();
    }

    function start(url, startTime, callbacks = {}, isLive = false, rect = null) {
        if (!_isTizen && !webPlayer) init();
        _callbacks = callbacks;
        currentUrl = url; // Save for restart
        currentRect = rect;
        
        // Reset recovery state for new stream
        wasLive = isLive;
        isRecovering = false;

        if (_isTizen) {
            _startTizen(url, startTime, isLive, rect);
        } else {
            _startWeb(url, startTime, isLive, rect);
        }
    }

    function avplay_error(e){
        console.error("AVPlay Error:", e);
        Loader.hide(`err;${e}`);

        if(e.includes("PLAYER_ERROR_CONNECTION_FAILED")){
             console.log("[VideoEngine] Connection failure detected. Invoking network loss handler.");
             _handleNetworkLoss();
             return; 
        }else if(e.includes("PLAYER_ERROR_NOT_SUPPORTED_FORMAT")|| e.includes("PLAYER_ERROR_NOT_SUPPORTED_FILE") ){
            showError("Video format not supported!");
        } else {
            showError("Streaming Video failed!");
        }
    }

    // UPDATED: Added keepDom parameter
    function stop(keepDom = false) {
        console.log("[videoEngine] stop")
        if (_isTizen && tizenPlayer) {
            try {
                // 1. Stop playback
                webapis.avplay.stop();
                
                // 2. CRITICAL: Hide the video plane BEFORE closing the session
                // If we close first, setDisplayRect fails and leaves a black screen.
                if(!keepDom) {
                    try {
                        webapis.avplay.setDisplayRect(0,0,0,0); 
                    } catch(e) { console.warn("Rect clear failed", e); }
                }

                // 3. Now we can safely close the session (resets tracks)
                webapis.avplay.close(); 
                PlayerController.isActive = false;

                // 4. Cleanup DOM elements
                if(!keepDom) {
                    const container = document.getElementById('tizen-player-container');
                    if(container) {
                        container.innerHTML = '';
                        container.style.display = 'none';
                    }
                    tizenPlayer = null;
                }
            } catch (e) { 
                console.warn("AVPlay stop error", e); 
                
                // Emergency cleanup if main block fails
                if(!keepDom) {
                    const container = document.getElementById('tizen-player-container');
                    if(container) container.style.display = 'none';
                }
            }
        }

        if (webPlayer && !keepDom) {
            webPlayer.pause();
            webPlayer.src = '';
            webPlayer.style.display = 'none';
        }
        if(typeof playerOverlay !== 'undefined') playerOverlay.isBuffering = false;
        
        // Reset recovery state if fully stopped (not keeping DOM)
        if (!keepDom) {
            isRecovering = false;
            const modal = document.getElementById('modal-reconnecting');
            if(modal) modal.classList.add('hidden');
        }
    }

    // NEW: Soft Restart Function
    function reload(targetSubtitleIndex=null) {
        if (!_isTizen || !PlayerController.isActive) return;

        console.log("[VideoEngine] Soft restarting for subtitle switch...");
        
        // 1. Capture current state
        let currentTime = 0;
        try { currentTime = webapis.avplay.getCurrentTime() / 1000; } catch(e){}
        
        // Find current audio index to restore it
        let currentAudioIndex = -1;
        parseCurrentTracks(); // Refresh track data first
        if(playerTracks.currentAudio && playerTracks.currentAudio.index !== undefined){
            currentAudioIndex = playerTracks.currentAudio.index;
        }
        if(targetSubtitleIndex === null){
            // If no target provided, just use current subtitle index
            if(playerTracks.currentSubtitle && playerTracks.currentSubtitle.index !== undefined){
                targetSubtitleIndex = playerTracks.currentSubtitle.index;
            }else{
                targetSubtitleIndex = -1; // No subtitle
            }
        }
        // 2. Clear the external subtitle flag so the new session is clean
        playerTracks.currentOnlineSubtitle = null;

        // 3. Stop player but KEEP DOM (prevents black flash/re-layout)
        stop(true);

        // 4. Restart using the existing DOM, passing restore options
        // We assume 'vod' (false for isLive) because we are syncing subs
        _startTizen(currentUrl, currentTime, false, currentRect, true, {
            audioIndex: currentAudioIndex,
            subtitleIndex: targetSubtitleIndex
        });
    }

    function togglePlay() {
        if (_isTizen) {
            try {
                const state = webapis.avplay.getState().toLocaleLowerCase();
                if (state === 'playing') {
                    webapis.avplay.pause();
                }else if(state === 'paused'){
                    webapis.avplay.play();
                }
                PlayerController.isPlaying( state === 'playing' )
                
                if (_callbacks.onStateChange) _callbacks.onStateChange(state === 'playing' ? 'paused' : 'playing');
            } catch(e) {}
        } else {
            if (webPlayer.paused) webPlayer.play();
            else webPlayer.pause();
            if (_callbacks.onStateChange) _callbacks.onStateChange(webPlayer.paused ? 'paused' : 'playing');
        }
    }

    function getTimeInfo() {
        if (_isTizen) {
            try {
                return {
                    current: webapis.avplay.getCurrentTime() / 1000,
                    duration: webapis.avplay.getDuration() / 1000
                };
            } catch (e) { return { current: 0, duration: 0 }; }
        } else {
            return {
                current: webPlayer.currentTime,
                duration: webPlayer.duration
            };
        }
    }

    function setRect(rect) {
        if(!rect && currentRect) rect = currentRect; // Use cached if available
        if (PlayerController.currentState.isFullscreen) {
            rect = { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight };
        }
        currentRect = rect; // Update cache

        if (_isTizen) {
            try {
                const container = document.getElementById('tizen-player-container');
                if (container) {
                    container.style.position = 'absolute'; 
                    container.style.left = rect.x + 'px';
                    container.style.top = rect.y + 'px';
                    container.style.width = rect.w + 'px';
                    container.style.height = rect.h + 'px';
                }
                webapis.avplay.setDisplayRect(rect.x, rect.y, rect.w, rect.h);
            } catch (e) {
                console.error("Failed to set Display Rect", e);
            }
        } else {
            if (webPlayer) {
                webPlayer.style.position = 'absolute';
                webPlayer.style.left = rect.x + 'px';
                webPlayer.style.top = rect.y + 'px';
                webPlayer.style.width = rect.w + 'px';
                webPlayer.style.height = rect.h + 'px';
            }
        }
    }

    function parseTrackLanguage(extra, i) {
        const Unknown = `Track ${i}`;
        if(!extra) return Unknown;
        return extra.language || extra.lang || extra.lan || extra.track_lang || extra.track_lang_code || Unknown;
    }

    function parseTracks() {
        try {
            const total = webapis.avplay.getTotalTrackInfo();
            const audioTracks = [];
            const subtitleTracks = [];
            let videoTrack = {};
            for (let i = 0; i < total.length; i++) {
                const track = total[i];
                let extra = {};
                try { extra = JSON.parse(track.extra_info || '{}'); } catch (e) {}
                
                if (track.type === 'AUDIO') {
                    audioTracks.push({
                        index: track.index,
                        language: parseTrackLanguage(extra, track.index),
                        channels: extra.channels || '',
                        sampleRate: extra.sample_rate || '',
                        bitRate: extra.bit_rate || '',
                        codec: extra.fourCC || ''
                    });
                } else if (track.type === 'TEXT') {
                    subtitleTracks.push({
                        index: track.index,
                        language: parseTrackLanguage(extra, track.index),
                        type: extra.subtitle_type || '',
                        codec: extra.fourCC || ''
                    });
                } else if (track.type === 'VIDEO') {
                    videoTrack = extra || {};
                    videoTrack.Width = extra.Width || 0;
                    videoTrack.Height = extra.Height || 0;
                }
            }
            playerTracks.video = videoTrack;
            playerTracks.audios = audioTracks;
            playerTracks.subtitles = subtitleTracks;
        } catch(e) { 
            playerTracks.video = {};
            playerTracks.audios = [];
            playerTracks.subtitles = [];

            console.warn("Error parsing tracks", e); 
        }
    }

    function parseCurrentTracks() {
        try {
            if(!_isTizen) return;
            playerTracks.currentAudio = {};
            playerTracks.currentSubtitle = {};
            const tracks = webapis.avplay.getCurrentStreamInfo();
            for (let i = 0; i < tracks.length; i++) {
                const track = tracks[i];
                if (track.type === 'AUDIO') {
                    playerTracks.audios.map(a => { a.isCurrent = (a.index === track.index); return a; });
                    playerTracks.currentAudio = playerTracks.audios.find(a => a.isCurrent) || {};
                } else if (track.type === 'TEXT') {
                    playerTracks.subtitles.map(a => { a.isCurrent = (a.index === track.index); return a; });
                    playerTracks.currentSubtitle = playerTracks.subtitles.find(s => s.isCurrent) || {};
                }
            }
        } catch (e) { console.error('Failed to get current track info:', e); }
    }                

    function updateResolution() {
        const v = playerTracks.video || {};
        if(typeof ViewDetails !== 'undefined'){
             const {qualityClass,qualityTag, resolution} = ViewDetails.resToTag(v.Width, v.Height);
             if(window.playerOverlay) window.playerOverlay.updateStreamInfo({ resolution, quality:qualityTag })
        }
    }

    function switchToFullscreen() {
        if (_isTizen) {
            try { setRect(); } catch (e) {}
        } else {
            webPlayer.style.position = 'fixed';
            webPlayer.style.top = '0';
            webPlayer.style.left = '0';
            webPlayer.style.width = '100%';
            webPlayer.style.height = '100%';
        }
        allowOverlay= true;
    }

    // UPDATED: Added reuseDom and restoreOpts
    function _startTizen(url, startTime, isLive, rect, reuseDom = false, restoreOpts = null) {
        const container = document.getElementById('tizen-player-container');
        tizenPlayer = document.getElementById('av-player');
        // ONLY recreate DOM if NOT reusing (standard start)
        if (!reuseDom) {
            container.innerHTML = '<object type="application/avplayer" id="av-player" style="width:100%; height:100%;"></object>';
            container.style.display = 'block'; 
        } else {
            // We are reusing, ensure object exists
            if(!tizenPlayer) {
                 return _startTizen(url, startTime, isLive, rect, false, restoreOpts);
            }
        }
        //this is required n case created in this call
        tizenPlayer = document.getElementById('av-player');
        allowOverlay = !isLive || !rect ;
        PlayerController.isPlaying(false);

       const subtitles_container = $('#subtitle-container');
       let subtitleClearTimer = null;
        const listeners = {
            onbufferingstart: () => { 
                Loader.show("BUFFERING");
                if(typeof playerOverlay !== 'undefined') playerOverlay.isBuffering = true;
                if(_callbacks.onStateChange) _callbacks.onStateChange('buffering'); 
            },
            onbufferingprogress: function (percent) {
                if(PlayerController.isActive) Loader.progress(percent);
                if (window.playerOverlay) window.playerOverlay.updateStreamInfo({ buffer_progress: percent });
            },
            onbufferingcomplete: () => { 
                Loader.hide("bf complted");
                if(typeof playerOverlay !== 'undefined') playerOverlay.isBuffering = false;
                if (window.playerOverlay) window.playerOverlay.updateStreamInfo({ buffer_progress: 0,status:"PLAYING" });
                if(_callbacks.onStateChange) _callbacks.onStateChange('playing'); 
            },
            onstreamcompleted: () => { 
                parseCurrentTracks();
                if(_callbacks.onStateChange) _callbacks.onStateChange('ended'); 
            },
            oncurrentplaytime: (time) => { 
                if(!PlayerController.isPlaying()) PlayerController.isPlaying(true);
                if(_callbacks.onTimeUpdate) {
                     let dur = 0; 
                     try { dur = webapis.avplay.getDuration(); } catch(e){}
                     _callbacks.onTimeUpdate(time/1000, dur/1000);
                }
            },
            onerror: (e) => {
                avplay_error(e);
            },
            onevent: (eventid, data) => {},
            onsubtitlechange: (duration, text, data3, data4) => {
                if (subtitleClearTimer) { 
                    clearTimeout(subtitleClearTimer); 
                    subtitleClearTimer = null; 
                }
                if (!subtitles_container) return;
                if (!text || text.trim() === '') { 
                    subtitles_container.innerHTML = ''; 
                    return; 
                }
                try { duration = parseInt(duration); } catch (e) { duration = 0; }
                subtitles_container.innerHTML = `<span>${text.trim()}</span>`;
                if (duration > 300) {
                    subtitleClearTimer = setTimeout(() => { 
                        subtitles_container.innerHTML = ''; 
                        subtitleClearTimer = null; 
                    }, duration - 50);
                }
            },
        };

        try {
            subtitles_container.innerHTML = '';
            
            // Standard Open sequence
            webapis.avplay.open(url);
            webapis.avplay.setListener(listeners);

            PlayerController.isActive = true;
            Loader.show("CONNECTING");
            // Apply logic for soft restart if needed
            if (!reuseDom){
                setRect(rect);
            }

            playerTracks.video = {};
            playerTracks.audios = [];
            playerTracks.subtitles = [];

            updateResolution();
            webapis.avplay.prepareAsync(() => {
                setRect(rect); // Ensure rect is correct
                if(window.playerOverlay) playerOverlay.setProgressBar();
                
                // 1. Restore/Set Start Time
                // Note: startTime input is in seconds, seekTo expects ms
                if (startTime > 0) {
                    webapis.avplay.seekTo(startTime * 1000, 
                        () => webapis.avplay.play(),
                        () => webapis.avplay.play()
                    );
                } else {
                    webapis.avplay.play();
                }

                // 2. Parse Tracks (Crucial for Tizen to re-index internal subs)
                parseTracks();
                updateResolution();

                // 3. Apply Restore Options (Audio/Subtitle)
                if (restoreOpts) {
                    // Restore Audio
                    if (restoreOpts.audioIndex !== undefined && restoreOpts.audioIndex !== -1) {
                        try { 
                            playerOverlay._setAudio(restoreOpts.audioIndex);
                            console.log("[VideoEngine] Restored Audio Track:", restoreOpts.audioIndex);
                        } catch(e) { console.warn("Audio restore failed", e); }
                    }
                    // Apply the Target Internal Subtitle
                    if (restoreOpts.subtitleIndex !== undefined && restoreOpts.subtitleIndex > -1) {
                        try {
                            playerOverlay._setSubtitle(restoreOpts.subtitleIndex);
                            console.log("[VideoEngine] Applied Internal Subtitle:", restoreOpts.subtitleIndex);
                            if(window.showAlert) showAlert("Internal Subtitle Applied");
                        } catch(e) { console.warn("Subtitle apply failed", e); }
                    }
                }

                if(_callbacks.onReady) _callbacks.onReady();
            }, (e) => {
               if(_callbacks.onError) _callbacks.onError("AVPlay Prepare Error: " + e.message);
            });
        } catch (e) {
            Loader.hide(`err;${e}`);
            if(_callbacks.onError) _callbacks.onError("AVPlay Init Error: " + e.message);
        }
    }

    function _startWeb(url, startTime, isLive, rect) {
        // ... (Same as your original code) ...
        webPlayer.src = url;
        webPlayer.style.display = 'block';
        if (rect) setRect(rect);
        else {
            webPlayer.style.position = 'fixed';
            webPlayer.style.inset = '0';
        }
        webPlayer.currentTime = startTime;
        webPlayer.play().catch(e => console.log("Autoplay blocked", e));
        webPlayer.onStateChange = () => { if(_callbacks.onStateChange) _callbacks.onStateChange(webPlayer.paused ? 'paused' : 'playing'); }
        webPlayer.ontimeupdate = () => { if(_callbacks.onTimeUpdate) _callbacks.onTimeUpdate(webPlayer.currentTime, webPlayer.duration); };
        webPlayer.onended = () => { if(_callbacks.onStateChange) _callbacks.onStateChange('ended'); };
    }

    return {
        init,
        start,
        stop,
        reload, 
        cancelRecovery, // NEW: Exported for the Cancel button
        togglePlay,
        getTimeInfo,
        switchToFullscreen,
        setRect,
        parseCurrentTracks,
        get playerTracks() { return playerTracks; },
        get allowOverlay() { return allowOverlay; },
    };
})();