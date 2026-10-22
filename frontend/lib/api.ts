export type Item = Record<string, any>;
export const media = (id: string) => '/api/media/' + id;
export const ago = (n: number) => { const min = Math.max(0, Math.floor((Date.now() - n) / 60000)); return min < 1 ? 'Just now' : min < 60 ? min + 'm ago' : min < 1440 ? Math.floor(min / 60) + 'h ago' : new Date(n).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); };
export const iconStyle = { size: 20, strokeWidth: 1.8 };
export async function api(path: string, method = 'GET', body?: any) { const r = await fetch('/api/' + path, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined }); const d: any = await r.json(); if (!r.ok)
    throw new Error(d.error || 'Request failed.'); return d; }
