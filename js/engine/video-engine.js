// === Video Engine (Tizen/Web Abstraction) ===

const VideoEngine = (function() {

    let tizenPlayer = null;
    let webPlayer = null;
    let _callbacks = {};
    let _isTizen = false;
    let allowOverlay = true;
    let playerTracks = { 
            video:{}, 
            currentSubtitle: {},
            currentOnlineSubtitle: null,
            currentAudio: {},
            subtitles: [], 
            audios: [],
            downloadedSubtitles:[],
         };
    let currentItem = {};
    function init() {
        _isTizen = (typeof webapis !== 'undefined' && webapis.avplay);
        webPlayer = document.getElementById('web-video-player');
    }

    function start(url, startTime, callbacks = {}, isLive = false, rect = null) {
        if (!_isTizen && !webPlayer) init();
        _callbacks = callbacks;

        if (_isTizen) {
            _startTizen(url, startTime, isLive, rect);
        } else {
            _startWeb(url, startTime, isLive, rect);
        }
    }

    function stop() {
        if (_isTizen && tizenPlayer) {
            try {
                webapis.avplay.stop();
                webapis.avplay.setDisplayRect(0,0,0,0); 
                webapis.avplay.close();
                PlayerController.isActive = false;
                
                const container = document.getElementById('tizen-player-container');
                if(container) {
                    container.innerHTML = '';
                    container.style.display = 'none';
                }
            } catch (e) { console.warn("AVPlay stop error", e); }
            tizenPlayer = null;
        }

        if (webPlayer) {
            webPlayer.pause();
            webPlayer.src = '';
            webPlayer.style.display = 'none';
        }
        playerOverlay.isBuffering= false;
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

    // NEW: Updates the player size and position dynamically
    function setRect(rect) {
        if (PlayerController.currentState.isFullscreen) {
            rect = { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight };
        }
        if (_isTizen) {
            try {
                // Update the container DIV
                const container = document.getElementById('tizen-player-container');
                if (container) {
                    container.style.position = 'absolute'; // Ensure absolute positioning
                    container.style.left = rect.x + 'px';
                    container.style.top = rect.y + 'px';
                    container.style.width = rect.w + 'px';
                    container.style.height = rect.h + 'px';
                }
                // Update the hardware video plane
                webapis.avplay.setDisplayRect(rect.x, rect.y, rect.w, rect.h);
            } catch (e) {
                console.error("Failed to set Display Rect", e);
            }
        } else {
            // Update Web Player
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
        const total = webapis.avplay.getTotalTrackInfo();
        const audioTracks = [];
        const subtitleTracks = [];
        let videoTrack = {};
        for (let i = 0; i < total.length; i++) {
            const track = total[i];
            let extra = {};
            try {
                extra = JSON.parse(track.extra_info || '{}');
            } catch (e) {
                console.error('Failed to parse extra_info:', track.extra_info, e);
            }
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
            
            playerTracks.video = videoTrack;
            playerTracks.audios = audioTracks;
            playerTracks.subtitles = subtitleTracks;
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
                let extra = {};
                try {
                    extra = JSON.parse(track.extra_info || '{}');
                } catch (e) {
                    console.error('Failed to parse extra_info:', track.extra_info, e);
                }
                if (track.type === 'AUDIO') {
                    playerTracks.audios.map(a => {
                        a.isCurrent = (a.index === track.index);
                        return a;
                    });
                    playerTracks.currentAudio = playerTracks.audios.find(a => a.isCurrent) || {};
                }else if (track.type === 'TEXT') {
                    playerTracks.subtitles.map(a => {
                        a.isCurrent = (a.index === track.index);
                        return a;
                    });
                    playerTracks.currentSubtitle = playerTracks.subtitles.find(s => s.isCurrent) || {};
                }
            }
                    
        } catch (e) {
            console.error('Failed to get current track info:', e);
        }
    }                
    function updateResolution() {
        let resolution = '';
        let quality = '--';
        try {
            const v = playerTracks.video || {};
            if (!v.Height || !v.Width) return;
            const width = parseInt(v.Width, 10) || 0;
            const height = parseInt(v.Height, 10) || 0;
            if (width && height) {
                resolution = `${width}x${height}`;
                quality = height >= 2000 ? '4K' : height >= 1000 ? 'FHD' : height >= 700 ? 'HD' : 'SD';
            }
        } catch (e) {
            console.warn("Error updating resolution:", e);
        }
        window.playerOverlay.updateStreamInfo({ resolution,quality })
    }
    function switchToFullscreen() {
        if (_isTizen) {
            try {
                // Use setRect for consistency, pass full screen dimensions
                setRect();
            } catch (e) {}
        } else {
            webPlayer.style.position = 'fixed';
            webPlayer.style.top = '0';
            webPlayer.style.left = '0';
            webPlayer.style.width = '100%';
            webPlayer.style.height = '100%';
        }
        allowOverlay= true;

    }

    function _startTizen(url, startTime, isLive, rect) {
        const container = document.getElementById('tizen-player-container');
        container.innerHTML = '<object type="application/avplayer" id="av-player" style="width:100%; height:100%;"></object>';
        container.style.display = 'block'; 
        tizenPlayer = document.getElementById('av-player');
        allowOverlay = !isLive || !rect ;
        PlayerController.isPlaying(false);

        /*
        [Callback=FunctionOnly, NoInterfaceObject] interface AVPlayPlaybackCallback {
        void onbufferingstart();
        void onbufferingprogress(unsigned long percent);
        void onbufferingcomplete();
        void oncurrentplaytime(unsigned long currentTime);
        void onstreamcompleted();
        void onevent(AVPlayEvent eventid, DOMString data);
        void onerror(AVPlayError eventid);
        void onerrormsg(AVPlayError eventid, DOMString errorMsg);
        void ondrmevent(AVPlayDrmType type, drmData data);
        void onsubtitlechange(DOMString duration, DOMString subtitles, DOMString type, AVPlaySubtitleAttribute[] attributes);
        };
        */
       const subtitles_container = $('#subtitle-container');
       let subtitleClearTimer = null;
        const listeners = {
            onbufferingstart: () => { 
                Loader.show("BUFFERING");
                playerOverlay.isBuffering = true;
                if(_callbacks.onStateChange) _callbacks.onStateChange('buffering'); 
            },

            onbufferingprogress: function (percent) {
                if(PlayerController.isActive){
                    Loader.progress(percent);
                }
                //console.log("Buffering Progress: " + percent + "%");
                if (window.playerOverlay) window.playerOverlay.updateStreamInfo({ buffer_progress: percent });
            },
        
            onbufferingcomplete: () => { 
                Loader.hide("bf complted");
                playerOverlay.isBuffering = false;
                if (window.playerOverlay) window.playerOverlay.updateStreamInfo({ buffer_progress: 0,status:"PLAYIN" });

                if(_callbacks.onStateChange) _callbacks.onStateChange('playing'); 
                //applyRect(); 
            },
            onstreamcompleted: () => { 
                parseCurrentTracks();
                if(_callbacks.onStateChange) _callbacks.onStateChange('ended'); 

            },
            oncurrentplaytime: (time) => { 
                if(!PlayerController.isPlaying()){
                    PlayerController.isPlaying(true);
                }
                if(_callbacks.onTimeUpdate) {
                     let dur = 0; 
                     try { dur = webapis.avplay.getDuration(); } catch(e){}
                     _callbacks.onTimeUpdate(time/1000, dur/1000);
                }
            },
            onerror: (e) => { 
                if(e.includes("PLAYER_ERROR_NOT_SUPPORTED_FORMAT")|| e.includes("PLAYER_ERROR_NOT_SUPPORTED_FILE") ){
                    showError("Video format not supported!");
                }else if(e.includes("PLAYER_ERROR_CONNECTION_FAILED")){
                    showError("Video Connection failed!");
                }else{
                    showError("Streaming Video failed!");
                }
                if(_callbacks.onError) _callbacks.onError(e); 
                console.log(e)
            },
            onevent: (eventid, data) => { 
                // Handle other events if needed
                console.log("************************AVPlay Event:", eventid, data);
            },
            //subtitle related callbacks can be added here
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
                const subtitle_line=`<span>${text.trim()}</span>`;
                subtitles_container.innerHTML = subtitle_line;
                
                if (duration > 300) {
                    subtitleClearTimer = setTimeout(() => {
                        subtitles_container.innerHTML = '';
                        subtitleClearTimer = null;
                    }, duration - 100);
                }
            },
            
        };

        try {
            subtitles_container.innerHTML = '';
            webapis.avplay.open(url);
            webapis.avplay.setListener(listeners);
            setRect(rect);
            PlayerController.isActive = true;
            Loader.show("CONNECTING");

            webapis.avplay.prepareAsync(() => {
                setRect(rect);
                playerOverlay.setProgressBar();
                if (startTime > 0) {
                    webapis.avplay.seekTo(startTime * 1000, 
                        () => webapis.avplay.play(),
                        () => webapis.avplay.play()
                    );
                } else {
                    webapis.avplay.play();
                }
                parseTracks();
                updateResolution();
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
        webPlayer.src = url;
        webPlayer.style.display = 'block';

        if (rect) {
            setRect(rect);
        } else {
            webPlayer.style.position = 'fixed';
            webPlayer.style.inset = '0';
        }

        webPlayer.currentTime = startTime;
        webPlayer.play().catch(e => console.log("Autoplay blocked", e));
        webPlayer.onStateChange = () => {
            if(_callbacks.onStateChange) {
                const state = webPlayer.paused ? 'paused' : 'playing';
                _callbacks.onStateChange(state);
            }
        }
        webPlayer.ontimeupdate = () => {
             if(_callbacks.onTimeUpdate) _callbacks.onTimeUpdate(webPlayer.currentTime, webPlayer.duration);
        };
        webPlayer.onended = () => {
             if(_callbacks.onStateChange) _callbacks.onStateChange('ended');
        };
    }

    return {
        init,
        start,
        stop,
        togglePlay,
        getTimeInfo,
        switchToFullscreen,
        setRect,
        parseCurrentTracks,
        get playerTracks() {
            return playerTracks;
        },
        get allowOverlay() {
            return allowOverlay;
        },

    };
})();