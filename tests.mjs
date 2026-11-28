import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {qrMatrix} from './docs/wallet/qr.js';
import {database,change,wallet,telegramUser,preview,lookup,touch,account,issueRecovery,recover,adminStats,notice,issueSession,sessionUser,widgetUser} from './server.mjs';
import {createHash} from 'node:crypto';
import {adminAction,searchUsers,userDetail,searchShops,auditLog,isAdmin,isBanned} from './admin.mjs';
const target=process.env.TEST_DATABASE_URL||':memory:';
async function fresh(){const db=await database(target);if(target!==':memory:')for(const t of ['recover_attempts','requests','languages','events','cards','shops','users'])await db.exec('DELETE FROM '+t);return db}
test('Owner issues a program, member joins, stamps and redemption are authorized and retry-safe',async()=>{
 const db=await fresh();await change(db,'owner','create',{requestId:'1',name:'Cafe',category:'Coffee',target:2,reward:'Latte'});
 const shop=(await wallet(db,'owner')).shops[0].code;await change(db,'member','join',{requestId:'join',code:shop});
 const member=(await wallet(db,'member')).cards[0].member;
 const action=(who,op,key)=>change(db,who,op,{requestId:key,shop,member});
 await assert.rejects(action('stranger','stamp','2'));await assert.rejects(action('owner','redeem','3'));
 await action('owner','stamp','4');await action('owner','stamp','4');assert.equal((await wallet(db,'member')).cards[0].stamps,1);
 await action('owner','stamp','5');await assert.rejects(action('owner','stamp','6'));await action('owner','redeem','7');
 assert.equal((await wallet(db,'member')).cards[0].stamps,0);assert.equal((await wallet(db,'member')).events.length,4);
 await change(db,'member','manual',{requestId:'8',name:'Library',category:'Other',number:'001238'});
 assert.equal((await wallet(db,'member')).cards[0].number,'001238');assert.equal((await wallet(db,'stranger')).cards.length,0);await db.close();
});
test('Telegram login requires signed current user data',()=>{
 const key=createHmac('sha256','WebAppData').update('token').digest();
 const signed=(date)=>{const user=JSON.stringify({id:123});const hash=createHmac('sha256',key).update('auth_date='+date+'\nuser='+user).digest('hex');return new URLSearchParams({user,auth_date:String(date),hash}).toString()};
 const data=signed(Math.floor(Date.now()/1000));assert.equal(telegramUser(data,'token'),'123');assert.throws(()=>telegramUser(data,'wrong'));assert.throws(()=>telegramUser(signed(1),'token'));
});
test('Owners see program stats and can look up only their own members',async()=>{
 const db=await fresh();await change(db,'owner','create',{requestId:'1',name:'Gym',category:'Fitness',target:2,reward:'Day pass'});
 const shop=(await wallet(db,'owner')).shops[0].code;await change(db,'a','join',{requestId:'j1',code:shop});await change(db,'b','join',{requestId:'j2',code:shop});
 const member=(await wallet(db,'a')).cards[0].member;await change(db,'owner','stamp',{requestId:'s1',shop,member});await change(db,'owner','stamp',{requestId:'s2',shop,member});
 const stats=(await wallet(db,'owner')).shops[0];assert.deepEqual([stats.members,stats.ready,stats.stamps],[2,1,2]);
 assert.equal((await lookup(db,'owner',shop,member)).stamps,2);await assert.rejects(lookup(db,'stranger',shop,member));
 assert.equal((await preview(db,shop.toLowerCase())).reward,'Day pass');await assert.rejects(preview(db,'NOPE'));await db.close();
});
test('QR encoder builds finder patterns and scales with payload size',()=>{
 const small=qrMatrix('CY100001'),link=qrMatrix('https://t.me/cardyeung_bot?startapp=1A2B3C4D5E6F70');
 assert.equal(small.length,21);assert.ok(link.length>small.length&&(link.length-17)%4===0);
 for(const m of [small,link])for(const [r,c] of [[0,0],[0,m.length-7],[m.length-7,0]])assert.deepEqual([m[r][c],m[r+3][c+3],m[r+1][c+1],m[r+6][c+6]],[1,1,0,1]);
 assert.throws(()=>qrMatrix('x'.repeat(300)));
});
test('Recovery code moves a wallet to a new Telegram account once, with attempt limits',async()=>{
 const db=await fresh();await touch(db,'old');await change(db,'owner','create',{requestId:'1',name:'Cafe',category:'Coffee',target:2,reward:'Latte'});
 const shop=(await wallet(db,'owner')).shops[0].code;await change(db,'old','join',{requestId:'j',code:shop});
 assert.equal((await account(db,'old')).recovery,false);const code=await issueRecovery(db,'old');assert.match(code,/^([A-F0-9]{4}-){6}[A-F0-9]{4}$/);assert.equal((await account(db,'old')).recovery,true);
 await assert.rejects(recover(db,'fresh',code.slice(0,-1)+(code.endsWith('0')?'1':'0')),/not valid/);await assert.rejects(recover(db,'old',code),/already/);
 const next=await recover(db,'fresh',code.toLowerCase().replaceAll('-',' '));assert.notEqual(next,code);
 assert.equal((await wallet(db,'fresh')).cards.length,1);assert.equal((await wallet(db,'old')).cards.length,0);await assert.rejects(recover(db,'third',code),/not valid/);
 for(let i=0;i<8;i++)await recover(db,'spam','0'.repeat(28)).catch(()=>{});await assert.rejects(recover(db,'spam',next),/Too many/);await db.close();
});
test('Admin stats count real users and exclude recovered duplicates',async()=>{
 const db=await fresh();for(const u of ['a','b','c'])await touch(db,u);await change(db,'a','create',{requestId:'1',name:'Gym',category:'Fitness',target:2,reward:'Pass'});
 const shop=(await wallet(db,'a')).shops[0].code;await change(db,'b','join',{requestId:'j',code:shop});const member=(await wallet(db,'b')).cards[0].member;await change(db,'a','stamp',{requestId:'s',shop,member});
 await recover(db,'d',await issueRecovery(db,'c'));const stats=await adminStats(db);
 assert.equal(stats.users.total,3);assert.equal(stats.users.recovered,1);assert.equal(stats.users.new1,3);assert.equal(stats.shops.owners,1);assert.equal(stats.cards.stampEvents,1);
 assert.equal(stats.signups.at(-1).n,3);assert.equal(stats.stamps.at(-1).n,1);assert.equal(stats.recent.length,3);assert.equal(stats.top[0].members,1);await db.close();
});
test('Stamps report who to notify, and notices read naturally in both languages',async()=>{
 const db=await fresh();assert.equal((await change(db,'o','create',{requestId:'1',name:'Cafe',category:'Coffee',target:2,reward:'Latte'})).kind,'create');
 const shop=(await wallet(db,'o')).shops[0].code,joined=await change(db,'c','join',{requestId:'j',code:shop});assert.deepEqual([joined.owner,joined.members],['o',1]);
 const member=(await wallet(db,'c')).cards[0].member,first=await change(db,'o','stamp',{requestId:'s1',shop,member});
 assert.deepEqual([first.customer,first.stamps,first.target],['c',1,2]);assert.equal(await change(db,'o','stamp',{requestId:'s1',shop,member}),null);
 assert.match(notice(first,'en'),/\+1 stamp at Cafe — 1\/2/);assert.match(notice(first,'km'),/១\/២/);
 const full=await change(db,'o','stamp',{requestId:'s2',shop,member});assert.match(notice(full,'en'),/reward at Cafe is ready: Latte/);
 assert.match(notice(await change(db,'o','redeem',{requestId:'r',shop,member}),'en'),/Reward redeemed/);assert.match(notice(joined,'en'),/New member joined Cafe/);await db.close();
});
test('Browser sessions and Telegram Login Widget data are signed and checked',()=>{
 process.env.SESSION_SECRET='test-secret';const t=issueSession('42');assert.equal(sessionUser(t),'42');
 assert.throws(()=>sessionUser(t.slice(0,-2)+'xx'));assert.throws(()=>sessionUser(issueSession('42',-1)));
 const bot='123:abc',data={id:42,first_name:'Dara',auth_date:Math.floor(Date.now()/1000)};
 const check=Object.entries(data).map(([k,v])=>k+'='+v).sort().join('\n'),hash=createHmac('sha256',createHash('sha256').update(bot).digest()).update(check).digest('hex');
 assert.equal(widgetUser({...data,hash},bot),'42');assert.throws(()=>widgetUser({...data,first_name:'Eve',hash},bot));assert.throws(()=>widgetUser({...data,hash},'other'));
});

test('Admins can search, suspend, edit and delete, and every action is logged',async()=>{
 process.env.ADMIN_IDS='900, 901';assert.ok(isAdmin('900')&&isAdmin(901)&&!isAdmin('5'));
 const db=await fresh();for(const u of ['900','10','11'])await touch(db,u);
 await change(db,'10','create',{requestId:'1',name:'Cafe',category:'Coffee',target:3,reward:'Latte'});const shop=(await wallet(db,'10')).shops[0].code;
 await change(db,'11','join',{requestId:'j',code:shop});const member=(await wallet(db,'11')).cards[0].member;
 assert.equal((await searchUsers(db,'11')).length,1);assert.equal((await searchShops(db,'caf'))[0].members,1);assert.equal((await userDetail(db,'11')).cards[0].name,'Cafe');
 await adminAction(db,{op:'setStamps',member,stamps:2});assert.equal((await wallet(db,'11')).cards[0].stamps,2);
 await assert.rejects(adminAction(db,{op:'setStamps',member,stamps:9}),/0 to 3/);
 await adminAction(db,{op:'editShop',code:shop,target:2,name:'Cafe 2'});const card=(await wallet(db,'11')).cards[0];assert.deepEqual([card.stamps,card.target,card.name],[2,2,'Cafe 2']);
 await adminAction(db,{op:'ban',id:'11'});assert.equal(await isBanned(db,'11'),true);await adminAction(db,{op:'unban',id:'11'});assert.equal(await isBanned(db,'11'),false);
 await assert.rejects(adminAction(db,{op:'ban',id:'900'}),/Admins/);await assert.rejects(adminAction(db,{op:'deleteUser',id:'900'}),/Admins/);
 await assert.rejects(adminAction(db,{op:'message',id:'11',text:'hi'}),/not configured/);
 const sent=[];await adminAction(db,{op:'message',id:'11',text:'hello'},{send:async(m,d)=>sent.push(d)});assert.deepEqual(sent,[{chat_id:'11',text:'hello'}]);
 await db.run('INSERT INTO languages(customer,lang,muted) VALUES(?,?,1)','10','km');const out=await adminAction(db,{op:'broadcast',text:'news'},{send:async()=>{}});assert.equal(out.queued,2);
 await adminAction(db,{op:'deleteUser',id:'10'});assert.equal((await searchShops(db,'')).length,0);assert.equal((await wallet(db,'11')).cards.length,0);await assert.rejects(userDetail(db,'10'),/not found/);
 await assert.rejects(adminAction(db,{op:'nope'}),/Unknown/);assert.ok((await auditLog(db)).some(r=>r.action==='deleteUser'&&r.target==='10'));await db.close();delete process.env.ADMIN_IDS;
});
