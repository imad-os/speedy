/* 08-player-overlay.js */

(function () {
  'use strict';

  const PROGRESS_RAF_MIN_MS = 250;
  const SEEK_STEP_MS = 10 * 1000;
  const UI_AUTOHIDE_MS = 4000;

  const $ = (s) => document.querySelector(s);
  const noop = () => {};

  function fmtTimeSec(s) {
    s = Number(s) || 0;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return h > 0 ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  }

  const cache = {};
  let streamInfo = { status: 'Idle', resolution: "", quality: '--' ,buffer_progress:0, isBuffering:false};
  let overlayVisible = false;
  let rafId = null;
  let lastRafTime = 0;
  let requestedToStopRaf = false;
  let autoHideTimer = null;
  let lastProgressPct = -1;
  let isSeeking = false; 

  function updateClock() {
      const el = cache.clock;
      if (!el) return;
      const d = new Date();
      el.textContent = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }
  function startClock() { updateClock(); setInterval(updateClock, 10*1000); }
  function getState(){
    const state = typeof webapis !== "undefined" ? webapis.avplay.getState().toLocaleLowerCase() : "playing";
    return state
  }
  function updateStreamInfo(info) {
      streamInfo = Object.assign(streamInfo, info || {});
      streamInfo.status = streamInfo.isBuffering || streamInfo.buffer_progress > 0 ? 'Buffering' : streamInfo.status;
      if (cache.streamStatus) cache.streamStatus.textContent = capitalize(streamInfo.status);
      if (cache.streamResolution) cache.streamResolution.textContent = `${streamInfo.resolution}`;
      if (cache.streamQuality){
        cache.streamQuality.textContent = streamInfo.quality;
        Array.from(cache.streamQuality.classList)
            .filter(c => c.indexOf('tag_') === 0)
            .forEach(c => cache.streamQuality.classList.remove(c));
        cache.streamQuality.classList.add(`tag_${streamInfo.quality}`);

      }

      
      if (cache.iconPlayPause) {
            const state = getState();

          const useTag = cache.iconPlayPause.querySelector('use');
          if (useTag) {
              if (state === 'playing') {
                  useTag.setAttribute('href', '#icon-pause');
                  PlayerController.isPlaying(true);
              } else {
                PlayerController.isPlaying(false);
                  useTag.setAttribute('href', '#icon-play');
              }
          }
      }
    

      //const loader = $('#player-buffer-loader');
      if (streamInfo.status.toLocaleLowerCase() === 'buffering' ) {
          //if (loader) loader.classList.remove('hidden');
          showOverlay(false); 
      } else {
          //if (loader) loader.classList.add('hidden');
          if (overlayVisible && (!autoHideTimer || streamInfo.status.toLocaleLowerCase() !== 'buffering')) {
              setTimeoutOverlay()
          }
      }
  }
  function getActivePlayer() {
    if (typeof webapis !== 'undefined' && window.webapis && window.webapis.avplay) {
      if (cache.playerType) cache.playerType.textContent = "[native]";
      return { type: 'tizen', obj: webapis.avplay };
    }
    const v = document.querySelector('video');
    if (v) {
        if (cache.playerType) cache.playerType.textContent = "[html5]";
        return { type: 'web', obj: v };
    }
  }

  function togglePlayPause(forcePlayPause=null) {
    const p = getActivePlayer();
    if (!p) return;
    setTimeoutOverlay();

    if (p.type === 'web') {
      const v = p.obj;
      if (v.paused) { v.play().catch(noop); updateStreamInfo({ status: 'playing' }); }
      else { v.pause(); updateStreamInfo({ status: 'paused' }); }
    } else {
      try {
        const state = webapis.avplay.getState && webapis.avplay.getState() .toLocaleLowerCase();
        const isPlaying = state==="playing";
        const isPaused =  state === 'paused' || state === 'ready' || state === 'stopped';
        if ( isPlaying && [null, false].includes(forcePlayPause) ) { 
            webapis.avplay.pause(); 
            updateStreamInfo({ status: 'paused' }); 
        }else if( isPaused && [null, true].includes(forcePlayPause) ) { 
            webapis.avplay.play(); 
            updateStreamInfo({ status: 'playing' }); 
        }
      } catch {}
    }
    cache.btnPlay.focus();
  }


    let seekAccumulator = 0;
    let seekTimeout;
    function requestSeek(direction) {
        const state = webapis.avplay.getState();
        if ( !["playing",'paused'].includes( state.toLocaleLowerCase() )  ) return;
        if(isSeeking===false && cache.progressWrapper) { 
            setTimeout(function(){cache.progressWrapper.focus(); },200);
         }
        isSeeking = true;

        let  propotion = Math.abs(seekAccumulator) / SEEK_STEP_MS;
        if(propotion >50) propotion = 10;
        else if(propotion >=30) propotion = 5;
        else if(propotion >=10) propotion = 3;
        else if(propotion >=5) propotion = 1.2;
        else propotion =1;
        //key === 'ArrowLeft' || key === 'ArrowRight'
        // FIX: direction can now be MediaRewind/MediaFastForward too
        const isForward = (direction === 'ArrowRight' || direction === 'MediaFastForward');
        seekAccumulator += isForward ? SEEK_STEP_MS*propotion : SEEK_STEP_MS*propotion * -1;

        if(seekTimeout) clearTimeout(seekTimeout);
        seekTimeout = setTimeout(applySeek, 500); 

        const duration = webapis.avplay.getDuration(); 
        const currenttime = webapis.avplay.getCurrentTime();
        const newTime = Math.max(0, Math.min(duration, (currenttime || 0) + Math.round(seekAccumulator)));

        updateProgressUI(newTime / 1000, duration / 1000);
        
    }

    function applySeek() {
        console.log(`Applying seek: ${seekAccumulator}ms`);
        // 10 second seek
        const currenttime = webapis.avplay.getCurrentTime();
        const duration = webapis.avplay.getDuration(); 
        //const newTime = time + seekAccumulator;
        const newTime = Math.max(0, Math.min(duration, (currenttime || 0) + Math.round(seekAccumulator)));
        webapis.avplay.seekTo(newTime,
            () => console.log("Seek forward success"),
            (e) => console.error("Seek forward error", e)
        );
        seekAccumulator = 0;        
        updateProgressUI(newTime / 1000, duration / 1000);
        isSeeking = false;
    }


  function updateProgressUI(currentSec, durationSec) {
      const inner = cache.progressInner;
      const thumb = cache.progressThumb;
      const elapsed = cache.timeElapsed;
      const duration = cache.timeDuration;
      
      if (!inner || !elapsed || !duration) return;
      
      const pct = durationSec > 0 ? (currentSec / durationSec) * 100 : 0;
      
      inner.style.width = pct + '%'; 
      if(thumb) thumb.style.left = pct + '%';
      
      elapsed.textContent = fmtTimeSec(currentSec);
      duration.textContent = fmtTimeSec(durationSec);
  }

  function updateProgressOnce() {
      if (isSeeking) return;
      const p = getActivePlayer();
      if (!p) return;
  
      let cur = 0, dur = 0;
      if (p.type === 'web') {
        const v = p.obj;
        cur = v.currentTime || 0;
        dur = v.duration || 0;
      } else {
        try {
          cur = (webapis.avplay.getCurrentTime() || 0) / 1000;
          dur = (webapis.avplay.getDuration() || 0) / 1000;
        } catch {}
      }
      updateProgressUI(cur, dur);
  }
  
  function progressRafLoop(ts) {
      if (!lastRafTime) lastRafTime = ts;
      if (ts - lastRafTime >= PROGRESS_RAF_MIN_MS) { lastRafTime = ts; updateProgressOnce(); }
      if (!requestedToStopRaf) rafId = requestAnimationFrame(progressRafLoop);
  }
  function startProgressUpdates() { requestedToStopRaf = false; if (!rafId) rafId = requestAnimationFrame(progressRafLoop); }
  function stopProgressUpdates() { requestedToStopRaf = true; if (rafId) cancelAnimationFrame(rafId); rafId = null; }

  function showOverlay(autoHide = true) {
    if(!PlayerController.currentState.isFullscreen){
        return false;
    }
    setTimeoutOverlay(autoHide);

    if(FocusManager.getCurrentLayer()!==FocusManager.LAYERS.PLAYER){
        if(FocusManager.getCurrentLayer()===FocusManager.LAYERS.MODAL){
            setTimeoutOverlay(autoHide);
        }
        return;
    }
    if(!VideoEngine || !VideoEngine.allowOverlay || !PlayerController.isActive) return;
    if (!cache.overlay) { init(); if (!cache.overlay) return; }

    if (typeof FocusManager !== 'undefined') {
        if (FocusManager.getCurrentLayer() !== FocusManager.LAYERS.MODAL) {
            FocusManager.setLayer(FocusManager.LAYERS.OVERLAY);
        }
    }
    
    requestAnimationFrame(() => {
        cache.overlay.classList.remove('hidden');
        if (cache.btnPlay && FocusManager.getCurrentLayer() === FocusManager.LAYERS.OVERLAY) {
            cache.btnPlay.focus();
        }
    });
    
    overlayVisible = true;
    startProgressUpdates();

  }
  function updateFavIcon(){
    if(cache.isFav){
        const stream_id = PlayerController.currentItem.stream_id || PlayerController.currentItem.series_id;
        const isFav = isFavorite( stream_id );
        const iconHref = isFav ? '#icon-heart-full' : '#icon-heart-empty';
        cache.isFav.innerHTML = `<svg class="icon icon-lg"><use href="${iconHref}"></use></svg>`;
    }
  }
    function setTimeoutOverlay(autoHide = true) {
        // 1. Always kill the existing timer first
        if (autoHideTimer) {
            clearTimeout(autoHideTimer);
            autoHideTimer = null;
        }

        // 2. Only start a new one if requested and NOT buffering
        if (autoHide && streamInfo.status.toLocaleLowerCase() !== 'buffering') {
            console.log("Overlay timer started for 4s");
            autoHideTimer = setTimeout(() => {
                // Double check visibility before hiding to prevent transition bugs
                if (overlayVisible) hideOverlay();
            }, UI_AUTOHIDE_MS);
        }
    }
  function hideOverlay() {
    console.log("hideOverlay called");
    clearTimeout(autoHideTimer);
    autoHideTimer=null;
    if (
        (streamInfo.status.toLocaleLowerCase() === 'buffering' &&  PlayerController.isActive ) ||
        isSeeking
    ) return;
    
    if(cache.modalSubtitlesSettings && !cache.modalSubtitlesSettings.classList.contains('hidden')) return;
    if(document.getElementById('tizen-track-modal') && !document.getElementById('tizen-track-modal').classList.contains('hidden')) return;


    const overlay = $('#tizen-player-overlay');
    if (!overlay) return;
    
    if (typeof FocusManager !== 'undefined') {
        if (FocusManager.getCurrentLayer() === FocusManager.LAYERS.MODAL) return;
        
        if (FocusManager.getCurrentLayer() === FocusManager.LAYERS.OVERLAY) {
            FocusManager.restorePreviousLayer(); 
        }
    }

    //overlay.style.opacity = '0';
    //overlay.classList.add('opacity-0');
    if(cache && cache.btnPlay)cache.btnPlay.focus();
    overlay.classList.add('hidden')

    overlayVisible = false;
    stopProgressUpdates();
  }

  function setOverlayDetails() {
    if (!cache.overlay) { init(); if (!cache.overlay) return; }
    const currentItem = PlayerController.currentItem || null;
    if (!currentItem) return;
    
    if (cache.title) cache.title.textContent = currentItem.name || currentItem.title || 'Unknown Title.';
    updateFavIcon();
    if (cache.rating) {
        const rating = currentItem.rating || currentItem.rating_5based || 0;
      if (currentItem.rating) { 
          cache.rating.style.display = 'flex'; 
          cache.rating.innerHTML = `<svg class="icon-sm text-yellow-400"><use href="#icon-star"></use></svg> Rating: ${Number(rating).toFixed(1)}`; 
      }else cache.rating.style.display = 'none';
    }
    if(cache.icon){
        if(currentItem.stream_icon){
            cache.icon.src = currentItem.stream_icon;
            cache.icon.classList.remove('hidden');
        } else {
            cache.icon.src = '';
            cache.icon.classList.add('hidden');
        }
    }
  }

  // --- TRACK & SUBTITLE LOGIC ---

  function openTrackModal(type) {
        const modal = $('#tizen-track-modal');
        const list = $('#tizen-track-modal-list');
        const title = $('#tizen-track-modal-title');
        
        if (!modal || !list) return;
        VideoEngine.parseCurrentTracks();
        list.innerHTML = '';
        const tracks = VideoEngine.playerTracks[`${type}s`] || [];
        if(type == "subtitle"){
            _addModalOption(list, 'Off', () => _setSubtitle(-1));
        }
        for (let index = 0; index < tracks.length; index++) {
            const track = tracks[index];
            const onclickFn = type === 'audio' ? () => _setAudio(track.index) : () => _setSubtitle(track.index);
            _addModalOption(
                list, 
                track.language, 
                onclickFn, 
                track.isCurrent && (type === 'audio' || !VideoEngine.playerTracks.currentOnlineSubtitle)
            );

        }
        if(type === "subtitle" && SubtitleFetcher.isAvailable){
          // 3. "Download Online" Option
          const dlBtn = document.createElement('button');
          dlBtn.className = 'nav-item w-full text-left p-3 rounded bg-card text-main hover:bg-opacity-80 font-bold border-t border-gray-600 mt-2 flex items-center gap-2';
          dlBtn.innerHTML = `<svg class="icon-sm"><use href="#icon-download"></use></svg> Download Subtitles`;
          dlBtn.onclick = () => _fetchOnlineSubtitles(list);
          list.appendChild(dlBtn);
        }

      modal.classList.remove('hidden');
      if (typeof FocusManager !== 'undefined') FocusManager.setLayer(FocusManager.LAYERS.MODAL);
      
      setTimeout(() => {
          const first = list.querySelector('.nav-item');
          if(first) first.focus();
      }, 100);
      
  }

  function _addModalOption(list, text, onClick, isActive=false, dontClose=false) {
      const btn = document.createElement('button');
      btn.className = `nav-item w-full text-left p-3 rounded ${isActive ? 'bg-primary text-white' : 'bg-card text-main'} hover:bg-opacity-80 mb-1`;
      btn.innerHTML = text;
      btn.onclick = () => {
          onClick.call(btn);
          if(!dontClose){
            closeTrackModal();
          }
      };
      list.appendChild(btn);
  }

  function closeTrackModal() {
    setTimeoutOverlay();
      $('#tizen-track-modal').classList.add('hidden');
      if (typeof FocusManager !== 'undefined') FocusManager.restorePreviousLayer(); 
      if(cache.btnSub && document.body.contains(cache.btnSub)) cache.btnSub.focus();
  }

// Inside player-overlay.js

  function _setSubtitle(index) {
    if(playerOverlay.isBuffering){
        return;
    }
    const isExternalActive = (VideoEngine.playerTracks.currentOnlineSubtitle !== null);
    VideoEngine.playerTracks.currentOnlineSubtitle = null;
    if (isExternalActive) {
        VideoEngine.reload(index);
        return;
    }
    webapis.avplay.setSilentSubtitle(false);

    const p = getActivePlayer();
    if (p && p.type === 'tizen') {
        try {
            const subContainer = document.getElementById('subtitle-container');
            if(subContainer) subContainer.innerHTML = '';

            if (index !== -1) {
            // Normal switching logic
            webapis.avplay.pause();
            webapis.avplay.setSelectTrack('TEXT', index);
            setTimeout(() => {
                webapis.avplay.play();
            }, 200);
                showAlert(`Subtitle Track ${index} selected`);
            } else {
                webapis.avplay.setSilentSubtitle(true);
                showAlert("Subtitles Off");
            }

        } catch(e) { 
            console.warn("Subtitle set error", e);
            if (index === -1) showAlert("Subtitles Off");
        }
    }
  }

  function _setAudio(index) {
      const p = getActivePlayer();
      if (p && p.type === 'tizen') {
          try {
              webapis.avplay.setSelectTrack('AUDIO', index);
              showAlert(`Audio Track ${index} selected`);
          } catch(e) { showError("Failed to set audio"); }
      }
  }

  function _fetchOnlineSubtitles(listContainer) {
    const currentItem = PlayerController.currentItem;
      if (!currentItem) { showError("No media info found"); return; }
      
      listContainer.innerHTML = '<div class="loader mx-auto mt-6"></div>';
      
      if (typeof SubtitleFetcher !== 'undefined') {
          const type = (currentItem.stream_type === 'series' || currentItem.series_id) ? 'episode' : 'movie';
          
          SubtitleFetcher.fetchSubtitles(currentItem, type, (subs) => {
              listContainer.innerHTML = ''; 
              VideoEngine.playerTracks.downloadedSubtitles = subs;
              if (subs && subs.length > 0) {
                  subs.forEach(sub => {
                      const cloudIcon = `<svg class="icon-lg text-primary mx-3"><use href="#icon-download"></use></svg>`; 
                      const text = ` ${cloudIcon} <span>${sub.lang || ''} - ${sub.label||''} </span>`;
                      
                      // UPDATE: Call the real download function
                      const onClick = function() {
                        this.innerHTML += `<span class='loader loader-sm absolute right-3'></span>`;
                          SubtitleFetcher.downloadAndSetSubtitle(sub.file, (path) => {
                            showAlert("Subtitle Applied!");
                              closeTrackModal();
                              VideoEngine.playerTracks.currentOnlineSubtitle=sub.file;

                          }, (err) => {
                            showAlert("Download Failed: " + err);
                          });
                      };
                    const isActive = VideoEngine.playerTracks.currentOnlineSubtitle===sub.file;
                    _addModalOption(listContainer, text, onClick, isActive, true);
                  });
                  
                  const first = listContainer.querySelector('.nav-item');
                  if(first) first.focus();
                  
              } else {
                  listContainer.innerHTML = '<p class="p-4 text-alt text-center">No subtitles found.</p>';
              }
          }, (err) => {
              listContainer.innerHTML = `<p class="p-4 text-red-500 text-center">${err}</p>`;
          });
      } else {
           listContainer.innerHTML = '<p class="p-4 text-red-500 text-center">Subtitle Fetcher Missing</p>';
      }
  }

  // --- NAVIGATION LOGIC ---
  function _overlaySpatialNav(key) {
      const overlay = $('#tizen-player-overlay');
      if (!overlay) return false;
      
      const controls = Array.from(overlay.querySelectorAll('.controls-row button, .controls-row .nav-item'));
      const current = document.activeElement;
      
      if (!current || current === document.body || !overlay.contains(current)) {
          if (cache.btnPlay) { cache.btnPlay.focus(); return true; }
          if (controls.length > 0) { controls[0].focus(); return true; }
      }
      setTimeoutOverlay(true);
      if (key === 'ArrowUp') {
          if (controls.includes(current)) {
              if(cache.progressWrapper) { cache.progressWrapper.focus(); return true; }
          }else if (current===cache.progressWrapper){
                hideOverlay();
          }
          return true; 
      }
      
      if (key === 'ArrowDown') {
          if (current === cache.progressWrapper) {
              if(cache.btnPlay) { cache.btnPlay.focus(); return true; }
              else if (controls.length > 0) { controls[0].focus(); return true; }
          }
          return true; 
      }

      if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'MediaRewind' || key === 'MediaFastForward') {
          if (current === cache.progressWrapper || key === 'MediaRewind' || key === 'MediaFastForward') {
              // Map dedicated keys or arrows to seek direction
              requestSeek(key);
              return true;
          }
          const currentIndex = controls.indexOf(current);
          if (currentIndex !== -1) {
              let nextIndex = currentIndex;
              if (key === 'ArrowRight') nextIndex++;
              if (key === 'ArrowLeft') nextIndex--;
              
              if (nextIndex >= 0 && nextIndex < controls.length) {
                  controls[nextIndex].focus();
                  return true;
              }
          }
      }
      return false;
  }

  function handleKey(key, event) {
    const keys2return = ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight", "Caption"];
    if(!InputManager.isBack(key) && cache.overlay && cache.overlay.classList.contains("hidden")){
        showOverlay();
        if(keys2return.includes(key)){
            return true;
        }
    }
    
    if (key === 'ChannelUp' || key === 'ChannelDown' || key === 'PageUp' || key === 'PageDown') {
        if (PlayerController._channelUpDown(key)) return true;
    }
    if (cache.modalSubtitlesSettings && !cache.modalSubtitlesSettings.classList.contains('hidden')) {
        _handleSettingsModalNav(key);
        return true; 
    }
        console.log("[OverLay] PC handleKey : ", key)
      switch (key) {
          case 'MediaPlayPause': togglePlayPause(); return true;
          case 'MediaPlay':
               togglePlayPause(true);
               return true;
          case 'MediaPause':
               togglePlayPause(false);
               return true;
          case 'MediaRewind':
          case 'MediaFastForward':
            console.log("seeking : ",key)
               
               requestSeek(key);
               return true;
          case 'Enter':
              if (document.activeElement && document.activeElement !== document.body && cache.overlay.contains(document.activeElement)) {
                  document.activeElement.onclick(); 
              } else {
                  togglePlayPause(); 
              }
              return true;
          case 'ArrowLeft': 
          case 'ArrowRight': 
          case 'ArrowUp': 
          case 'ArrowDown': 
              if (_overlaySpatialNav(key)) return true;
              return false; 

            case 'Back':
            case 'Escape':
            case 'MediaStop':
                if(overlayVisible && !playerOverlay.isBuffering
                    //(streamInfo.status.toLocaleLowerCase() !== 'buffering' ||!PlayerController.isPlaying() )
                ) {
                    hideOverlay()
                    return true;
                }else if ( 
                    FocusManager.getCurrentLayer() === FocusManager.LAYERS.MODAL || 
                    FocusManager.getCurrentLayer() === FocusManager.LAYERS.OVERLAY
                ) {
                    console.log("[PlayerOverlay] Force closing layer via Back");
                    if( playerOverlay.isBuffering && PlayerController._goBack() ){
                        return true;
                    }
                }
                if (PlayerController.currentState.type === 'live' && PlayerController.currentState.isFullscreen) {
                    PlayerController.goPreviewLive();
                    return true;
                }
                PlayerController.stop();
                FocusManager.restorePreviousLayer(); 
                if(typeof goBack === 'function') goBack(); 
                return true;
         case "f":
         case "Guide":
            if (PlayerController.currentState.item) {
                const added = toggleFavorite(
                    PlayerController.currentState.item.stream_id, 
                    PlayerController.currentState.type, 
                    PlayerController.currentState.item);
            }
            return true;
      }
      return false;
  }

  function applySubtitleSettings() {
    const container = document.getElementById('subtitle-container');
    const settings = userSettings.subtitle;
    
    if (!container || !settings) return;

    const sizeVal = subtitleConfig.sizes[settings.size] || subtitleConfig.sizes.medium;
    const colorVal = subtitleConfig.colors[settings.color] || subtitleConfig.colors.white;
    
    let bgVal = subtitleConfig.backgrounds[settings.background];
    if(settings.background === 'black_quarter') bgVal = "rgba(0,0,0,0.25)"; 
    if(!bgVal) bgVal = "rgba(0,0,0,0)";

    const fontVal = settings.font || 'Arial';

    container.style.setProperty('--sub-size', sizeVal);
    container.style.setProperty('--sub-color', colorVal);
    container.style.setProperty('--sub-bg', bgVal);
    //container.style.setProperty('--sub-font', fontVal);
    
    const preview = document.getElementById('sub-preview-box');
    if(preview) {
        preview.style.fontSize = settings.size; 
        preview.style.color = colorVal;
        preview.style.backgroundColor = bgVal;
        //preview.style.fontFamily = fontVal;
        if(settings.size === 'small') preview.style.transform = "scale(0.8)";
        else if(settings.size === 'large') preview.style.transform = "scale(1.2)";
        else preview.style.transform = "scale(1)";
    }
}

function openSubtitleSettings() {
    if (!cache.modalSubtitlesSettings) return;

    _renderSettingsList('sub-set-size-list', subtitleConfig.sizes, 'size');
    _renderSettingsList('sub-set-color-list', subtitleConfig.colors, 'color');
    _renderSettingsList('sub-set-bg-list', subtitleConfig.backgrounds, 'background');
    _renderSettingsList('sub-set-font-list', subtitleConfig.fonts, 'font', true); 

    cache.modalSubtitlesSettings.classList.remove('hidden');
    
      setTimeout(() => {
          const firstList = document.getElementById('sub-set-size-list');
          const target =  firstList.querySelector('button');
          if (target) {
              target.focus();
              console.log("[Settings] Initial focus set to:", target.textContent);
          }
      }, 100);

}

function closeSubtitleSettings() {
    if (cache.modalSubtitlesSettings) cache.modalSubtitlesSettings.classList.add('hidden');
    
    if (cache.btnSubSettings) cache.btnSubSettings.focus();
    showOverlay();
    
    saveUserSettings();
}

// --- SETTINGS MODAL NAVIGATION LOGIC ---
function _handleSettingsModalNav(key) {
    const active = document.activeElement;
    const colsIds = ['sub-set-size-list', 'sub-set-color-list', 'sub-set-bg-list', 'sub-set-font-list'];
    
    let colIndex = -1;
    let inList = false;
    const isInlist =(el)=>{
        if(!el) return false;
        const parent = el.parentElement;
        if(!parent) return false;
        if(el===active){
            colIndex = colsIds.indexOf(parent.id);
        }
        return colsIds.indexOf(parent.id) !== -1;
    }

    inList = isInlist(active);

    if (key === 'Back' || key === 'Escape') {
        closeSubtitleSettings();
        return;
    }

    if (key === 'Enter') {
        active.click();
        return;
    }

    if (key === 'ArrowDown') {
        const tofocus = active.nextElementSibling;
        if (inList && tofocus && isInlist(tofocus)) {
            tofocus.focus();
        }
    } else if (key === 'ArrowUp') {
        const tofocus = active.previousElementSibling;
        if (inList && tofocus && isInlist(tofocus)) {
            tofocus.focus();
        }
    } 
    else if (key === 'ArrowRight') {
        if (inList && colIndex < colsIds.length - 1) {
            const nextCol = document.getElementById(colsIds[colIndex + 1]);
            _focusSimilarIndex(nextCol, active);
        }
    } 
    else if (key === 'ArrowLeft') {
        if (inList && colIndex > 0) {
            const prevCol = document.getElementById(colsIds[colIndex - 1]);
            _focusSimilarIndex(prevCol, active);
        }
    }
}
function _focusSimilarIndex(targetList, currentItem) {
      if (!targetList || !targetList.children.length) return;
      
      const selected = targetList.querySelector('.selected');
      if (selected) {
          selected.focus();
      } else {
          targetList.children[0].focus();
      }
  }

function _renderSettingsList(elementId, dataSrc, settingKey, isArray = false) {
    const list = document.getElementById(elementId);
    if(!list) return;
    list.innerHTML = '';

    const currentVal = userSettings.subtitle[settingKey];

    const createBtn = (key, displayVal, rawVal) => {
        const btn = document.createElement('button');
        const isSelected = (currentVal === key)?'selected':'';
        btn.className = `nav-item sub-setting-btn w-full ${isSelected}`;
        btn.textContent = displayVal;
        
        if(settingKey === 'font') btn.style.fontFamily = rawVal;
        if(settingKey === 'color') {
            btn.innerHTML = `${displayVal}`;
            btn.style.color = rawVal;
        }

        btn.onclick = () => {
            userSettings.subtitle[settingKey] = key;
            
            Array.from(list.children).forEach(c => c.classList.remove('selected'));
            btn.classList.add('selected');
            
            applySubtitleSettings();
        };
        list.appendChild(btn);
    };

    if (isArray) {
        dataSrc.forEach(fontName => createBtn(fontName, fontName, fontName));
    } else {
        Object.entries(dataSrc).forEach(([key, val]) => {
            let display = key.replace(/_/g, ' ');
            display = display.charAt(0).toUpperCase() + display.slice(1);
            createBtn(key, display, val);
        });
    }
}

  function setProgressBar(){
    const show = webapis.avplay.getDuration();
    if(show){
        if(cache.progressContainer)cache.progressContainer.classList.remove("hidden");
    }else{
        if(cache.progressContainer)cache.progressContainer.classList.add("hidden");
    }
  }

  function init() {
    cache.overlay = document.getElementById('tizen-player-overlay');
    if (!cache.overlay) return; 

    // APPLY SKIN CLASS TO PARENT PAGE
    const pagePlayer = document.getElementById('page-player');
    if (pagePlayer) {
        // Reset classes
        pagePlayer.classList.remove(playerSkins.map(s=>s.id));
        // Add current skin class
        const currentSkin = userSettings.player_skin || 'skin-neo-olt';
        for(let i=0;i<playerSkins.length;i++){
            pagePlayer.classList.remove(playerSkins[i].id);
        }
        pagePlayer.classList.add(currentSkin);

    }

    cache.btnPlay = document.getElementById('btn-playpause');
    cache.iconPlayPause = document.getElementById('icon-playpause-svg');
    cache.btnSub = document.getElementById('btn-subtitles');
    cache.btnAudio = document.getElementById('btn-audio');
    cache.btnSubSettings = document.getElementById('btn-sub-settings');
    
    
    cache.progressContainer = document.getElementById('tizen-progress-bar-container'); 
    cache.progressWrapper = document.getElementById('tizen-progress-bar'); 
    cache.progressInner = document.getElementById('tizen-progress-fill'); 
    cache.progressThumb = document.getElementById('tizen-progress-thumb');
    
    cache.timeElapsed = document.getElementById('tizen-progress-time');
    cache.timeDuration = document.getElementById('tizen-progress-duration');
    
    cache.clock = document.getElementById('overlay-current-clock');
    cache.title = document.getElementById('overlay-movie-name');
    cache.isFav = document.getElementById('overlay-movie-fav');
    cache.icon = document.getElementById('overlay-movie-icon');
    cache.rating = document.getElementById('overlay-movie-rating');
    cache.rating = document.getElementById('overlay-movie-rating');
    
    cache.streamStatus = document.getElementById('stream-status');
    cache.streamResolution = document.getElementById('stream-resolution');
    cache.streamQuality = document.getElementById('stream-quality');

    cache.bufferPercentage = document.getElementById('player-buffer-percentage');
    
    cache.modalSubtitlesSettings = document.getElementById('subtitle-settings-modal');

    startClock();

    if (cache.btnPlay) cache.btnPlay.onclick = togglePlayPause;
    if (cache.btnSub) cache.btnSub.onclick = () => openTrackModal('subtitle'); 
    if (cache.btnAudio) cache.btnAudio.onclick = () => openTrackModal('audio'); 
    if (cache.btnSubSettings) cache.btnSubSettings.onclick = openSubtitleSettings;

    if (typeof FocusManager !== 'undefined') FocusManager.register(FocusManager.LAYERS.OVERLAY, { handleKey });

    if (cache.overlay) {
        cache.overlay.classList.add('hidden');
    }
    applySubtitleSettings();


  }

  window.playerOverlay = { 
    init, 
    showOverlay, 
    hideOverlay, 
    setOverlayDetails, 
    updateStreamInfo, 
    _addModalOption,
    closeSubtitleSettings, 
    closeTrackModal, 
    applySubtitleSettings,
    setProgressBar,
    _setAudio,
    _setSubtitle,
    setTimeoutOverlay,
    get streamInfo(){return streamInfo} ,
    handleKey,
    updateFavIcon
};
})();