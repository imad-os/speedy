/**
 * GLOBAL LOADER MODULE
 * Copy this object into your main JS file.
 */
const Loader = {
    // Internal references
    _el: null,
    _outer: null,
    _inner: null,
    _label: null,
    _prev:null,
    _rectScreen:null,
    _isFullscreen:true,
    _loader_speed:5,
    // Initialize DOM elements lazily
    _init() {
        if (this._el) return; // Already initialized
        this._el = document.getElementById('loader-overlay');
        this._outer = document.getElementById('outer');
        this._inner = document.getElementById('inner');
        this._label = document.getElementById('text-label');
        this._prev = document.getElementById('live-preview-container');
        this._rectScreen = { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight };
    },

    /**
     * SHOW (Indeterminate)
     * Use when waiting for connection or headers.
     * @param {string} text - Optional text (default: "CONNECTING")
     */
    show(text = "CONNECTING") {
        if( ["connecting","buffering",""].includes(text.toLocaleLowerCase()) ){
            this.setRect();

        }
        console.log("[LOADER] SHOWING : ",text, "_isFullscreen:",this._isFullscreen)

        this._init();
        this._el.classList.add('visible');
        this._el.classList.remove('determinate');
        this._el.classList.add('indeterminate');
        
        // Clear manual transforms to allow CSS animation
        this._outer.style.transform = '';
        this._inner.style.transform = '';
        this._label.textContent = text;
    },

    /**
     * PROGRESS (Determinate)
     * Use when downloading chunks.
     * @param {number} percent - 0 to 100
     */
    progress(percent) {
        this._init();
        this._el.classList.add('visible');
        this._el.classList.remove('indeterminate');
        this._el.classList.add('determinate');

        const p = Math.floor(Math.min(100, Math.max(0, percent)));
        this._label.textContent = `BUFFERING ${p}%`;

        // Rotate rings based on percentage
        this._outer.style.transform = `rotate(${p * this._loader_speed}deg)`;
        this._inner.style.transform = `rotate(${p * this._loader_speed * -2}deg)`;
    },

    /**
     * HIDE
     * Call when playback starts.
     */
    hide(msg) {
        console.log("[LOADER] HIDING : ",msg)
        this._init();
        this._el.classList.remove('visible');
    },

    setRect(){
        if(!this._el)return;
        let rect = {...this._rectScreen};
        console.log("setting rect : ",this._isFullscreen , PlayerController.currentState.isFullscreen)
        if (!PlayerController.currentState.isFullscreen && PlayerController.isActive) {
            rect = this._prev.getBoundingClientRect();
        }
        this._isFullscreen=PlayerController.currentState.isFullscreen;
        console.log("setting rect:",rect);
        this._el.style.cssText = `
            position:absolute;
            left:${rect.left}px;
            top:${rect.top}px;
            width:${rect.width}px;
            height:${rect.height}px;`; 
    },
};
