// Renders the procedural card face for the 'Other' category (docs/wallet/assets/other.jpg).
// Coffee, fitness and cinema use the original photographs; pass --all to also re-render procedural versions of those.
// Pure SVG lighting + procedural texture, rasterised with the preinstalled Chromium. Run: node tools/render-art.cjs
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const W=1000,H=631,out=path.join(__dirname,'../docs/wallet/assets');
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const noise=(id,f,o=3,seed=3)=>`<filter id="${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${f}" numOctaves="${o}" seed="${seed}"/><feColorMatrix type="saturate" values="0"/></filter>`;
// Light, grain, vignette and a beveled edge shared by every face so they read as one physical card family.
const finish=(tone='#000')=>`
<rect width="${W}" height="${H}" filter="url(#grain)" opacity=".16" style="mix-blend-mode:overlay"/>
<rect width="${W}" height="${H}" fill="url(#sweep)" style="mix-blend-mode:soft-light"/>
<rect width="${W}" height="${H}" fill="url(#vig)"/>
<rect x="1.5" y="1.5" width="${W-3}" height="${H-3}" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="3"/>
<rect x="0" y="${H-4}" width="${W}" height="4" fill="${tone}" opacity=".35"/>`;
const common=`${noise('grain',.85,2,9)}
<linearGradient id="sweep" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".38" stop-color="#fff" stop-opacity=".05"/><stop offset=".55" stop-color="#fff" stop-opacity=".5"/><stop offset=".7" stop-color="#000" stop-opacity=".1"/><stop offset="1" stop-color="#000" stop-opacity=".75"/></linearGradient>
<radialGradient id="vig" cx=".62" cy=".4" r=".85"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient>
<filter id="emb" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur in="SourceAlpha" stdDeviation="2.4" result="b"/><feSpecularLighting in="b" surfaceScale="6" specularConstant="1.2" specularExponent="26" lighting-color="#fff" result="s"><feDistantLight azimuth="235" elevation="46"/></feSpecularLighting><feComposite in="s" in2="SourceAlpha" operator="in" result="s2"/><feDropShadow in="SourceGraphic" dx="2.5" dy="4" stdDeviation="3" flood-color="#000" flood-opacity=".55" result="d"/><feMerge><feMergeNode in="d"/><feMergeNode in="s2"/></feMerge></filter>`;

function coffee(){
 const r=rng(11);let pebbles='';const step=10.5;
 for(let y=-6;y<H+10;y+=step)for(let x=-6+((Math.round(y/step)%2)*step/2);x<W+10;x+=step){const rad=5.3+r()*2.4;pebbles+=`<circle cx="${(x+r()*3).toFixed(1)}" cy="${(y+r()*3).toFixed(1)}" r="${rad.toFixed(1)}" fill="url(#peb)" opacity="${(.55+r()*.45).toFixed(2)}"/>`}
 const bean=(x,y,s,rot)=>`<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><ellipse rx="86" ry="124" fill="url(#foil)"/><path d="M-4-124C40-58-34-22 4 22S-22 82 6 124" fill="none" stroke="#3a2410" stroke-width="13" opacity=".85" clip-path="url(#beanclip)"/></g>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${common}
 <linearGradient id="base" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#27493a"/><stop offset=".6" stop-color="#15291f"/><stop offset="1" stop-color="#0b1812"/></linearGradient>
 <radialGradient id="peb" cx=".36" cy=".3" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".17"/><stop offset=".5" stop-color="#fff" stop-opacity=".02"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient>
 <linearGradient id="foil" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbe7a8"/><stop offset=".3" stop-color="#c58f3c"/><stop offset=".5" stop-color="#f4d58b"/><stop offset=".78" stop-color="#9a6422"/><stop offset="1" stop-color="#e9c277"/></linearGradient>
 <clipPath id="beanclip"><ellipse rx="86" ry="124"/></clipPath><filter id="thread" x="-5%" y="-5%" width="110%" height="110%"><feDropShadow dx="1.5" dy="2.5" stdDeviation="1.6" flood-color="#000" flood-opacity=".7"/></filter></defs>
 <rect width="${W}" height="${H}" fill="url(#base)"/>${pebbles}
 <g filter="url(#emb)">${bean(742,292,1.08,24)}${bean(930,150,.8,-20)}${bean(900,520,.9,58)}${bean(610,560,.62,-38)}</g>
 <rect x="26" y="26" width="${W-52}" height="${H-52}" rx="30" fill="none" stroke="#efe2bd" stroke-width="5" stroke-dasharray="17 11" stroke-linecap="round" filter="url(#thread)" opacity=".92"/>
 ${finish('#000')}</svg>`}

function gym(){
 let streak='';const r=rng(5);for(let i=0;i<260;i++){const y=r()*H;streak+=`<rect x="0" y="${y.toFixed(1)}" width="${W}" height="${(.6+r()*1.8).toFixed(1)}" fill="${r()>.5?'#fff':'#000'}" opacity="${(r()*.12).toFixed(3)}"/>`}
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${common}
 <linearGradient id="base" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3f74d6"/><stop offset=".45" stop-color="#1c46a3"/><stop offset="1" stop-color="#0a1f55"/></linearGradient>
 <pattern id="kn" width="15" height="15" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="15" height="15" fill="#808080"/><path d="M0 0H15M0 0V15" stroke="#fff" stroke-width="5.2"/><path d="M0 7.5H15M7.5 0V15" stroke="#000" stroke-width="1.4" opacity=".75"/></pattern>
 <filter id="knurl" x="0" y="0" width="100%" height="100%"><feGaussianBlur stdDeviation=".9"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  .33 .33 .33 0 0" result="h"/><feDiffuseLighting in="h" surfaceScale="3.2" diffuseConstant="1.1" lighting-color="#cfe0ff" result="l"><feDistantLight azimuth="225" elevation="52"/></feDiffuseLighting><feComposite in="l" in2="SourceGraphic" operator="in"/></filter>
 <linearGradient id="cyl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".78"/><stop offset=".14" stop-color="#000" stop-opacity=".2"/><stop offset=".3" stop-color="#fff" stop-opacity=".42"/><stop offset=".42" stop-color="#fff" stop-opacity=".05"/><stop offset=".78" stop-color="#000" stop-opacity=".3"/><stop offset="1" stop-color="#000" stop-opacity=".8"/></linearGradient>
 <linearGradient id="ring" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8aa6d8"/><stop offset=".3" stop-color="#fff"/><stop offset=".6" stop-color="#6d86b8"/><stop offset="1" stop-color="#27396b"/></linearGradient>
 <clipPath id="bar"><rect x="610" y="-10" width="270" height="${H+20}"/></clipPath>
 <filter id="barshadow" x="-30%" y="-5%" width="160%" height="110%"><feDropShadow dx="-14" dy="0" stdDeviation="16" flood-color="#00071c" flood-opacity=".7"/></filter></defs>
 <rect width="${W}" height="${H}" fill="url(#base)"/>${streak}
 <g filter="url(#barshadow)"><rect x="610" y="-10" width="270" height="${H+20}" fill="#16358a"/></g>
 <g clip-path="url(#bar)"><rect x="560" y="-10" width="400" height="${H+20}" fill="url(#kn)" filter="url(#knurl)"/><rect x="610" y="-10" width="270" height="${H+20}" fill="#2a56b8" style="mix-blend-mode:color"/></g>
 <rect x="610" y="-10" width="270" height="${H+20}" fill="url(#cyl)"/>
 <rect x="578" y="-10" width="32" height="${H+20}" fill="url(#ring)"/><rect x="880" y="-10" width="32" height="${H+20}" fill="url(#ring)"/>
 <rect x="578" y="-10" width="3" height="${H+20}" fill="#fff" opacity=".6"/><rect x="909" y="-10" width="3" height="${H+20}" fill="#000" opacity=".4"/>
 ${finish('#000a24')}</svg>`}

function cinema(){
 let folds='';const stops=[];const n=15;for(let i=0;i<=n*2;i++){stops.push(`<stop offset="${(i/(n*2)).toFixed(4)}" stop-color="${i%2?'#000':'#ffb4c6'}" stop-opacity="${i%2?.62:.38}"/>`)}
 let sparks='';const r=rng(21);for(let i=0;i<46;i++)sparks+=`<circle cx="${(560+r()*400).toFixed(0)}" cy="${(r()*300).toFixed(0)}" r="${(.8+r()*1.8).toFixed(1)}" fill="#ffe7b0" opacity="${(.15+r()*.5).toFixed(2)}"/>`;
 const bulbs=Array.from({length:9},(_,i)=>{const x=60+i*110;return `<circle cx="${x}" cy="${H-38}" r="9" fill="url(#bulb)"/><circle cx="${x}" cy="${H-38}" r="22" fill="#ffd77a" opacity=".18"/>`}).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${common}${noise('nap',1.9,2,4)}
 <linearGradient id="base" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8a2340"/><stop offset=".5" stop-color="#561227"/><stop offset="1" stop-color="#25060f"/></linearGradient>
 <linearGradient id="drape" x1="0" y1="0" x2="1" y2="0.08" spreadMethod="pad">${stops.join('')}</linearGradient>
 <radialGradient id="spot" cx=".78" cy=".08" r=".62"><stop offset="0" stop-color="#ffd9a0" stop-opacity=".72"/><stop offset=".5" stop-color="#ffb06a" stop-opacity=".16"/><stop offset="1" stop-color="#ffb06a" stop-opacity="0"/></radialGradient>
 <radialGradient id="bulb" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fffbe6"/><stop offset=".5" stop-color="#ffd169"/><stop offset="1" stop-color="#b9761e"/></radialGradient>
 <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f6df9d"/><stop offset=".35" stop-color="#b98531"/><stop offset=".6" stop-color="#f7e3a6"/><stop offset="1" stop-color="#9c6a22"/></linearGradient></defs>
 <rect width="${W}" height="${H}" fill="url(#base)"/>
 <rect width="${W}" height="${H}" fill="url(#drape)" style="mix-blend-mode:multiply"/>
 <rect width="${W}" height="${H}" filter="url(#nap)" opacity=".35" style="mix-blend-mode:soft-light"/>
 <rect width="${W}" height="${H}" fill="url(#spot)" style="mix-blend-mode:screen"/>${sparks}
 <rect x="0" y="${H-84}" width="${W}" height="84" fill="#1b050c" opacity=".78"/><rect x="0" y="${H-87}" width="${W}" height="5" fill="url(#gold)"/>${bulbs}
 ${finish('#1b050c')}</svg>`}

function other(){
 let guil='';const cx=760,cy=300;for(let i=0;i<64;i++){guil+=`<ellipse cx="${cx}" cy="${cy}" rx="${70+i*2.2}" ry="${(210-i*2.2).toFixed(1)}" transform="rotate(${(i*2.8).toFixed(1)} ${cx} ${cy})" fill="none" stroke="url(#iri)" stroke-width="1.1" opacity=".55"/>`}
 let rings='';for(let i=0;i<26;i++)rings+=`<circle cx="${cx}" cy="${cy}" r="${18+i*9}" fill="none" stroke="#fff" stroke-opacity="${i%2?.1:.26}" stroke-width="1.2"/>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${common}
 <linearGradient id="base" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e9f6f1"/><stop offset=".45" stop-color="#bddfd4"/><stop offset="1" stop-color="#85b6a8"/></linearGradient>
 <linearGradient id="iri" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7fd6c3"/><stop offset=".35" stop-color="#6c7de0"/><stop offset=".65" stop-color="#e9a1d8"/><stop offset="1" stop-color="#f4d58b"/></linearGradient>
 <radialGradient id="holo1" cx=".75" cy=".3" r=".5"><stop offset="0" stop-color="#d4c2ff" stop-opacity=".8"/><stop offset="1" stop-color="#d4c2ff" stop-opacity="0"/></radialGradient>
 <radialGradient id="holo2" cx=".3" cy=".95" r=".5"><stop offset="0" stop-color="#ffd7a8" stop-opacity=".7"/><stop offset="1" stop-color="#ffd7a8" stop-opacity="0"/></radialGradient>
 <pattern id="lines" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(32)"><rect width="6" height="2" fill="#fff" opacity=".24"/></pattern>
 <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".45" stop-color="#fff" stop-opacity="1"/></linearGradient><mask id="m"><rect width="${W}" height="${H}" fill="url(#fade)"/></mask></defs>
 <rect width="${W}" height="${H}" fill="url(#base)"/><rect width="${W}" height="${H}" fill="url(#holo1)"/><rect width="${W}" height="${H}" fill="url(#holo2)"/>
 <g mask="url(#m)"><g filter="url(#emb)" opacity=".95">${guil}</g>${rings}<rect width="${W}" height="${H}" fill="url(#lines)" opacity=".5"/></g>
 ${finish('#3b6a5e')}</svg>`}

(async()=>{const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:W,height:H}});
 for(const [name,fn] of Object.entries(process.argv.includes('--all')?{coffee,gym,cinema,other}:{other})){await page.setContent(`<body style="margin:0">${fn()}</body>`);await page.screenshot({path:path.join(out,name+'.jpg'),type:'jpeg',quality:80});console.log(name,fs.statSync(path.join(out,name+'.jpg')).size)}
 await browser.close()})();
