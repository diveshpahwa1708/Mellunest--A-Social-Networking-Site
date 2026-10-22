import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
process.chdir(root);
const [major,minor]=process.versions.node.split('.').map(Number);
if(major<22||(major===22&&minor<13)){
 console.error('Mellunest needs Node.js 22.13+ (Node.js 24 recommended). Install Node.js, reopen VS Code, then run npm start.');process.exit(1);
}
let active;
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{active?.kill(signal);process.exit(0)});
async function run(command,args,extra={}){
 await new Promise((ok,fail)=>{
  active=spawn(command,args,{cwd:root,stdio:'inherit',env:{...process.env,WRANGLER_SEND_METRICS:'false',CLOUDFLARE_CF_FETCH_ENABLED:'false',...extra}});
  active.once('error',fail);active.once('exit',(code,signal)=>code===0?ok():fail(new Error(`${command} exited with ${signal||code}`)));
 });
}
try{
 const fingerprint=createHash('sha256');
 for(const f of ['package.json','pnpm-lock.yaml','pnpm-workspace.yaml'])fingerprint.update(await readFile(f));
 const expected=fingerprint.digest('hex');
 const stamp='.local/dependencies.sha256';
 let installed=false;
 try{installed=(await readFile(stamp,'utf8'))===expected;await access('node_modules/vinext/dist/cli.js');await access('node_modules/wrangler/bin/wrangler.js')}catch{installed=false}
 if(!installed){
  console.log('\n[1/3] Installing pinned dependencies (first run needs internet)...');
  const npmCli=process.env.npm_execpath;
  if(!npmCli)throw new Error('Please launch this project with npm start.');
  await run(process.execPath,[npmCli,'exec','--yes','--package=pnpm@11.25.0','--','pnpm','install','--frozen-lockfile'],{CI:'true'});
  await mkdir('.local',{recursive:true});await writeFile(stamp,expected);
 }else console.log('\n[1/3] Dependencies are ready.');
 console.log('\n[2/3] Applying pending LOCAL database migrations...');
 await run(process.execPath,[resolve('node_modules/wrangler/bin/wrangler.js'),'d1','migrations','apply','DB','--local','--config','wrangler.jsonc'],{CI:'true'});
 console.log('\n[3/3] Starting Mellunest at http://localhost:5173\nKeep this terminal open. Stop with Ctrl+C.\n');
 await run(process.execPath,[resolve('node_modules/vinext/dist/cli.js'),'dev','--port','5173']);
}catch(error){console.error('\nStartup stopped:',error.message,'\nFix the error above and run npm start again. Your local data is preserved.');process.exitCode=1}
