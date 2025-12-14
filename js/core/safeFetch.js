// ---------------------------
// CONFIG
// ---------------------------
const FETCH_TIMEOUT = 8000;      // 8 sec
const FETCH_RETRIES = 2;         // retry X times after failure
const RETRY_DELAY = 500;         // wait 0.5 sec before retry
// ---------------------------
const USER_AGENT = 'Mozilla/5.0 (Linux; Android X; Device Model) AppleWebKit/537.36 (KHTML, like Gecko) SpeedyIPTV/Version';


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
async function safeFetch(url, options = {}) {

    // 1. Check Internet
    const online = await checkInternet();
    if (!online) throw "NO_INTERNET";

    const externalSignal = options.signal;

    // 2. Try with retries
    for (let attempt = 0; attempt <= FETCH_RETRIES; attempt++) {

        // STOP IMMEDIATELY if the user has cancelled
        if (externalSignal && externalSignal.aborted) {
            throw new DOMException("The user aborted a request.", "AbortError");
        }

        try {
            // 2.1 Timeout wrapper
            const controller = new AbortController();
            
            // Connect the external signal to our internal controller
            if (externalSignal) {
                externalSignal.addEventListener('abort', () => controller.abort());
            }

            // Set the timeout timer
            const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                //headers:{"User-Agent": USER_AGENT}
            });

            clearTimeout(timeoutId);

            // 2.2 Response validation
            if (!response.ok) throw "BAD_RESPONSE";

            return response; // SUCCESS → exit function

        } catch (err) {

            // Handle User Cancellation specifically
            // If the error is an AbortError AND the external signal is aborted, 
            // it means the user clicked cancel. Do NOT retry.
            if (err.name === "AbortError" && externalSignal && externalSignal.aborted) {
                throw err;
            }

            // Timeout → special code
            if (err.name === "AbortError") {
                if (attempt === FETCH_RETRIES) throw "TIMEOUT";
            }
            else if (attempt === FETCH_RETRIES) {
                throw "FETCH_ERROR";
            }

            // Wait before retry
            await wait(RETRY_DELAY);
        }
    }
}