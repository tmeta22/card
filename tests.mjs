import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {database,change,wallet,telegramUser} from './server.mjs';
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
