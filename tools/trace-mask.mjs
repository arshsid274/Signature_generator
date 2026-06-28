// Pixel tracer for the diagonal-slice template mask (high-res).
// Decodes a PNG (no deps), finds the shear, detects strip boundaries from the
// crisp white gaps, classifies photo vs cream, samples the cream gradient, and
// emits mask-data.js + src/lib/sliceMaskData.ts. Run:
//   REF=tools/_ref1024.png node tools/trace-mask.mjs
import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";

const DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = process.env.OUT_DIR || DIR;
const REF = process.env.REF
  ? path.isAbsolute(process.env.REF) ? process.env.REF : path.join(DIR, process.env.REF)
  : path.join(DIR, "tools/_ref1024.png");
const EMBED = process.env.EMBED
  ? path.isAbsolute(process.env.EMBED) ? process.env.EMBED : path.join(DIR, process.env.EMBED)
  : path.join(DIR, "tools/_ref512.png");

// ── PNG decode (colorType 2 RGB / 6 RGBA, 8-bit, no interlace) → RGBA ──
function decodePNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG");
  let p = 8, w = 0, h = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString("ascii", p + 4, p + 8);
    const d = buf.subarray(p + 8, p + 8 + len);
    if (type === "IHDR") { w = d.readUInt32BE(0); h = d.readUInt32BE(4); bitDepth = d[8]; colorType = d[9]; }
    else if (type === "IDAT") idat.push(d);
    else if (type === "IEND") break;
    p += 12 + len;
  }
  if (bitDepth !== 8 || (colorType !== 6 && colorType !== 2))
    throw new Error(`unsupported PNG bitDepth=${bitDepth} colorType=${colorType}`);
  const bpp = colorType === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * bpp;
  const rows = Buffer.alloc(w * h * bpp);
  let prev = Buffer.alloc(stride), q = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[q++];
    const row = raw.subarray(q, q + stride); q += stride;
    const cur = Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0, b = prev[x], c = x >= bpp ? prev[x - bpp] : 0;
      let v = row[x];
      if (f === 1) v = (v + a) & 255;
      else if (f === 2) v = (v + b) & 255;
      else if (f === 3) v = (v + ((a + b) >> 1)) & 255;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255; }
      else if (f !== 0) throw new Error("bad filter " + f);
      cur[x] = v;
    }
    cur.copy(rows, y * stride); prev = cur;
  }
  const out = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    out[i*4] = rows[i*bpp]; out[i*4+1] = rows[i*bpp+1]; out[i*4+2] = rows[i*bpp+2];
    out[i*4+3] = bpp === 4 ? rows[i*bpp+3] : 255;
  }
  return { w, h, data: out };
}

// ── PNG encode (RGBA) for diagnostics ──
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b) { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function encodePNG(w, h, data) {
  const stride = w * 4, raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) { raw[y*(stride+1)] = 0; data.copy(raw, y*(stride+1)+1, y*stride, y*stride+stride); }
  const comp = zlib.deflateSync(raw); const chunks = [];
  const ch = (ty, pl) => { const l = Buffer.alloc(4); l.writeUInt32BE(pl.length); const body = Buffer.concat([Buffer.from(ty), pl]); const cc = Buffer.alloc(4); cc.writeUInt32BE(crc32(body)); chunks.push(l, body, cc); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
  ch("IHDR", ih); ch("IDAT", comp); ch("IEND", Buffer.alloc(0));
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), ...chunks]);
}

// ── load + classify ──
const { w, h, data } = decodePNG(fs.readFileSync(REF));
console.log(`reference ${path.basename(REF)}: ${w}x${h}`);
const px = (x, y) => { const i = (y*w+x)*4; return [data[i], data[i+1], data[i+2]]; };
// 0 = white/bg/gap, 1 = cream, 2 = photo
function classify(r, g, b) {
  const lum = 0.299*r + 0.587*g + 0.114*b;
  const mx = Math.max(r,g,b), mn = Math.min(r,g,b);
  const sat = mx === 0 ? 0 : (mx-mn)/mx;
  if (lum > 244 && sat < 0.05) return 0;            // near-white frame + gaps
  const warm = r >= g && g >= b - 4 && r - b > 8;
  if (warm && lum > 150 && sat < 0.28) return 1;    // cream beige
  return 2;                                          // photo
}
const cls = new Uint8Array(w*h), cov = new Uint8Array(w*h);
const counts = [0,0,0];
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const [r,g,b] = px(x,y); const c = classify(r,g,b);
  cls[y*w+x] = c; cov[y*w+x] = c > 0 ? 1 : 0; counts[c]++;
}
console.log("counts white/cream/photo:", counts);

// diagnostic classification map
const vis = Buffer.alloc(w*h*4);
for (let i = 0; i < w*h; i++) { const c = cls[i], o = i*4;
  if (c===0){vis[o]=18;vis[o+1]=18;vis[o+2]=24;} else if(c===1){vis[o]=40;vis[o+1]=200;vis[o+2]=120;} else {vis[o]=230;vis[o+1]=60;vis[o+2]=70;}
  vis[o+3]=255; }
fs.writeFileSync(path.join(OUT, "trace-classify.png"), encodePNG(w, h, vis));

// ── interior-white gap pixels (thin straight white lines between strips) ──
const Wd = Math.max(8, Math.round(w * 0.04));
const gpx = [], gpy = [];
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  if (cls[y*w+x] !== 0) continue;
  let L = false, R = false;
  for (let d = 1; d <= Wd; d++) { if (!L && x-d>=0 && cov[y*w+x-d]) L = true; if (!R && x+d<w && cov[y*w+x+d]) R = true; if (L && R) break; }
  if (L && R) { gpx.push(x); gpy.push(y); }
}
console.log("interior gap pixels:", gpx.length);
function gapHistAt(slope) {
  const off = slope < 0 ? -slope*(h-1) : 0, DWx = Math.ceil(w + Math.abs(slope)*(h-1)) + 2;
  const hist = new Float64Array(DWx);
  for (let i = 0; i < gpx.length; i++) { const xp = Math.round(gpx[i] + slope*gpy[i] + off); if (xp>=0 && xp<DWx) hist[xp]++; }
  return hist;
}
// shear = slope that concentrates gap pixels into the sharpest vertical lines
let M = 0.32, bestS = -1;
for (let s = 0.10; s <= 0.46; s += 0.002) { const hist = gapHistAt(s); let ss = 0; for (const v of hist) ss += v*v; if (ss > bestS) { bestS = ss; M = +s.toFixed(3); } }
if (process.env.FORCE_M) M = parseFloat(process.env.FORCE_M); // visual override
console.log(`shear slope=${M} skew≈${(Math.atan(M)*180/Math.PI).toFixed(1)}°`);

const dsOff = M < 0 ? -M*(h-1) : 0;
const DW = Math.ceil(w + Math.abs(M)*(h-1)) + 2;
const colTot = new Float64Array(DW), colPhoto = new Float64Array(DW);
const colMinY = new Int16Array(DW).fill(-1), colMaxY = new Int16Array(DW).fill(-1);
{ const miny = new Int16Array(DW).fill(9999), maxy = new Int16Array(DW).fill(-1);
  for (let y=0;y<h;y++) for (let x=0;x<w;x++){ if(!cov[y*w+x])continue; const xp=Math.round(x+M*y+dsOff); if(xp<0||xp>=DW)continue; colTot[xp]++; if(cls[y*w+x]===2)colPhoto[xp]++; if(y<miny[xp])miny[xp]=y; if(y>maxy[xp])maxy[xp]=y; }
  for(let i=0;i<DW;i++){ colMinY[i]=maxy[i]>=0?miny[i]:-1; colMaxY[i]=maxy[i]; } }
// smoothed gap histogram → gap columns
const gh = gapHistAt(M);
const ghs = new Float64Array(DW);
for (let i=0;i<DW;i++){ let s=0,n=0; for(let k=-2;k<=2;k++){const j=i+k; if(j>=0&&j<DW){s+=gh[j]||0;n++;}} ghs[i]=s/n; }
const ghMax = Math.max(...ghs, 1);
const maxColH = Math.max(...Array.from({length:DW},(_,i)=>colMaxY[i]-colMinY[i]+1).map(v=>v>0?v:0));
let xL=-1,xR=-1; for(let i=0;i<DW;i++){ if(colTot[i]>=0.12*maxColH){ if(xL<0)xL=i; xR=i; } }
const gapThresh = 0.22*ghMax;
const isGapCol = new Uint8Array(DW);
for(let i=0;i<DW;i++) isGapCol[i] = ghs[i] >= gapThresh ? 1 : 0;
// strips = solid runs (non-gap, covered) within [xL,xR]
const minStripW = Math.max(10, Math.round(w*0.025));
const strips = [];
{ let st0=-1;
  for(let i=xL;i<=xR+1;i++){ const solid = i<=xR && !isGapCol[i] && colTot[i]>=0.12*maxColH;
    if(solid&&st0<0)st0=i;
    else if(!solid&&st0>=0){ if(i-st0>=minStripW){ let top=9999,bot=-1,photo=0,tot=0; for(let k=st0;k<i;k++){ if(colMinY[k]>=0)top=Math.min(top,colMinY[k]); bot=Math.max(bot,colMaxY[k]); photo+=colPhoto[k]; tot+=colTot[k]; } strips.push({a:st0,b:i-1,top,bot,kind:photo>tot*0.4?"photo":"cream"}); } st0=-1; } } }
console.log(`detected ${strips.length} strips (gapHistMax=${ghMax|0}):`);
strips.forEach((st,i)=>console.log(`  #${i} xp ${st.a}-${st.b} (w=${st.b-st.a+1}) y ${st.top}-${st.bot} ${st.kind}`));

// de-skew classification diagnostic (gap columns marked blue)
{ const SCd=Math.max(1,Math.round(1000/DW)); const W2=DW*SCd,H2=Math.round(h*SCd*0.5); const im=Buffer.alloc(W2*H2*4);
  for(let oy=0;oy<H2;oy++){ const y=Math.round(oy/(SCd*0.5)); for(let ox=0;ox<W2;ox++){ const xp=Math.floor(ox/SCd); const sx=Math.round(xp - M*y - dsOff); const o=(oy*W2+ox)*4; let r=12,g=12,b=16; if(sx>=0&&sx<w&&y>=0&&y<h){ const c=cls[y*w+sx]; if(c===0){r=245;g=245;b=250;}else if(c===1){r=40;g=200;b=120;}else{r=230;g=60;b=70;} } if(xp<DW&&isGapCol[xp]){r=0;g=0;b=255;} im[o]=r;im[o+1]=g;im[o+2]=b;im[o+3]=255; } }
  fs.writeFileSync(path.join(OUT,"trace-deskew-cls.png"),encodePNG(W2,H2,im)); }

// ── map de-skew strip rectangles → source-space parallelograms ──
// source_x = xp - M*y - dsOff
const GAPX = parseFloat(process.env.GAPX || "0"); // extra inset in x' (gaps already real)
const toSrc = (xp, y) => [xp - M*y - dsOff, y];
const polys = strips.map((st) => {
  const a = st.a + GAPX, b = st.b - GAPX;
  return [toSrc(a, st.top), toSrc(b, st.top), toSrc(b, st.bot), toSrc(a, st.bot)].map(([x,y]) => [Math.round(x*10)/10, Math.round(y*10)/10]);
});

// ── cream gradient sampling ──
const creams = [];
for (let i = 0; i < w*h; i++) if (cls[i] === 1) { const r=data[i*4],g=data[i*4+1],b=data[i*4+2]; creams.push([r,g,b, 0.299*r+0.587*g+0.114*b]); }
creams.sort((p,q) => p[3]-q[3]);
const hex = (c) => "#" + c.slice(0,3).map(v => Math.round(v).toString(16).padStart(2,"0")).join("");
const at = (p) => creams[Math.min(creams.length-1, Math.floor(p*creams.length))];
const creamStops = [0.08,0.3,0.5,0.72,0.94].map((p,i) => ({ offset: [0,0.3,0.55,0.75,1][i], color: hex(at(p)) }));
console.log("cream stops:", creamStops.map(s => s.offset+":"+s.color).join(" "));

// ── overlay outlines on the reference for verification ──
const SC = Math.max(1, Math.round(900 / w));
const GW = w*SC, GH = h*SC;
const ov = Buffer.alloc(GW*GH*4);
for (let gy=0; gy<GH; gy++) for (let gx=0; gx<GW; gx++) { const [r,g,b] = px(Math.floor(gx/SC), Math.floor(gy/SC)); const o=(gy*GW+gx)*4; ov[o]=r;ov[o+1]=g;ov[o+2]=b;ov[o+3]=255; }
function line(p0,p1,r,g,b){ let [x0,y0]=p0.map(v=>v*SC),[x1,y1]=p1.map(v=>v*SC); const st=Math.ceil(Math.max(Math.abs(x1-x0),Math.abs(y1-y0))); for(let i=0;i<=st;i++){const t=st?i/st:0,x=Math.round(x0+(x1-x0)*t),y=Math.round(y0+(y1-y0)*t);for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){const X=x+ox,Y=y+oy;if(X<0||Y<0||X>=GW||Y>=GH)continue;const o=(Y*GW+X)*4;ov[o]=r;ov[o+1]=g;ov[o+2]=b;ov[o+3]=255;}}}
polys.forEach((poly, i) => { const c = strips[i].kind === "photo" ? [0,210,255] : [255,0,200]; for (let k=0;k<4;k++) line(poly[k], poly[(k+1)%4], ...c); });
fs.writeFileSync(path.join(OUT, "trace-overlay.png"), encodePNG(GW, GH, ov));
console.log(`wrote trace-overlay.png (${GW}x${GH})`);

// ── photo bbox (union of photo strips) ──
const photoIdx = strips.map((s,i)=>s.kind==="photo"?i:-1).filter(i=>i>=0);
let bx0=1e9,by0=1e9,bx1=-1e9,by1=-1e9;
photoIdx.forEach(i=>polys[i].forEach(([x,y])=>{bx0=Math.min(bx0,x);by0=Math.min(by0,y);bx1=Math.max(bx1,x);by1=Math.max(by1,y);}));
const r2 = (n)=>Math.round(n*10)/10;
const photoBBox = { x:r2(bx0), y:r2(by0), w:r2(bx1-bx0), h:r2(by1-by0) };

// ── emit data ──
const stripsArr = strips.map((st,i)=>({ poly: polys[i], kind: st.kind }));
const creamGrad = { x1:0, y1:0, x2:1, y2:0.35, stops: creamStops };
const embedB64 = fs.readFileSync(EMBED).toString("base64");
const stripsJson = JSON.stringify(stripsArr);
const dataJs =
`// AUTO-GENERATED by tools/trace-mask.mjs from ${path.basename(REF)} (${w}x${h}). Do not edit.
window.MASK = {
  viewBox: { w: ${w}, h: ${h} },
  skew: ${M},
  strips: ${stripsJson},
  photoIndices: ${JSON.stringify(photoIdx)},
  photoBBox: ${JSON.stringify(photoBBox)},
  cream: ${JSON.stringify(creamGrad)},
};
window.REFERENCE_IMAGE = "data:image/png;base64,${embedB64}";
`;
fs.writeFileSync(path.join(DIR, "mask-data.js"), dataJs);

const dataTs =
`// AUTO-GENERATED by tools/trace-mask.mjs from ${path.basename(REF)} (${w}x${h}). Do not edit.
export interface MaskStrip { poly: [number, number][]; kind: "photo" | "cream"; }
export const MASK = {
  viewBox: { w: ${w}, h: ${h} },
  skew: ${M},
  strips: ${stripsJson} as MaskStrip[],
  photoIndices: ${JSON.stringify(photoIdx)},
  photoBBox: ${JSON.stringify(photoBBox)},
  cream: ${JSON.stringify(creamGrad)},
};
export const REFERENCE_IMAGE = "data:image/png;base64,${embedB64}";
`;
fs.writeFileSync(path.join(DIR, "src/lib/sliceMaskData.ts"), dataTs);
console.log("wrote mask-data.js + src/lib/sliceMaskData.ts ; photo strips:", photoIdx.join(","), " photoBBox:", JSON.stringify(photoBBox));
