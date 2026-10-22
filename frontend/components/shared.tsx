'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { House, Compass, MessageCircle, Heart, Bookmark, Bell, Plus, Search, ArrowUpRight, ArrowRight, ArrowLeft, X, Send, Sun, Moon, Settings, LogOut, ImagePlus, Film, Trash2, MoreHorizontal, Users, Check, CheckCheck, LoaderCircle, ChevronLeft, ChevronRight, Lock, Globe, ShieldCheck, Leaf, PenLine, Upload, Eye, Link as LinkIcon } from 'lucide-react';
import {api,media,ago,iconStyle,type Item} from '../lib/api';
export function Logo() { return <span className="logo"><svg viewBox="0 0 64 64" aria-hidden="true"><path d="M9 32c0 15 10 24 23 24s23-9 23-24M16 32c0 11 6 17 16 17s16-6 16-17M24 17c1-7 8-10 15-8-1 9-7 13-15 8Z"/><circle cx="35" cy="29" r="5"/></svg>mellunest<span className="logodot">.</span></span>; }
export function Avatar({ user, size = 42 }: {
    user?: Item;
    size?: number;
}) { return <span className="avatar" style={{ width: size, height: size, fontSize: size * .35 }}>{user?.avatar ? <img src={media(user.avatar)} alt=""/> : (user?.name || user?.username || 'V').slice(0, 1).toUpperCase()}</span>; }
export function Button({ children, onClick, className = '', ...props }: any) { return <button className={'button ' + className} onClick={onClick} {...props}>{children}</button>; }
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
}) { const ref = useRef<HTMLDialogElement>(null); useEffect(() => { ref.current?.showModal(); return () => ref.current?.close(); }, []); return <dialog className={'modal ' + (wide ? 'wide' : '')} ref={ref} onCancel={e => { e.preventDefault(); close(); }} onClick={e => { if (e.target === e.currentTarget)
    close(); }}><header><h2>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={close}><X /></button></header>{children}</dialog>; }
export function MediaView({ item, controls = true }: {
    item: Item;
    controls?: boolean;
}) { return item.mime?.startsWith('video') ? <video src={media(item.id || item.media_id)} controls={controls} playsInline preload="metadata"/> : <img src={media(item.id || item.media_id)} alt="Shared moment" loading="lazy"/>; }