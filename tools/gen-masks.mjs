// Pixel-exact mask generator. Decodes the template, classifies each pixel
// (white-bg / cream / photo), and emits per-pixel masks so the user's photo can
// be composited into the EXACT sliced shape (gaps and all) — no polygon tracing.
// Run: REF=tools/_ref1024.png node tools/gen-masks.mjs
import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";

const DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = process.env.OUT_DIR || DIR;
const REF = process.env.REF
  ? (path.isAbsolute(process.env.REF) ? process.env.REF : path.join(DIR, process.env.REF))
  : path.join(DIR, "tools/_ref1024.png");
const EMBED = path.join(DIR, "tools/_ref512.png");

function decodePNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG");
  let p = 8, w = 0, h = 0, bd = 0, ct = 0; const idat = [];
  while (p < buf.length) { const len = buf.readUInt32BE(p); const t = buf.toString("ascii", p+4, p+8); const d = buf.subarray(p+8, p+8+len);
    if (t==="IHDR"){w=d.readUInt32BE(0);h=d.readUInt32BE(4);bd=d[8];ct=d[9];} else if(t==="IDAT")idat.push(d); else if(t==="IEND")break; p+=12+len; }
  if (bd!==8||(ct!==6&&ct!==2)) throw new Error("unsupported PNG ct="+ct);
  const bpp = ct===6?4:3; const raw = zlib.inflateSync(Buffer.concat(idat)); const stride=w*bpp; const rows=Buffer.alloc(w*h*bpp);
  let prev=Buffer.alloc(stride), q=0;
  for (let y=0;y<h;y++){ const f=raw[q++]; const row=raw.subarray(q,q+stride); q+=stride; const cur=Buffer.alloc(stride);
    for(let x=0;x<stride;x++){const a=x>=bpp?cur[x-bpp]:0,b=prev[x],c=x>=bpp?prev[x-bpp]:0;let v=row[x];if(f===1)v=(v+a)&255;else if(f===2)v=(v+b)&255;else if(f===3)v=(v+((a+b)>>1))&255;else if(f===4){const pp=a+b-c,pa=Math.abs(pp-a),pb=Math.abs(pp-b),pc=Math.abs(pp-c);v=(v+(pa<=pb&&pa<=pc?a:pb<=pc?b:c))&255;}cur[x]=v;}
    cur.copy(rows,y*stride); prev=cur; }
  const out=Buffer.alloc(w*h*4); for(let i=0;i<w*h;i++){out[i*4]=rows[i*bpp];out[i*4+1]=rows[i*bpp+1];out[i*4+2]=rows[i*bpp+2];out[i*4+3]=bpp===4?rows[i*bpp+3]:255;} return {w,h,data:out};
}
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function crc(b){let c=0xffffffff;for(let i=0;i<b.length;i++)c=CRC[(c^b[i])&0xff]^(c>>>8);return(c^0xffffffff)>>>0;}
function encodePNG(w,h,d){const st=w*4,raw=Buffer.alloc((st+1)*h);for(let y=0;y<h;y++){raw[y*(st+1)]=0;d.copy(raw,y*(st+1)+1,y*st,y*st+st);}const comp=zlib.deflateSync(raw);const ch=[];const a=(ty,pl)=>{const l=Buffer.alloc(4);l.writeUInt32BE(pl.length);const bd=Buffer.concat([Buffer.from(ty),pl]);const cc=Buffer.alloc(4);cc.writeUInt32BE(crc(bd));ch.push(l,bd,cc);};const ih=Buffer.alloc(13);ih.writeUInt32BE(w,0);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=6;a("IHDR",ih);a("IDAT",comp);a("IEND",Buffer.alloc(0));return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),...ch]);}

const { w, h, data } = decodePNG(fs.readFileSync(REF));
console.log(`template ${path.basename(REF)} ${w}x${h}`);
function classify(r,g,b){const lum=0.299*r+0.587*g+0.114*b;const mx=Math.max(r,g,b),mn=Math.min(r,g,b);const sat=mx===0?0:(mx-mn)/mx;
  if(lum>243&&sat<0.06)return 0; const warm=r>=g&&g>=b-6&&r-b>6; if(warm&&lum>150&&sat<0.30)return 1; return 2;}
const cls=new Uint8Array(w*h); const cnt=[0,0,0];
for(let i=0;i<w*h;i++){const c=classify(data[i*4],data[i*4+1],data[i*4+2]);cls[i]=c;cnt[c]++;}
console.log("white/cream/photo:",cnt);

// Smooth/clean masks a little: fill 1px speckles by majority of neighbours
function clean(pred){const m=new Uint8Array(w*h);for(let i=0;i<w*h;i++)m[i]=pred(cls[i])?1:0;return m;}
// Morphological opening (erode then dilate) removes thin spikes / hairline
// protrusions at strip edges that otherwise render as faint diagonal lines,
// while preserving the solid strips and the gaps between them.
function erode(m,r){const o=new Uint8Array(w*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){let all=1;for(let dy=-r;dy<=r&&all;dy++){for(let dx=-r;dx<=r;dx++){const X=x+dx,Y=y+dy;if(X<0||Y<0||X>=w||Y>=h||!m[Y*w+X]){all=0;break;}}}o[y*w+x]=all;}return o;}
function dilate(m,r){const o=new Uint8Array(w*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){let any=0;for(let dy=-r;dy<=r&&!any;dy++){for(let dx=-r;dx<=r;dx++){const X=x+dx,Y=y+dy;if(X>=0&&Y>=0&&X<w&&Y<h&&m[Y*w+X]){any=1;break;}}}o[y*w+x]=any;}return o;}
const open=(m,r)=>dilate(erode(m,r),r);
const R=parseInt(process.env.OPEN||"2");
const photoM=open(clean(c=>c===2),R), creamM=open(clean(c=>c===1),R), silM=open(clean(c=>c>0),R);
console.log("morphological opening radius",R);

// alpha PNG (white, alpha=mask*255) + slight feather using coverage of 3x3
function alphaPNG(mask){const out=Buffer.alloc(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){let s=0,n=0;for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){const X=x+ox,Y=y+oy;if(X<0||Y<0||X>=w||Y>=h)continue;s+=mask[Y*w+X];n++;}const a=Math.round(255*s/n);const o=(y*w+x)*4;out[o]=255;out[o+1]=255;out[o+2]=255;out[o+3]=a;}return encodePNG(w,h,out);}
// cream layer = actual template colours where cream, transparent else
function creamPNG(){const out=Buffer.alloc(w*h*4);for(let i=0;i<w*h;i++){if(creamM[i]){out[i*4]=data[i*4];out[i*4+1]=data[i*4+1];out[i*4+2]=data[i*4+2];out[i*4+3]=255;}}return encodePNG(w,h,out);}

const photoMaskBuf=alphaPNG(photoM), silMaskBuf=alphaPNG(silM), creamBuf=creamPNG();
fs.writeFileSync(path.join(OUT,"mask-photo.png"),photoMaskBuf);
fs.writeFileSync(path.join(OUT,"mask-sil.png"),silMaskBuf);
fs.writeFileSync(path.join(OUT,"mask-cream.png"),creamBuf);

// photo bbox (cls==2)
let bx0=1e9,by0=1e9,bx1=-1e9,by1=-1e9;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(photoM[y*w+x]){if(x<bx0)bx0=x;if(y<by0)by0=y;if(x>bx1)bx1=x;if(y>by1)by1=y;}
const photoBBox={x:bx0,y:by0,w:bx1-bx0,h:by1-by0};
let sx0=1e9,sy0=1e9,sx1=-1e9,sy1=-1e9;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(silM[y*w+x]){if(x<sx0)sx0=x;if(y<sy0)sy0=y;if(x>sx1)sx1=x;if(y>sy1)sy1=y;}
const silBBox={x:sx0,y:sy0,w:sx1-sx0,h:sy1-sy0};

const b64=(buf)=>buf.toString("base64");
const dataJs=
`// AUTO-GENERATED by tools/gen-masks.mjs from ${path.basename(REF)} (${w}x${h}). Pixel-exact masks.
window.MASK = {
  viewBox: { w: ${w}, h: ${h} },
  photoBBox: ${JSON.stringify(photoBBox)},
  silBBox: ${JSON.stringify(silBBox)},
};
window.MASK_PHOTO = "data:image/png;base64,${b64(photoMaskBuf)}";
window.MASK_SIL = "data:image/png;base64,${b64(silMaskBuf)}";
window.MASK_CREAM = "data:image/png;base64,${b64(creamBuf)}";
window.REFERENCE_IMAGE = "data:image/png;base64,${b64(fs.readFileSync(EMBED))}";
`;
fs.writeFileSync(path.join(DIR,"mask-data.js"),dataJs);
console.log("wrote mask-data.js  photoBBox",JSON.stringify(photoBBox),"silBBox",JSON.stringify(silBBox));
console.log("mask sizes KB: photo",(photoMaskBuf.length/1024|0),"sil",(silMaskBuf.length/1024|0),"cream",(creamBuf.length/1024|0));

// ── preview composite for verification ──
function compositePreview(fillSil){
  const out=Buffer.alloc(w*h*4);
  // white bg
  for(let i=0;i<w*h;i++){out[i*4]=255;out[i*4+1]=255;out[i*4+2]=255;out[i*4+3]=255;}
  // photo region filled with a test pattern (arrow up) to check orientation+fill
  const mask=fillSil?silM:photoM; const bb=fillSil?silBBox:photoBBox;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){ if(!mask[y*w+x])continue; const u=(x-bb.x)/bb.w,v=(y-bb.y)/bb.h; let r=210-70*v,g=160-40*v,b=150-40*v; const ax=Math.abs(u-0.5); if(v>0.3&&v<0.82&&ax<0.05){r=40;g=90;b=220;} if(v>0.16&&v<0.34&&ax<(v-0.16)*1.5){r=40;g=90;b=220;} const o=(y*w+x)*4; out[o]=r;out[o+1]=g;out[o+2]=b; }
  // cream on top (only when not fill-sil)
  if(!fillSil) for(let i=0;i<w*h;i++){ if(creamM[i]){out[i*4]=data[i*4];out[i*4+1]=data[i*4+1];out[i*4+2]=data[i*4+2];} }
  return out;
}
fs.writeFileSync(path.join(OUT,"preview-photo.png"),encodePNG(w,h,compositePreview(false)));
fs.writeFileSync(path.join(OUT,"preview-sil.png"),encodePNG(w,h,compositePreview(true)));
console.log("wrote preview-photo.png, preview-sil.png");
