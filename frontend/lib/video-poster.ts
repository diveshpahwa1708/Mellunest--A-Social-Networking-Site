// Generate a real JPEG cover from a local video before upload.
export function videoPoster(file: File): Promise<Blob | null> {
    return new Promise(resolve => {
        const video = document.createElement('video');
        const url = URL.createObjectURL(file);
        let done = false;
        const finish = (blob: Blob | null) => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            video.onloadeddata = video.oncanplay = video.onseeked = video.onerror = null;
            video.pause(); video.removeAttribute('src'); video.load(); video.remove();
            URL.revokeObjectURL(url);
            resolve(blob);
        };
        const capture = () => {
            if (done || video.readyState < 2 || !video.videoWidth) return;
            try {
                const canvas = document.createElement('canvas');
                const scale = Math.min(1, 320 / Math.max(video.videoWidth, video.videoHeight));
                canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
                canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
                const ctx = canvas.getContext('2d');
                if (!ctx) return finish(null);
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const data = atob(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
                finish(new Blob([Uint8Array.from(data, c => c.charCodeAt(0))], { type: 'image/jpeg' }));
            } catch { finish(null); }
        };
        const timer = setTimeout(() => finish(null), 8000);
        video.muted = true; video.playsInline = true; video.preload = 'auto';
        video.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0.01;pointer-events:none';
        video.onloadeddata = video.oncanplay = video.onseeked = capture;
        video.onerror = () => finish(null);
        document.body.appendChild(video);
        video.src = url;
        video.load();
        // Muted playback prompts frame decoding on mobile browsers.
        void video.play().then(capture).catch(() => {});
    });
}
