/* ============================================================================
   Atom, the website: a living periodic table you can fall into.

   The page opens on the table (atom-ptable.js, the same component the app
   opens on). Pick an element and scroll: the square you picked grows into the
   whole stage, and every section below it is about that element, down to one
   of its protons and the quarks inside.

   One fixed stage behind the page, drawn by three layers:
     glA, glB   AtomGL, the same ray-marcher the app ships (atom-engines.js is
                cut out of the app by scripts/sync-from-lab.sh). Two of them,
                so one cloud can cross-fade into the next.
     glField    the gluon field: constant-width flux tubes in color charge,
                and the vacuum's fluctuating glue around them.
     overlay    a 2D canvas for nucleons, quarks, labels, sparkle and photons.
   The table has its own context and draws 118 live clouds in one pass.

   Nothing here invents physics: configurations, Slater charges, nuclear sizes
   and binding come from the app's own code (atom-data.js), clouds from
   QM.hydrogenR, the string from AtomQCD.
   ============================================================================ */
(function(){
"use strict";
var D=document, root=D.documentElement, W=0, H=0, DPR=1;
var CALM=root.classList.contains("calm");
var mqSmall=window.matchMedia("(max-width: 900px)");
var a0=QM.C.a0, R=PTable.R;

/* ------------------------------------------------------------------ theme */
var TH={
  dark:{ ink:"#f2f3f1", ink2:"#cdd1d4", ink3:"#aab0b5", acc:"#ffb020", plate:"#0b0c0d",
    q:["#ff5c6c","#3ee08a","#5f8fff"], pF:["#ffd9b0","#e0742c"], nF:["#e3e9f1","#66788f"], rim:"rgba(0,0,0,.7)",
    tube:[1.0,0.80,0.45], sea:"rgba(255,210,122,", seaB:"rgba(190,215,255,",
    sub:["#6fd3ff","#ffb020","#ff94bd","#8ee6a4"],
    gl:{pos:[0.44,0.83,1.0],neg:[1.0,0.58,0.74],posInk:[0.035,0.275,0.478],negInk:[0.518,0.075,0.302]},
    tint:{table:"#0b0a1a",cloud:"#08101a",light:"#0e0a14",empty:"#05060c",nucleus:"#140a07",proton:"#130e04",pull:"#120a03",edge:"#0c0816",bench:"#061316",end:"#0b0a1a"} },
  light:{ ink:"#101312", ink2:"#2a302d", ink3:"#3f4743", acc:"#643c00", plate:"#eceeec",
    q:["#c42f3d","#138a4c","#2a55c9"], pF:["#ffd2a6","#c25a14"], nF:["#eef2f8","#53698f"], rim:"rgba(40,44,42,.55)",
    tube:[0.62,0.40,0.02], sea:"rgba(154,98,0,", seaB:"rgba(51,67,120,",
    sub:["#09467a","#643c00","#84134d","#1d5e2c"],
    gl:{pos:[0.44,0.83,1.0],neg:[1.0,0.58,0.74],posInk:[0.035,0.275,0.478],negInk:[0.518,0.075,0.302]},
    tint:{table:"#ecebf4",cloud:"#e6edf3",light:"#eeeaf2",empty:"#eef0f3",nucleus:"#f3ece6",proton:"#f2eee2",pull:"#f3ede3",edge:"#ece8f2",bench:"#e6f1f1",end:"#ecebf4"} }
};
var theme=root.getAttribute("data-theme")==="light"?"light":"dark", T=TH[theme];
function setTheme(t){
  theme=t; T=TH[t]; root.setAttribute("data-theme",t);
  try{ localStorage.setItem("atom.site.theme",t); }catch(e){}
  var b=D.getElementById("themeBtn");
  b.textContent=t==="light"?"Dark chamber":"Light table"; b.setAttribute("aria-pressed",t==="light"?"true":"false");
  lastTint=""; drawSpectrum(); drawLadder(); drawRadial(true); drawBinding(true);
  if(PT){ PT.recolor(); PT.redraw(); readout(PT.hover||SEL); }
}
var lastTint="";
var ELTINT={dark:"#08101a",light:"#e6edf3"};
function mixHex(a,rgb,f){ var c=[parseInt(a.substr(1,2),16),parseInt(a.substr(3,2),16),parseInt(a.substr(5,2),16)];
  return "#"+c.map(function(v,i){ return Math.round(v*(1-f)+255*rgb[i]*f).toString(16).padStart(2,"0"); }).join(""); }
function tint(k){ var c=(k==="cloud"||k==="light")?ELTINT[theme]:(T.tint[k]||T.tint.end); if(c===lastTint) return; lastTint=c;
  root.style.setProperty("--bg", c); }

/* ------------------------------------------------------------------ canvases */
var cA=D.getElementById("glA"), cB=D.getElementById("glB"), cF=D.getElementById("glField"), cO=D.getElementById("overlay");
var ctx=cO.getContext("2d");
var GA=null, GB=null, FIELD=null, PT=null, WORLD=null, MS=null, SIMS=null, WLIGHT=null;
var cW=D.getElementById("world"), WL={cos:1,lit:0,vac:0}, benchVisible=false;
function resize(){
  W=window.innerWidth; H=window.innerHeight; DPR=Math.min(window.devicePixelRatio||1, mqSmall.matches?1.5:2);
  cO.width=Math.round(W*DPR); cO.height=Math.round(H*DPR); ctx.setTransform(DPR,0,0,DPR,0,0);
  placeSlot(); fitTable();
  drawSpectrum(); drawLadder(); drawRadial(true); drawBinding(true);
}
/* where the scene is centered: right of the words on a wide screen, in the
   top half on a narrow one */
function center(){ return mqSmall.matches ? [W*0.5, H*0.26] : [W*0.66, H*0.5]; }
function radius(){ return mqSmall.matches ? Math.min(W*0.5, H*0.24) : Math.min(W*0.30, H*0.42); }
function lerp(a,b,t){ return a+(b-a)*t; }
function smooth(a,b,x){ var t=Math.min(1,Math.max(0,(x-a)/(b-a))); return t*t*(3-2*t); }
function lerpLog(a,b,t){ return Math.exp(Math.log(a)+(Math.log(b)-Math.log(a))*t); }

/* ------------------------------------------------------------------ the element you are falling into */
var SEL=26, EL=null, ELV=null;
var ORB_L="spdf";
function article(name){ var n=name.toLowerCase(); return (/^[aeio]/.test(n)?"an ":"a ")+n; }
function poss(name){ return name+"’s"; }
function fmt(x,d){ return (+x).toLocaleString("en-US",{maximumFractionDigits:d===undefined?2:d,minimumFractionDigits:d===undefined?0:Math.min(d,2)}); }
function supNum(s){ var m={"-":"⁻","0":"⁰","1":"¹","2":"²","3":"³","4":"⁴","5":"⁵","6":"⁶","7":"⁷","8":"⁸","9":"⁹"};
  return String(s).split("").map(function(c){ return m[c]||c; }).join(""); }
/* an orbital to draw: n, l, m, its screened charge, and whether its subshell
   is full (then it is drawn round, which a full subshell is) */
function orbOf(n,l,m,Z,full){ return {n:n,l:l,m:m,Z:Z,full:!!full}; }
function valOrb(){ return orbOf(ELV.n,ELV.l,ELV.m,ELV.Zr,ELV.full); }
function keyOf(o){ return typeof o==="string"?o:("o"+o.n+","+o.l+","+o.m+","+o.Z.toFixed(4)+","+(o.full?1:0)); }
function orbLabel(o, html){ return PTable.orbName({n:o.n,l:o.l,m:o.m,full:o.full}, html); }
function nucleusOf(z){
  var e=ELEMENTS[z-1], A=e[16];
  return {Z:z, A:A, N:A-z, R:(A===1?0.84075:1.2*Math.pow(A,1/3))};
}

function setElement(z, quiet){
  SEL=z; EL=ELEMENTS[z-1]; ELV=PT?PT.V[z]:PTable.valence(z);
  var name=EL[2], nuc=nucleusOf(z);
  [].slice.call(D.querySelectorAll('[data-el="name"]')).forEach(function(s){ s.textContent=name; });
  [].slice.call(D.querySelectorAll('[data-el="poss"]')).forEach(function(s){ s.textContent=poss(name); });
  [].slice.call(D.querySelectorAll('[data-el="article"]')).forEach(function(s){ s.textContent=article(name); });
  [].slice.call(D.querySelectorAll('[data-el="protons"]')).forEach(function(s){ s.textContent=z===1?"hydrogen’s one proton":poss(name.toLowerCase())+" "+z+" protons"; });
  D.getElementById("fallIn").textContent="Fall into "+name.toLowerCase();
  cloudTexts(); buildPicker(); lightSetup(); emptyTexts(); nucleusTexts();
  userOrb=null; NUCC=null; bindReveal=CALM?1:Math.min(bindReveal,1);
  drawRadial(true); drawBinding(true);
  if(!quiet){ try{ history.replaceState(null,"","?el="+EL[1]+location.hash); }catch(e){} }
  WLIGHT=AtomWorld.elementLight(z);
  ELTINT={dark:mixHex("#05060c",WLIGHT.rgb,0.07), light:mixHex("#eef0ee",WLIGHT.rgb,0.10)}; lastTint="";
  if(WORLD){ WORLD.setLight(WLIGHT.lines, WLIGHT.rgb); if(!quiet) WORLD.birth(ORIGIN[z-1], performance.now()); }

  /* the whole-atom cloud costs tens of milliseconds: build it after this frame */
  setTimeout(function(){ if(front) handle(front.g,"s"+SEL); if(back) handle(back.g,"s"+SEL); }, 60);
}
function cloudTexts(){
  var v=ELV, name=EL[2], z=SEL, s0, s1, s3;
  if(z===1){
    s0="This is hydrogen&rsquo;s one electron in its ground state, 1s, computed rather than drawn: <b>ψ = R(r) · Y(θ, φ)</b>, a radial wave times a spherical one. The brightness is how likely you are to find the electron there. Hydrogen is the only atom whose equation can be solved exactly.";
    s1="The dark gaps in an orbital are <b>nodes</b>, where the wave passes through zero and the electron is never found. The ground state has none, so here hydrogen is excited to 3p: one spherical node and one flat one, n − 1 = 2 in all.";
    s3="Now put the electron in two levels at once. The phases beat and the cloud starts to <b>slosh</b>, 2.47 × 10¹⁵ times a second, slowed here about 10¹⁵ times. A sloshing charge is an antenna: this motion is what sends out hydrogen&rsquo;s ultraviolet Lyman-α light.";
  } else {
    var nr=v.n-v.l-1;
    s0="This is "+poss(name.toLowerCase())+" <b>"+PTable.orbName(v,true)+"</b> orbital, computed rather than drawn: <b>ψ = R(r) · Y(θ, φ)</b>. It holds the electron that puts "+name.toLowerCase()+" in the "+ORB_L[v.l]+" block"+
      (v.full?", and that subshell is full, so it is perfectly round":"")+". The other "+(z-1)+" electron"+(z>2?"s":"")+" screen the nucleus, so it feels a charge of about <b>"+fmt(v.Ze,2)+"</b>, not "+z+" (Slater&rsquo;s rules).";
    s1="The dark gaps are <b>nodes</b>, where the wave passes through zero and the electron is never found. A "+v.n+ORB_L[v.l]+" orbital has "+nr+" spherical node"+(nr===1?"":"s")+" and "+v.l+" through the middle, n − 1 = "+(v.n-1)+" in all"+
      (v.full&&v.l>0?". In a full subshell the flat ones cancel out, which is why it is round.":".");
    s3="Now every electron at once: <b>"+z+"</b> of them, in shells of "+shellsOf(z).join(", ")+". Each subshell is a hydrogen-like cloud with its own screened charge, and together they make the atom&rsquo;s layered glow. The brightness here is logarithmic: the innermost shell is thousands of times denser than the outermost.";
  }
  D.getElementById("cs0").innerHTML=s0; D.getElementById("cs1").innerHTML=s1; D.getElementById("cs3").innerHTML=s3;
}
var userOrb=null, userStep=-1;
function buildPicker(){
  var box=D.getElementById("orbPicker"), list=[];
  if(SEL===1) list=[orbOf(1,0,0,1),orbOf(2,1,0,1),orbOf(3,2,0,1),orbOf(4,3,0,1)];
  else configOf(SEL).forEach(function(c){
    var n=c[0], l=c[1], k=c[2], isV=(n===ELV.n&&l===ELV.l);
    list.push(orbOf(n,l,isV?ELV.m:0,zRad(SEL,n,l),l>0&&k===2*(2*l+1)));
  });
  box.innerHTML="";
  list.forEach(function(o){ var b=D.createElement("button"); b.type="button"; b.innerHTML=o.n+ORB_L[o.l];
    b.setAttribute("aria-pressed","false"); b._o=o;
    b.addEventListener("click",function(){ userOrb=o; userStep=cloudStep;
      if(active!=="cloud"){ var c=D.getElementById("cloud"); window.scrollTo({top:c.offsetTop+H*0.1, behavior:CALM?"auto":"smooth"}); userStep=0; } });
    box.appendChild(b); });
}

/* ------------------------------------------------------------------ clouds, cached per state */
var CACHE={};
function handle(g, o){
  var k=keyOf(o)+"@"+(g===GA?"A":"B");
  if(CACHE[k]) return CACHE[k];
  var h, H1=function(n,l,m){ return [{n:n,l:l,m:m,Z:1,w:1}]; };
  if(typeof o==="string" && o.charAt(0)==="s" && o!=="shine"){
    var z=+o.slice(1), spec=[];
    configOf(z).forEach(function(c){ var n=c[0], l=c[1], w=c[2], zr=zRad(z,n,l); for(var m=-l;m<=l;m++) spec.push({n:n,l:l,m:m,Z:zr,w:w/(2*l+1)}); });
    h=g.makeCloud(spec,"shells",R,null,{range:5000});
  }
  else if(o==="shine") h=g.makeCloud(H1(2,1,0),"single",R,{n:1,l:0,m:0,Z:1,amp:0.62});
  else if(typeof o==="string" && o.indexOf("emit")===0){ var nu=+o.slice(4); h=g.makeCloud(H1(nu,2,0),"single",R,{n:2,l:1,m:0,Z:1,amp:0.7}); }
  else h=g.makeCloud([{n:o.n,l:o.l,m:o.m,Z:o.Z,w:1}],"single",R,null,{sphere:o.full});
  CACHE[k]=h; return h;
}
var front=null, back=null, curKey="";
function showCloud(o){
  var k=keyOf(o); if(k===curKey||!front) return;
  curKey=k;
  if(!back){ front.h=handle(front.g,o); return; }
  back.h=handle(back.g,o);
  var t=front; front=back; back=t;
  front.c.style.opacity="1"; back.c.style.opacity="0";
}

/* ------------------------------------------------------------------ sparkle: sampled measurements */
var SAMPLES={};
function samples(o){
  if(typeof o==="string") return null;
  var k=keyOf(o); if(SAMPLES[k]) return SAMPLES[k];
  var n=o.n, l=o.l, m=o.m, Z=o.Z, al=o.full?0:l, M=1600, rmax=(3.6*n*n+22)/Z, cdf=new Float64Array(M+1), i, tot=0;
  for(i=1;i<=M;i++){ var r=(i-0.5)*rmax/M, v=R(n,l,r,Z); tot+=r*r*v*v; cdf[i]=tot; }
  var out=new Float32Array(3*2600), sg=new Int8Array(2600), seed=n*977+l*131+m*17+Math.round(Z*100)+5;
  function rnd(){ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; }
  for(var s=0;s<2600;s++){
    var u=rnd()*tot, lo=0, hi=M; while(hi-lo>1){ var mid=(lo+hi)>>1; if(cdf[mid]<u) lo=mid; else hi=mid; }
    var rr=(lo+rnd())*rmax/M, x,y,z,Y,tries=0;
    do{ var ct=2*rnd()-1, ph=6.2832*rnd(), st=Math.sqrt(1-ct*ct); x=st*Math.cos(ph); y=st*Math.sin(ph); z=ct;
        Y=AtomGL.Yc(al,al?m:0,x,y,z); tries++; }while(Y*Y<rnd()*0.6*(al?1:0.08) && tries<60);
    out[s*3]=x*rr; out[s*3+1]=y*rr; out[s*3+2]=z*rr; sg[s]=(Y*R(n,l,rr,Z))<0?-1:1;
  }
  SAMPLES[k]={p:out,s:sg}; return SAMPLES[k];
}

/* ------------------------------------------------------------------ the gluon field */
var FS=[
"#version 300 es","precision highp float;","out vec4 o;",
"uniform vec2 uC;uniform float uK,uT,uW,uTube,uVac;uniform int uN,uLight;",
"uniform vec2 uA[6];uniform vec2 uB[6];uniform vec3 uCol[6];uniform vec3 uTubeCol;",
"float h(vec3 p){p=fract(p*0.3183099+.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}",
"float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);",
" return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),",
"            mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}",
"float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*n3(p);p*=2.03;a*=.5;}return s;}",
"vec3 wheel(float h){vec3 w=0.5+0.5*cos(h+vec3(0.,2.0943951,4.1887902));return clamp((w-0.5)*1.5+0.5,0.,1.);}",
"void main(){",
" vec2 p=(gl_FragCoord.xy-uC)/uK;",
" float d=1e9,tt=0.;vec3 qc=uTubeCol;",
" for(int i=0;i<6;i++){if(i>=uN)break;vec2 pa=p-uA[i],ba=uB[i]-uA[i];float t=clamp(dot(pa,ba)/max(dot(ba,ba),1e-6),0.,1.);",
"  float dd=length(pa-ba*t);if(dd<d){d=dd;tt=t;qc=uCol[i];}}",
" float tube=exp(-(d*d)/(uW*uW)), core=exp(-(d*d)/(uW*uW*.16));",
/* each leg carries its quark's color charge, fading to neutral at the junction */
" vec3 tc=mix(uTubeCol,qc,smoothstep(0.15,0.95,tt));",
/* the vacuum's fluctuating glue, suppressed inside the tube, in every color charge */
" float v=fbm(vec3(p*3.6,uT*.10)), v2=fbm(vec3(p*1.1+7.,uT*.06));",
" float vac=smoothstep(.58,.97,v)*uVac*0.85*(1.-min(1.,tube*1.5));",
" vec3 vc=wheel(v2*9.+uT*.2);",
" float a=clamp(tube*uTube*.85+core*uTube*.4+vac*.8,0.,1.);",
" vec3 c;",
" if(uLight==1){ c=mix(vc*0.42,tc*0.62,clamp(tube*uTube*1.6,0.,1.))*a; }",
" else { c=min(tc*(tube*.9+core*.8)*uTube+vc*vac*.8+vec3(core*uTube*.25), vec3(a)); }",
" o=vec4(c,a);}"
].join("\n");
function makeField(canvas){
  var gl=null; try{ gl=canvas.getContext("webgl2",{premultipliedAlpha:true,alpha:true,antialias:false}); }catch(e){}
  if(!gl||typeof gl.createShader!=="function") return null;
  function sh(t,s){ var x=gl.createShader(t); gl.shaderSource(x,s); gl.compileShader(x);
    if(!gl.getShaderParameter(x,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; }
  var pr;
  try{
    pr=gl.createProgram();
    gl.attachShader(pr,sh(gl.VERTEX_SHADER,"#version 300 es\nin vec2 p;void main(){gl_Position=vec4(p,0.,1.);}"));
    gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS)); gl.bindAttribLocation(pr,0,"p"); gl.linkProgram(pr);
    if(!gl.getProgramParameter(pr,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
  }catch(err){ return null; }
  var L={}; ["uC","uK","uT","uW","uTube","uVac","uN","uLight","uA","uB","uCol","uTubeCol"].forEach(function(k){ L[k]=gl.getUniformLocation(pr,k); });
  var vao=gl.createVertexArray(); gl.bindVertexArray(vao);
  var vb=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,vb);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  var scale=1;
  function rgb(hx){ return [parseInt(hx.substr(1,2),16)/255,parseInt(hx.substr(3,2),16)/255,parseInt(hx.substr(5,2),16)/255]; }
  return {
    draw:function(o){
      var s=Math.min(DPR,1.5)*scale, w=Math.round(W*s), h=Math.round(H*s);
      if(canvas.width!==w||canvas.height!==h){ canvas.width=w; canvas.height=h; }
      gl.viewport(0,0,w,h); gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT);
      if(o.alpha<=0.01) return;
      gl.useProgram(pr); gl.bindVertexArray(vao);
      var A=new Float32Array(12), B=new Float32Array(12), C=new Float32Array(18), n=Math.min(6,o.segs.length);
      for(var i=0;i<n;i++){ var sg=o.segs[i]; A[i*2]=sg[0]; A[i*2+1]=sg[1]; B[i*2]=sg[2]; B[i*2+1]=sg[3];
        var cc=rgb(T.q[sg[4]||0]); C[i*3]=cc[0]; C[i*3+1]=cc[1]; C[i*3+2]=cc[2]; }
      gl.uniform2fv(L.uA,A); gl.uniform2fv(L.uB,B); gl.uniform3fv(L.uCol,C); gl.uniform1i(L.uN,n);
      gl.uniform2f(L.uC,o.cx*s,(H-o.cy)*s); gl.uniform1f(L.uK,o.k*s); gl.uniform1f(L.uT,o.t);
      gl.uniform1f(L.uW,o.w); gl.uniform1f(L.uTube,o.tube*o.alpha); gl.uniform1f(L.uVac,o.vac*o.alpha);
      gl.uniform1i(L.uLight,theme==="light"?1:0); gl.uniform3fv(L.uTubeCol,T.tube);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA); gl.drawArrays(gl.TRIANGLES,0,3);
    },
    clear:function(){ gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT); },
    govern:function(ms){ if(ms>26&&scale>0.5) scale*=0.92; else if(ms<14&&scale<1) scale=Math.min(1,scale*1.02); }
  };
}

/* ------------------------------------------------------------------ the proton and the pull */
var Q=AtomQCD.C;
var PULL={on:false,idx:0,q:[0,0],v:[0,0],drag:false,hold:0,broken:null,pairs:0,S:null,restL:0,flav:["u","u","d"]};
function restQuarks(t){
  var o=[], j, rm=CALM?0:1;
  for(j=0;j<3;j++){ var a=Math.PI/2+j*2.0944+rm*0.25*Math.sin(t*0.31), r=0.40+rm*0.035*Math.sin(t*2.7+j*2.1);
    o.push([r*Math.cos(a), r*Math.sin(a)]); }
  return o;
}
function quarks(t){
  var q=restQuarks(t); if(PULL.on&&!PULL.broken) q[PULL.idx]=PULL.q.slice();
  return {q:q, S:AtomQCD.state(q.map(function(a){ return [a[0],a[1],0]; }))};
}
function stepPull(now){
  if(!PULL.on) return;
  if(PULL.broken){ if((now-PULL.broken.t0)/1000>(CALM?2:3.2)){ PULL.on=false; PULL.broken=null; Sound.humStop(); } return; }
  var qs=quarks(now/1000); PULL.S=qs.S;
  if(qs.S.legs[PULL.idx]>Q.rBreak){ snap(now,qs); return; }
  if(PULL.hold>0){ PULL.hold--; return; }
  if(!PULL.drag){
    var rest=restQuarks(now/1000)[PULL.idx];
    PULL.v[0]=PULL.v[0]*0.74+(rest[0]-PULL.q[0])*0.12; PULL.v[1]=PULL.v[1]*0.74+(rest[1]-PULL.q[1])*0.12;
    if(CALM){ PULL.q=rest.slice(); PULL.v=[0,0]; }
    PULL.q[0]+=PULL.v[0]; PULL.q[1]+=PULL.v[1];
    if(Math.hypot(rest[0]-PULL.q[0],rest[1]-PULL.q[1])<0.004&&Math.hypot(PULL.v[0],PULL.v[1])<0.002){ PULL.on=false; Sound.humStop(); }
  }
}
function snap(now,qs){
  var S=qs.S, i=PULL.idx, J=S.J, q=qs.q[i], dx=q[0]-J[0], dy=q[1]-J[1], d=Math.hypot(dx,dy)||1;
  var pair=(PULL.pairs++%2===0)?"d":"u", res=AtomQCD.snap(PULL.flav,i,pair);
  PULL.broken={t0:now,dir:[dx/d,dy/d],at:[q[0],q[1]],res:res,pair:pair,restAt:restQuarks(now/1000)[i]};
  PULL.drag=false; PULL.hold=0;
  D.getElementById("pReact").textContent=res.text;
  D.getElementById("pNote").textContent="It snapped at "+d.toFixed(2)+" fm. The string held "+(Q.sigma*d).toFixed(2)+
    " GeV, enough to make a "+pair+" quark and its antiquark out of the vacuum. The antiquark left with the quark you pulled ("+
    res.meson+", "+res.mesonQuarks+"), and the new quark took its place ("+res.after+", "+res.baryonQuarks+"). Charge in, charge out, the same.";
  Sound.snap(); Sound.humStop(); if(MS) MS.signal("snap");
  var hp=hit("pull"); if(hp) hp.classList.remove("dragging");
  flash=now;
}
var flash=-1e9;
function pullReadout(){
  var S=PULL.S||quarks(performance.now()/1000).S;
  var leg=S.legs[PULL.idx], E=PULL.on?Math.max(0,Q.sigma*(S.L-(PULL.restL||S.L))):0, left=Math.max(0,Q.rBreak-leg);
  set("pLeg",leg.toFixed(2)+" fm"); set("pE",E.toFixed(2)+" GeV"); set("pF",Q.tonnes.toFixed(1)+" tonnes");
  set("pLeft",PULL.broken?"broken":left.toFixed(2)+" fm");
  D.getElementById("pLeft").classList.toggle("hot",!PULL.broken&&left<0.2);
  if(PULL.on&&!PULL.broken) Sound.humSet(E);
}
var lastSet={};
function set(id,v){ if(lastSet[id]===v) return; lastSet[id]=v; var e=D.getElementById(id); if(e) e.textContent=v; }

/* ------------------------------------------------------------------ the element's light
   Three cases. Hydrogen: computed, the Rydberg formula, with the emission
   acted out (excited state, sloshing superposition, photon). An element with
   measured lines in Atom's table: those, from NIST, lit one at a time. Any
   other: hydrogen's, shown as hydrogen's, because it is the one atom whose
   spectrum is exact arithmetic. */
var RH=QM.C.Rinf/(1+QM.C.me/QM.C.mp);
function lam(nu,nl){ return 1e9/(RH*(1/(nl*nl)-1/(nu*nu))); }
var LINES={}, EM=null, ATOMSTATE=[2,1,0], LMODE="h", ELINES=[], LIT={}, LORDER=[];
var LNOTE={
  2:"Helium was found in these lines in the Sun&rsquo;s light in 1868, before anyone found it on Earth.",
  3:"The strong red line is the crimson of a lithium flame.",
  8:"The green line at 558 nm is the aurora. It is a &lsquo;forbidden&rsquo; transition, so slow that only the thin upper air lets it shine.",
  10:"This crowd of red and orange lines is the color of a neon sign.",
  11:"The yellow pair at 589 nm is why old street lamps glowed orange.",
  12:"The green triplet near 518 nm is one of the strongest features in the Sun&rsquo;s spectrum.",
  19:"A potassium flame is lilac: a violet pair near 404 nm, and a red pair at the edge of sight.",
  20:"The two violet lines at 393 and 397 nm, from the calcium ion, are among the darkest gaps in the Sun&rsquo;s spectrum.",
  26:"Iron has thousands of lines and the Sun&rsquo;s spectrum is crowded with them. These are a few of the strongest visible ones.",
  29:"The green lines are the green of a copper flame.",
  36:"From 1960 to 1983 the meter itself was defined by an orange line of krypton-86.",
  37:"Rubidium is named for its deep red light, from the Latin rubidus.",
  49:"Indium is named for its indigo line.",
  55:"Caesium is named for the sky blue of these two lines, from the Latin caesius.",
  80:"These violet, blue and green lines light every fluorescent tube; the coating turns mercury&rsquo;s ultraviolet into white.",
  81:"Thallium is named for its green line, from the Greek thallos, a green shoot."
};
function lightSetup(){
  var L=PTable.lineList(SEL), name=EL[2];
  ELINES=[]; if(SEL!==1 && L) ELINES=L.lines.filter(function(p){ return p[0]>=380&&p[0]<=780; }).sort(function(a,b){ return a[0]-b[0]; });
  LMODE = SEL===1 ? "h" : (ELINES.length ? "lines" : "ref");
  LORDER=ELINES.map(function(p,i){ return i; }).sort(function(a,b){ return ELINES[b][1]-ELINES[a][1]; });
  LINES={}; LIT={}; EM=null; ATOMSTATE=[2,1,0];
  D.getElementById("spectrograph").classList.toggle("noladder", LMODE==="lines");
  var intro, eq, fine;
  if(LMODE==="lines"){
    intro="Heat "+name.toLowerCase()+" or run a current through it and it glows in exactly these colors, the same everywhere in the universe. That is how we know what the stars are made of. Each line is one electron dropping between two levels, and the photon carries away the difference. "+(LNOTE[SEL]||"");
    eq="E = hc / λ";
    fine="Measured lines from the NIST Atomic Spectra Database, converted from air to vacuum wavelengths. With more than one electron, the electrons repel each other and the Schrödinger equation has no exact solution, so these are measured, not computed."+
      ((SEL===20||SEL===38||SEL===56)?" Some belong to the singly charged ion, which flames and lamps excite too.":"");
  } else {
    intro=(LMODE==="ref"?"Every element glows in its own set of colors. Atom doesn&rsquo;t carry "+poss(name.toLowerCase())+" measured lines yet, so here is hydrogen, the one atom whose spectrum is exact arithmetic. ":"")+
      "Drop hydrogen&rsquo;s electron from level 3 to level 2 and the energy leaves as one photon of red light. For a one-electron atom that is the Rydberg formula, and every line below is computed from it:";
    eq="1/λ = R<sub>H</sub> (1/n₁² − 1/n₂²)";
    fine="Computed for Hα: 656.470 nm. Measured by the US National Institute of Standards and Technology (NIST): 656.463 nm. The seven picometers in between are physics the formula leaves out: relativity, the electron&rsquo;s spin, and quantum electrodynamics (QED). In 2026 hydrogen tested the Standard Model to better than a part per trillion.";
  }
  D.getElementById("lightIntro").innerHTML=intro; D.getElementById("lightEq").innerHTML=eq; D.getElementById("lightFine").innerHTML=fine;
  var wl=AtomWorld.elementLight(SEL);
  D.getElementById("ringNote").textContent= wl.lines.length ?
    "The page is lit by "+poss(name.toLowerCase())+" own light, and the rings around the atom are its lines, spread out by wavelength the way a diffraction grating spreads them: violet nearest, red farthest." :
    "Atom has no measured lines for "+name.toLowerCase()+", so the page is lit instead by the colors of the places that made it.";
  set("lineReadout", LMODE==="lines"?"Scroll, or press the button. Each line appears where "+poss(name.toLowerCase())+" electrons put it.":"Scroll, or press the button. Each fall from a higher level adds a line where the formula says it must be.");
  D.getElementById("lightEq").setAttribute("aria-label", LMODE==="lines"?"E equals h c over lambda":"one over lambda equals R H times the quantity one over n one squared minus one over n two squared");
  drawSpectrum(); drawLadder();
}
function wl2rgb(w){
  if(w<380||w>780) return null;
  return PTable.wlColor(w);
}
var spec=D.getElementById("spectrum"), lad=D.getElementById("ladder");
function fitc(c){ var r=c.getBoundingClientRect(), d=Math.min(window.devicePixelRatio||1,2);
  var w=Math.max(1,Math.round(r.width*d)), h=Math.max(1,Math.round(r.height*d));
  if(c.width!==w||c.height!==h){ c.width=w; c.height=h; }
  var g=c.getContext("2d"); g.setTransform(d,0,0,d,0,0); return {g:g,w:r.width,h:r.height}; }
var SX={};
function drawSpectrum(){
  if(!spec||!EL) return; var f=fitc(spec), g=f.g, w=f.w, h=f.h, light=theme==="light";
  g.fillStyle=light?"#ffffff":"#000000"; g.fillRect(0,0,w,h);
  var x0=8, x1=w-8, X=function(l){ return x0+(l-380)/(780-380)*(x1-x0); }, top=8, bot=h-34;
  for(var l=380;l<780;l+=2){ g.fillStyle=wl2rgb(l); g.globalAlpha=light?0.55:0.30; g.fillRect(X(l),bot+4,Math.max(1,X(l+2)-X(l)),8); }
  g.globalAlpha=1;
  function line(lw,a,bright){ var c=wl2rgb(lw);
    if(!light && c){ g.globalAlpha=a*0.35; g.fillStyle=c; g.fillRect(X(lw)-6,top,12,bot-top); }
    g.fillStyle=light?T.ink:(c||T.ink3); g.globalAlpha=a; var bw=bright>0.7?4:(bright>0.4?3:2); g.fillRect(X(lw)-bw/2,top,bw,bot-top); }
  if(LMODE==="lines"){ for(var i in LIT){ var p=ELINES[+i]; line(p[0],Math.min(1,0.4+0.6*p[1]),p[1]); } }
  else for(var k in LINES){ line(+k,Math.min(1,0.45+0.25*LINES[k]),1); }
  g.globalAlpha=1; g.fillStyle=T.ink2; g.font="500 14px Archivo, sans-serif"; g.textAlign="center";
  var ticks=w<420?[400,500,600,700]:[400,450,500,550,600,650,700,750];
  ticks.forEach(function(t,i){ g.fillText(t+(i<ticks.length-1&&w<420?"":(i===ticks.length-1?" nm":"")),X(t),h-6); });
  var r=spec.getBoundingClientRect(); SX={y:r.top+top+(bot-top)/2, X:function(l){ return r.left+X(l); }};
}
function drawLadder(){
  if(!lad||LMODE==="lines") return; var f=fitc(lad), g=f.g, w=f.w, h=f.h;
  g.clearRect(0,0,w,h);
  var top=24, bot=h-26, tight=w<110, bw=tight?w-60:w*0.5, sp=tight?"=":" = ";
  for(var n=1;n<=6;n++){
    var y=bot-(bot-top)*(1-1/(n*n)), on=(ATOMSTATE[0]===n);
    g.fillStyle=on?T.acc:T.ink3; g.fillRect(4,y,bw,on?3:1.5);
    if(n<=3||n===6){ g.fillStyle=on?T.ink:T.ink2; g.font=(on?"700 ":"500 ")+(tight?"13px":"14px")+" Archivo, sans-serif"; g.textAlign="left";
      g.fillText(n===6?(ATOMSTATE[0]>3?"n"+sp+ATOMSTATE[0]:(tight?"n=4–6":"n = 4, 5, 6")):"n"+sp+n, bw+10, n===6?y-6:y+5); }
  }
}
function emit(nu){
  ATOMSTATE=[nu,2,0]; drawLadder();
  EM={nu:nu, t0:performance.now(), phase:CALM?2:0, lam:lam(nu,2)};
  if(CALM){ landLine(EM); EM=null; ATOMSTATE=[2,1,0]; drawLadder(); return; }
  set("lineReadout","Excited to n = "+nu+". Now it is in two states at once, and sloshing…");
}
function emitMeasured(i){
  var p=ELINES[i], now=performance.now();
  EM={idx:i, lam:p[0], t0:now, t1:now, phase:2, measured:true};
  if(CALM){ landLine(EM); EM=null; }
}
function nextMeasured(){
  for(var j=0;j<LORDER.length;j++) if(!LIT[LORDER[j]]) return LORDER[j];
  return LORDER.length?LORDER[Math.floor(Math.random()*LORDER.length)]:-1;
}
function landLine(e){
  if(e.measured){
    LIT[e.idx]=(LIT[e.idx]||0)+1; drawSpectrum();
    set("lineReadout",e.lam.toFixed(2)+" nm: E = hc/λ = "+(1239.84198/e.lam).toFixed(3)+" eV. "+(Object.keys(LIT).length)+" of "+poss(EL[2].toLowerCase())+" "+ELINES.length+" visible lines here.");
  } else {
    var key=e.lam.toFixed(2); LINES[key]=(LINES[key]||0)+1; drawSpectrum();
    var names={3:"Hα",4:"Hβ",5:"Hγ",6:"Hδ"};
    set("lineReadout",(names[e.nu]||"")+": n = "+e.nu+" → 2 emits "+e.lam.toFixed(2)+" nm, "+
        (13.6057*(1/4-1/(e.nu*e.nu))).toFixed(3)+" eV. Every hydrogen atom in the universe gives exactly this line.");
  }
  Sound.tone(e.lam);
}
/* the emission, in three acts: the excited state; the superposition that
   sloshes at the line's frequency (the photon leaves); the lower state */
function stepEmit(now){
  if(!EM) return;
  var dt=(now-EM.t0)/1000;
  if(EM.phase===0 && dt>0.6){ EM.phase=1; }
  if(EM.phase===1 && dt>1.8){ EM.phase=2; EM.t1=now; ATOMSTATE=[2,1,0]; drawLadder(); }
  if(EM.phase===2 && (now-EM.t1)/1000>0.9){ landLine(EM); EM=null; }
}

/* ------------------------------------------------------------------ the emptiness and the nucleus, in numbers */
function emptyTexts(){
  var name=EL[2], nuc=nucleusOf(SEL), r=ARAD[SEL-1], txt;
  if(r){
    var ratio=r*1e-12/(nuc.R*1e-15), across=0.015*ratio, fields=Math.max(1,Math.round(across/100));
    txt="Keep falling, into "+name.toLowerCase()+". Its atom is about "+fmt(2*r,0)+" picometers across. Its nucleus is "+fmt(2*nuc.R,1)+
      " femtometers, "+fmt(Math.round(ratio/100)*100,0)+" times smaller. Make the nucleus a marble and the atom would be "+fmt(Math.round(across/10)*10,0)+" meters wide, about "+fields+" football field"+(fields>1?"s":"")+" end to end.";
    var frac=Math.pow(nuc.R*1e-15/(r*1e-12),3);
    set("emptyStat",((1-frac)*100).toFixed(12)+" %");
  } else {
    txt="Keep falling, into "+name.toLowerCase()+". Nobody has made enough of it to measure how big its atom is, but its nucleus is about "+fmt(2*nuc.R,1)+" femtometers across, and the cloud around it is tens of thousands of times wider.";
    set("emptyStat","Almost all");
  }
  D.getElementById("emptyText").textContent=txt;
}
function nucleusTexts(){
  var e=EL, nuc=nucleusOf(SEL), name=e[2], txt, eq, h2;
  var meas=BA_MEAS[SEL+"-"+nuc.A];
  if(nuc.A===1){
    h2="One proton, and nothing else";
    txt="Hydrogen&rsquo;s nucleus is a single proton: no neutrons and no binding energy, nothing to hold together. Every heavier nucleus is held by the strong nuclear force, which reaches only about one nucleon&rsquo;s width.";
    eq="r<sub>p</sub> = 0.84075 fm, measured";
  } else {
    var S=PTable.semfTerms(SEL,nuc.A), B=meas?meas*nuc.A:S.B;
    h2="A force you never feel";
    txt="<b>"+nuc.A+"</b> nucleons: <b>"+SEL+"</b> proton"+(SEL>1?"s":"")+" that push each other apart and <b>"+nuc.N+"</b> neutron"+(nuc.N===1?"":"s")+", held together by the strong nuclear force, which reaches only about one nucleon&rsquo;s width. Building "+name.toLowerCase()+"-"+nuc.A+" releases <b>"+fmt(B,1)+" MeV</b>"+
      (meas?" (measured)":" (liquid-drop formula)")+", so it weighs less than its loose parts by exactly that much: E = mc².";
    if(isMagic(SEL)&&isMagic(nuc.N)) txt+=" Both "+SEL+" and "+nuc.N+" are <b>magic numbers</b>, closed nuclear shells, so this nucleus is doubly magic.";
    else if(isMagic(SEL)||isMagic(nuc.N)) txt+=" "+(isMagic(SEL)?SEL:nuc.N)+" is a <b>magic number</b>, a closed nuclear shell.";
    eq="B = a<sub>V</sub>A − a<sub>S</sub>A<sup>2/3</sup> − a<sub>C</sub>Z(Z−1)/A<sup>1/3</sup> − a<sub>A</sub>(A−2Z)²/A "+(S.d>=0?"+":"−")+" δ<br>= "+
      fmt(S.v,1)+" − "+fmt(S.s,1)+" − "+fmt(S.c,1)+" − "+fmt(S.a,1)+" "+(S.d>=0?"+":"−")+" "+fmt(Math.abs(S.d),1)+" = <b>"+fmt(S.B,1)+" MeV</b>";
  }
  D.getElementById("t-nucleus").textContent=h2; D.getElementById("nucText").innerHTML=txt; D.getElementById("nucEq").innerHTML=eq;
}

/* ------------------------------------------------------------------ plots */
var radial=D.getElementById("radial"), curOrbForPlot="", lastPlotOrb=null;
function drawRadial(force, o){
  if(!radial||!EL) return; o=o||lastPlotOrb; if(!o) return;
  var k=keyOf(o)+"|"+theme; if(!force&&k===curOrbForPlot) return; curOrbForPlot=k; lastPlotOrb=o;
  var f=fitc(radial), g=f.g, w=f.w, h=f.h, shells=(typeof o==="string"&&o!=="shine"), states=[];
  g.clearRect(0,0,w,h);
  if(o==="shine") states=[{n:2,l:1,Z:1,w:1},{n:1,l:0,Z:1,w:1}];
  else if(shells) configOf(SEL).forEach(function(c){ states.push({n:c[0],l:c[1],Z:zRad(SEL,c[0],c[1]),w:c[2]}); });
  else states=[{n:o.n,l:o.l,Z:o.Z,w:1}];
  var rmax=0; states.forEach(function(s){ rmax=Math.max(rmax,(3.2*s.n*s.n+8)/s.Z); });
  var M=320, X=shells?function(r){ return w*Math.sqrt(r/rmax); }:function(r){ return w*r/rmax; }, pkAll=0, curves=[];
  states.forEach(function(s){ var ys=[], pk=0; for(var i=0;i<=M;i++){ var u=i/M, r=shells?rmax*u*u:rmax*u, v=R(s.n,s.l,r,s.Z), p=s.w*r*r*v*v*(shells?2*Math.sqrt(r*rmax):1); ys.push([r,p]); if(p>pk) pk=p; }
    curves.push(ys); if(pk>pkAll) pkAll=pk; });
  states.forEach(function(s,si){
    var ys=curves[si], col=T.sub[s.l]||T.ink2;
    g.beginPath(); g.moveTo(0,h-18);
    ys.forEach(function(q){ g.lineTo(X(q[0]), h-18-(q[1]/pkAll)*(h-30)); });
    g.lineTo(w,h-18); g.closePath(); g.fillStyle=col; g.globalAlpha=theme==="light"?0.16:0.2; g.fill(); g.globalAlpha=1;
    g.strokeStyle=col; g.lineWidth=2; g.beginPath();
    ys.forEach(function(q,i){ var x=X(q[0]), y=h-18-(q[1]/pkAll)*(h-30); if(i===0) g.moveTo(x,y); else g.lineTo(x,y); });
    g.stroke();
  });
  g.fillStyle=T.ink2; g.font="500 13px Archivo, sans-serif"; g.textAlign="left";
  g.fillText(shells?"P(r) for each subshell, distance on a square-root scale":"P(r) = r²R(r)², how far from the nucleus", 0, h-2);
  g.textAlign="right"; g.fillText(fmt(rmax*52.92,0)+" pm", w, h-2);
}
var bind=D.getElementById("bindingCurve"), bindReveal=CALM?1:0;
function drawBinding(force){
  if(!bind||!EL) return;
  var f=fitc(bind), g=f.g, w=f.w, h=f.h, pl=40, pb=26, pt=10, pr=12, Wp=w-pl-pr, Hp=h-pt-pb, Amax=300;
  var X=function(A){ return pl+Wp*A/Amax; }, Y=function(b){ return pt+Hp*(1-b/10.5); };
  g.clearRect(0,0,w,h);
  g.fillStyle=T.ink3; g.fillRect(pl,pt+Hp,Wp,1.5); g.fillRect(pl,pt,1.5,Hp);
  g.fillStyle=T.ink2; g.font="500 13px Archivo, sans-serif"; g.textAlign="right";
  [0,4,8].forEach(function(b){ g.fillText(b+"",pl-6,Y(b)+4); }); g.textAlign="center";
  [50,100,150,200,250,300].forEach(function(A){ g.fillText(A+"",X(A),h-6); });
  var lim=bindReveal*Amax;
  g.lineWidth=3; g.beginPath(); var first=true;
  BINDING.semf.forEach(function(p){ if(p[0]<16||p[0]>lim) return; if(first){ g.moveTo(X(p[0]),Y(p[1])); first=false; } else g.lineTo(X(p[0]),Y(p[1])); });
  g.strokeStyle=theme==="light"?"#09467a":"#6fd3ff"; g.stroke();
  BINDING.measured.forEach(function(p){ if(p[0]>lim) return; g.fillStyle=T.acc; g.beginPath(); g.arc(X(p[0]),Y(p[1]),3.2,0,6.2832); g.fill(); });
  var nuc=nucleusOf(SEL), A=nuc.A, meas=BA_MEAS[SEL+"-"+A], ba=A===1?0:(meas||PTable.semfTerms(SEL,A).B/A);
  var marks=[[A,EL[2].toLowerCase()+"-"+A,ba,true]];
  if(SEL!==26) marks.push([56,"iron-56",8.79,false]);
  var clash=marks.length>1 && Math.abs(X(marks[0][0])-X(56))<110;   /* two labels that would overprint: one goes below */
  marks.forEach(function(m,mi){
    if(m[0]>lim) return; var x=X(m[0]), y=Y(m[2]);
    g.fillStyle=m[3]?T.ink:T.ink2; g.beginPath(); g.arc(x,y,m[3]?6:4,0,6.2832); g.fill();
    if(m[3]){ g.strokeStyle=T.ink; g.lineWidth=1.5; g.beginPath(); g.arc(x,y,10,0,6.2832); g.stroke(); }
    var right=m[0]>Amax*0.7; g.textAlign=right?"right":"left"; g.font=(m[3]?"700 14px":"600 13px")+" Archivo, sans-serif";
    g.fillText(m[1],x+(right?-14:14),(clash&&mi===1)?y+22:y-(m[3]?12:9)); });
}

/* ------------------------------------------------------------------ sound: off until asked */
var Sound=(function(){
  var on=false, ac=null, master=null, hum=null, humG=null, humF=null;
  function ensure(){ if(ac) return; var C=window.AudioContext||window.webkitAudioContext; if(!C) return;
    ac=new C(); master=ac.createGain(); master.gain.value=0.5; master.connect(ac.destination); }
  return {
    toggle:function(){ on=!on; if(on){ ensure(); if(ac&&ac.state==="suspended") ac.resume(); } else this.humStop(); return on; },
    /* a spectral line as a pitch: 380 to 780 nm onto two octaves, red low, violet high */
    tone:function(lamNm){ if(!on||!ac) return; var f=220*Math.pow(4,(780-lamNm)/400), t=ac.currentTime;
      var o=ac.createOscillator(), g=ac.createGain(); o.type="sine"; o.frequency.value=f;
      g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.32,t+0.02); g.gain.exponentialRampToValueAtTime(0.001,t+1.6);
      o.connect(g); g.connect(master); o.start(t); o.stop(t+1.7); },
    /* a tile under the pointer: a soft tick, higher for heavier elements */
    tick:function(z){ if(!on||!ac) return; var t=ac.currentTime, o=ac.createOscillator(), g=ac.createGain();
      o.type="triangle"; o.frequency.value=330*Math.pow(2,z/48); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.07,t+0.005); g.gain.exponentialRampToValueAtTime(0.001,t+0.18);
      o.connect(g); g.connect(master); o.start(t); o.stop(t+0.2); },
    /* the string's tension as a low hum that rises with the energy stored in it */
    humSet:function(E){ if(!on||!ac) return;
      if(!hum){ hum=ac.createOscillator(); humG=ac.createGain(); humF=ac.createBiquadFilter();
        hum.type="sawtooth"; humF.type="lowpass"; humF.frequency.value=420; humG.gain.value=0;
        hum.connect(humF); humF.connect(humG); humG.connect(master); hum.start(); }
      var t=ac.currentTime; hum.frequency.setTargetAtTime(55+90*E,t,0.05); humG.gain.setTargetAtTime(Math.min(0.12,0.03+0.08*E),t,0.05); },
    humStop:function(){ if(hum&&ac){ var t=ac.currentTime; humG.gain.setTargetAtTime(0,t,0.04); var h=hum; hum=null; setTimeout(function(){ try{h.stop();}catch(e){} },300); } },
    snap:function(){ if(!on||!ac) return; var t=ac.currentTime, n=ac.sampleRate*0.25, buf=ac.createBuffer(1,n,ac.sampleRate), d=buf.getChannelData(0);
      for(var i=0;i<n;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/n,3);
      var s=ac.createBufferSource(), f=ac.createBiquadFilter(), g=ac.createGain(); s.buffer=buf; f.type="bandpass"; f.frequency.setValueAtTime(1800,t); f.frequency.exponentialRampToValueAtTime(180,t+0.25);
      g.gain.value=0.6; s.connect(f); f.connect(g); g.connect(master); s.start(t); }
  };
})();

/* ------------------------------------------------------------------ scroll -> depth */
var sections=[].slice.call(D.querySelectorAll("[data-scene]")), active="table", prog=0;
function measure(){
  var mid=H*0.5, best=null;
  sections.forEach(function(s){ var r=s.getBoundingClientRect(); if(r.top<=mid&&r.bottom>mid) best=s; });
  if(!best){ var last=sections[sections.length-1].getBoundingClientRect(); if(last.bottom<=mid){ active="end"; prog=1; return; } best=sections[0]; }
  active=best.getAttribute("data-scene");
  var r=best.getBoundingClientRect(), span=Math.max(1,r.height-H);
  prog=best.classList.contains("pin") ? Math.min(1,Math.max(0,-r.top/span)) : Math.min(1,Math.max(0,(H-r.top)/(r.height+H)));
}
var gaugeLinks=[].slice.call(D.querySelectorAll(".gauge a")), gaugeMap={table:"top",cloud:"cloud",light:"light",empty:"empty",nucleus:"nucleus",proton:"proton",pull:"pull",edge:"edge"};
function markGauge(){ var k=gaugeMap[active]||"edge"; gaugeLinks.forEach(function(a){ a.classList.toggle("on",a.getAttribute("data-depth")===k); }); }

/* ------------------------------------------------------------------ pointer: turn the atom, pull the quark */
var cam={yaw:-0.6,pitch:0.42,ty:-0.6,tp:0.42,vy:0,vp:0,drag:null};
function hit(n){ return D.querySelector('.hit[data-hit="'+n+'"]'); }
(function(){
  var h=hit("cloud"); if(!h) return;
  h.addEventListener("pointerdown",function(e){ cam.drag={x:e.clientX,y:e.clientY,yaw:cam.ty,pitch:cam.tp}; h.setPointerCapture(e.pointerId); h.classList.add("dragging"); });
  h.addEventListener("pointermove",function(e){
    if(cam.drag){ cam.ty=cam.drag.yaw+(e.clientX-cam.drag.x)*0.008; cam.tp=Math.max(-1.4,Math.min(1.4,cam.drag.pitch+(e.clientY-cam.drag.y)*0.008)); }
  });
  var up=function(){ cam.drag=null; h.classList.remove("dragging"); };
  h.addEventListener("pointerup",up); h.addEventListener("pointercancel",up);
})();
var hp=hit("pull");
function kPull(){ return radius()/1.15; }   /* px per fm: 1.15 fm to the edge of the stage radius */
function P2F(x,y){ var c=center(); return [(x-c[0])/kPull(), (c[1]-y)/kPull()]; }
function nearestQuark(x,y){
  var c=center(), k=kPull(), qs=quarks(performance.now()/1000).q, best=-1, bd=1e9;
  qs.forEach(function(q,j){ var d=Math.hypot(c[0]+q[0]*k-x, c[1]-q[1]*k-y); if(d<bd){ bd=d; best=j; } });
  return bd<Math.max(28,0.16*k)?best:-1;
}
if(hp){
  hp.addEventListener("pointerdown",function(e){
    if(PULL.broken) return; var j=nearestQuark(e.clientX,e.clientY); if(j<0) return;
    if(!PULL.on){ PULL.restL=quarks(performance.now()/1000).S.L; }
    PULL.on=true; PULL.drag=true; PULL.idx=j; PULL.hold=0; PULL.v=[0,0]; PULL.q=P2F(e.clientX,e.clientY);
    hp.setPointerCapture(e.pointerId); hp.classList.add("dragging"); D.getElementById("pullHint").style.opacity="0";
  });
  hp.addEventListener("pointermove",function(e){
    if(PULL.drag){ PULL.q=P2F(e.clientX,e.clientY); return; }
    hp.classList.toggle("over", nearestQuark(e.clientX,e.clientY)>=0);
  });
  var upP=function(){ if(PULL.drag){ PULL.drag=false; hp.classList.remove("dragging"); } };
  hp.addEventListener("pointerup",upP); hp.addEventListener("pointercancel",upP);
}
D.getElementById("pullOut").addEventListener("click",function(){
  if(PULL.broken) return;
  var t=performance.now()/1000;
  if(!PULL.on){ PULL.restL=quarks(t).S.L; PULL.on=true; PULL.idx=0; PULL.q=restQuarks(t)[0].slice(); PULL.v=[0,0]; }
  var S=quarks(t).S, J=S.J, dx=PULL.q[0]-J[0], dy=PULL.q[1]-J[1], n=Math.hypot(dx,dy)||1;
  PULL.q=[PULL.q[0]+dx/n*0.1, PULL.q[1]+dy/n*0.1]; PULL.hold=240;
  if(active!=="pull") D.getElementById("pull").scrollIntoView({behavior:CALM?"auto":"smooth"});
});
D.getElementById("pullBack").addEventListener("click",function(){ PULL.hold=0; PULL.drag=false; });
D.getElementById("exciteBtn").addEventListener("click",function(){
  if(EM) return;
  if(LMODE==="lines"){ var i=nextMeasured(); if(i>=0) emitMeasured(i); }
  else emit(3+Math.floor(Math.random()*4));
});
D.getElementById("clearLines").addEventListener("click",function(){ LINES={}; LIT={}; drawSpectrum(); set("lineReadout","Cleared. Excite the atom again."); });
D.getElementById("themeBtn").addEventListener("click",function(){ setTheme(theme==="light"?"dark":"light"); });
D.getElementById("soundBtn").addEventListener("click",function(){
  var on=Sound.toggle(); this.textContent=on?"Sound on":"Sound off"; this.setAttribute("aria-pressed",on?"true":"false");
});

/* ------------------------------------------------------------------ the table, its readout and its card */
var stage=D.getElementById("ptStage"), slot=D.getElementById("ptSlot"), read=D.getElementById("ptRead");
var sheet=D.getElementById("sheet"), sheetBody=D.getElementById("sheetBody"), ptsec=D.getElementById("top");
var CAT_LIGHT={ak:"#8f1d14",ae:"#7a3a00",tm:"#5c4500",pt:"#1d5e2c",ml:"#0b5560",nm:"#09467a",hl:"#3c3a9a",ng:"#5b2a8a",ln:"#84134d",an:"#8a1c33",un:"#3f4743"};
function catColor(c){ return theme==="light"?CAT_LIGHT[c]:CAT[c][1]; }
function readout(z){
  if(!z) return;
  var e=ELEMENTS[z-1], u=USES[z-1], v=PT?PT.V[z]:PTable.valence(z);
  read.style.setProperty("--cat",catColor(e[5]));
  read.innerHTML='<p class="ptr-name">'+e[2]+'</p>'+
    '<p class="ptr-top"><b>'+z+'</b><span>'+CAT[e[5]][0]+'</span></p>'+
    '<p class="ptr-meet">'+PTable.icon(u[0],"ptr-ic")+'<span>'+u[1]+(u[2]?' <i>'+u[2]+'</i>':'')+'</span></p>'+
    (PT&&PT.lens==="origin"?'<p class="ptr-lens">'+originLine(z)+'</p>':
     PT&&PT.lens==="frontier"?'<p class="ptr-lens">'+FRONTIER[z-1][1]+'</p>':
     '<p class="ptr-conf">'+configStr(z).replace(/([spdf])(\d+)/g,"$1<sup>$2</sup>")+' <span>· cloud: '+PTable.orbName(v,true)+'</span></p>');
}
function originLine(z){
  var m=ORIGIN[z-1], ks=Object.keys(m).sort(function(a,b){ return m[b]-m[a]; });
  if(ks[0]==="h") return "Nothing from the stars survives: every atom here was made "+(z<=92?"recently, by decay or in reactors":"by people, a few at a time")+".";
  return "Made in "+ks.map(function(k){ return ORIGIN_KINDS[k].short+" ("+Math.round(m[k]*100)+"%)"; }).join(", ")+".";
}
/* ------------------------------------------------------------------ lenses: the same table, read three ways */
var LENS_HELP={
  shapes:"Each square shows the electron that puts its element in the table: spheres (s), dumbbells (p), cloverleaves (d), and flowers (f). The table's shape is the orbitals' shape.",
  origin:"Where each element was made. Most of the hydrogen and helium are from the Big Bang; everything heavier was forged in stars, their explosions, and their collisions. Pick a source to see its share.",
  frontier:"What each element is helping build right now. Pick a field to light up its elements; every card ends with an open problem someone could take on."
};
function setLens(lens, filter){
  if(!PT) return;
  PT.setLens(lens, filter);
  [].forEach.call(D.querySelectorAll("button[data-lens]"),function(b){ b.setAttribute("aria-pressed",b.getAttribute("data-lens")===lens?"true":"false"); });
  var lg=D.getElementById("lensLegend"), h='', stm=D.querySelector("#ptSlot .statement");
  if(stm){ if(!stm._base) stm._base=stm.textContent; stm.textContent=lens==="shapes"?stm._base:LENS_HELP[lens]; }
  if(lens==="origin") h+='<div class="lens-keys">'+Object.keys(ORIGIN_KINDS).map(function(k){ return '<button type="button" data-filter="'+k+'" aria-pressed="'+(filter===k)+'" style="--kc:var(--o-'+k+')">'+ORIGIN_KINDS[k].name+'</button>'; }).join('')+'</div>';
  if(lens==="frontier") h+='<div class="lens-keys">'+Object.keys(TECH_KINDS).map(function(k){ return '<button type="button" data-filter="'+k+'" aria-pressed="'+(filter===k)+'" style="--kc:var(--t-'+k+')">'+TECH_KINDS[k].name+'</button>'; }).join('')+'</div>';
  lg.innerHTML=lens==="shapes"?"":h; root.classList.toggle("lens-on",lens!=="shapes"); readout(PT.hover||SEL);
  if(MS) MS.signal("lens:"+lens+(filter?":"+filter:""));
}
function openSheet(z){
  sheetBody.innerHTML=PTable.detail(z);
  if(MS) MS.signal("card:"+z);
  sheet.hidden=false; ptsec.classList.add("sheet-open"); root.classList.add("card-open"); fitTable();
  requestAnimationFrame(function(){ sheet.classList.add("open"); });
  sheetBody.scrollTop=0;
}
function closeSheet(focusTile){
  if(sheet.hidden) return;
  sheet.classList.remove("open"); ptsec.classList.remove("sheet-open"); root.classList.remove("card-open"); fitTable();
  setTimeout(function(){ if(!sheet.classList.contains("open")) sheet.hidden=true; }, CALM?0:320);
  if(focusTile&&PT) PT.focusSelected();
}
D.getElementById("sheetClose").addEventListener("click",function(){ closeSheet(true); });
D.addEventListener("keydown",function(e){ if(e.key==="Escape"&&!sheet.hidden) closeSheet(true); });
D.getElementById("fallIn").addEventListener("click",function(){
  closeSheet(false);
  var c=D.getElementById("cloud"), y=c.getBoundingClientRect().top+window.scrollY;
  window.scrollTo({top:y, behavior:CALM?"auto":"smooth"});
});
/* on a wide screen the readout lives in the table's own gap, above the
   transition metals; on a narrow one the table scrolls sideways, so it moves
   above the table */
function placeSlot(){
  if(!PT) return;
  if(mqSmall.matches){ if(slot.parentNode!==stage.parentNode) stage.parentNode.insertBefore(slot, stage); }
  else if(slot.parentNode!==PT.grid) PT.grid.appendChild(slot);
}
/* the table shrinks to the left when the card opens, so nothing is hidden */
function fitTable(){
  if(!PT||mqSmall.matches){ if(stage) stage.style.transform=""; return; }
  if(!ptsec.classList.contains("sheet-open")){ stage.style.transform=""; return; }
  var sw=Math.min(520,W*0.42), avail=W-sw-48, tw=PT.el.offsetWidth, s=Math.min(1,avail/tw), left=PT.el.getBoundingClientRect().left;
  stage.style.transformOrigin="0 50%"; stage.style.transform="translateX("+(24-stage.offsetLeft)+"px) scale("+s.toFixed(4)+")";
}

/* ------------------------------------------------------------------ drawing the overlay */
function plateLabel(txt,x,y,col){
  ctx.font="600 15px Archivo, sans-serif"; var w=ctx.measureText(txt).width;
  if(w+28>W) return; x=Math.max(16,Math.min(x,W-16-w)); /* never past the edge of a narrow screen */
  ctx.fillStyle=T.plate; ctx.fillRect(x-6,y-16,w+12,22); ctx.fillStyle=col||T.ink; ctx.textAlign="left"; ctx.fillText(txt,x,y);
}
function hexA(h,a){ var r=parseInt(h.substr(1,2),16),g=parseInt(h.substr(3,2),16),b=parseInt(h.substr(5,2),16); return "rgba("+r+","+g+","+b+","+a+")"; }
function ball(x,y,r,c1,c2,a){
  if(r<0.8){ ctx.globalAlpha=a; ctx.fillStyle=c2; ctx.fillRect(x-0.8,y-0.8,1.6,1.6); ctx.globalAlpha=1; return; }
  var g=ctx.createRadialGradient(x-r*0.35,y-r*0.4,r*0.06,x,y,r); g.addColorStop(0,c1); g.addColorStop(0.6,c2); g.addColorStop(1,T.rim);
  ctx.globalAlpha=a; ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r,0,6.2832); ctx.fill(); ctx.globalAlpha=1;
}
/* the selected element's nucleus, packed by the app's own packNucleus: a
   deterministic arrangement at the right density, protons and neutrons
   shuffled; the touching pairs are listed once, for the glow between them */
var NUCC=null;
function nucleusData(){
  if(NUCC&&NUCC.Z===SEL) return NUCC;
  var nuc=nucleusOf(SEL), pk=packNucleus(SEL,nuc.N), list=[], pairs=[], i, j;
  for(i=0;i<pk.A;i++) list.push([pk.pos[i*3]*1e15,pk.pos[i*3+1]*1e15,pk.pos[i*3+2]*1e15,pk.kind[i]]);
  for(i=0;i<list.length;i++) for(j=i+1;j<list.length;j++){ var dx=list[i][0]-list[j][0], dy=list[i][1]-list[j][1], dz=list[i][2]-list[j][2];
    if(dx*dx+dy*dy+dz*dz<2.2*2.2) pairs.push([i,j]); }
  NUCC={Z:SEL, list:list, pairs:pairs, R:nuc.R, A:nuc.A}; return NUCC;
}
function drawNucleus(cx,cy,kpx,alpha,t){
  var N=nucleusData(), cyw=Math.cos(t*0.25), syw=Math.sin(t*0.25);
  var pts=N.list.map(function(n){ var x=n[0]*cyw-n[2]*syw, z=n[0]*syw+n[2]*cyw; return {x:cx+x*kpx, y:cy-n[1]*kpx, z:z, p:n[3]}; });
  var r=Math.max(0.8,0.86*kpx);
  if(r<3){ ctx.strokeStyle=hexA(T.pF[1],0.9*alpha); ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(cx,cy,9,0,6.2832); ctx.stroke(); }
  /* the strong force, as a glow where nucleons touch */
  if(r>8){ ctx.globalAlpha=alpha*0.4; ctx.strokeStyle=hexA(T.acc,0.45); ctx.lineWidth=r*0.32; ctx.beginPath();
    N.pairs.forEach(function(pq){ var a=pts[pq[0]], b=pts[pq[1]]; ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); }); ctx.stroke(); ctx.globalAlpha=1; }
  var order=pts.slice().sort(function(a,b){ return a.z-b.z; });
  order.forEach(function(o){ ball(o.x,o.y,r,o.p?T.pF[0]:T.nF[0],o.p?T.pF[1]:T.nF[1],alpha); });
}
function drawSea(cx,cy,k,alpha,t){
  var rN=0.84075*k;
  ctx.globalAlpha=alpha*0.9; ctx.strokeStyle=T.ink3; ctx.setLineDash([3,6]); ctx.lineWidth=1;
  ctx.beginPath(); ctx.arc(cx,cy,rN,0,6.2832); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha=1;
  /* virtual quark-antiquark pairs and gluons, flickering in every color charge */
  for(var s=0;s<70;s++){ var ph=s*2.39996, rad=(0.15+0.85*Math.sqrt((s*0.618)%1))*rN, a=ph+(CALM?0:t*(0.4+(s%7)*0.15));
    var life=0.5+0.5*Math.sin((CALM?1:t)*2.3+s);
    ctx.fillStyle=(s%4===3)?hexA(T.q[s%3],0.55*life*alpha):(s%2?T.sea:T.seaB)+((0.5)*life*alpha).toFixed(3)+")";
    ctx.beginPath(); ctx.arc(cx+Math.cos(a)*rad, cy+Math.sin(a)*rad*0.9, Math.max(1,0.02*k*(0.5+life)),0,6.2832); ctx.fill(); }
}
function drawQuarkDiscs(list,k,alpha){
  var r=Math.max(6,0.10*k);
  list.forEach(function(o){
    ctx.globalAlpha=alpha;
    if(theme!=="light"){ var g=ctx.createRadialGradient(o.x,o.y,r*0.6,o.x,o.y,r*2.4); g.addColorStop(0,hexA(T.q[o.c],0.45)); g.addColorStop(1,hexA(T.q[o.c],0));
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(o.x,o.y,r*2.4,0,6.2832); ctx.fill(); }
    if(o.anti){ ctx.strokeStyle=T.q[o.c]; ctx.lineWidth=Math.max(2,r*0.3); ctx.beginPath(); ctx.arc(o.x,o.y,r*0.82,0,6.2832); ctx.stroke(); }
    else { ctx.fillStyle=T.q[o.c]; ctx.beginPath(); ctx.arc(o.x,o.y,r,0,6.2832); ctx.fill(); }
    if(r>9){ var lab=o.anti?(o.f+"̄"):o.f; ctx.font="800 "+Math.round(Math.min(20,r*0.9))+"px Archivo, sans-serif";
      var w=ctx.measureText(lab).width; ctx.fillStyle="rgba(0,0,0,.62)"; ctx.fillRect(o.x-w/2-4,o.y-r*0.5,w+8,r);
      ctx.fillStyle="#ffffff"; ctx.textAlign="center"; ctx.fillText(lab,o.x,o.y+r*0.32); }
    ctx.globalAlpha=1;
  });
}
/* the field segments for the flux tubes ([ax,ay,bx,by,color]), the discs, the labels */
function pullScene(t,now,cx,cy,k){
  var qs=quarks(t), q=qs.q, S=qs.S, segs=[], discs=[], B=PULL.broken, i;
  if(!PULL.on) PULL.restL=S.L;
  PULL.S=S;
  if(B){
    var tau=(now-B.t0)/1000, e=CALM?1:1-Math.pow(1-Math.min(1,tau/0.55),3);
    var born=[B.at[0]-B.dir[0]*0.34,B.at[1]-B.dir[1]*0.34], nq=[born[0]+(B.restAt[0]-born[0])*e, born[1]+(B.restAt[1]-born[1])*e];
    var q2=q.slice(); q2[PULL.idx]=nq; var S2=AtomQCD.state(q2.map(function(a){ return [a[0],a[1],0]; }));
    for(i=0;i<3;i++){ segs.push([S2.J[0],S2.J[1],q2[i][0],q2[i][1],i]); discs.push({x:cx+q2[i][0]*k,y:cy-q2[i][1]*k,c:i,f:i===PULL.idx?B.pair:PULL.flav[i]}); }
    var drift=CALM?0.3:0.3*(1-Math.exp(-tau*2))+0.05*tau, mq=[B.at[0]+B.dir[0]*drift,B.at[1]+B.dir[1]*drift], ma=[mq[0]-B.dir[0]*0.34,mq[1]-B.dir[1]*0.34];
    segs.push([ma[0],ma[1],mq[0],mq[1],PULL.idx]);
    discs.push({x:cx+mq[0]*k,y:cy-mq[1]*k,c:PULL.idx,f:PULL.flav[PULL.idx]});
    discs.push({x:cx+ma[0]*k,y:cy-ma[1]*k,c:PULL.idx,f:B.pair,anti:true});
    return {segs:segs,discs:discs,labels:[[B.res.meson+"  "+B.res.mesonQuarks, cx+mq[0]*k+18, cy-mq[1]*k-18],[B.res.after+"  "+B.res.baryonQuarks, cx-0.95*k, cy+1.05*k]],S:S};
  }
  for(i=0;i<3;i++){ segs.push([S.J[0],S.J[1],q[i][0],q[i][1],i]); discs.push({x:cx+q[i][0]*k,y:cy-q[i][1]*k,c:i,f:PULL.flav[i]}); }
  var labels=[];
  if(PULL.on){ var lq=q[PULL.idx]; labels.push([S.legs[PULL.idx].toFixed(2)+" fm · "+(Q.sigma*(S.L-PULL.restL)).toFixed(2)+" GeV", cx+lq[0]*k+18, cy-lq[1]*k-18]); }
  return {segs:segs,discs:discs,labels:labels,S:S};
}
function drawSparkle(o, fov, c, alpha){
  var S=samples(o); if(!S||CALM) return;
  var kp=(Math.min(W,H)/2)/(fov/a0), cyw=Math.cos(cam.yaw), syw=Math.sin(cam.yaw), cp=Math.cos(cam.pitch), sp=Math.sin(cam.pitch), N=mqSmall.matches?260:520;
  ctx.globalAlpha=alpha*(theme==="light"?0.6:0.85);
  for(var i=0;i<N;i++){ var k=(Math.random()*2600)|0, x=S.p[k*3], y=S.p[k*3+1], z=S.p[k*3+2];
    var x1=x*cyw-z*syw, z1=x*syw+z*cyw, y2=y*cp-z1*sp;
    ctx.fillStyle=theme==="light"?(S.s[k]<0?"#84134d":"#09467a"):(S.s[k]<0?"#ffe0ee":"#e2f7ff");
    ctx.fillRect(c[0]+x1*kp-0.8, c[1]-y2*kp-0.8, 1.6, 1.6); }
  ctx.globalAlpha=1;
}

/* ------------------------------------------------------------------ the world behind the page */
var WTARGET={table:[1,0,0], cloud:[0.25,1,0], light:[0,1,0], empty:[0,0.55,0.35], nucleus:[0,0.15,0.75], proton:[0,0,0.35], pull:[0,0,0.3], edge:[0.65,0,0.3], bench:[1,0,0], end:[1,0,0]};
function drawWorld(now, dt){
  if(!WORLD) return;
  var tg=WTARGET[active]||WTARGET.end, k=CALM?1:Math.min(1,dt/420);
  if(active==="empty"){ tg=[0, 1-smooth(0.35,0.95,prog), smooth(0.35,0.95,prog)*0.7]; }
  WL.cos+=(tg[0]-WL.cos)*k; WL.lit+=(tg[1]-WL.lit)*k; WL.vac+=(tg[2]-WL.vac)*k;
  var c=center(), ev=c, r=radius(), quiet=null, tile=PT&&PT.tiles[SEL];
  if(active==="table"&&tile){ var tr=tile.getBoundingClientRect(); ev=[tr.left+tr.width/2, tr.top+tr.height/2]; r=Math.max(160,tr.width*3.2);
    if(!mqSmall.matches&&slot.parentNode===PT.grid){ var sr=slot.getBoundingClientRect(); quiet=[sr.left-20,sr.top-20,sr.right+20,sr.bottom+20]; } }
  WORLD.draw({w:W,h:H,t:CALM?20:now/1000,now:now,cos:WL.cos,lit:WL.lit,vac:WL.vac,mix:ORIGIN[SEL-1],evx:ev[0],evy:ev[1],r:r,
    cx:c[0],cy:c[1],quiet:quiet,light:theme==="light",calm:CALM,small:mqSmall.matches});
  WORLD.govern(dt);
}

/* ------------------------------------------------------------------ the frame */
var last=performance.now(), frames=0, cloudStep=0, zoomRect=null, statusDone=false;
var ORDER_H=[orbOf(1,0,0,1),orbOf(3,1,0,1),orbOf(3,2,-2,1),"shine"];
function frame(now){
  var dt=now-last; last=now; frames++;
  var was=active; measure(); if(frames%6===0) markGauge(); tint(active);
  if(was!==active||frames===1){ root.classList.toggle("at-table",active==="table"); root.classList.toggle("at-bench",active==="bench"); if(MS&&was!==active) MS.signal("depth:"+active); }
  drawWorld(now, dt);
  if(SIMS && benchVisible) SIMS.frame(now);
  stepPull(now); stepEmit(now);
  var t=now/1000;
  if(PT){ PT.hidden=(active!=="table"); PT.frame(now);
    if(!statusDone){ var nb=PT.built(); set("ptStatus", !PT.gl?"WebGL 2 is off in this browser, so each square shows its family color instead of its cloud":(nb<118?"Computing ψ for element "+nb+" of 118":"All 118 clouds computed live on your graphics card"));
      if(nb>=118) statusDone=true; } }

  /* the camera: a damped spring toward its target, so a flick keeps going */
  if(!cam.drag && !CALM && (active==="cloud"||active==="light")) cam.ty+=0.0018;
  cam.vy=cam.vy*0.80+(cam.ty-cam.yaw)*0.06; cam.vp=cam.vp*0.80+(cam.tp-cam.pitch)*0.06;
  cam.yaw+=cam.vy; cam.pitch+=cam.vp;
  if(CALM){ cam.yaw=cam.ty; cam.pitch=cam.tp; }

  var c=center(), cloudA=0, fieldA=0, fov=3e-10, orb=null, nucA=0, protA=0, pullA=0, vac=0, tube=0, tight=0.60, sparkle=false, fixFov=0;
  switch(active){
    case "table":
      /* the zoom: the square you picked grows to fill the screen, and the live
         cloud takes over from it at the same place, size and angle */
      var z=(CALM||mqSmall.matches)?0:smooth(0.04,0.85,prog), tile=PT&&PT.tiles[SEL];
      if(z>0.001 && tile){
        var ox=tile.offsetLeft+tile.offsetWidth/2, oy=tile.offsetTop+tile.offsetHeight/2, s=1+z*z*14;
        if(sheet.classList.contains("open")) closeSheet(false);
        PT.el.style.transformOrigin=ox+"px "+oy+"px"; PT.el.style.transform="scale("+s.toFixed(4)+")";
        PT.el.style.opacity=(1-smooth(0.26,0.6,prog)).toFixed(3);
        PT.el.classList.add("zooming"); PT.focus={z:SEL,k:smooth(0.08,0.42,prog)};
        var tr=tile.getBoundingClientRect(), tc=[tr.left+tr.width/2, tr.top+tr.height/2], k2=smooth(0.55,1,prog);
        c=[lerp(tc[0],c[0],k2), lerp(tc[1],c[1],k2)];
        orb=valOrb(); cloudA=smooth(0.14,0.46,prog); tight=0.74; sparkle=prog>0.7;
        cam.ty=cam.yaw=SEL*0.37+t*0.16; cam.tp=cam.pitch=0.42; cam.vy=cam.vp=0;
        zoomRect=Math.min(tr.width,tr.height)*1.06;
      } else if(PT && PT.el.style.transform){ PT.el.style.transform=""; PT.el.style.opacity=""; PT.el.classList.remove("zooming"); PT.focus=null; PT.redraw(); zoomRect=null; }
      D.getElementById("ptFoot").style.opacity=(1-smooth(0.02,0.2,prog)).toFixed(3);
      slot.style.opacity=(1-smooth(0.02,0.25,prog)).toFixed(3);
      break;
    case "cloud":
      cloudStep=Math.min(3,Math.floor(prog*4));
      if(userStep!==cloudStep) userOrb=null;
      orb=userOrb||(SEL===1?ORDER_H[cloudStep]:(cloudStep<3?valOrb():"s"+SEL)); cloudA=1; sparkle=(typeof orb!=="string"); tight=(typeof orb==="string"&&orb!=="shine")?0.5:0.74;
      [].slice.call(D.querySelectorAll("#cloud .step")).forEach(function(s,i){ s.classList.toggle("on",i===cloudStep); });
      [].slice.call(D.querySelectorAll("#orbPicker button")).forEach(function(b){ var o=b._o; b.setAttribute("aria-pressed", typeof orb!=="string"&&o.n===orb.n&&o.l===orb.l&&Math.abs(o.Z-orb.Z)<1e-6?"true":"false"); });
      var txt;
      if(orb==="shine") txt="2p<sub>z</sub> and 1s at once: the cloud sloshes at 2.47 × 10¹⁵ Hz, slowed for you";
      else if(typeof orb==="string") txt="All "+SEL+" electrons, "+configStr(SEL).replace(/([spdf])(\d+)/g,"$1<sup>$2</sup>")+" · drag the stage to turn it";
      else txt="Showing "+EL[2].toLowerCase()+" "+orbLabel(orb,true)+" · n = "+orb.n+", l = "+orb.l+(orb.full?", a full subshell":", m = "+orb.m)+" · drag the stage to turn it";
      var ro=D.getElementById("orbReadout"); if(ro.getAttribute("data-k")!==txt){ ro.innerHTML=txt; ro.setAttribute("data-k",txt); }
      drawRadial(false, orb);
      break;
    case "light":
      if(LMODE==="lines"){ orb=valOrb(); cloudA=1; tight=1.15;
        var wantL=Math.min(ELINES.length,Math.floor(prog*(ELINES.length+1)));
        if(!EM && Object.keys(LIT).length<wantL && frames%9===0){ var nx=nextMeasured(); if(nx>=0&&!LIT[nx]) emitMeasured(nx); } }
      else { orb=EM&&!EM.measured ? (EM.phase===0?orbOf(EM.nu,2,0,1):(EM.phase===1?"emit"+EM.nu:orbOf(2,1,0,1))) : orbOf(2,1,0,1); cloudA=1; tight=0.62;
        var want=Math.min(4,Math.floor(prog*5));
        if(!EM && want>0 && !LINES[lam(2+want,2).toFixed(2)] && frames%10===0) emit(2+want); }
      break;
    case "empty":
      orb="s"+SEL;
      var nucR=nucleusOf(SEL).R, endF=Math.max(5.5e-15,2.6*nucR*1e-15), startF=(front&&front.h&&curKey==="s"+SEL)?front.h.ext*a0*0.8:1.3e-10;
      fov=lerpLog(startF,endF,smooth(0.05,0.92,prog)); fixFov=1;
      cloudA=1-smooth(-10.45,-11.2,Math.log10(fov));
      nucA=smooth(-11.4,-12.0,Math.log10(fov));
      var e=Math.round(Math.log10(2*fov));
      set("depthNumeral","10"+supNum(e)+" m");
      break;
    case "nucleus": fov=Math.max(5.5e-15,2.6*nucleusOf(SEL).R*1e-15); nucA=1; if(bindReveal<1&&!CALM){ bindReveal=Math.min(1,bindReveal+dt/1800); drawBinding(); } break;
    case "proton": fov=1.5e-15; protA=1; tube=0.7; fieldA=1; vac=0.45; break;
    case "pull": fov=1.4e-15; pullA=1; fieldA=1; tube=1; vac=0.6; break;
    case "edge": fieldA=1; vac=1; tube=0; break;
    default: fieldA=0.35; vac=0.6; break;
  }
  if(CALM && active==="light"){
    if(LMODE==="lines" && !Object.keys(LIT).length){ ELINES.forEach(function(p,i){ LIT[i]=1; }); drawSpectrum(); }
    else if(LMODE!=="lines" && !Object.keys(LINES).length){ [3,4,5,6].forEach(function(n){ LINES[lam(n,2).toFixed(2)]=2; }); drawSpectrum(); }
  }
  if(orb) showCloud(orb);

  /* the cloud */
  if(front && front.h){
    var hh=front.h, fv=fixFov?fov:hh.ext*a0*tight;
    /* during the zoom the cloud is exactly the size of the growing square, until it reaches its own size */
    if(active==="table" && zoomRect) fv=Math.max(fv, hh.ext*0.70*a0*(Math.min(W,H)/2)/(zoomRect/2));
    var camGL={cloud:hh,yaw:cam.yaw,pitch:cam.pitch,fov:fv,a0:a0,w:W,h:H,dpr:Math.min(DPR,1.5),alpha:cloudA,light:theme==="light",
      time:CALM?1.5:t,hue:1,pos:T.gl.pos,neg:T.gl.neg,posInk:T.gl.posInk,negInk:T.gl.negInk,
      budget:mqSmall.matches?300000:640000,steps:mqSmall.matches?72:110};
    /* the scene sits off the middle of the window: offset the focus so the
       nucleus projects onto the scene's center */
    var kpx=(Math.min(W,H)/2)/fv, dxm=(c[0]-W/2)/kpx, dym=-(c[1]-H/2)/kpx;
    var cy_=Math.cos(cam.yaw), sy_=Math.sin(cam.yaw), cp_=Math.cos(cam.pitch), sp_=Math.sin(cam.pitch);
    var ex=[cy_,0,-sy_], ey=[-sp_*sy_,cp_,-sp_*cy_];
    camGL.off=[-(dxm*ex[0]+dym*ey[0]), -(dxm*ex[1]+dym*ey[1]), -(dxm*ex[2]+dym*ey[2])];
    if(cloudA>0.01){ front.g.draw(camGL); front.g.govern(dt); } else if(frames%4===0) front.g.clear();
    if(back && back.c.style.opacity==="0" && frames%30===0) back.g.clear();
  }
  /* the overlay */
  ctx.clearRect(0,0,W,H);
  if(sparkle && cloudA>0.05 && front && front.h) drawSparkle(orb, (active==="table"&&zoomRect)?Math.max(front.h.ext*a0*tight, front.h.ext*0.70*a0*(Math.min(W,H)/2)/(zoomRect/2)):front.h.ext*a0*tight, c, cloudA*(active==="table"?smooth(0.7,0.95,prog):1));
  if(nucA>0.01){
    var kfm=(Math.min(W,H)/2)/fov*1e-15;
    drawNucleus(c[0],c[1],kfm,nucA,CALM?0:t);
    if(active==="empty" && kfm*nucleusOf(SEL).R<14) plateLabel("the nucleus, drawn at its true size", c[0]+16, c[1]-14, T.ink2);
  }
  var kq=kPull(), segs=[], ps=null;
  if(protA>0.01||pullA>0.01){
    drawSea(c[0],c[1],kq,Math.max(protA,pullA),t);
    ps=pullScene(t,now,c[0],c[1],kq); segs=ps.segs;
  }
  if(FIELD){
    if(fieldA>0.01) FIELD.draw({alpha:fieldA,segs:segs,cx:c[0],cy:c[1],k:kq,t:CALM?3:t,w:0.085,tube:tube,vac:vac});
    else if(frames%4===0) FIELD.clear();
  } else if(ps){
    ctx.lineCap="round"; ctx.lineWidth=0.12*kq;
    segs.forEach(function(s){ ctx.strokeStyle=hexA(T.q[s[4]||0],0.85); ctx.beginPath(); ctx.moveTo(c[0]+s[0]*kq,c[1]-s[1]*kq); ctx.lineTo(c[0]+s[2]*kq,c[1]-s[3]*kq); ctx.stroke(); });
  }
  if(ps){ drawQuarkDiscs(ps.discs,kq,Math.max(protA,pullA)); if(pullA>0.5) ps.labels.forEach(function(l){ plateLabel(l[0],l[1],l[2]); }); }
  /* the snap: a flash of pair creation where the string broke */
  if(PULL.broken && now-flash<500 && !CALM){ var B=PULL.broken, fx=c[0]+(B.at[0]-B.dir[0]*0.34)*kq, fy=c[1]-(B.at[1]-B.dir[1]*0.34)*kq, u=(now-flash)/500;
    ctx.globalAlpha=1-u; ctx.strokeStyle=T.acc; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(fx,fy,8+u*90,0,6.2832); ctx.stroke(); ctx.globalAlpha=1; }
  /* the photon, flying from the atom into the spectrograph on the page */
  if(EM && EM.phase>=1 && active==="light" && SX.X){
    var u2=EM.phase===1?0:Math.min(1,(now-EM.t1)/900), tx=SX.X(EM.lam), ty=SX.y, x=c[0]+(tx-c[0])*u2, y=c[1]+(ty-c[1])*u2;
    var col=wl2rgb(EM.lam)||T.ink; if(theme==="light") col=T.ink;
    if(EM.phase===2){
      ctx.strokeStyle=col; ctx.lineWidth=3; ctx.beginPath();
      var ang=Math.atan2(ty-c[1],tx-c[0]), ca=Math.cos(ang), sa=Math.sin(ang);
      for(var s2=-90;s2<=0;s2+=3){ var env=Math.exp(-Math.pow((s2+45)/26,2)), off=Math.sin(s2*0.42+now*0.02)*12*env;
        var px=x+ca*s2-sa*off, py=y+sa*s2+ca*off; if(s2===-90) ctx.moveTo(px,py); else ctx.lineTo(px,py); }
      ctx.stroke();
    } else { plateLabel("two states at once: the cloud sloshes", c[0]+radius()*0.55, c[1]+radius()*0.8, T.ink2); }
  }
  if(active==="pull"||active==="proton"){ if(frames%3===0) pullReadout(); }
  requestAnimationFrame(frame);
}

/* "Show me": what a mission step asks for, done for you */
function missionGo(a){
  if(a.pick){ var z=a.pick; if(z!==SEL) setElement(z); if(PT){ PT.select(z); readout(z); }
    if(active!=="table") window.scrollTo({top:0,behavior:CALM?"auto":"smooth"}); if(MS) MS.signal("pick:"+z); }
  if(a.lens) { if(active!=="table") window.scrollTo({top:0,behavior:CALM?"auto":"smooth"}); setLens(a.lens, a.filter||""); }
  if(a.card){ var zc=a.card; if(zc!==SEL) setElement(zc); if(PT) PT.select(zc); window.scrollTo({top:0,behavior:CALM?"auto":"smooth"}); setTimeout(function(){ openSheet(zc); }, CALM?0:500); }
  if(a.depth){ var sec=D.getElementById(a.depth); if(sec){ var y=sec.getBoundingClientRect().top+window.scrollY+(sec.classList.contains("pin")?H*0.2:0); window.scrollTo({top:y,behavior:CALM?"auto":"smooth"}); } }
  if(a.sim){ var b=D.getElementById("bench"); if(b) window.scrollTo({top:b.getBoundingClientRect().top+window.scrollY,behavior:CALM?"auto":"smooth"});
    if(SIMS){ SIMS.show(a.sim); if(a.react){ var HOST=D.getElementById("benchHost"), rb=HOST.querySelector('[data-r="'+a.react+'"]'); if(rb) rb.click();
      var T=HOST.querySelector('[data-i="T"]'); if(T&&a.hot&&+T.value<440){ T.value=440; T.dispatchEvent(new Event("input")); }   /* about 12.6 keV */
      var fb=HOST.querySelector('[data-i="fire"]'); if(fb&&!fb.closest("[hidden]")) fb.click(); } } }
}

/* the download that fits this computer goes first and gets the accent */
function pickDownload(){
  var ua=navigator.userAgent||"", pf=(navigator.userAgentData&&navigator.userAgentData.platform)||navigator.platform||"", os="";
  if(/iPhone|iPad|Android/i.test(ua)||(/Mac/i.test(pf)&&navigator.maxTouchPoints>1)) os="web";   /* phones and tablets: the browser version */
  else if(/Win/i.test(pf)||/Windows/i.test(ua)) os="win";
  else if(/Mac/i.test(pf)&&!(navigator.maxTouchPoints>1)) os="mac";          /* an iPad also says Mac */
  else if(/Linux|X11/i.test(pf+" "+ua)&&!/Android/i.test(ua)) os="linux";
  if(!os) return;
  var me=D.querySelector('.dl [data-os="'+os+'"]'); if(!me) return;
  [].forEach.call(D.querySelectorAll(".dl [data-os]"),function(b){ b.classList.toggle("btn-primary",b===me); });
  me.parentNode.insertBefore(me,me.parentNode.firstChild);
}

/* ------------------------------------------------------------------ boot */
function boot(){
  pickDownload();
  W=window.innerWidth; H=window.innerHeight;
  var q=/[?&]el=([A-Za-z]{1,3})/.exec(location.search), z0=26;
  if(q){ for(var i=0;i<118;i++) if(ELEMENTS[i][1].toLowerCase()===q[1].toLowerCase()) z0=i+1; }
  SEL=z0; EL=ELEMENTS[z0-1];
  PT=PTable.create({host:stage, slot:slot, selected:z0, calm:CALM, small:mqSmall.matches, catColor:catColor,
    theme:function(){ return {light:theme==="light",pos:T.gl.pos,neg:T.gl.neg,posInk:T.gl.posInk,negInk:T.gl.negInk}; },
    onHover:function(z){ readout(z); if(z!==SEL) Sound.tick(z); },
    onPick:function(z, kb){ if(z!==SEL) setElement(z); if(MS) MS.signal("pick:"+z); readout(z); openSheet(z); if(kb) setTimeout(function(){ D.getElementById("fallIn").focus(); }, 30); }});
  var st=D.createElement("p"); st.className="pt-status"; st.id="ptStatus"; st.setAttribute("aria-hidden","true"); slot.appendChild(st);
  setElement(z0,true); readout(z0);
  resize();
  window.addEventListener("resize",resize);
  if(mqSmall.addEventListener) mqSmall.addEventListener("change",resize);
  window.addEventListener("scroll",function(){ if(active==="light"&&frames%2===0) drawSpectrum(); },{passive:true});
  setTheme(theme);
  requestAnimationFrame(function(){
    try{ GA=AtomGL.create(cA); GB=AtomGL.create(cB); }catch(e){ GA=GB=null; }
    if(GA && AtomGL.selfCheck(QM.YlmReal)>1e-9) GA=GB=null;
    FIELD=makeField(cF);
    WORLD=cW?AtomWorld.create(cW):null;
    if(WORLD){ WORLD.setLight(WLIGHT.lines, WLIGHT.rgb); WORLD.birth(ORIGIN[SEL-1], performance.now()+400); }
    else root.classList.add("noworld");
    if(GA){ front={g:GA,c:cA}; if(GB){ back={g:GB,c:cB}; cB.style.opacity="0"; } }
    else D.querySelector(".scene").classList.add("nogl");
    if(front) showCloud(valOrb());
    requestAnimationFrame(frame);
  });
  if(CALM){ bindReveal=1; }
  drawBinding(true);
  /* lenses */
  [].forEach.call(D.querySelectorAll("button[data-lens]"),function(b){ b.addEventListener("click",function(){ setLens(b.getAttribute("data-lens"),""); }); });
  D.getElementById("lensLegend").addEventListener("click",function(e){ var b=e.target.closest("[data-filter]"); if(!b) return;
    var f=b.getAttribute("data-filter"); setLens(PT.lens, PT.filter===f?"":f); });
  setLens("shapes","");
  /* the workbench */
  var bh=D.getElementById("benchHost");
  if(bh){
    SIMS=AtomSims.mount(bh,{calm:CALM, theme:function(){ return {light:theme==="light", plate:T.plate, ink:T.ink, ink2:T.ink2, ink3:T.ink3, acc:T.acc, sub:T.sub,
        pF:T.pF, nF:T.nF, pos:T.gl.pos, neg:T.gl.neg, posInk:T.gl.posInk, negInk:T.gl.negInk}; },
      onEvent:function(e){ if(MS) MS.signal(e); },
      pick:function(z){ if(z!==SEL) setElement(z); if(PT) PT.select(z); if(MS) MS.signal("pick:"+z); readout(z); window.scrollTo({top:0,behavior:CALM?"auto":"smooth"}); setTimeout(function(){ openSheet(z); }, CALM?0:600); }});
    if("IntersectionObserver" in window) new IntersectionObserver(function(es){ es.forEach(function(e){ benchVisible=e.isIntersecting; }); },{rootMargin:"100px"}).observe(bh);
  }
  /* missions */
  var md=D.getElementById("missions");
  if(md) MS=Missions.create({host:md, go:missionGo});
}
if(D.readyState==="loading") D.addEventListener("DOMContentLoaded",boot); else boot();
})();
