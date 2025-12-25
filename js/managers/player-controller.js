// player-controller.js
// Fully integrated MediaController using app name "Bahra IPTV"

window.mcServer = null;

const PlayerController = (function() {
    
    // State
    let currentState = {
        isPlaying: false,
        isFullscreen: false,
        type: null,
        item: null,
        episode: null,
        startTime: 0,
        duration:0,
    };
    let isActive=false;
    let isGoingPreview=false;
    let saveInterval = null;

    function init() {
        console.log("[PlayerController] Initialized");
        FocusManager.register(FocusManager.LAYERS.PLAYER, { handleKey });

        MC.init();

        // Keep visibility handler ready (if used elsewhere)
        document.addEventListener("tizenvisibilitychange", handleVisibilityChange);
    }
    function isPlaying(isplaying=null){
        if(isplaying===null){
            return currentState.isPlaying ;
        }
        const state = webapis.avplay.getState().toLocaleLowerCase();
        currentState.isPlaying = state === 'playing';

    }
    function _goBack(){
        if(currentState.type=="live"){
            console.log("[FocusManager] still go preview anyway")
            goPreviewLive();
            setTimeout(() => {
                if(FocusManager.getCurrentLayer()===FocusManager.LAYERS.PLAYER){
                    FocusManager.restorePreviousLayer(); 
                }                
            }, 100);

        }else{
            if(playerOverlay.isBuffering){
                console.log("[FocusManager] still buffering stop & goback")
                PlayerController.stop();
                Router.goBack();
            }
            FocusManager.restorePreviousLayer();
        }
        return true;

    }
    function handleVisibilityChange() {
        if (typeof webapis==="undefined" || !webapis?.avplay) return;
        if (document.hidden) {
            try {
                webapis.avplay.pause();
                MC.reportMC("PAUSED");
            } catch (e) {}
        } 
    }


    // --- Playback & UI handlers ---
    async function handleMovieClick(itemOverride = null, startTimeOverride = 0) {
        const active_page = document.querySelector('.page[style*="block"]');
        if (active_page && active_page.id ==='page-series-details') return;

        let item = itemOverride;
        if (!item) {
            const focusedEl = document.querySelector(".vitem.focused");
            if (focusedEl && focusedEl.dataset.streamId && typeof virtualListMap !== 'undefined') {
                item = virtualListMap.get(focusedEl.dataset.streamId);
            }
        }

        if (!item) return;

        // Open Details View instead of playing immediately
        if (typeof ViewDetails !== 'undefined') {
            ViewDetails.show(item);
        }
    }

    function playMovie(item, startTime = 0, info = null) {
        if (!item) return;
        const streamId = item.stream_id;
        let ext = 'mp4';
        if (info && info.movie_data && info.movie_data.container_extension) {
            ext = info.movie_data.container_extension;
        } else if (item.container_extension) {
            ext = item.container_extension;
        }
        let url = "";
        if(isTestMode){
            url = item.direct_source;
        }else{
            url = `${xtreamConfig.host}/movie/${xtreamConfig.username}/${xtreamConfig.password}/${streamId}.${ext}`;
        }
        PlayerController.currentItem = {...item, type: 'vod' };
        _startPlaybackSession(url, startTime, 'vod', item, null);
    }

    function playEpisode(episode, seriesItem, startTime = 0) {
        if (!episode || !seriesItem) return;
        const streamId = episode.stream_id || episode.id;
        const ext = episode.container_extension || 'mp4';
        let url = "";
        if(isTestMode){
            url = episode.direct_source;
        }else if(episode.direct_source){
            url = episode.direct_source;
        }else{
            url = `${xtreamConfig.host}/series/${xtreamConfig.username}/${xtreamConfig.password}/${streamId}.${ext}`;
        }
        const _name = `${seriesItem.name} - S${String(episode.season).padStart(2,'0')}E${String(episode.episode_num).padStart(2,'0')}`
        PlayerController.currentItem = {...seriesItem, stream_type: 'series', name: _name };
        _startPlaybackSession(url, startTime, 'series', seriesItem, episode);
    }

    function playLive(item, isPreview = true) {
        if (!item) return;
        const streamId = item.stream_id;
        let url = "";
        if(isTestMode){
            url = item.direct_source;
        }else if(item.direct_source){
            url = item.direct_source;
        }else{
            url = `${xtreamConfig.host}/live/${xtreamConfig.username}/${xtreamConfig.password}/${streamId}.ts`;
        }
        PlayerController.currentItem = {...item, type: 'live' }; 

        if (isPreview) _startPreview(url, item);
        else _startPlaybackSession(url, 0, 'live', item, null);
        
    }

    function stop() {
        console.log("[PlayerController] Stopping...");
        playerOverlay.hideOverlay();
        currentState.isPlaying = false;
        currentState.isFullscreen = false;

        Loader.hide("stop");

        _stopSaveInterval();
        VideoEngine.stop();
        document.body.classList.remove('video-active');
        
        currentState.isPlaying = false;
        currentState.isFullscreen = false;
        
        
        
        const liveContainer = document.getElementById('tizen-player-container');
        if(liveContainer) {
            liveContainer.style.position = '';
            liveContainer.style.width = '';
            liveContainer.style.height = '';
        }
        Loader.hide("stop");

        // Update MediaController
        try { MC.reportMC("STOPPED", 0, 0); } catch (e) { /* ignore */ }
    }

    function togglePlay() {
        VideoEngine.togglePlay();

        playerOverlay.showOverlay();

        try {
            const info = VideoEngine.getTimeInfo() || { current: 0, duration: 0 };
            MC.reportMC(isPlaying() ? "PLAYING" : "PAUSED", info.current, info.duration);
        } catch (e) {
            console.warn("[PlayerController] togglePlay reportMC failed:", e);
        }
    }

    function goFullscreenLive() {
        if (currentState.type === 'live' && isActive) {
            currentState.isFullscreen = true;
            Loader.setRect();

            VideoEngine.switchToFullscreen();
            document.body.classList.add('video-active'); 
            
            showPage('page-player');
            pushToNavStack('page-player'); 
            FocusManager.setLayer(FocusManager.LAYERS.PLAYER);
            window.playerOverlay.setOverlayDetails();
            window.playerOverlay.showOverlay();
        }
    }

    function goPreviewLive() {
        if (currentState.type === 'live' && isActive && currentState.isFullscreen) {
            isGoingPreview=true;
            if(typeof goBack === 'function') goBack(); 
            
            currentState.isFullscreen = false;
            document.body.classList.remove('video-active'); 
            FocusManager.restorePreviousLayer(); 

            const container = document.getElementById('live-preview-container');
            setTimeout(() => {
                isGoingPreview=false;
            }, 100);
            if (container) {
                const r = container.getBoundingClientRect();
                const rect = { x: r.left, y: r.top, w: r.width, h: r.height };
                VideoEngine.setRect(rect);
                Loader.setRect()
            } else {
                stop();
            }
        }
    }

    // --- ZAPPING LOGIC ---
    function _channelUpDown(key) {
        // Only applicable for Live TV in Fullscreen
        if (currentState.type !== 'live' || !currentState.isFullscreen || !currentState.item) return false;

        if (!searchState.originalItems || searchState.originalItems.length === 0) return false;

        const currentId = currentState.item.stream_id;
        const currentIndex = searchState.originalItems.findIndex(i => i.stream_id === currentId);

        if (currentIndex === -1) return false;

        let nextIndex = currentIndex;
        if (key === 'ChannelUp' || key === 'PageUp') {
            nextIndex++;
            if (nextIndex >= searchState.originalItems.length) nextIndex = 0; // Loop to start
        } else {
            nextIndex--;
            if (nextIndex < 0) nextIndex = searchState.originalItems.length - 1; // Loop to end
        }

        const channelsItem = $$('#live-channels-list .nav-item');
        const nextItem = channelsItem[nextIndex];


        if (nextItem ) {
            showAlert(`Zapping to: ${nextItem.name}`);
            nextItem.click();
            playerOverlay.showOverlay(false);
            //playLive(nextItem, false);
            return true;
        }

        return false;
    }

    function _startPlaybackSession(url, startTime, type, item, episode) {
        stop();
        currentState = { isPlaying: true, isFullscreen: true, type, item, episode, startTime };
        document.body.classList.add('video-active'); 
        let player_errored=false;
        const callbacks = {
            onTimeUpdate: (time, duration) => _handleTimeUpdate(time, duration),
            onStateChange: (state) => {
                if (window.playerOverlay) window.playerOverlay.updateStreamInfo({ status: state });
                if (state === 'ended') _handleEnded();
            },
            onError: (msg) => {
                if(!player_errored){
                    stop();
                    FocusManager.restorePreviousLayer();
                    goBack();
                    player_errored=true;
                }
            },
            onReady: () => {}
        };
        console.log("[PlayerController] Started playback session:");
        if (window.playerOverlay) {
            window.playerOverlay.setOverlayDetails();
            window.playerOverlay.showOverlay();
        }
        VideoEngine.start(url, startTime, callbacks, type === 'live');

        if(FocusManager.getCurrentLayer()===FocusManager.LAYERS.PAGE){
            showPage('page-player');
            pushToNavStack('page-player'); 
            FocusManager.setLayer(FocusManager.LAYERS.PLAYER);
        }
        
        window.playerOverlay.setOverlayDetails();

        // For VOD we start periodic save & MC updates
        if (type !== 'live') _startSaveInterval();

        // Report to MediaController immediately (duration might be 0 until we get a time update)
        try {
            const info = VideoEngine.getTimeInfo() || { current: startTime || 0, duration: 0 };
            MC.reportMC("PLAYING", info.current || startTime || 0, info.duration || 0);
        } catch (e) {
            console.warn("[PlayerController] reportMC after start failed:", e);
        }
    }

    function _startPreview(url, item) {
        stop();
        currentState = { isPlaying: true, isFullscreen: false, type: 'live', item, episode: null, startTime: 0 };
        const callbacks = {
            onTimeUpdate: () => {},
            onStateChange: () => {},
            onError: (msg) => console.log("Preview Error", msg)
        };
        
        setTimeout(() => {
            const container = document.getElementById('live-preview-container');
            let rect = null;
            if (container) {
                const r = container.getBoundingClientRect();
                rect = { x: r.left, y: r.top, w: r.width, h: r.height };
            }
            VideoEngine.start(url, 0, callbacks, true, rect);

            // Report live preview to MediaController so the system shows it in Now Playing
            try { MC.reportMC("PLAYING", 0, 0); } catch (e) { /* ignore */ }
        }, 100);
    }

    function _handleTimeUpdate(time, duration) {
        if (currentState) {
            if (!currentState.duration && duration) currentState.duration = duration;
        }
        //try { MC.reportMC(currentState.isPlaying ? "PLAYING" : "PAUSED", time, duration); } catch (e) {}
    }
    
    function _handleEnded() {
        if (currentState.type !== 'live') _saveProgress(true);
        stop();
        FocusManager.restorePreviousLayer();
        if(typeof goBack === 'function') goBack();
    }
    
    function _startSaveInterval() {
        _stopSaveInterval();
        saveInterval = setInterval(() => _saveProgress(), 10000);
    }
    
    function _stopSaveInterval() {
        if (saveInterval) clearInterval(saveInterval);
        saveInterval = null;
    }
    
    function _saveProgress(forceComplete = false) {
        if (!currentState.isPlaying || !currentState.item) return;
        const info = VideoEngine.getTimeInfo();
        if (!info || info.duration === 0) return;
        let progress = info.current;
        if (forceComplete) progress = info.duration;
        if (typeof saveProgress === 'function') {
            saveProgress(currentState.item, progress, info.duration, currentState.type, currentState.episode);
            if(typeof saveUserSettings === 'function') saveUserSettings();
        }

        // also report to MediaController current position periodically
        try { MC.reportMC(currentState.isPlaying ? "PLAYING" : "PAUSED", info.current, info.duration); } catch (e) {}
    }
    function handleKey(key, event) {
        // Channel Zapping (Live Only)
        console.log("PC handleKey : ", key)
        if (key === 'ChannelUp' || key === 'ChannelDown' || key === 'PageUp' || key === 'PageDown') {
            if (_channelUpDown(key)) return true;
        }

        if (key === 'Guide' || key === 'f') {
            if (currentState.item) {
                const added = toggleFavorite(currentState.item.stream_id, currentState.type, currentState.item);
            }
            return true;
        }

        switch (key) {
            case 'Back':
            case 'Escape':
            case 'MediaStop':
                if (currentState.type === 'live' && currentState.isFullscreen) {
                    goPreviewLive();
                    return true;
                }
                stop();
                FocusManager.restorePreviousLayer(); 
                if(typeof goBack === 'function') goBack(); 
                return true;

            case 'MediaPlayPause':
            case 'MediaPlay':
            case 'MediaPause':
            case 'Enter': 
                togglePlay();
                return true;

            case 'ArrowLeft':
            case 'ArrowRight':
            case 'ArrowUp':
            case 'ArrowDown':
            case 'Caption':
                if (window.playerOverlay) window.playerOverlay.showOverlay();
                return true;
        }
        return false;
    }

    return {
        init,
        playMovie,
        playEpisode,
        playLive,
        goFullscreenLive,
        goPreviewLive,
        stop,
        togglePlay,
        handleKey,
        handleMovieClick,
        handleVisibilityChange, // Export new function
        isPlaying,
        _channelUpDown,
        _goBack,
        get currentItem() {
            return currentState?.item;
        },
        set currentItem(value) {
            currentState.item = value;
        },
        get currentState() {
            return currentState;
        },
        set currentState(value) {
            currentState = value;
        },
        get isActive() {
            return isActive;
        },
        set isActive(value) {
            isActive = value;
        },
        get isGoingPreview() {
            return isGoingPreview;
        },
        set isGoingPreview(value) {
            isGoingPreview = value;
        }
    };
})();

window.playMovie = PlayerController.playMovie;
window.playEpisode = PlayerController.playEpisode;
window.playLive = PlayerController.playLive;
window.goFullscreenLive = PlayerController.goFullscreenLive;
window.goPreviewLive = PlayerController.goPreviewLive;
window.stopPlayer = PlayerController.stop;
window.handleMovieClick = PlayerController.handleMovieClick;
