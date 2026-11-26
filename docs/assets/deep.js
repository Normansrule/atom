/* Atom, below the quarks: the drawn scenes of the last stretch of the fall.
   Fields and the vacuum, the Higgs field and mass, the weak force and
   neutrinos, and the ladder of scales down to the Planck length. site.js
   loads this file when the reader nears those sections. Each figure is a 2D
   canvas that draws only while it is on screen and the tab is visible. In
   calm mode (reduced motion, or motion paused from the bar) it draws one
   still frame and a button shows its result instead of animating toward it.
   Nothing here is a simulation; the captions say so. The one computed
   picture is the neutrino chart, which is the three-flavor vacuum formula
   with the measured mixing values. One more figure lives further up the
   page and is drawn from here too: the empty atom, to scale. */
(function(){
"use strict";
var D=document, root=D.documentElement, TAU=6.283185307;
/* the palette is read from the page once, and again only when the theme changes (it used to be ten style reads for every figure on every frame) */
var PAL=null, PALN=0, FIGS=[];
function pal(){ if(PAL) return PAL; var cs=getComputedStyle(root), css=function(n){ return cs.getPropertyValue(n).trim(); };
  return PAL={bg:css("--bg2")||"#121416", line:css("--ink3")||"#aab0b5", ink:css("--ink")||"#f2f3f1", ink2:css("--ink2")||"#cdd1d4",
  acc:css("--acc")||"#ffb020", p:css("--psiP")||"#6fd3ff", n:css("--psiN")||"#ff94bd", r:css("--qr")||"#ff8c8c", g:css("--qg")||"#4fd892", b:css("--qb")||"#89abff"}; }
function calm(){ return root.classList.contains("calm"); }
function clamp(x,a,b){ return x<a?a:(x>b?b:x); }
function ramp(a,b,x){ return clamp((x-a)/(b-a),0,1); }
function ease(x){ return x*x*(3-2*x); }

/* One figure: sized to its box, awake only on screen, repainted when the theme or the motion setting changes
   (and then only if it is on screen: one that is not is painted when it next comes into view). A draw function
   that returns false has nothing left to move, and the loop stops until something wakes it. F.layer keeps the
   part of a picture that does not change in a canvas of its own, drawn once for a size and a theme. */
function figure(id, draw, still){
  var c=D.getElementById(id); if(!c) return null;
  var g=c.getContext("2d"), w=1, h=1, d=1, on=false, raf=0, t0=performance.now(), F={c:c, t:still, ev:-1e9}, lay=null, layKey="";
  function paint(t){ F.t=t; return draw(g,w,h,t,pal(),F); }
  function size(){ var r=c.getBoundingClientRect(); d=Math.min(2,window.devicePixelRatio||1); if(r.width<2) return; w=r.width; h=r.height;
    c.width=Math.round(w*d); c.height=Math.round(h*d); g.setTransform(d,0,0,d,0,0); if(on) paint(calm()?still:F.t); }
  function loop(now){ raf=0; if(!on||D.hidden) return; if(calm()){ paint(still); return; } if(paint((now-t0)/1000)!==false) raf=requestAnimationFrame(loop); }
  function wake(){ if(on&&!raf&&!D.hidden) raf=requestAnimationFrame(loop); }
  F.wake=wake;
  F.fire=function(){ F.ev=calm()?-1:(performance.now()-t0)/1000; wake(); };
  F.since=function(t, shown){ return F.ev===-1 ? shown : t-F.ev; };   /* seconds since the button; in calm mode, the moment worth showing */
  F.layer=function(key, fn){ key+="|"+PALN+"|"+c.width+"|"+c.height;
    if(key!==layKey){ if(!lay) lay=D.createElement("canvas"); lay.width=c.width; lay.height=c.height; var lg=lay.getContext("2d"); lg.setTransform(d,0,0,d,0,0); fn(lg); layKey=key; }
    g.drawImage(lay,0,0,w,h); };
  if(window.ResizeObserver) new ResizeObserver(size).observe(c); else window.addEventListener("resize",size);
  if(window.IntersectionObserver) new IntersectionObserver(function(es){ on=es[es.length-1].isIntersecting; wake(); },{rootMargin:"120px"}).observe(c); else on=true;
  FIGS.push(F); size(); wake(); return F;
}
/* one listener each for the tab and for the page's classes, for every figure. site.js changes classes on the
   root all the time (a card opens, a lens, the place on the page): only the theme and the motion setting matter here */
var seenTheme=root.getAttribute("data-theme")||"", seenCalm=calm();
D.addEventListener("visibilitychange",function(){ FIGS.forEach(function(F){ F.wake(); }); });
new MutationObserver(function(){ var th=root.getAttribute("data-theme")||"", cm=calm(); if(th===seenTheme&&cm===seenCalm) return;
  seenTheme=th; seenCalm=cm; PAL=null; PALN++; FIGS.forEach(function(F){ F.wake(); }); }).observe(root,{attributes:true,attributeFilter:["data-theme","class"]});
function ground(g,w,h,P){ g.globalAlpha=1; g.setLineDash([]); g.fillStyle=P.bg; g.fillRect(0,0,w,h); }
function wavy(g,x0,y0,x1,y1,amp,waves,phase){ var n=Math.max(12,Math.round(Math.hypot(x1-x0,y1-y0)/3)), dx=x1-x0, dy=y1-y0, L=Math.hypot(dx,dy)||1, nx=-dy/L, ny=dx/L;
  g.beginPath(); for(var i=0;i<=n;i++){ var s=i/n, a=amp*Math.sin(s*waves*TAU+phase)*Math.sin(Math.PI*s); var x=x0+dx*s+nx*a, y=y0+dy*s+ny*a; if(i) g.lineTo(x,y); else g.moveTo(x,y); } g.stroke(); }
function tag(g,s,x,y,P,col,align){ g.font="600 14px Archivo, sans-serif"; g.textAlign=align||"center"; g.textBaseline="middle";
  var m=g.measureText(s).width, x0=align==="left"?x-4:(align==="right"?x-m-4:x-m/2-4); g.globalAlpha=1; g.fillStyle=P.bg; g.fillRect(x0,y-10,m+8,20); g.fillStyle=col||P.ink; g.fillText(s,x,y+1); }

/* ---------------------------------------------------------------- fields
   A field as rows of a rippling sheet. Two electrons (bright ripples) come
   together, a photon passes between them, and they turn away. The button
   adds energy and the field answers with a pair. */
function drawFields(g,w,h,t,P,F){
  ground(g,w,h,P);
  var R=clamp(Math.round(h/20),9,16), N=clamp(Math.round(w/6),60,160), top=h*0.14, dy=h*0.74/(R-1), amp=dy*1.35, sx=w*0.045;
  var s=Math.sin(Math.PI*((t%9)/9)), s2=s*s;
  var pk=[{x:0.14+0.25*s2, r:(0.40-0.11*s2)*(R-1), c:P.p, k:0.55, lab:"e⁻", a:1},{x:0.86-0.25*s2, r:(0.60+0.11*s2)*(R-1), c:P.p, k:-0.55, lab:"e⁻", a:1}];
  var te=F.since(t,1.3);
  if(te>=0&&te<5){ var a=1-ramp(3.6,5,te), dx=0.085*te+0.02;
    pk.push({x:0.5-dx, r:(R-1)*0.5-te*0.5, c:P.p, k:-0.55, lab:"e⁻", a:a}); pk.push({x:0.5+dx, r:(R-1)*0.5+te*0.5, c:P.n, k:0.55, lab:"e⁺", a:a}); }
  function val(i,j){ var x=i/(N-1)*w, v=0.06*(Math.sin(i*0.61+t*2.3+j*1.7)*Math.sin(i*0.23-t*1.1+j*0.9)+0.6*Math.sin(i*1.31+t*3.1+j*2.3));
    for(var q=0;q<pk.length;q++){ var p=pk[q], ddx=x-p.x*w, dr=j-p.r; v+=p.a*Math.exp(-ddx*ddx/(2*sx*sx)-dr*dr/2.6)*Math.cos(p.k*ddx*0.5-t*5); } return v; }
  g.lineWidth=1; g.strokeStyle=P.line; g.globalAlpha=0.5;
  for(var j=0;j<R;j++){ g.beginPath(); for(var i=0;i<N;i++){ var y=top+j*dy-amp*val(i,j); if(i) g.lineTo(i/(N-1)*w,y); else g.moveTo(0,y); } g.stroke(); }
  pk.forEach(function(p){ g.strokeStyle=p.c; g.lineWidth=2;
    for(var j=Math.max(0,Math.floor(p.r-3));j<=Math.min(R-1,Math.ceil(p.r+3));j++){ var dr=j-p.r, i0=Math.max(0,Math.floor((p.x*w-3*sx)/w*(N-1))), i1=Math.min(N-1,Math.ceil((p.x*w+3*sx)/w*(N-1)));
      g.globalAlpha=p.a*Math.exp(-dr*dr/2.6); g.beginPath(); for(var i=i0;i<=i1;i++){ var y=top+j*dy-amp*val(i,j); if(i>i0) g.lineTo(i/(N-1)*w,y); else g.moveTo(i/(N-1)*w,y); } g.stroke(); }
    if(p.a>0.3) tag(g,p.lab,p.x*w,clamp(top+p.r*dy-amp*1.5-12,12,h-12),P,p.c); });
  var ex=ramp(0.55,0.8,s);   /* the photon, while the two are close */
  if(ex>0){ var A=pk[0], B=pk[1]; g.globalAlpha=ex; g.strokeStyle=P.acc; g.lineWidth=2; wavy(g,A.x*w+sx,top+A.r*dy,B.x*w-sx,top+B.r*dy,7,5,-t*9);
    tag(g,"γ",(A.x+B.x)/2*w,top+(A.r+B.r)/2*dy-18,P,P.acc); }
  if(te>=0&&te<0.9){ g.globalAlpha=1-te/0.9; g.strokeStyle=P.acc; g.lineWidth=2; g.beginPath(); g.arc(w/2,top+(R-1)/2*dy,8+te*70,0,TAU); g.stroke(); }
  g.globalAlpha=1;
}

/* ---------------------------------------------------------------- mass
   The same push, again and again, on a photon, an electron, and a top
   quark. The Higgs field is the dots; a particle that feels it carries a
   crowd of them. The button rings the field: a Higgs boson, gone as two
   photons. */
var LANES=[{s:"γ", m:0, halo:0},{s:"e⁻", m:1, halo:11},{s:"t", m:2, halo:40}];
function drawMass(g,w,h,t,P,F){
  ground(g,w,h,P);
  var padL=44, lane=(h-24)/3, u=t%9.6, kicks=Math.floor(u/1.6), sinceK=u-kicks*1.6, fade=1-ramp(8.8,9.6,u), sp=Math.max(16,Math.round(w/34));
  LANES.forEach(function(L,q){ var cy=12+lane*(q+0.5), x;
    if(L.m===0) x=padL+((u*0.42*w)%(w-padL-10));
    else { var dv=L.m===1?0.105*w:0.0035*w, d=0; for(var k=0;k<=kicks;k++) d+=dv*(u-k*1.6); x=padL+14+d%(w-padL-40); }
    for(var gx=padL+sp/2;gx<w;gx+=sp) for(var gy=cy-lane*0.33;gy<=cy+lane*0.34;gy+=lane*0.33){ var ddx=gx-x, ddy=gy-cy, r=Math.hypot(ddx,ddy), pull=L.halo?Math.exp(-r*r/(2*L.halo*L.halo)):0;
      g.globalAlpha=(0.28+0.6*pull)*fade; g.fillStyle=pull>0.15?P.acc:P.line; g.beginPath(); g.arc(gx-ddx*pull*0.45,gy-ddy*pull*0.45,1.6+1.4*pull,0,TAU); g.fill(); }
    g.globalAlpha=fade;
    if(L.m===0){ g.strokeStyle=P.acc; g.lineWidth=2; wavy(g,x-26,cy,x,cy,5,2.5,-t*14); }
    else { if(sinceK<0.35){ g.strokeStyle=P.ink; g.lineWidth=2; g.globalAlpha=fade*(1-sinceK/0.35); g.beginPath(); g.moveTo(x-22-L.halo*0.5,cy-7); g.lineTo(x-14-L.halo*0.5,cy); g.lineTo(x-22-L.halo*0.5,cy+7); g.stroke(); g.globalAlpha=fade; }
      g.fillStyle=L.m===1?P.p:P.r; g.beginPath(); g.arc(x,cy,L.m===1?6:9,0,TAU); g.fill(); }
    tag(g,L.s,22,cy,P,L.m===0?P.acc:(L.m===1?P.p:P.r)); });
  var te=F.since(t,1.5);
  if(te>=0&&te<3.2){ var cx=padL+(w-padL)/2, cy2=h/2;
    if(te<1.4){ g.globalAlpha=1-te/1.4; g.strokeStyle=P.n; g.lineWidth=3; g.beginPath(); g.arc(cx,cy2,6+te*46,0,TAU); g.stroke(); g.lineWidth=1.5; g.beginPath(); g.arc(cx,cy2,2+te*24,0,TAU); g.stroke(); tag(g,"H",cx,cy2,P,P.n); }
    if(te>0.9){ var d2=(te-0.9)*w*0.2; g.globalAlpha=1-ramp(2.4,3.2,te); g.strokeStyle=P.acc; g.lineWidth=2; wavy(g,cx,cy2,cx-d2,cy2-d2*0.25,5,Math.max(1,d2/22),-t*12); wavy(g,cx,cy2,cx+d2,cy2+d2*0.25,5,Math.max(1,d2/22),-t*12);
      if(d2>30){ tag(g,"γ",cx-d2,cy2-d2*0.25-14,P,P.acc); tag(g,"γ",cx+d2,cy2+d2*0.25-14,P,P.acc); } } }
  g.globalAlpha=1;
}

/* ---------------------------------------------------------------- the weak force
   Beta decay in time, left to right: a down quark becomes an up quark, the
   W it gives off becomes an electron and an antineutrino. */
function drawWeak(g,w,h,t,P,F){
  ground(g,w,h,P);
  /* still, on a neutron, until the button plays it once; then it holds the last frame. With motion paused it shows the decay finished */
  var te=F.ev===-1e9 ? (calm()?7:0) : Math.min(8.6,F.since(t,7)), live=F.ev!==-1e9&&te<8.6;
  var cx=w*0.2, cy=h*0.5, R=clamp(h*0.2,26,54), turned=ramp(1.5,2.1,te), vx=w*0.56, wx=cx+R+4+(vx-cx-R-4)*ease(ramp(2.0,3.3,te)), out=ease(ramp(3.3,5.6,te));
  g.strokeStyle=P.line; g.lineWidth=1.5; g.globalAlpha=0.8; g.beginPath(); g.arc(cx,cy,R,0,TAU); g.stroke();
  var qs=[["u",P.r],["d",P.g],[turned>0.5?"u":"d",P.b]];
  qs.forEach(function(q,i){ var a=i*TAU/3+(live?t*0.5:0.4), qx=cx+Math.cos(a)*R*0.48, qy=cy+Math.sin(a)*R*0.48, big=i===2?1+0.5*Math.sin(Math.PI*turned):1;
    g.globalAlpha=1; g.fillStyle=q[1]; g.beginPath(); g.arc(qx,qy,10*big,0,TAU); g.fill();
    g.fillStyle=P.bg; g.font="700 13px Archivo, sans-serif"; g.textAlign="center"; g.textBaseline="middle"; g.fillText(q[0],qx,qy+1); });
  tag(g,turned>0.5?TT("proton"):TT("neutron"),cx,clamp(cy+R+18,0,h-12),P,P.ink);
  if(te>2.0){ g.strokeStyle=P.acc; g.lineWidth=2; g.globalAlpha=1-0.6*ramp(5.6,8.5,te); wavy(g,cx+R+4,cy,wx,cy,6,Math.max(1,(wx-cx-R)/26),-t*10); if(wx-cx>R+50) tag(g,"W⁻",(cx+R+wx)/2,cy-20,P,P.acc); }
  if(out>0){ var ex=vx+(w-vx-34)*out, ey=cy-(h*0.3)*out, ny=cy+(h*0.3)*out;
    g.globalAlpha=1; g.strokeStyle=P.p; g.lineWidth=2.5; g.beginPath(); g.moveTo(vx,cy); g.lineTo(ex,ey); g.stroke(); g.fillStyle=P.p; g.beginPath(); g.arc(ex,ey,5,0,TAU); g.fill();
    g.strokeStyle=P.g; g.setLineDash([6,5]); g.beginPath(); g.moveTo(vx,cy); g.lineTo(ex,ny); g.stroke(); g.setLineDash([]); g.fillStyle=P.g; g.beginPath(); g.arc(ex,ny,4,0,TAU); g.fill();
    if(out>0.5){ tag(g,"e⁻",ex-4,clamp(ey-16,12,h),P,P.p,"right"); tag(g,"ν̄",ex-4,clamp(ny+16,0,h-12),P,P.g,"right"); } }
  g.globalAlpha=1;
  return live;
}

/* three kinds of neutrino, one beam: the chance of each kind against distance over energy.
   Vacuum oscillation with three flavors, the CP phase set to zero; the mixing values are PDG's. */
var S12=Math.sqrt(0.307), S23=Math.sqrt(0.553), S13=Math.sqrt(0.0219), C12=Math.sqrt(1-0.307), C23=Math.sqrt(1-0.553), C13=Math.sqrt(1-0.0219), DM21=7.53e-5, DM31=2.53e-3;
var PMNS=[[C12*C13, S12*C13, S13],[-S12*C23-C12*S23*S13, C12*C23-S12*S23*S13, S23*C13],[S12*S23-C12*C23*S13, -C12*S23-S12*C23*S13, C23*C13]];
function oscillate(x){ var ph=[0, 2.534*DM21*x, 2.534*DM31*x], out=[];   /* x in km per GeV; a beam born as muon neutrinos */
  for(var b=0;b<3;b++){ var re=0, im=0; for(var i=0;i<3;i++){ var a=PMNS[1][i]*PMNS[b][i]; re+=a*Math.cos(ph[i]); im-=a*Math.sin(ph[i]); } out.push(re*re+im*im); } return out; }
function drawOsc(g,w,h,t,P,F){
  var x0=14, x1=w-14, y0=30, y1=h-30, X=2200, cols=[P.p,P.acc,P.g], n=Math.round(x1-x0), k;
  F.layer("osc",function(g){ var i, cum=[];
    ground(g,w,h,P);
    for(i=0;i<=n;i++){ var pr=oscillate(i/n*X); cum.push([0,pr[0],pr[0]+pr[1],pr[0]+pr[1]+pr[2]]); }
    for(k=0;k<3;k++){ g.beginPath(); g.moveTo(x0,y1-(y1-y0)*cum[0][k+1]);
      for(i=1;i<=n;i++) g.lineTo(x0+i,y1-(y1-y0)*cum[i][k+1]);
      for(i=n;i>=0;i--) g.lineTo(x0+i,y1-(y1-y0)*cum[i][k]);
      g.closePath(); g.globalAlpha=0.85; g.fillStyle=cols[k]; g.fill(); }
    g.globalAlpha=1; g.strokeStyle=P.ink; g.lineWidth=1; g.beginPath(); g.moveTo(x0,y1+0.5); g.lineTo(x1,y1+0.5); g.stroke();
    g.font="500 13px Archivo, sans-serif"; g.fillStyle=P.ink2; g.textBaseline="middle"; g.textAlign="left"; g.fillText("0",x0,y1+15); g.textAlign="right"; g.fillText(TT("{n} km per GeV",{n:AtomI18N.N(X)}),x1,y1+15); });
  var u=(t%10)/10, mx=x0+u*(x1-x0), pm=oscillate(u*X), a0=-TAU/4;
  g.strokeStyle=P.ink; g.lineWidth=1.5; g.beginPath(); g.moveTo(mx,y0-2); g.lineTo(mx,y1); g.stroke();
  for(k=0;k<3;k++){ g.fillStyle=cols[k]; g.beginPath(); g.moveTo(mx,y0-14); g.arc(mx,y0-14,11,a0,a0+pm[k]*TAU); g.closePath(); g.fill(); a0+=pm[k]*TAU; }
  g.strokeStyle=P.bg; g.lineWidth=2; g.beginPath(); g.arc(mx,y0-14,11,0,TAU); g.stroke();
}

/* ---------------------------------------------------------------- the ladder
   Powers of ten, downward: what has been seen (solid), what has not (dotted), and the Planck length. */
function drawLadder(g,w,h,t,P,F){
  var ax=74, y0=26, y1=h-50, Y=function(e){ return y0+(y1-y0)*(-10-e)/25; }, seen=-18.4, pl=-34.8, sup="⁰¹²³⁴⁵⁶⁷⁸⁹";
  F.layer("ladder",function(g){
  ground(g,w,h,P);
  g.font="500 13px Archivo, sans-serif"; g.textBaseline="middle";
  for(var e=-10;e>=-35;e-=5){ g.fillStyle=P.ink2; g.textAlign="right"; g.fillText("10⁻"+String(-e).split("").map(function(c){ return sup[+c]; }).join("")+" m",ax-12,Y(e)); g.strokeStyle=P.line; g.lineWidth=1; g.globalAlpha=0.7; g.beginPath(); g.moveTo(ax-6,Y(e)); g.lineTo(ax,Y(e)); g.stroke(); g.globalAlpha=1; }
  g.strokeStyle=P.acc; g.lineWidth=4; g.beginPath(); g.moveTo(ax,Y(-10)); g.lineTo(ax,Y(seen)); g.stroke();
  g.strokeStyle=P.line; g.lineWidth=2; g.setLineDash([2,6]); g.beginPath(); g.moveTo(ax,Y(seen)+6); g.lineTo(ax,Y(pl)); g.stroke(); g.setLineDash([]);
  var marks=[[-10,TT("an atom"),0],[-14.3,TT("a nucleus"),-5],[-15.08,TT("a proton"),7],[seen,TT("quarks and electrons are smaller than this"),0],[pl,TT("the Planck length"),0]];
  g.textAlign="left";
  marks.forEach(function(m){ var y=Y(m[0]); g.fillStyle=m[0]===pl?P.n:P.acc; g.beginPath(); g.arc(ax,y,m[0]<=seen?6:4,0,TAU); g.fill(); g.fillStyle=P.ink; g.font="600 14px Archivo, sans-serif"; wrap(g,m[1],ax+16,y+m[2],w-ax-24); });
  g.fillStyle=P.ink2; g.font="500 14px Archivo, sans-serif"; wrap(g,TT("Nobody has looked here: sixteen powers of ten."),ax+16,Y(-26.5),w-ax-24); });
  var u=(t%14)/14, e2=u<0.4 ? -10+(seen+10)*ease(u/0.4) : seen+(pl-seen)*ease((u-0.4)/0.6), yy=Y(e2), known=u<0.4;
  /* the "?" rides inside the ring: beside it, it was printed over the scale's own labels */
  g.textBaseline="middle"; g.globalAlpha=known?1:0.55+0.35*Math.sin(t*6); if(!known) tag(g,"?",ax,yy,P,P.ink2);
  g.globalAlpha=known?1:0.55+0.35*Math.sin(t*6); g.strokeStyle=P.ink; g.lineWidth=2; g.beginPath(); g.arc(ax,yy,known?10:13,0,TAU); g.stroke();
  g.globalAlpha=1; g.strokeStyle=P.n; g.lineWidth=2; g.beginPath();   /* at the bottom, one idea of what might be there: a loop that vibrates */
  for(var i=0;i<=48;i++){ var a=i/48*TAU, r=11+2.6*Math.sin(a*3+t*7)+1.6*Math.sin(a*5-t*9), x=ax+Math.cos(a)*r, y=Y(pl)+28+Math.sin(a)*r; if(i) g.lineTo(x,y); else g.moveTo(x,y); }
  g.stroke();
}
function wrap(g,s,x,y,maxw){ var words=String(s).split(" "), lines=[""], i;
  for(i=0;i<words.length;i++){ var cand=lines[lines.length-1]?lines[lines.length-1]+" "+words[i]:words[i]; if(g.measureText(cand).width<=maxw||!lines[lines.length-1]) lines[lines.length-1]=cand; else lines.push(words[i]); }
  for(i=0;i<lines.length;i++) g.fillText(lines[i],x,y+(i-(lines.length-1)/2)*17); }

/* ---------------------------------------------------------------- the empty atom, to scale
   The scene "Almost nothing is there" makes the nucleus a marble. This is that sentence seen from above: the
   marble on the center spot of a football field, the stands around the field, and the atom's edge as a ring far
   outside them. The view falls from the ring to the marble as the reader scrolls through the scene (site.js says
   how far), or on the button. Every length is site.js's own (AtomSite.scale): the marble, the field's length,
   and the width of the atom at that scale. The field's width, its markings, and the stands are a pictogram. */
var SC={u:0, own:false, held:null, anim:false, from:0, to:0, t0:0, key:"", lab:"", btn:-1};
/* shown where site.js has the numbers for it (an element with a measured radius), and named at once: what a
   screen reader is told, and what the button offers, change with what is in view, not with every frame */
function scaleShow(){ var S=window.AtomSite&&AtomSite.scale(), f=D.getElementById("scaleFig"), wr=D.getElementById("scaleWrap");
  if(f) f.hidden=!S; if(wr) wr.classList.toggle("on",!!S); if(S){ scaleAlt(S,0); scaleBtn(SC.u>0.5?1:0); } return S; }
function scaleAlt(S, stage){ var key=stage+"|"+S.z+"|"+S.across, c=D.getElementById("scaleCanvas"); if(key===SC.key||!c) return; SC.key=key;
  c.setAttribute("aria-label", stage===0?TT("Seen from above. A ring {n} meters across is the edge of the atom. At its center is a football field, {m} meters long, drawn to the same scale. The nucleus is a marble on the field’s center spot, far too small to see from here.",{n:AtomI18N.N(S.across),m:AtomI18N.N(S.field)}):
    (stage===1?TT("Closer in. The football field fills the view, and the ring that is the edge of the atom is out of sight. The marble on the center spot is still too small to see."):
     TT("The center spot of the field. The marble on it, {c} centimeters across, is the nucleus. The edge of the atom is {n} meters away in every direction.",{c:AtomI18N.N(S.marble*100,1),n:AtomI18N.N(S.across/2)}))); }
function scaleBtn(far){ var bt=D.getElementById("scaleBtn"); if(far===SC.btn||!bt) return; SC.btn=far;
  var bn=far?TT("Back out to the edge"):TT("Zoom in to the marble"); bt.setAttribute("aria-label",bn); bt.firstChild.textContent=bn; bt.lastChild.textContent=far?"−":"+"; }
function rrect(g,x,y,w,h,r){ r=Math.min(r,w/2,h/2); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }
function meters(v){ return v>=1?TT("{n} m",{n:AtomI18N.N(v)}):TT("{n} cm",{n:AtomI18N.N(Math.round(v*100))}); }
function drawScale(g,w,h,t,P,F){
  var S=window.AtomSite&&AtomSite.scale(), cm=calm(), moving=false, now=performance.now();
  if(!S){ ground(g,w,h,P); return false; }
  /* where the view is: on the button's own glide; else where the scroll has the scene; else where it was left */
  if(SC.anim){ var a=cm?1:clamp((now-SC.t0)/4200,0,1); SC.u=SC.from+(SC.to-SC.from)*ease(a);
    if(a>=1){ SC.anim=false; var say=D.getElementById("scaleSay");
      if(say) say.textContent=SC.to>0.5?TT("At the marble. The edge of the atom is {n} meters away in every direction, and there is nothing in between.",{n:AtomI18N.N(S.across/2)}):TT("Back at the edge of the atom, {n} meters across.",{n:AtomI18N.N(S.across)}); }
    else moving=true; }
  else if(S.u!=null){ if(SC.own&&SC.held!==null&&Math.abs(S.u-SC.held)>0.03) SC.own=false;   /* the reader scrolled on: the scroll has the view again */
    if(!SC.own) SC.u=S.u; }
  var u=SC.u, L=S.field, Wd=L*0.64, view=Math.exp(Math.log(S.across*1.2)*(1-u)+Math.log(S.marble*5)*u), k=h/view, cx=w/2, cy=h/2, R=S.across/2*k, rm=S.marble/2*k, pw=L*k, ph=Wd*k;
  ground(g,w,h,P);
  g.lineJoin="round";
  if(pw<w*8){   /* the stands and the field, until they are far larger than the view */
    var so=0.2*L*k, si=0.05*L*k;
    g.globalAlpha=0.16; g.fillStyle=P.line; g.beginPath(); rrect(g,cx-pw/2-so,cy-ph/2-so,pw+2*so,ph+2*so,so*1.4); rrect(g,cx-pw/2-si,cy-ph/2-si,pw+2*si,ph+2*si,si); g.fill("evenodd");
    g.globalAlpha=0.9; g.strokeStyle=P.ink2; g.lineWidth=pw>60?1.5:1; g.strokeRect(cx-pw/2,cy-ph/2,pw,ph);
    if(pw>70){ g.strokeRect(cx-pw/2,cy-ph*0.3,pw*0.16,ph*0.6); g.strokeRect(cx+pw/2-pw*0.16,cy-ph*0.3,pw*0.16,ph*0.6); } }
  g.globalAlpha=0.9; g.strokeStyle=P.ink2; g.lineWidth=1;   /* the halfway line, the center circle, and the center spot */
  if(pw>18){ g.beginPath(); g.moveTo(cx,Math.max(0,cy-ph/2)); g.lineTo(cx,Math.min(h,cy+ph/2)); g.stroke(); }
  if(pw>70&&0.09*pw<w*2){ g.beginPath(); g.arc(cx,cy,0.09*pw,0,TAU); g.stroke(); }
  if(0.0011*pw>3&&0.0011*pw<w*2){ g.beginPath(); g.arc(cx,cy,0.0011*pw,0,TAU); g.stroke(); }
  g.globalAlpha=1;
  if(R<w*2){ g.strokeStyle=P.acc; g.lineWidth=2; g.beginPath(); g.arc(cx,cy,R,0,TAU); g.stroke(); }   /* the atom's edge */
  if(rm>=1.5){ var gr=g.createRadialGradient(cx-rm*0.35,cy-rm*0.4,rm*0.08,cx,cy,rm); gr.addColorStop(0,P.ink); gr.addColorStop(0.35,P.acc); gr.addColorStop(1,P.bg);   /* the marble */
    g.fillStyle=gr; g.beginPath(); g.arc(cx,cy,rm,0,TAU); g.fill(); g.strokeStyle=P.acc; g.lineWidth=1.5; g.beginPath(); g.arc(cx,cy,rm,0,TAU); g.stroke(); }
  else { g.fillStyle=P.acc; g.beginPath(); g.arc(cx,cy,1.5,0,TAU); g.fill(); }
  /* the labels: each beside its own thing, and only where there is room for it */
  var seeRing=R*2<=h*1.02, seeField=pw>=14&&ph<h*0.8, seeMarble=rm>=4, ty;
  if(seeRing){ var rl=TT("the edge of the atom"), rx=cx+R*0.86+10; g.font="600 14px Archivo, sans-serif";
    if(rx+g.measureText(rl).width<w-6) tag(g,rl,rx,cy-R*0.5,P,P.acc,"left"); else if(cx-R*0.86-10-g.measureText(rl).width>6) tag(g,rl,cx-R*0.86-10,cy+R*0.5,P,P.acc,"right"); }
  if(seeField) tag(g,TT("a football field"),cx,Math.min(h-12,cy+ph/2+so+13),P,P.ink2);
  if(seeMarble) tag(g,TT("the nucleus"),cx,Math.max(12,cy-rm-14),P,P.acc);
  else { ty=Math.max(12,cy-Math.max(seeField?ph/2+so:0,16)-14); g.strokeStyle=P.acc; g.lineWidth=1; g.beginPath(); g.moveTo(cx,ty+8); g.lineTo(cx,cy-4); g.stroke(); tag(g,TT("the nucleus"),cx,ty,P,P.acc); }
  /* a scale bar: 1, 2, or 5 times a power of ten, between a sixth and two fifths of the picture's height */
  var b10=Math.pow(10,Math.floor(Math.log(view*0.4)/Math.LN10)), bar=view*0.4>=5*b10?5*b10:(view*0.4>=2*b10?2*b10:b10), bx=w-12, by=h-12;
  g.strokeStyle=P.ink; g.lineWidth=2; g.beginPath(); g.moveTo(bx-bar*k,by-5); g.lineTo(bx-bar*k,by); g.lineTo(bx,by); g.lineTo(bx,by-5); g.stroke();
  tag(g,meters(bar),bx-bar*k-8,by-3,P,P.ink,"right");
  scaleAlt(S, seeRing?0:(seeMarble?2:1)); if(!SC.anim) scaleBtn(u>0.5?1:0);
  return moving;
}

/* ---------------------------------------------------------------- wiring */
/* a button plays its picture, and the sentence that says what happened comes when it has happened (at once
   where motion is paused, since the finished picture is what is shown) */
function press(id, F, say, text, after, again){ var b=D.getElementById(id), tm=0; if(!b||!F) return;
  b.addEventListener("click",function(){ var p=D.getElementById(say); F.fire(); clearTimeout(tm); if(p) p.textContent="";
    tm=setTimeout(function(){ if(p) p.textContent=text(); if(again) b.textContent=TT("Play it again"); }, calm()?0:after*1000); }); }
function start(){
  var f1=figure("deepFields",drawFields,3.6), f2=figure("deepMass",drawMass,3.0), f3=figure("deepWeak",drawWeak,7), f4=figure("deepOsc",drawOsc,2.4), f5=figure("deepLadder",drawLadder,4.6);
  press("deepPair",f1,"deepPairSay",function(){ return TT("A pair: an electron and a positron, made from the energy you added. It takes at least 1.022 MeV, twice an electron's rest energy."); },1.6);
  press("deepRing",f2,"deepRingSay",function(){ return TT("That ring was a Higgs boson. It lasted about 10⁻²² seconds and left as two photons, one of the two signatures it was found by."); },2.4);
  press("deepDecay",f3,"deepDecaySay",function(){ return TT("A down quark became an up quark, so the neutron is now a proton. The W boson carried the charge away and became an electron and an antineutrino."); },5.6,true);
  /* the empty atom, to scale: shown once there is something to draw it with */
  var f6=null, sb=D.getElementById("scaleBtn");
  if(window.AtomSite&&D.getElementById("scaleCanvas")){ scaleShow(); f6=figure("scaleCanvas",drawScale,0);
    if(f6){ window.addEventListener("scroll",f6.wake,{passive:true});
      if(sb) sb.addEventListener("click",function(){ var S=AtomSite.scale(); if(!S) return; SC.from=SC.u; SC.to=SC.u>0.5?0:1; SC.t0=performance.now(); SC.anim=true; SC.own=true; SC.held=S.u; f6.wake(); }); } }
  window.AtomDeep={figures:[f1,f2,f3,f4,f5], oscillate:oscillate, scale:f6, poke:function(){ if(!window.AtomSite) return; SC.key=""; SC.own=false; SC.anim=false; SC.u=0; SC.btn=-1; scaleShow(); if(f6) f6.wake(); }};
}
if(D.readyState==="loading") D.addEventListener("DOMContentLoaded",start); else start();
})();
