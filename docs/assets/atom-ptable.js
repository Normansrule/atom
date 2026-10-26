/* ATOM-PTABLE BEGIN */
/* ----------------------------------------------------------------------------
   The periodic table as the front door, shared by the app and the website.

   Every square is a live window into its element's differentiating electron:
   the subshell its block is named for (s, p, d or f), ray-marched by AtomGL
   with Slater's charge, in the orbital Hund's rule puts the last electron
   in. So the table's shape and the clouds' shapes are the same fact: two
   columns of spheres, six of dumbbells, ten of cloverleaves, fourteen of
   flowers. A filled subshell is drawn round, because it is (Unsold).

   The squares light up in order of atomic number as their clouds are built,
   which is the order electrons fill the table.
   ---------------------------------------------------------------------------- */
var PTable=(function(){
  var ORDER={1:[0,1,-1],2:[0,1,-1,2,-2],3:[0,1,-1,2,-2,3,-3]};
  var MNAME={"1,0":"z","1,1":"x","1,-1":"y","2,0":"z²","2,1":"xz","2,-1":"yz","2,2":"x²−y²","2,-2":"xy",
    "3,0":"z³","3,1":"xz²","3,-1":"yz²","3,2":"z(x²−y²)","3,-2":"xyz","3,3":"x(x²−3y²)","3,-3":"y(3x²−y²)"};
  function pos(Z){ var e=ELEMENTS[Z-1], g=e[6], p=e[7];
    if(g===0) return {r:(Z<=71?9:10), c:3+(Z-(Z<=71?57:89))};
    return {r:p, c:g}; }
  /* the electron the element's block is named for, and which orbital of
     that subshell the last one went into under Hund's rule */
  function valence(Z){
    var c=configOf(Z), L=LET.indexOf(blockOf(Z)), best=null, i;
    for(i=0;i<c.length;i++) if(c[i][1]===L && (!best||c[i][0]>best[0])) best=c[i];
    if(!best){ /* lanthanum, actinium, thorium: the f block before any f electron */
      for(i=0;i<c.length;i++){ var s=c[i];
        if(!best || s[0]+s[1]>best[0]+best[1] || (s[0]+s[1]===best[0]+best[1] && s[0]>best[0])) best=s; } }
    var n=best[0], l=best[1], k=best[2], full=(l>0 && k===2*(2*l+1));
    var m=l===0?0:ORDER[l][(k-1)%(2*l+1)];
    return {n:n,l:l,m:m,k:k,full:full,Zr:zRad(Z,n,l),Ze:zEff(Z,n,l)};
  }
  /* R_nl(r; Z) = Z^(3/2) R_nl(Zr; 1): the shape depends only on n and l, so one
     table per (n, l), filled from the app's exact QM.hydrogenR the first time
     it is needed, serves every element. About twenty tables cover all 118. */
  var RT={};
  function fastR(n,l,r,Z){
    var k=n*16+l, T=RT[k];
    if(!T){ var xm=4.2*n*n+30, N=4096, a=new Float64Array(N+1);
      for(var i=0;i<=N;i++){ var u=i/N; a[i]=QM.hydrogenR(n,l,xm*u*u,1); }
      T=RT[k]={xm:xm,a:a,N:N}; }
    var x=r*Z; if(x>=T.xm) return 0;
    var uu=Math.sqrt(x/T.xm)*T.N, i0=Math.floor(uu), f=uu-i0;
    return Math.pow(Z,1.5)*(i0>=T.N?T.a[T.N]:T.a[i0]*(1-f)+T.a[i0+1]*f);
  }
  function orbName(v, html){
    var s=v.n+LET[v.l];
    if(v.l===0||v.full) return s;
    var sub=MNAME[v.l+","+v.m]||"";
    return html?s+"<sub>"+sub+"</sub>":s+sub;
  }
  function tileFormula(u){ return u[2].length<=7 ? u[2] : (u[3].length<=9 ? u[3] : u[2]); }
  function icon(name, cls){
    return '<svg class="'+(cls||"pt-ic")+'" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="'+(ICONS[name]||"")+'"/></svg>';
  }
  function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;"); }

  /* ------------------------------------------------------------------ the table */
  function create(opt){
    var host=opt.host, D=host.ownerDocument||document;
    var wrap=D.createElement("div"); wrap.className="pt-wrap";
    var grid=D.createElement("div"); grid.className="pt-grid"; grid.setAttribute("role","group");
    grid.setAttribute("aria-label","The periodic table. Arrow keys move between elements; Enter opens one.");
    var cv=D.createElement("canvas"); cv.className="pt-gl"; cv.setAttribute("aria-hidden","true");
    wrap.appendChild(cv); wrap.appendChild(grid);
    if(opt.slot){ opt.slot.classList.add("pt-slot"); grid.appendChild(opt.slot); }
    var tiles=[], Z;
    for(Z=1;Z<=118;Z++){
      var e=ELEMENTS[Z-1], u=USES[Z-1], p=pos(Z), b=D.createElement("button");
      b.type="button"; b.className="pt-el"; b.setAttribute("data-z",Z); b.tabIndex=-1;
      b.style.gridRow=p.r; b.style.gridColumn=p.c;
      b.style.setProperty("--cat", (opt.catColor?opt.catColor(e[5]):CAT[e[5]][1]));
      var f=tileFormula(u), cn=u[2]?(u[3]||u[2]):"";
      /* the name starts with exactly what the square shows (number, symbol, formula),
         so speech input and screen readers agree with the eye (WCAG 2.5.3) */
      b.setAttribute("aria-label", Z+" "+e[1]+(f?" "+f:"")+": "+e[2]+". You meet it in "+u[1]+(cn&&cn!==u[1]&&cn!==f?", "+cn:"")+".");
      var om=ORIGIN[Z-1], dom=AtomWorld.dominant(om), ob='', fr=FRONTIER[Z-1][0], td='';
      for(var ok in ORIGIN_KINDS) if(om[ok]) ob+='<i style="flex-basis:'+(om[ok]*100).toFixed(0)+'%;background:var(--o-'+ok+')"></i>';
      fr.forEach(function(tg){ td+='<i style="background:var(--t-'+tg+')"></i>'; });
      b.style.setProperty("--orig","var(--o-"+dom+")");
      b.innerHTML='<span class="pt-z">'+Z+'</span> '+icon(u[0])+'<span class="pt-s">'+e[1]+'</span>'+   /* the spaces keep "1 H H₂O" readable as text; a grid ignores them */
        (f?' <span class="pt-f">'+f+'</span>':'')+'<span class="pt-orig" aria-hidden="true">'+ob+'</span>'+
        (td?'<span class="pt-tech" aria-hidden="true">'+td+'</span>':'');
      grid.appendChild(b); tiles[Z]=b;
    }
    ["57–71","89–103"].forEach(function(t,i){ var s=D.createElement("span"); s.className="pt-ph"; s.textContent=t;
      s.style.gridRow=6+i; s.style.gridColumn=3; s.setAttribute("aria-hidden","true"); grid.appendChild(s); });
    var sp=D.createElement("i"); sp.className="pt-gap"; sp.style.gridRow=8; sp.style.gridColumn="1 / -1"; grid.appendChild(sp);
    host.appendChild(wrap);

    var api={el:wrap, grid:grid, sel:opt.selected||0, hover:0, tiles:tiles, V:[]};
    for(Z=1;Z<=118;Z++) api.V[Z]=valence(Z);

    /* ---------------------------------------------------- interaction */
    var focusZ=api.sel||1;
    function setFocus(z, move){ if(tiles[focusZ]) tiles[focusZ].tabIndex=-1; focusZ=z; tiles[z].tabIndex=0; if(move) tiles[z].focus(); }
    setFocus(focusZ,false);
    function hover(z){ if(api.hover===z) return; api.hover=z; if(opt.onHover) opt.onHover(z||api.sel); }
    grid.addEventListener("pointerover",function(ev){ var b=ev.target.closest&&ev.target.closest(".pt-el"); hover(b?+b.getAttribute("data-z"):0); });
    grid.addEventListener("pointerleave",function(){ hover(0); });
    grid.addEventListener("focusin",function(ev){ var b=ev.target.closest&&ev.target.closest(".pt-el"); if(b) hover(+b.getAttribute("data-z")); });
    grid.addEventListener("focusout",function(){ hover(0); });
    grid.addEventListener("click",function(ev){ var b=ev.target.closest&&ev.target.closest(".pt-el"); if(!b) return;
      var z=+b.getAttribute("data-z"); api.select(z); setFocus(z,false); if(opt.onPick) opt.onPick(z, ev.detail===0); });   /* detail 0: Enter or Space */
    grid.addEventListener("keydown",function(ev){
      var k=ev.key, d=null; if(k==="ArrowLeft") d=[0,-1]; else if(k==="ArrowRight") d=[0,1]; else if(k==="ArrowUp") d=[-1,0]; else if(k==="ArrowDown") d=[1,0];
      else if(k==="Home"){ setFocus(1,true); ev.preventDefault(); return; } else if(k==="End"){ setFocus(118,true); ev.preventDefault(); return; }
      if(!d) return; ev.preventDefault();
      var p0=pos(focusZ), best=0, bd=1e9;
      for(var z=1;z<=118;z++){ var p=pos(z), dr=p.r-p0.r, dc=p.c-p0.c;
        if(d[0]&&Math.sign(dr)!==d[0]) continue; if(d[1]&&Math.sign(dc)!==d[1]) continue;
        var cost=d[0]?Math.abs(dr)*4+Math.abs(dc)*1.5:Math.abs(dc)*4+Math.abs(dr)*9; if(cost<bd){ bd=cost; best=z; } }
      if(best) setFocus(best,true);
    });
    api.select=function(z){
      if(api.sel&&tiles[api.sel]){ tiles[api.sel].classList.remove("on"); tiles[api.sel].setAttribute("aria-pressed","false"); }
      api.sel=z; tiles[z].classList.add("on"); tiles[z].setAttribute("aria-pressed","true");
      if(opt.onHover && !api.hover) opt.onHover(z);
    };
    for(Z=1;Z<=118;Z++) tiles[Z].setAttribute("aria-pressed","false");
    if(api.sel) api.select(api.sel);
    api.focusSelected=function(){ setFocus(api.sel||1,true); };
    api.tileRect=function(z){ return tiles[z].getBoundingClientRect(); };

    /* ---------------------------------------------------- the clouds */
    var G=null; try{ G=AtomGL.create(cv,null,true); }catch(err){ G=null; }
    if(G && AtomGL.selfCheck(QM.YlmReal)>1e-9) G=null;
    if(!G) wrap.classList.add("pt-nogl");
    api.gl=G;
    var handles=[], bornAt=[], nextZ=1, pop=[], rects=[], dirty=true, visible=true, calm=!!opt.calm, lensW=[];
    for(Z=0;Z<=118;Z++) lensW[Z]=1;
    /* Lenses: the same table read three ways. "shapes" is the orbitals;
       "origin" is where each element was made; "frontier" is what it is
       helping build now. A filter picks one origin or one technology out. */
    api.lens="shapes"; api.filter="";
    api.setLens=function(lens, filter){
      api.lens=lens; api.filter=filter||""; wrap.setAttribute("data-lens",lens);
      for(var z=1;z<=118;z++){
        var w=1;
        if(lens==="origin"){ var m=ORIGIN[z-1]; w=filter?Math.max(0.12,Math.min(1,(m[filter]||0)*1.6)):0.55; }
        else if(lens==="frontier"){ var tg=FRONTIER[z-1][0]; w=filter?(tg.indexOf(filter)>=0?1:0.1):(tg.length?1:0.14); }
        lensW[z]=w; tiles[z].classList.toggle("pt-dim", w<0.3);
      }
      dirty=true;
    };
    for(Z=0;Z<=118;Z++){ pop[Z]=0; }
    /* offsets, not client rects: the table is scaled and slid around by its
       hosts, and the canvas inside it is transformed with it */
    function layout(){
      for(var z=1;z<=118;z++){ var t=tiles[z]; rects[z]=[t.offsetLeft+t.offsetWidth/2, t.offsetTop+t.offsetHeight/2, t.offsetWidth, t.offsetHeight]; }
      api.cw=grid.offsetWidth; api.ch=grid.offsetHeight; dirty=true; }
    api.layout=layout;
    if(typeof ResizeObserver!=="undefined") new ResizeObserver(layout).observe(grid);
    if(typeof IntersectionObserver!=="undefined") new IntersectionObserver(function(es){ es.forEach(function(e){ visible=e.isIntersecting; }); },{rootMargin:"80px"}).observe(wrap);
    api.cloudFor=function(g, z, quick){
      var v=api.V[z];
      return g.makeCloud([{n:v.n,l:v.l,m:v.m,Z:v.Zr,w:1}],"single",fastR,null,{quick:quick!==false,sphere:v.full});
    };
    /* The squares are repainted a few at a time: every frame the ones that
       are growing, fading in or under the pointer, plus the next slice of a
       round robin. How big the slice is follows the frame time, so a fast
       GPU turns all 118 every frame and a slow one stays responsive. */
    var last=0, rr=0, slice=opt.small?16:40, lastW=0, lastH=0, prevPop=[];
    function paint(z, now, t, anim, th, big){
      var hh=handles[z]; if(!hh) return;
      var r=rects[z], age=calm?1:Math.min(1,(now-bornAt[z])/520), s=big?1+0.16*pop[z]:1, rw=r[2]*s, rh=r[3]*s;
      var fade=age*age*(3-2*age), fk=(api.focus&&api.focus.z!==z?1-api.focus.k:1)*lensW[z];
      G.clearRect(r[0]-rw/2,r[1]-rh/2,rw,rh);
      if(fk<=0.01) return;
      G.draw({cloud:hh,rect:[r[0]-rw/2,r[1]-rh/2,rw,rh],yaw:z*0.37+(anim?t*0.16:0),pitch:0.42,
        fov:hh.ext*0.70*QM.C.a0,off:[0,0,0],a0:QM.C.a0,alpha:fade*fk*(0.80+0.20*pop[z]),light:th.light,time:anim?t:1.5,hue:1,
        steps:opt.small?30:40,pos:th.pos,neg:th.neg,posInk:th.posInk,negInk:th.negInk});
    }
    function near(a,b){ var pa=pos(a), pb=pos(b); return Math.abs(pa.r-pb.r)<=1 && Math.abs(pa.c-pb.c)<=1; }
    api.frame=function(now){
      var dt=Math.min(200,now-(last||now)); last=now;
      if(!G||!visible||api.hidden) return;
      if(!rects[1]) layout();
      /* about six milliseconds of building a frame, so the wave keeps time with the display */
      var t0b=performance.now(), cap=calm?118:(opt.small?3:12), built=0, born=[];
      while(nextZ<=118 && built<cap && (built===0||performance.now()-t0b<6)){ handles[nextZ]=api.cloudFor(G,nextZ); bornAt[nextZ]=now; born.push(nextZ); nextZ++; built++; }
      var t=now/1000, anim=!calm, z, popping=[];
      for(z=1;z<=118;z++){
        var tgt=(z===api.hover?1:(z===api.sel?0.55:0)), p=pop[z];
        if(Math.abs(tgt-p)>0.002){ pop[z]=p+(tgt-p)*Math.min(1,dt*0.014); popping.push(z);
          tiles[z].style.transform=pop[z]>0.004?"scale("+(1+0.16*pop[z]).toFixed(4)+")":""; tiles[z].style.zIndex=pop[z]>0.01?3:""; }
        else if(p!==tgt){ pop[z]=tgt; popping.push(z); }
      }
      var th=opt.theme(), w=api.cw, h=api.ch;
      G.size(w,h,Math.min(window.devicePixelRatio||1,1.5),opt.small?320000:820000);
      var cvw=cv.width, cvh=cv.height; if(cvw!==lastW||cvh!==lastH){ lastW=cvw; lastH=cvh; dirty=true; }
      if(api.focus) dirty=true;
      if(dirty){
        dirty=false; G.clear();
        for(z=1;z<=118;z++) if(handles[z]) paint(z,now,t,anim,th,pop[z]>0.004);
      } else {
        var list={}, k;
        for(z=1;z<nextZ;z++) if(now-bornAt[z]<560) list[z]=1;           /* still fading in */
        born.forEach(function(b){ list[b]=1; });
        if(anim){ for(k=0;k<slice;k++){ list[1+(rr+k)%118]=1; } rr=(rr+slice)%118; }
        /* a square that grew or shrank paints over its neighbors: repaint them too */
        var big=popping.concat(Object.keys(prevPop).map(Number)).filter(function(a){ return pop[a]>0.004||prevPop[a]; });
        big.forEach(function(b){ for(var q=1;q<=118;q++) if(near(q,b)) list[q]=1; });
        var order=Object.keys(list).map(Number).filter(function(a){ return handles[a]; }).sort(function(a,b){ return pop[a]-pop[b]; });
        if(!order.length) return;
        /* clear the whole area a growing square can reach, gaps included */
        big.forEach(function(b){ var r=rects[b]; G.clearRect(r[0]-r[2]*0.59,r[1]-r[3]*0.59,r[2]*1.18,r[3]*1.18); });
        order.forEach(function(a){ paint(a,now,t,anim,th,pop[a]>0.004); });
      }
      prevPop={}; for(z=1;z<=118;z++) if(pop[z]>0.004) prevPop[z]=1;
      if(anim){ if(dt>34) slice=Math.max(6,Math.round(slice*0.8)); else if(dt<20) slice=Math.min(118,slice+2); }
      for(z=1;z<nextZ;z++) if(!tiles[z].classList.contains("lit")) tiles[z].classList.add("lit");
    };
    api.redraw=function(){ dirty=true; };
    api.recolor=function(){ for(var z=1;z<=118;z++) tiles[z].style.setProperty("--cat",(opt.catColor?opt.catColor(ELEMENTS[z-1][5]):CAT[ELEMENTS[z-1][5]][1])); };
    api.built=function(){ return G?nextZ-1:118; };
    api.setCalm=function(c){ calm=c; dirty=true; };
    if(!G){ for(Z=1;Z<=118;Z++) tiles[Z].classList.add("lit"); }
    return api;
  }

  /* ------------------------------------------------------------------ the element, in full */
  function num(x, d){ return x===null||x===undefined||isNaN(x) ? "unknown" : (+x).toLocaleString("en-US",{maximumFractionDigits:d===undefined?2:d}); }
  function tempStr(K){ if(K===null||K===undefined) return "unknown"; return num(K,1)+" K ("+num(K-273.15,1)+" °C)"; }
  function yearStr(e){ var y=e[12]; if(y===null) return e[13]; if(y<0) return e[13].charAt(0).toUpperCase()+e[13].slice(1); return y+", "+e[13]; }
  function sup(n){ var m={"-":"⁻","0":"⁰","1":"¹","2":"²","3":"³","4":"⁴","5":"⁵","6":"⁶","7":"⁷","8":"⁸","9":"⁹"};
    return String(n).split("").map(function(c){ return m[c]||c; }).join(""); }
  function abundanceBar(ppm, label){
    if(ppm===null||ppm===undefined) return '<div class="pd-ab"><span>'+label+'</span><b>not measured</b></div>';
    var lg=Math.log10(Math.max(ppm,1e-9)), w=Math.max(2,Math.min(100,(lg+9)/(6+9)*100));
    var txt=ppm>=1?num(ppm,ppm<10?2:0)+" ppm":(ppm*1000>=1?num(ppm*1000,2)+" ppb":"1 part in 10"+sup(Math.round(-lg+6)));
    return '<div class="pd-ab"><span>'+label+'</span><i style="--w:'+w.toFixed(1)+'%"></i><b>'+txt+'</b></div>';
  }
  /* a shell map: where the electrons are counted, not where they are */
  function bohr(Z){
    var sh=shellsOf(Z), n=sh.length, R0=13, R1=92, out=['<svg class="pd-bohr" viewBox="-100 -100 200 200" aria-hidden="true">'];
    out.push('<circle class="pd-nuc" r="9"/>');
    for(var i=0;i<n;i++){
      var r=R0+(R1-R0)*(i+1)/n, k=sh[i], dur=(6+i*5);
      out.push('<circle class="pd-ring" r="'+r.toFixed(1)+'"/><g class="pd-orbit" style="animation-duration:'+dur+'s">');
      for(var j=0;j<k;j++){ var a=j/k*6.2832+i*0.7; out.push('<circle class="pd-e" r="2.6" cx="'+(r*Math.cos(a)).toFixed(1)+'" cy="'+(r*Math.sin(a)).toFixed(1)+'"/>'); }
      out.push('</g>');
    }
    out.push('</svg>'); return out.join("");
  }
  /* the outer subshells as boxes, one per orbital, filled the way Hund said */
  function boxes(Z){
    var c=configOf(Z).slice().sort(function(a,b){ return (a[0]+a[1])-(b[0]+b[1]) || a[0]-b[0]; }), tail=c.slice(-3), out=['<div class="pd-boxes">'];
    tail.forEach(function(s){
      var L=s[1], k=s[2], nb=2*L+1, cells=[];
      for(var j=0;j<nb;j++){ var up=k>j, dn=k>nb+j; cells.push('<i>'+(up?"↑":"")+(dn?"↓":"")+'</i>'); }
      out.push('<span class="pd-sub"><span class="pd-cells">'+cells.join("")+'</span><b>'+s[0]+LET[L]+'<sup>'+k+'</sup></b></span>');
    });
    out.push('</div>'); return out.join("");
  }
  function semfTerms(Z,A){
    var N=A-Z, a=SEMF, v=a.aV*A, s=a.aS*Math.pow(A,2/3), c=a.aC*Z*(Z-1)/Math.pow(A,1/3), as=a.aA*(A-2*Z)*(A-2*Z)/A, d=0;
    if(A>1){ if(Z%2===0&&N%2===0) d=a.aP/Math.sqrt(A); else if(Z%2===1&&N%2===1) d=-a.aP/Math.sqrt(A); }
    return {v:v,s:s,c:c,a:as,d:d,B:v-s-c-as+d};
  }
  function lineList(Z){
    if(Z===1){ var RH=QM.C.Rinf/(1+QM.C.me/QM.C.mp), o=[]; for(var nu=3;nu<=7;nu++) o.push([1e9/(RH*(0.25-1/(nu*nu))),1]); return {lines:o,computed:true}; }
    if(!LINES[Z]) return null;
    return {lines:LINES[Z].map(function(p){ return [airToVac(p[0]),p[1]]; }),computed:false};
  }
  function detail(Z){
    var e=ELEMENTS[Z-1], u=USES[Z-1], v=valence(Z), A=e[16], N=A-Z, cat=CAT[e[5]][0], o=[];
    var blk=blockOf(Z), grp=e[6]?"group "+e[6]:(e[5]==="ln"?"lanthanide":"actinide");
    o.push('<header class="pd-head"><div class="pd-sym" style="--cat:'+CAT[e[5]][1]+'"><span>'+Z+'</span><b>'+e[1]+'</b></div>');
    o.push('<div><h2 class="pd-name" id="pdName">'+e[2]+'</h2><p class="pd-kind">'+cat+' · '+blk+'-block · '+grp+', period '+e[7]+' · '+e[8]+' at room temperature</p></div></header>');
    o.push('<div class="pd-meet">'+icon(u[0],"pd-ic")+'<div><span>You meet it in</span><b>'+esc(u[1])+'</b></div>'+
      (u[2]?'<div><span>Best-known compound</span><b>'+u[2]+'</b>'+(u[3]&&u[3]!==u[2]?'<i>'+esc(u[3])+'</i>':'')+'</div>':
        '<div><span>Compounds</span><b>'+(u[3]?esc(u[3]):(e[5]==="ng"?"almost none":"none known"))+'</b></div>')+'</div>');
    /* where it was made, and what it is building */
    var om=ORIGIN[Z-1], ks=Object.keys(om).sort(function(a,b){ return om[b]-om[a]; });
    o.push('<section class="pd-sec pd-origin"><h3>Where it was made</h3><div class="pd-obar" role="img" aria-label="'+
      ks.map(function(k){ return Math.round(om[k]*100)+" percent "+ORIGIN_KINDS[k].name.toLowerCase(); }).join(", ")+'">'+
      ks.map(function(k){ return '<i style="flex-basis:'+(om[k]*100).toFixed(0)+'%;background:var(--o-'+k+')"></i>'; }).join('')+'</div>'+
      '<ul class="pd-olist">'+ks.map(function(k){ return '<li><i style="background:var(--o-'+k+')"></i>'+ORIGIN_KINDS[k].name+' <b>'+Math.round(om[k]*100)+'%</b></li>'; }).join('')+'</ul>'+
      (ORIGIN_NOTE[Z]?'<p>'+ORIGIN_NOTE[Z]+'</p>':'')+
      '<p class="pd-fine">Approximate shares of the Solar System&rsquo;s supply, after Johnson (2019). Neutron-star mergers stand in for all rapid neutron capture; rare supernovae may make some of it.</p></section>');
    var fr=FRONTIER[Z-1];
    o.push('<section class="pd-sec pd-future"><h3>Building the future</h3>'+
      (fr[0].length?'<p class="pd-tags">'+fr[0].map(function(t){ return '<span style="--tc:var(--t-'+t+')">'+TECH_KINDS[t].name+'</span>'; }).join('')+'</p>':'')+
      '<p>'+esc(fr[1])+(fr[3]?' <a class="pd-src" href="'+fr[3]+'" target="_blank" rel="noopener">Source</a>':'')+'</p>'+
      '<div class="pd-problem"><span>Open problem</span><p>'+esc(fr[2])+'</p></div></section>');
    /* the electrons */
    o.push('<section class="pd-sec"><h3>Its electrons</h3><div class="pd-elec">'+bohr(Z)+'<div>');
    o.push('<p class="pd-config">'+configStr(Z).replace(/([spdf])(\d+)/g,"$1<sup>$2</sup>")+'</p>');
    o.push('<p class="pd-shells">'+Z+' electron'+(Z>1?'s':'')+' in shells of '+shellsOf(Z).join(", ")+'</p>'+boxes(Z));
    if(EXCEPT_WHY[Z]) o.push('<p class="pd-note">It breaks the filling rule: '+EXCEPT_WHY[Z]+'.</p>');
    o.push('</div></div>');
    var S=Z-v.Ze;
    o.push('<p>The electron that puts it in the '+blk+' block sits in a <b>'+orbName(v,true)+'</b> orbital'+(v.full?', a filled subshell, which is perfectly round':'')+
      '. The inner electrons shield it from the nucleus, so it feels a smaller charge (Slater&rsquo;s rules, an estimate):</p>');
    o.push('<p class="pd-eq">Z<sub>eff</sub> = Z − S = '+Z+' − '+num(S,2)+' = '+num(v.Ze,2)+'</p>');
    o.push('<dl class="pd-dl"><div><dt>Atomic radius</dt><dd>'+(ARAD[Z-1]?ARAD[Z-1]+' pm':'not measured')+'</dd></div><div><dt>Atomic mass</dt><dd>'+(e[4]?"["+e[3]+"]":num(e[3],4))+' u</dd></div></dl></section>');
    /* the nucleus */
    var T=semfTerms(Z,A), meas=BA_MEAS[Z+"-"+A], Rn=1.2*Math.pow(A,1/3), magicZ=isMagic(Z), magicN=isMagic(N);
    o.push('<section class="pd-sec"><h3>Its nucleus</h3><p>'+(Z===1&&A===1?'One proton, nothing else.':Z+' protons and '+N+' neutrons'+(e[4]?' in its longest-lived form':' in its most common form')+', '+e[1]+'-'+A+'.')+
      (magicZ&&magicN?' Both numbers are <b>magic</b>: a doubly closed nuclear shell.':(magicZ||magicN?' '+(magicZ?'Its proton':'Its neutron')+' count is a <b>magic number</b>, a closed nuclear shell.':''))+'</p>');
    o.push('<p class="pd-eq">R = r<sub>0</sub>A<sup>1/3</sup> = 1.2 fm <span class="pd-x">×</span> '+A+'<sup>1/3</sup> = '+num(Rn,2)+' fm</p>');
    if(A>1){
      o.push('<p class="pd-eq pd-semf">B = a<sub>V</sub>A − a<sub>S</sub>A<sup>2/3</sup> − a<sub>C</sub>Z(Z−1)/A<sup>1/3</sup> − a<sub>A</sub>(A−2Z)²/A '+(T.d>=0?'+':'−')+' δ<br>= '+
        num(T.v,1)+' − '+num(T.s,1)+' − '+num(T.c,1)+' − '+num(T.a,1)+' '+(T.d>=0?'+':'−')+' '+num(Math.abs(T.d),1)+' = <b>'+num(T.B,1)+' MeV</b></p>');
      o.push('<p>That is '+num(T.B/A,2)+' MeV per nucleon from the liquid-drop formula'+(meas?'; measured: '+num(meas,3)+' MeV':'')+
        '. Building it released that energy, so the nucleus weighs '+num(100*T.B/(A*QM.C.u),3)+'% less than its loose parts: E = mc².</p>');
    }
    o.push('</section>');
    /* the light */
    var L=lineList(Z);
    if(L){ o.push('<section class="pd-sec"><h3>Its light</h3><div class="pd-spec" aria-hidden="true">');
      L.lines.forEach(function(p){ if(p[0]<380||p[0]>780) return; var x=(p[0]-380)/400*100;
        o.push('<i style="left:'+x.toFixed(2)+'%;--a:'+(0.45+0.55*p[1]).toFixed(2)+';--c:'+(wlColor(p[0]))+'"></i>'); });
      o.push('</div><p class="pd-fine">'+(L.computed?'Computed from the Rydberg formula, in vacuum.':'Measured lines from the NIST Atomic Spectra Database, converted to vacuum wavelengths.')+' 380 to 780 nm.</p></section>'); }
    /* the material */
    o.push('<section class="pd-sec"><h3>As a material</h3><dl class="pd-dl">'+
      '<div><dt>Density</dt><dd>'+(e[9]===null?'unknown':num(e[9],e[9]<0.01?6:3)+' g/cm³')+'</dd></div>'+
      '<div><dt>Melts</dt><dd>'+tempStr(e[10])+'</dd></div><div><dt>Boils</dt><dd>'+tempStr(e[11])+'</dd></div>'+
      '<div><dt>Discovered</dt><dd>'+esc(yearStr(e))+'</dd></div></dl>'+
      abundanceBar(e[14],"Earth&rsquo;s crust")+abundanceBar(e[15],"The universe")+'</section>');
    o.push('<section class="pd-sec pd-story"><h3>Where it comes from</h3><p>'+esc(e[17])+'</p><p>'+esc(e[18])+'</p>'+
      '<h3>What it is used for</h3><p>'+esc(e[19])+'</p><h3>Worth knowing</h3><p>'+esc(e[20])+'</p></section>');
    return o.join("");
  }
  function wlColor(w){
    var r=0,g=0,b=0;
    if(w<440){r=-(w-440)/60;b=1;} else if(w<490){g=(w-440)/50;b=1;} else if(w<510){g=1;b=-(w-510)/20;}
    else if(w<580){r=(w-510)/70;g=1;} else if(w<645){r=1;g=-(w-645)/65;} else r=1;
    var f=w<420?0.35+0.65*(w-380)/40:(w>700?Math.max(0.3,0.35+0.65*(780-w)/80):1);
    return "rgb("+Math.round(255*Math.pow(Math.max(0,r)*f,0.8))+","+Math.round(255*Math.pow(Math.max(0,g)*f,0.8))+","+Math.round(255*Math.pow(Math.max(0,b)*f,0.8))+")";
  }
  return {create:create, R:fastR, pos:pos, valence:valence, orbName:orbName, detail:detail, icon:icon, lineList:lineList,
          semfTerms:semfTerms, wlColor:wlColor, tileFormula:tileFormula};
})();


/* ----------------------------------------------------------------------------
   The world behind everything: one WebGL pass, three grounds, cross-faded by
   depth. Nothing here is decoration for its own sake:

     cosmos   at the table. The gas that made the elements, tinted by the seven
              ways nature (and people) make them, with a starfield. Picking an
              element replays its birth where the scene sits: the Big Bang's
              glow, a red giant shedding shells, a supernova, a white dwarf
              detonating, two neutron stars spiraling in, a cosmic ray
              shattering a nucleus, or an accelerator ring.
     light    in the atom. The page is lit by the element's own light: its
              spectral lines, mixed to the color an eye sees, and laid out as
              rings around the atom by wavelength, as a grating would spread
              them (violet inside, red outside).
     vacuum   in the nucleus. The first stir of the colored glue that the
              gluon field takes over inside the proton.
   ---------------------------------------------------------------------------- */
var AtomWorld=(function(){
  var KIND_INDEX={b:0,c:1,n:2,m:3,l:4,w:5,h:6};
  var FS=[
"#version 300 es","precision highp float;","out vec4 o;",
"uniform vec2 uRes;uniform float uT,uCos,uLit,uVac,uEvT,uR,uScale;uniform int uEv,uLight,uN;",
"uniform vec3 uPal[7];uniform float uMix[7];uniform vec2 uEvP,uC;uniform vec4 uQuiet;",
"uniform vec3 uLCol;uniform vec2 uLines[24];uniform vec3 uLineCol[24];",
"float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}",
"float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);",
" return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}",
"float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*n2(p);p=p*2.03+vec2(17.1,9.2);a*=.5;}return s;}",
/* stars: one per cell, twinkling, a few colored */
"float stars(vec2 px,float sc){vec2 g=px/sc;vec2 i=floor(g);vec2 f=fract(g)-.5;float r=h21(i);",
" vec2 o=vec2(h21(i+3.1),h21(i+7.7))-.5;float d=length(f-o*.7);float b=pow(r,18.)*2.2+pow(r,60.)*6.;",
" float tw=.6+.4*sin(uT*(1.+r*3.)+r*40.);return b*tw*smoothstep(.09,0.,d);}",
"vec3 cosmos(vec2 px){",
" vec2 p=px/uRes.y*2.2; float t=uT*.012;",
" vec2 q=vec2(fbm(p+vec2(0.,t)),fbm(p+vec2(5.2,1.3)-t));",
" vec2 r=vec2(fbm(p+3.*q+vec2(1.7,9.2)+t*.7),fbm(p+3.*q+vec2(8.3,2.8)-t*.5));",
" float f=fbm(p+3.*r);",
/* the gas is tinted by the element in hand: its origin shares weight the palette */
" vec3 tint=vec3(0.);float wsum=0.;for(int i=0;i<7;i++){tint+=uPal[i]*uMix[i];wsum+=uMix[i];} tint/=max(wsum,1e-3);",
" vec3 a=mix(uPal[3],uPal[0],clamp(q.x*1.6-.3,0.,1.)), b=mix(uPal[2],uPal[4],clamp(r.y*1.6-.4,0.,1.));",
" vec3 gas=mix(a,b,clamp(f*1.4-.35,0.,1.)); gas=mix(gas,tint,.3);",
" float dens=pow(clamp(f*f*1.9+length(q)*.25-.18,0.,1.),1.6);",
" vec3 c=gas*dens*.78;",
/* dark lanes of dust */
" c*=1.-.45*smoothstep(.6,.9,fbm(p*1.7-r*1.3+9.));",
" c+=vec3(.92,.95,1.)*(stars(px,26.*uScale)+.6*stars(px+311.,61.*uScale));",
" return c;}",
/* ------------------------------------------------ the births */
"vec3 birth(vec2 px){",
" if(uEv<0) return vec3(0.);",
" vec2 d=(px-uEvP)/uR; float L=length(d), T=uEvT; vec3 col=uPal[uEv]; vec3 c=vec3(0.);",
" float ang=atan(d.y,d.x);",
" if(uEv==0){",                          /* the Big Bang: a white-hot glow cooling to violet, with the first ripples */
"  float k=exp(-T*.6); float m=fbm(px/uRes.y*9.+3.)-.5;",
"  c=mix(col,vec3(1.,.95,.85),k)*(k*1.6+.25)*(1.+m*1.2)*exp(-L*L*.06);",
" } else if(uEv==1){",                   /* a cosmic ray: a streak, a hit, fragments */
"  vec2 dir=normalize(vec2(1.,-.35)); float s=dot(d,dir), w=abs(dot(d,vec2(-dir.y,dir.x)));",
"  float head=-4.+T*3.2; float tr=smoothstep(.06,0.,w)*step(s,min(head,0.))*exp(-(min(head,0.)-s)*.6);",
"  c=col*tr*1.6;",
"  if(head>0.){ float u=head; for(int i=0;i<7;i++){ float a=float(i)*.9+1.3; vec2 fd=vec2(cos(a),sin(a));",
"    float fs=dot(d,fd), fw=abs(dot(d,vec2(-fd.y,fd.x))); c+=col*smoothstep(.05,0.,fw)*step(0.,fs)*step(fs,u*.9)*exp(-u*.5)*1.4; }",
"   c+=vec3(1.)*exp(-L*L*30.)*exp(-u*1.5)*2.; }",
" } else if(uEv==2){",                   /* two neutron stars spiral in (a chirp), merge, and throw out gold-red ejecta */
"  float tm=2.6; if(T<tm){ float rr=1.2*pow(1.-T/tm,.25)+.02, ph=pow(T,1.6)*7.;",
"   vec2 s1=vec2(cos(ph),sin(ph))*rr*.5, s2=-s1; c+=vec3(.85,.9,1.)*(exp(-dot(d-s1,d-s1)*180.)+exp(-dot(d-s2,d-s2)*180.))*2.;",
"   c+=col*.25*sin(L*14.-T*T*6.)*exp(-L*.8)*smoothstep(0.,1.,T);",           /* gravitational waves, drawn as ripples */
"  } else { float u=T-tm; float shell=exp(-pow((L-u*.55)*3.,2.)); float m=fbm(vec2(ang*3.,L*4.)+u*.3);",
"   c+=mix(col,vec3(1.,.3,.15),smoothstep(.2,1.,L/(u*.55+.01)))*shell*(.6+m)*exp(-u*.25)*1.4;",
"   c+=vec3(1.,.9,.6)*exp(-L*L*8.)*exp(-u*2.5)*3.; }",
" } else if(uEv==3){",                   /* a massive star collapses and explodes: turbulent blue shell */
"  if(T<1.2){ float s=.35+.15*sin(T*9.); c=col*exp(-L*L/(s*s))*1.3; }",
"  else { float u=T-1.2; float m=fbm(vec2(ang*4.,L*6.-u)+4.); float R=u*.6; float shell=exp(-pow((L-R)*(2.5+m*2.),2.));",
"   c=mix(col,vec3(.75,1.,1.),m)*shell*(.5+m*1.2)*exp(-u*.22)*1.5+vec3(1.)*exp(-L*L*10.)*exp(-u*3.)*4.; }",
" } else if(uEv==4){",                   /* a red giant pulses and sheds shells: a planetary nebula */
"  float pul=.6+.08*sin(T*2.2); c=col*exp(-L*L/(pul*pul))*.9;",
"  for(int i=0;i<4;i++){ float R=mod(T*.18+float(i)*.45,1.8)+.6; c+=mix(col,uPal[5],float(i)/4.)*exp(-pow((L-R)*9.,2.))*.5*(1.-R/2.4); }",
"  c+=vec3(1.)*exp(-L*L*60.)*.8;",
" } else if(uEv==5){",                   /* a white dwarf detonates: one clean, fast, bright shell */
"  if(T<.8){ c=vec3(.9,.95,1.)*exp(-L*L*90.)*1.5; }",
"  else { float u=T-.8; float R=u*.8; c=col*exp(-pow((L-R)*4.,2.))*exp(-u*.3)*1.8+vec3(1.)*exp(-L*L*6.)*exp(-u*2.)*5.; }",
" } else {",                              /* people: an accelerator ring with a bunch going round, and a target */
"  float ring=exp(-pow((L-1.)*28.,2.)); float b=mod(ang-T*3.,6.2832); c=col*ring*(.35+1.5*exp(-b*b*8.));",
"  vec2 tp=vec2(1.,0.); c+=vec3(1.)*exp(-dot(d-tp,d-tp)*400.)*(.5+.5*sin(T*20.));",
" }",
" return c;}",
/* ------------------------------------------------ the element's own light */
"vec3 lit(vec2 px){",
" vec2 d=px-uC; float L=length(d)/uR;",
" vec3 c=uLCol*(.07+.33*exp(-L*L*.55));",
" for(int i=0;i<24;i++){ if(i>=uN) break; float R=.95+uLines[i].x*1.05;",
"  c+=uLineCol[i]*uLines[i].y*exp(-pow((L-R)*90.,2.))*.85; c+=uLineCol[i]*uLines[i].y*exp(-pow((L-R)*14.,2.))*.08; }",
" float m=fbm(px/uRes.y*3.+uT*.02); c*=.85+.3*m;",
" return c;}",
"vec3 vac(vec2 px){ vec2 p=px/uRes.y*5.; float v=fbm(p+uT*.05); float k=smoothstep(.55,.9,v);",
" vec3 w=.5+.5*cos(v*12.+uT*.2+vec3(0.,2.1,4.2)); return w*k*.12; }",
"void main(){",
" vec2 px=gl_FragCoord.xy/uScale; px.y=uRes.y-px.y;",
" vec3 c=vec3(0.);",
" if(uCos>.001){ vec3 k=cosmos(px); float q=1.;",
"  if(uQuiet.z>uQuiet.x){ vec2 dq=max(max(uQuiet.xy-px,px-uQuiet.zw),0.); q=mix(.35,1.,smoothstep(0.,72.,length(dq))); }",   /* quieter behind the title and readout */
"  c+=(k+birth(px)*.85)*q*uCos; }",
" if(uLit>.001) c+=lit(px)*uLit;",
" if(uVac>.001) c+=vac(px)*uVac;",
" if(uLight==1){ c=vec3(.93,.94,.93)-c*.55; }",                               /* the light table prints it as a negative */
" o=vec4(c,1.);}"
  ].join("\n");

  function hex(h){ return [parseInt(h.substr(1,2),16)/255,parseInt(h.substr(3,2),16)/255,parseInt(h.substr(5,2),16)/255]; }
  function dominant(mix){ var best="h", bw=-1; for(var k in mix) if(mix[k]>bw){ bw=mix[k]; best=k; } return best; }

  function create(canvas){
    var gl=null; try{ gl=canvas.getContext("webgl2",{alpha:false,antialias:false,preserveDrawingBuffer:false}); }catch(e){}
    if(!gl||typeof gl.createShader!=="function") return null;
    function sh(t,s){ var x=gl.createShader(t); gl.shaderSource(x,s); gl.compileShader(x);
      if(!gl.getShaderParameter(x,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; }
    var pr;
    try{ pr=gl.createProgram();
      gl.attachShader(pr,sh(gl.VERTEX_SHADER,"#version 300 es\nin vec2 p;void main(){gl_Position=vec4(p,0.,1.);}"));
      gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS)); gl.bindAttribLocation(pr,0,"p"); gl.linkProgram(pr);
      if(!gl.getProgramParameter(pr,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    }catch(err){ return null; }
    var L={}; ["uRes","uT","uCos","uLit","uVac","uEvT","uR","uScale","uEv","uLight","uN","uPal","uMix","uEvP","uC","uQuiet","uLCol","uLines","uLineCol"]
      .forEach(function(k){ L[k]=gl.getUniformLocation(pr,k); });
    var vao=gl.createVertexArray(); gl.bindVertexArray(vao);
    var vb=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,vb);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
    var order=["b","c","n","m","l","w","h"], pal=new Float32Array(21), palInk=new Float32Array(21);
    order.forEach(function(k,i){ var a=hex(ORIGIN_KINDS[k].col), b=hex(ORIGIN_KINDS[k].ink);
      pal[i*3]=a[0];pal[i*3+1]=a[1];pal[i*3+2]=a[2]; palInk[i*3]=b[0];palInk[i*3+1]=b[1];palInk[i*3+2]=b[2]; });
    var api={ scale:0.6, ev:-1, evT0:0 }, last=0, lines=new Float32Array(48), lcols=new Float32Array(72), nl=0, lcol=[0,0,0];
    /* the element's light: line positions mapped 380-780 nm to 0-1, and their colors */
    api.setLight=function(list, rgb){
      nl=Math.min(24,list.length); lines.fill(0); lcols.fill(0);
      for(var i=0;i<nl;i++){ var w=list[i][0], c=PTable.wlColor(w).match(/\d+/g).map(Number);
        lines[i*2]=(w-380)/400; lines[i*2+1]=Math.min(1,list[i][1]);
        lcols[i*3]=c[0]/255; lcols[i*3+1]=c[1]/255; lcols[i*3+2]=c[2]/255; }
      lcol=rgb||[.5,.5,.6];
    };
    api.birth=function(mix, now){ api.ev=KIND_INDEX[dominant(mix)]; api.evT0=now; };
    api.draw=function(o){
      var w=o.w, h=o.h, s=api.scale*(o.small?0.8:1), bw=Math.max(2,Math.round(w*s)), bh=Math.max(2,Math.round(h*s));
      if(canvas.width!==bw||canvas.height!==bh){ canvas.width=bw; canvas.height=bh; }
      gl.viewport(0,0,bw,bh); gl.useProgram(pr); gl.bindVertexArray(vao);
      gl.uniform2f(L.uRes,w,h); gl.uniform1f(L.uScale,s); gl.uniform1f(L.uT,o.t);
      gl.uniform1f(L.uCos,o.cos); gl.uniform1f(L.uLit,o.lit); gl.uniform1f(L.uVac,o.vac);
      gl.uniform3fv(L.uPal,o.light?palInk:pal);
      var mx=new Float32Array(7); order.forEach(function(k,i){ mx[i]=(o.mix&&o.mix[k])||0; }); gl.uniform1fv(L.uMix,mx);
      gl.uniform1i(L.uEv,o.calm?(api.ev>=0?api.ev:-1):api.ev); gl.uniform1f(L.uEvT,o.calm?40:Math.max(0,(o.now-api.evT0)/1000));
      gl.uniform2f(L.uEvP,o.evx,o.evy); gl.uniform1f(L.uR,o.r);
      gl.uniform2f(L.uC,o.cx,o.cy);
      var q=o.quiet||[0,0,0,0]; gl.uniform4f(L.uQuiet,q[0],q[1],q[2],q[3]);
      gl.uniform3fv(L.uLCol,lcol); gl.uniform2fv(L.uLines,lines); gl.uniform3fv(L.uLineCol,lcols); gl.uniform1i(L.uN,nl);
      gl.uniform1i(L.uLight,o.light?1:0);
      gl.drawArrays(gl.TRIANGLES,0,3);
    };
    api.govern=function(ms){ if(ms>30&&api.scale>0.35) api.scale*=0.9; else if(ms<16&&api.scale<0.6) api.scale=Math.min(0.6,api.scale*1.03); };
    return api;
  }
  /* the color an eye would see from an element: its lines if Atom has them,
     otherwise the light of the places that made it */
  function elementLight(z){
    var L=PTable.lineList(z);
    if(L){ var vis=L.lines.filter(function(p){ return p[0]>=380&&p[0]<=780; });
      if(vis.length) return {lines:vis, rgb:linesRGB(vis), measured:!L.computed, computed:!!L.computed}; }
    var mix=ORIGIN[z-1], c=[0,0,0], s=0;
    for(var k in mix){ var h=hex(ORIGIN_KINDS[k].col); c[0]+=h[0]*mix[k]; c[1]+=h[1]*mix[k]; c[2]+=h[2]*mix[k]; s+=mix[k]; }
    return {lines:[], rgb:[c[0]/s,c[1]/s,c[2]/s], measured:false, computed:false};
  }
  return {create:create, elementLight:elementLight, dominant:dominant, KIND_INDEX:KIND_INDEX};
})();

/* ----------------------------------------------------------------------------
   The workbench: three things to build with your own hands, each computed.

     Fuse    pick a reaction and a temperature, then fire. Q comes from
             measured mass excesses (AME 2020); the Coulomb barrier from
             1.44 MeV fm Z1Z2 / (R1 + R2); the chance of tunneling through it
             from Gamow's factor exp(-sqrt(E_G / E)); and where reactions
             actually happen from the Gamow peak E0 = (E_G (kT)^2 / 4)^(1/3).
     Bond    pull two protons apart and watch one shared electron decide
             whether they bond. The simplest molecule, H2+, in the textbook
             LCAO model, with its closed-form overlap and energy integrals.
     Charge  build a battery cell from real electrode materials. Voltage is
             how far lithium (or sodium) falls in energy between the two
             electrodes; capacity is how much each gram can hold.
   ---------------------------------------------------------------------------- */
var AtomSims=(function(){
  /* ------------------------------------------------------------ nuclei */
  var NUC={ n:{Z:0,A:1,s:"n"}, p:{Z:1,A:1,s:"p"}, d:{Z:1,A:2,s:"D"}, t:{Z:1,A:3,s:"T"}, he3:{Z:2,A:3,s:"He-3"},
    he4:{Z:2,A:4,s:"He-4"}, li6:{Z:3,A:6,s:"Li-6"}, b11:{Z:5,A:11,s:"B-11"}, c12:{Z:6,A:12,s:"C-12"},
    fe56:{Z:26,A:56,s:"Fe-56"}, te112:{Z:52,A:112,s:"Te-112"}, ep:{Z:0,A:0,s:"e⁺"}, nu:{Z:0,A:0,s:"ν"} };
  var REACT=[
    {id:"dt",  label:"D + T",     a:["d","t"],   b:["he4","n"], el:1,
     note:"The easiest fusion reaction to light, and the fuel of ITER, the National Ignition Facility, and nearly every power-plant design."},
    {id:"dd",  label:"D + D",     a:["d","d"],   b:["he3","n"], el:1,
     note:"Seawater holds enough deuterium for billions of years. Half the time this makes helium-3 and a neutron, half the time tritium and a proton."},
    {id:"dhe3",label:"D + He-3",  a:["d","he3"], b:["he4","p"], el:2,
     note:"Almost no neutrons, but helium-3 is scarce on Earth, one reason people talk about mining the Moon for it."},
    {id:"pb11",label:"p + B-11",  a:["p","b11"], b:["he4","he4","he4"], el:5,
     note:"Aneutronic: the products are three charged helium nuclei. The catch is a barrier five times taller than D + T's."},
    {id:"pp",  label:"p + p",     a:["p","p"],   b:["d","ep","nu"], el:1,
     note:"How the Sun begins. The weak force has to turn a proton into a neutron mid-collision, so a proton in the Sun's core waits billions of years on average."},
    {id:"nli6",label:"n + Li-6",  a:["n","li6"], b:["t","he4"], el:3,
     note:"Breeding: a fusion plant's lithium blanket turns its own neutrons into new tritium. A neutron has no charge, so there is no barrier at all."},
    {id:"aaa", label:"3 He-4",    a:["he4","he4","he4"], b:["c12"], el:6,
     note:"The triple-alpha process, the way red giants make the carbon in you. Two helium nuclei must meet a third within about 10⁻¹⁶ seconds."},
    {id:"fefe",label:"Fe + Fe",   a:["fe56","fe56"], b:["te112"], el:26,
     note:"Past iron, fusion stops paying. This one would absorb energy instead of releasing it, which is why stars that build iron cores collapse."}
  ];
  var MEV_PER_U_TO_J_PER_KG=9.6485e13, GASOLINE=4.6e7;
  function mass(k){ return NUC[k].A||0.000549; }
  function Qof(r){
    if(r.id==="fefe") return bindingSEMF(52,112)-2*BA_MEAS["26-56"]*56;
    if(r.id==="aaa") return 3*MASS_EXCESS.he4-MASS_EXCESS.c12;
    if(r.id==="pp") return 2*MASS_EXCESS.p-MASS_EXCESS.d;
    var q=0; r.a.forEach(function(k){ q+=MASS_EXCESS[k]; }); r.b.forEach(function(k){ q-=MASS_EXCESS[k]; }); return q;
  }
  function barrier(a,b){ var A=NUC[a], B=NUC[b]; if(!A.Z||!B.Z) return 0;
    return 1.44*A.Z*B.Z/(1.2*(Math.pow(A.A,1/3)+Math.pow(B.A,1/3))); }        /* MeV */
  function gamowE(a,b){ var A=NUC[a], B=NUC[b]; if(!A.Z||!B.Z) return 0;
    var mu=A.A*B.A/(A.A+B.A)*931.494, x=Math.PI*A.Z*B.Z/137.036; return 2*mu*x*x*1000; }    /* keV */

  function fmt(x,d){ return (+x).toLocaleString("en-US",{maximumFractionDigits:d,minimumFractionDigits:d}); }
  function sci(x){ if(!isFinite(x)||x<=0) return "0"; var e=Math.floor(Math.log10(x)), m=x/Math.pow(10,e);
    return (Math.abs(e)<3?fmt(x,e<0?3:1):fmt(m,1)+" × 10"+String(e).split("").map(function(c){ return "⁻⁰¹²³⁴⁵⁶⁷⁸⁹"["-0123456789".indexOf(c)]; }).join("")); }
  function sup(n){ return String(n).split("").map(function(c){ return "⁻⁰¹²³⁴⁵⁶⁷⁸⁹".charAt("-0123456789".indexOf(c)); }).join(""); }
  function bstr(B){ return B<10?fmt(B*1000,0)+" keV":fmt(B,1)+" MeV"; }   /* MeV once the wall is tens of MeV tall */
  function fit(c){ var r=c.getBoundingClientRect(), d=Math.min(window.devicePixelRatio||1,2);
    var w=Math.max(1,Math.round(r.width*d)), h=Math.max(1,Math.round(r.height*d));
    if(c.width!==w||c.height!==h){ c.width=w; c.height=h; }
    var g=c.getContext("2d"); g.setTransform(d,0,0,d,0,0); return {g:g,w:r.width,h:r.height}; }
  function drawNucleus(g,x,y,k,R,th,alpha){
    var N=NUC[k];
    if(k==="ep"||k==="nu"){ g.globalAlpha=alpha; g.fillStyle=k==="ep"?th.acc:th.ink3; g.beginPath(); g.arc(x,y,R*0.35,0,6.2832); g.fill();
      g.fillStyle=th.ink; g.font="600 14px Archivo, sans-serif"; g.textAlign="center"; halo(g,N.s,x,y-R*0.6,th); g.globalAlpha=1; return; }
    var A=Math.min(N.A,40), r=R*0.42*(N.A>40?0.55:1), pts=[], i;
    for(i=0;i<A;i++){ var a=i*2.39996, rr=r*Math.sqrt(i/A)*Math.pow(N.A,1/3)*0.62; pts.push([x+Math.cos(a)*rr, y+Math.sin(a)*rr, i<Math.round(A*N.Z/N.A)]); }
    g.globalAlpha=alpha;
    pts.forEach(function(p){ var gr=g.createRadialGradient(p[0]-r*0.3,p[1]-r*0.3,r*0.1,p[0],p[1],r);
      gr.addColorStop(0,p[2]?th.pF[0]:th.nF[0]); gr.addColorStop(1,p[2]?th.pF[1]:th.nF[1]);
      g.fillStyle=gr; g.beginPath(); g.arc(p[0],p[1],r,0,6.2832); g.fill(); });
    g.fillStyle=th.ink; g.font="600 14px Archivo, sans-serif"; g.textAlign="center"; halo(g,N.s,x,y-r*Math.pow(N.A,1/3)*0.75-r-4,th);
    g.globalAlpha=1;
  }

  /* ------------------------------------------------------------ the fusion bench */
  function Fuse(root, ctx){
    var st={r:REACT[0], kT:10, fire:-1e9, shots:0};
    root.innerHTML=
      '<div class="sb-controls"><div class="sb-pick" role="radiogroup" aria-label="Choose a reaction">'+
        REACT.map(function(r,i){ return '<button type="button" role="radio" aria-checked="'+(i?"false":"true")+'" data-r="'+r.id+'">'+r.label+'</button>'; }).join('')+
      '</div><label class="sb-slider"><span>Temperature <b data-o="T"></b></span><input type="range" min="0" max="1000" value="120" data-i="T" aria-label="Plasma temperature"></label>'+
      '<button type="button" class="sb-go" data-i="fire">Fire</button></div>'+
      '<div class="sb-stage"><canvas class="sb-cv" data-c="anim" aria-hidden="true"></canvas><canvas class="sb-cv" data-c="gamow" aria-hidden="true"></canvas></div>'+
      '<dl class="sb-read"><div><dt>Energy released, Q</dt><dd data-o="Q"></dd></div><div><dt>Coulomb barrier</dt><dd data-o="B"></dd></div>'+
      '<div><dt>Where reactions happen</dt><dd data-o="E0"></dd></div><div><dt>Chance to tunnel there</dt><dd data-o="P"></dd></div>'+
      '<div><dt>Per kilogram of fuel</dt><dd data-o="kg"></dd></div></dl>'+
      '<p class="sb-note" data-o="note"></p><p class="sb-out" data-o="out" aria-live="polite"></p>';
    var $=function(s){ return root.querySelector(s); };
    function T(){ var v=+$('[data-i="T"]').value/1000; return Math.pow(10, v*2.5); }   /* 1 to 316 keV */
    function readout(){
      var r=st.r, Q=Qof(r), a=r.a[0], b=r.a[1], B=barrier(a,b), EG=gamowE(a,b), kT=st.kT;
      var E0=EG?Math.pow(EG*kT*kT/4,1/3):0, P=EG?Math.exp(-Math.sqrt(EG/E0)):1, mIn=0; r.a.forEach(function(k){ mIn+=mass(k); });
      var perkg=Q/mIn*MEV_PER_U_TO_J_PER_KG;
      ctx.set($('[data-o="T"]'), fmt(kT,kT<10?1:0)+" keV, "+sci(kT*1.1605e7)+" K");
      ctx.set($('[data-o="Q"]'), (Q>=0?"+":"")+fmt(Q,2)+" MeV"+(r.id==="fefe"?" (liquid-drop estimate)":""));
      ctx.set($('[data-o="B"]'), B?bstr(B):"none");
      ctx.set($('[data-o="E0"]'), EG?fmt(E0,1)+" keV":"any energy");
      /* past about 1 in 10^15 the odds are written as a power of ten, which also
         keeps iron on iron (1 in 10^430 or so) from underflowing to "1 in 0" */
      var lx=EG?Math.sqrt(EG/E0)/Math.LN10:0;
      ctx.set($('[data-o="P"]'), EG?(lx<15?"1 in "+sci(1/P):"1 in 10"+sup(Math.round(lx))):"certain");
      ctx.set($('[data-o="kg"]'), Q>0?sci(perkg)+" J, "+sci(perkg/GASOLINE)+" × gasoline":"costs "+sci(-perkg)+" J");
      ctx.set($('[data-o="note"]'), r.note);
      return {Q:Q,B:B,EG:EG,E0:E0,P:P};
    }
    root.addEventListener("click",function(e){
      var b=e.target.closest("[data-r]");
      if(b){ st.r=REACT.filter(function(r){ return r.id===b.getAttribute("data-r"); })[0];
        [].forEach.call(root.querySelectorAll("[data-r]"),function(x){ x.setAttribute("aria-checked",x===b?"true":"false"); });
        st.fire=-1e9; readout(); ctx.dirty(); return; }
      if(e.target.closest('[data-i="fire"]')){ st.fire=performance.now(); st.shots++; var R=readout();
        var parts=splitEnergy(st.r,R.Q);
        if(st.r.id==="pp") ctx.set($('[data-o="out"]'),"Fused, slowly: a deuteron, a positron, and a neutrino. The positron soon meets an electron and turns 1.02 MeV into light; the neutrino carries about 0.26 MeV straight out of the Sun.");
        else ctx.set($('[data-o="out"]'), R.Q>0?"Fused. "+parts.map(function(p){ return NUC[p[0]].s+" carries "+fmt(p[1],2)+" MeV"; }).join(", ")+".":"Fused, but the product holds less binding than the two irons did: the reaction swallowed "+fmt(-R.Q,1)+" MeV.");
        ctx.emit("fusion:"+st.r.id); if(st.kT>=10) ctx.emit("fusion:"+st.r.id+":hot"); }
    });
    $('[data-i="T"]').addEventListener("input",function(){ st.kT=T(); readout(); ctx.dirty(); });
    st.kT=T(); readout();
    function splitEnergy(r,Q){
      if(Q<=0) return [];
      if(r.b.length===2){ var m1=mass(r.b[0]), m2=mass(r.b[1]); return [[r.b[0],Q*m2/(m1+m2)],[r.b[1],Q*m1/(m1+m2)]]; }
      if(r.id==="pp") return [["d",0.0],["ep",Q-1.022-0.26],["nu",0.26]];
      return r.b.map(function(k){ return [k,Q/r.b.length]; });
    }
    return { frame:function(now, th){
      var c1=fit($('[data-c="anim"]')), g=c1.g, w=c1.w, h=c1.h, r=st.r, R=readout(), t=(now-st.fire)/1000, cx=w*0.36, cy=h*0.36;
      g.clearRect(0,0,w,h);
      /* the barrier, drawn under the collision: V(r) for the first pair */
      var a=r.a[0], b=r.a[1], B=R.B, x0=w*0.56, x1=w-12, by=h-22, top=h*0.30;
      if(B>0){ g.strokeStyle=th.ink3; g.lineWidth=1.5; g.beginPath();
        var rC=1.2*(Math.pow(NUC[a].A,1/3)+Math.pow(NUC[b].A,1/3));
        for(var i=0;i<=200;i++){ var fx=i/200, rr=0.2+fx*12, V=rr<rC?-0.6*B:1.44*NUC[a].Z*NUC[b].Z/rr, y=by-(Math.min(V,B*1.05)/(B*1.1))*(by-top);
          var X=x0+fx*(x1-x0); if(i===0) g.moveTo(X,y); else g.lineTo(X,y); }
        g.stroke();
        var E0=R.E0/1000, ey=by-(E0/(B*1.1))*(by-top);
        g.setLineDash([4,5]); g.strokeStyle=th.acc; g.beginPath(); g.moveTo(x0,ey); g.lineTo(x1,ey); g.stroke(); g.setLineDash([]);
        g.fillStyle=th.ink2; g.font="500 14px Archivo, sans-serif";
        /* the labels sit beside the wall, never across it: right of it if they fit, else left */
        var Xb=x0+((rC-0.2)/12)*(x1-x0), L1="a typical collision, "+fmt(R.E0,0)+" keV,", L2="has to tunnel through it",
            tw=Math.max(g.measureText(L1).width,g.measureText(L2).width), right=Xb+8+tw<=x1, lx=right?Xb+8:Xb-8;
        g.textAlign=right?"left":"right";
        if(w<520){ g.textAlign="right"; halo(g,"the barrier, "+bstr(B),x1,top-8,th); g.textAlign=right?"left":"right"; }   /* clear of the nuclei on a phone */
        else halo(g,"the barrier, "+bstr(B),lx,top-8,th);
        halo(g,L1,lx,Math.min(by-20,ey-22),th);
        halo(g,L2,lx,Math.min(by-4,ey-6),th);
        g.textAlign="left";
      }
      /* the collision */
      var R0=Math.min(34,h*0.12), sep, alpha=1;
      var ph=ctx.calm()?3:t;
      if(ph<0||ph>6){ sep=0.42*(w*0.5); }
      else if(ph<1.2){ var u=ph/1.2; sep=0.42*(w*0.5)*(1-u*u); }
      else sep=0;
      if(ph<1.35||ph>6){
        var n=r.a.length;
        r.a.forEach(function(k,i){ var ang=(i/n)*6.2832+Math.PI, X=cx+Math.cos(ang)*Math.max(sep,R0*0.9), Y=cy+Math.sin(ang)*Math.max(sep,R0*0.9)*0.25;
          drawNucleus(g,X,Y,k,R0,th,1); });
      } else {
        var u2=Math.min(1,(ph-1.35)/2.2), Q=R.Q;
        if(ph<1.8){ g.globalAlpha=1-(ph-1.35)/0.45; g.fillStyle=Q>0?"#ffffff":th.ink3; g.beginPath(); g.arc(cx,cy,R0*(1+(ph-1.35)*6),0,6.2832); g.fill(); g.globalAlpha=1; }
        var parts=splitEnergy(r,Q), outs=r.b;
        outs.forEach(function(k,i){ var E=(parts[i]&&parts[i][1])||0.2, v=Math.sqrt(Math.max(E,0.05)/Math.max(mass(k),0.3));
          var ang=(i/outs.length)*6.2832+0.4, d=u2*Math.min(w*0.28,40+v*70), X=cx+Math.cos(ang)*d, Y=cy+Math.sin(ang)*d*0.45;
          drawNucleus(g,X,Y,k,R0,th,1);
          if(parts[i]&&u2>0.4){ g.fillStyle=th.ink2; g.font="500 14px Archivo, sans-serif"; g.textAlign="center"; halo(g,fmt(parts[i][1],2)+" MeV",X,Y+R0+14,th); } });
      }
      /* the Gamow peak */
      var c2=fit($('[data-c="gamow"]')), q=c2.g, W=c2.w, Hh=c2.h, kT=st.kT;
      q.clearRect(0,0,W,Hh);
      /* the two curve names share a line when they fit, and stack on a narrow screen */
      q.font="500 14px Archivo, sans-serif";
      var two=R.EG && q.measureText("how many have this energy").width+q.measureText("chance to tunnel").width+40>W-24;
      var pl=12, pr=12, pt=two?40:22, pb=26, Wp=W-pl-pr, Hp=Hh-pt-pb, Emax=Math.max(R.E0*3,kT*8, 5);
      function curve(f,col,fill){ var ys=[], mx=0, i; for(i=0;i<=160;i++){ var E=Emax*i/160+1e-6, v=f(E); ys.push(v); if(v>mx) mx=v; }
        q.beginPath(); for(i=0;i<=160;i++){ var X=pl+Wp*i/160, Y=pt+Hp*(1-ys[i]/(mx||1)); if(i===0) q.moveTo(X,Y); else q.lineTo(X,Y); }
        if(fill){ q.lineTo(pl+Wp,pt+Hp); q.lineTo(pl,pt+Hp); q.closePath(); q.globalAlpha=0.28; q.fillStyle=col; q.fill(); q.globalAlpha=1; }
        else { q.strokeStyle=col; q.lineWidth=2; q.stroke(); } }
      q.fillStyle=th.ink3; q.fillRect(pl,pt+Hp,Wp,1.5);
      curve(function(E){ return Math.sqrt(E)*Math.exp(-E/kT); }, th.sub[0], false);
      if(R.EG){ curve(function(E){ return Math.exp(-Math.sqrt(R.EG/E)); }, th.sub[2], false);
        curve(function(E){ return Math.exp(-E/kT-Math.sqrt(R.EG/E)); }, th.acc, true); }
      q.fillStyle=th.ink2; q.font="500 14px Archivo, sans-serif"; q.textAlign="left";
      halo(q,"how many have this energy",pl,14,th);
      q.fillStyle=th.sub[2]; q.textAlign="right"; if(R.EG) halo(q,"chance to tunnel",pl+Wp,two?32:14,th); q.textAlign="left";
      q.fillStyle=th.ink2; q.textAlign="right"; halo(q,fmt(Emax,0)+" keV",pl+Wp,Hh-6,th); q.textAlign="left"; halo(q,"0",pl,Hh-6,th);
      if(R.EG){ var xe=pl+Wp*R.E0/Emax; q.strokeStyle=th.acc; q.setLineDash([3,4]); q.beginPath(); q.moveTo(xe,pt); q.lineTo(xe,pt+Hp); q.stroke(); q.setLineDash([]);
        q.fillStyle=th.ink; q.textAlign="center"; halo(q,"Gamow peak",xe,pt+Hp-6,th); }
      return (t>-0.1&&t<6.5);
    }};
  }

  /* ------------------------------------------------------------ the bond bench: H2+ in the LCAO model */
  function Bond(root, ctx){
    var st={R:2.5, anti:false, drag:false};
    function S(R){ return Math.exp(-R)*(1+R+R*R/3); }
    function J(R){ return (1-(1+R)*Math.exp(-2*R))/R; }
    function K(R){ return (1+R)*Math.exp(-R); }
    function E(R,anti){ return 27.2114*(1/R-(anti?(J(R)-K(R))/(1-S(R)):(J(R)+K(R))/(1+S(R)))); }   /* eV, relative to H + p */
    var Rmin=2.5, Emin=0; (function(){ for(var R=1;R<5;R+=0.001){ var e=E(R,false); if(e<Emin){ Emin=e; Rmin=R; } } })();
    root.innerHTML='<div class="sb-controls"><div class="sb-pick" role="radiogroup" aria-label="How the two waves combine">'+
      '<button type="button" role="radio" aria-checked="true" data-b="0">In step: bonding</button><button type="button" role="radio" aria-checked="false" data-b="1">Out of step: antibonding</button></div>'+
      '<label class="sb-slider"><span>Distance between the protons <b data-o="R"></b></span><input type="range" min="50" max="800" value="250" data-i="R" aria-label="Distance between the protons"></label></div>'+
      '<div class="sb-stage"><canvas class="sb-cv" data-c="map" aria-hidden="true"></canvas><canvas class="sb-cv" data-c="curve" aria-hidden="true"></canvas></div>'+
      '<dl class="sb-read"><div><dt>Energy of the bond</dt><dd data-o="E"></dd></div><div><dt>Overlap of the two waves</dt><dd data-o="S"></dd></div>'+
      '<div><dt>Best distance, this model</dt><dd>'+fmt(Rmin*52.918,0)+' pm, '+fmt(-Emin,2)+' eV</dd></div><div><dt>Best distance, exact</dt><dd>106 pm, 2.79 eV</dd></div></dl>'+
      '<p class="sb-note">One electron, two protons. Add the two 1s waves in step (the same color) and they pile up between the protons, which pulls both protons in: a bond. Add them out of step and a node cuts the middle: the protons push apart. This simple model gets the bond about 25% too long and too weak; the exact solution is in the last box.</p>'+
      '<p class="sb-out" data-o="out" aria-live="polite"></p>';
    var $=function(s){ return root.querySelector(s); };
    function readout(){
      var e=E(st.R,st.anti);
      ctx.set($('[data-o="R"]'), fmt(st.R*52.918,0)+" pm");
      ctx.set($('[data-o="E"]'), (e<0?"bound by ":"pushed apart by ")+fmt(Math.abs(e),2)+" eV");
      ctx.set($('[data-o="S"]'), fmt(S(st.R)*100,0)+"%");
      if(!st.anti && Math.abs(st.R-Rmin)<0.12){ ctx.set($('[data-o="out"]'),"That's the bottom of the well: the distance this model likes best."); ctx.emit("bond:min"); }
      else ctx.set($('[data-o="out"]'),"");
    }
    root.addEventListener("click",function(e){ var b=e.target.closest("[data-b]"); if(!b) return;
      st.anti=b.getAttribute("data-b")==="1"; [].forEach.call(root.querySelectorAll("[data-b]"),function(x){ x.setAttribute("aria-checked",x===b?"true":"false"); });
      if(st.anti) ctx.emit("bond:anti"); readout(); ctx.dirty(); });
    $('[data-i="R"]').addEventListener("input",function(){ st.R=+this.value/100; readout(); ctx.dirty(); });
    readout();
    var img=null, imgKey="";
    return { frame:function(now, th){
      var c1=fit($('[data-c="map"]')), g=c1.g, w=c1.w, h=c1.h, R=st.R, key=R.toFixed(3)+st.anti+th.light+w;
      if(key!==imgKey){
        imgKey=key; var GW=Math.max(60,Math.round(w/3)), GH=Math.max(30,Math.round(h/3)), off=document.createElement("canvas"); off.width=GW; off.height=GH;
        var o=off.getContext("2d"), id=o.createImageData(GW,GH), dd=id.data, span=Math.max(10,R+7), sy=span*GH/GW, mx=0, vals=new Float32Array(GW*GH), i, j;
        var norm=1/Math.sqrt(2*(st.anti?1-S(R):1+S(R)));
        for(j=0;j<GH;j++) for(i=0;i<GW;i++){ var x=(i/GW-0.5)*span, y=(j/GH-0.5)*sy, ra=Math.hypot(x+R/2,y), rb=Math.hypot(x-R/2,y);
          var v=norm*(Math.exp(-ra)+(st.anti?-1:1)*Math.exp(-rb))/Math.sqrt(Math.PI); vals[j*GW+i]=v; if(v*v>mx) mx=v*v; }
        var P=th.light?th.posInk:th.pos, N=th.light?th.negInk:th.neg;
        for(i=0;i<GW*GH;i++){ var v2=vals[i], a=Math.pow(v2*v2/mx,0.45), col=v2>=0?P:N;
          if(th.light){ dd[i*4]=255*(1-a*(1-col[0])); dd[i*4+1]=255*(1-a*(1-col[1])); dd[i*4+2]=255*(1-a*(1-col[2])); dd[i*4+3]=255; }
          else { dd[i*4]=255*col[0]*a; dd[i*4+1]=255*col[1]*a; dd[i*4+2]=255*col[2]*a; dd[i*4+3]=255; } }
        o.putImageData(id,0,0); img={c:off,span:span};
      }
      g.imageSmoothingEnabled=true; g.drawImage(img.c,0,0,w,h);
      var k=w/img.span; [-R/2,R/2].forEach(function(px){ var X=w/2+px*k; g.fillStyle=th.light?"#101312":"#ffffff"; g.beginPath(); g.arc(X,h/2,5,0,6.2832); g.fill();
        g.fillStyle=th.ink; g.font="600 14px Archivo, sans-serif"; g.textAlign="center"; halo(g,"proton",X,h/2+22,th); });
      var c2=fit($('[data-c="curve"]')), q=c2.g, W=c2.w, H=c2.h, pl=34, pr=10, pt=14, pb=24, Wp=W-pl-pr, Hp=H-pt-pb;
      var X=function(r){ return pl+Wp*(r-0.5)/7.5; }, Y=function(e){ return pt+Hp*(1-(e+3)/9); };
      q.clearRect(0,0,W,H); q.fillStyle=th.ink3; q.fillRect(pl,Y(0),Wp,1);
      [[false,th.sub[0]],[true,th.sub[2]]].forEach(function(cv){ q.strokeStyle=cv[1]; q.lineWidth=cv[0]===st.anti?3:1.5; q.beginPath();
        for(var r=0.6;r<=8;r+=0.02){ var e=Math.min(6,E(r,cv[0])); if(r<0.61) q.moveTo(X(r),Y(e)); else q.lineTo(X(r),Y(e)); } q.stroke(); });
      var e=E(R,st.anti); q.fillStyle=th.acc; q.beginPath(); q.arc(X(R),Y(Math.min(6,e)),6,0,6.2832); q.fill();
      q.fillStyle=th.ink2; q.font="500 14px Archivo, sans-serif"; q.textAlign="right";
      halo(q,"0 eV",pl-4,Y(0)+4,th); q.textAlign="left"; halo(q,"energy as the protons part",pl+Wp*0.35,12,th);
      q.textAlign="right"; halo(q,"8 a₀",pl+Wp,H-6,th);
      return false;
    }};
  }

  /* ------------------------------------------------------------ the battery bench */
  var CELLS={
    li:{name:"Lithium-ion", ion:"Li⁺", el:3,
      anode:[{id:"graphite",name:"Graphite",f:"LiC₆",V:0.10,C:372,el:[6]},{id:"si",name:"Silicon",f:"Li₁₅Si₄",V:0.40,C:3579,el:[14]},
             {id:"limetal",name:"Lithium metal",f:"Li",V:0.0,C:3860,el:[3]},{id:"lto",name:"Lithium titanate",f:"Li₄Ti₅O₁₂",V:1.55,C:175,el:[22]}],
      cathode:[{id:"lco",name:"Lithium cobalt oxide",f:"LiCoO₂",V:3.9,C:140,el:[27]},{id:"nmc",name:"NMC 811",f:"LiNi₀.₈Mn₀.₁Co₀.₁O₂",V:3.8,C:200,el:[28,25,27]},
               {id:"lfp",name:"Lithium iron phosphate",f:"LiFePO₄",V:3.4,C:170,el:[26,15]},{id:"lmo",name:"Lithium manganese oxide",f:"LiMn₂O₄",V:4.0,C:120,el:[25]},
               {id:"s",name:"Sulfur",f:"Li₂S",V:2.15,C:1675,el:[16]}]},
    na:{name:"Sodium-ion", ion:"Na⁺", el:11,
      anode:[{id:"hc",name:"Hard carbon",f:"C",V:0.10,C:300,el:[6]},{id:"nametal",name:"Sodium metal",f:"Na",V:0.0,C:1166,el:[11]}],
      cathode:[{id:"pw",name:"Prussian white",f:"Na₂Fe[Fe(CN)₆]",V:3.2,C:150,el:[26,6,7]},{id:"nvp",name:"Sodium vanadium phosphate",f:"Na₃V₂(PO₄)₃",V:3.4,C:117,el:[23,15]},
               {id:"nfm",name:"Layered oxide",f:"NaNi⅓Fe⅓Mn⅓O₂",V:3.0,C:130,el:[28,26,25]}]}
  };
  function Charge(root, ctx){
    var st={fam:"li", a:"graphite", c:"lco"};
    function opts(list,sel){ return list.map(function(x){ return '<option value="'+x.id+'"'+(x.id===sel?' selected':'')+'>'+x.name+' ('+x.f+')</option>'; }).join(''); }
    function build(){
      var F=CELLS[st.fam];
      root.innerHTML='<div class="sb-controls"><div class="sb-pick" role="radiogroup" aria-label="Which ion carries the charge">'+
        '<button type="button" role="radio" aria-checked="'+(st.fam==="li")+'" data-f="li">Lithium-ion</button><button type="button" role="radio" aria-checked="'+(st.fam==="na")+'" data-f="na">Sodium-ion</button></div>'+
        '<label class="sb-sel"><span>Negative electrode</span><select data-i="a">'+opts(F.anode,st.a)+'</select></label>'+
        '<label class="sb-sel"><span>Positive electrode</span><select data-i="c">'+opts(F.cathode,st.c)+'</select></label></div>'+
        '<div class="sb-stage one"><canvas class="sb-cv" data-c="cell" aria-hidden="true"></canvas></div>'+
        '<dl class="sb-read"><div><dt>Cell voltage</dt><dd data-o="V"></dd></div><div><dt>Energy, electrode materials only</dt><dd data-o="Wh"></dd></div>'+
        '<div><dt>Elements inside</dt><dd data-o="els"></dd></div></dl>'+
        '<p class="sb-note">Voltage is how far '+(st.fam==="li"?"lithium":"sodium")+' falls in energy when it moves from the negative electrode into the positive one: the bigger the drop, the higher the voltage. Capacity is how many ions each gram can hold. These are rough textbook figures for the electrode materials alone; a finished cell, with its electrolyte, separator, foils, and case, holds about half to two thirds as much.</p>'+
        '<p class="sb-out" data-o="out" aria-live="polite"></p>';
      readout(false);
    }
    function cur(){ var F=CELLS[st.fam]; return {F:F,a:F.anode.filter(function(x){ return x.id===st.a; })[0]||F.anode[0], c:F.cathode.filter(function(x){ return x.id===st.c; })[0]||F.cathode[0]}; }
    function readout(user){
      var k=cur(), V=k.c.V-k.a.V, Wh=V*k.a.C*k.c.C/(k.a.C+k.c.C), $=function(s){ return root.querySelector(s); };
      ctx.set($('[data-o="V"]'), fmt(V,2)+" V");
      ctx.set($('[data-o="Wh"]'), fmt(Wh,0)+" Wh/kg");
      var els=[k.F.el].concat(k.a.el,k.c.el).filter(function(z,i,arr){ return arr.indexOf(z)===i; });
      $('[data-o="els"]').innerHTML=els.map(function(z){ return '<button type="button" class="sb-el" data-z="'+z+'">'+ELEMENTS[z-1][1]+'</button>'; }).join(' ');
      ctx.set($('[data-o="out"]'), k.a.id==="limetal"||k.a.id==="nametal"?"Metal anodes hold the most, but the metal can grow needles (dendrites) that short the cell: the problem solid electrolytes are trying to solve.":
        (k.c.id==="s"?"Sulfur stores a lot, but its intermediate compounds dissolve and shuttle between the electrodes, fading the cell.":(k.a.id==="si"?"Silicon holds ten times more than graphite but swells by about three times as it fills, so it cracks.":"")));
      if(user!==false){ ctx.emit("battery:"+k.a.id+"-"+k.c.id); if(st.fam==="na") ctx.emit("battery:na"); }
      ctx.dirty();
    }
    root.addEventListener("click",function(e){
      var f=e.target.closest("[data-f]"); if(f){ st.fam=f.getAttribute("data-f"); var F=CELLS[st.fam]; st.a=F.anode[0].id; st.c=F.cathode[0].id; build(); if(st.fam==="na") ctx.emit("battery:na"); return; }
      var z=e.target.closest("[data-z]"); if(z&&ctx.pick) ctx.pick(+z.getAttribute("data-z"));
    });
    root.addEventListener("change",function(e){ var s=e.target.closest("select"); if(!s) return; st[s.getAttribute("data-i")]=s.value; readout(true); });
    build();
    return { frame:function(now, th){
      var c=fit(root.querySelector('[data-c="cell"]')), g=c.g, w=c.w, h=c.h, k=cur(), V=k.c.V-k.a.V, t=ctx.calm()?2:now/1000;
      g.clearRect(0,0,w,h);
      /* the energy ladder: the ion falls from the negative electrode's level to the positive one's */
      var lx=w*0.62, top=34, bot=h-30, Y=function(v){ return top+(bot-top)*(v/4.6); };
      g.fillStyle=th.ink3; g.fillRect(lx,top,1.5,bot-top);
      g.fillStyle=th.ink2; g.font="500 14px Archivo, sans-serif"; g.textAlign="left";
      halo(g,"energy of the ion: higher is less stable",lx-4,14,th);
      var ya=Y(k.a.V), yc=Y(k.c.V);
      g.fillStyle=th.sub[0]; g.fillRect(lx+10,ya-2,w-lx-22,4); g.fillStyle=th.acc; g.fillRect(lx+10,yc-2,w-lx-22,4);
      g.fillStyle=th.ink; halo(g,k.a.name+", "+fmt(k.a.V,2)+" V vs "+(st.fam==="li"?"Li":"Na"),lx+12,ya-8,th); halo(g,k.c.name+", "+fmt(k.c.V,2)+" V",lx+12,yc+18,th);
      var fallX=lx+(w-lx)*0.5; g.strokeStyle=th.ink2; g.setLineDash([3,4]); g.beginPath(); g.moveTo(fallX,ya); g.lineTo(fallX,yc); g.stroke(); g.setLineDash([]);
      var fy=ya+((t*0.6)%1)*(yc-ya); g.fillStyle=th.acc; g.beginPath(); g.arc(fallX,fy,6,0,6.2832); g.fill();
      g.fillStyle=th.ink; g.font="700 15px Archivo, sans-serif"; halo(g,fmt(V,2)+" V drop",fallX+12,(ya+yc)/2,th);
      /* the cell: two electrodes, ions crossing the electrolyte, electrons round the circuit to a lamp */
      var cx0=18, cx1=lx-28, ex=(cx1-cx0), ey0=h*0.34, ey1=h-24, aw=ex*0.24;
      g.fillStyle=th.light?"#d8dcd8":"#1d2125"; g.fillRect(cx0,ey0,ex,ey1-ey0);
      g.fillStyle=th.sub[0]; g.globalAlpha=0.55; g.fillRect(cx0,ey0,aw,ey1-ey0); g.fillStyle=th.acc; g.fillRect(cx1-aw,ey0,aw,ey1-ey0); g.globalAlpha=1;
      g.fillStyle=th.ink; g.font="600 14px Archivo, sans-serif"; g.textAlign="center";
      halo(g,k.a.f,cx0+aw/2,ey1+16,th); halo(g,k.c.f,cx1-aw/2,ey1+16,th);
      for(var i=0;i<14;i++){ var u=((t*0.35+i/14)%1), x=cx0+aw+u*(ex-2*aw), y=ey0+12+((i*37)%100)/100*(ey1-ey0-24);
        g.fillStyle=th.light?"#09467a":"#e2f7ff"; g.beginPath(); g.arc(x,y,3.2,0,6.2832); g.fill(); }
      g.fillStyle=th.ink2; g.font="500 14px Archivo, sans-serif"; halo(g,k.F.ion+" through the electrolyte",(cx0+cx1)/2,ey0-8,th);
      var wy=ey0-34; g.strokeStyle=th.ink3; g.lineWidth=2; g.beginPath(); g.moveTo(cx0+aw/2,ey0); g.lineTo(cx0+aw/2,wy); g.lineTo(cx1-aw/2,wy); g.lineTo(cx1-aw/2,ey0); g.stroke();
      for(i=0;i<8;i++){ var u2=((t*0.5+i/8)%1), L=(wy<ey0)?(ey0-wy)*2+(cx1-cx0-aw):1, sPos=u2*L, px, py, seg1=ey0-wy, seg2=cx1-cx0-aw;
        if(sPos<seg1){ px=cx0+aw/2; py=ey0-sPos; } else if(sPos<seg1+seg2){ px=cx0+aw/2+(sPos-seg1); py=wy; } else { px=cx1-aw/2; py=wy+(sPos-seg1-seg2); }
        g.fillStyle=th.acc; g.beginPath(); g.arc(px,py,2.6,0,6.2832); g.fill(); }
      var lamp=Math.min(1,V/4), lxm=(cx0+cx1)/2;
      g.fillStyle=th.light?"rgba(100,60,0,"+(0.25+0.6*lamp)+")":"rgba(255,210,110,"+(0.2+0.8*lamp)+")"; g.beginPath(); g.arc(lxm,wy,9+6*lamp,0,6.2832); g.fill();
      return true;
    }};
  }

  /* every label sits on a small plate of the ground color, as the table's
     labels do, so it reads against whatever curve or fill is under it */
  function halo(g, t, x, y, th){
    var m=g.measureText(t), a=m.actualBoundingBoxAscent||10, d=m.actualBoundingBoxDescent||3, w=m.width,
        x0=g.textAlign==="center"?x-w/2:(g.textAlign==="right"||g.textAlign==="end"?x-w:x);
    g.save(); g.globalAlpha=0.88; g.fillStyle=th.plate||"#000"; g.fillRect(x0-3,y-a-3,w+6,a+d+6); g.restore();
    g.fillText(t,x,y);
  }
  /* ------------------------------------------------------------ mounting */
  function mount(host, opt){
    var D=host.ownerDocument||document;
    host.classList.add("sb");
    host.innerHTML='<div class="sb-tabs" role="tablist" aria-label="Workbench">'+
      '<button type="button" role="tab" aria-selected="true" data-t="fuse" id="sbTabFuse" aria-controls="sbFuse">Fuse nuclei</button>'+
      '<button type="button" role="tab" aria-selected="false" data-t="bond" id="sbTabBond" aria-controls="sbBond">Make a bond</button>'+
      '<button type="button" role="tab" aria-selected="false" data-t="charge" id="sbTabCharge" aria-controls="sbCharge">Build a battery</button></div>'+
      '<div class="sb-pane" role="tabpanel" id="sbFuse" aria-labelledby="sbTabFuse"></div>'+
      '<div class="sb-pane" role="tabpanel" id="sbBond" aria-labelledby="sbTabBond" hidden></div>'+
      '<div class="sb-pane" role="tabpanel" id="sbCharge" aria-labelledby="sbTabCharge" hidden></div>';
    var dirty=true, cache=new WeakMap();
    var ctx={ set:function(el,v){ if(el && cache.get(el)!==v){ cache.set(el,v); el.textContent=v; } },
      emit:function(e){ if(opt.onEvent) opt.onEvent(e); }, dirty:function(){ dirty=true; },
      calm:function(){ return !!opt.calm; }, pick:opt.pick };
    var benches={ fuse:Fuse(host.querySelector("#sbFuse"),ctx), bond:Bond(host.querySelector("#sbBond"),ctx), charge:Charge(host.querySelector("#sbCharge"),ctx) };
    var cur="fuse";
    function show(name){ cur=name;
      [].forEach.call(host.querySelectorAll('[role="tab"]'),function(b){ var on=b.getAttribute("data-t")===name; b.setAttribute("aria-selected",on?"true":"false"); b.tabIndex=on?0:-1; });
      host.querySelector("#sbFuse").hidden=name!=="fuse"; host.querySelector("#sbBond").hidden=name!=="bond"; host.querySelector("#sbCharge").hidden=name!=="charge";
      dirty=true; ctx.emit("open:"+name); }
    host.querySelector(".sb-tabs").addEventListener("click",function(e){ var b=e.target.closest("[data-t]"); if(b) show(b.getAttribute("data-t")); });
    host.querySelector(".sb-tabs").addEventListener("keydown",function(e){ var order=["fuse","bond","charge"], i=order.indexOf(cur);
      if(e.key==="ArrowRight"||e.key==="ArrowLeft"){ e.preventDefault(); var n=order[(i+(e.key==="ArrowRight"?1:2))%3]; show(n); host.querySelector('[data-t="'+n+'"]').focus(); } });
    return { show:show, current:function(){ return cur; },
      frame:function(now){ var th=opt.theme(); var anim=benches[cur].frame(now, th); if(!anim) dirty=false; },
      redraw:function(){ dirty=true; } };
  }
  return {mount:mount, REACT:REACT, CELLS:CELLS};
})();

/* ----------------------------------------------------------------------------
   Missions: short journeys through the table, the depths, and the workbench.
   Each step names something to do; doing it (or pressing "Show me") moves you
   on. The host app reports what happens with signal("pick:26"),
   signal("depth:nucleus"), signal("fusion:dt") and so on, and performs the
   "Show me" actions it is handed. Progress is kept on this device only.

   The twelve are laid out as one route, from the first stars to the clinic,
   and the map draws that route: a mission done is a lit stop, a mission under
   way is a stop with its share of steps drawn around it.
   ---------------------------------------------------------------------------- */
var Missions=(function(){
  var LIST=[
    {id:"star", short:"Star", title:"Light a star", blurb:"The reaction that powers the Sun, and why it is so slow.", steps:[
      {say:"Pick hydrogen. The Sun is about three-quarters hydrogen.", show:{pick:1}, when:"pick:1"},
      {say:"In the workbench, fuse two protons. This is the first step of the chain that powers the Sun.", show:{sim:"fuse", react:"pp"}, when:"fusion:pp"},
      {say:"Read the chance to tunnel. On top of that, a proton must turn into a neutron by the weak force as they touch, so an average proton in the Sun's core waits billions of years. Fire once more.", show:{sim:"fuse", react:"pp"}, when:"fusion:pp*"},
      {say:"Pick helium, the ash the Sun leaves behind.", show:{pick:2}, when:"pick:2"},
      {say:"Most helium is older than any star. Switch to Origins and pick the Big Bang.", show:{lens:"origin", filter:"b"}, when:"lens:origin:b"}],
     done:"The Sun turns about 600 million tonnes of hydrogen into helium every second, and about 4 million tonnes of that leaves as sunlight: E = mc²."},
    {id:"gold", short:"Gold", title:"Forge gold", blurb:"From the Big Bang to the ring on your finger.", steps:[
      {say:"Every story starts with hydrogen, made in the first few minutes after the Big Bang. Pick hydrogen.", show:{pick:1}, when:"pick:1"},
      {say:"Switch the table to Origins to see where everything else was made.", show:{lens:"origin"}, when:"lens:origin*"},
      {say:"Stars fuse light nuclei into heavier ones, all the way up to iron, among the most tightly bound nuclei of all. Pick iron.", show:{pick:26}, when:"pick:26"},
      {say:"Fall into iron's nucleus and find it near the top of the binding-energy curve.", show:{depth:"nucleus"}, when:"depth:nucleus"},
      {say:"Past iron, fusion stops paying. Gold needs a flood of neutrons, such as when two neutron stars collide. Pick gold and watch its birth.", show:{pick:79}, when:"pick:79"},
      {say:"Open gold's card. Relativity, acting on its fast inner electrons, is part of why it is yellow.", show:{card:79}, when:"card:79"}],
     done:"Most of the gold you have ever touched was likely made when two dead stars collided, long before the Sun existed."},
    {id:"element", short:"New element", title:"Make a new element", blurb:"The heaviest atoms ever made, a few at a time.", steps:[
      {say:"Switch to Origins and pick the elements made by people.", show:{lens:"origin", filter:"h"}, when:"lens:origin:h"},
      {say:"Pick oganesson, element 118. Only a handful of its atoms have ever been detected, and each lasted only about a thousandth of a second.", show:{pick:118}, when:"pick:118"},
      {say:"Fall into its nucleus: 118 protons pushing each other apart, held together by the strong force for barely a moment.", show:{depth:"nucleus"}, when:"depth:nucleus"},
      {say:"Pick livermorium. In 2024 Berkeley Lab made two of its atoms with a titanium-50 beam, a rehearsal for making element 120.", show:{pick:116}, when:"pick:116"},
      {say:"Open oganesson's card and read its open problem.", show:{card:118}, when:"card:118"}],
     done:"Elements 119 and 120 would begin a new row of the table. Nobody has made either yet, and whether the heaviest nuclei have an island of stability is still an open question."},
    {id:"bond", short:"Molecule", title:"Make a molecule", blurb:"One electron, two protons, the simplest chemical bond.", steps:[
      {say:"Open the workbench's bond bench.", show:{sim:"bond"}, when:"open:bond"},
      {say:"Slide the protons until the energy is lowest. That distance is the bond.", show:{sim:"bond"}, when:"bond:min"},
      {say:"Now put the two waves out of step and watch the bond disappear.", show:{sim:"bond"}, when:"bond:anti"},
      {say:"Pick hydrogen. H₂, two of these bonded, is the most common molecule in the universe.", show:{pick:1}, when:"pick:1"}],
     done:"Every covalent bond, from water to DNA, is electron waves adding in step between nuclei."},
    {id:"quark", short:"Quark", title:"Pull a quark out", blurb:"Try to break the strongest force there is.", steps:[
      {say:"Pick hydrogen: its nucleus is a single proton.", show:{pick:1}, when:"pick:1"},
      {say:"Fall into the proton.", show:{depth:"proton"}, when:"depth:proton"},
      {say:"Keep going, down to the quarks.", show:{depth:"pull"}, when:"depth:pull"},
      {say:"Grab a quark and pull until the string snaps.", show:{depth:"pull"}, when:"snap"}],
     done:"No quark ever comes out alone: the energy you put in turns into new matter instead. That is confinement, and proving the theory behind it has a mass gap is a million-dollar problem."},
    {id:"fission", short:"Fission", title:"Split the atom", blurb:"Why the heaviest nuclei give up energy when they break.", steps:[
      {say:"Pick uranium.", show:{pick:92}, when:"pick:92"},
      {say:"Fall into uranium's nucleus: 92 protons and about 146 neutrons, packed at the same density as nearly every other nucleus.", show:{depth:"nucleus"}, when:"depth:nucleus"},
      {say:"Open uranium's card and find it on the binding-energy curve. Past iron, each nucleon is held a little less tightly, so breaking a heavy nucleus in two releases energy.", show:{card:92}, when:"card:92"},
      {say:"Pick iron, near the top of the curve, where almost nothing is left to gain either way.", show:{pick:26}, when:"pick:26"},
      {say:"Prove it in the workbench: fuse iron with iron and watch the reaction swallow energy instead of releasing it.", show:{sim:"fuse", react:"fefe"}, when:"fusion:fefe*"}],
     done:"Splitting one uranium-235 nucleus releases about 200 million electronvolts, millions of times more than burning one molecule of fuel. Reactors make nearly a tenth of the world's electricity this way."},
    {id:"fusion", short:"Fusion", title:"Fuel a fusion reactor", blurb:"Deuterium, tritium, lithium, and a wall of tungsten.", steps:[
      {say:"Fusion power runs on hydrogen's heavy forms, deuterium and tritium. Pick hydrogen.", show:{pick:1}, when:"pick:1"},
      {say:"In the workbench, fire deuterium at tritium.", show:{sim:"fuse", react:"dt"}, when:"fusion:dt"},
      {say:"Turn the temperature to at least 10 keV, about 116 million kelvin, and fire again. Watch where the Gamow peak sits: most reactions happen far below the barrier, by tunneling.", show:{sim:"fuse", react:"dt", hot:true}, when:"fusion:dt:hot"},
      {say:"Tritium barely exists in nature, so a power plant must breed its own. Fire a neutron into lithium-6.", show:{sim:"fuse", react:"nli6"}, when:"fusion:nli6"},
      {say:"The wall that faces the plasma is tungsten, which melts at 3,422 °C. Pick tungsten.", show:{pick:74}, when:"pick:74"}],
     done:"Deuterium from seawater, tritium bred from lithium, a tungsten wall, and superconducting magnets: the recipe ITER and many fusion companies are racing to make work."},
    {id:"battery", short:"Battery", title:"Build a better battery", blurb:"Voltage, capacity, and the elements in between.", steps:[
      {say:"Open the battery bench. It starts with graphite and lithium cobalt oxide, the cell in most phones.", show:{sim:"charge"}, when:"open:charge"},
      {say:"Swap the positive electrode for lithium iron phosphate: a lower voltage, but no cobalt and much safer.", show:{sim:"charge"}, when:"battery:*-lfp"},
      {say:"Try a silicon negative electrode and watch the capacity jump.", show:{sim:"charge"}, when:"battery:si-*"},
      {say:"Now switch to sodium-ion: cheaper and more abundant, a little heavier.", show:{sim:"charge"}, when:"battery:na"},
      {say:"Pick sodium on the table and read what is happening with it right now.", show:{pick:11}, when:"pick:11"}],
     done:"Every battery is a trade between how far an ion falls, how many a gram can hold, and what the materials cost the planet."},
    {id:"chip", short:"Chip", title:"Build a chip", blurb:"Sand, purified, patterned, and insulated with hafnium.", steps:[
      {say:"Switch to Frontier and pick computer chips.", show:{lens:"frontier", filter:"chips"}, when:"lens:frontier:chips"},
      {say:"Pick silicon. Chip-grade silicon is purified to better than 99.9999999 percent.", show:{pick:14}, when:"pick:14"},
      {say:"Fall into silicon's electron cloud. It has four outer electrons, so a trace of an element with three or five turns it into a conductor a voltage can switch on and off.", show:{depth:"cloud"}, when:"depth:cloud"},
      {say:"Pick hafnium. Since 2007, a film of hafnium oxide a few nanometers thick has insulated the gates of the transistors in fast chips.", show:{pick:72}, when:"pick:72"},
      {say:"Pick gallium. Gallium nitride makes blue LEDs and the small, cool-running chips in fast chargers.", show:{pick:31}, when:"pick:31"}],
     done:"A modern processor holds tens of billions of transistors, made from purified sand, a few dopant atoms, and layers of rarer metals only atoms thick."},
    {id:"qubit", short:"Qubit", title:"Build a qubit", blurb:"Three elements, three ways to hold a quantum bit.", steps:[
      {say:"Switch the table to the Frontier lens and pick out quantum computing.", show:{lens:"frontier", filter:"quantum"}, when:"lens:frontier:quantum"},
      {say:"Pick ytterbium. In 2024 Microsoft and Atom Computing entangled 24 logical qubits made of its atoms.", show:{pick:70}, when:"pick:70"},
      {say:"Fall into ytterbium's electron cloud. Atom Computing's qubit is two spin states of the nucleus inside it, held in place by laser light.", show:{depth:"cloud"}, when:"depth:cloud"},
      {say:"Superconducting qubits are tiny circuits instead, built from aluminum and tantalum. Pick tantalum.", show:{pick:73}, when:"pick:73"},
      {say:"Ion traps hold single charged atoms. Pick barium, the qubit in Quantinuum's 98-qubit Helios.", show:{pick:56}, when:"pick:56"}],
     done:"Atoms, circuits, and ions: nobody yet knows which will reach a million reliable qubits. That race is wide open."},
    {id:"time", short:"Clock", title:"Keep perfect time", blurb:"From cesium to the first nuclear clock.", steps:[
      {say:"The second is defined by cesium-133: 9,192,631,770 ticks. Pick cesium.", show:{pick:55}, when:"pick:55"},
      {say:"Optical clocks tick with light, tens of thousands of times faster. Pick strontium.", show:{pick:38}, when:"pick:38"},
      {say:"Pick lutetium. In September 2026 two lutetium-ion clocks in Singapore set the accuracy record: off by about one part in ten quintillion.", show:{pick:71}, when:"pick:71"},
      {say:"Pick thorium. Its nucleus holds the first nuclear clocks, reported in October 2026.", show:{pick:90}, when:"pick:90"},
      {say:"Fall all the way into thorium's nucleus, where that clock ticks.", show:{depth:"nucleus"}, when:"depth:nucleus"}],
     done:"Clocks this good can feel gravity change over a centimeter of height, and may catch the constants of nature drifting."},
    {id:"medicine", short:"Medicine", title:"Fight cancer with atoms", blurb:"Radioactive atoms that find a tumor, and the ones that photograph it.", steps:[
      {say:"Switch to Frontier and pick medicine.", show:{lens:"frontier", filter:"medicine"}, when:"lens:frontier:medicine"},
      {say:"Pick technetium. It has no stable form at all, yet technetium-99m is used in about four out of five nuclear medicine scans, tens of millions a year.", show:{pick:43}, when:"pick:43"},
      {say:"Pick lutetium. Lutetium-177, carried by a molecule that seeks out prostate cancer cells, became an approved drug in 2022.", show:{pick:71}, when:"pick:71"},
      {say:"Pick actinium. Actinium-225 fires alpha particles that stop within a few cell widths, and it is being tested against cancers other treatments cannot reach.", show:{pick:89}, when:"pick:89"},
      {say:"Fall into actinium's nucleus, where that alpha particle comes from.", show:{depth:"nucleus"}, when:"depth:nucleus"}],
     done:"The instability that makes radiation dangerous also makes it precise: an atom that decays inside a tumor spends its energy exactly where it is needed."}
  ];
  function match(pat, ev){
    if(Array.isArray(pat)) return pat.some(function(p){ return match(p,ev); });
    if(pat.indexOf("*")<0) return pat===ev;
    var re=new RegExp("^"+pat.replace(/[.+?^${}()|[\]\\]/g,"\\$&").replace(/\*/g,".*")+"$");
    return re.test(ev);
  }
  function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;"); }
  /* the route: four stops to a row, the middle row running back, like a
     line on a transit map */
  function mapSVG(st, hot){
    var W=388, rowH=64, top=22, n=LIST.length, per=4, rows=Math.ceil(n/per), H=top+(rows-1)*rowH+40, P=[], i;
    for(i=0;i<n;i++){ var r=Math.floor(i/per), c=i%per; if(r%2) c=per-1-c; P.push([56+c*((W-112)/(per-1)), top+r*rowH]); }
    var path='M'+P[0][0]+' '+P[0][1], lit='';
    for(i=1;i<n;i++){
      var a=P[i-1], b=P[i], seg;
      if(a[1]===b[1]) seg=' L'+b[0]+' '+b[1];
      else { var x=a[0]>W/2?W-2:2; seg=' C'+x+' '+a[1]+' '+x+' '+b[1]+' '+b[0]+' '+b[1]; }
      path+=seg;
      if(st.done[LIST[i-1].id]&&st.done[LIST[i].id]) lit+='<path class="ms-lit" d="M'+a[0]+' '+a[1]+seg+'"/>';
    }
    var h='<svg class="ms-map" viewBox="0 0 '+W+' '+H+'" aria-hidden="true"><path class="ms-line" d="'+path+'"/>'+lit;
    LIST.forEach(function(m,k){
      var p=P[k], done=!!st.done[m.id], part=Math.min(1,(st.prog[m.id]||0)/m.steps.length), cur=st.cur===m.id;
      h+='<g class="ms-stop'+(done?' d':'')+(cur?' c':'')+(m.id===hot?' hot':'')+'" data-start="'+m.id+'" transform="translate('+p[0].toFixed(1)+' '+p[1]+')">'+
        '<circle class="ms-hit" r="22"/><circle class="ms-dot" r="9"/>';
      if(!done&&part>0){ var ang=part*2*Math.PI-1e-4, x=Math.sin(ang)*13, y=-Math.cos(ang)*13;
        h+='<path class="ms-arc" d="M0 -13 A13 13 0 '+(part>0.5?1:0)+' 1 '+x.toFixed(2)+' '+y.toFixed(2)+'"/>'; }
      h+='<text class="ms-lab" y="29" text-anchor="middle">'+esc(m.short)+'</text></g>';
    });
    return h+'</svg>';
  }
  function create(opt){
    var host=opt.host, KEY="atom.missions", st={done:{}, prog:{}, cur:null, step:0, open:false, celebrate:null, min:false};
    try{ var saved=JSON.parse(localStorage.getItem(KEY)||"null"); if(saved){ st.done=saved.done||{}; st.prog=saved.prog||{}; st.cur=saved.cur||null; st.step=saved.step||0; } }catch(e){}
    if(st.cur&&!byId(st.cur)){ st.cur=null; st.step=0; }
    function save(){ try{ localStorage.setItem(KEY,JSON.stringify({done:st.done,prog:st.prog,cur:st.cur,step:st.step})); }catch(e){} }
    function byId(id){ return LIST.filter(function(m){ return m.id===id; })[0]; }
    function next(){ return LIST.filter(function(x){ return !st.done[x.id]; })[0]; }
    host.classList.add("ms");
    function render(){
      var nd=Object.keys(st.done).filter(byId).length, h='';
      if(st.min){ /* folded away: only the pill shows */ }
      else if(st.celebrate){
        var m=byId(st.celebrate), nx=next();
        h='<div class="ms-panel ms-done" role="region" aria-label="Mission complete"><h3>Mission complete: '+esc(m.title)+'</h3><p>'+esc(m.done)+'</p>'+
          mapSVG(st, m.id)+
          '<div class="ms-row">'+(nx?'<button type="button" class="ms-go" data-start="'+nx.id+'">Next: '+esc(nx.title)+'</button>':'')+
          '<button type="button" data-a="list">All missions</button><button type="button" data-a="close">Close</button></div></div>';
      } else if(st.cur){
        var M=byId(st.cur), S=M.steps[st.step];
        h='<div class="ms-panel" role="region" aria-label="Mission: '+esc(M.title)+'"><div class="ms-top"><h3>'+esc(M.title)+'</h3><span>Step '+(st.step+1)+' of '+M.steps.length+'</span></div>'+
          '<div class="ms-bar" aria-hidden="true">'+M.steps.map(function(x,i){ return '<i class="'+(i<st.step?"d":(i===st.step?"c":""))+'"></i>'; }).join('')+'</div>'+
          '<p class="ms-say" aria-live="polite">'+esc(S.say)+'</p><div class="ms-row">'+(S.show?'<button type="button" class="ms-go" data-a="show">Show me</button>':'')+
          '<button type="button" data-a="list">All missions</button><button type="button" data-a="quit">Leave mission</button></div></div>';
      } else if(st.open){
        var nx2=next();
        h='<div class="ms-panel ms-list" role="region" aria-label="Missions"><div class="ms-top"><h3>Missions</h3><span>'+nd+' of '+LIST.length+' done</span></div>'+
          mapSVG(st, nx2&&nx2.id)+'<ul>'+
          LIST.map(function(m){ var p=st.prog[m.id]||0;
            return '<li><button type="button" data-start="'+m.id+'"><b>'+esc(m.title)+'</b><span>'+esc(m.blurb)+'</span>'+
              (st.done[m.id]?'<i>Done</i>':(p?'<i>'+p+' of '+m.steps.length+' steps</i>':''))+'</button></li>'; }).join('')+
          '</ul><div class="ms-row"><button type="button" data-a="close">Close</button></div></div>';
      }
      h+='<button type="button" class="ms-pill" data-a="toggle" aria-expanded="'+((st.open||st.cur||st.celebrate)&&!st.min?"true":"false")+'">'+(st.cur&&st.min?'Mission: '+esc(byId(st.cur).title)+' <span>'+(st.step+1)+'/'+byId(st.cur).steps.length+'</span>':'Missions <span>'+nd+' of '+LIST.length+(opt.short?'':' done')+'</span>')+'</button>';
      host.innerHTML=h;
      if(opt.onChange) opt.onChange(st);
    }
    function start(id){ st.cur=id; st.step=0; st.celebrate=null; st.open=false; st.min=false; save(); render(); if(opt.onStart) opt.onStart(id); }
    host.addEventListener("click",function(e){
      var b=e.target.closest("button,[data-start]"); if(!b||!host.contains(b)) return;
      var s=b.getAttribute("data-start"), a=b.getAttribute("data-a");
      if(s){ start(s); return; }
      if(a==="toggle"){ if(st.cur){ st.min=!st.min; } else if(st.celebrate){ st.celebrate=null; } else st.open=!st.open; render(); return; }
      if(a==="list"){ st.open=true; st.cur=null; st.celebrate=null; save(); render(); return; }
      if(a==="close"){ st.open=false; st.celebrate=null; render(); return; }
      if(a==="quit"){ st.cur=null; st.step=0; save(); render(); return; }
      if(a==="show"){ var S=byId(st.cur).steps[st.step]; if(S.show&&opt.go) opt.go(S.show); }
    });
    var api={
      signal:function(ev){
        if(!st.cur) return;
        var M=byId(st.cur), S=M.steps[st.step]; if(!S||!match(S.when,ev)) return;
        st.step++; st.prog[M.id]=Math.max(st.prog[M.id]||0, st.step);
        if(st.step>=M.steps.length){ st.done[M.id]=true; st.celebrate=M.id; st.cur=null; st.step=0; st.min=false; }
        save(); render();
      },
      start:start,
      list:LIST
    };
    render();
    return api;
  }
  return {create:create, LIST:LIST};
})();

/* ATOM-PTABLE END */
