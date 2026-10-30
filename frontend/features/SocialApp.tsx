'use client';
import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { House, Compass, MessageCircle, Heart, Bookmark, Bell, Plus, Search, ArrowUpRight, ArrowRight, ArrowLeft, X, Send, Sun, Moon, Settings, LogOut, ImagePlus, Film, Trash2, MoreHorizontal, Users, Check, CheckCheck, LoaderCircle, ChevronLeft, ChevronRight, Lock, Globe, ShieldCheck, Leaf, PenLine, Upload, Eye, Link as LinkIcon } from 'lucide-react';
import {api,media,ago,iconStyle,type Item} from '../lib/api';
import {Logo,Avatar,Button,Empty,Modal,MediaView} from '../components/shared';
import {uploadFile} from '../lib/upload';
import {AuthScreen} from './AuthScreen';
import {PostCard} from './PostCard';
import {Composer} from './Composer';
import {ProfileEditor} from './ProfileEditor';
export default function App() {
    const [auth, setAuth] = useState<Item | null>(null), [boot, setBoot] = useState(true), [error, setError] = useState(''), [notice, setNotice] = useState(''), [page, setPage] = useState('home'), [tab, setTab] = useState('discover'), [items, setItems] = useState<Item[]>([]), [next, setNext] = useState<number | null>(null), [people, setPeople] = useState<Item[]>([]), [stories, setStories] = useState<Item[]>([]), [loading, setLoading] = useState(false), [search, setSearch] = useState(''), [profile, setProfile] = useState<Item | null>(null), [profileTab, setProfileTab] = useState('posts'), [notifications, setNotifications] = useState<Item[]>([]), [conversations, setConversations] = useState<Item[]>([]), [current, setCurrent] = useState<Item | null>(null), [messages, setMessages] = useState<Item[]>([]), [message, setMessage] = useState(''), [sending, setSending] = useState(false), [connected, setConnected] = useState(false), [compose, setCompose] = useState<Item | null>(null), [storyIndex, setStoryIndex] = useState<number | null>(null), [comments, setComments] = useState<Item | null>(null), [edit, setEdit] = useState(false), [list, setList] = useState<{
        title: string;
        items: Item[];
    } | null>(null), [dark, setDark] = useState(false), [authMode, setAuthMode] = useState('login'), [token, setToken] = useState('');
    const bottom = useRef<HTMLDivElement>(null), chatPane = useRef<HTMLDivElement>(null), nearBottom = useRef(true), refreshRef = useRef<() => void>(() => { }), currentRef = useRef<Item | null>(null);
    const pendingActions = useRef(new Set<string>());
    const followRevision = useRef(0);
    const messageRevision = useRef(0);
    const sendLock = useRef(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [passwordOpen, setPasswordOpen] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const passwordLock = useRef(false);
    const [feedRevision, setFeedRevision] = useState(0);
    const postRequest = useRef(0);
    const profileRequest = useRef(0);
    const [mobileMenu, setMobileMenu] = useState(false);
    const [profilePending, setProfilePending] = useState(false);
    const profileTarget = useRef('');
    const [chatLoading, setChatLoading] = useState(false);
    const chatTarget = useRef('');
    const me = auth?.user;
    const navigationKey = page === 'profile'
        ? page + ':' + (profile?.id || '') + ':' + profileTab
        : page === 'home' ? page + ':' + tab
        : page === 'post' && typeof window !== 'undefined'
            ? page + ':' + (new URLSearchParams(window.location.search).get('post') || '')
            : page;
    useLayoutEffect(() => {
        // Reset after the destination renders, before paint; background refreshes
        // and loading more posts retain the reader's position.
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, [navigationKey]);

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
    const openProfile = useCallback(async (name: string) => {
        if (profileTarget.current === name) return;
        const request = ++profileRequest.current;
        profileTarget.current = name;
        chatTarget.current = '';
        ++postRequest.current;
        setMobileMenu(false);
        setPage('profile');
        setProfile(null);
        setProfileTab('posts');
        setProfilePending(true);
        setItems([]);
        setNext(null);
        setLoading(true);
        setError('');
        history.replaceState({}, '', '/?profile=' + encodeURIComponent(name));
        try {
            const r = await api('users/' + encodeURIComponent(name));
            if (request !== profileRequest.current) return;
            setProfile(r.items[0]);
            setFeedRevision(value => value + 1);
        } catch (e: any) {
            if (request === profileRequest.current) setError(e.message);
        } finally {
            if (request === profileRequest.current) {
                profileTarget.current = '';
                setProfilePending(false);
                setLoading(false);
            }
        }
    }, []);
    const refreshAux = useCallback(async () => { if (!me)
        return; const revision = followRevision.current; const results = await Promise.all([api('stories'), api('users'), api('notifications'), api('conversations')]); setStories(results[0].items); if (revision === followRevision.current && ![...pendingActions.current].some(key => key.startsWith('follow:'))) setPeople(results[1].items); setNotifications(results[2].items); setConversations(results[3].items); }, [me?.id]);
    const loadPosts = useCallback(async (append = false) => { if (!me || (page === 'profile' && (!profile || profilePending || profileTab === 'about')))
        return; const request = ++postRequest.current; setLoading(true); try {
        let q = 'posts?scope=' + ((page === 'profile' && profileTab !== 'posts') ? profileTab : page === 'saved' ? 'saved' : page === 'home' && tab === 'following' ? 'following' : 'all');
        if (page === 'profile' && profileTab === 'posts')
            q += '&user=' + encodeURIComponent(profile?.username || me.username);
        if (page === 'post')
            q = 'posts/' + new URLSearchParams(location.search).get('post');
        if (append && next)
            q += '&before=' + next;
        const r = await api(q);
        if (request !== postRequest.current) return;
        setItems(old => append ? [...old, ...r.items] : r.items);
        setNext(r.next);
    }
    catch (e: any) {
        setError(e.message);
    }
    finally {
        if (request === postRequest.current) setLoading(false);
    } }, [me?.id, page, tab, profile?.username, profileTab, next, profilePending]);
    useEffect(() => { if (me) {
        refreshAux().catch(e => setError(e.message));
        const q = new URLSearchParams(location.search);
        if (q.get('profile'))
            openProfile(q.get('profile')!);
        else if (q.get('post'))
            setPage('post');
    } }, [me?.id]);
    useEffect(() => { if (me && ['home', 'explore', 'profile', 'saved', 'post'].includes(page))
        loadPosts(); }, [me?.id, page, tab, profile?.username, profileTab, feedRevision, profilePending]);
    useEffect(() => { if (!me || page !== 'explore')
        return; const timer = setTimeout(() => api('users?q=' + encodeURIComponent(search)).then(r => setPeople(r.items)).catch(e => setError(e.message)), 250); return () => clearTimeout(timer); }, [search, page, me?.id]);
    useEffect(() => { currentRef.current = current; }, [current]);
    const loadMessages = async (id: string, older = false) => { const revision = messageRevision.current; const r = await api('messages/' + id + (older && messages.length ? '?before=' + messages[0].created : '')); if (currentRef.current?.conversation_id !== id || revision !== messageRevision.current)
        return; setMessages(old => older ? [...r.items.reverse(), ...old] : r.items.reverse()); if (!older) {
        if (r.items.some((m: Item) => m.sender !== me.id && !m.read))
            void api('messages/' + id, 'POST', { read: true }).catch(() => {});
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
    const navigate = (v: string) => {
        setMobileMenu(false);
        if (v === 'profile') { void openProfile(me.username); return; }
        if (v === page) {
            window.scrollTo({ top: 0, behavior: 'instant' });
            return;
        }
        ++profileRequest.current;
        profileTarget.current = '';
        chatTarget.current = '';
        setProfilePending(false);
        setChatLoading(false);
        ++postRequest.current;
        setItems([]);
        setNext(null);
        setLoading(['home', 'explore', 'saved', 'post'].includes(v));
        setPage(v);
        setError('');
        history.replaceState({}, '', '/');
    };
    const toggleFollow = async (u: Item) => {
        const key = 'follow:' + u.id;
        if (pendingActions.current.has(key)) return;
        pendingActions.current.add(key);
        followRevision.current++;
        const previous = !!u.followed, active = !previous;
        const apply = (value: boolean, delta: number) => {
            setPeople(old => old.map(x => x.id === u.id ? { ...x, followed: value } : x));
            setProfile(old => old && old.id === u.id ? { ...old, followed: value, followers: Math.max(0, Number(old.followers || 0) + delta) } : old);
        };
        apply(active, active ? 1 : -1);
        try {
            setError('');
            await api('follow/' + u.id, 'POST', { active });
        } catch (e: any) {
            apply(previous, active ? -1 : 1);
            setError(e.message);
        } finally {
            followRevision.current++;
            pendingActions.current.delete(key);
        }
    };
    const interactPost = async (p: Item, type: string) => {
        const key = type + ':' + p.id;
        if (pendingActions.current.has(key)) return;
        pendingActions.current.add(key);
        const field = type === 'like' ? 'liked' : 'saved';
        const previous = !!p[field], active = !previous;
        const apply = (value: boolean, delta: number) => setItems(old => old.map(x =>
            x.id === p.id ? { ...x, [field]: value, likes: Math.max(0, Number(x.likes || 0) + delta) } : x));
        const delta = type === 'like' ? (active ? 1 : -1) : 0;
        apply(active, delta);
        try {
            setError('');
            await api(type + '/' + p.id, 'POST', { active });
        } catch (e: any) {
            apply(previous, -delta);
            setError(e.message);
        } finally {
            pendingActions.current.delete(key);
        }
    };
    const startChat = async (u: Item) => {
        if (chatTarget.current === u.id) return;
        const request = ++profileRequest.current;
        chatTarget.current = u.id;
        profileTarget.current = '';
        ++postRequest.current;
        setProfilePending(false);
        setPage('messages');
        setMobileMenu(false);
        setCurrent(null);
        currentRef.current = null;
        setMessages([]);
        setChatLoading(true);
        setError('');
        history.replaceState({}, '', '/');
        try {
            const c = await api('conversations', 'POST', { target: u.id });
            if (request !== profileRequest.current) return;
            const entry = { ...u, conversation_id: c.id };
            setCurrent(entry);
            currentRef.current = entry;
            nearBottom.current = true;
            await loadMessages(c.id);
            void refreshAux().catch(() => {});
        } catch (e: any) {
            if (request === profileRequest.current) setError(e.message);
        } finally {
            if (request === profileRequest.current) {
                chatTarget.current = '';
                setChatLoading(false);
            }
        }
    };
    const openChat = async (c: Item) => {
        if (currentRef.current?.conversation_id === c.conversation_id) return;
        const request = ++profileRequest.current;
        chatTarget.current = '';
        setCurrent(c);
        currentRef.current = c;
        setMessages([]);
        nearBottom.current = true;
        setChatLoading(true);
        try { await loadMessages(c.conversation_id); }
        catch (e: any) { if (request === profileRequest.current) setError(e.message); }
        finally { if (request === profileRequest.current) setChatLoading(false); }
    };
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
    const openComments = (p: Item) => setComments(p);
    const sendMessage = async () => {
        const conversationId = currentRef.current?.conversation_id;
        const body = message.trim();
        if (!body || !conversationId || sendLock.current) return;
        sendLock.current = true;
        setSending(true);
        setError('');
        try {
            const result = await api('messages/' + conversationId, 'POST', { id: crypto.randomUUID(), body });
            messageRevision.current++;
            if (currentRef.current?.conversation_id === conversationId) {
                setMessages(old => old.some(m => m.id === result.item.id) ? old : [...old, result.item]);
                setMessage(old => old.trim() === body ? '' : old);
                nearBottom.current = true;
                requestAnimationFrame(() => bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }));
            }
            setConversations(old => old.map(c => c.conversation_id === conversationId
                ? { ...c, preview: result.item.body, recent: result.item.created } : c)
                .sort((a, b) => (b.recent || b.created) - (a.recent || a.created)));
        } catch (e: any) {
            setError(e.message);
        } finally {
            sendLock.current = false;
            setSending(false);
        }
    };
    const logout = () => act(async () => { await api('auth/logout', 'POST', {}); location.replace('/?auth=login'); });
    if (boot)
        return <main className="boot"><Logo /><LoaderCircle className="spin"/><p>Making a little space for you…</p></main>;
    if (!me || new URLSearchParams(typeof window === 'undefined' ? '' : location.search).get('auth') === 'login' || ['verify', 'reset'].includes(authMode) && token)
        return <AuthScreen auth={auth} mode={authMode} setMode={setAuthMode} token={token} done={async () => { setToken(''); setAuthMode('login'); history.replaceState({}, '', '/'); await bootAuth(); }} error={error} setError={setError}/>;
    const unread = notifications.filter(n => !n.read).length;
    const navItems = [['home', 'Your space', House], ['explore', 'Discover', Compass], ['messages', 'Conversations', MessageCircle], ['saved', 'Saved moments', Bookmark], ['notifications', 'Activity', Bell]] as const;
    const profileOwn = profile?.id === me.id;
    const visitingOtherProfile = page === 'profile' && !profileOwn;
    const viewPost = (p: Item) => { ++profileRequest.current; ++postRequest.current; profileTarget.current = ''; chatTarget.current = ''; setProfilePending(false); history.replaceState({}, '', '/?post=' + p.id); setPage('post'); setItems([p]); };
    return <div className="app-shell">
 <aside className="sidebar"><a href="/" className="brand-link" aria-label="Mellunest home"><Logo /></a><div className="sidebar-note">LIFE IN GOOD COMPANY</div><nav aria-label="Main navigation">{navItems.map(([v, label, Icon]) => <button key={v} aria-label={label} aria-current={page === v ? 'page' : undefined} className={'nav-item ' + (page === v ? 'active' : '')} onClick={() => navigate(v)}><Icon {...iconStyle}/><span>{label}</span>{v === 'notifications' && unread > 0 && <b>{unread}</b>}{v === 'messages' && conversations.some(c => c.unread > 0) && <i />}</button>)}</nav><Button className="create-button" onClick={() => setCompose({ kind: 'post' })}><Plus size={20}/> Share a moment</Button><div className="sidebar-bottom"><div className="small-note"><span className="tiny-star">✳</span><p>A little more you.<br />A little closer together.</p></div><button aria-label="Settings" className={'nav-item ' + (page === 'settings' ? 'active' : '')} onClick={() => navigate('settings')}><Settings {...iconStyle}/>Settings</button><button className="self-card" onClick={() => openProfile(me.username)}><Avatar user={me}/><span><strong>{me.name}</strong><small>@{me.username}</small></span><ArrowUpRight size={18}/></button></div></aside>
 <div className="main-wrap"><header className="topbar"><div><span className="overline">YOUR EVERYDAY, CONNECTED</span><span className="topbar-title">{page === 'messages' ? 'A good conversation starts here.' : page === 'explore' ? 'Find a little inspiration.' : 'Good things happen together.'}</span></div><div className="top-actions"><button className="search-trigger" onClick={() => navigate('explore')}><Search size={17}/><span>Find your people</span><kbd>⌕</kbd></button><button className="icon-button" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setDark(!dark)}>{dark ? <Sun size={20}/> : <Moon size={20}/>}</button><button className="top-avatar" aria-label="Your profile" onClick={() => openProfile(me.username)}><Avatar user={me} size={36}/></button></div></header>
 {error && <div className="alert error" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss error"><X size={16}/></button></div>}{notice && <div className="toast" role="status"><Check size={18}/>{notice}</div>}
 <main className={'content ' + (page === 'messages' ? 'message-content' : '')}>
 {['home', 'explore', 'saved', 'post', 'profile'].includes(page) && <div className="feed-layout"><section className="feed-main">
 {page === 'home' && <><div className="page-heading"><div><div className="eyebrow"><span /> YOUR DAILY DOSE OF REAL</div><h1>Life, in good company<span>.</span></h1><p>Small moments. Fresh perspectives. Your kind of people.</p></div><span className="heading-flower">✳</span></div><div className="story-section"><div className="section-label"><h2>Around your world</h2><span>Here for 24 hours</span></div><div className="story-strip"><button className="story-add" onClick={() => setCompose({ kind: 'story' })}><span><Plus size={25}/></span><strong>Your moment</strong><small>Add a story</small></button>{stories.map((s, i) => <button className={'story-preview ' + (s.viewed ? 'viewed' : '')} key={s.id} onClick={() => setStoryIndex(i)}><div className="story-image"><StoryPreview key={s.media_id} src={media(s.media_id)} video={s.mime.startsWith('video')}/><Avatar user={s} size={26}/></div><strong>{s.username === me.username ? 'Your story' : s.name}</strong></button>)}{stories.length === 0 && <div className="story-invitation"><span>Make room for the everyday.</span><small>A morning coffee. A new view. A moment worth sharing.</small></div>}</div></div><div className="feed-tabs"><button className={tab === 'discover' ? 'selected' : ''} onClick={() => setTab('discover')}>For your curiosity</button><button className={tab === 'following' ? 'selected' : ''} onClick={() => setTab('following')}>Your circle</button><span><span className="status-dot"/>Fresh perspectives</span></div></>}
 {page === 'explore' && <><div className="page-heading"><div className="eyebrow">A WORLD WORTH EXPLORING</div><h1>Follow your curiosity<span>.</span></h1><p>Find the people who see things a little like you. Or a little differently.</p></div><label className="search-field"><Search size={20}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search people by name or username" aria-label="Search people"/></label><div className="people-grid">{people.map(u => <div className="person-card" key={u.id}><button onClick={() => openProfile(u.username)}><Avatar user={u} size={54}/><strong>{u.name}</strong><small>@{u.username}</small></button><Button className={u.followed ? 'outline' : 'soft'} onClick={() => toggleFollow(u)}>{u.followed ? 'Following' : 'Follow'}{u.followed ? <Check size={14}/> : <Plus size={14}/>}</Button></div>)}</div>{search && people.length === 0 && <p className="muted">No people found. Try another name.</p>}<div className="section-label"><h2>Fresh from the community</h2><span>Recent moments</span></div></>}
 {page === 'saved' && <div className="page-heading"><div className="eyebrow"><Lock size={14}/> ONLY YOU</div><h1>Your little collection<span>.</span></h1><p>Keep the moments you want to come back to.</p></div>}
 {page === 'post' && <button className="text-button" onClick={() => navigate('home')}><ArrowLeft size={16}/>Back to your space</button>}
 {page === 'profile' && !profile && <div className="navigation-status" role="status" aria-live="polite">{profilePending ? <><LoaderCircle className="spin" size={24}/><span>Opening profile…</span></> : <><span>Profile could not be loaded.</span><Button className="outline" onClick={() => openProfile(new URLSearchParams(location.search).get('profile') || me.username)}>Try again</Button></>}</div>}
 {page === 'profile' && profile && <><div className="profile-cover"><span>Every perspective has a place.</span><div className="cover-circles"/></div><div className="profile-info"><Avatar user={profile} size={100}/><div className="profile-buttons">{profileOwn ? <Button className="outline" onClick={() => setEdit(true)}><PenLine size={15}/>Edit profile</Button> : <><Button onClick={() => toggleFollow(profile)}>{profile.followed ? 'Following' : 'Follow'}{profile.followed ? <Check size={16}/> : <Plus size={16}/>}</Button><Button className="outline" onClick={() => startChat(profile)}><MessageCircle size={16}/>Message</Button></>}</div><h1>{profile.name}</h1><p className="muted">@{profile.username}</p><p className="bio">{profile.bio || 'A new perspective, a story still unfolding.'}</p>{profile.website && <a href={profile.website} target="_blank" rel="noopener noreferrer" className="profile-link"><LinkIcon size={14}/>{profile.website.replace(/^https?:\/\//, '')}</a>}<div className="profile-stats"><span><b>{profile.posts}</b> moments</span>{['followers', 'following'].map(type => <button key={type} onClick={() => act(async () => { const r = await api('connections/' + profile.id + '?type=' + type); setList({ title: type === 'followers' ? 'Followers' : 'Following', items: r.items }); })}><b>{profile[type]}</b> {type}</button>)}</div></div><div className="feed-tabs">{(profileOwn ? ['posts', 'saved', 'drafts', 'about'] : ['posts', 'about']).map(t => <button key={t} className={profileTab === t ? 'selected' : ''} onClick={() => setProfileTab(t)}>{t === 'posts' ? 'Moments' : t[0].toUpperCase() + t.slice(1)}{['saved', 'drafts'].includes(t) && <Lock size={12}/>}</button>)}</div>{profileTab === 'about' && <div className="card about-card"><h2>A little about {profile.name}</h2><p>{profile.bio || 'No bio added yet.'}</p><p className="muted">Part of Mellunest since {new Date(profile.created).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>{!profileOwn && <Button className="outline danger" onClick={() => { if (confirm('Block @' + profile.username + '? You will no longer see each other’s content or receive messages from each other.'))
            act(async () => { await api('blocks', 'POST', { target: profile.id, active: true }); navigate('home'); tell('Account blocked.'); }); }}>Block account</Button>}</div>}</>}
 {!(page === 'profile' && (!profile || profileTab === 'about')) && <>{loading && items.length === 0 ? <div className="skeleton-card"><div /><div /><div /></div> : items.length === 0 ? <Empty title={visitingOtherProfile ? 'No moments yet.' : profileTab === 'drafts' && page === 'profile' ? 'An idea starts here.' : page === 'saved' ? 'Save a little inspiration.' : page === 'home' && tab === 'following' ? 'Your circle is waiting.' : 'The first moment is yours.'} detail={visitingOtherProfile ? 'This member has not shared any moments yet.' : page === 'saved' ? 'Tap the bookmark on any post to keep it here.' : page === 'home' && tab === 'following' ? 'Discover someone new and follow them to see their moments here.' : 'This space grows with the things you share. A photo, a thought, a little slice of life.'} action={visitingOtherProfile ? undefined : <Button onClick={() => page === 'home' && tab === 'following' ? navigate('explore') : setCompose({ kind: 'post' })}>{page === 'home' && tab === 'following' ? 'Discover people' : 'Share your first moment'}<ArrowRight size={16}/></Button>}/> : <div className={page === 'explore' ? 'explore-posts' : ''}>{items.map((p, index) => <PostCard priority={index === 0} key={p.id} post={p} me={me} profile={openProfile} comment={() => openComments(p)} share={() => share(p)} edit={() => setCompose({ ...p, kind: 'post' })} remove={() => { if (confirm('Delete this moment and its comments? This cannot be undone.'))
            act(async () => { await api('posts/' + p.id, 'DELETE'); setItems(items.filter(x => x.id !== p.id)); tell('Moment deleted.'); }); }} interact={(type: string) => interactPost(p, type)}/>)}</div>}{next && <Button className="outline load-more" disabled={loading} onClick={() => loadPosts(true)}>{loading ? 'Loading…' : 'A few more moments'}</Button>}</>}
 </section><aside className="right-rail"><div className="welcome-card"><div className="welcome-art"><span>◒</span><span>◓</span><span>✳</span></div><span className="eyebrow">A SPACE TO BE YOURSELF</span><h2>Less perfect.<br />More present.</h2><p>Your everyday has a story.<br />Let someone in on it.</p><button onClick={() => setCompose({ kind: 'post' })}>Share something real <ArrowUpRight size={17}/></button></div><div className="suggestions"><div className="section-label"><h2>Meet your people</h2><button onClick={() => navigate('explore')}>Explore</button></div>{people.slice(0, 4).map(u => <div className="suggestion" key={u.id}><button className="person-link" onClick={() => openProfile(u.username)}><Avatar user={u}/><span><strong>{u.name}</strong><small>@{u.username}</small></span></button><button className={'follow-small ' + (u.followed ? 'following' : '')} aria-label={(u.followed ? 'Unfollow ' : 'Follow ') + u.name} onClick={() => toggleFollow(u)}>{u.followed ? <Check size={17}/> : <Plus size={17}/>}</button></div>)}{!people.length && <p className="muted">A new community starts with you. Your people will appear here as they join.</p>}</div><div className="community-note"><Globe size={20}/><p>Different worlds.<br /><strong>One shared space.</strong></p></div><footer>Made for the moments between.<br /><span>Mellunest © {new Date().getFullYear()}</span></footer></aside></div>}
 {page === 'messages' && <><div className="page-heading"><div className="eyebrow">KEEP THE CONVERSATION GOING</div><h1>A little closer<span>.</span></h1></div><div className="chat-layout"><section className="conversation-list"><header><h2>Conversations</h2><button className="icon-button" aria-label="Start conversation" onClick={() => setList({ title: 'Start a conversation', items: people })}><PenLine size={19}/></button></header><div className="connection"><span className={'status-dot ' + (!connected ? 'offline' : '')}/>{connected ? 'Connected · live updates' : 'Reconnecting…'}</div>{conversations.map(c => <button className={'conversation ' + (current?.conversation_id === c.conversation_id ? 'selected' : '')} key={c.conversation_id} onClick={() => openChat(c)}><Avatar user={c}/><span><strong>{c.name}</strong><small>{c.preview || 'Say your first hello'}</small></span>{c.unread > 0 && <b>{c.unread}</b>}</button>)}{conversations.length === 0 && <Empty title="Start with hello." detail="Find someone in Discover, then tap Message." action={<Button className="soft" onClick={() => navigate('explore')}>Find people</Button>}/>}</section><section className="chat-window">{chatLoading && !current ? <div className="navigation-status" role="status"><LoaderCircle className="spin" size={24}/><span>Opening conversation…</span></div> : current ? <><header><button className="person-link" onClick={() => openProfile(current.username)}><Avatar user={current}/><span><strong>{current.name}</strong><small>@{current.username}</small></span></button><ShieldCheck size={19}/></header><div className="chat-history" ref={chatPane} onScroll={() => { const el = chatPane.current; if (el)
        nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120; }}><button className="text-button" disabled={chatLoading} onClick={() => act(() => loadMessages(current.conversation_id, true))}>Load earlier messages</button>{chatLoading && <div className="navigation-status compact" role="status"><LoaderCircle className="spin" size={20}/><span>Loading messages…</span></div>}<p className="chat-privacy"><Lock size={12}/>Only conversation participants can access these messages.</p>{messages.map(m => <div className={'bubble-wrap ' + (m.sender === me.id ? 'mine' : '')} key={m.id}><div className="bubble">{m.body.split(/(https?:\/\/[^\s]+)/g).map((part: string, i: number) => /^https?:\/\//.test(part) ? <a key={i} href={part} target="_blank" rel="noopener noreferrer">{part}</a> : part)}</div><small>{new Date(m.created).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}{m.sender === me.id && (m.read ? <CheckCheck size={13} aria-label="Read"/> : <Check size={13} aria-label="Sent"/>)}</small></div>)}<div ref={bottom}/></div><form className="message-form" onSubmit={e => { e.preventDefault(); void sendMessage(); }}><input aria-label="Message" placeholder="A thought, a hello, a little something…" maxLength={2000} value={message} onChange={e => setMessage(e.target.value)}/><Button type="submit" disabled={sending || !message.trim()} aria-label={sending ? "Sending message" : "Send message"}>{sending ? <LoaderCircle className="spin" size={18}/> : <Send size={18}/>}</Button></form></> : <Empty title="Good conversations belong here." detail="Pick a conversation or reach out to someone new." action={<MessageCircle size={40}/>}/>}</section></div></>}
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
 {page === 'settings' && <section className="settings-page"><div className="page-heading"><div className="eyebrow">MAKE YOURSELF AT HOME</div><h1>Your space. Your say<span>.</span></h1></div><div className="card settings-card"><h2>Profile & account</h2><div className="setting-row"><span><strong>Your public profile</strong><small>Name, bio, website and profile photo</small></span><Button className="outline" onClick={() => setEdit(true)}>Edit profile</Button></div><div className="setting-row"><span><strong>Password</strong><small>Change your password using your current password.</small></span><Button className="outline" onClick={() => { setPasswordError(''); setPasswordOpen(true); }}>Reset password</Button></div></div><div className="card settings-card"><h2>Privacy & preferences</h2><div className="setting-row"><span><strong>Appearance</strong><small>{dark ? 'Soft dark' : 'Warm light'}</small></span><Button className="outline" onClick={() => setDark(!dark)}>{dark ? <Sun size={17}/> : <Moon size={17}/>}Switch theme</Button></div>{[['notifications', 'Activity notifications', 'Likes, comments, follows and messages.'], ['messages', 'Allow direct messages', 'People can start and continue conversations with you.']].map(([key, title, detail]) => <div className="setting-row" key={key}><span><strong>{title}</strong><small>{detail}</small></span><button className={'toggle ' + (me[key] ? 'on' : '')} role="switch" aria-checked={!!me[key]} aria-label={title} onClick={() => act(async () => { await api('users', 'PATCH', { ...me, notifications: !!me.notifications, messages: !!me.messages, [key]: !me[key] }); await bootAuth(); })}><span /></button></div>)}<div className="setting-row"><span><strong>Blocked accounts</strong><small>Manage people you have blocked.</small></span><Button className="outline" onClick={() => act(async () => { const r = await api('blocks'); setList({ title: 'Blocked accounts', items: r.items }); })}>Manage</Button></div><p className="muted">Published moments and profiles are visible to members with access to this site. Saved moments, drafts and conversations are private.</p></div><div className="settings-actions"><Button className="outline" onClick={logout}><LogOut size={17}/>Log out</Button><Button className="danger outline" onClick={() => { const confirmName = prompt('Permanently delete your account, all posts and conversations? Type your username to confirm.'); if (confirmName)
        act(async () => { await api('users', 'DELETE', { confirm: confirmName }); location.replace('/?auth=login'); }); }}><Trash2 size={16}/>Delete account</Button></div></section>}
 </main><nav className="mobile-nav" aria-label="Mobile navigation">{[[House, 'home', 'Home'], [Compass, 'explore', 'Discover'], [Plus, 'create', 'Create'], [MessageCircle, 'messages', 'Chats'], [Users, 'profile', 'Profile'], [MoreHorizontal, 'more', 'More']].map(([Icon, v, label]: any) => <button key={v} className={(page === v || (v === 'more' && ['saved', 'notifications', 'settings'].includes(page))) ? 'selected' : ''} aria-label={label} aria-current={page === v ? 'page' : undefined} aria-haspopup={v === 'more' ? 'dialog' : undefined} aria-expanded={v === 'more' ? mobileMenu : undefined} onClick={() => v === 'create' ? setCompose({ kind: 'post' }) : v === 'more' ? setMobileMenu(true) : navigate(v)}><Icon size={21}/><span>{label}</span></button>)}</nav></div>
 {mobileMenu && <Modal title="Your Mellunest" close={() => setMobileMenu(false)}><div className="mobile-menu-options">{[[Bookmark, 'saved', 'Saved moments'], [Bell, 'notifications', 'Activity'], [Settings, 'settings', 'Settings']].map(([Icon, target, label]: any) => <button key={target} onClick={() => navigate(target)}><Icon size={21}/><span>{label}</span><ArrowRight size={17}/></button>)}<button onClick={() => { setMobileMenu(false); void logout(); }}><LogOut size={21}/><span>Log out</span></button></div></Modal>}
 {passwordOpen && <Modal title="Reset password" close={() => { if (!passwordLock.current) { setPasswordOpen(false); setPasswordError(''); } }}><form style={{ padding: 24 }} onSubmit={async e => {
    e.preventDefault();
    if (passwordLock.current) return;
    const form = e.currentTarget;
    const fields = new FormData(form);
    const oldPassword = String(fields.get('oldPassword') || '');
    const newPassword = String(fields.get('newPassword') || '');
    const confirmPassword = String(fields.get('confirmPassword') || '');
    if (newPassword !== confirmPassword) { setPasswordError('New passwords do not match.'); return; }
    if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword) || new TextEncoder().encode(newPassword).length > 72) {
        setPasswordError('Use at least 8 characters including a letter and a number. Maximum 72 bytes.'); return;
    }
    passwordLock.current = true;
    setChangingPassword(true);
    setPasswordError('');
    try {
        const result = await api('auth/change-password', 'POST', { oldPassword, newPassword, confirmPassword });
        form.reset();
        setPasswordOpen(false);
        tell(result.message);
    } catch (e: any) { setPasswordError(e.message); }
    finally { passwordLock.current = false; setChangingPassword(false); }
}}>
<p className="muted">Use at least 8 characters, including a letter and a number. Special characters are optional.</p>
{passwordError && <p className="alert error" role="alert">{passwordError}</p>}
<fieldset disabled={changingPassword} style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 14 }}>
<label style={{ display: 'grid', gap: 6 }}>Old password<input name="oldPassword" type="password" autoComplete="current-password" autoFocus required /></label>
<label style={{ display: 'grid', gap: 6 }}>New password<input name="newPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} required /></label>
<label style={{ display: 'grid', gap: 6 }}>Confirm new password<input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} required /></label>
<small className="muted">After changing your password, other devices will be signed out.</small>
<Button type="submit" className="outline" disabled={changingPassword}>{changingPassword ? 'Changing password…' : 'Change password'}</Button>
</fieldset></form></Modal>}
 {compose && <Composer user={me} value={compose} close={() => setCompose(null)} saved={async (status: string) => { const createdPost = compose.kind === 'post' && !compose.id; setCompose(null); if (createdPost) { await openProfile(me.username); if (status === 'draft') setProfileTab('drafts'); } else { await loadPosts(); } await refreshAux(); tell(compose.kind === 'story' ? 'Your story is live for 24 hours.' : 'Your moment has been saved to your account.'); }}/>}
 {edit && <ProfileEditor user={me} close={() => setEdit(false)} saved={async (username: string) => { setEdit(false); await bootAuth(); if (profile)
        await openProfile(username); tell('Profile updated.'); }}/>}
 {comments && <CommentsDialog key={comments.id} post={comments} me={me} close={() => setComments(null)} profile={name => { setComments(null); void openProfile(name); }} changed={() => void loadPosts()}/>}
 {storyIndex !== null && stories[storyIndex] && <Modal title={'A moment with ' + stories[storyIndex].name} close={() => setStoryIndex(null)}><div className="story-view"><div className="story-progress" key={stories[storyIndex].id}><i style={{ animationDuration: stories[storyIndex].mime.startsWith('video') ? '30s' : '7s' }}/></div><MediaView item={{ ...stories[storyIndex], id: stories[storyIndex].media_id }}/><button className="story-prev" aria-label="Previous story" onClick={() => setStoryIndex(Math.max(0, storyIndex - 1))}><ChevronLeft /></button><button className="story-next" aria-label="Next story" onClick={() => setStoryIndex(storyIndex + 1 < stories.length ? storyIndex + 1 : null)}><ChevronRight /></button></div><div className="story-meta"><small>{ago(stories[storyIndex].created)} · Expires {new Date(stories[storyIndex].expires).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</small>{stories[storyIndex].user_id === me.id && <><span><Eye size={14}/>{stories[storyIndex].view_count}</span><button className="icon-button" aria-label="Delete story" onClick={() => { if (confirm('Delete this story?'))
        act(async () => { await api('stories/' + stories[storyIndex].id, 'DELETE'); setStoryIndex(null); await refreshAux(); }); }}><Trash2 size={17}/></button></>}</div></Modal>}
 {list && <Modal title={list.title} close={() => setList(null)}><div className="user-list">{list.items.map(u => <div className="suggestion" key={u.id}><button className="person-link" onClick={() => { if (list.title === 'Start a conversation')
        startChat(u);
    else
        openProfile(u.username); setList(null); }}><Avatar user={u}/><span><strong>{u.name}</strong><small>@{u.username}</small></span></button>{list.title === 'Blocked accounts' && <Button className="outline" onClick={() => act(async () => { await api('blocks', 'POST', { target: u.id, active: false }); setList({ ...list, items: list.items.filter(x => x.id !== u.id) }); })}>Unblock</Button>}</div>)}{!list.items.length && <p className="muted">No accounts here yet.</p>}</div></Modal>}
 </div>;
}


// Keep each post's comments, draft and requests inside its own mounted dialog.
function CommentsDialog({ post, me, close, profile, changed }: {
    post: Item; me: Item; close: () => void; profile: (name: string) => void; changed: () => void;
}) {
    const [items, setItems] = useState<Item[]>([]);
    const [draft, setDraft] = useState('');
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [retry, setRetry] = useState(0);
    const active = useRef(false);
    const lock = useRef(false);
    useEffect(() => {
        active.current = true;
        let cancelled = false;
        setLoading(true);
        setError('');
        api('comments/' + post.id).then(r => {
            if (!cancelled) setItems(r.items);
        }).catch(e => {
            if (!cancelled) setError(e.message);
        }).finally(() => {
            if (!cancelled) setLoading(false);
        });
        return () => { cancelled = true; active.current = false; };
    }, [post.id, retry]);
    const run = async (task: () => Promise<void>) => {
        if (lock.current || loading) return;
        lock.current = true;
        setBusy(true);
        setError('');
        try { await task(); }
        catch (e: any) { if (active.current) setError(e.message); }
        finally {
            lock.current = false;
            if (active.current) setBusy(false);
        }
    };
    return <Modal title="A little conversation" close={close}>
        <div className="comment-list" aria-busy={loading}>
            {loading ? <div className="navigation-status compact" role="status" aria-live="polite"><LoaderCircle className="spin" size={24} aria-hidden="true"/><span>Loading comments…</span></div> : <>
                {items.map(c => <div className="comment" key={c.id}>
                    <Avatar user={c} size={32}/>
                    <div><button className="text-button" onClick={() => profile(c.username)}><b>{c.name}</b></button><p>{c.body}</p><small>{ago(c.created)}</small></div>
                    {(c.user_id === me.id || post.user_id === me.id) && <button className="icon-button" aria-label="Delete comment" disabled={busy} onClick={() => void run(async () => {
                        await api('comments/' + post.id + '/' + c.id, 'DELETE');
                        if (active.current) { setItems(previous => previous.filter(x => x.id !== c.id)); changed(); }
                    })}><Trash2 size={15}/></button>}
                </div>)}
                {!items.length && !error && <p className="muted">Be the first to leave a kind word.</p>}
                {items.length >= 40 && <button className="text-button" disabled={busy} onClick={() => void run(async () => {
                    const r = await api('comments/' + post.id + '?before=' + items[items.length - 1].created);
                    if (active.current) setItems(previous => [...previous, ...r.items.filter((c: Item) => !previous.some(x => x.id === c.id))]);
                })}>Load earlier comments</button>}
            </>}
            {error && <div role="alert"><p>{error}</p><button className="text-button" disabled={busy || loading} onClick={() => setRetry(value => value + 1)}>Retry loading comments</button></div>}
        </div>
        <form className="comment-form" onSubmit={e => { e.preventDefault(); void run(async () => {
            await api('comments/' + post.id, 'POST', { body: draft });
            if (!active.current) return;
            setDraft('');
            changed();
            const r = await api('comments/' + post.id);
            if (active.current) setItems(r.items);
        }); }}>
            <input aria-label="Comment" placeholder="Add a kind word…" maxLength={1000} value={draft} onChange={e => setDraft(e.target.value)} disabled={loading || busy} required/>
            <Button type="submit" aria-label="Post comment" disabled={loading || busy}><Send size={17}/></Button>
        </form>
    </Modal>;
}


// Decode a small still only when the story tile approaches the visible strip.
// This also covers videos uploaded before thumbnails were introduced.
function StoryPreview({ src, video }: { src: string; video: boolean }) {
    const container = useRef<HTMLSpanElement>(null);
    const [poster, setPoster] = useState('');
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        if (!video) return;
        let disposed = false, started = false, objectUrl = '';
        let clip: HTMLVideoElement | null = null;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const release = () => {
            if (timer) clearTimeout(timer);
            if (clip) {
                clip.onloadedmetadata = clip.onseeked = clip.onerror = null;
                clip.pause();
                clip.removeAttribute('src');
                clip.load();
                clip = null;
            }
        };
        const fail = () => { if (!disposed) setFailed(true); release(); };
        const start = () => {
            if (started || disposed) return;
            started = true;
            clip = document.createElement('video');
            clip.muted = true;
            clip.playsInline = true;
            clip.preload = 'auto';
            clip.onloadedmetadata = () => {
                if (!clip) return;
                // A small offset avoids the blank opening frame common on mobile.
                clip.currentTime = Number.isFinite(clip.duration) ? Math.min(0.1, clip.duration / 2) : 0.1;
            };
            clip.onseeked = () => {
                if (!clip || disposed) return;
                try {
                    const canvas = document.createElement('canvas');
                    const scale = Math.min(1, 240 / Math.max(clip.videoWidth, clip.videoHeight));
                    canvas.width = Math.max(1, Math.round(clip.videoWidth * scale));
                    canvas.height = Math.max(1, Math.round(clip.videoHeight * scale));
                    const context = canvas.getContext('2d');
                    if (!context || !clip.videoWidth) { fail(); return; }
                    context.drawImage(clip, 0, 0, canvas.width, canvas.height);
                    release();
                    canvas.toBlob(blob => {
                        if (disposed) return;
                        if (!blob) { setFailed(true); return; }
                        objectUrl = URL.createObjectURL(blob);
                        setPoster(objectUrl);
                    }, 'image/jpeg', 0.8);
                } catch { fail(); }
            };
            clip.onerror = fail;
            timer = setTimeout(fail, 20000);
            clip.src = src;
            clip.load();
        };
        const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) { observer?.disconnect(); start(); }
        }, { rootMargin: '80px' }) : null;
        if (observer && container.current) observer.observe(container.current);
        else start();
        return () => {
            disposed = true;
            observer?.disconnect();
            release();
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [src, video]);
    if (!video) return <img src={src} alt="" loading="lazy" decoding="async"/>;
    return <span ref={container} style={{ display: 'grid', placeItems: 'center', gridTemplateColumns: 'minmax(0, 1fr)', gridTemplateRows: 'minmax(0, 1fr)', width: '100%', height: '100%', minWidth: 0, minHeight: 0, overflow: 'hidden', borderRadius: 11, background: 'var(--soft)', color: 'var(--brand)' }}>
        {poster ? <img src={poster} alt="Video story preview" style={{ display: 'block', width: '100%', height: '100%', minWidth: 0, minHeight: 0, objectFit: 'cover' }}/> :
            failed ? <Film size={28} aria-label="Video story"/> : <LoaderCircle className="spin" size={22} aria-label="Loading story preview"/>}
    </span>;
}
