// Minimal dependency-free QR Code encoder: byte mode, error correction M, versions 1-9 (up to 180 bytes).
const BLOCKS={1:[[1,26,16]],2:[[1,44,28]],3:[[1,70,44]],4:[[2,50,32]],5:[[2,67,43]],6:[[4,43,27]],7:[[4,49,31]],8:[[2,60,38],[2,61,39]],9:[[3,58,36],[2,59,37]]};
const ECC={1:10,2:16,3:26,4:18,5:24,6:16,7:18,8:22,9:22};
const ALIGN={1:[],2:[6,18],3:[6,22],4:[6,26],5:[6,30],6:[6,34],7:[6,22,38],8:[6,24,42],9:[6,26,46]};
const EXP=new Array(512),LOG=new Array(256);
for(let i=0,x=1;i<255;i++){EXP[i]=x;LOG[x]=i;x<<=1;if(x&256)x^=0x11d}
for(let i=255;i<512;i++)EXP[i]=EXP[i-255];
const mul=(a,b)=>a&&b?EXP[LOG[a]+LOG[b]]:0;
function reedSolomon(data,count){
 let gen=[1];for(let i=0;i<count;i++){const next=new Array(gen.length+1).fill(0);gen.forEach((c,j)=>{next[j]^=c;next[j+1]^=mul(c,EXP[i])});gen=next}
 const rem=new Array(count).fill(0);
 for(const byte of data){const factor=byte^rem.shift();rem.push(0);gen.slice(1).forEach((c,i)=>{rem[i]^=mul(c,factor)})}
 return rem;
}
function bch(value,poly,bits){let v=value<<bits;const top=poly.toString(2).length-1;for(let i=top+bits-1+(0);i>=top;i--)if(v>>>i&1)v^=poly<<(i-top);return v}
function codewords(bytes,version){
 const groups=BLOCKS[version],capacity=groups.reduce((n,[c,,d])=>n+c*d,0),lenBits=8;
 if(bytes.length>capacity-2)throw Error('QR payload too long.');
 const bits=[];const push=(v,n)=>{for(let i=n-1;i>=0;i--)bits.push(v>>>i&1)};
 push(4,4);push(bytes.length,lenBits);bytes.forEach(b=>push(b,8));push(0,Math.min(4,capacity*8-bits.length));
 while(bits.length%8)bits.push(0);
 const data=[];for(let i=0;i<bits.length;i+=8)data.push(parseInt(bits.slice(i,i+8).join(''),2));
 for(let pad=0xec;data.length<capacity;pad^=0xec^0x11)data.push(pad);
 const blocks=[];let at=0;for(const [count,,dataLen] of groups)for(let i=0;i<count;i++){const d=data.slice(at,at+dataLen);at+=dataLen;blocks.push({d,e:reedSolomon(d,ECC[version])})}
 const out=[];const longest=Math.max(...blocks.map(b=>b.d.length));
 for(let i=0;i<longest;i++)for(const b of blocks)if(i<b.d.length)out.push(b.d[i]);
 for(let i=0;i<ECC[version];i++)for(const b of blocks)out.push(b.e[i]);
 return out;
}
const maskFns=[(r,c)=>(r+c)%2===0,r=>r%2===0,(r,c)=>c%3===0,(r,c)=>(r+c)%3===0,(r,c)=>(Math.floor(r/2)+Math.floor(c/3))%2===0,(r,c)=>r*c%2+r*c%3===0,(r,c)=>(r*c%2+r*c%3)%2===0,(r,c)=>((r+c)%2+r*c%3)%2===0];
function penalty(m,n){
 let p=0;
 for(let pass=0;pass<2;pass++)for(let a=0;a<n;a++){let run=1;for(let b=1;b<n;b++){const cur=pass?m[b][a]:m[a][b],prev=pass?m[b-1][a]:m[a][b-1];if(cur===prev){run++;if(run===5)p+=3;else if(run>5)p++}else run=1}}
 for(let r=0;r<n-1;r++)for(let c=0;c<n-1;c++){const v=m[r][c];if(v===m[r][c+1]&&v===m[r+1][c]&&v===m[r+1][c+1])p+=3}
 const pat=[1,0,1,1,1,0,1,0,0,0,0],rev=[...pat].reverse();
 for(let pass=0;pass<2;pass++)for(let a=0;a<n;a++)for(let b=0;b<=n-11;b++){const line=Array.from({length:11},(_,i)=>pass?m[b+i][a]:m[a][b+i]);if(line.every((v,i)=>v===pat[i])||line.every((v,i)=>v===rev[i]))p+=40}
 const dark=m.flat().filter(Boolean).length;p+=Math.floor(Math.abs(dark*20-n*n*10)/(n*n))*10;return p;
}
export function qrMatrix(text){
 const bytes=[...new TextEncoder().encode(text)];
 const version=Object.keys(BLOCKS).map(Number).find(v=>bytes.length<=BLOCKS[v].reduce((n,[c,,d])=>n+c*d,0)-2);if(!version)throw Error('QR payload too long.');
 const n=version*4+17,cells=Array.from({length:n},()=>new Array(n).fill(0)),fixed=Array.from({length:n},()=>new Array(n).fill(false));
 const set=(r,c,v)=>{if(r>=0&&c>=0&&r<n&&c<n){cells[r][c]=v?1:0;fixed[r][c]=true}};
 const finder=(r,c)=>{for(let i=-1;i<=7;i++)for(let j=-1;j<=7;j++)set(r+i,c+j,i>=0&&i<=6&&j>=0&&j<=6&&(i===0||i===6||j===0||j===6||(i>=2&&i<=4&&j>=2&&j<=4)))};
 finder(0,0);finder(0,n-7);finder(n-7,0);
 for(let i=8;i<n-8;i++){set(6,i,i%2===0);set(i,6,i%2===0)}
 const pos=ALIGN[version];for(const r of pos)for(const c of pos){if((r===6&&c===6)||(r===6&&c===pos.at(-1))||(r===pos.at(-1)&&c===6))continue;for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++)set(r+i,c+j,Math.max(Math.abs(i),Math.abs(j))!==1)}
 set(n-8,8,1);
 for(let i=0;i<9;i++){if(!fixed[8][i])set(8,i,0);if(!fixed[i][8])set(i,8,0)}for(let i=0;i<8;i++){set(8,n-1-i,0);set(n-1-i,8,0)}
 if(version>=7){const info=(version<<12)|bch(version,0x1f25,12);for(let i=0;i<18;i++){const bit=info>>i&1,a=Math.floor(i/3),b=i%3+n-11;set(a,b,bit);set(b,a,bit)}}
 const data=codewords(bytes,version),bits=[];data.forEach(b=>{for(let i=7;i>=0;i--)bits.push(b>>i&1)});
 const place=mask=>{const m=cells.map(r=>[...r]);let k=0,up=true;for(let c=n-1;c>0;c-=2){if(c===6)c--;for(let i=0;i<n;i++){const r=up?n-1-i:i;for(const cc of [c,c-1]){if(fixed[r][cc])continue;const bit=bits[k++]||0;m[r][cc]=bit^(maskFns[mask](r,cc)?1:0)}}up=!up}return m};
 let best,bestScore=Infinity,bestMask=0;
 for(let mask=0;mask<8;mask++){const m=place(mask),score=penalty(m,n);if(score<bestScore){best=m;bestScore=score;bestMask=mask}}
 const format=((0<<3|bestMask)<<10|bch(0<<3|bestMask,0x537,10))^0x5412;
 for(let i=0;i<15;i++){const bit=format>>i&1;
  if(i<6)best[i][8]=bit;else if(i<8)best[i+1][8]=bit;else best[n-15+i][8]=bit;
  if(i<8)best[8][n-1-i]=bit;else if(i<9)best[8][15-i]=bit;else best[8][15-i-1]=bit}
 return best;
}
export function qrSvg(text,{margin=2,dark='#111',light='#fff'}={}){
 const m=qrMatrix(text),n=m.length;let d='';
 m.forEach((row,r)=>{let c=0;while(c<n){if(!row[c]){c++;continue}let s=c;while(c<n&&row[c])c++;d+='M'+(s+margin)+' '+(r+margin)+'h'+(c-s)+'v1h-'+(c-s)+'z'}});
 const size=n+margin*2;return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+size+' '+size+'" shape-rendering="crispEdges" role="img"><rect width="'+size+'" height="'+size+'" fill="'+light+'"/><path fill="'+dark+'" d="'+d+'"/></svg>';
}
