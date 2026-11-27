import {createServer} from 'node:http';
import {createHmac,timingSafeEqual,randomBytes} from 'node:crypto';
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
 CREATE TABLE IF NOT EXISTS requests(customer TEXT,request TEXT,PRIMARY KEY(customer,request));`);return db;
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
async function body(req){let text='';for await(const part of req){text+=part;if(text.length>32768)reject('Request too large.',413)}try{return JSON.parse(text)}catch{reject('Invalid JSON.')}}
async function telegram(method,data){const response=await fetch('https://api.telegram.org/bot'+process.env.BOT_TOKEN+'/'+method,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});if(!response.ok)reject('Telegram request failed.',502)}
export function app(db){return createServer(async(req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 const json=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data))};
 try{
 if(path==='/telegram'&&req.method==='POST'){
 if(!process.env.WEBHOOK_SECRET||req.headers['x-telegram-bot-api-secret-token']!==process.env.WEBHOOK_SECRET)reject('Unauthorized.',403);
 const msg=(await body(req)).message;if(msg?.chat.type==='private'&&msg.from.id===msg.chat.id){
 const user=String(msg.from.id),command=(msg.text||'').split(' ')[0].toLowerCase();
 if(command==='/english'||command==='/khmer')db.prepare('INSERT INTO languages(customer,lang) VALUES(?,?) ON CONFLICT(customer) DO UPDATE SET lang=excluded.lang').run(user,command==='/english'?'en':'km');
 const joinCode=command==='/start'&&/^[A-F0-9]{14}$/i.test((msg.text||'').split(' ')[1]||'')?(msg.text.split(' ')[1]).toUpperCase():'';
 const khmer=db.prepare('SELECT lang FROM languages WHERE customer=?').get(user)?.lang!=='en';
 const cards=wallet(db,user).cards, digits=v=>khmer?String(v).replace(/\d/g,d=>'០១២៣៤៥៦៧៨៩'[d]):String(v);
 const summary=cards.slice(0,25).map(c=>c.name+' · '+(c.manual?c.number:digits(c.stamps)+'/'+digits(c.target)+(khmer?' ត្រា':' stamps'))).join('\n');
 const welcome=khmer?'សូមស្វាគមន៍មកកាន់ CardYeung។ បើកកាបូបកាត ដើម្បីចូលរួមកម្មវិធីរបស់ហាង ឬបង្កើតកម្មវិធីសន្សំត្រាផ្ទាល់ខ្លួន។':'Welcome to CardYeung. Open your wallet to join a shop or create a loyalty program.';
 await telegram('sendMessage',{chat_id:msg.chat.id,text:(summary||welcome)+'\n\n/khmer · /english',reply_markup:{inline_keyboard:[[{text:khmer?'កាបូបកាតរបស់ខ្ញុំ':'My wallet',web_app:{url:new URL('wallet/'+(joinCode?'?join='+joinCode:''),process.env.APP_URL).href}}]]}})}
 return json({ok:true});
 }
 if(path.startsWith('/api/')){
 const raw=req.headers.authorization||'';if(!raw.startsWith('tma '))reject('Open this wallet in Telegram.',401);const user=telegramUser(raw.slice(4),process.env.BOT_TOKEN);
 const query=new URL(req.url,'http://localhost').searchParams;
 if(path==='/api/wallet'&&req.method==='GET')return json({...wallet(db,user),bot:/^\w{4,64}$/.test(process.env.BOT_USERNAME||'')?process.env.BOT_USERNAME:null});
 if(path==='/api/preview'&&req.method==='GET')return json(preview(db,query.get('code')));
 if(path==='/api/lookup'&&req.method==='GET')return json(lookup(db,user,query.get('shop'),query.get('member')));if(req.method!=='POST')reject('Method not allowed.',405);
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

