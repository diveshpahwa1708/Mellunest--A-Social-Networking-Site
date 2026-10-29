'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { House, Compass, MessageCircle, Heart, Bookmark, Bell, Plus, Search, ArrowUpRight, ArrowRight, ArrowLeft, X, Send, Sun, Moon, Settings, LogOut, ImagePlus, Film, Trash2, MoreHorizontal, Users, Check, CheckCheck, LoaderCircle, ChevronLeft, ChevronRight, Lock, Globe, ShieldCheck, Leaf, PenLine, Upload, Eye, Link as LinkIcon } from 'lucide-react';
import {api,media,ago,iconStyle,type Item} from '../lib/api';
import { VideoPlayer } from './VideoPlayer';
export function Logo() { return <span className="logo"><svg viewBox="0 0 64 64" aria-hidden="true"><path d="M9 32c0 15 10 24 23 24s23-9 23-24M16 32c0 11 6 17 16 17s16-6 16-17M24 17c1-7 8-10 15-8-1 9-7 13-15 8Z"/><circle cx="35" cy="29" r="5"/></svg>mellunest<span className="logodot">.</span></span>; }
export function Avatar({ user, size = 42 }: {
    user?: Item;
    size?: number;
}) { return <span className="avatar" style={{ width: size, height: size, fontSize: size * .35 }}>{user?.avatar ? <img src={media(user.avatar)} alt="" loading="lazy" decoding="async" width={size} height={size}/> : (user?.name || user?.username || 'V').slice(0, 1).toUpperCase()}</span>; }
export function Button({ children, onClick, className = '', ...props }: any) { return <button type="button" className={'button ' + className} onClick={onClick} {...props}>{children}</button>; }
export function Empty({ title, detail, action }: {
    title: string;
    detail: string;
    action?: React.ReactNode;
}) { return <div className="empty"><div className="empty-icon"><Leaf size={28}/></div><h3>{title}</h3><p>{detail}</p>{action}</div>; }
export function Modal({ title, children, close, wide = false }: {
    title: string;
    children: React.ReactNode;
    close: () => void;
    wide?: boolean;
}) {
    const ref = useRef<HTMLDialogElement>(null);
    const backdropStart = useRef(false);
    useEffect(() => {
        const dialog = ref.current;
        const previousOverflow = document.body.style.overflow;
        dialog?.showModal();
        document.body.style.overflow = 'hidden';
        return () => { dialog?.close(); document.body.style.overflow = previousOverflow; };
    }, []);
    const outside = (x: number, y: number) => {
        const box = ref.current?.getBoundingClientRect();
        return !!box && (x < box.left || x > box.right || y < box.top || y > box.bottom);
    };
    return <dialog className={'modal ' + (wide ? 'wide' : '')} ref={ref}
        onCancel={e => { e.preventDefault(); close(); }}
        onPointerDown={e => { backdropStart.current = e.target === e.currentTarget && outside(e.clientX, e.clientY); }}
        onPointerCancel={() => { backdropStart.current = false; }}
        onClick={e => {
            if (backdropStart.current && e.target === e.currentTarget && outside(e.clientX, e.clientY)) close();
            backdropStart.current = false;
        }}>
        <header><h2>{title}</h2><button type="button" className="icon-button" aria-label="Close dialog" onClick={close}><X /></button></header>{children}
    </dialog>;
}
const imagePlaceholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="640" height="480"%3E%3Crect width="100%25" height="100%25" fill="%23edf1e7"/%3E%3C/svg%3E';
function FeedImage({ src, priority }: { src: string; priority: boolean }) {
    const ref = useRef<HTMLImageElement>(null);
    const [ready, setReady] = useState(priority);
    useEffect(() => {
        if (ready) return;
        if (!('IntersectionObserver' in window)) { setReady(true); return; }
        const observer = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) { setReady(true); observer.disconnect(); }
        }, { rootMargin: '300px' });
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [ready]);
    return <img ref={ref} src={ready ? src : imagePlaceholder} alt="Shared moment"
        loading={priority ? 'eager' : 'lazy'} decoding="async" fetchPriority={priority ? 'high' : 'auto'}/>;
}
export function MediaView({ item, controls = true, priority = false }: {
    item: Item;
    controls?: boolean;
    priority?: boolean;
}) {
    const id = item.id || item.media_id;
    return item.mime?.startsWith('video')
        ? (controls ? <VideoPlayer key={id} src={media(id)}/> : <video src={media(id)} playsInline preload="none"/>)
        : <FeedImage key={id} src={media(id)} priority={priority}/>;
}
