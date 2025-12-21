// media-controller.js
// Clean separated MediaController module

window.MC = (function () {

    let server = null;

    function init() {
        try {
            if (typeof tizen === 'undefined' || !tizen.mediacontroller) {
                console.warn("[PlayerController] MediaController not supported on this platform");
                return;
            }

            // create server
            window.mcServer = tizen.mediacontroller.createServer();
            console.log("[PlayerController] MediaController server created");
            const requestPlaybackInfoCb = {
                onplaybackactionrequest(action, clientName) {
                    console.log("[PlayerController] playback action request:", action, "from", clientName);
                    // Map requested actions -> your player logic
                    if (action === "TOGGLE_PLAY_PAUSE" || action === "TOGGLE_PLAY") {
                        togglePlay();
                    } else if (action === "PLAY") {
                        if (!PlayerController.isPlaying()) togglePlay();
                    } else if (action === "PAUSE" || action === "STOP") {
                        if (PlayerController.isPlaying()) togglePlay();
                    } else if (action === "NEXT") {
                        // optional: implement next channel/episode
                        console.log("[PlayerController] NEXT requested by client:", clientName);
                    } else if (action === "PREVIOUS") {
                        console.log("[PlayerController] PREVIOUS requested by client:", clientName);
                    } else {
                        console.log("[PlayerController] Unhandled playback action:", action);
                    }
                    // It's ok to not return anything here (server reply is optional).
                },
                onplaybackpositionrequest(position, clientName) {
                    console.log("[PlayerController] playback position request:", position, "from", clientName);
                    // position is in seconds (docs/examples use seconds). Seek if possible.
                    try {
                        if (typeof VideoEngine !== 'undefined' && VideoEngine.seek) {
                            VideoEngine.seek(position);
                            // reflect to MC
                            safeWritePlaybackState(PlayerController.isPlaying() ? "PLAY" : "PAUSE", position);
                        } else {
                            console.warn("[PlayerController] VideoEngine.seek() not available");
                        }
                    } catch (e) {
                        console.warn("[PlayerController] Error applying playback position request:", e);
                    }
                },
                onshufflemoderequest(mode, clientName) {
                    console.log("[PlayerController] shuffle mode request:", mode, "from", clientName);
                    // If you support shuffle for playlists, apply and report back:
                    try {
                        if (window.mcServer && window.mcServer.playback) {
                            window.mcServer.playback.shuffleMode = !!mode;
                            // update to clients (some firmwares need explicit update call)
                            if (typeof window.mcServer.playback.update === 'function') {
                                try { window.mcServer.playback.update(); } catch(e){}
                            }
                        }
                    } catch (e) { console.warn(e); }
                },
                onrepeatstaterequest(state, clientName) {
                    console.log("[PlayerController] repeat state request:", state, "from", clientName);
                    try {
                        if (window.mcServer && window.mcServer.playback) {
                            window.mcServer.playback.repeatState = state;
                            if (typeof window.mcServer.playback.update === 'function') {
                                try { window.mcServer.playback.update(); } catch(e){}
                            }
                        }
                    } catch (e) { console.warn(e); }
                },
                onplaybackitemrequest(playlistName, index, state, position, clientName) {
                    console.log("[PlayerController] playback item request:", playlistName, index, state, position, "from", clientName);
                    // Optional: if you support playlists, jump to item index, set state/position...
                }
            };

            // Attach the listener: prefer new location mcServer.playback.addChangeRequestListener(...)
            try {
                if (window.mcServer.playback && typeof window.mcServer.playback.addChangeRequestListener === 'function') {
                    window.__mc_watchId = window.mcServer.playback.addChangeRequestListener(requestPlaybackInfoCb);
                    console.log("[PlayerController] Attached change request listener (mcServer.playback.addChangeRequestListener) id=", window.__mc_watchId);
                } else if (typeof window.mcServer.addChangeRequestPlaybackInfoListener === 'function') {
                    // fallback for older API
                    window.__mc_watchId = window.mcServer.addChangeRequestPlaybackInfoListener(requestPlaybackInfoCb);
                    console.warn("[PlayerController] Using legacy addChangeRequestPlaybackInfoListener (deprecated) id=", window.__mc_watchId);
                } else {
                    console.warn("[PlayerController] No suitable addChangeRequest listener found on this firmware");
                }
            } catch (e) {
                console.error("[PlayerController] attach change request listener failed:", e);
            }

            // Set sensible initial playback info so remote clients see app exists
            safeWritePlaybackState("STOP", 0, 0);

        } catch (e) {
            console.error("[PlayerController] initMediaController exception:", e);
        }
    }
    // Replace previous reportMC usage with this normalized function
    function reportMC(state, positionSec = 0, durationSec = 0) {
        console.log("[PlayerController] reportMC:", state, positionSec, durationSec);
        const md = _buildMCMetadata(PlayerController.currentItem || {}, PlayerController.currentState.episode || {}, durationSec);
        // attempt to use mcServer.playback interface first, fallback inside safeWritePlaybackState
        safeWritePlaybackState(state === "PLAYING" ? "PLAY" : (state === "PAUSED" ? "PAUSE" : (state === "STOPPED" ? "STOP" : state)), positionSec, durationSec, md);
    }

    function _buildMCMetadata(item, episode, durationSec) {
        const md = {
            title: (episode && episode.name) || item?.name || "Playback",
            artist: item?.artist || "Bahra IPTV",
            album: item?.album || "TV",
            duration: (durationSec && !isNaN(durationSec)) ? String(Math.round(durationSec)) : "0" // seconds as string
        };
        if (item && item.stream_icon) md.iconURI = item.stream_icon;
        return md;
    }

    function safeWritePlaybackState(state, positionSec = 0, durationSec = 0, metadata = null) {
        if (!window.mcServer) return;

        try {
            // first, try the modern approach: set fields on mcServer.playback
            if (window.mcServer.playback) {
                try {
                    // map strings to the expected values - server.playback.state expects "PLAY"/"PAUSE"/"STOP"/etc.
                    const mappedState = (state && String(state).toUpperCase().indexOf("PLAY") >= 0) ? "PLAY" :
                                        (state && String(state).toUpperCase().indexOf("PAUSE") >= 0) ? "PAUSE" :
                                        (state && String(state).toUpperCase().indexOf("STOP") >= 0) ? "STOP" :
                                        state;

                    // position in seconds — docs/examples use seconds for request/set, but some implementations want ms.
                    // The API example sets mcServer.playback.position = position (seconds). We'll set seconds.
                    window.mcServer.playback.state = mappedState;
                    if (typeof positionSec !== 'undefined' && positionSec !== null) {
                        window.mcServer.playback.position = Number(positionSec) || 0;
                    }
                    // optional metadata handling via mcServer.setMetadata() if available
                    if (metadata && typeof window.mcServer.setMetadata === 'function') {
                        try { window.mcServer.setMetadata(metadata); } catch(e){ console.warn("[PlayerController] setMetadata failed:", e); }
                    }
                    // Some firmwares automatically push updates; others require an explicit update call:
                    if (typeof window.mcServer.playback.update === 'function') {
                        try { window.mcServer.playback.update(); } catch(e){ /* non-fatal */ }
                    }
                    return;
                } catch (e) {
                    // continue to fallback below
                    console.warn("[PlayerController] modern playback write failed, will fallback:", e);
                }
            }

            // fallback 1: older convenience methods used in some firmwares
            if (typeof window.mcServer.updatePlaybackState === 'function') {
                const posMs = Math.round((positionSec || 0) * 1000);
                try {
                    window.mcServer.updatePlaybackState(state, posMs);
                } catch (e) {
                    console.warn("[PlayerController] updatePlaybackState failed:", e);
                }
            }

            // fallback 2: update metadata the older way (some firmwares expose updateMetadata)
            if (metadata && typeof window.mcServer.updateMetadata === 'function') {
                try { window.mcServer.updateMetadata(metadata); } catch (e) { console.warn("[PlayerController] updateMetadata failed:", e); }
            } else if (metadata && typeof window.mcServer.setMetadata === 'function') {
                // some SKUs prefer setMetadata (safe try)
                try { window.mcServer.setMetadata(metadata); } catch(e){ console.warn("[PlayerController] setMetadata fallback failed:", e); }
            }

        } catch (e) {
            console.warn("[PlayerController] safeWritePlaybackState general error:", e);
        }
    }
    return {
        init,
        reportMC,
        _buildMCMetadata,
        get server() { return server; }
    };

})();
