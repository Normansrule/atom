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
        /* "yours": what this reader has explored (1), built (2), and mastered (3), kept on the device by the labs */
        var lv=(typeof AtomLabs!=="undefined")?AtomLabs.progress.level(z):0;
        if(lens==="yours") w=[0.12,0.5,0.8,1][lv];
        if(lens==="yours") tiles[z].setAttribute("data-lv",lv); else tiles[z].removeAttribute("data-lv");
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
   Missions: short journeys through the labs, the table, and the depths.
   Each step names something to do; doing it (or pressing "Show me") moves you
   on. The host app reports what happens with signal("pick:26"),
   signal("depth:nucleus"), signal("fusion:dt") and so on, and performs the
   "Show me" actions it is handed. Progress is kept on this device only.

   The sixteen are laid out as one route, from your first atom through the
   first stars to the clinic,
   and the map draws that route: a mission done is a lit stop, a mission under
   way is a stop with its share of steps drawn around it.
   ---------------------------------------------------------------------------- */
var Missions=(function(){
  var LIST=[
    {id:"atom", short:"Atom", title:"Build an atom", blurb:"Protons, neutrons, and electrons, put together by hand.", steps:[
      {say:"Open the labs and build carbon: six protons, six neutrons, and six electrons.", show:{lab:"build", z:6}, when:"build:6:12:0"},
      {say:"Add two neutrons to make carbon-14. Cosmic rays make it in the air, and its steady decay is the clock that dates wood and bone.", show:{lab:"build", z:6, a:14}, when:"build:6:14:*"},
      {say:"Now make an ion. Build fluorine and give it one extra electron: a fluoride ion, the kind toothpaste delivers.", show:{lab:"build", z:9, a:19, e:10}, when:"build:9:*:-1"},
      {say:"Find the edge of the nuclear map. Build oxygen and keep adding neutrons until the last one won't stay.", show:{lab:"build", z:8, a:25}, when:"goal:drip"}],
     done:"Everything you have ever touched is some count of these three particles. Protons decide the element, neutrons decide whether it lasts, and electrons decide how it bonds."},
    {id:"light", short:"Light", title:"Read the light", blurb:"Why every element glows in its own colors.", steps:[
      {say:"In the labs, open Calculate and find hydrogen's red line: an electron falling from level 3 to level 2.", show:{lab:"calc", calc:"light", line:"3,2"}, when:"calc:line:1:3-2"},
      {say:"Now let the electron fall all the way to level 1. That light is ultraviolet, beyond what your eye can see.", show:{lab:"calc", calc:"light", line:"2,1"}, when:"calc:line:1:*-1"},
      {say:"Open Hear and play neon's light. Each line in its spectrum becomes a tone.", show:{lab:"hear", z:10, play:true}, when:"hear:10"},
      {say:"Play hydrogen's light and compare. No two elements share the same set of lines, which is how astronomers tell what a star is made of.", show:{lab:"hear", z:1, play:true}, when:"hear:1"}],
     done:"Helium was found this way. In 1868 its yellow line turned up in sunlight, 27 years before anyone found the element on Earth."},
    {id:"mole", short:"Mole", title:"Weigh a molecule", blurb:"From the mass of one atom to grams on a scale.", steps:[
      {say:"In the labs, open Calculate, then Molar mass, and type water: H2O.", show:{lab:"calc", calc:"molar", formula:"H2O"}, when:"calc:molar:H2O"},
      {say:"Type glucose, C6H12O6, the sugar your cells burn for energy.", show:{lab:"calc", calc:"molar", formula:"C6H12O6"}, when:"calc:molar:C6H12O6"},
      {say:"Type caffeine, C8H10N4O2.", show:{lab:"calc", calc:"molar", formula:"C8H10N4O2"}, when:"calc:molar:C8H10N4O2"},
      {say:"Pick the element that carries the largest share of caffeine's mass.", show:{pick:6}, when:"pick:6"}],
     done:"A mole is 6.022 × 10²³ of anything. Molar mass turns that unimaginable count into grams you can weigh: 18 grams of water is one mole of water molecules."},
    {id:"decay", short:"Decay", title:"Date a bone", blurb:"Radioactive decay, used as a clock.", steps:[
      {say:"In the labs, open Calculate, then Radioactive decay, and choose carbon-14.", show:{lab:"calc", calc:"decay", preset:"6,14"}, when:"calc:decay:6,14"},
      {say:"Slide time forward until a quarter of the carbon-14 is left. That takes two half-lives, about 11,400 years.", show:{lab:"calc", calc:"decay", half:2}, when:"calc:decay:half:2"},
      {say:"Press Listen like a Geiger counter and hear the clicks thin out as the atoms run out.", show:{lab:"calc", calc:"decay", listen:true}, when:"calc:listen"},
      {say:"Open Predict and answer a question.", show:{lab:"predict"}, when:"quiz:*"}],
     done:"Radiocarbon dating reaches back about 50,000 years; after that too little carbon-14 is left to count. For older rocks, geologists use slower clocks, such as uranium-238, with a half-life of 4.5 billion years."},
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
    function pillHTML(nd){ return (st.cur&&st.min?'Mission: '+esc(byId(st.cur).title)+' <span>'+(st.step+1)+'/'+byId(st.cur).steps.length+'</span>':'Missions <span>'+nd+' of '+LIST.length+(opt.short?'':' done')+'</span>'); }
    /* a step that moves on inside the same mission is updated in place, so
       the words are announced and the button you pressed keeps the focus;
       anything else is drawn fresh, with the focus put back where it was */
    function render(){
      var nd=Object.keys(st.done).filter(byId).length, h='', panel=host.querySelector(".ms-panel[data-m]");
      if(st.cur&&!st.min&&!st.celebrate&&panel&&panel.getAttribute("data-m")===st.cur){
        var M0=byId(st.cur), S0=M0.steps[st.step];
        panel.querySelector(".ms-top span").textContent="Step "+(st.step+1)+" of "+M0.steps.length;
        [].forEach.call(panel.querySelectorAll(".ms-bar i"),function(i,k){ i.className=k<st.step?"d":(k===st.step?"c":""); });
        panel.querySelector(".ms-say").textContent=S0.say;
        var sh=panel.querySelector('[data-a="show"]'); if(sh) sh.hidden=!S0.show;
        var pl=host.querySelector(".ms-pill"); if(pl){ pl.innerHTML=pillHTML(nd); pl.setAttribute("aria-expanded","true"); }
        if(opt.onChange) opt.onChange(st); return;
      }
      var fa=document.activeElement, back=null;
      if(fa&&host.contains(fa)) back=fa.getAttribute("data-a")?'[data-a="'+fa.getAttribute("data-a")+'"]':(fa.getAttribute("data-start")?'button[data-start="'+fa.getAttribute("data-start")+'"]':null);
      if(st.min){ /* folded away: only the pill shows */ }
      else if(st.celebrate){
        var m=byId(st.celebrate), nx=next();
        h='<div class="ms-panel ms-done" role="region" aria-label="Mission complete"><h3 tabindex="-1">Mission complete: '+esc(m.title)+'</h3><p>'+esc(m.done)+'</p>'+
          mapSVG(st, m.id)+
          '<div class="ms-row">'+(nx?'<button type="button" class="ms-go" data-start="'+nx.id+'">Next: '+esc(nx.title)+'</button>':'')+
          '<button type="button" data-a="list">All missions</button><button type="button" data-a="close">Close</button></div></div>';
      } else if(st.cur){
        var M=byId(st.cur), S=M.steps[st.step];
        h='<div class="ms-panel" data-m="'+M.id+'" role="region" aria-label="Mission: '+esc(M.title)+'"><div class="ms-top"><h3>'+esc(M.title)+'</h3><span>Step '+(st.step+1)+' of '+M.steps.length+'</span></div>'+
          '<div class="ms-bar" aria-hidden="true">'+M.steps.map(function(x,i){ return '<i class="'+(i<st.step?"d":(i===st.step?"c":""))+'"></i>'; }).join('')+'</div>'+
          '<p class="ms-say" aria-live="polite">'+esc(S.say)+'</p><div class="ms-row"><button type="button" class="ms-go" data-a="show"'+(S.show?'':' hidden')+'>Show me</button>'+
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
      h+='<button type="button" class="ms-pill" data-a="toggle" aria-expanded="'+((st.open||st.cur||st.celebrate)&&!st.min?"true":"false")+'">'+pillHTML(nd)+'</button>';
      host.innerHTML=h;
      var tgt=st.celebrate?host.querySelector(".ms-done h3"):(back?host.querySelector(back):null);
      if(!tgt&&back) tgt=host.querySelector('[data-a="show"]:not([hidden])')||host.querySelector(".ms-pill");
      if(tgt) try{ tgt.focus({preventScroll:true}); }catch(e){}
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

/* ----------------------------------------------------------------------------
   The labs: Atom you learn by doing. Shared by the website and the app.

     Build      put protons, neutrons, and electrons together by clicking,
                typing, or dragging, and see which element, isotope, and ion
                you made and what its nucleus does; or fill an element's
                orbital boxes by hand and check them against three rules.
     Predict    a question, your answer, then the reason. Questions you miss
                come back on a widening schedule (spaced repetition). A
                teacher can make a challenge: a fixed set of questions that
                anyone can open from a link or a short code.
     Calculate  plug numbers into four real formulas: the light an atom gives
                off, radioactive decay, E = mc^2, and molar mass.
     Workbench  the fusion, chemical-bond, and battery simulations.
     Hear       an element's light played as a chord, its electrons filling
                in as a melody, and a game: name the element by ear. Sound
                plays only when you press a button.
     You        what you have explored, built, and mastered; today's element;
                badges; questions due for review; a page to print.
   Everything is kept on this device. Nothing is sent anywhere.
   ---------------------------------------------------------------------------- */
var AtomLabs=(function(){
  var D=document;
  /* ------------------------------------------------------------ helpers */
  function el(z){ return ELEMENTS[z-1]; }
  function nm(z){ return el(z)[2]; }
  function lc(z){ return el(z)[2].toLowerCase(); }
  function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;"); }
  function cap(s){ return s.charAt(0).toUpperCase()+s.slice(1); }
  function an(word){ return (/^[aeio]/i.test(word)?"an ":"a ")+word; }
  function fmt(x,d){ return (+x).toLocaleString("en-US",{maximumFractionDigits:d,minimumFractionDigits:d}).replace(/^-/,"−"); }
  function supNum(n){ return String(n).replace(/−/g,"-").split("").map(function(c){ var i="-0123456789+".indexOf(c); return i<0?c:"⁻⁰¹²³⁴⁵⁶⁷⁸⁹⁺".charAt(i); }).join(""); }
  function sci(x,dig){
    if(!isFinite(x)) return "—"; if(x===0) return "0";
    var s=x<0?"−":"", a=Math.abs(x), e=Math.floor(Math.log10(a));
    if(e>=-2&&e<6) return s+fmt(a, Math.max(0,Math.min(4,(dig||3)-1-e)));
    return s+fmt(a/Math.pow(10,e),(dig||3)-1)+" × 10"+supNum(e);
  }
  /* a plain number a number field can show (never "1.2 × 10⁹") */
  function plain(x){ return String(+(+x).toPrecision(4)); }
  function words(n){ return ["no","one","two","three","four","five","six","seven","eight","nine","ten"][n]||String(n); }
  function rng(seed){ var a=seed>>>0; return function(){ a=(a+0x6D2B79F5)>>>0; var t=a; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296; }; }
  function fit(c){ var r=c.getBoundingClientRect(), d=Math.min(window.devicePixelRatio||1,2);
    var w=Math.max(1,Math.round(r.width*d)), h=Math.max(1,Math.round(r.height*d));
    if(c.width!==w||c.height!==h){ c.width=w; c.height=h; }
    var g=c.getContext("2d"); g.setTransform(d,0,0,d,0,0); return {g:g,w:r.width,h:r.height}; }
  /* a label on a small plate of the ground color, so it reads over any drawing */
  function label(g,t,x,y,th,align){
    g.textAlign=align||"center"; var m=g.measureText(t), w=m.width, a=m.actualBoundingBoxAscent||10, d=m.actualBoundingBoxDescent||3,
      x0=g.textAlign==="center"?x-w/2:(g.textAlign==="right"?x-w:x);
    g.save(); g.globalAlpha=0.86; g.fillStyle=th.plate; g.fillRect(x0-3,y-a-3,w+6,a+d+6); g.restore(); g.fillText(t,x,y);
  }
  /* visible wavelength to a display color (after Bruton's approximation) */
  function wlRGB(w){
    var r=0,g=0,b=0;
    if(w>=380&&w<440){ r=-(w-440)/60; b=1; } else if(w<490){ g=(w-440)/50; b=1; } else if(w<510){ g=1; b=-(w-510)/20; }
    else if(w<580){ r=(w-510)/70; g=1; } else if(w<645){ r=1; g=-(w-645)/65; } else if(w<=780){ r=1; }
    var f=w<420?0.3+0.7*(w-380)/40:(w>700?0.3+0.7*(780-w)/80:1);
    return "rgb("+[r,g,b].map(function(v){ return Math.round(255*Math.pow(Math.max(0,v)*f,0.8)); }).join(",")+")";
  }
  var VIS0=380, VIS1=750;          /* what this module calls visible light, everywhere */
  var SYM={}; ELEMENTS.forEach(function(e){ SYM[e[1]]=e[0]; SYM[e[1].toLowerCase()]=e[0]; SYM[e[2].toLowerCase()]=e[0]; });
  SYM.aluminum=13; SYM.cesium=55; SYM.sulphur=16;
  function zOf(s){ s=String(s||"").trim(); if(/^\d+$/.test(s)){ var n=+s; return n>=1&&n<=118?n:0; } return SYM[s]||SYM[s.toLowerCase()]||0; }
  function nameOnly(s){ s=String(s||"").trim(); return /^\d+$/.test(s)?0:(SYM[s]||SYM[s.toLowerCase()]||0); }
  function commonA(z){ var e=el(z); return e[16]||Math.round(e[3]); }
  /* the elements with no stable isotope, outside the two primordial ones, are
     represented by their longest-lived isotope, not a "most common" one */
  function synthetic(z){ return !(STABLE[z]||[]).length&&z!==83&&z!==90&&z!==92; }
  function isoWord(z){ return synthetic(z)?"longest-lived":"most common"; }

  /* ------------------------------------------------------------ progress */
  var Progress=(function(){
    var KEY="atom.progress", subs=[], P=null;
    function blank(){ return {v:1, seen:{}, built:{}, heard:{}, calc:{}, learn:{}, mastered:{}, days:{}, daily:{}, badges:{}, goals:{}, orbitals:{}, challenges:{},
      run:0, best:0, right:0, reviewed:0, ion:0, unstable:0, ear:0}; }
    function load(){ var b=blank(), d=null; try{ d=JSON.parse(localStorage.getItem(KEY)||"null"); }catch(e){ d=null; }
      if(!d||typeof d!=="object") d=b; for(var k in b) if(d[k]==null||typeof d[k]!==typeof b[k]) d[k]=b[k]; P=d; }
    load();
    function save(){ try{ localStorage.setItem(KEY,JSON.stringify(P)); }catch(e){} }
    function pad(n){ return (n<10?"0":"")+n; }
    function day(d){ d=d||new Date(); return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()); }
    function count(o){ return Object.keys(o).length; }
    function today(){ var k=day(); if(!P.daily[k]) P.daily[k]={}; P.days[k]=1; return P.daily[k]; }
    /* one element a day, the same for everyone on the same calendar date; 37
       is coprime with 103, so the cycle visits every element up to lawrencium */
    function dailyZ(d){ d=d||new Date(); var n=Math.round(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/864e5); return (n*37)%103+1; }
    var BADGES=[
      {id:"first",    name:"First atom",     desc:"Build any atom.",                                   test:function(){ return count(P.built)>0; }},
      {id:"ion",      name:"Charged",        desc:"Build an ion: more or fewer electrons than protons.",test:function(){ return !!P.ion; }},
      {id:"unstable", name:"Unstable",       desc:"Build a radioactive isotope.",                      test:function(){ return !!P.unstable; }},
      {id:"isotopes", name:"Isotope hunter", desc:"Build three isotopes of one element.",              test:function(){ for(var z in P.built) if(count(P.built[z])>=3) return true; return false; }},
      {id:"builder",  name:"Builder",        desc:"Build ten different elements.",                     test:function(){ return count(P.built)>=10; }},
      {id:"goals",    name:"Workshop",       desc:"Finish every Build challenge.",                     test:function(){ return count(P.goals)>=8; }},
      {id:"boxes",    name:"Box filler",     desc:"Fill the orbital boxes of five elements correctly.", test:function(){ return count(P.orbitals)>=5; }},
      {id:"sharp",    name:"Sharp",          desc:"Answer five questions right in a row.",             test:function(){ return P.best>=5; }},
      {id:"recall",   name:"Remembered",     desc:"Get a question right that came back for review.",   test:function(){ return P.reviewed>=1; }},
      {id:"master",   name:"Master",         desc:"Master five elements (three different right answers each).", test:function(){ return count(P.mastered)>=5; }},
      {id:"challenge",name:"Challenger",     desc:"Finish a challenge someone shared with you.",       test:function(){ return count(P.challenges)>=1; }},
      {id:"calc",     name:"Calculator",     desc:"Use all four calculators.",                         test:function(){ return count(P.calc)>=4; }},
      {id:"listen",   name:"Listener",       desc:"Hear the light of five elements.",                  test:function(){ return count(P.heard)>=5; }},
      {id:"ear",      name:"Good ear",       desc:"Name three elements by the sound of their light.",  test:function(){ return P.ear>=3; }},
      {id:"explorer", name:"Explorer",       desc:"Open 25 element cards.",                            test:function(){ return count(P.seen)>=25; }},
      {id:"regular",  name:"Regular",        desc:"Explore on three different days.",                  test:function(){ return count(P.days)>=3; }},
      {id:"daily",    name:"Element of the day", desc:"Finish all three of today's tasks.",            test:function(){ for(var k in P.daily) if(P.daily[k].done) return true; return false; }},
      {id:"collector",name:"Collector",      desc:"Open all 118 element cards.",                       test:function(){ return count(P.seen)>=118; }}
    ];
    function award(){ var got=[]; BADGES.forEach(function(b){ if(!P.badges[b.id]&&b.test()){ P.badges[b.id]=Date.now(); got.push(b); } }); return got; }
    function finishDaily(){ var t=today(); if(t.card&&t.build&&t.quiz) t.done=1; }
    function emit(kind,info){ subs.forEach(function(f){ try{ f(kind,info); }catch(e){} }); }
    function mark(kind,z,x){
      var t=today(), dz=dailyZ();
      if(kind==="seen"){ P.seen[z]=1; if(z===dz) t.card=1; }
      else if(kind==="built"){ if(x.unbound) return [];                     /* a nucleus that falls apart was never built */
        (P.built[z]=P.built[z]||{})[x.A]=1; if(x.q) P.ion=1; if(x.unstable) P.unstable=1; if(z===dz&&x.A===commonA(z)) t.build=1; }
      else if(kind==="heard") P.heard[z]=1;
      else if(kind==="calc") P.calc[x]=1;
      else if(kind==="goal") P.goals[x]=1;
      else if(kind==="orbital") P.orbitals[z]=1;
      else if(kind==="ear") P.ear++;
      else if(kind==="challenge") P.challenges[x.code]={score:Math.max(x.score,(P.challenges[x.code]||{}).score||0), n:x.n, last:x.score, when:Date.now()};
      finishDaily(); var got=award(); save(); emit(kind,{z:z,x:x,badges:got}); return got;
    }
    /* days until a question comes back, by how many times in a row it was
       right; after four in a row it counts as learned and stops coming back */
    var GAP=[0,1,3,7,16];
    function answer(key,z,ok){
      var t=today(), now=Date.now(), r=P.learn[key]||{b:0,due:0,ok:0,no:0,last:0};
      var review=r.last>0 && now-r.last>12*3600e3;
      if(ok){ r.b=Math.min(4,r.b+1); r.ok++; P.run++; P.right++; if(P.run>P.best) P.best=P.run; if(review) P.reviewed++; if(z===dailyZ()) t.quiz=1; }
      else { r.b=0; r.no++; P.run=0; }
      r.due=now+(ok?GAP[r.b]*864e5:10*60e3); r.last=now; P.learn[key]=r;
      if(z&&ok){ var n=0; for(var k in P.learn){ if(k.split(":")[1]===String(z)&&P.learn[k].ok>0) n++; } if(n>=3) P.mastered[z]=1; }
      finishDaily(); var got=award(); save(); emit("answer",{z:z,ok:ok,badges:got}); return got;
    }
    function due(z){ var now=Date.now(), out=[]; for(var k in P.learn){ var r=P.learn[k]; if(r.due<=now&&r.b<4&&(!z||k.split(":")[1]===String(z))) out.push([r.due,k]); }
      return out.sort(function(a,b){ return a[0]-b[0]; }).map(function(x){ return x[1]; }); }
    function forget(key){ delete P.learn[key]; save(); }
    function level(z){ return P.mastered[z]?3:(P.built[z]?2:(P.seen[z]?1:0)); }
    /* a streak counts calendar days back from today (or from yesterday, if
       today hasn't started yet), so a clock change can't skip or repeat one */
    function streak(){ var n=0, d=new Date(); if(!P.days[day(d)]) d.setDate(d.getDate()-1); while(P.days[day(d)]){ n++; d.setDate(d.getDate()-1); } return n; }
    function stats(){ return {seen:count(P.seen), built:count(P.built), mastered:count(P.mastered), days:count(P.days), streak:streak(), right:P.right, best:P.best,
      badges:count(P.badges), due:due().length, orbitals:count(P.orbitals), challenges:count(P.challenges)}; }
    function daily(){ var t=P.daily[day()]||{}; return {z:dailyZ(), card:!!t.card, build:!!t.build, quiz:!!t.quiz, done:!!t.done}; }
    function reset(){ P=blank(); save(); emit("reset",{}); }
    /* a second window on the same device sees the first window's progress */
    try{ window.addEventListener("storage",function(e){ if(e.key===KEY){ load(); emit("sync",{}); } }); }catch(e){}
    return {mark:mark, answer:answer, due:due, forget:forget, level:level, stats:stats, daily:daily, badges:BADGES, has:function(id){ return !!P.badges[id]; },
      goal:function(id){ return !!P.goals[id]; }, on:function(f){ subs.push(f); }, reset:reset, data:function(){ return P; }};
  })();

  /* ------------------------------------------------------------ electrons */
  /* where the electrons of an ion are: a cation loses them from the highest
     shell first (so iron(II) keeps 3d6 and gives up 4s2); an anion's extra
     electrons fill in order, like the neutral atom with that many */
  function ionConfig(p,e){
    if(e<=0) return [];
    if(e>=p) return configOf(Math.min(e,118));
    var c=configOf(p).map(function(x){ return x.slice(); }), rem=p-e;
    while(rem>0){ var b=-1;
      for(var i=0;i<c.length;i++) if(c[i][2]>0&&(b<0||c[i][0]>c[b][0]||(c[i][0]===c[b][0]&&c[i][1]>c[b][1]))) b=i;
      c[b][2]--; rem--; }
    return c.filter(function(x){ return x[2]>0; });
  }
  var NOBLES=[86,54,36,18,10,2];
  function cfgText(c, html){
    var core="", rest=c.slice(), tot=c.reduce(function(s,x){ return s+x[2]; },0);
    for(var i=0;i<NOBLES.length;i++){ var ng=NOBLES[i]; if(ng>=tot) continue;
      var cc=configOf(ng), ok=cc.every(function(y){ return c.some(function(x){ return x[0]===y[0]&&x[1]===y[1]&&x[2]===y[2]; }); });
      if(ok){ core="["+NOBLE[ng]+"] "; rest=c.filter(function(x){ return !cc.some(function(y){ return x[0]===y[0]&&x[1]===y[1]; }); }); break; } }
    rest.sort(function(a,b){ return a[0]-b[0]||a[1]-b[1]; });
    return core+rest.map(function(x){ return x[0]+"spdf"[x[1]]+(html?"<sup>"+x[2]+"</sup>":supNum(x[2])); }).join(" ");
  }
  function shellsFrom(c){ var sh=[]; c.forEach(function(x){ sh[x[0]-1]=(sh[x[0]-1]||0)+x[2]; }); for(var i=0;i<sh.length;i++) sh[i]=sh[i]||0; return sh; }
  /* the order subshells fill in (n + l, then n): the Madelung rule */
  var ORDER=[[1,0],[2,0],[2,1],[3,0],[3,1],[4,0],[3,2],[4,1],[5,0],[4,2],[5,1],[6,0],[4,3],[5,2],[6,1],[7,0],[5,3],[6,2],[7,1]];
  function fillOrder(c){ return c.slice().sort(function(a,b){ return (a[0]+a[1])-(b[0]+b[1])||a[0]-b[0]; }); }

  /* ------------------------------------------------------------ nuclei */
  /* the ion a name belongs to: "oxide" is O2-, so O3- is not an oxide ion */
  var ANION={1:[-1,"hydride"],6:[-4,"carbide"],7:[-3,"nitride"],8:[-2,"oxide"],9:[-1,"fluoride"],15:[-3,"phosphide"],16:[-2,"sulfide"],17:[-1,"chloride"],34:[-2,"selenide"],35:[-1,"bromide"],53:[-1,"iodide"]};
  function anionName(z,q){ return ANION[z]&&ANION[z][0]===q?ANION[z][1]:""; }
  function chargeStr(q){ return q===0?"0":(Math.abs(q)===1?"":Math.abs(q))+(q>0?"+":"−"); }
  function isoName(z,a){ if(z===1&&a===2) return "deuterium (hydrogen-2)"; if(z===1&&a===3) return "tritium (hydrogen-3)"; return lc(z)+"-"+a; }
  function hlWords(t){ return t.replace(/\b(\d+) (\d{3})\b/,"$1,$2").replace(/ ky$/," thousand years").replace(/ My$/," million years").replace(/ Gy$/," billion years").replace(/ y$/," years").replace(/ d$/," days").replace(/ h$/," hours").replace(/ min$/," minutes"); }
  function modeWords(m){ return m.split(/,\s*/).map(function(x){ return x.replace("beta-","beta-minus decay").replace("beta+","beta-plus decay").replace(/^EC$/,"electron capture").replace(/^alpha$/,"alpha decay").replace(/^SF$/,"spontaneous fission"); }).join(" or "); }
  /* isotopes that are radioactive but so slow that the ones made before Earth
     formed are still here (NUBASE2020; double-beta half-lives from the
     measurements it cites). [half-life in years, how it decays, what it makes] */
  var PRIMORDIAL={"19-40":null, "23-50":[2.7e17,"ec","titanium-50"], "20-48":[6.4e19,"bb","titanium-48"], "32-76":[2.0e21,"bb","selenium-76"], "34-82":[8.8e19,"bb","krypton-82"],
    "37-87":[4.97e10,"b","strontium-87"], "40-96":[2.3e19,"bb","molybdenum-96"], "42-100":[7.1e18,"bb","ruthenium-100"], "48-113":[8.0e15,"b","indium-113"], "48-116":[2.7e19,"bb","tin-116"],
    "49-115":[4.4e14,"b","tin-115"], "52-128":[2.2e24,"bb","xenon-128"], "52-130":[7.9e20,"bb","xenon-130"], "54-124":[1.8e22,"ecec","tellurium-124"], "54-136":[2.2e21,"bb","barium-136"],
    "56-130":[1e21,"ecec","xenon-130"], "57-138":[1.03e11,"ec","barium-138"], "60-144":[2.3e15,"a","cerium-140"], "60-150":[9.3e18,"bb","samarium-150"], "62-147":[1.06e11,"a","neodymium-143"],
    "62-148":[6.3e15,"a","neodymium-144"], "63-151":[4.6e18,"a","promethium-147"], "64-152":[1.08e14,"a","samarium-148"], "71-176":[3.7e10,"b","hafnium-176"], "72-174":[7.0e16,"a","ytterbium-170"],
    "74-180":[1.8e18,"a","hafnium-176"], "75-187":[4.3e10,"b","osmium-187"], "76-186":[2.0e15,"a","tungsten-182"], "78-190":[4.8e11,"a","osmium-186"]};
  var PMODE={b:"beta-minus decay (a neutron turns into a proton)", ec:"electron capture (a proton captures an electron and becomes a neutron)",
    bb:"double beta decay (two neutrons turn into two protons at once)", ecec:"double electron capture (two protons capture two electrons at once)", a:"alpha decay"};
  function ageCompare(y){ var r=y/1.38e10;
    return r>=1e9?"more than a billion times the age of the universe":r>=1e6?"more than a million times the age of the universe":r>=1e3?"thousands of times the age of the universe":r>=10?"more than ten times the age of the universe":"longer than the age of the universe"; }
  function nuclide(z,a){
    if(z<=0){
      if(a===0) return {kind:"none",tone:"",title:"Nothing yet",text:"Add a proton and you have hydrogen. Every element is just a number of protons."};
      if(a===1) return {kind:"radioactive",tone:"warn",title:"A free neutron",text:"On its own a neutron lasts about 15 minutes on average, then turns into a proton, an electron, and an antineutrino."};
      return {kind:"unbound",tone:"bad",title:"Falls apart",text:"Neutrons alone don't hold together: without protons, this flies apart at once."};
    }
    if(z>118) return {kind:"unknown",tone:"warn",title:"Not made yet",text:"No one has made an element with "+z+" protons. The heaviest so far is oganesson, with 118."};
    var st=STABLE[z]||[], name=isoName(z,a);
    if(st.indexOf(a)>=0) return {kind:"stable",tone:"ok",title:"Stable",
      text:cap(name)+(st.length>1?" is one of "+lc(z)+"'s "+words(st.length)+" stable isotopes."+(a===commonA(z)?" It is the most common one.":""):" is "+lc(z)+"'s only stable isotope.")+" It can last forever."};
    if(z===83&&a===209) return {kind:"stable",tone:"ok",title:"Practically stable",text:"Bismuth-209 does decay, but its half-life is about 2 × 10¹⁹ years, a billion times the age of the universe."};
    var nb=(NOTABLE[z]||[]).filter(function(r){ return r[0]===a; })[0];
    if(nb) return {kind:"radioactive",tone:"warn",title:"Radioactive",text:cap(name)+" decays by "+modeWords(nb[2])+", with a half-life of "+hlWords(nb[1])+". "+cap(nb[3])+"."};
    var pr=PRIMORDIAL[z+"-"+a];
    if(pr) return {kind:"radioactive",tone:"warn",title:"Radioactive, very slowly",
      text:cap(name)+" is radioactive, but so slowly that the "+lc(z)+" made before Earth formed is still here. Its half-life is about "+sci(pr[0],2)+" years, "+ageCompare(pr[0])+". It decays by "+PMODE[pr[1]]+", becoming "+pr[2]+"."};
    /* the lightest nuclei are measured, not estimated: the liquid-drop model
       is far off for them, so their edges come from experiment (NUBASE2020;
       fluorine-31 and neon-34, Ahn et al. 2019; oxygen-28, Kondo et al. 2023) */
    if(z<=10){
      var rg=LIGHT_BOUND[z], gp=LIGHT_GAPS[z]||[];
      if(LIGHT_NOTE[z+"-"+a]) return {kind:"unbound",tone:"bad",title:"Falls apart",text:LIGHT_NOTE[z+"-"+a]};
      if(a>rg[1]) return {kind:"unbound",tone:"bad",title:"Falls apart",text:"With this many neutrons the last one isn't held at all; it leaves almost at once. Experiments find "+isoName(z,rg[1])+" is the heaviest "+lc(z)+" that holds together. You have found the edge of the nuclear map."};
      if(a<rg[0]) return {kind:"unbound",tone:"bad",title:"Falls apart",text:"With so few neutrons the protons push each other out, and one leaves almost at once. The lightest "+lc(z)+" that holds together is "+isoName(z,rg[0])+"."};
      if(gp.indexOf(a)>=0) return {kind:"unbound",tone:"bad",title:"Falls apart",text:cap(name)+" falls apart almost at once: a neutron leaves it, even though "+lc(z)+"-"+(a-1)+" and "+lc(z)+"-"+(a+1)+" hold together. Neutrons hold on better in pairs."};
    }
    /* where stable nuclei lie: the neutron excess grows as 0.4 A^2 / (A + 200)
       (Green's approximation). Heavier than neon, the edges are the
       liquid-drop model's, and the text says so. */
    var N=a-z, v=(a-0.4*a*a/(a+200))/2;
    if(z>10){
      var B=bindingSEMF(z,a), Sn=N>=1?B-bindingSEMF(z,a-1):Infinity, Sp=z>1?B-bindingSEMF(z-1,a-1):Infinity;
      if(B<=0||Sn<0||Sp<0){
        if(z>v) return {kind:"unbound",tone:"bad",title:"Falls apart",text:"With so few neutrons the protons push each other out, and one would leave almost at once. (Estimated from the liquid-drop model.)"};
        return {kind:"unbound",tone:"bad",title:"Falls apart",text:"With this many neutrons the last one isn't held at all; it would drip off almost at once. You have found the edge of the nuclear map. (Estimated from the liquid-drop model.)"};
      }
    }
    var none=st.length===0, why;
    if(z>=84) why="Nuclei this heavy decay by shedding an alpha particle, two protons and two neutrons, which would make "+lc(z-2)+"-"+(a-4)+". One with extra neutrons may instead turn a neutron into a proton (beta-minus decay). Which wins depends on details this estimate can't settle.";
    else if(z<v-0.5) why="It has more neutrons than "+lc(z)+" can hold steadily, so a neutron will turn into a proton (beta-minus decay), making "+lc(z+1)+"-"+a+".";
    else if(z>v+0.5) why="It has too few neutrons, so a proton will turn into a neutron (beta-plus decay or electron capture), making "+(z>1?lc(z-1)+"-"+a:"a neutron-rich nucleus")+".";
    else why="It sits right on the line where stable nuclei lie, but its neighbors with the same mass are more tightly bound, so it will turn into one of them by beta decay.";
    return {kind:"radioactive",tone:"warn",title:"Radioactive",text:(none?"No isotope of "+lc(z)+" is stable. ":"")+why+" (An estimate: this isotope isn't in Atom's list of measured ones.)"};
  }
  var LIGHT_BOUND={1:[1,3],2:[3,8],3:[6,11],4:[7,14],5:[8,19],6:[9,22],7:[12,23],8:[13,24],9:[17,31],10:[17,34]};
  var LIGHT_GAPS={2:[5,7],3:[10],4:[13],5:[16,18],6:[21],9:[28,30],10:[33]};
  var MASS5="No nucleus with five particles holds together, and none with eight lasts as long as a second. Those two gaps are a main reason the Big Bang made almost nothing heavier than lithium.";
  var LIGHT_NOTE={"2-5":"Helium-5 falls apart almost at once. "+MASS5, "3-5":"Lithium-5 falls apart almost at once. "+MASS5,
    "4-8":"Beryllium-8 splits into two helium-4 nuclei in about 10⁻¹⁶ seconds. Stars get past it only by catching a third helium nucleus before it splits, which is how the universe makes its carbon.",
    "5-9":"Boron-9 doesn't hold together: it sheds a proton almost at once, leaving beryllium-8, which then splits into two helium-4 nuclei."};
  function halfLifeSeconds(text){
    var m=/([\d\s.]+)\s*(s|min|h|d|y|ky|My|Gy)\b/.exec(text); if(!m) return 0;
    var v=parseFloat(m[1].replace(/\s/g,"")), Y=365.25*86400;
    return v*{s:1,min:60,h:3600,d:86400,y:Y,ky:1e3*Y,My:1e6*Y,Gy:1e9*Y}[m[2]];
  }

  /* ------------------------------------------------------------ sound */
  var Sound=(function(){
    var ac=null, out=null, vol=0.5, live=[];
    function ctx(){ if(!ac){ var A=window.AudioContext||window.webkitAudioContext; if(!A) return null; ac=new A(); out=ac.createGain(); out.gain.value=vol; out.connect(ac.destination); }
      if(ac.state==="suspended") ac.resume(); return ac; }
    function tone(f,t0,dur,gain,type){ var a=ctx(); if(!a||!(f>20&&f<20000)) return; var o=a.createOscillator(), g=a.createGain();
      o.type=type||"sine"; o.frequency.value=f; g.gain.setValueAtTime(0,t0); g.gain.linearRampToValueAtTime(gain,t0+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
      o.connect(g); g.connect(out); o.start(t0); o.stop(t0+dur+0.05); live.push(o); o.onended=function(){ var i=live.indexOf(o); if(i>=0) live.splice(i,1); }; }
    function click(){ var a=ctx(); if(!a) return; var n=Math.floor(a.sampleRate*0.004), buf=a.createBuffer(1,n,a.sampleRate), d=buf.getChannelData(0);
      for(var i=0;i<n;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/n,3); var s=a.createBufferSource(), g=a.createGain(); g.gain.value=0.6; s.buffer=buf; s.connect(g); g.connect(out); s.start(); }
    function stop(){ live.slice().forEach(function(o){ try{ o.stop(); }catch(e){} }); live=[]; }
    function now(){ var a=ctx(); return a?a.currentTime:0; }
    function setVol(v){ vol=v; if(out) out.gain.value=v; }
    return {tone:tone, click:click, stop:stop, now:now, setVol:setVol, ok:function(){ return !!(window.AudioContext||window.webkitAudioContext); }};
  })();
  /* light to sound: the light's own frequency, forty octaves down. Visible
     light spans about one octave (750 to 380 nm is 400 to 790 THz), so the
     tones run from about 364 to 718 Hz and keep the light's real ratios. */
  var OCT40=Math.pow(2,40);
  function lightHz(w){ return 299792458/(w*1e-9)/OCT40; }

  /* ------------------------------------------------------------ formulas */
  /* a formula is parts joined by dots (a hydrate: CuSO4·5H2O); each part may
     start with a count, and brackets nest inside a part */
  function parseFormula(src){
    var s=String(src).replace(/[₀-₉]/g,function(c){ return String(c.charCodeAt(0)-0x2080); }).replace(/\s+/g,"").replace(/[·•∙*]/g,".");
    if(!s) throw new Error("Type a formula, like H2O.");
    var tot={};
    function add(t,o,k){ for(var x in o) t[x]=(t[x]||0)+o[x]*k; }
    s.split(".").forEach(function(part){
      if(!part) throw new Error("A dot needs a part of the formula on each side.");
      var i=0;
      function num(){ var m=/^\d+/.exec(part.slice(i)); if(!m) return 1; i+=m[0].length; if(+m[0]===0) throw new Error("A count can't be zero."); return +m[0]; }
      function group(close){
        var t={};
        while(i<part.length){
          var c=part[i];
          if(c==="("||c==="["){ i++; var inner=group(c==="("?")":"]"); add(t,inner,num()); }
          else if(c===")"||c==="]"){ if(c!==close) throw new Error("A bracket doesn't match."); i++; return t; }
          else if(/[A-Z]/.test(c)){ var m=/^[A-Z][a-z]?/.exec(part.slice(i)), sym=m[0];
            if(!SYM[sym]||el(SYM[sym])[1]!==sym){ if(sym.length===2&&SYM[sym[0]]&&el(SYM[sym[0]])[1]===sym[0]&&!/[a-z]/.test(part[i+2]||"")){ sym=sym[0]; } else throw new Error("There is no element \""+sym+"\"."); }
            i+=sym.length; var n=num(); t[sym]=(t[sym]||0)+n; }
          else if(/[a-z]/.test(c)) throw new Error("Element symbols start with a capital letter: \""+cap(part.slice(i,i+2).replace(/[^a-z]/g,""))+"\", not \""+part.slice(i,i+2).replace(/[^a-z]/g,"")+"\".");
          else throw new Error("I can't read \""+c+"\" here. Use element symbols, numbers, and brackets.");
        }
        if(close) throw new Error("A bracket is never closed.");
        return t;
      }
      var lead=num(), g=group(null);
      if(!Object.keys(g).length) throw new Error("Type a formula, like H2O.");
      add(tot,g,lead);
    });
    return tot;
  }
  /* one electron around a nucleus of charge Z (hydrogen, He+, Li2+): the Bohr
     levels with the reduced-mass correction, so hydrogen-alpha lands on its
     measured 656.47 nm (vacuum) */
  var HY={1:{n:"hydrogen",m:938.272},2:{n:"helium ion He⁺",m:3727.379},3:{n:"lithium ion Li²⁺",m:6533.833}};
  function lineOf(Zc,nu,nl){ var f=1/(1+0.51099895/HY[Zc].m), E=13.605693122990*Zc*Zc*f*(1/(nl*nl)-1/(nu*nu)); return {E:E, w:1239.841984/E}; }
  /* the Hill order chemists index formulas by: carbon, then hydrogen, then the rest alphabetically */
  function hill(counts){ var k=Object.keys(counts), c=counts.C?["C"].concat(counts.H?["H"]:[]):[];
    k=c.concat(k.filter(function(x){ return c.indexOf(x)<0; }).sort());
    return k.map(function(x){ return x+(counts[x]>1?counts[x]:""); }).join(""); }

  /* ------------------------------------------------------------ answers */
  function normNum(s){ return String(s).replace(/[−–]/g,"-").replace(/[,\s]/g,"").replace(/°?c$/i,""); }
  function chargeOf(s){ s=String(s).replace(/[−–]/g,"-").replace(/\s/g,""); var m=/^([+-]?)(\d*)([+-]?)$/.exec(s); if(!m) return NaN;
    if(m[2]===""&&!m[1]&&!m[3]) return NaN; var n=m[2]===""?1:+m[2], sg=(m[1]||m[3]||"+")==="-"?-1:1; return n===0?0:sg*n; }
  /* a typed configuration: "1s2 2s2 2p4", "1s22s22p4", "[He] 2s² 2p⁴". An s or
     p count is one digit; a d or f count may be two (3d10, 4f14). */
  function occOf(text){
    var s=String(text).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g,function(c){ return String("⁰¹²³⁴⁵⁶⁷⁸⁹".indexOf(c)); }).toLowerCase().replace(/\s+/g," "), occ={}, ok=false;
    var core=/\[(he|ne|ar|kr|xe|rn)\]/.exec(s);
    if(core){ configOf(zOf(cap(core[1]))).forEach(function(x){ occ[x[0]+","+x[1]]=x[2]; }); ok=true; s=s.replace(core[0]," "); }
    var re=/([1-7])\s?([spdf])\s?/g, m;
    while((m=re.exec(s))){ var l="spdf".indexOf(m[2]), cap2=[2,6,10,14][l], i=re.lastIndex, d2=/^\d\d/.exec(s.slice(i)), d1=/^\d/.exec(s.slice(i)), k=0;
      if(d2&&+d2[0]<=cap2&&l>=2){ k=+d2[0]; i+=2; } else if(d1){ k=+d1[0]; i+=1; } else continue;
      occ[m[1]+","+l]=(occ[m[1]+","+l]||0)+k; re.lastIndex=i; ok=true; }
    return ok?occ:null;
  }

  /* ------------------------------------------------------------ questions
     Each type knows which elements it can ask about (ok), how to pick the
     rest of the question from a random stream (param), and how to build the
     question, check an answer, and explain it (make). A question is a key,
     "type:Z:param", so it can be stored for review and rebuilt exactly. */
  function neighbors(z,useGroup){
    var e=el(z), out=[];
    ELEMENTS.forEach(function(f){ var w=f[0]; if(w===z||w>96||!ARAD[w-1]||!ARAD[z-1]) return;
      if(useGroup ? (e[6]&&f[6]===e[6]&&Math.abs(f[7]-e[7])===1) : (f[7]===e[7]&&f[6]&&e[6]&&Math.abs(f[6]-e[6])<=3))
        if(Math.abs(ARAD[w-1]-ARAD[z-1])>=10) out.push(w); });
    return out;
  }
  function mainGroup(z){ var g=el(z)[6]; return g===1||g===2||(g>=13&&g<=18); }
  function valence(z){ var g=el(z)[6]; return z===2?2:(g<=2?g:g-10); }
  var ION={3:1,11:1,19:1,37:1,55:1,4:2,12:2,20:2,38:2,56:2,13:3,7:-3,15:-3,8:-2,16:-2,34:-2,9:-1,17:-1,35:-1,53:-1};
  function ppm(x){ return x>=10000?fmt(x/10000,x>=100000?0:1)+"%":x>=1?sci(x,2)+" parts per million":x>=1e-3?sci(x*1e3,2)+" parts per billion":sci(x*1e6,2)+" parts per trillion"; }
  function plainCfg(z){ return cfgText(configOf(z),false); }
  var QLABEL={n:"Neutrons",q:"Charge",z:"Atomic numbers",r:"Atom size",c:"Configurations",g:"Name the configuration",s:"Stable or radioactive",d:"Density",
    m:"Melting points",b:"Blocks",v:"Valence electrons",i:"Ions",o:"Where it was made",y:"Discovery",a:"Abundance"};
  var QTYPES={
    n:{ ok:function(z){ return (STABLE[z]||[]).length>0||(NOTABLE[z]||[]).length>0; },
        param:function(z,r){ var l=(STABLE[z]||[]).concat((NOTABLE[z]||[]).map(function(x){ return x[0]; })); return l[Math.floor(r()*l.length)]; },
        make:function(z,a){ return {text:"How many neutrons are in "+isoName(z,a)+"?", input:"numeric", hint:"Type a number",
          check:function(v){ var ok=+normNum(v)===a-z; return {ok:ok, answer:String(a-z),
            why:"The mass number, "+a+", counts protons and neutrons together. Every "+lc(z)+" atom has "+z+" proton"+(z>1?"s":"")+", so "+a+" − "+z+" = "+(a-z)+" neutron"+(a-z===1?"":"s")+"."}; }}; }},
    q:{ ok:function(z){ return z<=56; },
        param:function(z,r){ var d=[1,2,-1,-2,3,-3][Math.floor(r()*6)]; return Math.max(0,z-d); },
        make:function(z,e){ return {text:"An atom has "+z+" proton"+(z>1?"s":"")+" and "+e+" electron"+(e===1?"":"s")+". What is its charge?", input:"text", hint:"For example +2, −1, or 0",
          check:function(v){ var q=z-e, qs=q>0?"+"+q:(q<0?"−"+(-q):"0"), ok=chargeOf(v)===q, nmA=anionName(z,q); return {ok:ok, answer:qs,
            why:"Each proton carries +1 and each electron −1, so the charge is "+z+" − "+e+" = "+qs+"."+(q?" "+(q>0?"Losing":"Gaining")+" electrons makes "+(q>0?"a positive":"a negative")+" ion"+(nmA?", here "+an(nmA)+" ion":"")+".":" Equal numbers make a neutral atom.")}; }}; }},
    z:{ ok:function(){ return true; }, ident:true, param:function(){ return 0; },
        make:function(z){ return {text:"Which element has atomic number "+z+"?", input:"text", hint:"Type its name or symbol", tiles:[],
          check:function(v){ var ok=nameOnly(v)===z; return {ok:ok, answer:nm(z)+" ("+el(z)[1]+")", why:(/^\s*\d+\s*$/.test(v)?"Type the element's name or symbol, not the number. ":"")+"The atomic number is the number of protons, and it alone decides the element: every atom with "+z+" proton"+(z>1?"s":"")+" is "+lc(z)+"."}; }}; }},
    r:{ ok:function(z){ return z<=96&&neighbors(z,true).length+neighbors(z,false).length>0; },
        param:function(z,r){ var l=neighbors(z,true).concat(neighbors(z,false)); return l[Math.floor(r()*l.length)]; },
        make:function(z,w){ var a=[z,w].sort(function(x,y){ return x-y; }); return {text:"Which atom is bigger?", choices:a.map(function(k){ return {v:k, label:nm(k)}; }), tiles:a,
          check:function(v){ var big=ARAD[z-1]>ARAD[w-1]?z:w, small=big===z?w:z, sameGroup=el(z)[6]===el(w)[6];
            var trend=sameGroup?(el(big)[7]>el(small)[7]):(big<small);
            return {ok:+v===big, answer:nm(big), right:big,
              why:cap(lc(big))+" (about "+ARAD[big-1]+" pm) beats "+lc(small)+" (about "+ARAD[small-1]+" pm). "+(trend?(sameGroup?"Going down a group adds a whole new shell of electrons, so atoms grow.":"Across a period each step adds a proton that pulls the same shell in tighter, so atoms shrink from left to right."):"This pair runs against the usual trend, which happens where electron shells fill unevenly.")}; }}; }},
    c:{ ok:function(z){ return z<=36; }, param:function(){ return 0; },
        make:function(z){ return {text:"Type the electron configuration of "+lc(z)+".", input:"text", hint:"For example 1s2 2s2 2p4, or [He] 2s2 2p4",
          check:function(v){ var occ=occOf(v), want={}, ok=!!occ; configOf(z).forEach(function(x){ want[x[0]+","+x[1]]=x[2]; });
            if(ok){ for(var k in want) if(occ[k]!==want[k]) ok=false; for(k in occ) if(occ[k]&&!want[k]) ok=false; }
            return {ok:ok, answer:plainCfg(z), why:"Electrons fill the lowest-energy subshells first: 1s, 2s, 2p, 3s, 3p, 4s, 3d, 4p. An s subshell holds 2, p holds 6, and d holds 10."+(EXCEPT[z]?" "+cap(lc(z))+" is an exception: "+(EXCEPT_WHY[z]||"its subshells are close in energy")+".":"")}; }}; }},
    g:{ ok:function(z){ return z<=36&&z>2; }, ident:true, param:function(){ return 0; },
        make:function(z){ return {text:"Which element has the electron configuration "+plainCfg(z)+"?", input:"text", hint:"Type its name or symbol", tiles:[],
          check:function(v){ var ok=nameOnly(v)===z; return {ok:ok, answer:nm(z)+" ("+el(z)[1]+")",
            why:"Count the electrons: "+configOf(z).map(function(x){ return x[2]; }).join(" + ")+" = "+z+". A neutral atom has as many electrons as protons, so this is element "+z+", "+lc(z)+"."}; }}; }},
    s:{ ok:function(z){ return z<=94&&((STABLE[z]||[]).length>0||(NOTABLE[z]||[]).length>0); },
        param:function(z,r){ var st=STABLE[z]||[], nb=(NOTABLE[z]||[]).map(function(x){ return x[0]; }), ca=commonA(z);
          var pool=st.concat(nb).concat([ca+3,Math.max(z,ca-3)]).filter(function(a){ return nuclide(z,a).kind!=="unbound"; }); return pool[Math.floor(r()*pool.length)]; },
        make:function(z,a){ var info=nuclide(z,a); return {text:"Is "+isoName(z,a)+" stable or radioactive?", choices:[{v:"stable",label:"Stable"},{v:"radioactive",label:"Radioactive"}],
          check:function(v){ var right=info.kind==="stable"?"stable":"radioactive"; return {ok:v===right, answer:cap(right), right:right, why:info.text}; }}; }},
    d:{ ok:function(z){ return el(z)[8]!=="gas"&&el(z)[9]&&z<=94; },
        param:function(z,r){ var l=ELEMENTS.filter(function(f){ return f[0]!==z&&f[8]!=="gas"&&f[9]&&f[0]<=94&&Math.abs(f[9]-el(z)[9])/Math.max(f[9],el(z)[9])>0.15; }); return l[Math.floor(r()*l.length)][0]; },
        make:function(z,w){ var a=[z,w].sort(function(x,y){ return x-y; }); return {text:"Which is denser?", choices:a.map(function(k){ return {v:k,label:nm(k)}; }), tiles:a,
          check:function(v){ var big=el(z)[9]>el(w)[9]?z:w, small=big===z?w:z; return {ok:+v===big, answer:nm(big), right:big,
            why:cap(lc(big))+" packs "+fmt(el(big)[9],2)+" grams into each cubic centimeter; "+lc(small)+", "+fmt(el(small)[9],2)+". Density depends on how heavy the atoms are and how tightly they stack."}; }}; }},
    /* not helium (it needs pressure to freeze), carbon or arsenic (they turn
       straight to gas), astatine, francium, or fermium and up (predicted) */
    m:{ ok:function(z){ return el(z)[10]>0&&z<100&&[2,6,33,85,87].indexOf(z)<0; }, param:function(){ return 0; },
        make:function(z){ return {text:"Estimate: at what temperature does "+lc(z)+" melt, in °C?", input:"text", hint:"Within 15 percent or 50 degrees counts",
          check:function(v){ var K=el(z)[10], C0=K-273.15, g=parseFloat(normNum(v)), ok=isFinite(g)&&g>-273.15&&Math.abs(g-C0)<=Math.max(50,0.15*Math.abs(C0)), bp=el(z)[11];
            return {ok:ok, answer:fmt(C0,0)+" °C", why:cap(lc(z))+" melts at "+fmt(C0,0)+" °C ("+fmt(K,0)+" K). "+
              (K<298?(bp&&bp<298?"It boils at "+fmt(bp-273.15,0)+" °C too, so on a normal day it is a gas.":"That is below room temperature, so on a normal day it is a liquid."):"So on a normal day it is a solid.")+
              (K>2500?" Only a few elements hold together this hard; their atoms share many electrons with their neighbors.":"")}; }}; }},
    /* lanthanum, lutetium, actinium, and lawrencium sit where tables disagree,
       and helium is s-block by its electrons but sits over the p-block */
    b:{ ok:function(z){ return [2,57,71,89,103].indexOf(z)<0; }, param:function(){ return 0; },
        make:function(z){ var bk=blockOf(z); return {text:"Which block of the periodic table is "+lc(z)+" in?", choices:["s","p","d","f"].map(function(k){ return {v:k,label:k+"-block"}; }), tiles:[z],
          check:function(v){ return {ok:v===bk, answer:bk+"-block", right:bk, why:"A block is named for the subshell being filled across that part of the table. "+cap(lc(z))+"'s configuration is "+configStr(z,true)+", and it sits in the "+bk+"-block."}; }}; }},
    v:{ ok:function(z){ return z<=86&&mainGroup(z); }, param:function(){ return 0; },
        make:function(z){ var n=valence(z); return {text:"How many electrons does "+lc(z)+" have in its outer shell?", input:"numeric", hint:"Type a number",
          check:function(v){ return {ok:+normNum(v)===n, answer:String(n), why:(z===2?"Helium's only shell holds two electrons, and it is full.":cap(lc(z))+" is in group "+el(z)[6]+", so it has "+n+" outer electron"+(n>1?"s":"")+".")+" Its configuration is "+configStr(z,true)+"; the outer shell is the one with the highest number."}; }}; }},
    i:{ ok:function(z){ return ION[z]!=null; }, param:function(){ return 0; },
        make:function(z){ var q=ION[z]; return {text:"Which ion does "+lc(z)+" usually form?", choices:[1,2,3,-1,-2,-3].map(function(k){ return {v:String(k), label:(k>0?"+":"−")+Math.abs(k)}; }), tiles:[z],
          check:function(v){ var ng=z-q, nmA=anionName(z,q), ion=nmA?an(nmA)+" ion":an(lc(z))+" ion"; return {ok:+v===q, answer:(q>0?"+":"−")+Math.abs(q), right:String(q),
            why:cap(lc(z))+" "+(q>0?"loses":"gains")+" "+words(Math.abs(q))+" electron"+(Math.abs(q)>1?"s":"")+" to become "+ion+", "+el(z)[1]+supNum(chargeStr(q))+". That leaves it with the same arrangement as "+lc(ng)+", a noble gas: "+configStr(ng,true)+"."}; }}; }},
    o:{ ok:function(z){ var m=ORIGIN[z-1]; if(!m||z>94) return false; var k=Object.keys(m).sort(function(a,b){ return m[b]-m[a]; }); return m[k[0]]>=0.5&&k[0]!=="h"; },
        param:function(z,r){ return Math.floor(r()*1e6); },
        make:function(z,seed){ var m=ORIGIN[z-1], top=Object.keys(m).sort(function(a,b){ return m[b]-m[a]; })[0], r=rng(seed+z), others=Object.keys(ORIGIN_KINDS).filter(function(k){ return k!==top&&k!=="h"; });
          var pick=[top]; while(pick.length<4&&others.length){ pick.push(others.splice(Math.floor(r()*others.length),1)[0]); }
          pick.sort(function(a,b){ return ORIGIN_KINDS[a].name<ORIGIN_KINDS[b].name?-1:1; });
          return {text:"Where was most of the Solar System's "+lc(z)+" made?", choices:pick.map(function(k){ return {v:k,label:ORIGIN_KINDS[k].name}; }), tiles:[z],
          check:function(v){ return {ok:v===top, answer:ORIGIN_KINDS[top].name, right:top,
            why:"About "+Math.round(m[top]*100)+" percent of it was made by "+(top==="b"?"the Big Bang":ORIGIN_KINDS[top].name.charAt(0).toLowerCase()+ORIGIN_KINDS[top].name.slice(1))+". Switch the table to the Origins lens to see every element's sources. (Shares after Johnson, 2019.)"}; }}; }},
    y:{ ok:function(z){ return el(z)[12]>=1700&&z<=103; },
        param:function(z,r){ var y=el(z)[12], l=ELEMENTS.filter(function(f){ return f[0]!==z&&f[12]>=1700&&f[0]<=103&&Math.abs(f[12]-y)>=15; }); return l[Math.floor(r()*l.length)][0]; },
        make:function(z,w){ var a=[z,w].sort(function(x,y){ return x-y; }); return {text:"Which was discovered first?", choices:a.map(function(k){ return {v:k,label:nm(k)}; }), tiles:a,
          check:function(v){ var first=el(z)[12]<el(w)[12]?z:w, later=first===z?w:z; return {ok:+v===first, answer:nm(first), right:first,
            why:cap(lc(first))+" was identified in "+el(first)[12]+(el(first)[13]?" ("+el(first)[13]+")":"")+"; "+lc(later)+" in "+el(later)[12]+(el(later)[13]?" ("+el(later)[13]+")":"")+"."}; }}; }},
    a:{ ok:function(z){ return el(z)[14]>0&&z<=92; },
        param:function(z,r){ var x=el(z)[14], l=ELEMENTS.filter(function(f){ return f[0]!==z&&f[14]>0&&f[0]<=92&&Math.max(f[14],x)/Math.min(f[14],x)>=10; }); return l[Math.floor(r()*l.length)][0]; },
        make:function(z,w){ var a=[z,w].sort(function(x,y){ return x-y; }); return {text:"Which is more common in Earth's crust?", choices:a.map(function(k){ return {v:k,label:nm(k)}; }), tiles:a,
          check:function(v){ var more=el(z)[14]>el(w)[14]?z:w, less=more===z?w:z; return {ok:+v===more, answer:nm(more), right:more,
            why:cap(lc(more))+" makes up about "+ppm(el(more)[14])+" of Earth's crust by mass; "+lc(less)+", about "+ppm(el(less)[14])+"."}; }}; }}
  };
  function makeQ(key){ if(!key) return null; var p=String(key).split(":"), t=QTYPES[p[0]], z=+p[1], par=+p[2];
    if(!t||!(z>=1&&z<=118)||!t.ok(z)||!isFinite(par)) return null;
    try{ var q=t.make(z,par); q.key=key; q.z=z; q.type=p[0]; return q; }catch(e){ return null; } }
  /* a new question about z, from the allowed types; questions that name the
     element in their answer are left out when the screen already names it */
  function newKey(z,r,o){ o=o||{};
    var types=Object.keys(QTYPES).filter(function(k){ return (!o.types||o.types.indexOf(k)>=0)&&!(o.avoidIdent&&QTYPES[k].ident)&&QTYPES[k].ok(z); });
    if(!types.length) return null;
    var t=types[Math.floor(r()*types.length)], par=QTYPES[t].param(z,r);
    return par==null?null:t+":"+z+":"+par; }

  /* ------------------------------------------------------------ challenges
     A challenge is a seed, a length, the question types, and the elements,
     written as a short code a teacher can share: A1.k3j9.10.nqcsb.H-He-C.
     Everyone who opens the same code gets the same questions in the same
     order, with nothing stored or sent anywhere. */
  function challengeParse(code){
    code=String(code||"").trim().replace(/^.*#challenge=/,"").replace(/^.*[?&]challenge=/,"");
    try{ code=decodeURIComponent(code); }catch(e){}
    var m=/^A1\.([0-9a-z]{1,8})\.(\d{1,2})\.([a-z]{1,20})\.([A-Za-z-]{1,600})$/.exec(code); if(!m) return null;
    var types=m[3].split("").filter(function(k,i,a){ return QTYPES[k]&&a.indexOf(k)===i; }), zs=m[4].split("-").map(function(s){ var z=SYM[s]; return z&&el(z)[1]===s?z:0; });
    if(!types.length||zs.indexOf(0)>=0||!zs.length) return null;
    var n=Math.max(1,Math.min(30,+m[2]));
    return {code:"A1."+m[1]+"."+n+"."+types.join("")+"."+zs.map(function(z){ return el(z)[1]; }).join("-"), seed:parseInt(m[1],36), n:n, types:types, zs:zs};
  }
  function challengeMake(zs,n,types,seed){
    seed=seed==null?Math.floor(Math.random()*2e9):seed;
    return "A1."+(seed>>>0).toString(36)+"."+Math.max(1,Math.min(30,n))+"."+types.join("")+"."+zs.map(function(z){ return el(z)[1]; }).join("-");
  }
  function challengeKeys(ch){
    var r=rng(ch.seed^0x9e3779b9), keys=[], guard=0;
    while(keys.length<ch.n&&guard<ch.n*30){ guard++;
      var z=ch.zs[Math.floor(r()*ch.zs.length)], k=newKey(z,r,{types:ch.types});
      if(k&&(keys.indexOf(k)<0||guard>ch.n*20)) keys.push(k); }
    return keys;
  }

  /* ------------------------------------------------------------ sharing */
  /* links point at the website when the page itself isn't on the web (the
     desktop apps), so a link someone sends always opens for the person who gets it */
  var SITE="https://normansrule.github.io/atom/";
  function linkBase(){ try{ if(/^https?:$/.test(location.protocol)) return location.origin+location.pathname; }catch(e){} return SITE; }
  function fromHash(h){
    h=String(h||"").replace(/^#/,"");
    var b=/^build=(\d{1,3})-(\d{1,3})-(\d{1,3})$/.exec(h); if(b) return {build:[Math.min(118,+b[1]),Math.min(200,+b[2]),Math.min(118,+b[3])]};
    var c=/^challenge=(.+)$/.exec(h); if(c&&challengeParse(c[1])) return {challenge:challengeParse(c[1]).code};
    return null;
  }
  function copyText(text,input,done){
    function fallback(){ var ok=false; try{ if(input){ input.focus(); input.select(); } ok=D.execCommand("copy"); }catch(e){ ok=false; } done(ok); }
    try{ if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(text).then(function(){ done(true); },fallback); return; } }catch(e){}
    fallback();
  }
  /* printing: one block of plain, printable HTML, alone on the page. The Mac
     app's web view can't print by itself, so it is asked through the one
     message the app listens for. */
  function printHTML(html){
    var d=D.querySelector("body > .lb-print"); if(!d){ d=D.createElement("div"); d.className="lb-print"; D.body.appendChild(d); }
    d.innerHTML=html; D.documentElement.classList.add("lb-printing");
    function done(){ D.documentElement.classList.remove("lb-printing"); window.removeEventListener("afterprint",done); D.removeEventListener("pointerdown",done,true); D.removeEventListener("keydown",done,true); }
    window.addEventListener("afterprint",done);
    setTimeout(function(){
      try{ var h=window.webkit&&window.webkit.messageHandlers&&window.webkit.messageHandlers.atomPrint; if(h) h.postMessage("print"); else window.print(); }catch(e){ try{ window.print(); }catch(e2){} }
      setTimeout(function(){ D.addEventListener("pointerdown",done,true); D.addEventListener("keydown",done,true); },400);
    },60);
  }

  /* ------------------------------------------------------------ the labs */
  var TABS=[["build","Build"],["predict","Predict"],["calc","Calculate"],["bench","Workbench"],["hear","Hear"],["you","You"]];
  var GOALS=[
    {id:"h",    text:"Make a hydrogen atom",                              test:function(p,n,e){ return p===1&&e===1; }},
    {id:"he4",  text:"Make an alpha particle: helium-4 with no electrons",test:function(p,n,e){ return p===2&&n===2&&e===0; }},
    {id:"c14",  text:"Make carbon-14, the radiocarbon clock",             test:function(p,n){ return p===6&&n===8; }},
    {id:"f",    text:"Make a fluoride ion, F⁻, the one in toothpaste",    test:function(p,n,e){ return p===9&&e===10; }},
    {id:"na",   text:"Make a sodium ion, Na⁺, the one in table salt",     test:function(p,n,e){ return p===11&&e===10; }},
    {id:"fe56", text:"Make iron-56, among the most tightly bound nuclei", test:function(p,n){ return p===26&&n===30; }},
    {id:"u235", text:"Make uranium-235, the fuel of nuclear reactors",    test:function(p,n){ return p===92&&n===143; }},
    {id:"drip", text:"Find the edge: add neutrons to oxygen until one won't stay", test:function(p,n){ return p===8&&n>8&&nuclide(8,8+n).kind==="unbound"; }}
  ];
  var CALCS=[["light","Light from an atom"],["decay","Radioactive decay"],["emc","E = mc²"],["molar","Molar mass"]];
  var RULES={aufbau:"Lowest energy first (the Aufbau principle): fill 1s, 2s, 2p, 3s, 3p, 4s, 3d, 4p, 5s, 4d, 5p, in that order.",
    pauli:"Two to a box, opposite spins (the Pauli exclusion principle). The boxes keep this rule for you.",
    hund:"Spread out before pairing up (Hund's rule): in a subshell, every box gets one electron before any box gets a second."};

  function mount(host,opt){
    opt=opt||{};
    var th=function(){ return opt.theme(); };
    var cur="build", built={}, Z=opt.element?opt.element():1, api={}, COL={};
    function ev(e){ if(opt.onEvent) opt.onEvent(e); }
    /* particle and lab colors are CSS custom properties (--lb-p, --lb-e, ...),
       so the canvases use exactly the colors the buttons and labels use */
    function col(k){ if(!COL[k]) COL[k]=(getComputedStyle(host).getPropertyValue("--lb-"+k)||"").trim()||th().ink2; return COL[k]; }
    host.classList.add("lb");
    host.innerHTML='<div class="lb-tabs" role="tablist" aria-label="Labs">'+TABS.map(function(t,i){
        return '<button type="button" role="tab" id="lbTab-'+t[0]+'" data-lt="'+t[0]+'" aria-controls="lbPane-'+t[0]+'" aria-selected="'+(i?"false":"true")+'" tabindex="'+(i?-1:0)+'">'+t[1]+(t[0]==="you"?' <span class="lb-due" hidden></span>':'')+'</button>'; }).join('')+'</div>'+
      TABS.map(function(t,i){ return '<div class="lb-pane" role="tabpanel" id="lbPane-'+t[0]+'" data-lp="'+t[0]+'" aria-labelledby="lbTab-'+t[0]+'"'+(i?' hidden':'')+'></div>'; }).join('')+
      '<div class="lb-toast" role="status" aria-live="polite"></div>';
    var $=function(s){ return host.querySelector(s); }, pane=function(t){ return host.querySelector('[data-lp="'+t+'"]'); };
    var tabsEl=$(".lb-tabs");
    function show(t){
      if(!pane(t)) return; if(t!=="calc"&&C.listen){ C.listen=false; if(built.calc) calcForm(); } cur=t;
      [].forEach.call(host.querySelectorAll('[role="tab"]'),function(b){ var on=b.getAttribute("data-lt")===t; b.setAttribute("aria-selected",on?"true":"false"); b.tabIndex=on?0:-1; });
      [].forEach.call(host.querySelectorAll(".lb-pane"),function(p){ p.hidden=p.getAttribute("data-lp")!==t; });
      host.setAttribute("data-tab",t);
      if(!built[t]){ built[t]=true; BUILD[t](pane(t)); }
      if(REFRESH[t]) REFRESH[t]();
      dirty=true; ev("lab:"+t);
    }
    tabsEl.addEventListener("click",function(e){ var b=e.target.closest("[data-lt]"); if(b) show(b.getAttribute("data-lt")); });
    tabsEl.addEventListener("keydown",function(e){ var order=TABS.map(function(t){ return t[0]; }), i=order.indexOf(cur), n=null;
      if(e.key==="ArrowRight"||e.key==="ArrowLeft") n=order[(i+(e.key==="ArrowRight"?1:order.length-1))%order.length];
      else if(e.key==="Home") n=order[0]; else if(e.key==="End") n=order[order.length-1];
      if(n){ e.preventDefault(); show(n); $('[data-lt="'+n+'"]').focus(); } });
    var toastT=0;
    /* the toast is always in the page and only its words change, so screen
       readers hear every one */
    function toast(msg){ var t=$(".lb-toast"); t.textContent=msg; clearTimeout(toastT); toastT=setTimeout(function(){ t.textContent=""; },4200); }
    function celebrate(got){ if(got&&got.length){ toast("Badge earned: "+got.map(function(b){ return b.name; }).join(", ")); if(navigator.vibrate) try{ navigator.vibrate(18); }catch(e){} } }
    function refreshDue(){ var n=Progress.stats().due, b=$(".lb-due"); if(b){ b.hidden=!n; b.textContent=n?n+" to review":""; } }
    Progress.on(function(kind){ refreshDue(); if(cur==="you"&&built.you) REFRESH.you(); if(kind==="sync"||kind==="reset"){ if(built.build) readBuild(); } });
    var dirty=true;
    function catC(e){ return opt.catColor?opt.catColor(e[5]):CAT[e[5]][1]; }
    function tile(z,big){ var e=el(z); return '<span class="lb-tile'+(big?' big':'')+'" style="--cat:'+catC(e)+'"><i>'+z+'</i><b>'+e[1]+'</b><span>'+e[2]+'</span></span>'; }
    function shareBlock(link,code,what){
      return '<div class="lb-sharebox"><p class="lb-note">'+what+'</p><div class="lb-linkrow"><input class="lb-input" readonly value="'+esc(link)+'" aria-label="Link to share">'+
        '<button type="button" class="lb-btn go" data-copy>Copy link</button></div>'+(code?'<p class="lb-note">Or have them type this code in Predict: <b class="lb-code">'+esc(code)+'</b></p>':'')+'</div>';
    }
    host.addEventListener("click",function(e){ var c=e.target.closest("[data-copy]"); if(!c) return;
      var box=c.closest(".lb-sharebox"), inp=box&&box.querySelector("input"); if(!inp) return;
      copyText(inp.value,inp,function(ok){ toast(ok?"Link copied.":"Select the link and copy it."); if(!ok){ inp.focus(); inp.select(); } }); });

    /* ======================================================== Build */
    var B={p:1,n:0,e:1,touched:false}, bmode="atom";
    function buildState(){ var p=B.p, n=B.n, e=B.e, a=p+n, q=p-e; return {p:p,n:n,e:e,a:a,q:q,info:nuclide(p,a),cfg:p>=1?ionConfig(p,e):[]}; }
    function drawBuild(now){
      var c=host.querySelector('[data-c="atom"]'); if(!c||!c.offsetParent) return false;
      var f=fit(c), g=f.g, w=f.w, h=f.h, T=th(), s=buildState(), cx=w/2, cy=h/2, R=Math.min(w,h)/2-16;
      g.clearRect(0,0,w,h);
      var shells=shellsFrom(s.cfg), ns=Math.max(1,shells.length), nucR=Math.min(R*0.34,R*0.07*Math.pow(Math.max(1,s.a),1/3)+8);
      var gap=(R-nucR-10)/Math.max(ns,3);
      g.lineWidth=1; shells.forEach(function(cnt,k){ var r=nucR+10+gap*(k+0.7);
        g.strokeStyle=T.ink3; g.globalAlpha=0.45; g.beginPath(); g.arc(cx,cy,r,0,6.2832); g.stroke(); g.globalAlpha=1;
        var spin=opt.calm?0:now/1000*(0.6/(k+1));
        for(var i=0;i<cnt;i++){ var ang=spin+i*6.2832/cnt+k*0.4, x=cx+Math.cos(ang)*r, y=cy+Math.sin(ang)*r;
          g.fillStyle=col("e"); g.beginPath(); g.arc(x,y,Math.max(3,Math.min(6,gap*0.18)),0,6.2832); g.fill(); }
      });
      g.font="500 14px Archivo, sans-serif";
      shells.forEach(function(cnt,k){ if(cnt){ g.fillStyle=T.ink2; label(g,"Shell "+(k+1)+": "+cnt+" electron"+(cnt===1?"":"s"),16,28+k*22,T,"left"); } });
      if(s.a>0&&s.p<=118&&s.n<=200){
        var pk=packNucleus(s.p,s.n), A=pk.A, pos=pk.pos, ord=[], k, sc=0;
        for(k=0;k<A;k++){ ord.push(k); sc=Math.max(sc,Math.hypot(pos[3*k],pos[3*k+1])); }
        sc=sc>0?(nucR-5)/sc:0; ord.sort(function(i,j){ return pos[3*i+2]-pos[3*j+2]; });
        var r=Math.max(3,Math.min(13,(nucR-2)/Math.max(1,Math.pow(A,1/3))*0.95));
        ord.forEach(function(i){ var x=cx+pos[3*i]*sc, y=cy+pos[3*i+1]*sc, pr=pk.kind[i]===1, gr=g.createRadialGradient(x-r*0.35,y-r*0.35,r*0.15,x,y,r);
          gr.addColorStop(0,pr?T.pF[0]:T.nF[0]); gr.addColorStop(1,pr?T.pF[1]:T.nF[1]); g.fillStyle=gr; g.beginPath(); g.arc(x,y,r,0,6.2832); g.fill(); });
      }
      g.fillStyle=T.ink2;
      if(s.p===0&&s.n===0&&s.e===0){ g.font="500 15px Archivo, sans-serif"; label(g,"Add a proton to begin",cx,cy,T); }
      else if(s.p===0&&s.e>0){ label(g,"Electrons need a nucleus with protons to hold them",cx,h-16,T); }
      else if(s.a+s.e<5){ label(g,"Drag a particle onto the atom, or press one below",cx,h-16,T); }
      return !opt.calm&&s.e>0&&s.p>0;
    }
    function ionTitle(s){ var e=el(s.p), nmA=anionName(s.p,s.q); return s.q?(nmA?cap(nmA)+" ion":e[2]+" ion"):e[2]+" atom"; }
    function chargeText(q){ return q>0?"+"+q:(q<0?"−"+(-q):"0, neutral"); }
    /* everything a sighted reader sees updates at once; the one line a screen
       reader hears is written once the clicking stops */
    function readBuild(){
      var P=pane("build"); if(!P) return;
      var s=buildState(), info=s.info, p=s.p;
      [["p",p],["n",s.n],["e",s.e]].forEach(function(x){ var i=$('[data-in="'+x[0]+'"]'); if(i&&D.activeElement!==i) i.value=x[1]; });
      var tw=$(".lb-tilewrap"), h3=$(".lb-idt h3");
      if(p>=1&&p<=118){ var e=el(p), sym=e[1]+(s.q?supNum(chargeStr(s.q)):"");
        tw.innerHTML=tile(p,true); h3.innerHTML=esc(ionTitle(s))+' <span class="lb-sym">'+supNum(s.a)+esc(sym)+'</span>'; }
      else { tw.innerHTML=''; h3.textContent="No element yet"; }
      var cvA=host.querySelector('[data-c="atom"]'); if(cvA) cvA.setAttribute("aria-label",(p>=1?cap(isoName(p,s.a)):"Particles")+": "+p+" proton"+(p===1?"":"s")+", "+s.n+" neutron"+(s.n===1?"":"s")+", "+s.e+" electron"+(s.e===1?"":"s")+". "+info.title+".");
      $(".lb-facts").innerHTML=
        '<div><dt>Mass number</dt><dd>'+s.a+'</dd></div>'+
        '<div><dt>Charge</dt><dd>'+chargeText(s.q)+'</dd></div>'+
        '<div class="lb-tone-'+(info.tone||"none")+'"><dt>Nucleus</dt><dd>'+esc(info.title)+'</dd></div>'+
        '<div><dt>Electrons by shell</dt><dd>'+(s.cfg.length?shellsFrom(s.cfg).join(", "):"none")+'</dd></div>';
      $(".lb-bsay").innerHTML=esc(info.text)+(s.cfg.length?' <span class="lb-cfg">'+(s.q?"The ion's electrons":"Its electrons")+': '+cfgText(s.cfg,true)+'.'+(s.q>0&&s.cfg.length&&p>20&&p<31?" A positive ion gives up its outermost electrons first, so a transition metal loses its 4s electrons before any 3d ones.":"")+'</span>':'')+
        (Math.abs(s.q)>3&&p>0?' <span class="lb-cfg">Real atoms rarely gain or lose more than three electrons.</span>':'');
      var cb=$('[data-b="common"]'); if(cb){ cb.textContent=p>=1&&p<=118?cap(isoWord(p))+" isotope":"Most common isotope"; cb.disabled=!(p>=1&&p<=118); }
      [].forEach.call(P.querySelectorAll('[data-b="card"],[data-b="fall"],[data-b="share"]'),function(b){ b.disabled=!(p>=1&&p<=118); });
      $(".lb-goals").innerHTML='<h3 class="lb-h">Challenges</h3><ul>'+GOALS.map(function(g){ var done=Progress.goal(g.id); return '<li class="'+(done?"done":"")+'"><span class="lb-mark" role="img" aria-label="'+(done?"done":"not yet")+'">'+(done?"✓":"○")+'</span> '+esc(g.text)+'</li>'; }).join('')+'</ul>';
      dirty=true;
    }
    function summary(){ var s=buildState(); return s.p>=1?ionTitle(s)+", "+isoName(s.p,s.a)+": "+s.info.title.toLowerCase()+", charge "+chargeText(s.q)+".":(s.n||s.e?s.n+" neutrons and "+s.e+" electrons, no element.":"Nothing built."); }
    var buildTimer=0;
    function settle(){
      var s=buildState(), got=[];
      $(".lb-sum").textContent=summary();
      if(s.p>=1&&s.p<=118){
        got=got.concat(Progress.mark("built",s.p,{A:s.a,q:s.q,unstable:s.info.kind==="radioactive",unbound:s.info.kind==="unbound"}));
        ev("build:"+s.p+":"+s.a+":"+s.q);
        if(opt.select&&s.p!==Z){ Z=s.p; opt.select(s.p); }
      }
      GOALS.forEach(function(g){ if(g.test(s.p,s.n,s.e)) ev("goal:"+g.id); });
      GOALS.forEach(function(g){ if(!Progress.goal(g.id)&&g.test(s.p,s.n,s.e)){ got=got.concat(Progress.mark("goal",s.p,g.id)); toast("Challenge done: "+g.text.replace(/^Make /,"").replace(/^./,function(c){ return c.toUpperCase(); })); } });
      celebrate(got); readBuild();
    }
    function changed(){ B.touched=true; readBuild(); clearTimeout(buildTimer); buildTimer=setTimeout(settle,500); }
    function setB(k,v){ var max={p:118,n:200,e:118}[k]; B[k]=Math.max(0,Math.min(max,Math.round(+v||0))); changed(); }
    var BUILD={}, REFRESH={};
    BUILD.build=function(P){
      P.innerHTML='<div class="lb-subtabs" role="group" aria-label="What to build"><button type="button" data-bm="atom" aria-pressed="true">An atom</button><button type="button" data-bm="boxes" aria-pressed="false">Orbital boxes</button></div>'+
        '<div data-bmode="atom"><div class="lb-cols"><div class="lb-stagewrap"><canvas class="lb-cv lb-atomcv" data-c="atom" role="img" aria-label="The atom you are building"></canvas>'+
        '<div class="lb-tray" role="group" aria-label="Particles: press one to add it, or drag it onto the atom">'+
          '<button type="button" class="lb-tok p" data-add="p"><b aria-hidden="true">p⁺</b><span>+ proton</span></button>'+
          '<button type="button" class="lb-tok n" data-add="n"><b aria-hidden="true">n</b><span>+ neutron</span></button>'+
          '<button type="button" class="lb-tok e" data-add="e"><b aria-hidden="true">e⁻</b><span>+ electron</span></button></div>'+
          '<div class="lb-goals"></div></div>'+
        '<div class="lb-side"><div class="lb-id"><span class="lb-tilewrap"></span><div class="lb-idt"><h3></h3><p class="lb-sum" role="status"></p></div></div>'+
          '<div class="lb-counters">'+[["p","Protons","decide the element"],["n","Neutrons","decide the isotope"],["e","Electrons","decide the charge"]].map(function(x){
            return '<div class="lb-ctr '+x[0]+'"><label for="lbIn-'+x[0]+'"><b>'+x[1]+'</b><span>'+x[2]+'</span></label><div class="lb-step">'+
              '<button type="button" data-step="'+x[0]+'" data-d="-1" aria-label="One fewer '+x[1].toLowerCase().replace(/s$/,"")+'">−</button>'+
              '<input id="lbIn-'+x[0]+'" type="number" inputmode="numeric" min="0" max="'+(x[0]==="n"?200:118)+'" data-in="'+x[0]+'">'+
              '<button type="button" data-step="'+x[0]+'" data-d="1" aria-label="One more '+x[1].toLowerCase().replace(/s$/,"")+'">+</button></div></div>'; }).join('')+'</div>'+
          '<dl class="lb-facts"></dl><p class="lb-say lb-bsay"></p>'+
          '<div class="lb-row"><button type="button" class="lb-btn" data-b="common">Most common isotope</button><button type="button" class="lb-btn" data-b="neutral">Make it neutral</button>'+
            '<button type="button" class="lb-btn" data-b="card">Open its card</button>'+(opt.fall?'<button type="button" class="lb-btn" data-b="fall">Fall into it</button>':'')+
            '<button type="button" class="lb-btn" data-b="share" aria-expanded="false">Share this atom</button><button type="button" class="lb-btn ghost" data-b="clear">Start over</button></div>'+
          '<div class="lb-bshare" hidden></div>'+
          '</div></div></div>'+
        '<div data-bmode="boxes" hidden></div>';
      P.addEventListener("click",function(e){
        var m=e.target.closest("[data-bm]"); if(m){ setBMode(m.getAttribute("data-bm")); return; }
        var a=e.target.closest("[data-add]"), st=e.target.closest("[data-step]"), b=e.target.closest("[data-b]");
        if(a&&!dragMoved){ setB(a.getAttribute("data-add"),B[a.getAttribute("data-add")]+1); }
        if(st) setB(st.getAttribute("data-step"),B[st.getAttribute("data-step")]+(+st.getAttribute("data-d")));
        if(b&&!b.disabled){ var k=b.getAttribute("data-b");
          if(k==="common"&&B.p>=1){ B.n=commonA(B.p)-B.p; changed(); }
          if(k==="neutral"){ B.e=B.p; changed(); }
          if(k==="clear"){ B.p=0; B.n=0; B.e=0; changed(); }
          if(k==="card"&&B.p>=1&&opt.card) opt.card(B.p);
          if(k==="fall"&&B.p>=1&&opt.fall) opt.fall(B.p);
          if(k==="share"){ var sb=$(".lb-bshare"), open=sb.hidden; sb.hidden=!open; b.setAttribute("aria-expanded",open?"true":"false");
            if(open) sb.innerHTML=shareBlock(linkBase()+"#build="+B.p+"-"+B.n+"-"+B.e,"","Anyone who opens this link gets this same atom in the Build lab: "+summary()); } }
      });
      P.addEventListener("input",function(e){ var i=e.target.closest("[data-in]"); if(i&&i.value!=="") setB(i.getAttribute("data-in"),i.value); });
      P.addEventListener("change",function(e){ var i=e.target.closest("[data-in]"); if(i) setB(i.getAttribute("data-in"),i.value); });
      /* drag a particle from the tray onto the atom: the main button or one
         finger only, and a cancelled touch leaves nothing behind */
      var drag=null, dragMoved=false;
      function endDrag(){ if(drag&&drag.ghost) drag.ghost.remove(); drag=null; setTimeout(function(){ dragMoved=false; },0); }
      P.addEventListener("pointerdown",function(e){ var t=e.target.closest("[data-add]"); if(!t||!e.isPrimary||e.button>0) return; drag={k:t.getAttribute("data-add"),x:e.clientX,y:e.clientY,ghost:null}; dragMoved=false; });
      window.addEventListener("pointermove",function(e){ if(!drag||!e.isPrimary) return;
        if(!drag.ghost&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>6){ dragMoved=true; var gh=D.createElement("div"); gh.className="lb-ghost "+drag.k; gh.setAttribute("aria-hidden","true"); gh.textContent={p:"p⁺",n:"n",e:"e⁻"}[drag.k]; D.body.appendChild(gh); drag.ghost=gh; }
        if(drag.ghost){ drag.ghost.style.left=e.clientX+"px"; drag.ghost.style.top=e.clientY+"px"; } });
      window.addEventListener("pointerup",function(e){ if(!drag||!e.isPrimary) return; var d=drag;
        if(d.ghost){ var cv=P.querySelector('[data-c="atom"]'), c=cv?cv.getBoundingClientRect():null;
          if(c&&e.clientX>=c.left&&e.clientX<=c.right&&e.clientY>=c.top&&e.clientY<=c.bottom) setB(d.k,B[d.k]+1); }
        endDrag(); });
      window.addEventListener("pointercancel",endDrag);
      window.addEventListener("blur",function(){ if(drag) endDrag(); });
      readBuild(); $(".lb-sum").textContent=summary();
    };
    REFRESH.build=function(){ if(bmode==="atom") readBuild(); };
    function setBMode(m){ bmode=m; var P=pane("build");
      [].forEach.call(P.querySelectorAll("[data-bm]"),function(b){ b.setAttribute("aria-pressed",b.getAttribute("data-bm")===m?"true":"false"); });
      [].forEach.call(P.querySelectorAll("[data-bmode]"),function(d){ d.hidden=d.getAttribute("data-bmode")!==m; });
      if(m==="boxes"){ if(!OB.built){ OB.built=true; buildBoxes(P.querySelector('[data-bmode="boxes"]')); } if(B.p>=1&&B.p<=54&&OB.z!==B.p&&!OB.any()) boxTarget(B.p); }
      else readBuild();
      dirty=true; ev("build:mode:"+m);
    }

    /* ======================================================== Orbital boxes */
    var OB={z:8, built:false, occ:{}, any:function(){ for(var k in OB.occ) if(OB.occ[k].some(function(v){ return v>0; })) return true; return false; }};
    function boxRows(z){ var want=configOf(z), last=0;
      want.forEach(function(x){ for(var i=0;i<ORDER.length;i++) if(ORDER[i][0]===x[0]&&ORDER[i][1]===x[1]) last=Math.max(last,i); });
      return ORDER.slice(0,Math.min(11,last+2)); }
    function subName(r){ return r[0]+"spdf"[r[1]]; }
    function boxTarget(z){ OB.z=z; OB.occ={}; boxRows(z).forEach(function(r){ OB.occ[r[0]+","+r[1]]=new Array(2*r[1]+1).fill(0); }); renderBoxes(); }
    function placed(){ var n=0; for(var k in OB.occ) OB.occ[k].forEach(function(v){ n+=v; }); return n; }
    var SPIN=["empty","one electron, spin up","two electrons, opposite spins"];
    function renderBoxes(){
      var P=pane("build").querySelector('[data-bmode="boxes"]'); if(!P||!OB.built) return;
      var rows=boxRows(OB.z).slice().reverse();
      P.querySelector(".lb-board").innerHTML=rows.map(function(r){ var k=r[0]+","+r[1], a=OB.occ[k];
        return '<div class="lb-orow" data-l="'+"spdf"[r[1]]+'"><span class="lb-olab">'+subName(r)+'</span><div class="lb-oboxes" role="group" aria-label="'+subName(r)+' subshell">'+
          a.map(function(v,i){ return '<button type="button" class="lb-box s'+v+'" data-o="'+k+','+i+'" aria-label="'+subName(r)+' box '+(i+1)+': '+SPIN[v]+'"><span aria-hidden="true">'+["","↑","↑↓"][v]+'</span></button>'; }).join('')+'</div></div>'; }).join('');
      P.querySelector(".lb-oid").innerHTML=tile(OB.z,true)+'<div class="lb-idt"><h3>Fill the boxes for '+esc(lc(OB.z))+'</h3><p class="lb-ocount">'+placed()+' of '+OB.z+' electrons placed</p></div>';
    }
    function boxCheck(){
      var z=OB.z, want={}, have={}, tot=placed(), msg=[], hundBad="", firstGap="";
      configOf(z).forEach(function(x){ want[x[0]+","+x[1]]=x[2]; });
      for(var k in OB.occ){ var a=OB.occ[k], n=a.reduce(function(s,v){ return s+v; },0); have[k]=n;
        if(n>0&&n<2*a.length&&a.indexOf(2)>=0&&a.indexOf(0)>=0) hundBad=hundBad||k; }
      var rCount=tot===z, rFill=true;
      Object.keys(Object.assign({},want,have)).forEach(function(k){ if((have[k]||0)!==(want[k]||0)) rFill=false; });
      if(!rFill){ for(var i=0;i<ORDER.length;i++){ var k2=ORDER[i][0]+","+ORDER[i][1]; if((have[k2]||0)<(want[k2]||0)){ firstGap=subName(ORDER[i]); break; } } }
      var rHund=!hundBad, ok=rCount&&rFill&&rHund;
      if(!rCount) msg.push(tot<z?"You have placed "+tot+" electrons; a neutral "+lc(z)+" atom has "+z+".":"You have placed "+tot+" electrons, "+(tot-z)+" more than a neutral "+lc(z)+" atom has.");
      if(rCount&&!rFill) msg.push((firstGap?"The "+firstGap+" subshell should hold more before electrons go higher. ":"Some electrons are in the wrong subshell. ")+(EXCEPT[z]?cap(lc(z))+" is one of the exceptions to the filling order: "+(EXCEPT_WHY[z]||"two of its subshells are very close in energy")+".":""));
      if(!rHund){ var hb=hundBad.split(","); msg.push("In "+hb[0]+"spdf"[+hb[1]]+", one box has a pair while another is still empty. Give each box one electron first.");
        if(rCount&&rFill) msg.push("The counts are right, so only Hund's rule is left."); }
      return {ok:ok, rules:[["Right number of electrons",rCount],["Lowest energy first",rFill],["Spread out before pairing up",rHund]], msg:msg};
    }
    function buildBoxes(P){
      P.innerHTML='<div class="lb-cols boxes"><div class="lb-boardwrap"><div class="lb-board"></div><p class="lb-note">Higher boxes have more energy. Press a box to add an electron: once for one, twice for a pair, three times to empty it.</p></div>'+
        '<div class="lb-side"><div class="lb-id lb-oid"></div>'+
        '<ul class="lb-rules"><li data-r="aufbau">'+esc(RULES.aufbau)+'</li><li data-r="pauli">'+esc(RULES.pauli)+'</li><li data-r="hund">'+esc(RULES.hund)+'</li></ul>'+
        '<div class="lb-row"><button type="button" class="lb-btn go" data-ob="check">Check my boxes</button><button type="button" class="lb-btn" data-ob="show">Show me</button>'+
        '<button type="button" class="lb-btn" data-ob="next">Another element</button><button type="button" class="lb-btn" data-ob="mine">Use the atom I built</button><button type="button" class="lb-btn ghost" data-ob="clear">Clear</button></div>'+
        '<div class="lb-fb lb-ofb" role="status"></div></div></div>';
      P.addEventListener("click",function(e){
        var bx=e.target.closest("[data-o]"), b=e.target.closest("[data-ob]");
        if(bx){ var p=bx.getAttribute("data-o").split(","), k=p[0]+","+p[1], i=+p[2]; OB.occ[k][i]=(OB.occ[k][i]+1)%3;
          var v=OB.occ[k][i]; bx.className="lb-box s"+v; bx.firstChild.textContent=["","↑","↑↓"][v]; bx.setAttribute("aria-label",subName([+p[0],+p[1]])+" box "+(i+1)+": "+SPIN[v]);
          P.querySelector(".lb-ocount").textContent=placed()+" of "+OB.z+" electrons placed"; var fb=P.querySelector(".lb-ofb"); fb.className="lb-fb lb-ofb"; fb.innerHTML=""; }
        if(!b) return; var k2=b.getAttribute("data-ob");
        if(k2==="check"){ var r=boxCheck(), fb2=P.querySelector(".lb-ofb");
          fb2.className="lb-fb lb-ofb "+(r.ok?"ok":"bad");
          fb2.innerHTML='<p class="lb-verdict"><span aria-hidden="true">'+(r.ok?"✓":"✗")+'</span> '+(r.ok?"Right. "+esc(cap(lc(OB.z)))+" is "+esc(configStr(OB.z,true))+".":"Not yet.")+'</p>'+
            '<ul class="lb-rulecheck">'+r.rules.map(function(x){ return '<li class="'+(x[1]?"ok":"bad")+'"><span class="lb-mark" role="img" aria-label="'+(x[1]?"kept":"broken")+'">'+(x[1]?"✓":"✗")+'</span> '+esc(x[0])+'</li>'; }).join('')+'</ul>'+
            r.msg.map(function(m){ return '<p>'+esc(m)+'</p>'; }).join('');
          if(r.ok){ var got=Progress.mark("orbital",OB.z); celebrate(got); ev("orbital:"+OB.z); } }
        if(k2==="show"){ boxTarget(OB.z); configOf(OB.z).forEach(function(x){ var a=OB.occ[x[0]+","+x[1]]; if(!a) return; var m=a.length, c=x[2];
            for(var i=0;i<m;i++) a[i]=c>=m+i+1?2:(c>i?1:0); }); renderBoxes(); }
        if(k2==="clear") boxTarget(OB.z);
        if(k2==="next"){ var nz=OB.z; while(nz===OB.z) nz=1+Math.floor(Math.random()*36); boxTarget(nz); }
        if(k2==="mine"){ if(B.p>=1&&B.p<=54) boxTarget(B.p); else toast("Build an element up to xenon (54) first; past it the boxes get too many to fill by hand."); }
        if(k2!=="check"&&!bx){ var fb3=P.querySelector(".lb-ofb"); fb3.className="lb-fb lb-ofb"; fb3.innerHTML=""; }
      });
      boxTarget(B.p>=1&&B.p<=54?B.p:OB.z);
    }

    /* ======================================================== Predict */
    var Qs={q:null,answered:false,mode:"mix",r:rng((Date.now()^0x5bd1e995)>>>0),streak:0}, CH=null;
    function pickKey(){
      var due=Progress.due(Qs.mode==="this"?Z:0), key=null;
      if(Qs.mode==="review"){ while(due.length&&!makeQ(due[0])){ Progress.forget(due.shift()); } key=due[0]||null; if(!key) Qs.mode="mix"; }
      else if(due.length&&Qs.r()<0.3){ key=due[Math.floor(Qs.r()*due.length)]; if(!makeQ(key)){ Progress.forget(key); key=null; } }
      for(var tries=0;tries<16&&!key;tries++){
        var z=Qs.mode==="this"?Z:(Qs.r()<0.4?Z:(Qs.r()<0.5?Progress.daily().z:1+Math.floor(Qs.r()*(Qs.r()<0.7?56:103))));
        key=newKey(z,Qs.r,{avoidIdent:z===Z});
      }
      return key;
    }
    function nextQuestion(focus){
      var key;
      if(Qs.mode==="challenge"){ if(CH.i>=CH.keys.length) return renderSummary(focus); key=CH.keys[CH.i]; }
      else key=pickKey();
      Qs.q=makeQ(key); Qs.answered=false; renderQ(focus);
    }
    function modesHTML(){ var st=Progress.stats();
      var m=[["mix","Mixed"],["this","About "+nm(Z)],["review","Review"+(st.due?" ("+st.due+")":"")]];
      if(CH) m.push(["challenge","Challenge"]);
      return m.map(function(x){ return '<button type="button" data-qm="'+x[0]+'" aria-pressed="'+(Qs.mode===x[0])+'"'+(x[0]==="review"&&!st.due?' disabled':'')+'>'+esc(x[1])+'</button>'; }).join('')+
        '<span class="lb-score">'+(Qs.mode==="challenge"?"Question "+Math.min(CH.i+1,CH.keys.length)+" of "+CH.keys.length+" · "+CH.results.filter(function(r){ return r.ok; }).length+" right":(Qs.streak?"Streak "+Qs.streak+" · ":"")+st.right+" right so far")+'</span>';
    }
    function renderModes(){ var P=pane("predict"); if(P) P.querySelector(".lb-qmodes").innerHTML=modesHTML(); }
    function renderQ(focus){
      var P=pane("predict"), q=Qs.q; renderModes(); P.querySelector(".lb-qcard").hidden=false; P.querySelector(".lb-qsum").hidden=true;
      if(!q){ P.querySelector(".lb-qtext").textContent="No question fits those choices. Try Mixed."; P.querySelector(".lb-qans").innerHTML=""; P.querySelector(".lb-qvis").innerHTML=""; return; }
      P.querySelector(".lb-qtext").textContent=q.text;
      P.querySelector(".lb-qvis").innerHTML=(q.tiles||[q.z]).map(function(z){ return tile(z,false); }).join('');
      var a=P.querySelector(".lb-qans");
      if(q.choices) a.innerHTML='<div class="lb-choices">'+q.choices.map(function(c){ return '<button type="button" class="lb-choice" data-ch="'+esc(c.v)+'">'+esc(c.label)+'</button>'; }).join('')+'</div>';
      else a.innerHTML='<form class="lb-qform"><input id="lbAns" class="lb-input" aria-label="Your answer" autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="'+(q.input==="numeric"?"numeric":"text")+'" placeholder="'+esc(q.hint||"")+'"><button type="submit" class="lb-btn go">Check</button></form>';
      var fb=P.querySelector(".lb-fb"); fb.innerHTML=''; fb.className="lb-fb";
      P.querySelector(".lb-next").hidden=true;
      if(focus&&cur==="predict"){ var f0=P.querySelector("#lbAns")||P.querySelector("[data-ch]"); if(f0) try{ f0.focus({preventScroll:true}); }catch(e){} }
    }
    function answerQ(v){
      if(Qs.answered||!Qs.q) return; var P=pane("predict"), r=Qs.q.check(v); Qs.answered=true;
      Qs.streak=r.ok?Qs.streak+1:0;
      var got=Progress.answer(Qs.q.key,Qs.q.z,r.ok);
      if(Qs.mode==="challenge"){ CH.results.push({text:Qs.q.text, ok:r.ok, answer:r.answer, given:String(v)}); CH.i++; }
      var fb=P.querySelector(".lb-fb"); fb.className="lb-fb "+(r.ok?"ok":"bad");
      fb.innerHTML='<p class="lb-verdict"><span aria-hidden="true">'+(r.ok?"✓":"✗")+'</span> '+(r.ok?"Right.":"Not quite. The answer is "+esc(r.answer)+".")+'</p><p>'+esc(r.why)+'</p>'+
        (r.ok||Qs.mode==="challenge"?'':'<p class="lb-later">This question will come back in a few minutes, then later in the week.</p>');
      [].forEach.call(P.querySelectorAll("[data-ch]"),function(b){ var cv=b.getAttribute("data-ch"); b.disabled=true;
        if(cv===String(r.right)) b.classList.add("ok"); else if(cv===String(v)) b.classList.add("bad"); });
      var inp=P.querySelector("#lbAns"); if(inp) inp.readOnly=true;
      var nx=P.querySelector(".lb-next"); nx.textContent=Qs.mode==="challenge"&&CH.i>=CH.keys.length?"See my score":"Next question"; nx.hidden=false; nx.focus({preventScroll:true});
      ev(r.ok?"quiz:right":"quiz:wrong");
      if(r.ok&&navigator.vibrate) try{ navigator.vibrate(10); }catch(e){}
      celebrate(got); renderModes();
    }
    function challengeStart(code){
      var ch=challengeParse(code); if(!ch) return false;
      CH={ch:ch, keys:challengeKeys(ch), i:0, results:[]}; Qs.mode="challenge";
      var P=pane("predict"); if(P){ P.querySelector(".lb-maker").hidden=true; var mk=P.querySelector('[data-qx="make"]'); if(mk) mk.setAttribute("aria-expanded","false"); }
      nextQuestion(true); return true;
    }
    function resultsHTML(forPrint){
      var right=CH.results.filter(function(r){ return r.ok; }).length;
      return (forPrint?'<h1>Atom challenge</h1><p>Code '+esc(CH.ch.code)+' · '+esc(new Date().toLocaleDateString())+'</p>':'')+
        '<p class="lb-tscore"><b>'+right+' of '+CH.results.length+'</b> right</p><ol class="lb-results">'+CH.results.map(function(r){
          return '<li class="'+(r.ok?"ok":"bad")+'"><span class="lb-mark" role="img" aria-label="'+(r.ok?"right":"wrong")+'">'+(r.ok?"✓":"✗")+'</span> '+esc(r.text)+(r.ok?'':' <i>The answer: '+esc(r.answer)+'</i>')+'</li>'; }).join('')+'</ol>';
    }
    function renderSummary(focus){
      var P=pane("predict"), right=CH.results.filter(function(r){ return r.ok; }).length, s=P.querySelector(".lb-qsum");
      var got=Progress.mark("challenge",0,{code:CH.ch.code, score:right, n:CH.results.length}); celebrate(got); ev("challenge:done");
      P.querySelector(".lb-qcard").hidden=true; s.hidden=false;
      s.innerHTML='<h3 class="lb-h" tabindex="-1">Challenge finished</h3>'+resultsHTML(false)+
        '<div class="lb-row"><button type="button" class="lb-btn go" data-qx="print">Print my results</button><button type="button" class="lb-btn" data-qx="again">Try it again</button><button type="button" class="lb-btn ghost" data-qx="leave">Back to practice</button></div>';
      renderModes(); if(focus) try{ s.querySelector("h3").focus({preventScroll:true}); }catch(e){}
    }
    function makerHTML(){
      var allTypes=Object.keys(QLABEL);
      return '<h3 class="lb-h">Make a challenge</h3><p class="lb-note">Pick the elements and the kinds of questions. Everyone who opens the link, or types the code, gets the same questions in the same order. Nothing is sent anywhere: the questions are rebuilt from the code itself.</p>'+
        '<label class="lb-field">Elements<input class="lb-input" data-mk="els" value="H He Li C N O Na Fe" autocomplete="off" spellcheck="false" placeholder="Symbols or names, with spaces or commas between them"></label>'+
        '<div class="lb-chips"><button type="button" data-mkf="first20">The first 20</button><button type="button" data-mkf="row2">Lithium to neon</button><button type="button" data-mkf="explored">Ones I have explored</button><button type="button" data-mkf="metals">Metals you use every day</button></div>'+
        '<label class="lb-field">Number of questions<select data-mk="n">'+[5,10,15,20].map(function(n){ return '<option'+(n===10?' selected':'')+'>'+n+'</option>'; }).join('')+'</select></label>'+
        '<fieldset class="lb-types"><legend>Kinds of questions</legend>'+allTypes.map(function(k){ return '<label><input type="checkbox" data-mkt="'+k+'"'+("nqcsbvi".indexOf(k)>=0?' checked':'')+'> '+esc(QLABEL[k])+'</label>'; }).join('')+'</fieldset>'+
        '<div class="lb-row"><button type="button" class="lb-btn go" data-mk="make">Make the challenge</button></div><div class="lb-mkout"></div>'+
        '<form class="lb-codeform"><label class="lb-field">Have a code or a link?<span class="lb-pair"><input class="lb-input" data-mk="code" autocomplete="off" spellcheck="false" autocapitalize="off" placeholder="A1. ..."><button type="submit" class="lb-btn">Start it</button></span></label></form>';
    }
    BUILD.predict=function(P){
      P.innerHTML='<div class="lb-quiz"><div class="lb-qmodes" role="group" aria-label="Which questions"></div>'+
        '<div class="lb-qcard"><div class="lb-qvis"></div><p class="lb-qtext" aria-live="polite"></p><div class="lb-qans"></div><div class="lb-fb" aria-live="polite"></div>'+
        '<button type="button" class="lb-btn go lb-next" hidden>Next question</button></div>'+
        '<div class="lb-qsum" hidden></div>'+
        '<div class="lb-row"><button type="button" class="lb-btn ghost" data-qx="make" aria-expanded="false">Make a challenge, or enter a code</button></div>'+
        '<div class="lb-maker" hidden>'+makerHTML()+'</div>'+
        '<p class="lb-note">Questions you miss come back after ten minutes, then a day later, then less and less often as you keep getting them right. Get three different questions right about one element and you have mastered it.</p></div>';
      P.addEventListener("click",function(e){ var c=e.target.closest("[data-ch]"), m=e.target.closest("[data-qm]"), x=e.target.closest("[data-qx]"), f=e.target.closest("[data-mkf]"), mk=e.target.closest('[data-mk="make"]');
        if(c&&!c.disabled) answerQ(c.getAttribute("data-ch"));
        if(m&&!m.disabled){ var mode=m.getAttribute("data-qm"); if(mode==="challenge"&&!CH) return; Qs.mode=mode; nextQuestion(false); var mb=P.querySelector('[data-qm="'+Qs.mode+'"]'); if(mb) mb.focus(); }
        if(e.target.closest(".lb-next")) nextQuestion(true);
        if(x){ var k=x.getAttribute("data-qx");
          if(k==="make"){ var mkr=P.querySelector(".lb-maker"), open=mkr.hidden; mkr.hidden=!open; x.setAttribute("aria-expanded",open?"true":"false"); if(open){ try{ mkr.scrollIntoView({block:"nearest",behavior:opt.calm?"auto":"smooth"}); }catch(e2){} mkr.querySelector("input").focus({preventScroll:true}); } }
          if(k==="print") printHTML(resultsHTML(true));
          if(k==="again") challengeStart(CH.ch.code);
          if(k==="leave"){ CH=null; Qs.mode="mix"; nextQuestion(true); } }
        if(f){ var which=f.getAttribute("data-mkf"), inp=P.querySelector('[data-mk="els"]'), list=[];
          if(which==="first20") for(var i=1;i<=20;i++) list.push(i);
          if(which==="row2") list=[3,4,5,6,7,8,9,10];
          if(which==="metals") list=[13,22,26,28,29,30,47,50,78,79,82];
          if(which==="explored"){ list=Object.keys(Progress.data().seen).map(Number).sort(function(a,b){ return a-b; }); if(!list.length){ toast("Open a few element cards first."); return; } }
          inp.value=list.map(function(z){ return el(z)[1]; }).join(" "); }
        if(mk){ var raw=P.querySelector('[data-mk="els"]').value.split(/[\s,;]+/).filter(Boolean), zs=[], bad=[];
          raw.forEach(function(s){ var z=nameOnly(s); if(z&&zs.indexOf(z)<0) zs.push(z); else if(!z) bad.push(s); });
          var types=[].map.call(P.querySelectorAll("[data-mkt]:checked"),function(b){ return b.getAttribute("data-mkt"); }), out=P.querySelector(".lb-mkout");
          if(bad.length){ out.innerHTML='<p class="lb-say lb-err">I don\'t know '+esc(bad.join(", "))+'. Use element symbols or names.</p>'; return; }
          if(!zs.length||!types.length){ out.innerHTML='<p class="lb-say lb-err">Pick at least one element and one kind of question.</p>'; return; }
          var code=challengeMake(zs,+P.querySelector('[data-mk="n"]').value,types), ch=challengeParse(code), keys=challengeKeys(ch);
          if(!keys.length){ out.innerHTML='<p class="lb-say lb-err">None of those kinds of questions fit those elements. Add elements or kinds.</p>'; return; }
          out.innerHTML=shareBlock(linkBase()+"#challenge="+code,code,keys.length+" questions about "+zs.length+" element"+(zs.length>1?"s":"")+". Send the link, or read out the code.")+
            '<div class="lb-row"><button type="button" class="lb-btn" data-mk="start" data-code="'+esc(code)+'">Try it here</button></div>'; }
        var st=e.target.closest('[data-mk="start"]'); if(st) challengeStart(st.getAttribute("data-code"));
      });
      P.addEventListener("submit",function(e){ e.preventDefault();
        if(e.target.closest(".lb-codeform")){ var ci=P.querySelector('[data-mk="code"]'); if(!challengeStart(ci.value)){ ci.setAttribute("aria-invalid","true"); toast("That isn't a challenge code Atom can read. Codes start with A1."); } else ci.removeAttribute("aria-invalid"); return; }
        var i=P.querySelector("#lbAns"); if(i&&i.value.trim()) answerQ(i.value); });
      nextQuestion();
    };
    REFRESH.predict=function(){ renderModes(); };

    /* ======================================================== Calculate */
    var C={tab:"light", nu:3, nl:2, cz:1, hl:"6,14", t:5700, tu:"y", n0:100, half:5700*31557600, listen:false, lastFrame:0, mass:1, mu:"g", formula:"C6H12O6"};
    var PRESETS=[];
    for(var pz in NOTABLE) NOTABLE[pz].forEach(function(r){ PRESETS.push({id:pz+","+r[0], label:nm(+pz)+"-"+r[0]+" ("+hlWords(r[1])+")", s:halfLifeSeconds(r[1])}); });
    PRESETS.push({id:"43,99m",label:"Technetium-99m (6.01 hours)",s:6.01*3600},{id:"9,18",label:"Fluorine-18 (109.8 minutes)",s:109.8*60});
    PRESETS=PRESETS.filter(function(p){ return p.s>0; }).sort(function(a,b){ return a.s-b.s; });
    (function(){ var c14=PRESETS.filter(function(p){ return p.id==="6,14"; })[0]; if(c14){ C.half=c14.s; } })();
    var UNITS=[["s",1,"seconds"],["min",60,"minutes"],["h",3600,"hours"],["d",86400,"days"],["y",31557600,"years"],["ky",31557600e3,"thousand years"],["My",31557600e6,"million years"],["Gy",31557600e9,"billion years"]];
    function unitS(u){ for(var i=0;i<UNITS.length;i++) if(UNITS[i][0]===u) return UNITS[i][1]; return 1; }
    function unitW(u){ for(var i=0;i<UNITS.length;i++) if(UNITS[i][0]===u) return UNITS[i][2]; return u; }
    function bestUnit(s){ var u=UNITS[0]; UNITS.forEach(function(x){ if(s>=x[1]*0.999) u=x; }); return u; }
    function unitOptions(sel){ return UNITS.map(function(u){ return '<option value="'+u[0]+'"'+(u[0]===sel?' selected':'')+'>'+u[2]+'</option>'; }).join(''); }
    function lightCalc(){ var L=lineOf(C.cz,C.nu,C.nl), E=L.E, w=L.w;
      /* the series names belong to hydrogen; He+ and Li2+ have their own */
      var series=C.cz===1?(["Lyman","Balmer","Paschen","Brackett","Pfund","Humphreys"][C.nl-1]||""):"";
      return {E:E,w:w,series:series,region:w<VIS0?"ultraviolet":(w<=VIS1?"visible":"infrared")}; }
    function calcState(){ var t=C.t*unitS(C.tu); return {k:t/C.half}; }
    function calcOut(){
      var P=pane("calc"), o=P.querySelector(".lb-cout"), vis=P.querySelector(".lb-cvis"), c;
      vis.innerHTML="";
      if(C.tab==="light"){ c=lightCalc(); ev("calc:line:"+C.cz+":"+C.nu+"-"+C.nl);
        o.innerHTML='<dl class="lb-big"><div><dt>Photon energy</dt><dd>'+fmt(c.E,3)+' eV</dd></div><div><dt>Wavelength</dt><dd>'+fmt(c.w,c.w<100?2:1)+' nm</dd></div><div><dt>Kind of light</dt><dd>'+c.region+'</dd></div></dl>'+
          '<p class="lb-say">'+(c.series?"This line belongs to the "+c.series+" series, the lines that end on level "+C.nl+". ":"")+(c.region==="visible"?"Your eye sees it as "+(c.w<450?"violet":c.w<495?"blue":c.w<570?"green":c.w<590?"yellow":c.w<620?"orange":"red")+".":"Your eye can't see it: it is "+(c.region==="ultraviolet"?"beyond violet.":"beyond red."))+
          ' E = 13.6 eV × Z² × (1/'+C.nl+'² − 1/'+C.nu+'²), then λ = hc / E.</p>'; }
      else if(C.tab==="decay"){ var k=calcState().k, rem=C.n0*Math.pow(0.5,k), bu=bestUnit(C.half);
        ev("calc:decay:half:"+Math.floor(k+1e-6));
        o.innerHTML='<dl class="lb-big"><div><dt>Left after '+fmt(C.t,C.t<10?2:0)+' '+unitW(C.tu)+'</dt><dd>'+sci(rem,4)+'</dd></div><div><dt>Fraction left</dt><dd>'+(rem/C.n0*100<0.01?sci(rem/C.n0*100,3):fmt(rem/C.n0*100,2))+'%</dd></div><div><dt>Half-lives passed</dt><dd>'+fmt(k,2)+'</dd></div></dl>'+
          '<p class="lb-say">Every half-life, half of what is left decays: N = N₀ × ½<sup>t / t½</sup>. With a half-life of '+sci(C.half/bu[1],3)+' '+bu[2]+', no single atom knows when it will go; only the crowd is predictable.</p>'; }
      else if(C.tab==="emc"){ var kg=C.mass*{u:1.66053906892e-27,mg:1e-6,g:1e-3,kg:1,t:1000}[C.mu], E=kg*299792458*299792458;
        o.innerHTML='<dl class="lb-big"><div><dt>Energy</dt><dd>'+sci(E,3)+' J</dd></div><div><dt>In electricity</dt><dd>'+sci(E/3.6e6,3)+' kWh</dd></div><div><dt>As TNT</dt><dd>'+sci(E/4.184e9,3)+' tons</dd></div></dl>'+
          '<p class="lb-say">That is enough to power a typical U.S. home, which uses roughly 10,500 kWh of electricity a year, for '+sci(E/3.6e6/10500,3)+' years. But only matter meeting antimatter turns all of its mass into energy.</p>';
        vis.innerHTML='<h3 class="lb-h">How much of the fuel\'s mass each reaction turns into energy</h3><ul class="lb-bars">'+[["Matter meets antimatter",1],["Hydrogen fusing to helium in the Sun",0.0071],["Deuterium and tritium fusing",0.00375],["Uranium-235 splitting",0.00091],["Burning gasoline",5.1e-10]].map(function(x){
            var wv=Math.max(2,100+Math.log10(x[1])*10); return '<li><span>'+x[0]+'</span><i style="--w:'+wv.toFixed(1)+'%"></i><b>'+(x[1]>=0.001?fmt(x[1]*100,x[1]>=0.01?1:3):sci(x[1]*100,2))+'%</b></li>'; }).join('')+'</ul><p class="lb-note">Bars use a logarithmic scale: each step is ten times smaller.</p>'; }
      else if(C.tab==="molar"){
        try{ var counts=parseFormula(C.formula), tot=0, rows=[];
          ev("calc:molar:"+hill(counts));
          for(var s in counts){ var zz=SYM[s], m=el(zz)[3]*counts[s]; tot+=m; rows.push([zz,counts[s],m]); }
          rows.sort(function(a,b){ return b[2]-a[2]; });
          o.innerHTML='<dl class="lb-big"><div><dt>Molar mass</dt><dd>'+fmt(tot,tot<100?3:2)+' g/mol</dd></div><div><dt>Atoms in one unit</dt><dd>'+rows.reduce(function(a,r){ return a+r[1]; },0)+'</dd></div></dl>'+
            '<p class="lb-say">One mole of it, 6.022 × 10²³ units, weighs '+fmt(tot,2)+' grams. Each element\'s share of the mass is its atomic mass times how many of its atoms there are.</p>';
          vis.innerHTML='<h3 class="lb-h">Where the mass is</h3><div class="lb-stack" role="img" aria-label="'+esc(rows.map(function(r){ return nm(r[0])+" "+fmt(r[2]/tot*100,1)+" percent"; }).join(", "))+'">'+
            rows.map(function(r){ return '<i style="flex-basis:'+(r[2]/tot*100).toFixed(2)+'%;--cat:'+catC(el(r[0]))+'"></i>'; }).join('')+'</div>'+
            '<ul class="lb-comp">'+rows.map(function(r){ var e=el(r[0]); return '<li><button type="button" data-pick="'+r[0]+'" style="--cat:'+catC(e)+'"><b>'+e[1]+'</b><span>'+e[2]+' × '+r[1]+'</span><i style="--w:'+(r[2]/tot*100).toFixed(1)+'%"></i><em>'+fmt(r[2]/tot*100,1)+'% of the mass</em></button></li>'; }).join('')+'</ul><p class="lb-note">Pick an element to open its card.</p>';
        }catch(err){ o.innerHTML='<p class="lb-say lb-err">'+esc(err.message)+'</p>'; }
      }
      dirty=true;
    }
    /* a preset isotope starts the clock at one half-life */
    function setPreset(id){ var p=PRESETS.filter(function(x){ return x.id===id; })[0]; if(!p) return;
      C.hl=id; C.half=p.s; var u=bestUnit(p.s); C.t=+(p.s/u[1]).toPrecision(4); C.tu=u[0]; calcForm(); ev("calc:decay:"+id); }
    function calcForm(){
      var P=pane("calc"), f=P.querySelector(".lb-cform"), hu=bestUnit(C.half);
      if(C.tab==="light") f.innerHTML='<label>Atom<select data-cv="cz">'+[1,2,3].map(function(z){ return '<option value="'+z+'"'+(C.cz===z?' selected':'')+'>'+cap(HY[z].n)+'</option>'; }).join('')+'</select></label>'+
        '<label>Electron falls from level<input type="number" min="2" max="9" data-cv="nu" value="'+C.nu+'"></label><label>down to level<input type="number" min="1" max="8" data-cv="nl" value="'+C.nl+'"></label>'+
        '<div class="lb-chips">'+[[3,2,"Hydrogen-alpha (red)"],[4,2,"Hydrogen-beta"],[2,1,"Lyman-alpha (ultraviolet)"],[4,3,"Paschen-alpha (infrared)"]].map(function(x){ return '<button type="button" data-lpre="'+x[0]+','+x[1]+'">'+x[2]+'</button>'; }).join('')+'</div>'+
        '<button type="button" class="lb-btn" data-tone="1">Hear this line</button>';
      else if(C.tab==="decay") f.innerHTML='<label>Isotope<select data-cv="preset"><option value="">Your own half-life</option>'+PRESETS.map(function(p){ return '<option value="'+p.id+'"'+(C.hl===p.id?' selected':'')+'>'+esc(p.label)+'</option>'; }).join('')+'</select></label>'+
        '<label>Starting amount<input type="number" min="0" step="any" data-cv="n0" value="'+plain(C.n0)+'"></label>'+
        '<label>Half-life<span class="lb-pair"><input type="number" min="0" step="any" data-cv="hv" value="'+plain(C.half/hu[1])+'"><select data-cv="hu" aria-label="Half-life unit">'+unitOptions(hu[0])+'</select></span></label>'+
        '<label>Time passed<span class="lb-pair"><input type="number" min="0" step="any" data-cv="t" value="'+plain(C.t)+'"><select data-cv="tu" aria-label="Time unit">'+unitOptions(C.tu)+'</select></span></label>'+
        '<label>Or slide through time<input type="range" min="0" max="500" data-cv="slide" value="'+Math.round(Math.min(500,C.t*unitS(C.tu)/C.half*100))+'"></label>'+
        '<button type="button" class="lb-btn" data-listen aria-pressed="'+C.listen+'">'+(C.listen?"Stop the counter":"Listen like a Geiger counter")+'</button>';
      else if(C.tab==="emc") f.innerHTML='<label>Mass<span class="lb-pair"><input type="number" min="0" step="any" data-cv="mass" value="'+plain(C.mass)+'"><select data-cv="mu" aria-label="Mass unit">'+[["u","atomic mass units"],["mg","milligrams"],["g","grams"],["kg","kilograms"],["t","tonnes"]].map(function(u){ return '<option value="'+u[0]+'"'+(u[0]===C.mu?' selected':'')+'>'+u[1]+'</option>'; }).join('')+'</select></span></label>'+
        '<div class="lb-chips">'+[[1,"g","A paper clip, about 1 g"],[0.5,"g","A raisin"],[4.3e9,"kg","What the Sun turns to light each second"],[1,"u","One atomic mass unit"]].map(function(x){ return '<button type="button" data-em="'+x[0]+','+x[1]+'">'+x[2]+'</button>'; }).join('')+'</div>';
      else f.innerHTML='<label>Type a chemical formula<input class="lb-input" data-cv="formula" value="'+esc(C.formula)+'" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="For example H2O or Ca(OH)2"></label>'+
        '<div class="lb-chips">'+["H2O","CO2","NaCl","C6H12O6","CaCO3","Fe2O3","C8H10N4O2","CuSO4·5H2O"].map(function(x){ return '<button type="button" data-fm="'+x+'">'+x.replace(/([A-Za-z)])(\d+)/g,"$1<sub>$2</sub>")+'</button>'; }).join('')+'</div>';
    }
    function drawCalc(now){
      var c=host.querySelector('[data-c="calc"]'); if(!c||!c.offsetParent) return false;
      var f=fit(c), g=f.g, w=f.w, h=f.h, T=th(); g.clearRect(0,0,w,h); g.font="500 14px Archivo, sans-serif";
      if(C.tab==="light"){
        var c0=lightCalc(), top=24, bot=h-36, lv=function(n){ var E=-13.6*C.cz*C.cz/(n*n), Emin=-13.6*C.cz*C.cz; return top+(bot-top)*(E/Emin); };
        for(var n=1;n<=7;n++){ var y=lv(n); g.strokeStyle=(n===C.nu||n===C.nl)?T.ink:T.ink3; g.lineWidth=(n===C.nu||n===C.nl)?2:1; g.beginPath(); g.moveTo(80,y); g.lineTo(w*0.62,y); g.stroke();
          if(n<=4||n===C.nu||n===C.nl){ g.fillStyle=T.ink2; label(g,"n = "+n,40,y+5,T); } }
        var x=w*0.38, y1=lv(C.nu), y2=lv(C.nl), lineCol=c0.region==="visible"?wlRGB(c0.w):T.ink2;
        g.strokeStyle=lineCol; g.fillStyle=lineCol; g.lineWidth=3; g.beginPath(); g.moveTo(x,y1); g.lineTo(x,y2-8); g.stroke(); g.beginPath(); g.moveTo(x-7,y2-12); g.lineTo(x+7,y2-12); g.lineTo(x,y2-1); g.fill();
        var sx=w*0.68, sw=w-sx-16, sy=top, sh=bot-top, span=VIS1-VIS0;
        g.fillStyle=T.light?"#fff":"#000"; g.fillRect(sx,sy,sw,sh);
        for(var i=0;i<sh;i++){ var wl=VIS0+span*i/sh; g.globalAlpha=0.18; g.fillStyle=wlRGB(wl); g.fillRect(sx,sy+i,sw,1); } g.globalAlpha=1;
        if(c0.region==="visible"){ var ly=sy+sh*(c0.w-VIS0)/span; g.fillStyle=wlRGB(c0.w); g.fillRect(sx,ly-2,sw,4); }
        g.fillStyle=T.ink2; label(g,VIS0+" nm",sx+sw/2,sy-6,T); label(g,VIS1+" nm",sx+sw/2,sy+sh+18,T);
        if(c0.region!=="visible"){ g.fillStyle=T.ink; label(g,c0.w<VIS0?"beyond violet":"beyond red",sx+sw/2,c0.w<VIS0?sy+16:sy+sh-6,T); }
        return false;
      }
      if(C.tab==="decay"){
        var k=calcState().k, kmax=Math.max(5,Math.ceil(k)), pl=46, pr=14, pt=16, pb=34, W=w-pl-pr, H=(h-pt-pb)*0.48;
        g.strokeStyle=T.ink3; g.lineWidth=1; g.beginPath(); g.moveTo(pl,pt); g.lineTo(pl,pt+H); g.lineTo(pl+W,pt+H); g.stroke();
        g.beginPath(); for(var j=0;j<=200;j++){ var xx=pl+W*j/200, yy=pt+H*(1-Math.pow(0.5,kmax*j/200)); if(j) g.lineTo(xx,yy); else g.moveTo(xx,yy); } g.strokeStyle=col("calc"); g.lineWidth=2.5; g.stroke();
        var mx=pl+W*Math.min(1,k/kmax), my=pt+H*(1-Math.pow(0.5,Math.min(k,kmax)));
        g.setLineDash([4,4]); g.strokeStyle=T.ink2; g.lineWidth=1; g.beginPath(); g.moveTo(mx,pt+H); g.lineTo(mx,my); g.lineTo(pl,my); g.stroke(); g.setLineDash([]);
        g.fillStyle=T.ink; g.beginPath(); g.arc(mx,my,5,0,6.2832); g.fill();
        g.fillStyle=T.ink2; label(g,"100%",pl-22,pt+10,T); label(g,"0",pl-10,pt+H,T);
        for(var hh=1;hh<=kmax;hh++){ if(kmax<=10||hh%2===0) label(g,String(hh),pl+W*hh/kmax,pt+H+18,T); }
        label(g,"half-lives",pl+W-34,pt+H+32,T);
        /* 400 atoms, each with its own random moment to decay */
        var cols=40, rows=10, cs=Math.min(W/cols,(h-pt-H-pb-30)/rows), ox=pl, oy=pt+H+44, rr=rng(7), live=0;
        for(var a=0;a<cols*rows;a++){ var td=-Math.log(1-rr())/Math.LN2, gone=td<k; if(!gone) live++;
          g.fillStyle=gone?T.ink3:col("calc"); g.globalAlpha=gone?0.35:1; g.beginPath(); g.arc(ox+(a%cols+0.5)*cs,oy+(Math.floor(a/cols)+0.5)*cs,cs*0.32,0,6.2832); g.fill(); }
        g.globalAlpha=1;
        /* the counter clicks at a rate set by how many atoms are left, measured
           in real time so a faster screen doesn't click faster */
        if(C.listen){ var dt=C.lastFrame?Math.min(100,now-C.lastFrame):16; C.lastFrame=now; var rate=Math.min(30,0.5+22*live/400); if(Math.random()<rate*dt/1000) Sound.click(); return true; }
        C.lastFrame=0; return false;
      }
      return false;
    }
    BUILD.calc=function(P){
      P.innerHTML='<div class="lb-subtabs" role="group" aria-label="Calculator">'+CALCS.map(function(c){ return '<button type="button" data-ct="'+c[0]+'" aria-pressed="'+(C.tab===c[0])+'">'+c[1]+'</button>'; }).join('')+'</div>'+
        '<div class="lb-cols calc"><div class="lb-cside"><form class="lb-cform"></form><div class="lb-cout" aria-live="polite"></div></div>'+
        '<div class="lb-cright"><div class="lb-stagewrap"><canvas class="lb-cv" data-c="calc" role="img" aria-label="A drawing of the calculation"></canvas></div><div class="lb-cvis"></div></div></div>';
      P.querySelector(".lb-cform").addEventListener("submit",function(e){ e.preventDefault(); });
      function setTab(t){ C.tab=t; [].forEach.call(P.querySelectorAll("[data-ct]"),function(b){ b.setAttribute("aria-pressed",b.getAttribute("data-ct")===t?"true":"false"); });
        P.setAttribute("data-calc",t); calcForm(); calcOut(); Progress.mark("calc",0,t); ev("calc:"+t); if(t==="decay"&&C.hl) ev("calc:decay:"+C.hl); }
      P.addEventListener("click",function(e){ var t=e.target.closest("[data-ct]"), lp=e.target.closest("[data-lpre]"), em=e.target.closest("[data-em]"), fm=e.target.closest("[data-fm]"), pk=e.target.closest("[data-pick]");
        if(t) setTab(t.getAttribute("data-ct"));
        if(lp){ var v=lp.getAttribute("data-lpre").split(","); C.nu=+v[0]; C.nl=+v[1]; C.cz=1; calcForm(); calcOut(); }
        if(em){ var m=em.getAttribute("data-em").split(","); C.mass=+m[0]; C.mu=m[1]; calcForm(); calcOut(); }
        if(fm){ C.formula=fm.getAttribute("data-fm"); calcForm(); calcOut(); }
        if(pk){ Z=+pk.getAttribute("data-pick"); if(opt.card) opt.card(Z); else if(opt.select) opt.select(Z); }
        if(e.target.closest("[data-tone]")){ var c0=lightCalc(); if(c0.w>=250&&c0.w<=1500){ Sound.tone(lightHz(c0.w),Sound.now()+0.02,1.2,0.3); toast("A tone 40 octaves below this light: "+fmt(lightHz(c0.w),0)+" Hz."); } else toast("This line is far outside visible light, so its tone would be out of hearing range."); }
        if(e.target.closest("[data-listen]")){ C.listen=!C.listen; if(C.listen) Sound.now(); calcForm(); dirty=true; var lb=P.querySelector("[data-listen]"); if(lb) lb.focus(); ev("calc:listen"); }
      });
      P.addEventListener("input",function(e){ var i=e.target.closest("[data-cv]"); if(!i) return; var k=i.getAttribute("data-cv"), v=i.value;
        if(k==="cz") C.cz=+v; if(k==="nu") C.nu=Math.max(2,Math.min(9,Math.round(+v||2))); if(k==="nl") C.nl=Math.max(1,Math.min(8,Math.round(+v||1)));
        if(C.nl>=C.nu){ if(k==="nl") C.nu=C.nl+1; else C.nl=Math.max(1,C.nu-1); }
        if(k==="preset"&&v) setPreset(v);
        if(k==="n0") C.n0=Math.max(0,+v||0);
        if(k==="hv"){ C.half=Math.max(1e-6,(+v||1)*unitS(P.querySelector('[data-cv="hu"]').value)); C.hl=""; }
        if(k==="hu"){ C.half=Math.max(1e-6,(+P.querySelector('[data-cv="hv"]').value||1)*unitS(v)); C.hl=""; }
        if(k==="t") C.t=Math.max(0,+v||0); if(k==="tu") C.tu=v;
        if(k==="slide"){ var secs=+v/100*C.half, u2=bestUnit(C.half); C.tu=u2[0]; C.t=+(secs/u2[1]).toPrecision(4); var ti=P.querySelector('[data-cv="t"]'), tu=P.querySelector('[data-cv="tu"]'); if(ti) ti.value=plain(C.t); if(tu) tu.value=C.tu; }
        if(k==="mass") C.mass=Math.max(0,+v||0); if(k==="mu") C.mu=v; if(k==="formula") C.formula=v;
        if(k==="nu"||k==="nl"){ var a=P.querySelector('[data-cv="nu"]'), b=P.querySelector('[data-cv="nl"]'); if(a&&D.activeElement!==a) a.value=C.nu; if(b&&D.activeElement!==b) b.value=C.nl; }
        calcOut(); });
      setTab(C.tab);
    };

    /* ======================================================== Workbench */
    var sims=null;
    BUILD.bench=function(P){
      if(typeof AtomSims==="undefined"){ P.innerHTML='<p class="lb-say">The workbench is not available here.</p>'; return; }
      P.innerHTML='<p class="lb-note">Three experiments with the physics running live: fuse two nuclei, bond two protons with one electron, or build a battery from its electrodes.</p><div class="lb-sims"></div>';
      sims=AtomSims.mount(P.querySelector(".lb-sims"),{calm:opt.calm, theme:opt.simTheme||opt.theme, onEvent:opt.onEvent, pick:function(z){ if(opt.card) opt.card(z); }});
    };

    /* ======================================================== Hear */
    var H={z:0, chosen:false, playing:[], until:0, guess:null, right:0, tries:0};
    function lineEls(){ var out=[1]; for(var k in LINES) if(out.indexOf(+k)<0) out.push(+k); return out.sort(function(a,b){ return a-b; }); }
    function visLines(z){ var L=PTable.lineList(z); return L?L.lines.filter(function(p){ return p[0]>=VIS0&&p[0]<=VIS1; }).sort(function(a,b){ return b[0]-a[0]; }):[]; }
    function chord(z){
      var lines=visLines(z); if(!lines.length) return 0;
      var mx=Math.max.apply(null,lines.map(function(p){ return p[1]; })), t0=Sound.now()+0.05, nowMs=performance.now();
      H.playing=[];
      lines.forEach(function(p,i){ var gain=0.08+0.22*Math.sqrt(p[1]/mx), at=t0+i*0.22; Sound.tone(lightHz(p[0]),at,0.6,gain); H.playing.push({w:p[0],t:nowMs+i*220,d:600}); });
      var tc=t0+lines.length*0.22+0.2; lines.forEach(function(p){ Sound.tone(lightHz(p[0]),tc,2.2,0.05+0.12*Math.sqrt(p[1]/mx)); H.playing.push({w:p[0],t:nowMs+(tc-t0)*1000,d:2200}); });
      H.until=nowMs+(tc-t0)*1000+2300; dirty=true; return lines.length;
    }
    function playLight(z){
      if(!PTable.lineList(z)){ toast("Atom has no measured spectrum for "+lc(z)+" yet."); return; }
      H.z=z; var n=chord(z); if(!n){ toast(cap(lc(z))+"'s strongest lines are outside visible light."); return; }
      var got=Progress.mark("heard",z); celebrate(got); ev("hear:"+z);
      var say=pane("hear").querySelector(".lb-hsay"); if(say) say.textContent=cap(lc(z))+": "+n+" visible line"+(n>1?"s":"")+", played from red to violet, then all together.";
    }
    function playShells(z){
      var c=fillOrder(configOf(z)), t=Sound.now()+0.05, scale=[0,2,4,7,9,12,14,16,19,21,24,26,28,31,33,36,38,40,43], nowMs=performance.now();
      H.z=z; H.playing=[];
      c.forEach(function(sub,si){ for(var k=0;k<sub[2];k++){ Sound.tone(196*Math.pow(2,scale[Math.min(si,scale.length-1)]/12),t,0.18,0.18,"triangle"); t+=0.09; } t+=0.18; });
      H.until=nowMs+(t-Sound.now())*1000; dirty=true;
      var say=pane("hear").querySelector(".lb-hsay"); if(say) say.textContent=cap(lc(z))+"'s "+z+" electron"+(z>1?"s":"")+", one note each, in the order they fill: "+c.map(function(x){ return x[0]+"spdf"[x[1]]+x[2]; }).join(" ")+". Each new subshell plays a step higher; the pauses are where one subshell ends.";
      ev("hear:shells:"+z);
    }
    /* name it by ear: a mystery element's chord, four names to choose from */
    function guessNew(){
      var pool=lineEls().filter(function(z){ return visLines(z).length>=2; }), z=pool[Math.floor(Math.random()*pool.length)], opts=[z];
      while(opts.length<4){ var o=pool[Math.floor(Math.random()*pool.length)]; if(opts.indexOf(o)<0) opts.push(o); }
      opts.sort(function(a,b){ return a-b; }); H.guess={z:z, opts:opts, done:false}; H.z=0;
      renderGuess(); chord(z); ev("hear:guess");
    }
    function renderGuess(){
      var P=pane("hear"), g=P.querySelector(".lb-guess"), G=H.guess;
      if(!G){ g.innerHTML=''; return; }
      g.innerHTML='<p class="lb-qtext">Which element made that light?</p><div class="lb-choices">'+G.opts.map(function(z){ return '<button type="button" class="lb-choice" data-gz="'+z+'"'+(G.done?' disabled':'')+'>'+esc(nm(z))+'</button>'; }).join('')+'</div>'+
        '<div class="lb-row"><button type="button" class="lb-btn" data-hp="replay"'+(G.done?' hidden':'')+'>Play it again</button>'+(G.done?'<button type="button" class="lb-btn go" data-hp="guess">Another one</button>':'')+'<span class="lb-score">'+H.right+' of '+H.tries+' by ear</span></div>';
    }
    function drawHear(now){
      var c=host.querySelector('[data-c="hear"]'); if(!c||!c.offsetParent) return false;
      var f=fit(c), g=f.g, w=f.w, h=f.h, T=th(), G=H.guess, hidden=G&&!G.done, z=G?G.z:(H.z||Z), L=PTable.lineList(z); g.clearRect(0,0,w,h);
      var x0=16, x1=w-16, y0=26, y1=h-36, span=VIS1-VIS0;
      g.fillStyle=T.light?"#fff":"#000"; g.fillRect(x0,y0,x1-x0,y1-y0);
      if(L&&!hidden) L.lines.forEach(function(p){ if(p[0]<VIS0||p[0]>VIS1) return; var x=x0+(x1-x0)*(p[0]-VIS0)/span, hot=0;
        H.playing.forEach(function(q){ if(Math.abs(q.w-p[0])<0.01&&now>=q.t&&now<=q.t+q.d) hot=1-(now-q.t)/q.d; });
        g.globalAlpha=Math.min(1,0.45+0.55*Math.min(1,p[1])+hot*0.4); g.fillStyle=T.light?"#111":wlRGB(p[0]); g.fillRect(x-1.5-hot*3,y0,3+hot*6,y1-y0); g.globalAlpha=1; });
      g.fillStyle=T.ink2; g.font="500 14px Archivo, sans-serif"; label(g,VIS0+" nm violet",x0+48,y1+22,T); label(g,"red "+VIS1+" nm",x1-44,y1+22,T);
      g.fillStyle=T.ink; label(g,hidden?"A mystery element: listen, then guess":(L?nm(z)+(L.computed?" (computed)":" (measured)"):"No spectrum for "+nm(z)),(x0+x1)/2,y0-8,T);
      return now<H.until;
    }
    BUILD.hear=function(P){
      P.innerHTML='<p class="lb-note">Sound plays only when you press a button. Each line in an element\'s light becomes a tone exactly 40 octaves below the light itself, so redder light plays lower, violet light higher, and every element has its own chord with the light\'s real proportions.</p>'+
        '<div class="lb-stagewrap hear"><canvas class="lb-cv" data-c="hear" role="img" aria-label="The element\'s visible spectrum"></canvas></div>'+
        '<div class="lb-row"><button type="button" class="lb-btn go" data-hp="light"><span>Play <span class="lb-hname"></span>’s light</span></button><button type="button" class="lb-btn" data-hp="shells">Play its electrons filling in</button>'+
        '<button type="button" class="lb-btn" data-hp="guess">Guess by ear</button><button type="button" class="lb-btn ghost" data-hp="stop">Stop</button>'+
        '<label class="lb-vol">Volume<input type="range" min="0" max="100" value="50" data-vol></label></div>'+
        '<div class="lb-guess" aria-live="polite"></div><p class="lb-say lb-hsay" aria-live="polite"></p>'+
        '<h3 class="lb-h">Elements with measured light</h3><div class="lb-chips lb-hchips">'+lineEls().map(function(z){ return '<button type="button" data-hz="'+z+'">'+el(z)[1]+' <span>'+nm(z)+'</span></button>'; }).join('')+'</div>'+
        (Sound.ok()?'':'<p class="lb-say lb-err">This browser can\'t play sound.</p>');
      P.addEventListener("click",function(e){ var p=e.target.closest("[data-hp]"), hz=e.target.closest("[data-hz]"), gz=e.target.closest("[data-gz]");
        if(hz){ H.guess=null; renderGuess(); H.z=+hz.getAttribute("data-hz"); H.chosen=true; REFRESH.hear(); playLight(H.z); }
        if(gz&&H.guess&&!H.guess.done){ var G=H.guess, pick=+gz.getAttribute("data-gz"), ok=pick===G.z; G.done=true; H.tries++; if(ok) H.right++;
          renderGuess(); [].forEach.call(P.querySelectorAll("[data-gz]"),function(b){ var v=+b.getAttribute("data-gz"); if(v===G.z) b.classList.add("ok"); else if(v===pick) b.classList.add("bad"); });
          var say=P.querySelector(".lb-hsay"); say.textContent=(ok?"Right: ":"It was ")+lc(G.z)+(ok?".":", not "+lc(pick)+".")+" Its strongest visible lines are "+visLines(G.z).slice().sort(function(a,b){ return b[1]-a[1]; }).slice(0,3).map(function(x){ return fmt(x[0],0)+" nm"; }).join(", ")+".";
          if(ok){ var got=Progress.mark("ear",G.z); celebrate(got); } Progress.mark("heard",G.z); ev("hear:guess:"+(ok?"right":"wrong")); dirty=true;
          var nx=P.querySelector('[data-hp="guess"].go'); if(nx) nx.focus(); }
        if(p){ var k=p.getAttribute("data-hp"), z=H.z||Z;
          if(k==="light"){ H.guess=null; renderGuess(); playLight(z); }
          if(k==="shells"){ H.guess=null; renderGuess(); playShells(z); }
          if(k==="guess") guessNew();
          if(k==="replay"&&H.guess) chord(H.guess.z);
          if(k==="stop"){ Sound.stop(); H.until=0; H.playing=[]; } } });
      P.addEventListener("input",function(e){ if(e.target.matches("[data-vol]")) Sound.setVol(+e.target.value/100); });
    };
    REFRESH.hear=function(){ var P=pane("hear"), z=H.z||Z, n=P.querySelector(".lb-hname"); if(n) n.textContent=nm(z); dirty=true; };

    /* ======================================================== You */
    var askReset=false;
    function progressHTML(){
      var s=Progress.stats(), Pd=Progress.data(), names=function(o){ return Object.keys(o).map(Number).sort(function(a,b){ return a-b; }).map(function(z){ return nm(z); }).join(", ")||"none yet"; };
      var ch=Object.keys(Pd.challenges).map(function(k){ var c=Pd.challenges[k]; return '<li>'+esc(k)+': best '+c.score+' of '+c.n+'</li>'; }).join('');
      return '<h1>Atom: my progress</h1><p>'+esc(new Date().toLocaleDateString())+'</p>'+
        '<ul><li>Elements explored: '+s.seen+' of 118</li><li>Elements built: '+s.built+'</li><li>Elements mastered: '+s.mastered+'</li><li>Orbital boxes filled: '+s.orbitals+'</li>'+
        '<li>Right answers: '+s.right+' (best streak '+s.best+')</li><li>Days explored: '+s.days+' (current streak '+s.streak+')</li></ul>'+
        '<h2>Mastered</h2><p>'+esc(names(Pd.mastered))+'</p><h2>Built</h2><p>'+esc(names(Pd.built))+'</p>'+
        '<h2>Badges</h2><ul>'+Progress.badges.filter(function(b){ return Progress.has(b.id); }).map(function(b){ return '<li>'+esc(b.name)+': '+esc(b.desc)+'</li>'; }).join('')+'</ul>'+
        (ch?'<h2>Challenges</h2><ul>'+ch+'</ul>':'')+'<p>Kept on this device by Atom (normansrule.github.io/atom). Nothing was sent anywhere.</p>';
    }
    BUILD.you=function(P){
      P.innerHTML='<div class="lb-you"></div>';
      P.addEventListener("click",function(e){ var b=e.target.closest("[data-yz]"), a=e.target.closest("[data-ya]");
        if(b&&opt.card) opt.card(+b.getAttribute("data-yz"));
        if(a){ var k=a.getAttribute("data-ya"), dz=Progress.daily().z;
          if(k==="card"&&opt.card) opt.card(dz);
          if(k==="build"){ B.p=dz; B.n=commonA(dz)-dz; B.e=dz; show("build"); setBMode("atom"); changed(); }
          if(k==="quiz"){ Z=dz; if(opt.select) opt.select(dz); Qs.mode="this"; show("predict"); nextQuestion(true); }
          if(k==="review"){ Qs.mode="review"; show("predict"); nextQuestion(true); }
          if(k==="print") printHTML(progressHTML());
          if(k==="reset"){ askReset=true; REFRESH.you(); var y=P.querySelector('[data-ya="reset-yes"]'); if(y) y.focus(); }
          if(k==="reset-no"){ askReset=false; REFRESH.you(); var r=P.querySelector('[data-ya="reset"]'); if(r) r.focus(); }
          if(k==="reset-yes"){ askReset=false; Progress.reset(); toast("Your progress on this device is erased."); } } });
      /* your table is one stop for the Tab key; the arrow keys move inside it */
      P.addEventListener("keydown",function(e){ var t=e.target.closest&&e.target.closest("[data-yz]"); if(!t) return;
        var d={ArrowLeft:[0,-1],ArrowRight:[0,1],ArrowUp:[-1,0],ArrowDown:[1,0]}[e.key]; if(!d) return; e.preventDefault();
        var z0=+t.getAttribute("data-yz"), p0=PTable.pos(z0), best=0, bd=1e9;
        for(var z=1;z<=118;z++){ var p=PTable.pos(z), dr=p.r-p0.r, dc=p.c-p0.c; if(d[0]&&Math.sign(dr)!==d[0]) continue; if(d[1]&&Math.sign(dc)!==d[1]) continue;
          var cost=d[0]?Math.abs(dr)*4+Math.abs(dc)*1.5:Math.abs(dc)*4+Math.abs(dr)*9; if(cost<bd){ bd=cost; best=z; } }
        if(best){ var nb=P.querySelector('[data-yz="'+best+'"]'); t.tabIndex=-1; nb.tabIndex=0; nb.focus(); } });
    };
    REFRESH.you=function(){
      var P=pane("you").querySelector(".lb-you"), s=Progress.stats(), d=Progress.daily(), e=el(d.z), Pd=Progress.data(), focusZ=Z||1;
      var mini='<div class="lb-mini" role="group" aria-label="Your table. Use the arrow keys to move between elements.">'+ELEMENTS.map(function(f){ var lv=Progress.level(f[0]), pos=PTable.pos(f[0]);
        return '<button type="button" class="l'+lv+'" data-yz="'+f[0]+'" tabindex="'+(f[0]===focusZ?0:-1)+'" style="--cat:'+catC(f)+';grid-row:'+pos.r+';grid-column:'+pos.c+'" title="'+esc(f[2])+'" aria-label="'+f[1]+', '+esc(f[2])+': '+["not yet explored","explored","built","mastered"][lv]+'">'+f[1]+'</button>'; }).join('')+'</div>';
      var chs=Object.keys(Pd.challenges).sort(function(a,b){ return Pd.challenges[b].when-Pd.challenges[a].when; }).slice(0,4);
      P.innerHTML=
        '<section class="lb-today"><h3>Today\'s element</h3><div class="lb-trow">'+tile(d.z,true)+'<div><p class="lb-tname">'+esc(e[2])+'</p><p>'+esc(cap(USES[d.z-1][1]))+(USES[d.z-1][2]?' · '+esc(USES[d.z-1][2]):'')+'</p></div></div>'+
          '<ol class="lb-tasks">'+[["card","Open its card",d.card,"Open card"],["build","Build its "+isoWord(d.z)+" isotope, "+e[2].toLowerCase()+"-"+commonA(d.z),d.build,"Build it"],["quiz","Get a question about it right",d.quiz,"Ask me"]].map(function(t){
            return '<li class="'+(t[2]?"done":"")+'"><span class="lb-mark" role="img" aria-label="'+(t[2]?"done":"not yet")+'">'+(t[2]?"✓":"○")+'</span> '+esc(t[1])+(t[2]?'':' <button type="button" class="lb-btn sm" data-ya="'+t[0]+'">'+t[3]+'</button>')+'</li>'; }).join('')+'</ol>'+
          (d.done?'<p class="lb-say">All three done. A new element arrives tomorrow.</p>':'')+
          (chs.length?'<h3 class="lb-h lb-chh">Challenges</h3><ul class="lb-chl">'+chs.map(function(k){ var c=Pd.challenges[k]; return '<li><b>'+c.score+' of '+c.n+'</b> <span>'+esc(k)+'</span></li>'; }).join('')+'</ul>':'')+'</section>'+
        '<section class="lb-stats"><dl class="lb-big">'+
          '<div><dt>Explored</dt><dd>'+s.seen+' <small>of 118</small></dd></div><div><dt>Built</dt><dd>'+s.built+'</dd></div><div><dt>Mastered</dt><dd>'+s.mastered+'</dd></div>'+
          '<div><dt>Boxes filled</dt><dd>'+s.orbitals+'</dd></div><div><dt>Days in a row</dt><dd>'+s.streak+'</dd></div><div><dt>Right answers</dt><dd>'+s.right+'</dd></div></dl>'+
          (s.due?'<p class="lb-say">'+s.due+' question'+(s.due>1?'s are':' is')+' ready to review. <button type="button" class="lb-btn sm go" data-ya="review">Review now</button></p>':'')+
          '<h3 class="lb-h">Your table</h3><p class="lb-legend"><span class="l1">Explored</span><span class="l2">Built</span><span class="l3">Mastered</span></p>'+mini+'</section>'+
        '<section class="lb-badges"><h3 class="lb-h">Badges, '+s.badges+' of '+Progress.badges.length+'</h3><ul>'+Progress.badges.map(function(b){ var has=Progress.has(b.id);
          return '<li class="'+(has?"has":"")+'"><b>'+(has?'<span role="img" aria-label="earned">★</span> ':'')+esc(b.name)+'</b><span>'+esc(b.desc)+'</span></li>'; }).join('')+'</ul>'+
          '<div class="lb-row lb-youfoot"><button type="button" class="lb-btn" data-ya="print">Print my progress</button>'+
          (askReset?'<span class="lb-confirm" role="group" aria-label="Erase your progress?"><b>Erase everything on this device? This can\'t be undone.</b> <button type="button" class="lb-btn sm" data-ya="reset-yes">Yes, erase it</button><button type="button" class="lb-btn sm go" data-ya="reset-no">Keep it</button></span>':
            '<button type="button" class="lb-btn ghost" data-ya="reset">Erase my progress</button>')+'</div>'+
          '<p class="lb-note">Your progress stays on this device. Nothing is sent anywhere.</p></section>';
      refreshDue();
    };

    /* ======================================================== frame and API */
    var anim=false;
    api.frame=function(now){
      if(cur==="bench"&&sims) sims.frame(now);
      if(!dirty&&!anim) return;
      dirty=false;
      anim=cur==="build"?(bmode==="atom"?drawBuild(now):false):(cur==="calc"?drawCalc(now):(cur==="hear"?drawHear(now):false));
    };
    api.show=function(t,z){ if(z) api.setElement(z); show(t||cur); };
    /* the table picked an element: the labs follow it, except where you chose
       something yourself (a built atom, a played element) */
    api.setElement=function(z){ if(!z||z===Z) return; Z=z;
      if(built.predict){ if(Qs.mode==="this"&&!Qs.answered) nextQuestion(false); else renderModes(); }
      if(built.hear&&!H.guess){ H.z=z; REFRESH.hear(); }
      dirty=true; };
    api.build=function(z){ B.p=z; B.n=commonA(z)-z; B.e=z; show("build"); setBMode("atom"); changed(); };
    api.quiz=function(z){ if(z) Z=z; Qs.mode="this"; show("predict"); nextQuestion(true); };
    api.hear=function(z){ H.z=z; H.guess=null; show("hear"); renderGuess(); REFRESH.hear(); };
    /* a shared link: #build=6-8-6 or #challenge=A1... */
    api.open=function(spec){ if(!spec) return false;
      if(spec.build){ B.p=spec.build[0]; B.n=spec.build[1]; B.e=spec.build[2]; show("build"); setBMode("atom"); changed(); toast("Here is the atom you were sent."); return true; }
      if(spec.challenge){ show("predict"); if(challengeStart(spec.challenge)){ toast("Challenge loaded: "+CH.keys.length+" questions."); return true; } }
      return false; };
    /* what a mission's "Show me" asks of the labs */
    api.act=function(a){
      var t=a.lab||cur;
      if(t==="build"){ if(a.z){ B.p=a.z; B.n=(a.a||commonA(a.z))-a.z; B.e=a.e!=null?a.e:a.z; } show("build"); setBMode(a.boxes?"boxes":"atom"); if(!a.boxes) changed(); return; }
      if(t==="calc"){ show("calc");
        if(a.calc&&a.calc!==C.tab){ var cb=pane("calc").querySelector('[data-ct="'+a.calc+'"]'); if(cb) cb.click(); }
        if(a.line){ var lv=a.line.split(","); C.cz=1; C.nu=+lv[0]; C.nl=+lv[1]; calcForm(); }
        if(a.preset) setPreset(a.preset);
        if(a.formula){ C.formula=a.formula; calcForm(); }
        if(a.half){ var hu=bestUnit(C.half); C.tu=hu[0]; C.t=+(a.half*C.half/hu[1]).toPrecision(4); calcForm(); }
        if(a.listen&&!C.listen){ C.listen=true; Sound.now(); calcForm(); ev("calc:listen"); dirty=true; }
        calcOut(); return; }
      if(t==="hear"){ if(a.z){ H.z=a.z; H.guess=null; } show("hear"); renderGuess(); REFRESH.hear(); if(a.play) playLight(H.z||Z); return; }
      if(t==="predict"){ if(a.z) api.quiz(a.z); else show("predict"); return; }
      show(t);
    };
    /* a mission just started: tell it what the labs already show, so a step
       that is already done counts */
    api.resync=function(){
      if(built.calc){ if(C.tab==="light") ev("calc:line:"+C.cz+":"+C.nu+"-"+C.nl);
        if(C.tab==="decay"){ if(C.hl) ev("calc:decay:"+C.hl); ev("calc:decay:half:"+Math.floor(calcState().k+1e-6)); }
        if(C.tab==="molar"){ try{ ev("calc:molar:"+hill(parseFormula(C.formula))); }catch(e){} } }
      if(built.build&&B.touched){ var s=buildState(); ev("build:"+s.p+":"+s.a+":"+s.q); GOALS.forEach(function(g){ if(g.test(s.p,s.n,s.e)) ev("goal:"+g.id); }); }
    };
    api.current=function(){ return cur; };
    api.redraw=function(){ COL={}; dirty=true; if(sims) sims.redraw(); if(built.you&&cur==="you") REFRESH.you(); if(built.build&&bmode==="atom") readBuild(); };
    api.toast=toast;
    api.sims=function(){ if(!built.bench){ built.bench=true; BUILD.bench(pane("bench")); } return sims; };
    api.pause=function(){ if(C.listen){ C.listen=false; if(built.calc) calcForm(); } Sound.stop(); };
    show("build");
    refreshDue();
    return api;
  }

  /* ------------------------------------------------------------ search */
  function search(input,onPick){
    var id="lbList"+Math.floor(Math.random()*1e6), dl=D.createElement("datalist"); dl.id=id;
    dl.innerHTML=ELEMENTS.map(function(e){ return '<option value="'+esc(e[2])+'">'+e[1]+' · '+e[0]+'</option>'; }).join('');
    input.setAttribute("list",id); input.parentNode.appendChild(dl);
    function go(){ var z=zOf(input.value); if(z){ onPick(z); input.value=""; input.blur(); } else if(input.value.trim()) input.setAttribute("aria-invalid","true"); }
    input.addEventListener("change",go);
    input.addEventListener("keydown",function(e){ input.removeAttribute("aria-invalid"); if(e.key==="Enter"){ e.preventDefault(); go(); } });
  }

  /* ------------------------------------------------------------ the card's "try it" row */
  function cardActions(z){
    var P=Progress.data(), nb=P.built[z]?Object.keys(P.built[z]).length:0, ok=0, k;
    for(k in P.learn) if(k.split(":")[1]===String(z)&&P.learn[k].ok>0) ok++;
    var vis=(PTable.lineList(z)||{lines:[]}).lines.some(function(p){ return p[0]>=VIS0&&p[0]<=VIS1; });
    return '<section class="pd-acts" aria-label="Try it yourself"><div>'+
      '<button type="button" data-la="build">Build '+esc(lc(z))+'</button>'+
      '<button type="button" data-la="quiz">Quiz me on it</button>'+
      (vis?'<button type="button" data-la="hear">Hear its light</button>':'')+'</div>'+
      '<p class="pd-mine"><span class="on">Explored</span><span'+(nb?' class="on"':'')+'>'+(nb?'Built '+nb+' isotope'+(nb>1?'s':''):'Not built yet')+'</span>'+
      '<span'+(P.mastered[z]?' class="on"':'')+'>'+(P.mastered[z]?'Mastered':Math.min(ok,3)+' of 3 right answers toward mastery')+'</span></p></section>';
  }

  /* ------------------------------------------------------------ the labs' own checks, run with the app's self-test */
  function molar(f){ var c=parseFormula(f), m=0; for(var k in c) m+=el(SYM[k])[3]*c[k]; return m; }
  function selfTest(){
    var out=[], throws=function(f){ try{ parseFormula(f); return false; }catch(e){ return true; } };
    function t(name, pass, why){ out.push([name, !!pass, pass?"":why]); }
    var mw=molar("H2O"), mg=molar("C6H12O6"), mc=molar("CuSO4·5H2O"), mb=molar("Ca(OH)2"), am=parseFormula("CuSO4·5H2O·2NH3");
    t("labs: molar masses of water, glucose, Ca(OH)2 and hydrates", Math.abs(mw-18.015)<0.01&&Math.abs(mg-180.156)<0.02&&Math.abs(mb-74.09)<0.02&&Math.abs(mc-249.68)<0.05&&am.H===16&&am.N===2&&am.O===9,
      [mw,mg,mb,mc].map(function(x){ return x.toFixed(3); }).join(" ")+" "+JSON.stringify(am));
    t("labs: a made-up symbol, an open bracket, or a zero count is refused", throws("Xx2")&&throws("Ca(OH2")&&throws("H0")&&throws("h2o")&&!throws("NaCl"), "parser accepted bad input");
    t("labs: Hill order (C, H, then A-Z)", hill(parseFormula("HOH"))==="H2O"&&hill(parseFormula("OCH4"))==="CH4O"&&hill(parseFormula("NaCl"))==="ClNa", hill(parseFormula("OCH4")));
    var ha=lineOf(1,3,2).w, ly=lineOf(1,2,1).w;
    t("labs: hydrogen-alpha 656.47 nm and Lyman-alpha 121.57 nm (vacuum)", Math.abs(ha-656.47)<0.05&&Math.abs(ly-121.57)<0.02, ha.toFixed(3)+" "+ly.toFixed(3));
    var k=[[6,12,"stable"],[6,14,"radioactive"],[8,24,"radioactive"],[8,25,"unbound"],[4,8,"unbound"],[2,5,"unbound"],[5,9,"unbound"],[26,56,"stable"],[0,2,"unbound"],[52,130,"radioactive"],[11,11,"unbound"]], bad=[];
    k.forEach(function(x){ if(nuclide(x[0],x[1]).kind!==x[2]) bad.push(x[0]+"-"+x[1]); });
    if(!/cobalt-60/.test(nuclide(26,60).text)) bad.push("Fe-60 decays to Co-60");
    if(!/boron-10/.test(nuclide(4,10).text)) bad.push("Be-10 decays to B-10");
    if(!/xenon-130/.test(nuclide(52,130).text)) bad.push("Te-130 double beta decays to Xe-130");
    if(!/so few neutrons/.test(nuclide(26,30).text)) bad.push("Fe with 4 neutrons has too few");
    t("labs: what a built nucleus does (stable, radioactive, falls apart, which way it decays)", bad.length===0, bad.join(", "));
    var fe=occOf("[Ar] 3d6 4s2"), un=occOf("1s22s22p4"), sup=occOf("1s²2s²2p⁶3s²3p⁶4s²3d¹⁰"), ok=!!fe&&fe["3,2"]===6&&fe["4,0"]===2&&fe["1,0"]===2&&fe["3,1"]===6&&un&&un["2,1"]===4&&un["1,0"]===2&&sup&&sup["3,2"]===10&&sup["4,0"]===2;
    t("labs: typed configurations, with a core, run together, or in superscripts", ok, JSON.stringify([fe,un,sup]));
    var fe2=cfgText(ionConfig(26,24),false), cu1=cfgText(ionConfig(29,28),false);
    t("labs: an ion loses its outermost electrons first (Fe²⁺ is [Ar] 3d⁶, Cu⁺ is [Ar] 3d¹⁰)", fe2==="[Ar] 3d⁶"&&cu1==="[Ar] 3d¹⁰", fe2+" / "+cu1);
    var ch=challengeParse(challengeMake([1,6,8,26],10,["n","q","c","b"],12345)), k1=challengeKeys(ch).join("|"), k2=challengeKeys(challengeParse(ch.code)).join("|");
    t("labs: a challenge code rebuilds the same questions", !!ch&&k1===k2&&challengeKeys(ch).length===10&&challengeKeys(ch).every(function(x){ return !!makeQ(x); }), k1);
    t("labs: half-lives in the presets parse (5700 y, 1.248 Gy, 24 110 y)", Math.abs(halfLifeSeconds("5700 y")/31557600-5700)<1e-6&&Math.abs(halfLifeSeconds("1.248 Gy")/31557600e9-1.248)<1e-9&&Math.abs(halfLifeSeconds("24 110 y")/31557600-24110)<1e-6, "half-life text misread");
    return out;
  }

  return {mount:mount, progress:Progress, search:search, nuclide:nuclide, parseFormula:parseFormula, zOf:zOf, sound:Sound, cardActions:cardActions, selfTest:selfTest,
    fromHash:fromHash, challengeParse:challengeParse};
})();

/* ATOM-PTABLE END */
