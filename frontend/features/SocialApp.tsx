'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { House, Compass, MessageCircle, Heart, Bookmark, Bell, Plus, Search, ArrowUpRight, ArrowRight, ArrowLeft, X, Send, Sun, Moon, Settings, LogOut, ImagePlus, Film, Trash2, MoreHorizontal, Users, Check, CheckCheck, LoaderCircle, ChevronLeft, ChevronRight, Lock, Globe, ShieldCheck, Leaf, PenLine, Upload, Eye, Link as LinkIcon } from 'lucide-react';
import {api,media,ago,iconStyle,type Item} from '../lib/api';
import {Logo,Avatar,Button,Empty,Modal,MediaView} from '../components/shared';
import {uploadFile} from '../lib/upload';
import {AuthScreen} from './AuthScreen';
import {PostCard} from './PostCard';
import {Composer} from './Composer';
import {ProfileEditor} from './ProfileEditor';
export default function App() {
    const [auth, setAuth] = useState<Item | null>(null), [boot, setBoot] = useState(true), [error, setError] = useState(''), [notice, setNotice] = useState(''), [page, setPage] = useState('home'), [tab, setTab] = useState('discover'), [items, setItems] = useState<Item[]>([]), [next, setNext] = useState<number | null>(null), [people, setPeople] = useState<Item[]>([]), [stories, setStories] = useState<Item[]>([]), [loading, setLoading] = useState(false), [search, setSearch] = useState(''), [profile, setProfile] = useState<Item | null>(null), [profileTab, setProfileTab] = useState('posts'), [notifications, setNotifications] = useState<Item[]>([]), [conversations, setConversations] = useState<Item[]>([]), [current, setCurrent] = useState<Item | null>(null), [messages, setMessages] = useState<Item[]>([]), [message, setMessage] = useState(''), [sending, setSending] = useState(false), [connected, setConnected] = useState(false), [compose, setCompose] = useState<Item | null>(null), [storyIndex, setStoryIndex] = useState<number | null>(null), [comments, setComments] = useState<Item | null>(null), [commentItems, setCommentItems] = useState<Item[]>([]), [comment, setComment] = useState(''), [edit, setEdit] = useState(false), [list, setList] = useState<{
        title: string;
        items: Item[];
    } | null>(null), [dark, setDark] = useState(false), [authMode, setAuthMode] = useState('login'), [token, setToken] = useState('');
    const bottom = useRef<HTMLDivElement>(null), chatPane = useRef<HTMLDivElement>(null), nearBottom = useRef(true), refreshRef = useRef<() => void>(() => { }), currentRef = useRef<Item | null>(null);
    const me = auth?.user;
    const tell = (s: string) => { setNotice(s); setTimeout(() => setNotice(''), 4500); };
    const act = async (fn: () => Promise<any>) => { try {
        setError('');
        return await fn();
    }
    catch (e: any) {
        setError(e.message);
    } };
    const bootAuth = async () => { try {
        const a = await api('auth/me');
        setAuth(a);
        if (new URLSearchParams(location.search).get('auth') === 'chatgpt')
            setAuthMode(!a.user && a.platform ? 'onboard' : 'login');
    }
    catch (e: any) {
        setError(e.message);
    }
    finally {
        setBoot(false);
    } };
    useEffect(() => { bootAuth(); const params = new URLSearchParams(location.search); if (params.get('auth')) {
        setAuthMode(params.get('auth')!);
        setToken(params.get('token') || '');
    } const d = localStorage.getItem('mellunest-theme') === 'dark'; setDark(d); }, []);
    useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.setItem('mellunest-theme', dark ? 'dark' : 'light'); }, [dark]);
    const openProfile = useCallback(async (name: string) => { try {
        const r = await api('users/' + encodeURIComponent(name));
        setProfile(r.items[0]);
        setProfileTab('posts');
        setPage('profile');
        history.replaceState({}, '', '/?profile=' + encodeURIComponent(name));
    }
    catch (e: any) {
        setError(e.message);
    } }, []);
    const refreshAux = useCallback(async () => { if (!me)
        return; const results = await Promise.all([api('stories'), api('users'), api('notifications'), api('conversations')]); setStories(results[0].items); setPeople(results[1].items); setNotifications(results[2].items); setConversations(results[3].items); }, [me?.id]);
    const loadPosts = useCallback(async (append = false) => { if (!me)
        return; setLoading(true); try {
        let q = 'posts?scope=' + ((page === 'profile' && profileTab !== 'posts') ? profileTab : page === 'saved' ? 'saved' : page === 'home' && tab === 'following' ? 'following' : 'all');
        if (page === 'profile' && profileTab === 'posts')
            q += '&user=' + encodeURIComponent(profile?.username || me.username);
        if (page === 'post')
            q = 'posts/' + new URLSearchParams(location.search).get('post');
        if (append && next)
            q += '&before=' + next;
        const r = await api(q);
        setItems(old => append ? [...old, ...r.items] : r.items);
        setNext(r.next);
    }
    catch (e: any) {
        setError(e.message);
    }
    finally {
        setLoading(false);
    } }, [me?.id, page, tab, profile?.username, profileTab, next]);
    useEffect(() => { if (me) {
        refreshAux().catch(e => setError(e.message));
        const q = new URLSearchParams(location.search);
        if (q.get('profile'))
            openProfile(q.get('profile')!);
        else if (q.get('post'))
            setPage('post');
    } }, [me?.id]);
    useEffect(() => { if (me && ['home', 'explore', 'profile', 'saved', 'post'].includes(page))
        loadPosts(); }, [me?.id, page, tab, profile?.username, profileTab]);
    useEffect(() => { if (!me || page !== 'explore')
        return; const timer = setTimeout(() => api('users?q=' + encodeURIComponent(search)).then(r => setPeople(r.items)).catch(e => setError(e.message)), 250); return () => clearTimeout(timer); }, [search, page, me?.id]);
    useEffect(() => { currentRef.current = current; }, [current]);
    const loadMessages = async (id: string, older = false) => { const r = await api('messages/' + id + (older && messages.length ? '?before=' + messages[0].created : '')); if (currentRef.current?.conversation_id !== id)
        return; setMessages(old => older ? [...r.items.reverse(), ...old] : r.items.reverse()); if (!older) {
        await api('messages/' + id, 'POST', { read: true });
        if (nearBottom.current)
            setTimeout(() => bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 80);
    } };
    refreshRef.current = () => { refreshAux().catch(() => { }); const c = currentRef.current; if (c)
        loadMessages(c.conversation_id).catch(() => { }); };
    useEffect(() => { if (!me)
        return; const source = new EventSource('/api/events'); source.onopen = () => setConnected(true); source.onmessage = () => refreshRef.current(); source.onerror = () => setConnected(false); const sync = () => refreshRef.current(); window.addEventListener('online', sync); document.addEventListener('visibilitychange', sync); return () => { source.close(); window.removeEventListener('online', sync); document.removeEventListener('visibilitychange', sync); }; }, [me?.id]);
    useEffect(() => { if (storyIndex === null)
        return; const s = stories[storyIndex]; if (!s) {
        setStoryIndex(null);
        return;
    } api('stories/' + s.id + '/view', 'POST', {}).catch(() => { }); const timer = setTimeout(() => setStoryIndex(i => i === null ? null : i + 1 < stories.length ? i + 1 : null), s.mime?.startsWith('video') ? 30000 : 7000); return () => clearTimeout(timer); }, [storyIndex, stories.length]);
    const navigate = (v: string) => { setPage(v); setError(''); history.replaceState({}, '', '/'); if (v === 'profile')
        openProfile(me.username); };
    const toggleFollow = async (u: Item) => act(async () => { await api('follow/' + u.id, 'POST', { active: !u.followed }); await refreshAux(); if (profile?.id === u.id) {
        const r = await api('users/' + u.username);
        setProfile(r.items[0]);
    } });
    const startChat = async (u: Item) => act(async () => { const c = await api('conversations', 'POST', { target: u.id }); const entry = { ...u, conversation_id: c.id }; setCurrent(entry); currentRef.current = entry; setMessages([]); setPage('messages'); await loadMessages(c.id); await refreshAux(); });
    const openChat = async (c: Item) => { setCurrent(c); currentRef.current = c; setMessages([]); nearBottom.current = true; await act(() => loadMessages(c.conversation_id)); };
    const share = async (p: Item) => act(async () => { const url = location.origin + '/?post=' + p.id; if (navigator.share) {
        try {
            await navigator.share({ title: 'A moment on Mellunest', url });
        }
        catch (e: any) {
            if (e.name !== 'AbortError')
                throw e;
        }
    }
    else {
        await navigator.clipboard.writeText(url);
        tell('Post link copied.');
    } });
    const openComments = async (p: Item) => act(async () => { setComments(p); const r = await api('comments/' + p.id); setCommentItems(r.items); });
    const logout = () => act(async () => { await api('auth/logout', 'POST', {}); location.replace('/?auth=login'); });
    if (boot)
        return <main className="boot"><Logo /><LoaderCircle className="spin"/><p>Making a little space for you…</p></main>;
    if (!me || new URLSearchParams(typeof window === 'undefined' ? '' : location.search).get('auth') === 'login' || ['verify', 'reset'].includes(authMode) && token)
        return <AuthScreen auth={auth} mode={authMode} setMode={setAuthMode} token={token} done={async () => { setToken(''); setAuthMode('login'); history.replaceState({}, '', '/'); await bootAuth(); }} error={error} setError={setError}/>;
    const unread = notifications.filter(n => !n.read).length;
    const navItems = [['home', 'Your space', House], ['explore', 'Discover', Compass], ['messages', 'Conversations', MessageCircle], ['saved', 'Saved moments', Bookmark], ['notifications', 'Activity', Bell]] as const;
    const profileOwn = profile?.id === me.id;
    const viewPost = (p: Item) => { history.replaceState({}, '', '/?post=' + p.id); setPage('post'); setItems([p]); };
    return <div className="app-shell">
 <aside className="sidebar"><a href="/" className="brand-link" aria-label="Mellunest home"><Logo /></a><div className="sidebar-note">LIFE IN GOOD COMPANY</div><nav aria-label="Main navigation">{navItems.map(([v, label, Icon]) => <button key={v} className={'nav-item ' + (page === v ? 'active' : '')} onClick={() => navigate(v)}><Icon {...iconStyle}/><span>{label}</span>{v === 'notifications' && unread > 0 && <b>{unread}</b>}{v === 'messages' && conversations.some(c => c.unread > 0) && <i />}</button>)}</nav><Button className="create-button" onClick={() => setCompose({ kind: 'post' })}><Plus size={20}/> Share a moment</Button><div className="sidebar-bottom"><div className="small-note"><span className="tiny-star">✳</span><p>A little more you.<br />A little closer together.</p></div><button className={'nav-item ' + (page === 'settings' ? 'active' : '')} onClick={() => navigate('settings')}><Settings {...iconStyle}/>Settings</button><button className="self-card" onClick={() => openProfile(me.username)}><Avatar user={me}/><span><strong>{me.name}</strong><small>@{me.username}</small></span><ArrowUpRight size={18}/></button></div></aside>
 <div className="main-wrap"><header className="topbar"><div><span className="overline">YOUR EVERYDAY, CONNECTED</span><span className="topbar-title">{page === 'messages' ? 'A good conversation starts here.' : page === 'explore' ? 'Find a little inspiration.' : 'Good things happen together.'}</span></div><div className="top-actions"><button className="search-trigger" onClick={() => navigate('explore')}><Search size={17}/><span>Find your people</span><kbd>⌕</kbd></button><button className="icon-button" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setDark(!dark)}>{dark ? <Sun size={20}/> : <Moon size={20}/>}</button><button className="top-avatar" aria-label="Your profile" onClick={() => openProfile(me.username)}><Avatar user={me} size={36}/></button></div></header>
 {error && <div className="alert error" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss error"><X size={16}/></button></div>}{notice && <div className="toast" role="status"><Check size={18}/>{notice}</div>}
 <main className={'content ' + (page === 'messages' ? 'message-content' : '')}>
 {['home', 'explore', 'saved', 'post', 'profile'].includes(page) && <div className="feed-layout"><section className="feed-main">
 {page === 'home' && <><div className="page-heading"><div><div className="eyebrow"><span /> YOUR DAILY DOSE OF REAL</div><h1>Life, in good company<span>.</span></h1><p>Small moments. Fresh perspectives. Your kind of people.</p></div><span className="heading-flower">✳</span></div><div className="story-section"><div className="section-label"><h2>Around your world</h2><span>Here for 24 hours</span></div><div className="story-strip"><button className="story-add" onClick={() => setCompose({ kind: 'story' })}><span><Plus size={25}/></span><strong>Your moment</strong><small>Add a story</small></button>{stories.map((s, i) => <button className={'story-preview ' + (s.viewed ? 'viewed' : '')} key={s.id} onClick={() => setStoryIndex(i)}><div className="story-image">{s.mime.startsWith('video') ? <video src={media(s.media_id)} muted preload="metadata"/> : <img src={media(s.media_id)} alt=""/>}<Avatar user={s} size={26}/></div><strong>{s.username === me.username ? 'Your story' : s.name}</strong></button>)}{stories.length === 0 && <div className="story-invitation"><span>Make room for the everyday.</span><small>A morning coffee. A new view. A moment worth sharing.</small></div>}</div></div><div className="feed-tabs"><button className={tab === 'discover' ? 'selected' : ''} onClick={() => setTab('discover')}>For your curiosity</button><button className={tab === 'following' ? 'selected' : ''} onClick={() => setTab('following')}>Your circle</button><span><span className="status-dot"/>Fresh perspectives</span></div></>}
 {page === 'explore' && <><div className="page-heading"><div className="eyebrow">A WORLD WORTH EXPLORING</div><h1>Follow your curiosity<span>.</span></h1><p>Find the people who see things a little like you. Or a little differently.</p></div><label className="search-field"><Search size={20}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search people by name or username" aria-label="Search people"/></label><div className="people-grid">{people.map(u => <div className="person-card" key={u.id}><button onClick={() => openProfile(u.username)}><Avatar user={u} size={54}/><strong>{u.name}</strong><small>@{u.username}</small></button><Button className={u.followed ? 'outline' : 'soft'} onClick={() => toggleFollow(u)}>{u.followed ? 'Following' : 'Follow'}{u.followed ? <Check size={14}/> : <Plus size={14}/>}</Button></div>)}</div>{search && people.length === 0 && <p className="muted">No people found. Try another name.</p>}<div className="section-label"><h2>Fresh from the community</h2><span>Recent moments</span></div></>}
 {page === 'saved' && <div className="page-heading"><div className="eyebrow"><Lock size={14}/> ONLY YOU</div><h1>Your little collection<span>.</span></h1><p>Keep the moments you want to come back to.</p></div>}
 {page === 'post' && <button className="text-button" onClick={() => navigate('home')}><ArrowLeft size={16}/>Back to your space</button>}
 {page === 'profile' && profile && <><div className="profile-cover"><span>Every perspective has a place.</span><div className="cover-circles"/></div><div className="profile-info"><Avatar user={profile} size={100}/><div className="profile-buttons">{profileOwn ? <Button className="outline" onClick={() => setEdit(true)}><PenLine size={15}/>Edit profile</Button> : <><Button onClick={() => toggleFollow(profile)}>{profile.followed ? 'Following' : 'Follow'}{profile.followed ? <Check size={16}/> : <Plus size={16}/>}</Button><Button className="outline" onClick={() => startChat(profile)}><MessageCircle size={16}/>Message</Button></>}</div><h1>{profile.name}</h1><p className="muted">@{profile.username}</p><p className="bio">{profile.bio || 'A new perspective, a story still unfolding.'}</p>{profile.website && <a href={profile.website} target="_blank" rel="noopener noreferrer" className="profile-link"><LinkIcon size={14}/>{profile.website.replace(/^https?:\/\//, '')}</a>}<div className="profile-stats"><span><b>{profile.posts}</b> moments</span>{['followers', 'following'].map(type => <button key={type} onClick={() => act(async () => { const r = await api('connections/' + profile.id + '?type=' + type); setList({ title: type === 'followers' ? 'Followers' : 'Following', items: r.items }); })}><b>{profile[type]}</b> {type}</button>)}</div></div><div className="feed-tabs">{(profileOwn ? ['posts', 'saved', 'drafts', 'about'] : ['posts', 'about']).map(t => <button key={t} className={profileTab === t ? 'selected' : ''} onClick={() => setProfileTab(t)}>{t === 'posts' ? 'Moments' : t[0].toUpperCase() + t.slice(1)}{['saved', 'drafts'].includes(t) && <Lock size={12}/>}</button>)}</div>{profileTab === 'about' && <div className="card about-card"><h2>A little about {profile.name}</h2><p>{profile.bio || 'No bio added yet.'}</p><p className="muted">Part of Mellunest since {new Date(profile.created).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>{!profileOwn && <Button className="outline danger" onClick={() => { if (confirm('Block @' + profile.username + '? You will no longer see each other’s content or receive messages from each other.'))
            act(async () => { await api('blocks', 'POST', { target: profile.id, active: true }); navigate('home'); tell('Account blocked.'); }); }}>Block account</Button>}</div>}</>}
 {!(page === 'profile' && profileTab === 'about') && <>{loading && items.length === 0 ? <div className="skeleton-card"><div /><div /><div /></div> : items.length === 0 ? <Empty title={profileTab === 'drafts' && page === 'profile' ? 'An idea starts here.' : page === 'saved' ? 'Save a little inspiration.' : page === 'home' && tab === 'following' ? 'Your circle is waiting.' : 'The first moment is yours.'} detail={page === 'saved' ? 'Tap the bookmark on any post to keep it here.' : page === 'home' && tab === 'following' ? 'Discover someone new and follow them to see their moments here.' : 'This space grows with the things you share. A photo, a thought, a little slice of life.'} action={<Button onClick={() => page === 'home' && tab === 'following' ? navigate('explore') : setCompose({ kind: 'post' })}>{page === 'home' && tab === 'following' ? 'Discover people' : 'Share your first moment'}<ArrowRight size={16}/></Button>}/> : <div className={page === 'explore' ? 'explore-posts' : ''}>{items.map(p => <PostCard key={p.id} post={p} me={me} profile={openProfile} comment={() => openComments(p)} share={() => share(p)} edit={() => setCompose({ ...p, kind: 'post' })} remove={() => { if (confirm('Delete this moment and its comments? This cannot be undone.'))
            act(async () => { await api('posts/' + p.id, 'DELETE'); setItems(items.filter(x => x.id !== p.id)); tell('Moment deleted.'); }); }} interact={(type: string) => act(async () => { await api(type + '/' + p.id, 'POST', { active: !p[type === 'like' ? 'liked' : 'saved'] }); setItems(old => old.map(x => x.id === p.id ? { ...x, [type === 'like' ? 'liked' : 'saved']: !p[type === 'like' ? 'liked' : 'saved'], likes: p.likes + (type === 'like' ? (p.liked ? -1 : 1) : 0) } : x)); })}/>)}</div>}{next && <Button className="outline load-more" disabled={loading} onClick={() => loadPosts(true)}>{loading ? 'Loading…' : 'A few more moments'}</Button>}</>}
 </section><aside className="right-rail"><div className="welcome-card"><div className="welcome-art"><span>◒</span><span>◓</span><span>✳</span></div><span className="eyebrow">A SPACE TO BE YOURSELF</span><h2>Less perfect.<br />More present.</h2><p>Your everyday has a story.<br />Let someone in on it.</p><button onClick={() => setCompose({ kind: 'post' })}>Share something real <ArrowUpRight size={17}/></button></div><div className="suggestions"><div className="section-label"><h2>Meet your people</h2><button onClick={() => navigate('explore')}>Explore</button></div>{people.slice(0, 4).map(u => <div className="suggestion" key={u.id}><button className="person-link" onClick={() => openProfile(u.username)}><Avatar user={u}/><span><strong>{u.name}</strong><small>@{u.username}</small></span></button><button className={'follow-small ' + (u.followed ? 'following' : '')} aria-label={(u.followed ? 'Unfollow ' : 'Follow ') + u.name} onClick={() => toggleFollow(u)}>{u.followed ? <Check size={17}/> : <Plus size={17}/>}</button></div>)}{!people.length && <p className="muted">A new community starts with you. Your people will appear here as they join.</p>}</div><div className="community-note"><Globe size={20}/><p>Different worlds.<br /><strong>One shared space.</strong></p></div><footer>Made for the moments between.<br /><span>Mellunest © {new Date().getFullYear()}</span></footer></aside></div>}
 {page === 'messages' && <><div className="page-heading"><div className="eyebrow">KEEP THE CONVERSATION GOING</div><h1>A little closer<span>.</span></h1></div><div className="chat-layout"><section className="conversation-list"><header><h2>Conversations</h2><button className="icon-button" aria-label="Start conversation" onClick={() => setList({ title: 'Start a conversation', items: people })}><PenLine size={19}/></button></header><div className="connection"><span className={'status-dot ' + (!connected ? 'offline' : '')}/>{connected ? 'Connected · live updates' : 'Reconnecting…'}</div>{conversations.map(c => <button className={'conversation ' + (current?.conversation_id === c.conversation_id ? 'selected' : '')} key={c.conversation_id} onClick={() => openChat(c)}><Avatar user={c}/><span><strong>{c.name}</strong><small>{c.preview || 'Say your first hello'}</small></span>{c.unread > 0 && <b>{c.unread}</b>}</button>)}{conversations.length === 0 && <Empty title="Start with hello." detail="Find someone in Discover, then tap Message." action={<Button className="soft" onClick={() => navigate('explore')}>Find people</Button>}/>}</section><section className="chat-window">{current ? <><header><button className="person-link" onClick={() => openProfile(current.username)}><Avatar user={current}/><span><strong>{current.name}</strong><small>@{current.username}</small></span></button><ShieldCheck size={19}/></header><div className="chat-history" ref={chatPane} onScroll={() => { const el = chatPane.current; if (el)
        nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120; }}><button className="text-button" onClick={() => act(() => loadMessages(current.conversation_id, true))}>Load earlier messages</button><p className="chat-privacy"><Lock size={12}/>Only conversation participants can access these messages.</p>{messages.map(m => <div className={'bubble-wrap ' + (m.sender === me.id ? 'mine' : '')} key={m.id}><div className="bubble">{m.body.split(/(https?:\/\/[^\s]+)/g).map((part: string, i: number) => /^https?:\/\//.test(part) ? <a key={i} href={part} target="_blank" rel="noopener noreferrer">{part}</a> : part)}</div><small>{new Date(m.created).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}{m.sender === me.id && (m.read ? <CheckCheck size={13} aria-label="Read"/> : <Check size={13} aria-label="Sent"/>)}</small></div>)}<div ref={bottom}/></div><form className="message-form" onSubmit={async (e) => { e.preventDefault(); if (!message.trim() || sending)
        return; setSending(true); await act(async () => { await api('messages/' + current.conversation_id, 'POST', { id: crypto.randomUUID(), body: message }); setMessage(''); nearBottom.current = true; await loadMessages(current.conversation_id); await refreshAux(); }); setSending(false); }}><input aria-label="Message" placeholder="A thought, a hello, a little something…" maxLength={2000} value={message} onChange={e => setMessage(e.target.value)}/><Button type="submit" disabled={sending || !message.trim()} aria-label="Send message"><Send size={18}/></Button></form></> : <Empty title="Good conversations belong here." detail="Pick a conversation or reach out to someone new." action={<MessageCircle size={40}/>}/>}</section></div></>}
 {page === 'notifications' && <section className="activity-page"><div className="page-heading"><div className="eyebrow">THE LITTLE CONNECTIONS</div><h1>Your ripple effect<span>.</span></h1><p>A little love from around your world.</p></div><div className="section-label"><h2>Recent activity</h2><button onClick={() => act(async () => { await api('notifications', 'POST', {}); await refreshAux(); })}>Mark all as read</button></div>{notifications.length ? notifications.map(n => <button key={n.id} className={'notification card ' + (!n.read ? 'unread' : '')} onClick={() => { if (n.kind === 'follow')
        openProfile(n.username);
    else if (n.kind === 'message') {
        navigate('messages');
        const c = conversations.find(c => c.conversation_id === n.target);
        if (c)
            openChat(c);
    }
    else {
        history.replaceState({}, '', '/?post=' + n.target);
        setPage('post');
    } }}><Avatar user={n}/><span><strong>{n.name}</strong> {n.kind === 'like' ? 'liked your moment.' : n.kind === 'comment' ? 'left a comment on your moment.' : n.kind === 'follow' ? 'is now following you.' : 'sent you a message.'}<small>{ago(n.created)}</small></span>{!n.read && <i className="status-dot"/>}</button>) : <Empty title="Good things will find you." detail="Likes, comments, new followers and messages will appear here."/>}</section>}
 {page === 'settings' && <section className="settings-page"><div className="page-heading"><div className="eyebrow">MAKE YOURSELF AT HOME</div><h1>Your space. Your say<span>.</span></h1></div><div className="card settings-card"><h2>Profile & account</h2><div className="setting-row"><span><strong>Your public profile</strong><small>Name, bio, website and profile photo</small></span><Button className="outline" onClick={() => setEdit(true)}>Edit profile</Button></div><div className="setting-row"><span><strong>Email verification</strong><small>{!me.email ? 'No email is linked to this account.' : me.verified ? 'Your email has been verified.' : auth?.emailReady ? 'Verify your email to enable username and password sign-in.' : 'Email delivery setup is pending. ChatGPT sign-in is available.'}</small></span><Button className="outline" disabled={!me.email || !auth?.emailReady || !!me.verified} onClick={() => act(async () => { const r = await api('auth/send-verification', 'POST', {}); tell(r.message); })}>{me.verified ? 'Verified' : 'Verify email'}</Button></div><div className="setting-row"><span><strong>Password</strong><small>{me.email ? 'Set or reset your password through a secure email link.' : 'Email password recovery is unavailable for this account.'}</small></span><Button className="outline" disabled={!me.email || !auth?.emailReady} onClick={() => act(async () => { const r = await api('auth/forgot', 'POST', { email: me.email }); tell(r.message); })}>Reset password</Button></div></div><div className="card settings-card"><h2>Privacy & preferences</h2><div className="setting-row"><span><strong>Appearance</strong><small>{dark ? 'Soft dark' : 'Warm light'}</small></span><Button className="outline" onClick={() => setDark(!dark)}>{dark ? <Sun size={17}/> : <Moon size={17}/>}Switch theme</Button></div>{[['notifications', 'Activity notifications', 'Likes, comments, follows and messages.'], ['messages', 'Allow direct messages', 'People can start and continue conversations with you.']].map(([key, title, detail]) => <div className="setting-row" key={key}><span><strong>{title}</strong><small>{detail}</small></span><button className={'toggle ' + (me[key] ? 'on' : '')} role="switch" aria-checked={!!me[key]} aria-label={title} onClick={() => act(async () => { await api('users', 'PATCH', { ...me, notifications: !!me.notifications, messages: !!me.messages, [key]: !me[key] }); await bootAuth(); })}><span /></button></div>)}<div className="setting-row"><span><strong>Blocked accounts</strong><small>Manage people you have blocked.</small></span><Button className="outline" onClick={() => act(async () => { const r = await api('blocks'); setList({ title: 'Blocked accounts', items: r.items }); })}>Manage</Button></div><p className="muted">Published moments and profiles are visible to members with access to this site. Saved moments, drafts and conversations are private.</p></div><div className="settings-actions"><Button className="outline" onClick={logout}><LogOut size={17}/>Log out</Button><Button className="danger outline" onClick={() => { const confirmName = prompt('Permanently delete your account, all posts and conversations? Type your username to confirm.'); if (confirmName)
        act(async () => { await api('users', 'DELETE', { confirm: confirmName }); location.replace('/?auth=login'); }); }}><Trash2 size={16}/>Delete account</Button></div></section>}
 </main><nav className="mobile-nav" aria-label="Mobile navigation">{[[House, 'home'], [Compass, 'explore'], [Plus, 'create'], [MessageCircle, 'messages'], [Users, 'profile']].map(([Icon, v]: any) => <button key={v} className={page === v ? 'selected' : ''} aria-label={v} onClick={() => v === 'create' ? setCompose({ kind: 'post' }) : navigate(v)}><Icon size={22}/></button>)}</nav></div>
 {compose && <Composer value={compose} close={() => setCompose(null)} saved={async () => { setCompose(null); await loadPosts(); await refreshAux(); tell(compose.kind === 'story' ? 'Your story is live for 24 hours.' : 'Your moment has been saved.'); }}/>}
 {edit && <ProfileEditor user={me} close={() => setEdit(false)} saved={async (username: string) => { setEdit(false); await bootAuth(); if (profile)
        await openProfile(username); tell('Profile updated.'); }}/>}
 {comments && <Modal title="A little conversation" close={() => setComments(null)}><div className="comment-list">{commentItems.map(c => <div className="comment" key={c.id}><Avatar user={c} size={32}/><div><button className="text-button" onClick={() => { setComments(null); openProfile(c.username); }}><b>{c.name}</b></button><p>{c.body}</p><small>{ago(c.created)}</small></div>{(c.user_id === me.id || comments.user_id === me.id) && <button className="icon-button" aria-label="Delete comment" onClick={() => act(async () => { await api('comments/' + comments.id + '/' + c.id, 'DELETE'); setCommentItems(commentItems.filter(x => x.id !== c.id)); })}><Trash2 size={15}/></button>}</div>)}{!commentItems.length && <p className="muted">Be the first to leave a kind word.</p>}{commentItems.length >= 40 && <button className="text-button" onClick={() => act(async () => { const r = await api('comments/' + comments.id + '?before=' + commentItems[commentItems.length - 1].created); setCommentItems([...commentItems, ...r.items]); })}>Load earlier comments</button>}</div><form className="comment-form" onSubmit={e => { e.preventDefault(); act(async () => { await api('comments/' + comments.id, 'POST', { body: comment }); setComment(''); const r = await api('comments/' + comments.id); setCommentItems(r.items); await loadPosts(); }); }}><input aria-label="Comment" placeholder="Add a kind word…" maxLength={1000} value={comment} onChange={e => setComment(e.target.value)} required/><Button type="submit" aria-label="Post comment"><Send size={17}/></Button></form></Modal>}
 {storyIndex !== null && stories[storyIndex] && <Modal title={'A moment with ' + stories[storyIndex].name} close={() => setStoryIndex(null)}><div className="story-view"><div className="story-progress" key={stories[storyIndex].id}><i style={{ animationDuration: stories[storyIndex].mime.startsWith('video') ? '30s' : '7s' }}/></div><MediaView item={{ ...stories[storyIndex], id: stories[storyIndex].media_id }}/><button className="story-prev" aria-label="Previous story" onClick={() => setStoryIndex(Math.max(0, storyIndex - 1))}><ChevronLeft /></button><button className="story-next" aria-label="Next story" onClick={() => setStoryIndex(storyIndex + 1 < stories.length ? storyIndex + 1 : null)}><ChevronRight /></button></div><div className="story-meta"><small>{ago(stories[storyIndex].created)} · Expires {new Date(stories[storyIndex].expires).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</small>{stories[storyIndex].user_id === me.id && <><span><Eye size={14}/>{stories[storyIndex].view_count}</span><button className="icon-button" aria-label="Delete story" onClick={() => { if (confirm('Delete this story?'))
        act(async () => { await api('stories/' + stories[storyIndex].id, 'DELETE'); setStoryIndex(null); await refreshAux(); }); }}><Trash2 size={17}/></button></>}</div></Modal>}
 {list && <Modal title={list.title} close={() => setList(null)}><div className="user-list">{list.items.map(u => <div className="suggestion" key={u.id}><button className="person-link" onClick={() => { if (list.title === 'Start a conversation')
        startChat(u);
    else
        openProfile(u.username); setList(null); }}><Avatar user={u}/><span><strong>{u.name}</strong><small>@{u.username}</small></span></button>{list.title === 'Blocked accounts' && <Button className="outline" onClick={() => act(async () => { await api('blocks', 'POST', { target: u.id, active: false }); setList({ ...list, items: list.items.filter(x => x.id !== u.id) }); })}>Unblock</Button>}</div>)}{!list.items.length && <p className="muted">No accounts here yet.</p>}</div></Modal>}
 </div>;
}
