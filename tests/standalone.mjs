import {createRequire} from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const wranglerRequire=createRequire(require.resolve('wrangler/package.json'));
const {Miniflare}=wranglerRequire('miniflare');
const modules=[{type:'ESModule',path:process.cwd()+'/dist/server/index.js'},...fs.readdirSync('dist/server',{recursive:true}).filter(p=>p.endsWith('.js')&&p!=='index.js').map(p=>({type:'ESModule',path:process.cwd()+'/dist/server/'+p}))];
const mf=new Miniflare({modules,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET'],cf:false});
let checks=0;
async function call(path,method='GET',body,cookie,extra={}){
 const r=await mf.dispatchFetch('https://mellunest.test/api/'+path,{method,headers:{Origin:'https://mellunest.test','Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...extra},body:body?JSON.stringify(body):undefined});
 return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
}
function eq(a,b){assert.equal(a,b);checks++}
try {
 const db=await mf.getD1Database('DB');
 for(const file of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())for(const sql of fs.readFileSync('drizzle/'+file,'utf8').split('--> statement-breakpoint').filter(s=>s.trim()))await db.prepare(sql).run();
 eq((await call('health')).data.databaseReady,true);
 const a=await call('auth/register','POST',{name:'Demo',username:'demo_user',password:'demopass1',confirm:'demopass1'});eq(a.status,201);
 eq((await call('auth/me','GET',undefined,a.cookie)).data.user.username,'demo_user');
 eq((await call('auth/register','POST',{username:'other_user',password:'demopass2',confirm:'demopass2'})).status,201);
 eq((await call('posts','POST',{caption:'Demo moment',status:'published',media:[]},a.cookie)).status,201);
 eq((await call('posts')).status,401);
 eq((await call('auth/me','GET',undefined,undefined,{'oai-authenticated-user-id':'forged'})).data.user,null);
 eq((await call('auth/register','POST',{username:'short_user',password:'abc1234',confirm:'abc1234'})).status,400);
 await call('auth/logout','POST',{},a.cookie);
 eq((await call('auth/me','GET',undefined,a.cookie)).data.user,null);
 eq((await call('auth/login','POST',{username:'demo_user',password:'demopass1'})).status,200);
 console.log(`${checks} standalone checks passed`);
} finally {await mf.dispose()}
