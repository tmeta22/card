import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {qrMatrix} from './docs/wallet/qr.js';
import {database,change,wallet,telegramUser,preview,lookup,touch,account,issueRecovery,recover,adminStats} from './server.mjs';
test('Owner issues a program, member joins, stamps and redemption are authorized and retry-safe',()=>{
 const db=database(':memory:');change(db,'owner','create',{requestId:'1',name:'Cafe',category:'Coffee',target:2,reward:'Latte'});
 const shop=wallet(db,'owner').shops[0].code;change(db,'member','join',{requestId:'join',code:shop});
 const member=wallet(db,'member').cards[0].member;
 const action=(who,op,key)=>change(db,who,op,{requestId:key,shop,member});
 assert.throws(()=>action('stranger','stamp','2'));assert.throws(()=>action('owner','redeem','3'));
 action('owner','stamp','4');action('owner','stamp','4');assert.equal(wallet(db,'member').cards[0].stamps,1);
 action('owner','stamp','5');assert.throws(()=>action('owner','stamp','6'));action('owner','redeem','7');
 assert.equal(wallet(db,'member').cards[0].stamps,0);assert.equal(wallet(db,'member').events.length,4);
 change(db,'member','manual',{requestId:'8',name:'Library',category:'Other',number:'001238'});
 assert.equal(wallet(db,'member').cards[0].number,'001238');assert.equal(wallet(db,'stranger').cards.length,0);db.close();
});
test('Telegram login requires signed current user data',()=>{
 const key=createHmac('sha256','WebAppData').update('token').digest();
 const signed=(date)=>{const user=JSON.stringify({id:123});const hash=createHmac('sha256',key).update('auth_date='+date+'\nuser='+user).digest('hex');return new URLSearchParams({user,auth_date:String(date),hash}).toString()};
 const data=signed(Math.floor(Date.now()/1000));assert.equal(telegramUser(data,'token'),'123');assert.throws(()=>telegramUser(data,'wrong'));assert.throws(()=>telegramUser(signed(1),'token'));
});
test('Owners see program stats and can look up only their own members',()=>{
 const db=database(':memory:');change(db,'owner','create',{requestId:'1',name:'Gym',category:'Fitness',target:2,reward:'Day pass'});
 const shop=wallet(db,'owner').shops[0].code;change(db,'a','join',{requestId:'j1',code:shop});change(db,'b','join',{requestId:'j2',code:shop});
 const member=wallet(db,'a').cards[0].member;change(db,'owner','stamp',{requestId:'s1',shop,member});change(db,'owner','stamp',{requestId:'s2',shop,member});
 const stats=wallet(db,'owner').shops[0];assert.deepEqual([stats.members,stats.ready,stats.stamps],[2,1,2]);
 assert.equal(lookup(db,'owner',shop,member).stamps,2);assert.throws(()=>lookup(db,'stranger',shop,member));
 assert.equal(preview(db,shop.toLowerCase()).reward,'Day pass');assert.throws(()=>preview(db,'NOPE'));db.close();
});
test('QR encoder builds finder patterns and scales with payload size',()=>{
 const small=qrMatrix('CY100001'),link=qrMatrix('https://t.me/cardyeung_bot?startapp=1A2B3C4D5E6F70');
 assert.equal(small.length,21);assert.ok(link.length>small.length&&(link.length-17)%4===0);
 for(const m of [small,link])for(const [r,c] of [[0,0],[0,m.length-7],[m.length-7,0]])assert.deepEqual([m[r][c],m[r+3][c+3],m[r+1][c+1],m[r+6][c+6]],[1,1,0,1]);
 assert.throws(()=>qrMatrix('x'.repeat(300)));
});
test('Recovery code moves a wallet to a new Telegram account once, with attempt limits',()=>{
 const db=database(':memory:');touch(db,'old');change(db,'owner','create',{requestId:'1',name:'Cafe',category:'Coffee',target:2,reward:'Latte'});
 const shop=wallet(db,'owner').shops[0].code;change(db,'old','join',{requestId:'j',code:shop});
 assert.equal(account(db,'old').recovery,false);const code=issueRecovery(db,'old');assert.match(code,/^([A-F0-9]{4}-){6}[A-F0-9]{4}$/);assert.equal(account(db,'old').recovery,true);
 assert.throws(()=>recover(db,'fresh',code.slice(0,-1)+(code.endsWith('0')?'1':'0')),/not valid/);assert.throws(()=>recover(db,'old',code),/already/);
 const next=recover(db,'fresh',code.toLowerCase().replaceAll('-',' '));assert.notEqual(next,code);
 assert.equal(wallet(db,'fresh').cards.length,1);assert.equal(wallet(db,'old').cards.length,0);assert.throws(()=>recover(db,'third',code),/not valid/);
 for(let i=0;i<8;i++)try{recover(db,'spam','0'.repeat(28))}catch{}assert.throws(()=>recover(db,'spam',next),/Too many/);db.close();
});
test('Admin stats count real users and exclude recovered duplicates',()=>{
 const db=database(':memory:');['a','b','c'].forEach(u=>touch(db,u));change(db,'a','create',{requestId:'1',name:'Gym',category:'Fitness',target:2,reward:'Pass'});
 const shop=wallet(db,'a').shops[0].code;change(db,'b','join',{requestId:'j',code:shop});const member=wallet(db,'b').cards[0].member;change(db,'a','stamp',{requestId:'s',shop,member});
 recover(db,'d',issueRecovery(db,'c'));const stats=adminStats(db);
 assert.equal(stats.users.total,3);assert.equal(stats.users.recovered,1);assert.equal(stats.users.new1,3);assert.equal(stats.shops.owners,1);assert.equal(stats.cards.stampEvents,1);
 assert.equal(stats.signups.at(-1).n,3);assert.equal(stats.stamps.at(-1).n,1);assert.equal(stats.recent.length,3);assert.equal(stats.top[0].members,1);db.close();
});
