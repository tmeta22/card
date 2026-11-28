// Renders the PWA icons in docs/icons. Run: node tools/render-icons.cjs
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');
const svg=(pad)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2c5745"/><stop offset="1" stop-color="#14291f"/></linearGradient>
<linearGradient id="m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e3f1ec"/><stop offset="1" stop-color="#b9d8cf"/></linearGradient></defs>
<rect width="512" height="512" rx="${pad?0:112}" fill="#131313"/>
<g transform="translate(256 262) scale(${pad?0.78:1}) translate(-256 -262)">
<rect x="128" y="132" width="270" height="172" rx="30" fill="url(#m)" transform="rotate(-12 263 218)"/>
<rect x="112" y="206" width="288" height="182" rx="32" fill="url(#g)"/>
<rect x="112" y="206" width="288" height="182" rx="32" fill="none" stroke="#ffffff30" stroke-width="3"/>
<circle cx="160" cy="342" r="13" fill="#fff"/><circle cx="198" cy="342" r="13" fill="#fff"/><circle cx="236" cy="342" r="13" fill="#fff"/><circle cx="274" cy="342" r="13" fill="none" stroke="#ffffffaa" stroke-width="4"/>
<rect x="150" y="246" width="108" height="16" rx="8" fill="#fff"/><circle cx="352" cy="254" r="22" fill="#fbe2bd"/>
</g></svg>`;
(async()=>{const b=await chromium.launch();const p=await b.newPage();
 fs.writeFileSync(path.join(__dirname,'../docs/icons/icon.svg'),svg(false));
 for(const [name,size,pad] of [['icon-192.png',192,false],['icon-512.png',512,false],['maskable-512.png',512,true],['apple-touch-icon.png',180,true]]){
  await p.setViewportSize({width:size,height:size});await p.setContent(`<body style="margin:0;background:transparent">${svg(pad).replace('<svg ','<svg width="'+size+'" height="'+size+'" ')}</body>`);
  await p.screenshot({path:path.join(__dirname,'../docs/icons/'+name),omitBackground:true});console.log(name)}
 await b.close()})();
