// ---------------------------
// CONFIG
// ---------------------------
const FETCH_TIMEOUT = 10000;      // 8 sec
const FETCH_RETRIES = 2;         // retry X times after failure
const RETRY_DELAY = 500;         // wait 0.5 sec before retry
// ---------------------------
const USER_AGENT = 'Mozilla/5.0 (Linux; Android X; Device Model) AppleWebKit/537.36 (KHTML, like Gecko) SpeedyIPTV/Version';


function testUrl(url, timeoutMs) {
    return new Promise((resolve) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
  
      fetch(url, {
        method: "GET",
        signal: controller.signal,
        cache: "no-store",
      })
        .then(res => {
          clearTimeout(timer);
          resolve(res.ok || (res.status >=400 && res.status < 600)); // Accept 4xx and 5xx as reachable
        })
        .catch((e) => {
            console.log(e)
          clearTimeout(timer);
          resolve(false);
        });
    });
}

async function resolvePlaylistUrl(inputUrl, timeoutMs = FETCH_TIMEOUT) {
    if (!inputUrl) throw new Error("Empty URL");
  
    let url = inputUrl.trim();
  
    // If no scheme → try https first
    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
    }
  
    // Try HTTPS
    if (url.startsWith("https://")) {
      const ok = await testUrl(url, timeoutMs);
      if (ok) return url;
  
      // fallback to HTTP
      const httpUrl = "http://" + url.slice(8);
      if (await testUrl(httpUrl, timeoutMs)) return httpUrl;
    }
  
    // If input was http, try it first then https
    if (url.startsWith("http://")) {
      if (await testUrl(url, timeoutMs)) return url;
  
      const httpsUrl = "https://" + url.slice(7);
      if (await testUrl(httpsUrl, timeoutMs)) return httpsUrl;
    }
  
    throw new Error("Playlist URL unreachable via http or https");
}
  
  
// Check internet using Tizen API
function checkInternet() {
    return new Promise((resolve) => {
        if (typeof tizen === "undefined") {
            resolve(true);
            return;
        }
        tizen.systeminfo.getPropertyValue(
            'NETWORK',
            net => resolve(net.networkType !== "NONE"),
            () => resolve(false)
        );
    });
}

// Sleep helper (used in retry delay)
function wait(ms) {
    return new Promise(res => setTimeout(res, ms));
}


// The core safeFetch
// The core safeFetch
async function safeFetch(url, options = {}) {
    const online = await checkInternet();
    if (!online) throw "NO_INTERNET";

    const externalSignal = options.signal;

    for (let attempt = 0; attempt <= FETCH_RETRIES; attempt++) {
        if (externalSignal && externalSignal.aborted) {
            throw new DOMException("The user aborted a request.", "AbortError");
        }

        try {
            const controller = new AbortController();
            if (externalSignal) {
                externalSignal.addEventListener('abort', () => controller.abort());
            }

            const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            // --- IMPROVED VALIDATION ---
            if (!response.ok) {
                // If it's a 4xx error (User error/Auth), DON'T retry, just throw the status
                if (response.status >= 400 && response.status < 500) {
                    throw { type: "AUTH_ERROR", status: response.status };
                }
                // For 5xx (Server error), we allow the loop to retry
                throw new Error("SERVER_ERROR");
            }

            return response; 

        } catch (err) {
            // 1. If we threw the HTTP_ERROR object above, stop retrying and catch it here
            if (err.type === "AUTH_ERROR") throw err.type; 

            if (err.name === "AbortError" && externalSignal && externalSignal.aborted) {
                throw err;
            }

            if (attempt === FETCH_RETRIES) {
                if (err.name === "AbortError") throw "TIMEOUT";
                throw "FETCH_ERROR";
            }

            await wait(RETRY_DELAY);
        }
    }
}