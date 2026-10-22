import type {Item} from './api';
export async function uploadFile(file: File, kind: string, progress: (p: number) => void): Promise<Item> { return new Promise((resolve, reject) => { const xhr = new XMLHttpRequest(); xhr.open('POST', '/api/media'); xhr.upload.onprogress = e => { if (e.lengthComputable)
    progress(Math.round(e.loaded / e.total * 100)); }; xhr.onerror = () => reject(new Error('Upload failed. Check your connection.')); xhr.onload = () => { try {
    const d = JSON.parse(xhr.responseText);
    xhr.status >= 200 && xhr.status < 300 ? resolve(d) : reject(new Error(d.error));
}
catch {
    reject(new Error('Upload failed. Please retry.'));
} }; const form = new FormData(); form.append('file', file); form.append('kind', kind); xhr.send(form); }); }