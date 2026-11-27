import {qrSvg} from './qr.js';
const P={cards:'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 10.5h18M7 15h4',gift:'M3 8.5h18v4H3zM5 12.5V20h14v-7.5M12 8.5V20M12 8.5C9 8.5 6.8 7 7.4 5.4S10.6 4.6 12 8.5c1.4-3.9 3.6-4.2 4.6-3.1s-1.6 3.1-4.6 3.1',chart:'M5 20v-8M12 20V4M19 20v-5',store:'M3 10l2-6h14l2 6a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0M5 13v8h14v-8M10 21v-5h4v5',plus:'M12 5v14M5 12h14',back:'M19 12H5M11 6l-6 6 6 6',arrow:'M7 17L17 7M8 7h9v9',scan:'M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M7.5 12h9',cup:'M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM16 10h2a2.5 2.5 0 0 1 0 5h-2M8 3v3M12 3v3',gym:'M3 9v6M6 6v12M9 8v8M9 12h6M15 8v8M18 6v12M21 9v6',cinema:'M3 7h18v11H3v-3a3 3 0 0 0 0-5zM15 8v2m0 2v2m0 2v1',share:'M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6',copy:'M9 9h11v11H9zM5 15V4h11',qr:'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v6h-4M14 18v2',clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 7v5l3 2',keys:'M4 7h16M4 12h16M4 17h9',check:'M5 12.5l4.5 4.5L19 7.5',stamp:'M5 16h14l2 4H3zM8 16v-3l2-3c-5-9 9-9 4 0l2 3v3'};
const icon=k=>'<svg class="svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+P[k]+'"/></svg>';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const num=v=>language==='km'?khnum(v):String(v),loc=language==='km'?'km-KH':'en';
const types={Coffee:{art:'coffee',ico:'cup',tint:'mint'},Fitness:{art:'gym',ico:'gym',tint:'sky'},Entertainment:{art:'cinema',ico:'cinema',tint:'peach'},Other:{art:'other',ico:'cards',tint:'lav'}};
const kind=c=>types[c]||types.Other,tints=['mint','lav','peach','sky'];
const demoPrograms=[['Moss Coffee','Coffee','Free handcrafted drink',10,7],['Forma Club','Fitness','Free day pass',8,4],['Lumière Cinema','Entertainment','Free movie ticket',5,5],['Atelier Books','Other','Free paperback',6,2]].map(([name,category,reward,target,stamps],i)=>({name,category,reward,target,stamps,code:'CLUB00'+(i+1),member:'CY10000'+(i+1)}));
function seedEvents(){const out=[];let x=7;const rnd=()=>(x=x*16807%2147483647)/2147483647,now=Date.now();
 for(let d=0;d<84;d++){const n=rnd()<.62?1+(rnd()<.35?1:0):0;for(let k=0;k<n;k++){const p=demoPrograms[Math.floor(rnd()*4)];out.push({name:p.name,category:p.category,label:'Stamp earned',delta:'+1 stamp',at:now-d*864e5-Math.floor(rnd()*3.6e7)-36e5})}
 if(d%19===9){const p=demoPrograms[Math.floor(rnd()*4)];out.push({name:p.name,category:p.category,label:'Reward redeemed',delta:'Redeemed',at:now-d*864e5-72e5})}}
 return out.sort((a,b)=>b.at-a.at)}
const seed=()=>({cards:structuredClone(demoPrograms),shops:[],events:seedEvents(),bot:null});
const tg=window.Telegram?.WebApp,live=!!tg?.initData,storage='cardyeung-wallet-v2',params=new URLSearchParams(location.search);
let state=live?{cards:[],events:[],shops:[],bot:null}:JSON.parse(localStorage.getItem(storage)||'null')||seed();
let page=params.get('view')==='studio'?'Shop studio':'My wallet',category='All cards',tab='General',range='Monthly',monthBack=0,busy=false,loaded=!live,modalKey='';
const holder=()=>tg?.initDataUnsafe?.user?.first_name||'Sokha';
const save=()=>{if(!live)localStorage.setItem(storage,JSON.stringify(state))};
const uid=()=>crypto.randomUUID().replaceAll('-','').slice(0,14).toUpperCase();
function notify(msg){$('toast').textContent=msg;clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('toast').textContent='',3200)}
async function api(path,data){const res=await fetch('/api/'+path,{method:data?'POST':'GET',headers:{'Content-Type':'application/json','Authorization':'tma '+tg.initData},body:data?JSON.stringify(data):undefined});if(!res.ok)throw Error((await res.json()).error||'Please try again.');return res.json()}
async function refresh(){if(!live)return;state=await api('wallet');loaded=true;render()}
const fmt=(at,o)=>new Intl.DateTimeFormat(loc,o).format(new Date(at)),when=at=>fmt(at,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
const tail=c=>String(c.number||c.member).slice(-4).toUpperCase(),isReady=c=>!c.manual&&c.stamps>=c.target;
// ---------- cards ----------
function dots(c){if(c.target>20)return '<span class="bar-fill"><b style="width:'+Math.round(c.stamps/c.target*100)+'%"></b></span>';return '<span class="dots" aria-hidden="true">'+Array.from({length:c.target},(_,i)=>'<i class="'+(i<c.stamps?'on':'')+'"></i>').join('')+'</span>'}
function face(c,solo=false){const t=kind(c.category),ready=isReady(c);
 return '<li class="slot '+t.art+(solo?' solo':'')+'"><button class="pass '+t.art+'" style="--img:url(./assets/'+t.art+'.jpg)" data-card="'+esc(c.member)+'" aria-label="'+esc(c.name)+'"><span class="p-top"><b class="p-brand">'+esc(c.name)+'</b><span class="p-no">•••• <em>'+esc(tail(c))+'</em></span></span><span class="p-body">'+(c.manual?'<span class="p-chip">Membership card</span>':dots(c))+'</span><span class="p-bot"><span class="p-holder"><small>Member</small><b>'+esc(holder())+'</b></span><span class="p-pill '+(ready?'ready':'')+'">'+icon(ready?'gift':c.manual?'cards':'clock')+(ready?'Reward ready':c.manual?'Membership':num(c.stamps)+' / '+num(c.target))+'</span></span></button><span class="go">'+icon('arrow')+'</span></li>'}
const stack=(cards,solo)=>'<ul class="stack">'+cards.map(c=>face(c,solo)).join('')+'</ul>';
function miniBars(c){if(!c||c.manual)return '';const n=Math.min(c.target,12);const on=Math.round(c.stamps/c.target*n);return '<span class="mini" aria-hidden="true">'+Array.from({length:n},(_,i)=>'<b class="'+(i<on?'on':'')+(i===on-1?' last':'')+'" style="height:'+(8+i*(20/n))+'px"></b>').join('')+'</span>'}
// ---------- screens ----------
function nav(){const items=[['My wallet','cards'],['My rewards','gift'],['Activity','chart'],['Shop studio','store']];
 $('dock').innerHTML=items.map(([n,i])=>'<button class="'+(page===n?'on':'')+'" data-action="'+n+'" aria-label="'+n+'">'+icon(i)+'</button>').join('')}
function bar(){const photo=tg?.initDataUnsafe?.user?.photo_url,avatar='<button class="av" data-action="account" aria-label="Account" '+(photo?'style="background-image:url('+esc(photo)+')"':'')+'>'+(photo?'':esc(holder()).charAt(0))+'</button>';
 $('barL').innerHTML=page==='My wallet'?avatar+'<button class="circle" data-action="add" aria-label="Add card">'+icon('plus')+'</button>':'<button class="circle" data-action="My wallet" aria-label="Back">'+icon('back')+'</button>';
 $('barR').innerHTML=page==='My wallet'?'<button class="circle" data-action="scan" aria-label="Scan QR">'+icon('scan')+'</button>':avatar+'<button class="circle" data-action="add" aria-label="Add card">'+icon('plus')+'</button>'}
function home(){const real=state.cards.filter(c=>!c.manual),have=real.reduce((n,c)=>n+Math.min(c.stamps,c.target),0),need=real.reduce((n,c)=>n+c.target,0),ready=real.filter(isReady).length;
 const cats=[...new Set(state.cards.map(c=>c.category))],shown=state.cards.filter(c=>category==='All cards'||c.category===category);
 return '<section class="hero"><p class="hello">Welcome back, '+esc(holder())+'!</p><div class="hero-row"><h1>Your Loyalty Cards <i>('+num(state.cards.length)+')</i></h1><button class="tag peach" data-action="Activity">'+icon('chart')+'Statistics</button></div><div class="hero-row"><div class="total"><span><strong>'+num(have)+'</strong><i>/'+num(need)+'</i></span><small>Collected stamps</small></div><span class="tag lav">'+icon('gift')+'<b>'+num(ready)+'</b>Rewards ready</span></div></section>'+
 '<section class="sheet"><span class="handle"></span>'+(cats.length>1?'<div class="chips">'+['All cards',...cats].map(v=>'<button class="chip '+(category===v?'sel':'')+'" data-cat="'+esc(v)+'">'+esc(v)+'</button>').join('')+'</div>':'')+(shown.length?stack(shown):'<p class="empty">Add your first card to get started.</p>')+'<button class="add" data-action="add">'+icon('plus')+'Add New Card</button></section>'}
function series(){const now=new Date(),days=[];
 if(range==='Weekly'){for(let i=6;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()-i);days.push({d,label:fmt(d,{weekday:'short'})})}}
 else{const m=new Date(now.getFullYear(),now.getMonth()-monthBack,1),n=new Date(m.getFullYear(),m.getMonth()+1,0).getDate();for(let i=1;i<=n;i++)days.push({d:new Date(m.getFullYear(),m.getMonth(),i)})}
 for(const x of days){x.up=0;x.down=0}const key=d=>d.getFullYear()*400+d.getMonth()*32+d.getDate(),index=new Map(days.map(x=>[key(x.d),x]));
 for(const e of state.events){const x=index.get(key(new Date(e.at)));if(!x)continue;const stamp=e.delta==='+1 stamp',reward=e.delta==='Redeemed';
  if(tab==='General'){if(stamp)x.up++;if(reward)x.down++}else if(tab==='Stamps'){if(stamp)x.up++}else if(reward)x.up++}
 return days}
function chart(){const days=series(),W=320,H=190,mid=H/2,max=Math.max(2,...days.map(x=>Math.max(x.up,x.down))),slot=W/days.length,bw=Math.min(10,slot*.55);let svg='<line x1="0" x2="'+W+'" y1="'+mid+'" y2="'+mid+'" stroke="#fff" stroke-opacity=".7" stroke-dasharray="3 5"/>';
 days.forEach((x,i)=>{const cx=slot*i+slot/2,up=x.up/max*(mid-14),down=x.down/max*(mid-14);
  svg+='<rect x="'+(cx-bw/2)+'" y="'+(mid-up-(up?0:1.5))+'" width="'+bw+'" height="'+(up+(up?0:1.5)+down+(down?0:1.5))+'" rx="'+bw/2+'" fill="'+(up||down?'#a3cbbf':'#bcd9d0')+'"/>';
  if(up)svg+='<circle cx="'+cx+'" cy="'+(mid-up)+'" r="'+Math.min(5,bw/2+1)+'" fill="#161616"/>';if(down)svg+='<circle cx="'+cx+'" cy="'+(mid+down)+'" r="'+Math.min(5,bw/2+1)+'" fill="#161616"/>'});
 const total=days.reduce((n,x)=>n+x.up,0),labels=range==='Weekly'?days.map((x,i)=>'<span class="'+(i===6?'on':'')+'">'+esc(x.label)+'</span>').join(''):Array.from({length:5},(_,i)=>{const back=4-i,d=new Date(new Date().getFullYear(),new Date().getMonth()-back,1);return '<button class="'+(back===monthBack?'on':'')+'" data-month="'+back+'">'+esc(fmt(d,{month:'short'}))+'</button>'}).join('');
 return '<div class="rangetabs">'+['Monthly','Weekly'].map(r=>'<button class="rt '+(range===r?'on':'')+'" data-range="'+r+'">'+r+'</button>').join('')+'</div><div class="chart '+(range==='Weekly'?'wk':'')+'"><div class="big">'+num(total)+'<small>'+(tab==='Rewards'?'Rewards':'Stamps')+'</small></div><svg class="plot" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Activity chart">'+svg+'</svg><div class="months">'+labels+'</div></div>'}
function tx(e){const stamp=e.delta==='+1 stamp',reward=e.delta==='Redeemed',c=state.cards.find(x=>x.name===e.name&&x.category===e.category),t=kind(e.category);
 const pill=stamp&&c&&!c.manual?'<span class="tx-pill">'+miniBars(c)+'<span class="tx-v"><b>+'+num(1)+'</b><small>'+num(Math.round(c.stamps/c.target*100))+'%</small></span></span>':'<span class="tx-pill '+(reward?'peach':'mint')+'"><span class="tx-v"><b>'+esc(e.delta)+'</b></span>'+icon(reward?'gift':'check')+'</span>';
 return '<div class="tx"><i class="ico '+t.tint+'">'+icon(t.ico)+'</i><span class="tx-main"><span class="tx-n">'+esc(e.name)+'</span><span class="tx-t">'+esc(e.label)+' · '+when(e.at)+'</span></span>'+pill+'</div>'}
function activity(){const list=state.events.filter(e=>tab==='General'||(tab==='Stamps'?e.delta==='+1 stamp':e.delta==='Redeemed')).slice(0,40);
 return '<div class="head"><h1>Activity</h1></div><div class="tabs">'+['General','Stamps','Rewards'].map(t=>'<button class="tab '+(tab===t?'on':'')+'" data-tab="'+t+'">'+t+'</button>').join('')+'</div>'+chart()+'<div class="sec"><span class="grid4"><i></i><i></i><i></i><i></i></span><h2>Transactions</h2></div><div class="list">'+(list.length?list.map(tx).join(''):'<p class="empty">Your card activity will appear here.</p>')+'</div>'}
function rewards(){const ready=state.cards.filter(isReady),near=state.cards.filter(c=>!c.manual&&!isReady(c)).sort((a,b)=>b.stamps/b.target-a.stamps/a.target);
 return '<div class="head"><h1>My rewards</h1><p>Show your completed card at the shop to claim your reward.</p></div><div class="pad">'+(ready.length?stack(ready):'<p class="empty">Complete a stamp card to unlock your first reward.</p>')+'</div>'+
 (near.length?'<div class="sec" style="padding-top:0"><h2>Almost there</h2></div><div class="card-more">'+near.map(c=>'<div class="near"><i class="ico '+kind(c.category).tint+'">'+icon(kind(c.category).ico)+'</i><span style="flex:1;min-width:0"><b>'+esc(c.name)+'</b><small>'+esc(c.reward)+'</small><span class="meter"><i style="width:'+Math.round(c.stamps/c.target*100)+'%"></i></span></span><b>'+num(c.target-c.stamps)+'</b></div>').join('')+'</div>':'')}
function studio(){const head='<div class="head"><h1>Shop studio</h1><p>Create a free stamp card for your customers.</p></div><div class="actions"><button class="pill dark" data-action="create">'+icon('plus')+'New program</button></div>';
 if(!state.shops.length)return head+'<ol class="steps"><li><strong>Design your program</strong><span>Pick the stamp goal and the reward your customers can earn.</span></li><li><strong>Share one join code</strong><span>Customers add your shop to their wallet at the counter.</span></li><li><strong>Stamp each visit</strong><span>Scan a member card to award a stamp or redeem a full card.</span></li></ol>';
 return head+state.shops.map((s,i)=>{const t=kind(s.category),m=s.members??state.cards.filter(c=>c.code===s.code).length,st=s.stamps??state.cards.filter(c=>c.code===s.code).reduce((n,c)=>n+c.stamps,0),rd=s.ready??state.cards.filter(c=>c.code===s.code&&isReady(c)).length;
  return '<section class="prog '+tints[i%4]+'"><div class="prog-top"><i class="ico">'+icon(t.ico)+'</i><div><h3>'+esc(s.name)+'</h3><p>'+num(s.target)+' stamps earn '+esc(s.reward)+'.</p></div><button class="circle" data-qr="'+esc(s.code)+'" aria-label="Join QR">'+icon('qr')+'</button></div><div class="stats3"><div><b>'+num(m)+'</b><small>Members</small></div><div><b>'+num(st)+'</b><small>Stamps</small></div><div><b>'+num(rd)+'</b><small>Ready</small></div></div><div class="pillrow"><button class="pill dark" data-scanmember="'+esc(s.code)+'">'+icon('scan')+'Scan customer</button><button class="pill light" data-enter="'+esc(s.code)+'">'+icon('keys')+'Enter code</button></div><div class="joincode"><span>Customer join code</span><b>'+esc(s.code)+'</b></div></section>'}).join('')+'<div style="height:120px"></div>'}
function render(){nav();bar();$('app').dataset.page=page;
 if(!loaded){$('page').innerHTML='<div class="empty" style="margin:30px 20px">Connecting to your Telegram wallet…</div>';return}
 $('page').innerHTML=({'My wallet':home,'My rewards':rewards,Activity:activity,'Shop studio':studio})[page]();
 if(tg?.BackButton){page==='My wallet'?tg.BackButton.hide():tg.BackButton.show()}}
function go(name){page=name;render();$('scroll').scrollTo(0,0)}
// ---------- dialogs ----------
function modal(html){$('inside').innerHTML=html;if(!$('modal').open)$('modal').showModal()}
const input=(label,name,max=60)=>'<label>'+label+'<input required maxlength="'+max+'" name="'+name+'" autocomplete="off"></label>';
const select=()=>'<label>Category<select name="category">'+Object.keys(types).map(c=>'<option value="'+c+'">'+c+'</option>').join('')+'</select></label>';
const form=(op,fields,label,extra='')=>'<form data-form="'+op+'" data-extra="'+esc(extra)+'">'+fields+'<span class="err" role="alert"></span><button class="btn">'+label+'</button></form>';
const linkFor=code=>state.bot?'https://t.me/'+state.bot+'?startapp='+code:new URL('?join='+code,location.href.split('?')[0]).href;
function parseCode(text){let t=String(text||'').trim();try{const u=new URL(t);t=u.searchParams.get('startapp')||u.searchParams.get('join')||t}catch{}t=t.toUpperCase();return /^[A-Z0-9]{6,30}$/.test(t)?t:''}
function scanQr(prompt,done){
 if(tg?.showScanQrPopup&&tg.isVersionAtLeast?.('6.4')){tg.showScanQrPopup({text:prompt},text=>{const code=parseCode(text);if(!code)return false;setTimeout(()=>done(code),150);return true});return true}
 return false}
async function perform(op,b){const body={...b,requestId:modalKey||crypto.randomUUID()};if(live){await api(op,body);await refresh()}else{localChange(op,b);save();render()}}
function localChange(op,b){let c;if(op==='create'){state.shops.unshift({name:b.name,category:b.category,reward:b.reward,code:uid(),target:+b.target});return}
 if(op==='join'){const s=[...state.shops,...demoPrograms].find(x=>x.code===b.code);if(!s)throw Error('Shop code not found.');if(state.cards.some(x=>x.code===s.code))throw Error('This program is already in your wallet.');c={name:s.name,category:s.category,reward:s.reward,target:s.target,code:s.code,stamps:0,member:uid()};state.cards.unshift(c)}
 if(op==='manual'){c={...b,code:uid(),member:uid(),manual:true,stamps:0};state.cards.unshift(c)}
 if(op==='stamp'||op==='redeem'){c=state.cards.find(x=>x.member===b.member&&x.code===b.shop);if(!c)throw Error('Member not found in your program.');if(op==='redeem'&&c.stamps<c.target)throw Error('More stamps are needed.');if(op==='stamp'&&c.stamps>=c.target)throw Error('Redeem the current reward first.');c.stamps+=op==='stamp'?1:-c.target}
 if(c)state.events.unshift({name:c.name,category:c.category,at:Date.now(),label:({join:'Program joined',manual:'Membership saved',stamp:'Stamp earned',redeem:'Reward redeemed'})[op],delta:({join:'New card',manual:'New card',stamp:'+1 stamp',redeem:'Redeemed'})[op]})}
async function openJoin(code){try{const s=live?await api('preview?code='+encodeURIComponent(code)):[...state.shops,...demoPrograms].find(x=>x.code===code);if(!s)throw Error('Shop code not found.');modalKey=crypto.randomUUID();
 modal('<h2>Join program</h2><p>'+esc(s.name)+'</p><ul class="stack">'+face({...s,stamps:0,member:code,manual:false},true)+'</ul><p>'+num(s.target)+' stamps earn '+esc(s.reward)+'.</p><span class="err" role="alert"></span><button class="btn" data-join="'+esc(code)+'">Join program</button>')}catch(e){notify(e.message)}}
async function openCustomer(shop,code){try{const c=live?await api('lookup?shop='+encodeURIComponent(shop)+'&member='+encodeURIComponent(code)):state.cards.find(x=>x.member===code&&x.code===shop);if(!c)throw Error('Member not found in your program.');modalKey=crypto.randomUUID();const ready=c.stamps>=c.target;
 modal('<h2>Customer card</h2><p>'+esc(c.name)+'</p><div class="cust"><b>'+num(c.stamps)+' / '+num(c.target)+' stamps</b><span class="meter"><i style="width:'+Math.min(100,c.stamps/c.target*100)+'%"></i></span><small>'+esc(c.reward)+'</small></div><span class="err" role="alert"></span><button class="btn" data-confirm="'+(ready?'redeem':'stamp')+'" data-shop="'+esc(shop)+'" data-member="'+esc(code)+'">'+icon(ready?'gift':'stamp')+(ready?'Redeem reward':'Award stamp')+'</button>')}catch(e){notify(e.message)}}
function openAction(a){
 if(a==='close'){delete $('modal').dataset.lock;return $('modal').close()}
 if(['My wallet','My rewards','Activity','Shop studio'].includes(a))return go(a);
 modalKey='';
 if(a==='add')modal('<h2>Add a card</h2><p>Scan the shop’s QR code, or type its join code.</p>'+(tg?.showScanQrPopup?'<button class="btn" data-action="scan">'+icon('scan')+'Scan QR</button><hr>':'')+form('join',input('Shop join code','code',30),'Join program')+'<hr><button class="textbtn" data-action="manual">Save an existing membership card</button>');
 if(a==='scan'&&!scanQr('Point the camera at a shop’s join QR.',openJoin))openAction('add');
 if(a==='recoverform'){$('modal').close();delete $('modal').dataset.lock;modal(recoverForm())}
 if(a==='manual'){$('modal').close();modal('<h2>Save membership</h2>'+form('manual',input('Shop name','name')+select()+input('Membership number','number',64),'Save card'))}
 if(a==='account')openAccount();
 if(a==='create')modal('<h2>Create program</h2>'+form('create',input('Shop name','name')+select()+input('Reward','reward')+'<label>Stamps per reward<input required name="target" type="number" inputmode="numeric" min="2" max="50" value="10"></label>','Create program'));
}
const recoveryView=(code,first)=>'<h2>Your recovery code</h2><p>Keep it somewhere safe, such as Saved Messages. If you lose this Telegram account, enter it from a new one to bring your cards and shops back. It is shown only once.</p><b class="code recovery">'+esc(code)+'</b><div class="pillrow"><button class="pill line" data-copytext="'+esc(code)+'">'+icon('copy')+'Copy code</button></div><button class="btn" style="margin-top:14px" data-action="close">'+(first?'I saved it':'Done')+'</button>';
const recoverForm=()=>'<h2>Recover my account</h2><p>Enter the recovery code from your old account. Its cards, rewards and shops move to this Telegram account.</p>'+form('recover',input('Recovery code','code',50),'Recover account');
async function newRecovery(first){try{const {code}=await api('account/recovery',{});await refresh();modal(recoveryView(code,first))}catch(e){notify(e.message)}}
function openWelcome(){modal('<h2>Welcome to CardYeung</h2><p>Your account is created from your Telegram profile, so there is nothing to type. Create a recovery code now so you can restore your cards if you ever lose access.</p><button class="btn" data-newrecovery="first">'+icon('check')+'Create my recovery code</button><hr><button class="textbtn" data-action="recoverform">I already have an account</button>');$('modal').dataset.lock='1'}
function openAccount(){if(!live)return modal('<h2>Telegram account</h2><p>You are exploring a sample wallet on this device. Open the configured CardYeung bot and choose My wallet to use your Telegram account.</p>');
 modal('<h2>'+esc(holder())+'</h2><p>Account <b>'+esc(state.account?.id||'')+'</b></p><button class="btn" data-newrecovery="">'+icon('check')+(state.account?.recovery?'New recovery code':'Create recovery code')+'</button><hr><button class="textbtn" data-action="recoverform">Recover another account</button>')}
async function share(code){const url=linkFor(code),shop=state.shops.find(s=>s.code===code);
 if(tg?.openTelegramLink)return tg.openTelegramLink('https://t.me/share/url?url='+encodeURIComponent(url)+'&text='+encodeURIComponent(shop?.name||''));
 if(navigator.share)try{return await navigator.share({title:shop?.name,url})}catch{}
 copy(url)}
async function copy(text){try{await navigator.clipboard.writeText(text);notify(text.startsWith('http')?'Link copied':'Code copied')}catch{notify(text)}}
document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;
 if(d.action)openAction(d.action);if(d.cat){category=d.cat;render()}if(d.tab){tab=d.tab;render()}if(d.range){range=d.range;render()}if(d.month!==undefined){monthBack=+d.month;render()}
 if(d.card){const c=state.cards.find(x=>x.member===d.card);if(!c||b.closest('#modal'))return;const code=c.number||c.member;
  modal('<h2>Card details</h2><p>'+esc(c.manual?'Show this membership number at checkout.':isReady(c)?'Your reward is ready. Show this code at checkout.':'Show your member code to collect a stamp.')+'</p>'+stack([c],true)+'<div class="qrbox">'+qrSvg(code,{margin:1})+'</div><small class="muted" style="display:block;text-align:center;color:var(--soft)">Member code</small><b class="code">'+esc(code)+'</b>'+(!c.manual?'<p style="text-align:center">'+esc(c.reward)+' · '+num(c.target)+' stamps</p>':''))}
 if(d.qr){const s=state.shops.find(x=>x.code===d.qr);modal('<h2>Scan to join</h2><p>Customers add your shop to their wallet at the counter.</p><div class="qrbox">'+qrSvg(linkFor(d.qr),{margin:1})+'</div><b class="code">'+esc(d.qr)+'</b><div class="pillrow"><button class="pill dark" data-share="'+esc(d.qr)+'">'+icon('share')+'Share</button><button class="pill line" data-copy="'+esc(d.qr)+'">'+icon('copy')+'Copy link</button></div>')}
 if(d.newrecovery!==undefined){delete $('modal').dataset.lock;newRecovery(d.newrecovery==='first')}if(d.copytext){await copy(d.copytext);}
 if(d.share)share(d.share);if(d.copy)copy(linkFor(d.copy));
 if(d.scanmember&&!scanQr('Point the camera at the customer’s card QR.',code=>openCustomer(d.scanmember,code)))openMemberEntry(d.scanmember);
 if(d.enter)openMemberEntry(d.enter);
 if(d.join&&!busy){busy=true;b.disabled=true;try{await perform('join',{code:d.join});$('modal').close();category='All cards';go('My wallet');notify('Saved successfully');tg?.HapticFeedback?.notificationOccurred('success')}catch(err){$('inside').querySelector('.err').textContent=err.message}finally{busy=false;b.disabled=false}}
 if(d.confirm&&!busy){busy=true;b.disabled=true;try{await perform(d.confirm,{shop:d.shop,member:d.member});$('modal').close();notify('Saved successfully');tg?.HapticFeedback?.notificationOccurred('success')}catch(err){$('inside').querySelector('.err').textContent=err.message}finally{busy=false;b.disabled=false}}});
function openMemberEntry(shop){modal('<h2>Customer member code</h2><p>Ask the customer to open their card, then type the code under the QR.</p>'+'<form data-form="lookup" data-extra="'+esc(shop)+'">'+input('Customer member code','member',30)+'<span class="err" role="alert"></span><button class="btn">Continue</button></form>')}
$('modal').addEventListener('click',e=>{if(e.target===$('modal')&&!$('modal').dataset.lock)$('modal').close()});$('modal').addEventListener('cancel',e=>{if($('modal').dataset.lock)e.preventDefault()});
document.addEventListener('submit',async e=>{e.preventDefault();if(busy)return;busy=true;const f=e.target,b=Object.fromEntries(new FormData(f));for(const k in b)b[k]=b[k].trim();b.shop=f.dataset.extra;if(b.code)b.code=parseCode(b.code)||b.code.toUpperCase();if(b.member)b.member=parseCode(b.member)||b.member.toUpperCase();f.querySelector('button').disabled=true;
 try{if(Object.entries(b).some(([k,v])=>k!=='shop'&&!v))throw Error('Please complete every field.');
  if(f.dataset.form==='recover'){const {code}=await api('account/recover',{code:b.code});await refresh();category='All cards';go('My wallet');modal(recoveryView(code,false));return}
  if(f.dataset.form==='lookup'){busy=false;await openCustomer(b.shop,b.member);return}
  modalKey=f.dataset.key||(f.dataset.key=crypto.randomUUID());await perform(f.dataset.form,b);category='All cards';$('modal').close();if(f.dataset.form==='create'||f.dataset.form==='manual')render();else go('My wallet');notify('Saved successfully')}
 catch(err){f.querySelector('.err').textContent=err.message}finally{busy=false;f.querySelector('button').disabled=false}});
// ---------- boot ----------
render();
if(live){tg.ready();tg.expand();try{tg.setHeaderColor('#f6f6f7');tg.setBackgroundColor('#f6f6f7')}catch{}tg.BackButton?.onClick(()=>go('My wallet'));
 refresh().then(()=>{if(!state.account?.recovery)return openWelcome();const code=parseCode(tg.initDataUnsafe?.start_param||params.get('join'));if(code&&!state.cards.some(c=>c.code===code))openJoin(code)}).catch(e=>{$('page').textContent=e.message});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!busy)refresh().catch(e=>notify(e.message))});setInterval(()=>{if(!document.hidden&&!busy&&!$('modal').open)refresh().catch(()=>{})},30000)}
else{const code=parseCode(params.get('join'));if(code)openJoin(code)}
