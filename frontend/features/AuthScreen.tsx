'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { House, Compass, MessageCircle, Heart, Bookmark, Bell, Plus, Search, ArrowUpRight, ArrowRight, ArrowLeft, X, Send, Sun, Moon, Settings, LogOut, ImagePlus, Film, Trash2, MoreHorizontal, Users, Check, CheckCheck, LoaderCircle, ChevronLeft, ChevronRight, Lock, Globe, ShieldCheck, Leaf, PenLine, Upload, Eye, Link as LinkIcon } from 'lucide-react';
import {api,media,ago,iconStyle,type Item} from '../lib/api';
import {Logo,Avatar,Button,Empty,Modal,MediaView} from '../components/shared';
import {uploadFile} from '../lib/upload';
export function AuthScreen({ auth, mode, setMode, token, done, error, setError }: any) {
    const [busy, setBusy] = useState(false), [msg, setMsg] = useState(''), [availability, setAvailability] = useState(''), [name, setName] = useState('');
    useEffect(() => { if (!['register', 'onboard'].includes(mode) || name.length < 3) {
        setAvailability('');
        return;
    } let active = true; const t = setTimeout(() => api('auth/available?username=' + encodeURIComponent(name)).then(r => { if (active)
        setAvailability(r.available ? 'This username is yours to take.' : 'That username is already taken.'); }).catch(e => { if (active)
        setAvailability(e.message); }), 350); return () => { active = false; clearTimeout(t); }; }, [name, mode]);
    const submit = async (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); setBusy(true); setError(''); setMsg(''); const data = Object.fromEntries(new FormData(e.currentTarget)); try {
        const r = await api('auth/' + mode, 'POST', { ...data, token });
        if (['onboard', 'login', 'register'].includes(mode))
            await done();
        else {
            setMsg(r.message);
            if (mode === 'verify' || mode === 'reset')
                setMode('login');
        }
    }
    catch (e: any) {
        setError(e.message);
    }
    finally {
        setBusy(false);
    } };
    const title = mode === 'register' ? 'Find your kind of people.' : mode === 'onboard' ? 'Make yourself at home.' : mode === 'forgot' ? 'Let’s get you back in.' : mode === 'reset' ? 'A fresh start.' : mode === 'verify' ? 'One little step.' : 'Good to see you again.';
    return <main className="auth-layout"><section className="auth-brand"><Logo /><div className="auth-manifesto"><div className="eyebrow">LIFE IN GOOD COMPANY</div><h1>Small moments.<br />Real connections.<br /><em>A world of you.</em></h1><p>A home for the things you love,<br />and the people who get it.</p></div><div className="auth-art" aria-hidden="true"><div className="art-frame art-one"><div className="sun-art"><i /><b /><span /></div><small>find your own little horizon</small></div><div className="art-frame art-two"><div className="flower-art">✳</div><small>let a little life in</small></div><span className="art-tag">A LITTLE MORE REAL ↗</span><div className="art-orbit"/></div><p className="auth-footer">Different perspectives. A shared place.</p></section><section className="auth-form-side"><div className="auth-form-wrap"><span className="welcome-pill"><span /> YOUR NEXT CHAPTER</span><h2>{title}</h2><p>{mode === 'onboard' ? 'Choose a username for your new social home.' : mode === 'register' ? 'A few details, and a whole world to discover.' : mode === 'forgot' ? 'We’ll send a secure reset link to your email.' : mode === 'verify' ? 'Confirm your email to activate password sign-in.' : mode === 'reset' ? 'Choose a strong password for your account.' : 'Your people. Your moments. Right where you left them.'}</p>{error && <div className="alert error" role="alert">{error}</div>}{msg && <div className="alert success" role="status">{msg}</div>}
 {!auth?.emailReady && mode === 'forgot' ? <div className="alert" role="status">Password recovery is not available until email delivery is configured.</div> : <form onSubmit={submit}>
 {['register', 'onboard'].includes(mode) && <label>Display name<input name="name" autoComplete="name" maxLength={60} required placeholder="What should we call you?"/></label>}
 {['login', 'register', 'onboard'].includes(mode) && <label>Username<div className="input-prefix"><span>@</span><input name="username" value={name} onChange={e => setName(e.target.value)} autoComplete="username" pattern="[a-zA-Z0-9_][a-zA-Z0-9_.]{1,22}[a-zA-Z0-9_]" title="3–24 letters, numbers, underscores or single dots" required placeholder="your_name"/></div>{['register', 'onboard'].includes(mode) && <small>{availability || '3–24 letters, numbers, underscores or single dots.'}</small>}</label>}
 {mode === 'forgot' && <label>Email address<input name="email" type="email" autoComplete="email" required placeholder="you@example.com"/></label>}
 {['login', 'register', 'reset'].includes(mode) && <label>Password<input name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'login' ? 1 : 8} pattern={mode === 'login' ? undefined : '(?=.*[a-zA-Z])(?=.*[0-9]).*'} title={mode === 'login' ? undefined : 'At least 8 characters, including a letter and a number'} maxLength={72} required placeholder={mode === 'login' ? 'Your password' : 'At least 8 characters'}/>{mode !== 'login' && <small>Include at least one letter and one number. Special characters are optional. Maximum 72 bytes.</small>}</label>}
 {['register', 'reset'].includes(mode) && <label>Confirm password<input name="confirm" type="password" autoComplete="new-password" minLength={8} maxLength={72} required placeholder="One more time"/></label>}
 {mode === 'login' && <button type="button" className="forgot text-button" onClick={() => { setMode('forgot'); setError(''); }}>Forgot password?</button>}
 <Button type="submit" className="auth-submit" disabled={busy || (!auth?.emailReady && mode === 'forgot')}>{busy ? <LoaderCircle className="spin" size={18}/> : mode === 'register' ? 'Create account' : mode === 'onboard' ? 'Step into your space' : mode === 'forgot' ? 'Send reset link' : mode === 'reset' ? 'Save new password' : mode === 'verify' ? 'Verify my email' : 'Welcome back'}{!busy && <ArrowRight size={18}/>}</Button>
 </form>}
 
 {mode === 'register' && <p className="setup-note">No email needed. Keep your password safe: email password recovery is unavailable for accounts created without an email.</p>}
 <p className="auth-switch">{mode === 'login' ? <>New around here? <button onClick={() => { setMode('register'); setError(''); setMsg(''); }}>Create an account</button></> : mode === 'onboard' ? <>Already have an account? <button onClick={() => setMode('login')}>Log in</button></> : <button onClick={() => { setMode('login'); setError(''); setMsg(''); }}>Back to sign in</button>}</p><div className="auth-trust"><Lock size={13}/>Your drafts, saved moments and messages stay private.</div></div></section></main>;
}
