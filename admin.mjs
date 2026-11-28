// Admin back office: user, shop and card management, broadcasts and an audit log.
// Everything here runs behind the admin cookie (password or an ID listed in ADMIN_IDS).
const reject=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
const pause=ms=>new Promise(r=>setTimeout(r,ms));

export const adminIds=()=>new Set(String(process.env.ADMIN_IDS||'').split(/[\s,]+/).filter(v=>/^\d{1,20}$/.test(v)));
export const isAdmin=id=>adminIds().has(String(id));
const userId=v=>{const id=String(v||'');if(!/^\d{1,20}$/.test(id))reject('Invalid user id.');return id};
const like=q=>'%'+String(q||'').trim().slice(0,60).replace(/[\\%_]/g,m=>'\\'+m)+'%';
const text=(v,max=60)=>{if(typeof v!=='string'||!v.trim()||v.length>max)reject('Invalid text.');return v.trim()};

export async function isBanned(db,id){return !!(await db.get('SELECT 1 AS n FROM users WHERE id=? AND banned=1',id))}

export async function log(db,action,target='',detail=''){
 await db.run('INSERT INTO admin_log(at,action,target,detail) VALUES(?,?,?,?)',Date.now(),action,String(target).slice(0,64),String(detail).slice(0,300));
}
export const auditLog=db=>db.all('SELECT at,action,target,detail FROM admin_log ORDER BY id DESC LIMIT 100');

export async function searchUsers(db,q=''){
 const where=q.trim()?"AND (u.id LIKE ? ESCAPE '\\' OR u.pub LIKE ? ESCAPE '\\')":'',args=q.trim()?[like(q),like(q)]:[];
 return db.all(`SELECT u.id,u.pub,u.created,u.seen,u.banned,(SELECT COUNT(*) FROM cards WHERE customer=u.id) AS cards,(SELECT COUNT(*) FROM shops WHERE owner=u.id) AS shops FROM users u WHERE u.merged_into IS NULL ${where} ORDER BY u.seen DESC LIMIT 50`,...args);
}
export async function userDetail(db,id){
 id=userId(id);const user=await db.get('SELECT id,pub,created,seen,banned,merged_into,(hash IS NOT NULL) AS recovery FROM users WHERE id=?',id);if(!user)reject('User not found.',404);
 const [cards,shops,events,pref]=await Promise.all([
  db.all('SELECT c.member,c.code,COALESCE(s.name,c.name) AS name,c.number,c.stamps,s.target FROM cards c LEFT JOIN shops s ON s.code=c.code WHERE c.customer=? ORDER BY c.created DESC LIMIT 100',id),
  db.all('SELECT s.code,s.name,s.category,s.target,s.reward,(SELECT COUNT(*) FROM cards WHERE code=s.code) AS members FROM shops s WHERE s.owner=? ORDER BY s.created DESC',id),
  db.all('SELECT name,label,delta,at FROM events WHERE customer=? ORDER BY id DESC LIMIT 20',id),
  db.get('SELECT lang,muted FROM languages WHERE customer=?',id)]);
 return {user:{...user,recovery:!!user.recovery,admin:isAdmin(id)},cards,shops,events,pref:pref||null};
}
export function searchShops(db,q=''){
 const where=q.trim()?"WHERE s.name LIKE ? ESCAPE '\\' OR s.code LIKE ? ESCAPE '\\' OR s.owner LIKE ? ESCAPE '\\'":'',args=q.trim()?[like(q),like(q),like(q)]:[];
 return db.all(`SELECT s.code,s.owner,s.name,s.category,s.target,s.reward,s.created,(SELECT COUNT(*) FROM cards WHERE code=s.code) AS members FROM shops s ${where} ORDER BY s.created DESC LIMIT 100`,...args);
}

async function recipients(db,audience){
 const base="SELECT u.id FROM users u LEFT JOIN languages l ON l.customer=u.id WHERE u.merged_into IS NULL AND u.banned=0 AND COALESCE(l.muted,0)=0";
 return (await db.all(audience==='owners'?base+' AND u.id IN (SELECT owner FROM shops)':base)).map(r=>r.id);
}
// Sends in the background (about 20 messages a second, inside Telegram's limits) and records the outcome in the log.
function deliver(db,send,ids,message){
 (async()=>{let ok=0;for(const id of ids){try{await send('sendMessage',{chat_id:id,text:message});ok++}catch{}await pause(50)}
  await log(db,'broadcast done','',ok+' of '+ids.length+' delivered').catch(()=>{})})();
}

export async function adminAction(db,b,{send}={}){
 const op=String(b?.op||'');
 switch(op){
 case 'ban':case 'unban':{const id=userId(b.id);if(isAdmin(id))reject('Admins cannot be suspended.',403);
  if(!(await db.run('UPDATE users SET banned=? WHERE id=?',op==='ban'?1:0,id)).changes)reject('User not found.',404);await log(db,op,id);return {ok:true}}
 case 'deleteUser':{const id=userId(b.id);if(isAdmin(id))reject('Admins cannot be deleted.',403);
  if(!await db.get('SELECT 1 AS n FROM users WHERE id=?',id))reject('User not found.',404);
  await db.tx(async t=>{
   await t.run('DELETE FROM cards WHERE code IN (SELECT code FROM shops WHERE owner=?)',id);await t.run('DELETE FROM shops WHERE owner=?',id);
   for(const sql of ['DELETE FROM cards WHERE customer=?','DELETE FROM events WHERE customer=?','DELETE FROM languages WHERE customer=?','DELETE FROM requests WHERE customer=?','DELETE FROM recover_attempts WHERE who=?','DELETE FROM users WHERE id=?'])await t.run(sql,id);
  });await log(db,'deleteUser',id);return {ok:true}}
 case 'clearRecovery':{const id=userId(b.id);await db.run('UPDATE users SET salt=NULL,hash=NULL WHERE id=?',id);await log(db,'clearRecovery',id);return {ok:true}}
 case 'editShop':{const code=text(b.code,32).toUpperCase(),shop=await db.get('SELECT * FROM shops WHERE code=?',code);if(!shop)reject('Shop not found.',404);
  const target=b.target===undefined?shop.target:Number(b.target);if(!Number.isInteger(target)||target<2||target>50)reject('Choose 2 to 50 stamps.');
  const category=b.category===undefined?shop.category:b.category;if(!['Coffee','Fitness','Entertainment','Other'].includes(category))reject('Choose a category.');
  await db.tx(async t=>{await t.run('UPDATE shops SET name=?,category=?,target=?,reward=? WHERE code=?',b.name===undefined?shop.name:text(b.name),category,target,b.reward===undefined?shop.reward:text(b.reward),code);
   await t.run('UPDATE cards SET stamps=? WHERE code=? AND stamps>?',target,code,target)});await log(db,'editShop',code);return {ok:true}}
 case 'deleteShop':{const code=text(b.code,32).toUpperCase();if(!await db.get('SELECT 1 AS n FROM shops WHERE code=?',code))reject('Shop not found.',404);
  await db.tx(async t=>{await t.run('DELETE FROM cards WHERE code=?',code);await t.run('DELETE FROM shops WHERE code=?',code)});await log(db,'deleteShop',code);return {ok:true}}
 case 'setStamps':{const member=text(b.member,32).toUpperCase(),card=await db.get('SELECT c.member,s.target FROM cards c JOIN shops s ON s.code=c.code WHERE c.member=?',member);if(!card)reject('Program card not found.',404);
  const stamps=Number(b.stamps);if(!Number.isInteger(stamps)||stamps<0||stamps>card.target)reject('Stamps must be 0 to '+card.target+'.');
  await db.run('UPDATE cards SET stamps=? WHERE member=?',stamps,member);await log(db,'setStamps',member,String(stamps));return {ok:true}}
 case 'deleteCard':{const member=text(b.member,32).toUpperCase();if(!(await db.run('DELETE FROM cards WHERE member=?',member)).changes)reject('Card not found.',404);await log(db,'deleteCard',member);return {ok:true}}
 case 'message':{const id=userId(b.id),message=text(b.text,3500);if(!send)reject('The Telegram bot is not configured.',503);
  try{await send('sendMessage',{chat_id:id,text:message})}catch{reject('Telegram could not deliver this message.',502)}await log(db,'message',id,message.slice(0,120));return {ok:true}}
 case 'broadcast':{const message=text(b.text,3500),audience=b.audience==='owners'?'owners':'all';if(!send)reject('The Telegram bot is not configured.',503);
  const ids=await recipients(db,audience);await log(db,'broadcast',audience,ids.length+' recipients: '+message.slice(0,120));deliver(db,send,ids,message);return {ok:true,queued:ids.length}}
 default:reject('Unknown admin action.',404);
 }
}
