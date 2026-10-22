'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { House, Compass, MessageCircle, Heart, Bookmark, Bell, Plus, Search, ArrowUpRight, ArrowRight, ArrowLeft, X, Send, Sun, Moon, Settings, LogOut, ImagePlus, Film, Trash2, MoreHorizontal, Users, Check, CheckCheck, LoaderCircle, ChevronLeft, ChevronRight, Lock, Globe, ShieldCheck, Leaf, PenLine, Upload, Eye, Link as LinkIcon } from 'lucide-react';
import {api,media,ago,iconStyle,type Item} from '../lib/api';
import {Logo,Avatar,Button,Empty,Modal,MediaView} from '../components/shared';
import {uploadFile} from '../lib/upload';
export function Composer({ value, close, saved }: any) { const [caption, setCaption] = useState(value.caption || ''), [files, setFiles] = useState<Item[]>(value.media || []), [busy, setBusy] = useState(false), [progress, setProgress] = useState(0), [error, setError] = useState(''); const story = value.kind === 'story'; const pick = async (e: React.ChangeEvent<HTMLInputElement>) => { const chosen = Array.from(e.target.files || []); e.target.value = ''; if (chosen.length + files.length > (story ? 1 : 6)) {
    setError(story ? 'Choose one story file.' : 'Choose up to six files.');
    return;
} setBusy(true); setError(''); try {
    for (const file of chosen) {
        if (file.size > 30 * 1024 * 1024)
            throw new Error('Each file must be 30 MB or less.');
        if (story && file.type.startsWith('video/')) {
            const length = await new Promise<number>((resolve, reject) => { const v = document.createElement('video'), link = URL.createObjectURL(file); v.onloadedmetadata = () => { URL.revokeObjectURL(link); resolve(v.duration); }; v.onerror = () => { URL.revokeObjectURL(link); reject(new Error('Could not read this video.')); }; v.src = link; });
            if (length > 30)
                throw new Error('Story videos must be 30 seconds or shorter.');
        }
        const result = await uploadFile(file, value.kind, setProgress);
        setFiles(old => [...old, result]);
    }
}
catch (e: any) {
    setError(e.message);
}
finally {
    setBusy(false);
    setProgress(0);
} }; const save = async (status: string) => { setBusy(true); setError(''); try {
    if (story) {
        if (!files.length)
            throw new Error('Choose a photo or video first.');
        await api('stories', 'POST', { media: files[0].id });
    }
    else
        await api('posts' + (value.id ? '/' + value.id : ''), value.id ? 'PATCH' : 'POST', { caption, status, media: files.map(f => f.id) });
    await saved();
}
catch (e: any) {
    setError(e.message);
}
finally {
    setBusy(false);
} }; return <Modal title={story ? 'A moment, just for today.' : value.id ? 'Make it your own.' : 'What’s your little moment?'} close={() => { if (!busy && (!caption && !files.length || confirm('Leave the editor? Unsaved changes will be lost.')))
    close(); }}><div className="composer-body"><p className="muted">{story ? 'A glimpse into your world. Visible for 24 hours after you publish.' : 'A photo, a thought, a little slice of life. It doesn’t have to be perfect.'}</p>{error && <div className="alert error" role="alert">{error}</div>}<label className={'upload-zone ' + (busy ? 'disabled' : '')}><ImagePlus size={30}/><strong>{busy ? 'Uploading your moment…' : 'Drop a little life in here'}</strong><span>Choose photos or videos · {story ? '1 file' : 'up to 6 files'}</span><small>JPEG, PNG, WebP, MP4 or WebM · 30 MB each{story ? ' · videos up to 30 seconds' : ''}</small><input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" multiple={!story} onChange={pick} disabled={busy} aria-label="Choose media"/>{busy && <progress value={progress} max={100}/>}</label>{files.length > 0 && <div className="upload-previews">{files.map(f => <div key={f.id}><MediaView item={f}/><button aria-label="Remove media" disabled={busy} onClick={() => setFiles(files.filter(x => x.id !== f.id))}><X size={15}/></button></div>)}</div>}{!story && <label className="caption-label">A few words<textarea maxLength={2000} rows={4} value={caption} onChange={e => setCaption(e.target.value)} placeholder="What’s the story behind this moment? #yourkindofthing"/><small>{caption.length}/2000</small></label>}<div className="composer-footer"><span><Globe size={14}/>{story ? 'Visible for 24 hours' : 'Published to the community'}</span>{!story && <Button className="outline" disabled={busy} onClick={() => save('draft')}>Save draft</Button>}<Button disabled={busy} onClick={() => save('published')}>{busy ? <LoaderCircle size={17} className="spin"/> : <Plus size={17}/>} {story ? 'Share story' : 'Publish moment'}</Button></div></div></Modal>; }
