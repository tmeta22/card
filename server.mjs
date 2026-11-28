import {createServer} from 'node:http';
import {createHmac,createHash,timingSafeEqual,randomBytes,scryptSync} from 'node:crypto';
import {openStore} from './store.mjs';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname,sep} from 'node:path';

const root=fileURLToPath(new URL('./docs/',import.meta.url));
const categories=['Coffee','Fitness','Entertainment','Other'];
function reject(message,status=400){throw Object.assign(new Error(message),{status})}
function token(){return randomBytes(7).toString('hex').toUpperCase()}
function field(body,key,max=60){const value=body[key];if(typeof value!=='string'||!value.trim()||value.length>max)reject('Invalid '+key+'.');return value.trim()}

export function telegramUser(raw,botToken){
 if(!botToken)reject('The Telegram bot has not been configured on this server.',503);
 const params=new URLSearchParams(raw),hash=params.get('hash')||'';params.delete('hash');
 const check=[...params].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>k+'='+v).join('\n');
 const secret=createHmac('sha256','WebAppData').update(botToken).digest();
 const expected=createHmac('sha256',secret).update(check).digest();
 const age=Date.now()/1000-Number(params.get('auth_date'));
 if(!/^[a-f0-9]{64}$/.test(hash)||!timingSafeEqual(expected,Buffer.from(hash,'hex'))||!Number.isFinite(age)||age< -60||age>86400)reject('Reopen the wallet from Telegram to sign in.',401);
 const user=JSON.parse(params.get('user'));if(!Number.isSafeInteger(user?.id))reject('Telegram identity missing.',401);return String(user.id);
}
export async function database(target){
 const db=await openStore(target);
 for(const {id} of await db.all('SELECT customer AS id FROM cards UNION SELECT owner FROM shops UNION SELECT customer FROM events UNION SELECT customer FROM languages')){const t=(await db.get('SELECT MIN(at) AS t FROM events WHERE customer=?',id)).t||Date.now();await db.run('INSERT INTO users(id,pub,created,seen) VALUES(?,?,?,?) ON CONFLICT DO NOTHING',id,token().slice(0,8),t,t)}
 return db;
}
export async function wallet(db,user){
 return {cards:await db.all(`SELECT c.member,c.code,c.number,c.stamps,c.code IS NULL AS manual,coalesce(s.name,c.name) AS name,coalesce(s.category,c.category) AS category,s.target,s.reward FROM cards c LEFT JOIN shops s ON s.code=c.code WHERE c.customer=? ORDER BY c.created DESC,c.member DESC`,user),
 shops:await db.all('SELECT code,name,category,target,reward,(SELECT COUNT(*) FROM cards WHERE cards.code=shops.code) AS members,(SELECT COUNT(*) FROM cards WHERE cards.code=shops.code AND stamps>=shops.target) AS ready,(SELECT COALESCE(SUM(stamps),0) FROM cards WHERE cards.code=shops.code) AS stamps FROM shops WHERE owner=? ORDER BY created DESC,code DESC',user),
 events:await db.all('SELECT name,category,label,delta,at FROM events WHERE customer=? ORDER BY id DESC LIMIT 100',user)};
}
export async function preview(db,code){const shop=await db.get('SELECT name,category,target,reward FROM shops WHERE code=?',String(code||'').toUpperCase());if(!shop)reject('Shop code not found.',404);return shop}
export async function lookup(db,owner,shop,member){
 const card=await db.get('SELECT c.member,c.stamps,s.target,s.reward,s.name,s.category FROM cards c JOIN shops s ON s.code=c.code WHERE c.member=? AND s.code=? AND s.owner=?',String(member||'').toUpperCase(),String(shop||''),owner);
 if(!card)reject('Member not found in your program.',404);return card;
}
export async function change(root,user,op,b){
 const request=field(b,'requestId',64);let out=null;
 await root.tx(async db=>{
 if(await db.get('SELECT 1 FROM requests WHERE customer=? AND request=?',user,request))return;
 const event=(customer,card,label,delta)=>db.run('INSERT INTO events(customer,name,category,label,delta,at) VALUES(?,?,?,?,?,?)',customer,card.name,card.category,label,delta,Date.now());
 if(op==='create'||op==='manual'){
 const name=field(b,'name'),category=field(b,'category');if(!categories.includes(category))reject('Choose a category.');
 if(op==='create'){const target=Number(b.target);if(!Number.isInteger(target)||target<2||target>50)reject('Choose 2 to 50 stamps.');await db.run('INSERT INTO shops(code,owner,name,category,target,reward,created) VALUES(?,?,?,?,?,?,?)',token(),user,name,category,target,field(b,'reward'),Date.now());out={kind:op,customer:user,owner:user,name}}
 else{await db.run('INSERT INTO cards(member,customer,name,category,number,created) VALUES(?,?,?,?,?,?)',token(),user,name,category,field(b,'number',64),Date.now());await event(user,{name,category},'Membership saved','New card');out={kind:op,customer:user,owner:user,name}}
 }else if(op==='join'){
 const shop=await db.get('SELECT * FROM shops WHERE code=?',field(b,'code').toUpperCase());if(!shop)reject('Shop code not found.',404);
 if(await db.get('SELECT 1 FROM cards WHERE customer=? AND code=?',user,shop.code))reject('This program is already in your wallet.',409);
 await db.run('INSERT INTO cards(member,customer,code,created) VALUES(?,?,?,?)',token(),user,shop.code,Date.now());await event(user,shop,'Program joined','New card');
 out={kind:'join',customer:user,owner:shop.owner,name:shop.name,members:(await db.get('SELECT COUNT(*) AS n FROM cards WHERE code=?',shop.code)).n};
 }else if(op==='redeem'||op==='stamp'){
 const card=await db.get('SELECT c.member,c.customer,c.stamps,s.target,s.name,s.category,s.reward FROM cards c JOIN shops s ON s.code=c.code WHERE c.member=? AND s.code=? AND s.owner=?'+db.lock,field(b,'member').toUpperCase(),field(b,'shop'),user);if(!card)reject('Member not found in your program.',404);
 const redeem=op==='redeem';if(redeem&&card.stamps<card.target)reject('More stamps are needed.');if(!redeem&&card.stamps>=card.target)reject('Redeem the current reward first.');
 await db.run('UPDATE cards SET stamps=? WHERE member=?',redeem?0:card.stamps+1,card.member);await event(card.customer,card,redeem?'Reward redeemed':'Stamp earned',redeem?'Redeemed':'+1 stamp');
 out={kind:op,customer:card.customer,owner:user,name:card.name,reward:card.reward,stamps:redeem?0:card.stamps+1,target:card.target};
 }else reject('Unknown action.',404);
 await db.run('INSERT INTO requests VALUES(?,?)',user,request);
 });
 return out;
}

const stripCode=v=>String(v||'').toUpperCase().replace(/[^A-F0-9]/g,'');
const derive=(secret,salt)=>scryptSync(secret,salt,32);
export async function touch(db,id){
 const now=Date.now(),row=await db.get('SELECT seen FROM users WHERE id=?',id);
 if(!row){await db.run('INSERT INTO users(id,pub,created,seen) VALUES(?,?,?,?) ON CONFLICT DO NOTHING',id,token().slice(0,8),now,now);return}
 if(now-row.seen>60000)await db.run('UPDATE users SET seen=? WHERE id=?',now,id);
}
export async function account(db,id){const u=await db.get('SELECT pub,hash FROM users WHERE id=?',id);return {id:u.pub,recovery:!!u.hash}}
export async function issueRecovery(db,id){
 await touch(db,id);const secret=randomBytes(10).toString('hex').toUpperCase(),salt=randomBytes(16).toString('hex'),pub=(await db.get('SELECT pub FROM users WHERE id=?',id)).pub;
 await db.run('UPDATE users SET salt=?,hash=? WHERE id=?',salt,derive(secret,salt).toString('hex'),id);
 return (pub+secret).match(/.{1,4}/g).join('-');
}
export async function recover(db,id,code){
 await touch(db,id);
 await db.run('DELETE FROM recover_attempts WHERE at<?',Date.now()-3600000);
 if((await db.get('SELECT COUNT(*) AS n FROM recover_attempts WHERE who=?',id)).n>=8)reject('Too many attempts. Try again in an hour.',429);
 await db.run('INSERT INTO recover_attempts(who,at) VALUES(?,?)',id,Date.now());
 const clean=stripCode(code),old=clean.length===28?await db.get('SELECT * FROM users WHERE pub=?',clean.slice(0,8)):null;
 const good=old?.hash&&timingSafeEqual(derive(clean.slice(8),old.salt),Buffer.from(old.hash,'hex'));
 if(!good)reject('Recovery code not valid.',401);if(old.id===id)reject('This is already your account.',409);
 await db.tx(async t=>{
  await t.run('DELETE FROM cards WHERE customer=? AND code IS NOT NULL AND code IN (SELECT code FROM cards WHERE customer=?)',old.id,id);
  await t.run('UPDATE cards SET customer=? WHERE customer=?',id,old.id);await t.run('UPDATE shops SET owner=? WHERE owner=?',id,old.id);await t.run('UPDATE events SET customer=? WHERE customer=?',id,old.id);
  await t.run('INSERT INTO languages(customer,lang) SELECT CAST(? AS TEXT),lang FROM languages WHERE customer=? ON CONFLICT DO NOTHING',id,old.id);await t.run('DELETE FROM languages WHERE customer=?',old.id);await t.run('DELETE FROM requests WHERE customer=?',old.id);
  await t.run('UPDATE users SET hash=NULL,salt=NULL,merged_into=? WHERE id=?',id,old.id);
 });
 return issueRecovery(db,id);
}
export async function adminStats(db){
 const now=Date.now(),day=864e5,n=async(q,...a)=>(await db.get(q,...a)).n,live='merged_into IS NULL',since=d=>now-d*day;
 const series=async(q)=>{const m=new Map();for(const {t} of await db.all(q,since(30))){const d=new Date(t).toISOString().slice(0,10);m.set(d,(m.get(d)||0)+1)}return Array.from({length:30},(_,i)=>{const d=new Date(now-(29-i)*day).toISOString().slice(0,10);return {d,n:m.get(d)||0}})};
 const [total,new1,new7,new30,active1,active7,active30,withRecovery,recovered,owners,programs,program,manual,stamps,stampEvents,redemptions,signups,stampSeries,recent,top]=await Promise.all([
  n(`SELECT COUNT(*) AS n FROM users WHERE ${live}`),n(`SELECT COUNT(*) AS n FROM users WHERE ${live} AND created>=?`,since(1)),n(`SELECT COUNT(*) AS n FROM users WHERE ${live} AND created>=?`,since(7)),n(`SELECT COUNT(*) AS n FROM users WHERE ${live} AND created>=?`,since(30)),
  n(`SELECT COUNT(*) AS n FROM users WHERE ${live} AND seen>=?`,since(1)),n(`SELECT COUNT(*) AS n FROM users WHERE ${live} AND seen>=?`,since(7)),n(`SELECT COUNT(*) AS n FROM users WHERE ${live} AND seen>=?`,since(30)),
  n(`SELECT COUNT(*) AS n FROM users WHERE ${live} AND hash IS NOT NULL`),n('SELECT COUNT(*) AS n FROM users WHERE merged_into IS NOT NULL'),
  n('SELECT COUNT(DISTINCT owner) AS n FROM shops'),n('SELECT COUNT(*) AS n FROM shops'),n('SELECT COUNT(*) AS n FROM cards WHERE code IS NOT NULL'),n('SELECT COUNT(*) AS n FROM cards WHERE code IS NULL'),n('SELECT COALESCE(SUM(stamps),0) AS n FROM cards'),
  n("SELECT COUNT(*) AS n FROM events WHERE delta='+1 stamp'"),n("SELECT COUNT(*) AS n FROM events WHERE delta='Redeemed'"),
  series(`SELECT created AS t FROM users WHERE ${live} AND created>=?`),series("SELECT at AS t FROM events WHERE delta='+1 stamp' AND at>=?"),
  db.all(`SELECT u.pub,u.id,u.created,u.seen,(SELECT COUNT(*) FROM cards WHERE customer=u.id) AS cards,(SELECT COUNT(*) FROM shops WHERE owner=u.id) AS shops FROM users u WHERE ${live} ORDER BY u.created DESC LIMIT 25`),
  db.all('SELECT s.name,s.category,COUNT(c.member) AS members FROM shops s LEFT JOIN cards c ON c.code=s.code GROUP BY s.code,s.name,s.category ORDER BY members DESC LIMIT 10')]);
 return {users:{total,new1,new7,new30,active1,active7,active30,withRecovery,recovered},shops:{owners,programs},cards:{program,manual,stamps,stampEvents,redemptions},signups,stamps:stampSeries,
  recent:recent.map(r=>({id:r.pub,tg:'••••'+r.id.slice(-3),created:r.created,seen:r.seen,cards:r.cards,shops:r.shops})),top};
}
const attempts=new Map();
function adminKey(){return createHash('sha256').update('admin:'+(process.env.ADMIN_SECRET||process.env.ADMIN_PASSWORD||'')).digest()}
function adminCookie(req){const m=(req.headers.cookie||'').match(/(?:^|; )cy_admin=([\w.-]+)/);if(!m)return false;const [exp,sig]=m[1].split('.');if(!(Number(exp)>Date.now()))return false;const want=createHmac('sha256',adminKey()).update(exp).digest('base64url');return want.length===sig?.length&&timingSafeEqual(Buffer.from(want),Buffer.from(sig))}
function adminLogin(req,password){
 if(!process.env.ADMIN_PASSWORD||process.env.ADMIN_PASSWORD.length<12)reject('Admin portal is not configured.',503);
 const ip=String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'').split(',')[0].trim(),hit=(attempts.get(ip)||[]).filter(t=>t>Date.now()-9e5);
 if(hit.length>=8)reject('Too many attempts. Try again later.',429);attempts.set(ip,[...hit,Date.now()]);
 const a=createHash('sha256').update(String(password)).digest(),b=createHash('sha256').update(process.env.ADMIN_PASSWORD).digest();
 if(!timingSafeEqual(a,b))reject('Wrong password.',401);attempts.delete(ip);
 const exp=String(Date.now()+12*3600000);return 'cy_admin='+exp+'.'+createHmac('sha256',adminKey()).update(exp).digest('base64url')+'; HttpOnly; SameSite=Strict; Path=/admin; Max-Age=43200'+(process.env.APP_URL?.startsWith('https')?'; Secure':'');
}
async function body(req){let text='';for await(const part of req){text+=part;if(text.length>32768)reject('Request too large.',413)}try{return JSON.parse(text)}catch{reject('Invalid JSON.')}}
// ---------- live updates and notifications ----------
const kh=v=>String(v).replace(/\d/g,d=>'០១២៣៤៥៦៧៨៩'[d]);
export function notice(out,lang){
 const km=lang!=='en',n=v=>km?kh(v):String(v);
 if(out.kind==='stamp')return out.stamps>=out.target
  ?(km?'🎁 រង្វាន់របស់អ្នកនៅ '+out.name+' រួចរាល់ហើយ៖ '+out.reward+'។ បង្ហាញកាតនៅបញ្ជរ។':'🎁 Your reward at '+out.name+' is ready: '+out.reward+'. Show your card at the counter.')
  :(km?'⭐ +១ ត្រា នៅ '+out.name+' — '+n(out.stamps)+'/'+n(out.target)+'។ នៅសល់ '+n(out.target-out.stamps)+' ទៀតដើម្បីទទួលរង្វាន់។':'⭐ +1 stamp at '+out.name+' — '+out.stamps+'/'+out.target+'. '+(out.target-out.stamps)+' more for your reward.');
 if(out.kind==='redeem')return km?'🎉 បានប្ដូររង្វាន់នៅ '+out.name+'។ សូមរីករាយ! កាតថ្មីបានចាប់ផ្ដើមហើយ។':'🎉 Reward redeemed at '+out.name+'. Enjoy! A fresh card has started.';
 if(out.kind==='join')return km?'👋 សមាជិកថ្មីបានចូលរួម '+out.name+' — សរុប '+n(out.members)+' នាក់។':'👋 New member joined '+out.name+' — '+out.members+' in total.';
 return null;
}
const streams=new Map();
export function publish(user,payload){for(const res of streams.get(user)||[])res.write('data: '+JSON.stringify(payload)+'\n\n')}
function subscribe(user,req,res){
 res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write('retry: 4000\n\n');
 const set=streams.get(user)||new Set();set.add(res);streams.set(user,set);
 const beat=setInterval(()=>res.write(': ping\n\n'),25000);
 req.on('close',()=>{clearInterval(beat);set.delete(res);if(!set.size)streams.delete(user)});
}
async function announce(db,out){
 if(!out)return;
 const targets=out.kind==='join'?[[out.customer,false],[out.owner,true]]:out.kind==='stamp'||out.kind==='redeem'?[[out.customer,true],[out.owner,false]]:[[out.customer,false]];
 for(const [user,message] of targets){
  publish(user,{type:out.kind,name:out.name,stamps:out.stamps,target:out.target,mine:user===out.customer});
  if(!message||!process.env.BOT_TOKEN||user===out.owner&&out.kind!=='join')continue;
  const pref=await db.get('SELECT lang,muted FROM languages WHERE customer=?',user);if(pref?.muted)continue;
  const text=notice(out,pref?.lang);if(!text)continue;
  const button=process.env.APP_URL?{reply_markup:{inline_keyboard:[[{text:pref?.lang==='en'?'Open wallet':'បើកកាបូបកាត',web_app:{url:new URL('wallet/',process.env.APP_URL).href}}]]}}:{};
  telegram('sendMessage',{chat_id:user,text,...button}).catch(()=>{});
 }
}
// Signed session for the installed web app outside Telegram (Telegram Login Widget).
const sessionKey=()=>createHash('sha256').update('session:'+(process.env.SESSION_SECRET||process.env.BOT_TOKEN||'')).digest();
export function issueSession(user,days=30){const body=Buffer.from(user+'.'+(Date.now()+days*864e5)).toString('base64url');return body+'.'+createHmac('sha256',sessionKey()).update(body).digest('base64url')}
export function sessionUser(tokenValue){
 const [body,sig]=String(tokenValue||'').split('.');if(!body||!sig)reject('Please sign in again.',401);
 const want=createHmac('sha256',sessionKey()).update(body).digest('base64url');if(want.length!==sig.length||!timingSafeEqual(Buffer.from(want),Buffer.from(sig)))reject('Please sign in again.',401);
 const [user,exp]=Buffer.from(body,'base64url').toString().split('.');if(!(Number(exp)>Date.now())||!/^\d+$/.test(user))reject('Please sign in again.',401);return user;
}
export function widgetUser(data,botToken){
 if(!botToken)reject('The Telegram bot has not been configured on this server.',503);
 const fields=Object.entries(data||{}).filter(([k,v])=>k!=='hash'&&v!==undefined&&v!==null).map(([k,v])=>k+'='+v).sort().join('\n');
 const want=createHmac('sha256',createHash('sha256').update(botToken).digest()).update(fields).digest('hex'),hash=String(data?.hash||'');
 const age=Date.now()/1000-Number(data?.auth_date);
 if(!/^[a-f0-9]{64}$/.test(hash)||!timingSafeEqual(Buffer.from(want,'hex'),Buffer.from(hash,'hex'))||!(age<86400&&age>-60)||!Number.isSafeInteger(Number(data.id)))reject('Telegram sign-in could not be verified.',401);
 return String(data.id);
}
function authenticate(req){
 const raw=req.headers.authorization||'';
 if(raw.startsWith('tma '))return telegramUser(raw.slice(4),process.env.BOT_TOKEN);
 if(raw.startsWith('Bearer '))return sessionUser(raw.slice(7));
 reject('Open this wallet in Telegram.',401);
}
async function telegram(method,data){const response=await fetch('https://api.telegram.org/bot'+process.env.BOT_TOKEN+'/'+method,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});if(!response.ok)reject('Telegram request failed.',502)}
export function app(db){return createServer(async(req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 const json=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data))};
 try{
 if(path==='/healthz'){await db.get('SELECT 1 AS ok');return json({ok:true})}
 if(path==='/telegram'&&req.method==='POST'){
 if(!process.env.WEBHOOK_SECRET||req.headers['x-telegram-bot-api-secret-token']!==process.env.WEBHOOK_SECRET)reject('Unauthorized.',403);
 const msg=(await body(req)).message;if(msg?.chat.type==='private'&&msg.from.id===msg.chat.id){
 const user=String(msg.from.id);await touch(db,user);const command=(msg.text||'').split(' ')[0].toLowerCase();
 if(command==='/mute'||command==='/unmute')await db.run('INSERT INTO languages(customer,lang,muted) VALUES(?,?,?) ON CONFLICT(customer) DO UPDATE SET muted=excluded.muted',user,'km',command==='/mute'?1:0);
 if(command==='/english'||command==='/khmer')await db.run('INSERT INTO languages(customer,lang) VALUES(?,?) ON CONFLICT(customer) DO UPDATE SET lang=excluded.lang',user,command==='/english'?'en':'km');
 const joinCode=command==='/start'&&/^[A-F0-9]{14}$/i.test((msg.text||'').split(' ')[1]||'')?(msg.text.split(' ')[1]).toUpperCase():'';
 const khmer=(await db.get('SELECT lang FROM languages WHERE customer=?',user))?.lang!=='en';
 const cards=(await wallet(db,user)).cards, digits=v=>khmer?String(v).replace(/\d/g,d=>'០១២៣៤៥៦៧៨៩'[d]):String(v);
 const summary=cards.slice(0,25).map(c=>c.name+' · '+(c.manual?c.number:digits(c.stamps)+'/'+digits(c.target)+(khmer?' ត្រា':' stamps'))).join('\n');
 const welcome=khmer?'សូមស្វាគមន៍មកកាន់ CardYeung។ បើកកាបូបកាត ដើម្បីចូលរួមកម្មវិធីរបស់ហាង ឬបង្កើតកម្មវិធីសន្សំត្រាផ្ទាល់ខ្លួន។':'Welcome to CardYeung. Open your wallet to join a shop or create a loyalty program.';
 await telegram('sendMessage',{chat_id:msg.chat.id,text:(command==='/mute'?(khmer?'🔕 បានបិទការជូនដំណឹង។ /unmute ដើម្បីបើកវិញ។':'🔕 Notifications off. /unmute to turn them back on.')+'\n\n':command==='/unmute'?(khmer?'🔔 បានបើកការជូនដំណឹង។':'🔔 Notifications on.')+'\n\n':'')+(summary||welcome)+'\n\n/khmer · /english · /mute',reply_markup:{inline_keyboard:[[{text:khmer?'កាបូបកាតរបស់ខ្ញុំ':'My wallet',web_app:{url:new URL('wallet/'+(joinCode?'?join='+joinCode:''),process.env.APP_URL).href}}]]}})}
 return json({ok:true});
 }
 if(path==='/admin'){res.writeHead(301,{Location:'/admin/'});return res.end()}
 if(path==='/admin/api/login'&&req.method==='POST'){const cookie=adminLogin(req,(await body(req)).password);res.writeHead(200,{'Content-Type':'application/json','Set-Cookie':cookie,'Cache-Control':'no-store'});return res.end('{"ok":true}')}
 if(path==='/admin/api/stats'){if(!adminCookie(req))reject('Sign in required.',401);return json(await adminStats(db))}
 if(path==='/api/auth/widget'&&req.method==='POST'){const data=await body(req),user=widgetUser(data,process.env.BOT_TOKEN);await touch(db,user);return json({token:issueSession(user),user:{first_name:String(data.first_name||'').slice(0,64),photo_url:/^https:\/\//.test(data.photo_url||'')?String(data.photo_url):''}})}
 if(path==='/api/config'&&req.method==='GET')return json({bot:/^\w{4,64}$/.test(process.env.BOT_USERNAME||'')?process.env.BOT_USERNAME:null});
 if(path.startsWith('/api/')){
 const query=new URL(req.url,'http://localhost').searchParams;const user=authenticate(req);await touch(db,user);
 if(path==='/api/live'&&req.method==='GET')return subscribe(user,req,res);
 if(path==='/api/wallet'&&req.method==='GET')return json({...await wallet(db,user),account:await account(db,user),bot:/^\w{4,64}$/.test(process.env.BOT_USERNAME||'')?process.env.BOT_USERNAME:null});
 if(path==='/api/preview'&&req.method==='GET')return json(await preview(db,query.get('code')));
 if(path==='/api/lookup'&&req.method==='GET')return json(await lookup(db,user,query.get('shop'),query.get('member')));if(req.method!=='POST')reject('Method not allowed.',405);
 if(path==='/api/account/recovery')return json({code:await issueRecovery(db,user)});
 if(path==='/api/account/recover')return json({code:await recover(db,user,(await body(req)).code)});
 await announce(db,await change(db,user,path.slice(5),await body(req))).catch(()=>{});return json({ok:true});
 }
 if(req.method!=='GET'&&req.method!=='HEAD')reject('Method not allowed.',405);
 const file=resolve(root,'.'+decodeURIComponent(path)+(path.endsWith('/')?'index.html':''));if(!file.startsWith(resolve(root)+sep))reject('Not found.',404);
 const data=await readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.json':'application/json'})[extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);
 }catch(e){json({error:e.status?e.message:e.code==='ENOENT'?'Not found.':'Unable to complete the request.'},e.status||(e.code==='ENOENT'?404:500))}
})}
const botReady=()=>process.env.BOT_TOKEN&&/^https:\/\//.test(process.env.APP_URL||'')&&/^[-\w]{16,256}$/.test(process.env.WEBHOOK_SECRET||'');
async function configureBot(){
 await telegram('setWebhook',{url:new URL('telegram',process.env.APP_URL).href,secret_token:process.env.WEBHOOK_SECRET});await telegram('setChatMenuButton',{menu_button:{type:'web_app',text:'កាបូបកាត',web_app:{url:new URL('wallet/',process.env.APP_URL).href}}});await telegram('setMyCommands',{commands:[{command:'start',description:'Open my card wallet'},{command:'khmer',description:'ប្តូរទៅភាសាខ្មែរ'},{command:'english',description:'Switch to English'},{command:'mute',description:'Turn notifications off'},{command:'unmute',description:'Turn notifications on'}]});console.log('Telegram webhook, commands and wallet menu configured.');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.includes('--configure-bot')){
 if(!botReady())throw Error('Set BOT_TOKEN, HTTPS APP_URL and WEBHOOK_SECRET (16–256 letters, digits, underscores or hyphens).');
 await configureBot();
 }else{const port=Number(process.env.PORT||4173);app(await database(process.env.DATABASE_URL||process.env.DB_FILE||'wallet.sqlite')).listen(port,()=>{console.log('CardYeung listening on port '+port);
  // Register the Telegram webhook on every start so deploys never leave the bot unconfigured. Failures are logged, never fatal.
  if(botReady()&&process.env.NODE_ENV==='production')configureBot().catch(e=>console.error('Telegram webhook setup failed: '+e.message))})}
}
