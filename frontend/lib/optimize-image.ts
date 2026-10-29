/** Make new photographic uploads lighter without changing existing stored media. */
export async function optimizeImage(file: File, kind: string): Promise<File> {
    // Keep videos and potentially animated WebP files untouched.
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size < 200 * 1024) return file;
    if (file.type === 'image/png') {
        // APNG's animation control chunk appears before image data.
        const prefix = new Uint8Array(await file.slice(0, 65536).arrayBuffer());
        for (let offset = 8; offset + 8 <= prefix.length;) {
            const length = new DataView(prefix.buffer).getUint32(offset);
            const type = String.fromCharCode(...prefix.subarray(offset + 4, offset + 8));
            if (type === 'acTL') return file;
            if (type === 'IDAT') break;
            offset += length + 12;
        }
    }
    const url = URL.createObjectURL(file);
    const canvas = document.createElement('canvas');
    try {
        const image = new Image();
        image.src = url;
        await image.decode();
        const limit = kind === 'avatar' ? 512 : 1600;
        const scale = Math.min(1, limit / Math.max(image.naturalWidth, image.naturalHeight));
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) return file;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', 0.84));
        // Some browsers fall back to PNG. Keep the original unless savings are useful.
        if (!blob || blob.type !== 'image/webp' || blob.size >= file.size * 0.9) return file;
        return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: blob.type, lastModified: file.lastModified });
    } catch {
        return file;
    } finally {
        URL.revokeObjectURL(url);
        canvas.width = canvas.height = 1;
    }
}
