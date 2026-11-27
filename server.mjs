import {createServer} from 'node:http';
import {createHmac,createHash,timingSafeEqual,randomBytes,scryptSync} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
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
export function database(filename){
 const db=new DatabaseSync(filename);
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS shops(code TEXT PRIMARY KEY, owner TEXT NOT NULL,name TEXT NOT NULL,category TEXT NOT NULL,target INTEGER NOT NULL,reward TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS cards(member TEXT PRIMARY KEY,customer TEXT NOT NULL,code TEXT REFERENCES shops(code),name TEXT,category TEXT,number TEXT,stamps INTEGER NOT NULL DEFAULT 0,UNIQUE(customer,code));
 CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY,customer TEXT NOT NULL,name TEXT NOT NULL,category TEXT NOT NULL,label TEXT NOT NULL,delta TEXT NOT NULL,at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS activity_feed ON events(customer,id);
 CREATE TABLE IF NOT EXISTS languages(customer TEXT PRIMARY KEY,lang TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS requests(customer TEXT,request TEXT,PRIMARY KEY(customer,request));
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,pub TEXT UNIQUE NOT NULL,created INTEGER NOT NULL,seen INTEGER NOT NULL,salt TEXT,hash TEXT,merged_into TEXT);
 CREATE TABLE IF NOT EXISTS recover_attempts(user TEXT NOT NULL,at INTEGER NOT NULL);`);
 for(const id of db.prepare('SELECT customer AS id FROM cards UNION SELECT owner FROM shops UNION SELECT customer FROM events UNION SELECT customer FROM languages').all().map(r=>r.id)){const t=db.prepare('SELECT MIN(at) AS t FROM events WHERE customer=?').get(id).t||Date.now();db.prepare('INSERT OR IGNORE INTO users(id,pub,created,seen) VALUES(?,?,?,?)').run(id,token().slice(0,8),t,t)}
 return db;
}
export function wallet(db,user){
 return {cards:db.prepare(`SELECT c.member,c.code,c.number,c.stamps,c.code IS NULL AS manual,coalesce(s.name,c.name) AS name,coalesce(s.category,c.category) AS category,s.target,s.reward FROM cards c LEFT JOIN shops s ON s.code=c.code WHERE c.customer=? ORDER BY c.rowid DESC`).all(user),
 shops:db.prepare('SELECT code,name,category,target,reward,(SELECT COUNT(*) FROM cards WHERE cards.code=shops.code) AS members,(SELECT COUNT(*) FROM cards WHERE cards.code=shops.code AND stamps>=shops.target) AS ready,(SELECT COALESCE(SUM(stamps),0) FROM cards WHERE cards.code=shops.code) AS stamps FROM shops WHERE owner=? ORDER BY rowid DESC').all(user),events:db.prepare('SELECT name,category,label,delta,at FROM events WHERE customer=? ORDER BY id DESC LIMIT 100').all(user)};
}
export function preview(db,code){const shop=db.prepare('SELECT name,category,target,reward FROM shops WHERE code=?').get(String(code||'').toUpperCase());if(!shop)reject('Shop code not found.',404);return shop}
export function lookup(db,owner,shop,member){
 const card=db.prepare('SELECT c.member,c.stamps,s.target,s.reward,s.name,s.category FROM cards c JOIN shops s ON s.code=c.code WHERE c.member=? AND s.code=? AND s.owner=?').get(String(member||'').toUpperCase(),String(shop||''),owner);
 if(!card)reject('Member not found in your program.',404);return card;
}
export function change(db,user,op,b){
 const request=field(b,'requestId',64);db.exec('BEGIN IMMEDIATE');
 try{
 if(db.prepare('SELECT 1 FROM requests WHERE customer=? AND request=?').get(user,request)){db.exec('COMMIT');return}
 const event=(customer,card,label,delta)=>db.prepare('INSERT INTO events(customer,name,category,label,delta,at) VALUES(?,?,?,?,?,?)').run(customer,card.name,card.category,label,delta,Date.now());
 if(op==='create'||op==='manual'){
 const name=field(b,'name'),category=field(b,'category');if(!categories.includes(category))reject('Choose a category.');
 if(op==='create'){const target=Number(b.target);if(!Number.isInteger(target)||target<2||target>50)reject('Choose 2 to 50 stamps.');db.prepare('INSERT INTO shops VALUES(?,?,?,?,?,?)').run(token(),user,name,category,target,field(b,'reward'))}
 else{db.prepare('INSERT INTO cards(member,customer,name,category,number) VALUES(?,?,?,?,?)').run(token(),user,name,category,field(b,'number',64));event(user,{name,category},'Membership saved','New card')}
 }else if(op==='join'){
 const shop=db.prepare('SELECT * FROM shops WHERE code=?').get(field(b,'code').toUpperCase());if(!shop)reject('Shop code not found.',404);
 if(db.prepare('SELECT 1 FROM cards WHERE customer=? AND code=?').get(user,shop.code))reject('This program is already in your wallet.',409);
 db.prepare('INSERT INTO cards(member,customer,code) VALUES(?,?,?)').run(token(),user,shop.code);event(user,shop,'Program joined','New card');
 }else if(op==='redeem'||op==='stamp'){
 const card=db.prepare('SELECT c.member,c.customer,c.stamps,s.target,s.name,s.category FROM cards c JOIN shops s ON s.code=c.code WHERE c.member=? AND s.code=? AND s.owner=?').get(field(b,'member').toUpperCase(),field(b,'shop'),user);if(!card)reject('Member not found in your program.',404);
 const redeem=op==='redeem';if(redeem&&card.stamps<card.target)reject('More stamps are needed.');if(!redeem&&card.stamps>=card.target)reject('Redeem the current reward first.');
 db.prepare('UPDATE cards SET stamps=? WHERE member=?').run(redeem?0:card.stamps+1,card.member);event(card.customer,card,redeem?'Reward redeemed':'Stamp earned',redeem?'Redeemed':'+1 stamp');
 }else reject('Unknown action.',404);
 db.prepare('INSERT INTO requests VALUES(?,?)').run(user,request);db.exec('COMMIT');
 }catch(e){db.exec('ROLLBACK');throw e}
}

const stripCode=v=>String(v||'').toUpperCase().replace(/[^A-F0-9]/g,'');
const derive=(secret,salt)=>scryptSync(secret,salt,32);
export function touch(db,id){
 const now=Date.now(),row=db.prepare('SELECT seen FROM users WHERE id=?').get(id);
 if(!row){db.prepare('INSERT INTO users(id,pub,created,seen) VALUES(?,?,?,?)').run(id,token().slice(0,8),now,now);return}
 if(now-row.seen>60000)db.prepare('UPDATE users SET seen=? WHERE id=?').run(now,id);
}
export function account(db,id){const u=db.prepare('SELECT pub,hash FROM users WHERE id=?').get(id);return {id:u.pub,recovery:!!u.hash}}
export function issueRecovery(db,id){
 touch(db,id);const secret=randomBytes(10).toString('hex').toUpperCase(),salt=randomBytes(16).toString('hex'),pub=db.prepare('SELECT pub FROM users WHERE id=?').get(id).pub;
 db.prepare('UPDATE users SET salt=?,hash=? WHERE id=?').run(salt,derive(secret,salt).toString('hex'),id);
 return (pub+secret).match(/.{1,4}/g).join('-');
}
export function recover(db,id,code){
 touch(db,id);const hour=Date.now()-3600000;
 db.prepare('DELETE FROM recover_attempts WHERE at<?').run(hour);
 if(db.prepare('SELECT COUNT(*) AS n FROM recover_attempts WHERE user=?').get(id).n>=8)reject('Too many attempts. Try again in an hour.',429);
 db.prepare('INSERT INTO recover_attempts VALUES(?,?)').run(id,Date.now());
 const clean=stripCode(code),old=clean.length===28?db.prepare('SELECT * FROM users WHERE pub=?').get(clean.slice(0,8)):null;
 const good=old?.hash&&timingSafeEqual(derive(clean.slice(8),old.salt),Buffer.from(old.hash,'hex'));
 if(!good)reject('Recovery code not valid.',401);if(old.id===id)reject('This is already your account.',409);
 db.exec('BEGIN IMMEDIATE');
 try{
  db.prepare('DELETE FROM cards WHERE customer=? AND code IS NOT NULL AND code IN (SELECT code FROM cards WHERE customer=?)').run(old.id,id);
  db.prepare('UPDATE cards SET customer=? WHERE customer=?').run(id,old.id);db.prepare('UPDATE shops SET owner=? WHERE owner=?').run(id,old.id);db.prepare('UPDATE events SET customer=? WHERE customer=?').run(id,old.id);
  db.prepare('INSERT OR IGNORE INTO languages SELECT ?,lang FROM languages WHERE customer=?').run(id,old.id);db.prepare('DELETE FROM languages WHERE customer=?').run(old.id);db.prepare('DELETE FROM requests WHERE customer=?').run(old.id);
  db.prepare('UPDATE users SET hash=NULL,salt=NULL,merged_into=? WHERE id=?').run(id,old.id);
  db.exec('COMMIT');
 }catch(e){db.exec('ROLLBACK');throw e}
 return issueRecovery(db,id);
}
export function adminStats(db){
 const now=Date.now(),day=864e5,one=(q,...a)=>db.prepare(q).get(...a),n=(q,...a)=>one(q,...a).n;
 const live="merged_into IS NULL";
 const since=d=>now-d*day,series=(table,col,where='1=1')=>{const rows=db.prepare(`SELECT strftime('%Y-%m-%d',${col}/1000,'unixepoch') AS d,COUNT(*) AS n FROM ${table} WHERE ${where} AND ${col}>=? GROUP BY d`).all(since(30)),m=new Map(rows.map(r=>[r.d,r.n]));return Array.from({length:30},(_,i)=>{const d=new Date(now-(29-i)*day).toISOString().slice(0,10);return {d,n:m.get(d)||0}})};
 return {
  users:{total:n(`SELECT COUNT(*) AS n FROM users WHERE ${live}`),new1:n(`SELECT COUNT(*) AS n FROM users WHERE ${live} AND created>=?`,since(1)),new7:n(`SELECT COUNT(*) AS n FROM users WHERE ${live} AND created>=?`,since(7)),new30:n(`SELECT COUNT(*) AS n FROM users WHERE ${live} AND created>=?`,since(30)),active1:n(`SELECT COUNT(*) AS n FROM users WHERE ${live} AND seen>=?`,since(1)),active7:n(`SELECT COUNT(*) AS n FROM users WHERE ${live} AND seen>=?`,since(7)),active30:n(`SELECT COUNT(*) AS n FROM users WHERE ${live} AND seen>=?`,since(30)),withRecovery:n(`SELECT COUNT(*) AS n FROM users WHERE ${live} AND hash IS NOT NULL`),recovered:n('SELECT COUNT(*) AS n FROM users WHERE merged_into IS NOT NULL')},
  shops:{owners:n('SELECT COUNT(DISTINCT owner) AS n FROM shops'),programs:n('SELECT COUNT(*) AS n FROM shops')},
  cards:{program:n('SELECT COUNT(*) AS n FROM cards WHERE code IS NOT NULL'),manual:n('SELECT COUNT(*) AS n FROM cards WHERE code IS NULL'),stamps:n('SELECT COALESCE(SUM(stamps),0) AS n FROM cards'),stampEvents:n("SELECT COUNT(*) AS n FROM events WHERE delta='+1 stamp'"),redemptions:n("SELECT COUNT(*) AS n FROM events WHERE delta='Redeemed'")},
  signups:series('users','created',live),stamps:series('events','at',"delta='+1 stamp'"),
  recent:db.prepare(`SELECT u.pub,u.id,u.created,u.seen,(SELECT COUNT(*) FROM cards WHERE customer=u.id) AS cards,(SELECT COUNT(*) FROM shops WHERE owner=u.id) AS shops FROM users u WHERE ${live} ORDER BY created DESC LIMIT 25`).all().map(r=>({id:r.pub,tg:'••••'+r.id.slice(-3),created:r.created,seen:r.seen,cards:r.cards,shops:r.shops})),
  top:db.prepare('SELECT s.name,s.category,COUNT(c.member) AS members FROM shops s LEFT JOIN cards c ON c.code=s.code GROUP BY s.code ORDER BY members DESC LIMIT 10').all()
 };
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
async function telegram(method,data){const response=await fetch('https://api.telegram.org/bot'+process.env.BOT_TOKEN+'/'+method,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});if(!response.ok)reject('Telegram request failed.',502)}
export function app(db){return createServer(async(req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 const json=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data))};
 try{
 if(path==='/telegram'&&req.method==='POST'){
 if(!process.env.WEBHOOK_SECRET||req.headers['x-telegram-bot-api-secret-token']!==process.env.WEBHOOK_SECRET)reject('Unauthorized.',403);
 const msg=(await body(req)).message;if(msg?.chat.type==='private'&&msg.from.id===msg.chat.id){
 const user=String(msg.from.id);touch(db,user);const command=(msg.text||'').split(' ')[0].toLowerCase();
 if(command==='/english'||command==='/khmer')db.prepare('INSERT INTO languages(customer,lang) VALUES(?,?) ON CONFLICT(customer) DO UPDATE SET lang=excluded.lang').run(user,command==='/english'?'en':'km');
 const joinCode=command==='/start'&&/^[A-F0-9]{14}$/i.test((msg.text||'').split(' ')[1]||'')?(msg.text.split(' ')[1]).toUpperCase():'';
 const khmer=db.prepare('SELECT lang FROM languages WHERE customer=?').get(user)?.lang!=='en';
 const cards=wallet(db,user).cards, digits=v=>khmer?String(v).replace(/\d/g,d=>'០១២៣៤៥៦៧៨៩'[d]):String(v);
 const summary=cards.slice(0,25).map(c=>c.name+' · '+(c.manual?c.number:digits(c.stamps)+'/'+digits(c.target)+(khmer?' ត្រា':' stamps'))).join('\n');
 const welcome=khmer?'សូមស្វាគមន៍មកកាន់ CardYeung។ បើកកាបូបកាត ដើម្បីចូលរួមកម្មវិធីរបស់ហាង ឬបង្កើតកម្មវិធីសន្សំត្រាផ្ទាល់ខ្លួន។':'Welcome to CardYeung. Open your wallet to join a shop or create a loyalty program.';
 await telegram('sendMessage',{chat_id:msg.chat.id,text:(summary||welcome)+'\n\n/khmer · /english',reply_markup:{inline_keyboard:[[{text:khmer?'កាបូបកាតរបស់ខ្ញុំ':'My wallet',web_app:{url:new URL('wallet/'+(joinCode?'?join='+joinCode:''),process.env.APP_URL).href}}]]}})}
 return json({ok:true});
 }
 if(path==='/admin'){res.writeHead(301,{Location:'/admin/'});return res.end()}
 if(path==='/admin/api/login'&&req.method==='POST'){const cookie=adminLogin(req,(await body(req)).password);res.writeHead(200,{'Content-Type':'application/json','Set-Cookie':cookie,'Cache-Control':'no-store'});return res.end('{"ok":true}')}
 if(path==='/admin/api/stats'){if(!adminCookie(req))reject('Sign in required.',401);return json(adminStats(db))}
 if(path.startsWith('/api/')){
 const raw=req.headers.authorization||'';if(!raw.startsWith('tma '))reject('Open this wallet in Telegram.',401);const user=telegramUser(raw.slice(4),process.env.BOT_TOKEN);touch(db,user);
 const query=new URL(req.url,'http://localhost').searchParams;
 if(path==='/api/wallet'&&req.method==='GET')return json({...wallet(db,user),account:account(db,user),bot:/^\w{4,64}$/.test(process.env.BOT_USERNAME||'')?process.env.BOT_USERNAME:null});
 if(path==='/api/preview'&&req.method==='GET')return json(preview(db,query.get('code')));
 if(path==='/api/lookup'&&req.method==='GET')return json(lookup(db,user,query.get('shop'),query.get('member')));if(req.method!=='POST')reject('Method not allowed.',405);
 if(path==='/api/account/recovery')return json({code:issueRecovery(db,user)});
 if(path==='/api/account/recover')return json({code:recover(db,user,(await body(req)).code)});
 change(db,user,path.slice(5),await body(req));return json({ok:true});
 }
 if(req.method!=='GET'&&req.method!=='HEAD')reject('Method not allowed.',405);
 const file=resolve(root,'.'+decodeURIComponent(path)+(path.endsWith('/')?'index.html':''));if(!file.startsWith(resolve(root)+sep))reject('Not found.',404);
 const data=await readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg'})[extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);
 }catch(e){json({error:e.status?e.message:e.code==='ENOENT'?'Not found.':'Unable to complete the request.'},e.status||(e.code==='ENOENT'?404:500))}
})}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.includes('--configure-bot')){
 if(!process.env.BOT_TOKEN||!/^https:\/\//.test(process.env.APP_URL||'')||!/^[-\w]{16,256}$/.test(process.env.WEBHOOK_SECRET||''))throw Error('Set BOT_TOKEN, HTTPS APP_URL and WEBHOOK_SECRET (16–256 letters, digits, underscores or hyphens).');
 await telegram('setWebhook',{url:new URL('telegram',process.env.APP_URL).href,secret_token:process.env.WEBHOOK_SECRET});await telegram('setChatMenuButton',{menu_button:{type:'web_app',text:'កាបូបកាត',web_app:{url:new URL('wallet/',process.env.APP_URL).href}}});console.log('Telegram webhook and wallet menu configured.');
 }else{const port=Number(process.env.PORT||4173);app(database(process.env.DB_FILE||'wallet.sqlite')).listen(port,()=>console.log('CardYeung listening on http://localhost:'+port))}
}

