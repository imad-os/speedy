async function testDownloadSpeedByTime({
    url,
    durationMs = 10_000,
    intervalMs = 500,
    onUpdate
  }) {
    const controller = new AbortController();
    const startTime = performance.now();
  
    const res = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal
    });
  
    if (!res.body) throw new Error('Streaming not supported');
  
    const reader = res.body.getReader();
  
    let downloaded = 0;
    let lastBytes = 0;
    let lastTime = startTime;
    let done = false;
  
    const intervalId = setInterval(() => {
      if (done) return;
  
      const now = performance.now();
      const elapsedMs = now - startTime;
      const progress = Math.min(100, Math.floor((elapsedMs / durationMs) * 100));
  
      const deltaTimeSec = (now - lastTime) / 1000;
      const deltaBytes = downloaded - lastBytes;
  
      if (deltaTimeSec > 0) {
        const speed = (deltaBytes * 8) / deltaTimeSec; // realtime bps
        const avgTimeSec = elapsedMs / 1000;
        const speedAvg = avgTimeSec > 0
          ? (downloaded * 8) / avgTimeSec
          : 0;
  
        onUpdate({
          speed: Math.round(speed),
          speed_avg: Math.round(speedAvg),
          progress,
          is_done: false
        });
      }
  
      lastBytes = downloaded;
      lastTime = now;
  
      // 🔴 hard stop by time
      if (elapsedMs >= durationMs) {
        done = true;
        clearInterval(intervalId);
        controller.abort();
      }
    }, intervalMs);
  
    try {
      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        downloaded += value.length;
      }
    } catch (e) {
      if (e.name !== 'AbortError') throw e;
    }
  
    // ✅ final result
    const totalTimeSec = (performance.now() - startTime) / 1000;
    const finalAvg = (downloaded * 8) / totalTimeSec;
  
    onUpdate({
      speed: Math.round(finalAvg),      // last value doesn't matter much
      speed_avg: Math.round(finalAvg),
      progress: 100,
      is_done: true
    });
  }
  


/*
  
testDownloadSpeedByTime({
  url: 'https://speed.cloudflare.com/__down?bytes=5000000000',
  durationMs: 5_000,
  intervalMs: 200,
  onUpdate: (json) => {
    console.log(JSON.stringify(json));
  }
});

*/