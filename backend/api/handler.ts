import { hash, compare } from 'bcryptjs';
export interface Runtime {
    DB: D1Database;
    BUCKET: R2Bucket;
    RESEND_API_KEY?: string;
    EMAIL_FROM?: string;
    APP_ORIGIN?: string;
    CLEANUP_SECRET?: string;
}
class Fault extends Error {
    constructor(public status: number, message: string) { super(message); }
}
function fail(s: number, m: string): never { throw new Fault(s, m); }
const uid = () => crypto.randomUUID();
const now = () => Date.now();
const day = 86400000;
const pub = 'u.id,u.username,u.name,u.bio,u.website,u.avatar,u.created';
const json = (x: unknown, s = 200, h: Record<string, string> = {}) => Response.json(x, { status: s, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...h } });
const digest = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))), b => b.toString(16).padStart(2, '0')).join('');
const str = (x: unknown, max = 2000) => typeof x === 'string' && x.length <= max ? x.trim() : fail(400, 'Please check the text length.');
const username = (x: unknown) => { let v = str(x, 24).toLowerCase(); if (!/^[a-z0-9_][a-z0-9_.]{1,22}[a-z0-9_]$/.test(v) || v.includes('..'))
    fail(400, 'Use 3–24 letters, numbers, underscores or single dots; no dots at either end.'); return v; };
const password = (x: unknown) => { if (typeof x !== 'string' || x.length < 8 || new TextEncoder().encode(x).length > 72 || !/[a-zA-Z]/.test(x) || !/[0-9]/.test(x))
    fail(400, 'Use at least 8 characters including a letter and a number. Special characters are optional. Maximum 72 bytes.'); return x as string; };
export async function handle(req: Request, env: Runtime): Promise<Response> {
    const db = env.DB, url = new URL(req.url), p = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean), method = req.method;
    const one = async (sql: string, ...a: any[]) => db.prepare(sql).bind(...a).first<any>();
    const all = async (sql: string, ...a: any[]) => ((await db.prepare(sql).bind(...a).all<any>()).results);
    const run = async (sql: string, ...a: any[]) => db.prepare(sql).bind(...a).run();
    const batch = async (q: [
        string,
        ...any[]
    ][]) => db.batch(q.map(([s, ...a]) => db.prepare(s).bind(...a)));
    const limit = async (key: string, max: number, window = 60000) => { const t = now(); const r = await one('INSERT INTO rate(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires<? THEN 1 ELSE count+1 END,expires=CASE WHEN expires<? THEN ? ELSE expires END RETURNING count', key, t + window, t, t, t + window); if (r.count > max)
        fail(429, 'Too many requests. Please try again shortly.'); };
    const cookie = req.headers.get('cookie')?.match(/(?:^|; )mellunest=([^;]+)/)?.[1];
    let me: any = null;
    const user = async () => { if (me)
        return me; if (cookie)
        me = await one('SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token=? AND s.expires>?', await digest(cookie), now()); if (!me) {
        const platform = null;
        if (platform)
            me = await one('SELECT * FROM users WHERE platform_id=?', platform);
    } return me || fail(401, 'Sign in to continue.'); };
    const blocked = async (a: string, b: string) => !!await one('SELECT 1 FROM blocks WHERE (user_id=? AND target=?) OR (user_id=? AND target=?)', a, b, b, a);
    const canPost = async (id: string, u: any) => { let post = await one('SELECT * FROM posts WHERE id=? AND (status=\'published\' OR user_id=?)', id, u.id); if (!post || await blocked(u.id, post.user_id))
        fail(404, 'Post not found.'); return post; };
    const conversation = async (id: string, u: any) => { let c = await one('SELECT c.* FROM conversations c WHERE c.id=? AND (c.a=? OR c.b=?) AND NOT EXISTS(SELECT 1 FROM blocks b WHERE (b.user_id=c.a AND b.target=c.b) OR (b.user_id=c.b AND b.target=c.a))', id, u.id, u.id); if (!c)
        fail(404, 'Conversation not found.'); return c; };
    const notify = async (owner: string, actor: string, kind: string, target: string, id = uid()) => { if (owner !== actor)
        await run('INSERT OR IGNORE INTO notifications(id,user_id,actor,kind,target,created) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM users WHERE id=? AND notifications=1)', id, owner, actor, kind, target, now(), owner); };
    const session = async (id: string) => { const t = uid() + uid(); await run('INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)', await digest(t), id, now() + 30 * day); return 'mellunest=' + t + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000'; };
    const mail = async (u: any, kind: string) => { if (!u.email)
        fail(400, 'This account has no email address. Email recovery is unavailable.'); if (!env.RESEND_API_KEY || !env.EMAIL_FROM || !env.APP_ORIGIN)
        fail(503, 'Email delivery is not configured yet. Continue with ChatGPT, or contact the site owner.'); const token = uid() + uid(); await run('INSERT INTO tokens(token,user_id,kind,expires) VALUES(?,?,?,?)', await digest(token), u.id, kind, now() + 3600000); const link = env.APP_ORIGIN + '/?auth=' + kind + '&token=' + token; const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: env.EMAIL_FROM, to: u.email, subject: kind === 'verify' ? 'Verify your Mellunest email' : 'Reset your Mellunest password', text: `Open this link within one hour: ${link}\nIf you did not request this, ignore this message.` }) }); if (!r.ok)
        fail(503, 'Email could not be sent. Please try again later.'); };
    try {
        if (method !== 'GET' && method !== 'HEAD' && p[0] !== 'cleanup') {
            if (req.headers.get('origin') !== url.origin)
                fail(403, 'Request origin was not accepted.');
            if (req.headers.get('sec-fetch-site') === 'cross-site')
                fail(403, 'Cross-site requests are not accepted.');
            if (req.body) {
                const maximum = p[0] === 'media' ? 31 * 1024 * 1024 : 16000;
                let bytes = 0;
                const limited = req.body.pipeThrough(new TransformStream({ transform(chunk, controller) { bytes += chunk.byteLength; if (bytes > maximum)
                        throw new Fault(413, 'Request is too large.'); controller.enqueue(chunk); } }));
                req = new Request(req.url, { method: req.method, headers: req.headers, signal: req.signal, body: limited, duplex: 'half' } as RequestInit);
            }
        }
        if (p[0] === 'health') {
            await one('SELECT 1 ready');
            return json({ ok: true, databaseReady: true, emailReady: !!(env.RESEND_API_KEY && env.EMAIL_FROM && env.APP_ORIGIN) });
        }
        if (p[0] === 'auth') {
            if (p[1] === 'me') {
                let u;
                try {
                    u = await user();
                }
                catch { }
                let renewal: Record<string, string> = {};
                if (u && cookie) {
                    const sess = await one('SELECT expires FROM sessions WHERE token=?', await digest(cookie));
                    if (sess && sess.expires < now() + 7 * day) {
                        await run('UPDATE sessions SET expires=? WHERE token=?', now() + 30 * day, await digest(cookie));
                        renewal = { 'Set-Cookie': 'mellunest=' + cookie + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000' };
                    }
                }
                return json({ user: u ? { id: u.id, username: u.username, name: u.name, bio: u.bio, website: u.website, avatar: u.avatar, email: u.email, verified: u.verified, notifications: u.notifications, messages: u.messages } : null, platform: false, emailReady: !!(env.RESEND_API_KEY && env.EMAIL_FROM && env.APP_ORIGIN) }, 200, renewal);
            }
            if (p[1] === 'available' && method === 'GET') {
                const v = username(url.searchParams.get('username'));
                return json({ available: !await one('SELECT 1 FROM users WHERE username=?', v) });
            }
            if (method !== 'POST')
                fail(405, 'Method not allowed.');
            await limit('auth:' + await digest(req.headers.get('cf-connecting-ip') || null || 'anonymous'), 20, 15 * 60000);
            const b: any = await req.json();
            if (p[1] === 'register' || p[1] === 'onboard') {
                const name = username(b.username), platform = p[1] === 'onboard' ? null : null;
                if (p[1] === 'onboard' && !platform)
                    fail(401, 'Sign in with ChatGPT first.');
                let email = platform ? null : '';
                if (platform && (!email || !/^\S+@\S+\.\S+$/.test(email)))
                    fail(400, 'Enter a valid email address.');
                email = (email || '').toLowerCase();
                const pass = platform && !b.password ? null : await hash(password(b.password), 12);
                if (pass && b.password !== b.confirm)
                    fail(400, 'Passwords do not match.');
                const id = uid();
                await run('INSERT INTO users(id,platform_id,username,email,password,name,created) VALUES(?,?,?,?,?,?,?)', id, platform, name, email, pass, str(b.name || name, 60), now());
                return json({ ok: true, message: 'Welcome to Mellunest.' }, 201, { 'Set-Cookie': await session(id) });
            }
            if (p[1] === 'login') {
                const name = username(b.username);
                await limit('login:' + name, 8, 15 * 60000);
                const u = await one('SELECT * FROM users WHERE username=?', name);
                const valid = await compare(typeof b.password === 'string' && b.password.length <= 72 ? b.password : '', u?.password || '$2b$12$z7uGkfoh1tyA/BXGbQB7yO8jIWcNcp7G4hDdVCX1eYMZZtUL3z6W6');
                if (!u || !valid)
                    fail(401, 'Username or password is incorrect.');
                if (u.email && !u.verified)
                    fail(403, 'Verify your email before signing in with a password.');
                return json({ ok: true }, 200, { 'Set-Cookie': await session(u.id) });
            }
            if (p[1] === 'logout') {
                if (cookie)
                    await run('DELETE FROM sessions WHERE token=?', await digest(cookie));
                return json({ ok: true }, 200, { 'Set-Cookie': 'mellunest=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0' });
            }
            if (p[1] === 'change-password') {
                const u = await user();
                await limit('change-password:' + u.id, 5, 15 * 60000);
                const nextPassword = password(b.newPassword);
                if (nextPassword !== b.confirmPassword)
                    fail(400, 'New passwords do not match.');
                if (typeof b.oldPassword !== 'string' || new TextEncoder().encode(b.oldPassword).length > 72 ||
                    !u.password || !await compare(b.oldPassword, u.password))
                    fail(400, 'Old password is incorrect.');
                const nextHash = await hash(nextPassword, 12);
                const changed = await one('UPDATE users SET password=? WHERE id=? AND password=? RETURNING id', nextHash, u.id, u.password);
                if (!changed)
                    fail(409, 'Password was changed in another request. Please try again.');
                await batch([
                    ['DELETE FROM sessions WHERE user_id=? AND token<>?', u.id, await digest(cookie || '')],
                    ['DELETE FROM tokens WHERE user_id=? AND kind=?', u.id, 'reset']
                ]);
                return json({ message: 'Password changed successfully. Other devices have been signed out.' });
            }
            if (p[1] === 'forgot') {
                if (!env.RESEND_API_KEY)
                    fail(503, 'Email recovery is awaiting email-service setup.');
                const email = str(b.email, 254).toLowerCase();
                await limit('recover:' + await digest(email), 3, 3600000);
                const u = await one('SELECT * FROM users WHERE email=?', email);
                if (u)
                    await mail(u, 'reset');
                return json({ message: 'If an account matches, a recovery email is on its way.' });
            }
            if (p[1] === 'verify' || p[1] === 'reset') {
                const key = await digest(str(b.token, 100));
                const kind = p[1] === 'verify' ? 'verify' : 'reset';
                const t = await one('SELECT * FROM tokens WHERE token=? AND kind=? AND expires>?', key, kind, now());
                if (!t)
                    fail(400, 'This link is invalid or has expired.');
                const pass = kind === 'reset' ? await hash(password(b.password), 12) : null;
                if (kind === 'reset' && b.password !== b.confirm)
                    fail(400, 'Passwords do not match.');
                const result = await one('DELETE FROM tokens WHERE token=? AND expires>? RETURNING user_id', key, now());
                if (!result)
                    fail(400, 'This link was already used.');
                await batch(kind === 'reset' ? [['UPDATE users SET password=?,verified=1 WHERE id=?', pass, t.user_id], ['DELETE FROM sessions WHERE user_id=?', t.user_id]] : [['UPDATE users SET verified=1 WHERE id=?', t.user_id]]);
                return json({ message: kind === 'verify' ? 'Email verified. You can sign in now.' : 'Password reset. Sign in with your new password.' });
            }
            if (p[1] === 'send-verification') {
                const u = await user();
                await limit('verify:' + u.id, 3, 3600000);
                await mail(u, 'verify');
                return json({ message: 'Verification email sent.' });
            }
            fail(404, 'Not found.');
        }
        if (p[0] === 'cleanup' && method === 'POST') {
            if (!env.CLEANUP_SECRET || req.headers.get('authorization') !== 'Bearer ' + env.CLEANUP_SECRET)
                fail(403, 'Not authorized.');
            const expired = await all('SELECT media_id FROM stories WHERE expires<=? LIMIT 100', now());
            for (const m of expired) {
                await env.BUCKET.delete(m.media_id);
                await run('DELETE FROM media WHERE id=?', m.media_id);
            }
            const orphan = await all("SELECT id FROM media WHERE post_id IS NULL AND created<? AND id NOT IN(SELECT media_id FROM stories) AND id NOT IN(SELECT avatar FROM users WHERE avatar IS NOT NULL) LIMIT 100", now() - day);
            for (const m of orphan) {
                await env.BUCKET.delete(m.id);
                await run('DELETE FROM media WHERE id=?', m.id);
            }
            await batch([['DELETE FROM sessions WHERE expires<?', now()], ['DELETE FROM tokens WHERE expires<?', now()], ['DELETE FROM rate WHERE expires<?', now()]]);
            return json({ removed: expired.length + orphan.length });
        }
        const u = await user();
        if (method !== 'GET')
            await limit('write:' + u.id, 100);
        if (p[0] === 'media') {
            if (method === 'POST') {
                await limit('upload:' + u.id, 30, 3600000);
                const max = 30 * 1024 * 1024;
                if (Number(req.headers.get('content-length')) > max + 10000)
                    fail(413, 'Maximum upload size is 30 MB.');
                const form = await req.formData(), file = form.get('file') as File, kind = form.get('kind');
                if (!file || typeof file.arrayBuffer !== 'function' || !['post', 'story', 'avatar'].includes(String(kind)))
                    fail(400, 'Choose a valid media file.');
                if (file.size > max || file.size < 1 || (kind === 'avatar' && file.size > 5 * 1024 * 1024))
                    fail(413, 'Use media up to 30 MB; profile images up to 5 MB.');
                const bytes = new Uint8Array(await file.arrayBuffer());
                let mime = '';
                if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
                    mime = 'image/jpeg';
                else if (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71)
                    mime = 'image/png';
                else if (new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP')
                    mime = 'image/webp';
                else if (new TextDecoder().decode(bytes.slice(4, 8)) === 'ftyp')
                    mime = 'video/mp4';
                else if (bytes[0] === 26 && bytes[1] === 69 && bytes[2] === 223 && bytes[3] === 163)
                    mime = 'video/webm';
                if (!mime || file.type !== mime || (kind === 'avatar' && !mime.startsWith('image/')))
                    fail(400, 'Use a valid JPEG, PNG, WebP, MP4 or WebM file.');
                const id = uid();
                await env.BUCKET.put(id, bytes, { httpMetadata: { contentType: mime } });
                try {
                    await run('INSERT INTO media(id,user_id,kind,mime,size,created) VALUES(?,?,?,?,?,?)', id, u.id, kind, mime, file.size, now());
                }
                catch (e) {
                    await env.BUCKET.delete(id);
                    throw e;
                }
                return json({ id, mime }, 201);
            }
            if (method === 'GET' && p[1]) {
                const m = await one('SELECT * FROM media WHERE id=?', p[1]);
                if (!m)
                    fail(404, 'Media not found.');
                if (await blocked(u.id, m.user_id))
                    fail(404, 'Media not found.');
                if (m.kind === 'story') {
                    const s = await one('SELECT * FROM stories WHERE media_id=?', m.id);
                    if (s && s.expires <= now())
                        fail(404, 'This story has expired.');
                    if (!s && m.user_id !== u.id)
                        fail(404, 'Media not found.');
                }
                else if (m.kind === 'post') {
                    if (m.post_id)
                        await canPost(m.post_id, u);
                    else if (m.user_id !== u.id)
                        fail(404, 'Media not found.');
                }
                else if (m.user_id !== u.id && !await one('SELECT 1 FROM users WHERE avatar=?', m.id))
                    fail(404, 'Media not found.');
                const obj = await env.BUCKET.get(m.id, { range: req.headers });
                if (!obj)
                    fail(404, 'Media not found.');
                const headers = new Headers({ 'Content-Type': m.mime, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Accept-Ranges': 'bytes' });
                if (req.headers.has('range') && obj.range && 'offset' in obj.range) {
                    headers.set('Content-Range', `bytes ${obj.range.offset}-${(obj.range.offset || 0) + (obj.range.length || obj.size) - 1}/${obj.size}`);
                    headers.set('Content-Length', String(obj.range.length));
                }
                else
                    headers.set('Content-Length', String(obj.size));
                return new Response(obj.body, { status: req.headers.has('range') && obj.range ? 206 : 200, headers });
            }
        }
        if (p[0] === 'posts') {
            if (method === 'GET') {
                const before = Number(url.searchParams.get('before')) || Number.MAX_SAFE_INTEGER;
                let where = "p.status='published'", args: any[] = [];
                const scope = url.searchParams.get('scope'), owner = url.searchParams.get('user');
                if (scope === 'drafts') {
                    where = "p.status='draft' AND p.user_id=?";
                    args.push(u.id);
                }
                else if (scope === 'saved') {
                    where += " AND EXISTS(SELECT 1 FROM saves WHERE post_id=p.id AND user_id=?)";
                    args.push(u.id);
                }
                else if (scope === 'following') {
                    where += ' AND (p.user_id=? OR EXISTS(SELECT 1 FROM follows WHERE user_id=? AND target=p.user_id))';
                    args.push(u.id, u.id);
                }
                if (owner) {
                    where += ' AND u.username=?';
                    args.push(owner.toLowerCase());
                }
                if (p[1]) {
                    where = 'p.id=? AND (p.status=\'published\' OR p.user_id=?)';
                    args = [p[1], u.id];
                }
                const rows = await all(`SELECT p.*,u.username,u.name,u.avatar,(SELECT count(*) FROM likes WHERE post_id=p.id) likes,(SELECT count(*) FROM comments WHERE post_id=p.id) comments,EXISTS(SELECT 1 FROM likes WHERE post_id=p.id AND user_id=?) liked,EXISTS(SELECT 1 FROM saves WHERE post_id=p.id AND user_id=?) saved FROM posts p JOIN users u ON u.id=p.user_id WHERE ${where} AND p.created<? AND NOT EXISTS(SELECT 1 FROM blocks b WHERE (b.user_id=? AND b.target=p.user_id) OR(b.target=? AND b.user_id=p.user_id)) ORDER BY p.created DESC,p.id DESC LIMIT 20`, u.id, u.id, ...args, before, u.id, u.id);
                const mediaRows = rows.length ? await all(
                    'SELECT id,mime,post_id FROM media WHERE post_id IN (' + rows.map(() => '?').join(',') + ') ORDER BY created,id',
                    ...rows.map(row => row.id)
                ) : [];
                const mediaByPost = new Map<string, any[]>();
                for (const item of mediaRows) {
                    const list = mediaByPost.get(item.post_id) || [];
                    list.push({ id: item.id, mime: item.mime });
                    mediaByPost.set(item.post_id, list);
                }
                for (const row of rows) row.media = mediaByPost.get(row.id) || [];
                return json({ items: rows, next: rows.length === 20 ? rows[rows.length - 1].created : null });
            }
            if (method === 'POST' && !p[1] || method === 'PATCH' && p[1]) {
                const b: any = await req.json(), caption = str(b.caption), status = b.status === 'draft' ? 'draft' : 'published', id = p[1] || uid();
                if (['user_id', 'userId', 'owner_id', 'ownerId'].some(key => b[key] !== undefined && b[key] !== u.id))
                    fail(403, 'You can only publish moments to your own account.');
                if (p[1]) {
                    const post = await canPost(id, u);
                    if (post.user_id !== u.id)
                        fail(403, 'Only the author can edit this post.');
                }
                const ids = Array.isArray(b.media) ? b.media.map((x: any) => str(x, 40)) : [];
                if (ids.length > 6 || new Set(ids).size !== ids.length)
                    fail(400, 'Choose up to six different files.');
                if (status === 'published' && !caption && !ids.length)
                    fail(400, 'Add a caption or media first.');
                for (const mid of ids)
                    if (!await one("SELECT 1 FROM media WHERE id=? AND user_id=? AND kind='post' AND (post_id IS NULL OR post_id=?)", mid, u.id, id))
                        fail(400, 'Invalid media selection.');
                const t = now();
                const q: [
                    string,
                    ...any[]
                ][] = [p[1] ? ['UPDATE posts SET caption=?,status=?,updated=? WHERE id=? AND user_id=?', caption, status, t, id, u.id] : ['INSERT INTO posts(id,user_id,caption,status,created,updated) VALUES(?,?,?,?,?,?)', id, u.id, caption, status, t, t], ['UPDATE media SET post_id=NULL WHERE post_id=? AND user_id=?', id, u.id]];
                for (const mid of ids)
                    q.push(['UPDATE media SET post_id=? WHERE id=? AND user_id=?', id, mid, u.id]);
                await batch(q);
                return json({ id }, p[1] ? 200 : 201);
            }
            if (method === 'DELETE' && p[1]) {
                const post = await canPost(p[1], u);
                if (post.user_id !== u.id)
                    fail(403, 'Only the author can delete this post.');
                const files = await all('SELECT id FROM media WHERE post_id=?', post.id);
                for (const f of files)
                    await env.BUCKET.delete(f.id);
                await batch([['DELETE FROM posts WHERE id=?', post.id], ['DELETE FROM notifications WHERE target=?', post.id]]);
                return json({ ok: true });
            }
        }
        if (['like', 'save'].includes(p[0]) && method === 'POST') {
            const post = await canPost(p[1], u);
            if (post.status !== 'published')
                fail(400, 'Publish the post first.');
            const table = p[0] === 'like' ? 'likes' : 'saves', b: any = await req.json();
            if (b.active)
                await run(`INSERT OR IGNORE INTO ${table}(user_id,post_id) VALUES(?,?)`, u.id, post.id);
            else
                await run(`DELETE FROM ${table} WHERE user_id=? AND post_id=?`, u.id, post.id);
            if (b.active && table === 'likes')
                await notify(post.user_id, u.id, 'like', post.id, 'like:' + post.id + ':' + u.id);
            return json({ ok: true });
        }
        if (p[0] === 'comments') {
            const post = await canPost(p[1], u);
            if (method === 'GET')
                return json({ items: await all('SELECT c.*,u.username,u.name,u.avatar FROM comments c JOIN users u ON u.id=c.user_id WHERE c.post_id=? AND c.created<? ORDER BY c.created DESC LIMIT 40', post.id, Number(url.searchParams.get('before')) || Number.MAX_SAFE_INTEGER) });
            if (method === 'POST') {
                const b: any = await req.json(), body = str(b.body, 1000);
                if (!body)
                    fail(400, 'Write a comment first.');
                if (post.status !== 'published')
                    fail(400, 'This post is not published.');
                const id = uid();
                await run('INSERT INTO comments(id,user_id,post_id,body,created) VALUES(?,?,?,?,?)', id, u.id, post.id, body, now());
                await notify(post.user_id, u.id, 'comment', post.id, id);
                return json({ id }, 201);
            }
            if (method === 'DELETE' && p[2]) {
                await run('DELETE FROM comments WHERE id=? AND post_id=? AND (user_id=? OR ?=?)', p[2], post.id, u.id, post.user_id, u.id);
                return json({ ok: true });
            }
        }
        if (p[0] === 'users') {
            if (method === 'GET') {
                let rows;
                if (p[1]) {
                    rows = await all(`SELECT ${pub},(SELECT count(*) FROM posts WHERE user_id=u.id AND status='published') posts,(SELECT count(*) FROM follows WHERE target=u.id) followers,(SELECT count(*) FROM follows WHERE user_id=u.id) following,EXISTS(SELECT 1 FROM follows WHERE user_id=? AND target=u.id) followed FROM users u WHERE username=?`, u.id, p[1].toLowerCase());
                    if (!rows[0] || await blocked(u.id, rows[0].id))
                        fail(404, 'Profile not found.');
                }
                else {
                    const search = str(url.searchParams.get('q') || '', 60);
                    rows = await all(`SELECT ${pub},EXISTS(SELECT 1 FROM follows WHERE user_id=? AND target=u.id) followed FROM users u WHERE (username LIKE ? OR name LIKE ?) AND u.id!=? AND NOT EXISTS(SELECT 1 FROM blocks b WHERE (b.user_id=? AND b.target=u.id) OR (b.target=? AND b.user_id=u.id)) ORDER BY u.created DESC LIMIT 30`, u.id, '%' + search + '%', '%' + search + '%', u.id, u.id, u.id);
                }
                return json({ items: rows });
            }
            if (method === 'PATCH' && !p[1]) {
                const b: any = await req.json();
                let website = str(b.website || '', 200);
                if (website && !/^https?:\/\//i.test(website))
                    fail(400, 'Website must start with https:// or http://.');
                if (b.avatar && !await one("SELECT 1 FROM media WHERE id=? AND user_id=? AND kind='avatar'", b.avatar, u.id))
                    fail(400, 'Invalid profile image.');
                await run('UPDATE users SET username=?,name=?,bio=?,website=?,avatar=?,notifications=?,messages=? WHERE id=?', username(b.username), str(b.name, 60), str(b.bio || '', 300), website, b.avatar || null, b.notifications === false ? 0 : 1, b.messages === false ? 0 : 1, u.id);
                return json({ ok: true });
            }
            if (method === 'DELETE' && !p[1]) {
                const b: any = await req.json();
                if (b.confirm !== u.username)
                    fail(400, 'Enter your username to confirm.');
                const files = await all('SELECT id FROM media WHERE user_id=?', u.id);
                for (const f of files)
                    await env.BUCKET.delete(f.id);
                await run('DELETE FROM users WHERE id=?', u.id);
                return json({ ok: true }, 200, { 'Set-Cookie': 'mellunest=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0' });
            }
        }
        if (p[0] === 'follow') {
            const target = await one('SELECT id FROM users WHERE id=?', p[1]);
            if (!target || target.id === u.id || await blocked(u.id, target.id))
                fail(400, 'Cannot follow this account.');
            if (method === 'POST') {
                const b: any = await req.json();
                if (b.active) {
                    await run('INSERT OR IGNORE INTO follows(user_id,target) VALUES(?,?)', u.id, target.id);
                    await notify(target.id, u.id, 'follow', u.username, 'follow:' + u.id + ':' + target.id);
                }
                else
                    await run('DELETE FROM follows WHERE user_id=? AND target=?', u.id, target.id);
                return json({ ok: true });
            }
        }
        if (p[0] === 'connections' && method === 'GET') {
            const direction = url.searchParams.get('type') === 'following';
            if (await blocked(u.id, p[1]))
                fail(404, 'Profile not found.');
            return json({ items: await all(`SELECT ${pub} FROM follows f JOIN users u ON u.id=f.${direction ? 'target' : 'user_id'} WHERE f.${direction ? 'user_id' : 'target'}=? LIMIT 100`, p[1]) });
        }
        if (p[0] === 'stories') {
            if (method === 'GET')
                return json({ items: await all('SELECT s.*,u.username,u.name,u.avatar,m.mime,EXISTS(SELECT 1 FROM views WHERE story_id=s.id AND user_id=?) viewed,(SELECT count(*) FROM views WHERE story_id=s.id) view_count FROM stories s JOIN users u ON u.id=s.user_id JOIN media m ON m.id=s.media_id WHERE s.expires>? AND NOT EXISTS(SELECT 1 FROM blocks b WHERE (b.user_id=? AND b.target=s.user_id) OR(b.target=? AND b.user_id=s.user_id)) ORDER BY s.created ASC LIMIT 100', u.id, now(), u.id, u.id) });
            if (method === 'POST' && !p[1]) {
                const b: any = await req.json();
                if (!await one("SELECT 1 FROM media WHERE id=? AND user_id=? AND kind='story' AND id NOT IN(SELECT media_id FROM stories)", b.media, u.id))
                    fail(400, 'Choose a new story upload.');
                const id = uid(), t = now();
                await run('INSERT INTO stories(id,user_id,media_id,created,expires) VALUES(?,?,?,?,?)', id, u.id, b.media, t, t + day);
                return json({ id }, 201);
            }
            const s = await one('SELECT * FROM stories WHERE id=? AND expires>?', p[1] || '', now());
            if (!s || await blocked(u.id, s.user_id))
                fail(404, 'Story expired or not found.');
            if (method === 'POST' && p[2] === 'view') {
                await run('INSERT OR IGNORE INTO views(story_id,user_id) VALUES(?,?)', s.id, u.id);
                return json({ ok: true });
            }
            if (method === 'DELETE') {
                if (s.user_id !== u.id)
                    fail(403, 'Only the author can delete this story.');
                await env.BUCKET.delete(s.media_id);
                await run('DELETE FROM media WHERE id=?', s.media_id);
                return json({ ok: true });
            }
        }
        if (p[0] === 'conversations') {
            if (method === 'GET')
                return json({ items: await all(`SELECT c.id conversation_id,c.created,${pub},(SELECT body FROM messages WHERE conversation_id=c.id ORDER BY created DESC,id DESC LIMIT 1) preview,(SELECT MAX(created) FROM messages WHERE conversation_id=c.id) recent,(SELECT count(*) FROM messages WHERE conversation_id=c.id AND sender!=? AND read=0) unread FROM conversations c JOIN users u ON u.id=CASE WHEN c.a=? THEN c.b ELSE c.a END WHERE (c.a=? OR c.b=?) AND NOT EXISTS(SELECT 1 FROM blocks b WHERE(b.user_id=? AND b.target=u.id) OR(b.target=? AND b.user_id=u.id)) ORDER BY COALESCE(recent,c.created) DESC LIMIT 100`, u.id, u.id, u.id, u.id, u.id, u.id) });
            if (method === 'POST') {
                const b: any = await req.json(), target = str(b.target, 40);
                if (target === u.id || !await one('SELECT 1 FROM users WHERE id=? AND messages=1', target) || await blocked(u.id, target))
                    fail(403, 'This account is not accepting messages.');
                const [a, z] = [u.id, target].sort();
                await run('INSERT OR IGNORE INTO conversations(id,a,b,created) VALUES(?,?,?,?)', uid(), a, z, now());
                return json(await one('SELECT id FROM conversations WHERE a=? AND b=?', a, z));
            }
        }
        if (p[0] === 'messages') {
            const c = await conversation(p[1], u);
            if (method === 'GET')
                return json({ items: await all('SELECT * FROM messages WHERE conversation_id=? AND created<? ORDER BY created DESC,id DESC LIMIT 50', c.id, Number(url.searchParams.get('before')) || Number.MAX_SAFE_INTEGER) });
            if (method === 'POST') {
                const b: any = await req.json();
                if (b.read) {
                    await run('UPDATE messages SET read=1 WHERE conversation_id=? AND sender!=? AND read=0', c.id, u.id);
                    return json({ ok: true });
                }
                await limit('message:' + u.id, 30);
                const body = str(b.body, 2000), id = str(b.id, 40);
                if (!body || !/^[a-f0-9-]{36}$/.test(id))
                    fail(400, 'Write a message first.');
                const existing = await one('SELECT * FROM messages WHERE id=?', id);
                if (existing && (existing.sender !== u.id || existing.conversation_id !== c.id))
                    fail(409, 'Message identifier already used.');
                const recipient = c.a === u.id ? c.b : c.a;
                if (!await one('SELECT 1 FROM users WHERE id=? AND messages=1', recipient))
                    fail(403, 'This account is not accepting messages.');
                const t = now();
                await batch([
                    ['INSERT OR IGNORE INTO messages(id,conversation_id,sender,body,created) VALUES(?,?,?,?,?)', id, c.id, u.id, body, t],
                    ['INSERT OR IGNORE INTO notifications(id,user_id,actor,kind,target,created) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM users WHERE id=? AND notifications=1)', id, recipient, u.id, 'message', c.id, t, recipient]
                ]);
                return json({ id, item: existing || { id, conversation_id: c.id, sender: u.id, body, created: t, read: 0 } }, 201);
            }
        }
        if (p[0] === 'notifications') {
            if (method === 'GET')
                return json({ items: await all('SELECT n.*,u.username,u.name,u.avatar FROM notifications n JOIN users u ON u.id=n.actor WHERE n.user_id=? ORDER BY n.created DESC LIMIT 100', u.id) });
            if (method === 'POST') {
                await run('UPDATE notifications SET read=1 WHERE user_id=?', u.id);
                return json({ ok: true });
            }
        }
        if (p[0] === 'blocks') {
            if (method === 'GET')
                return json({ items: await all(`SELECT ${pub} FROM blocks b JOIN users u ON u.id=b.target WHERE b.user_id=?`, u.id) });
            if (method === 'POST') {
                const b: any = await req.json(), target = str(b.target, 40);
                if (target === u.id)
                    fail(400, 'Cannot block yourself.');
                if (b.active)
                    await batch([['INSERT OR IGNORE INTO blocks(user_id,target) VALUES(?,?)', u.id, target], ['DELETE FROM follows WHERE(user_id=? AND target=?) OR(user_id=? AND target=?)', u.id, target, target, u.id]]);
                else
                    await run('DELETE FROM blocks WHERE user_id=? AND target=?', u.id, target);
                return json({ ok: true });
            }
        }
        if (p[0] === 'events' && method === 'GET') {
            let stopped = false;
            const encoder = new TextEncoder();
            const stream = new ReadableStream({ async start(controller) { let last = '', count = 0; const abort = () => { stopped = true; }; req.signal.addEventListener('abort', abort); try {
                    while (!stopped && count++ < 20) {
                        const c = await all('SELECT c.id,COUNT(m.id) total,MAX(m.created) latest,SUM(m.read) reads FROM conversations c LEFT JOIN messages m ON m.conversation_id=c.id WHERE c.a=? OR c.b=? GROUP BY c.id', u.id, u.id);
                        const n = await one('SELECT count(*) total,SUM(read) reads FROM notifications WHERE user_id=?', u.id);
                        const signature = JSON.stringify({ c, n });
                        if (signature !== last) {
                            controller.enqueue(encoder.encode('data: ' + JSON.stringify({ refresh: true }) + '\n\n'));
                            last = signature;
                        }
                        else
                            controller.enqueue(encoder.encode(': heartbeat\n\n'));
                        await new Promise(r => setTimeout(r, 3000));
                    }
                    if (!stopped)
                        controller.close();
                }
                catch {
                    try {
                        controller.close();
                    }
                    catch { }
                }
                finally {
                    req.signal.removeEventListener('abort', abort);
                } }, cancel() { stopped = true; } });
            return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' } });
        }
        return json({ error: 'Not found.' }, 404);
    }
    catch (e: any) {
        if (e instanceof Fault)
            return json({ error: e.message }, e.status);
        if (String(e.message).includes('UNIQUE constraint'))
            return json({ error: 'That username or email is already in use.' }, 409);
        if (e instanceof SyntaxError)
            return json({ error: 'Invalid request.' }, 400);
        console.error('API failure', e?.name);
        return json({ error: 'Something went wrong. Please try again.' }, 500);
    }
}
