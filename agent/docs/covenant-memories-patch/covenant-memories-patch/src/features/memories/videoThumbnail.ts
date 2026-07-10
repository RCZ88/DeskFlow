// Captures a poster-frame thumbnail from a local video Blob using an
// offscreen <video> + <canvas>, entirely in the browser -- no ffmpeg, no
// server round-trip, no dependency beyond what the browser already gives us.
export function captureVideoThumbnail(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(blob);
      const video = document.createElement('video');
      video.src = url;
      video.muted = true;
      video.playsInline = true;
      video.currentTime = 0.1;

      const cleanup = () => URL.revokeObjectURL(url);

      video.addEventListener('loadeddata', () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 180;
        const ctx = canvas.getContext('2d');
        if (!ctx) { cleanup(); resolve(null); return; }
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          cleanup();
          resolve(dataUrl);
        } catch {
          cleanup();
          resolve(null);
        }
      });
      video.addEventListener('error', () => { cleanup(); resolve(null); });
    } catch {
      resolve(null);
    }
  });
}
