// === Full Page Movie Details (Optimized) ===

const ViewDetails = (function(){
    
    // 1. CACHE DOM ELEMENTS
    const UI = {
        playBtn: $('#detail-play-btn'),
        favBtn: $('#detail-fav-btn'),
        favIconUse: $('#detail-fav-btn use'), 
        favText: $('#detail-fav-btn span'), 
        title: $('#detail-title'),
        poster: $('#detail-poster'),
        rating: $('#detail-rating'),
        plot: $('#detail-plot'),
        year: $('#detail-year'),
        duration: $('#detail-duration'),
        genre: $('#detail-genre'),
        director: $('#detail-director'),
        cast: $('#detail-cast'),
        techInfo: $('#detail-tech-info') // NEW: Container for Video/Audio Specs
    };

    let currentStreamId = null;
    let currentItemData = null; 

    // 2. STATIC EVENT LISTENERS
    UI.playBtn.onclick = () => {
        if (!currentItemData) return;
        const info = getwatchingProgress(currentStreamId);
        const start = (info && info.progress_sec) || 0;
        PlayerController.playMovie(currentItemData, start);
    };
    
    UI.favBtn.onclick = () => {
        if (!currentStreamId) return;
        toggleFavorite(currentStreamId, 'vod', currentItemData);
        updateFavButton();
    };
    function resToTag(width, height){
        if (!width || !height){
            return {qualityTag:"", qualityClass:"", resBadge:"", resolution:"-"}
        }
        let qualityTag="SD";
        if (width >= 3840) qualityTag = '4K';
        else if (width >= 1920) qualityTag = 'FHD';
        else if (width >= 1280) qualityTag = 'HD';

        const qualityClass = `tag_${qualityTag}`;
        const resolution = `${width}x${height}`;
        const resBadge = `<span class="tech-badge ${qualityClass}">${resolution}</span>`;
        return {qualityTag, qualityClass, resBadge, resolution}
    }
    function updateFavButton() {
        const isFav = isFavorite(currentStreamId);
        const textKey = isFav ? 'btn_remove_fav' : 'btn_add_fav';
        const fallback = isFav ? 'Remove Favorite' : 'Add Favorite';
        const label = (typeof t !== 'undefined') ? t(textKey) : fallback;

        const iconHref = isFav ? '#icon-heart-full' : '#icon-heart-empty';
        if (UI.favIconUse) UI.favIconUse.setAttribute('href', iconHref);

        if (isFav) {
            UI.favBtn.classList.remove('text-gray-400');
            UI.favBtn.classList.add('text-red-500');
        } else {
            UI.favBtn.classList.remove('text-red-500');
            UI.favBtn.classList.add('text-gray-400');
        }

        if (UI.favText) {
            UI.favText.textContent = label;
        } 
        if(UI.favBtn) {
             UI.favBtn.innerHTML = `<svg class="icon mr-2"><use href="${iconHref}"></use></svg> ${label}`;
        }
    }

    async function show(item) {
        // Clear previous state
        UI.poster.src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="; 
        UI.plot.textContent = ""; 
        UI.techInfo.innerHTML = ""; // Clear tech specs
        UI.techInfo.classList.add('hidden');

        currentStreamId = item.stream_id;
        currentItemData = item; 

        UI.title.textContent = item.name || '';
        UI.rating.textContent = item.rating || 0;
        
        const newImg = item.movie_image || item.stream_icon || PLACEHOLDER_IMG;
        UI.poster.src = newImg;

        UI.plot.textContent = (typeof t !== 'undefined') ? t('loading') : 'Loading details...';
        
        updateFavButton();

        showPage('page-movie-details');
        pushToNavStack('page-movie-details', { item });
        setTimeout(() => {
            UI.playBtn.focus();
        }, 100);
        
        try {
            // Fetch extra info
            const data = await fetchXtream({ action: 'get_vod_info', vod_id: item.stream_id }, false);
            
            if (currentStreamId !== item.stream_id) return;

            if (data && data.info) {
                Object.assign(currentItemData, data.info, { stream_id: item.stream_id });
                
                const info = data.info;
                
                requestAnimationFrame(() => {
                    UI.year.textContent = info.releasedate || info.year || '';
                    UI.duration.textContent = info.duration || '';
                    UI.genre.textContent = info.genre || '';
                    UI.director.textContent = info.director || '';
                    UI.cast.textContent = info.cast || info.actors || '';
                    
                    const desc = info.plot || info.description || (typeof t !== 'undefined' ? t('about_desc') : 'No description.');
                    UI.plot.textContent = desc;

                    // === RENDER TECHNICAL SPECS ===
                    renderTechSpecs(data.info);
                });
            }else{
                requestAnimationFrame(() => {
                    UI.year.textContent =  '';
                    UI.duration.textContent =  '';
                    UI.genre.textContent =  '';
                    UI.director.textContent =  '';
                    UI.cast.textContent =  '';
                    UI.plot.textContent = '';
                });
            }
        } catch (e) {
            console.error(e); 
            if (currentStreamId === item.stream_id) {
                UI.plot.textContent = 'Details could not be loaded.';
            }
        }
    }

    // Helper: Safely get an array even if the source is a single object or undefined
    function getAsArray(source) {
        if (!source) return [];
        if (Array.isArray(source)) return source;
        return [source];
    }

    function renderTechSpecs(info) {
        if (!info) return;

        const videoStreams = getAsArray(info.video);
        const audioStreams = getAsArray(info.audio);
        const bitrate = info.bitrate ? Math.round(info.bitrate / 1000) + ' Mbps' : null;

        let html = '';

        // 1. VIDEO INFO
        if (videoStreams.length > 0) {
            const vid = videoStreams[0]; // Usually the first stream is the main video
            const width = vid.width || vid.coded_width;
            const height = vid.height || vid.coded_height;
            const codec = (vid.codec_name || 'unknown').toUpperCase();
            
            // Format Resolution
            const {resBadge,qualityClass } = resToTag(width, height);

            html += `
                <div class="tech-group">
                    <div class="tech-label">Video</div>
                    <div class="flex flex-wrap gap-2 mt-1">
                        ${resBadge}
                        <span class="tech-badge">${codec}</span>
                        ${bitrate ? `<span class="tech-badge">${bitrate}</span>` : ''}
                    </div>
                </div>
            `;
        }

        // 2. AUDIO INFO
        if (audioStreams.length > 0) {
            // Check for subtitle streams mixed in audio array (sometimes happens in raw FFmpeg output)
            // or just iterate all audio streams
            const validAudio = audioStreams.filter(a => a.codec_type === 'audio');
            
            if (validAudio.length > 0) {
                // Limit to showing first 3 audio tracks to save space
                const tracksHtml = validAudio.slice(0, 3).map(a => {
                    const lang = (a.tags && a.tags.language) ? a.tags.language.toUpperCase() : (a.index || 'UNK');
                    const codec = (a.codec_name || '').toUpperCase();
                    return `<span class="tech-badge text-xs">${lang} ${codec}</span>`;
                }).join('');

                html += `
                    <div class="tech-group">
                        <div class="tech-label">Audio</div>
                        <div class="flex flex-wrap gap-2 mt-1">
                            ${tracksHtml}
                            ${validAudio.length > 3 ? '<span class="text-xs text-gray-500">...</span>' : ''}
                        </div>
                    </div>
                `;
            }
        }

        // 3. SUBTITLES (Attempt to find them)
        // Sometimes subtitles are in a top-level array, sometimes mixed in streams.
        // We look at 'subtitles' key or scan streams if available in a generic 'streams' object (rare in Xtream).
        // Based on provided JSON, we have 'video' and 'audio'. Often subtitles are separate or not provided in simple get_vod_info.
        // However, if the API provides it in a standard FFmpeg-like structure:
        const subStreams = getAsArray(info.subtitles); 
        
        // Also check if they are mixed in a generic 'streams' key if it existed (not in example).
        // We will stick to 'info.subtitles' if it exists, or check strictly defined subtitle fields.
        
        if (subStreams.length > 0) {
            const subsHtml = subStreams.slice(0, 4).map(s => {
                const lang = (s.tags && s.tags.language) ? s.tags.language.toUpperCase() : 'UNK';
                return `<span class="tech-badge badge-sub">${lang}</span>`;
            }).join('');

            html += `
                <div class="tech-group">
                    <div class="tech-label">Subtitles</div>
                    <div class="flex flex-wrap gap-2 mt-1">
                        ${subsHtml}
                    </div>
                </div>
            `;
        } else {
             // Fallback: Check if any audio/video stream has disposition 'forced' or is actually a sub text stream?
             // (Unlikely in this JSON structure, usually explicit).
        }

        if (html) {
            UI.techInfo.innerHTML = html;
            UI.techInfo.classList.remove('hidden');
        }
    }

    return {
        show,
        fetchFullDetails: (item) => show(item) ,
        resToTag,
        updateFavButton
    };
})();