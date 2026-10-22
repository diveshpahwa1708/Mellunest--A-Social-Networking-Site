'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { House, Compass, MessageCircle, Heart, Bookmark, Bell, Plus, Search, ArrowUpRight, ArrowRight, ArrowLeft, X, Send, Sun, Moon, Settings, LogOut, ImagePlus, Film, Trash2, MoreHorizontal, Users, Check, CheckCheck, LoaderCircle, ChevronLeft, ChevronRight, Lock, Globe, ShieldCheck, Leaf, PenLine, Upload, Eye, Link as LinkIcon } from 'lucide-react';
import {api,media,ago,iconStyle,type Item} from '../lib/api';
import {Logo,Avatar,Button,Empty,Modal,MediaView} from '../components/shared';
import {uploadFile} from '../lib/upload';
export function ProfileEditor({ user, close, saved }: any) { const [form, setForm] = useState({ ...user, notifications: !!user.notifications, messages: !!user.messages }), [error, setError] = useState(''), [busy, setBusy] = useState(false); return <Modal title="A little more you." close={close}><form className="profile-form" onSubmit={async (e) => { e.preventDefault(); setBusy(true); try {
    await api('users', 'PATCH', form);
    await saved(form.username);
}
catch (e: any) {
    setError(e.message);
}
finally {
    setBusy(false);
} }}>{error && <div className="alert error">{error}</div>}<div className="avatar-edit"><Avatar user={form} size={76}/><label className="button outline">Change photo<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={async (e) => { const file = e.target.files?.[0]; if (!file)
    return; setBusy(true); try {
    if (file.size > 5 * 1024 * 1024)
        throw new Error('Profile photos must be 5 MB or less.');
    const r = await uploadFile(file, 'avatar', () => { });
    setForm({ ...form, avatar: r.id });
}
catch (e: any) {
    setError(e.message);
}
finally {
    setBusy(false);
} }}/></label></div>{[['name', 'Display name', 60], ['username', 'Username', 24], ['bio', 'Bio', 300], ['website', 'Website', 200]].map(([key, title, max]: any) => <label key={key}>{title}{key === 'bio' ? <textarea value={form[key]} maxLength={max} rows={3} onChange={e => setForm({ ...form, [key]: e.target.value })}/> : <input value={form[key]} maxLength={max} required={['name', 'username'].includes(key)} onChange={e => setForm({ ...form, [key]: e.target.value })} placeholder={key === 'website' ? 'https://your-world.com' : title}/>}</label>)}<Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}<Check size={17}/></Button></form></Modal>; }
