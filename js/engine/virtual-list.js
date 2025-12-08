/* ------------------------------
   GPU-Accelerated Virtual List (Phase 5.1 - Focus Fix)
   - Fixes "Jump to Top" on focus issue (container.scrollTop).
   - Adds preventScroll to focus calls.
-------------------------------*/

(function (global) {
    'use strict';

    function createVirtualList(options) {
        const cfg = Object.assign({
            container: null,
            itemCount: 0,
            itemHeight: 400, 
            renderItem: null,
            buffer: 2,
            cols: 5
        }, options || {});

        if (!cfg.container) throw new Error('container required');

        // State
        let state = {
            cameraY: 0,
            viewportHeight: 0,
            viewportWidth: 0,
            rows: 0,
            cols: cfg.cols,
            rowHeight: cfg.itemHeight,
            colWidth: 0,
            nodePool: [],
            activeNodes: new Map(), // index -> node
            itemCount: cfg.itemCount,
            destroyed: false,
            // Optimization Flags
            isScrolling: false,
            scrollTimer: null,
            renderPending: false
        };

        // --- Setup DOM Structure ---
        cfg.container.style.overflow = 'hidden';
        cfg.container.style.position = 'relative';

        const cameraLayer = document.createElement('div');
        Object.assign(cameraLayer.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            transformOrigin: '0 0',
            willChange: 'transform',
            transform: 'translate3d(0, 0, 0)'
        });
        
        cfg.container.innerHTML = ''; 
        cfg.container.appendChild(cameraLayer);
        state.cameraLayer = cameraLayer;

        // --- Core Functions ---

        function createNode() {
            const el = document.createElement('div');
            el.className = 'vitem';
            // Hardware acceleration hints for Tizen
            Object.assign(el.style, {
                position: 'absolute',
                top: '0',
                left: '0',
                willChange: 'transform',
                backfaceVisibility: 'hidden', // Tizen Fix
                contain: 'strict',
                display: 'none'
            });
            cameraLayer.appendChild(el);
            return el;
        }

        function updateLayout() {
            if (state.destroyed || !isVisible( $('#content-grid') ) ) return;
            state.viewportHeight = cfg.container.clientHeight;
            state.viewportWidth = cfg.container.clientWidth;
            state.cols = cfg.cols; 
            state.colWidth = (state.viewportWidth / state.cols);
            state.rows = Math.ceil(state.itemCount / state.cols);
            
            // Batch update widths
            const widthStr = `${state.colWidth}px`;
            state.nodePool.forEach(el => el.style.width = widthStr);
            for (const [idx, node] of state.activeNodes) {
                node.style.width = widthStr;
            }
            
            scheduleRender();
        }

        function scheduleRender() {
            if (state.renderPending) return;
            state.renderPending = true;
            requestAnimationFrame(render);
        }

        function render() {
            state.renderPending = false;
            if (state.destroyed) return;

            // CRITICAL FIX: Prevent browser from scrolling the container on Focus
            // If Tizen tries to scroll the parent container, we must force it back to 0
            // or our translate3d logic will drift.
            if (cfg.container.scrollTop !== 0) {
                cfg.container.scrollTop = 0;
            }

            // 1. Apply Camera Transform
            state.cameraLayer.style.transform = `translate3d(0, -${state.cameraY}px, 0)`;

            // 2. Calculate Visible Range
            const startRow = Math.floor(state.cameraY / state.rowHeight) - cfg.buffer;
            const endRow = Math.floor((state.cameraY + state.viewportHeight) / state.rowHeight) + cfg.buffer;

            const safeStartRow = Math.max(0, startRow);
            const safeEndRow = Math.min(state.rows - 1, endRow);

            const neededIndices = new Set();
            
            for (let r = safeStartRow; r <= safeEndRow; r++) {
                const rowStart = r * state.cols;
                for (let c = 0; c < state.cols; c++) {
                    const idx = rowStart + c;
                    if (idx < state.itemCount) neededIndices.add(idx);
                }
            }

            // 3. Recycle Unused Nodes
            for (const [idx, node] of state.activeNodes) {
                if (!neededIndices.has(idx)) {
                    node.style.display = 'none';
                    state.nodePool.push(node);
                    state.activeNodes.delete(idx);
                }
            }

            // 4. Render New Nodes
            neededIndices.forEach(idx => {
                if (state.activeNodes.has(idx)) return; 

                let node = state.nodePool.pop();
                if (!node) node = createNode();

                const r = Math.floor(idx / state.cols);
                const c = idx % state.cols;
                const x = c * state.colWidth;
                const y = r * state.rowHeight;

                node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
                node.style.width = `${state.colWidth}px`; 
                node.style.height = `${state.rowHeight}px`;
                node.style.display = 'block';
                
                cfg.renderItem(idx, node);
                
                state.activeNodes.set(idx, node);
            });
        }

        function updateScrollingState() {
            state.isScrolling = true;
            if (state.scrollTimer) clearTimeout(state.scrollTimer);
            
            state.scrollTimer = setTimeout(() => {
                state.isScrolling = false;
                for (const [idx, node] of state.activeNodes) {
                    cfg.renderItem(idx, node);
                }
            }, 150);
        }

        // --- Public API ---

        function scrollToIndex(index) {
            updateScrollingState();
            const r = Math.floor(index / state.cols);
            state.cameraY = r * state.rowHeight;
            scheduleRender();
        }

        function ensureVisible(index, cb) {
            updateScrollingState();
            const r = Math.floor(index / state.cols);
            const itemTop = r * state.rowHeight;
            const itemBottom = itemTop + state.rowHeight;
            const viewTop = state.cameraY;
            const viewBottom = state.cameraY + state.viewportHeight;

            let changed = false;

            // Logic:
            // If item is above viewport -> Align Top
            // If item is below viewport -> Align Bottom
            if (itemTop < viewTop) {
                state.cameraY = itemTop;
                changed = true;
            } else if (itemBottom > viewBottom) {
                state.cameraY = itemBottom - state.viewportHeight;
                changed = true;
            }

            if (changed) scheduleRender();
            if (cb) cb();
        }

        function highlight(index) {
            for (const [idx, node] of state.activeNodes) {
                if (idx === index){
                     node.classList.add('focused');
                     // CRITICAL FIX: preventScroll ensures the browser doesn't 
                     // fight our transform logic.
                     try {
                        node.focus({ preventScroll: true });
                     } catch(e) {
                         // Fallback for very old Tizen versions
                         node.focus();
                     }
                     // Force reset just in case browser ignored preventScroll
                     cfg.container.scrollTop = 0;
                }
                else node.classList.remove('focused');
            }
        }

        function getCols() { return state.cols; }
        function isScrolling() { return state.isScrolling; }

        function destroy() {
            state.destroyed = true;
            window.removeEventListener('resize', onResize);
            if (state.scrollTimer) clearTimeout(state.scrollTimer);
            cancelAnimationFrame(render);
            cfg.container.innerHTML = '';
        }

        const onResize = () => { updateLayout(); };
        window.addEventListener('resize', onResize);

        setTimeout(updateLayout, 0);

        return {
            getCols,
            ensureVisible,
            highlight,
            scrollToIndex,
            destroy,
            refresh: scheduleRender,
            isScrolling
        };
    }

    function refreshItemProps(item) {
        // ... (Keep existing logic) ...
        const _item = item || vitem;
        const id = _item?.stream_id || _item?.series_id;
        const isFav = isFavorite(id);
        console.log("refreshItemProps ", id, isFav)

        if (virtualList) {
            const vitem = virtualListItems[focusedVirtualIndex] || {};

            const focusedEl = document.querySelector('.vitem.focused');
            if (focusedEl && focusedEl.__v && focusedEl.__v.favIcon) {
                if (isFav) focusedEl.__v.favIcon.classList.remove('hidden');
                else focusedEl.__v.favIcon.classList.add('hidden');
            }
            virtualList.highlight(focusedVirtualIndex); 
        }else{
            const favIcon = document.activeElement.querySelector(".icon_fav") || $('#live-channels-list .nav-item.active-category .icon_fav');
            if(favIcon){
                if (isFav) favIcon.classList.remove('hidden');
                else favIcon.classList.add('hidden');
            }


        }
    }

    global.createVirtualList = createVirtualList;
    global.refreshItemProps = refreshItemProps;

})(window);