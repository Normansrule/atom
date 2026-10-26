/* ATOM-ENGINES BEGIN */
/* ============================================================================
   ATOM ENGINES — shared by the app and the website. One source, two hosts.

   AtomGL   draws the electron cloud on the GPU. For one orbital it marches a
            ray through every pixel and integrates |psi_nlm|^2 along it, the
            same line-of-sight integral the Canvas renderer approximates by
            binning 48 000 Monte-Carlo samples. For a whole atom the density is
            spherical (Unsold's theorem: an equal share of electrons in every m
            sums to a constant), so the line-of-sight integral depends only on
            the impact parameter and is precomputed once as a table.

   AtomQCD  the arithmetic of pulling a quark out of a baryon: the Y-shaped
            flux tube that lattice QCD finds, its junction at the Fermat point
            of the three quarks, a linear potential with a Coulomb-like term at
            short range, and string breaking near 1.25 fm.

   Neither engine knows anything about the page it runs in. The app hands
   AtomGL its own hydrogenR and its own camera; the site hands it the same.
   ============================================================================ */
var AtomGL = (function(){
  "use strict";
  var NTAB = 1024;

  /* Real spherical harmonics in Cartesian form, l <= 3. Normalized so that
     the integral of Y^2 over the sphere is 1, and signed to match the app's
     YlmReal (Condon-Shortley phase, Y_l,m>0 = sqrt2 (-1)^m Re Y_l|m|), which
     makes p_x = +sqrt(3/4pi) x. AtomGL.selfCheck() verifies the match. */
  function Yc(l, m, x, y, z){
    var PI = Math.PI;
    if(l===0) return 0.5/Math.sqrt(PI);
    if(l===1){ var c1=Math.sqrt(3/(4*PI)); return c1*(m===-1?y:(m===0?z:x)); }
    if(l===2){
      if(m===-2) return 0.5*Math.sqrt(15/PI)*x*y;
      if(m===-1) return 0.5*Math.sqrt(15/PI)*y*z;
      if(m=== 0) return 0.25*Math.sqrt(5/PI)*(3*z*z-1);
      if(m=== 1) return 0.5*Math.sqrt(15/PI)*x*z;
      return 0.25*Math.sqrt(15/PI)*(x*x-y*y);
    }
    if(m===-3) return 0.25*Math.sqrt(35/(2*PI))*y*(3*x*x-y*y);
    if(m===-2) return 0.5*Math.sqrt(105/PI)*x*y*z;
    if(m===-1) return 0.25*Math.sqrt(21/(2*PI))*y*(5*z*z-1);
    if(m=== 0) return 0.25*Math.sqrt(7/PI)*z*(5*z*z-3);
    if(m=== 1) return 0.25*Math.sqrt(21/(2*PI))*x*(5*z*z-1);
    if(m=== 2) return 0.25*Math.sqrt(105/PI)*z*(x*x-y*y);
    return 0.25*Math.sqrt(35/(2*PI))*x*(x*x-3*y*y);
  }

  /* THE COLOR IS THE PHASE. A stationary state evolves as
         psi(r,t) = psi(r) exp(-i E t / hbar),
     so its complex phase turns at a rate set by its energy, and a state built
     from two energies (a superposition) changes SHAPE at the difference
     frequency: that oscillating charge is what radiates light. The shader
     carries psi as a complex number, integrates |psi|^2 along each line of
     sight, and averages the phase weighted by density; hue is that phase,
     saturation is how coherent it is along the ray. Time is slowed by about
     10^15, because 2.5 x 10^15 turns a second is not something a screen can
     show. For one whole shell (Unsold: spherical) the phase is meaningless,
     and hue instead encodes distance from the nucleus. */
  var VS = "#version 300 es\nin vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  var FS = [
    "#version 300 es",
    "precision highp float;",
    "out vec4 o;",
    "uniform vec4 uRect;uniform float uPx;uniform vec3 uEx,uEy,uEz,uOff;uniform vec2 uC;",
    "uniform float uExt,uNorm,uGamma,uAlpha,uA1,uA2,uPh1,uPh2;",
    "uniform int uMode,uL,uM,uL2,uM2,uSteps,uLight,uHue,uTwo;",
    "uniform sampler2D uTab,uTab2;uniform vec3 uPos,uNeg,uPosInk,uNegInk;",
    "float Y(vec3 u,int l,int m){float x=u.x,y=u.y,z=u.z;",
    " if(l==0) return 0.28209479177387814;",
    " if(l==1){float c=0.4886025119029199; return c*(m==-1?y:(m==0?z:x));}",
    " if(l==2){",
    "  if(m==-2) return 1.0925484305920792*x*y;",
    "  if(m==-1) return 1.0925484305920792*y*z;",
    "  if(m==0) return 0.31539156525252005*(3.*z*z-1.);",
    "  if(m==1) return 1.0925484305920792*x*z;",
    "  return 0.5462742152960396*(x*x-y*y);}",
    " if(m==-3) return 0.5900435899266435*y*(3.*x*x-y*y);",
    " if(m==-2) return 2.890611442640554*x*y*z;",
    " if(m==-1) return 0.4570457994644658*y*(5.*z*z-1.);",
    " if(m==0) return 0.3731763325901154*z*(5.*z*z-3.);",
    " if(m==1) return 0.4570457994644658*x*(5.*z*z-1.);",
    " if(m==2) return 1.445305721320277*z*(x*x-y*y);",
    " return 0.5900435899266435*x*(x*x-3.*y*y);}",
    "vec2 tc(float r){return vec2(sqrt(clamp(r/uExt,0.,1.))*(1023./1024.)+0.5/1024.,0.5);}",
    "float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}",
    "vec3 wheel(float h){vec3 w=0.5+0.5*cos(h+vec3(0.,2.0943951,4.1887902));return clamp((w-0.5)*1.55+0.5,0.,1.);}",
    "void main(){",
    " vec2 fc=gl_FragCoord.xy-uRect.xy; if(fc.x<0.||fc.y<0.||fc.x>uRect.z||fc.y>uRect.w) discard;",
    " vec2 s=(fc-0.5*uRect.zw)*uPx;",
    " float t=0.,coh=0.,hue=0.,f=0.;",
    " if(uMode==1){",
    "  float b=length(s-uC); if(b>=uExt) discard;",
    "  t=texture(uTab,tc(b)).r; hue=4.4-5.2*sqrt(b/uExt); coh=0.85;",
    " } else {",
    "  vec3 oo=s.x*uEx+s.y*uEy+uOff, d=uEz;",
    "  float bb=dot(oo,d), cc=dot(oo,oo)-uExt*uExt, disc=bb*bb-cc;",
    "  if(disc<=0.) discard;",
    "  float sq=sqrt(disc), t0=-bb-sq, t1=-bb+sq, dt=(t1-t0)/float(uSteps), j=hash(gl_FragCoord.xy);",
    "  float I=0.,pr=0.,pim=0.,ineg=0.;",
    "  float c1=cos(uPh1),s1=sin(uPh1),c2=cos(uPh2),s2=sin(uPh2);",
    "  for(int i=0;i<256;i++){ if(i>=uSteps) break;",
    "   vec3 q=oo+d*(t0+(float(i)+j)*dt); float r=length(q); vec3 u=q/max(r,1e-6);",
    "   float p1=texture(uTab,tc(r)).r*Y(u,uL,uM);",
    "   float p2=uTwo==1? texture(uTab2,tc(r)).r*Y(u,uL2,uM2):0.;",
    "   float re=uA1*p1*c1+uA2*p2*c2, im=uA1*p1*s1+uA2*p2*s2;",
    "   float dd=re*re+im*im, de=dd*dt; I+=de;",
    "   float mg=sqrt(dd)+1e-20; pr+=de*re/mg; pim+=de*im/mg;",
    "   if(p1<0.) ineg+=de; }",
    "  if(I<=0.) discard;",
    "  t=pow(min(1.,I*uNorm),uGamma); hue=atan(pim,pr); coh=clamp(length(vec2(pr,pim))/I,0.,1.); f=ineg/I;",
    " }",
    " if(t<0.002) discard;",
    " vec3 col, ink;",
    " if(uHue==1){ vec3 w=wheel(hue); col=mix(vec3(0.85),w,0.2+0.8*coh); ink=mix(vec3(0.22),w*0.48,0.25+0.75*coh); }",
    " else { col=mix(uPos,uNeg,f); ink=mix(uPosInk,uNegInk,f); }",
    " if(uLight==1){ float a=(1.-exp(-3.0*t))*0.96*uAlpha; o=vec4(ink*a,a); }",
    " else { vec3 c=col*t+vec3(0.20)*t*t; float a=min(1.,t*1.35)*uAlpha; o=vec4(min(c,vec3(1.))*uAlpha,a); }",
    "}"
  ].join("\n");

  function compile(gl, type, src){
    var s=gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)){ var m=gl.getShaderInfoLog(s); gl.deleteShader(s); throw new Error(m||"shader"); }
    return s;
  }
  function interp(tab, ext, r){
    var u=Math.sqrt(Math.min(1,r/ext))*(NTAB-1), i0=Math.floor(u), f=u-i0;
    return i0>=NTAB-1 ? tab[NTAB-1] : tab[i0]*(1-f)+tab[i0+1]*f;
  }
  /* the radius holding 99.8% of P(r) = r^2 R^2 */
  function extentOf(s, R){
    var rmax=3.6*s.n*s.n/s.Z+22/s.Z, M=2400, dr=rmax/M, tot=0, i, acc=0, P=new Float64Array(M);
    for(i=0;i<M;i++){ var r=(i+0.5)*dr, v=R(s.n,s.l,r,s.Z); P[i]=r*r*v*v*dr; tot+=P[i]; }
    for(i=0;i<M;i++){ acc+=P[i]; if(acc>=0.998*tot) return (i+1)*dr*1.04; }
    return rmax;
  }
  function radialTable(s, R, ext){
    var tab=new Float32Array(NTAB), mx=0, i;
    for(i=0;i<NTAB;i++){ var u=i/(NTAB-1), v=R(s.n,s.l,ext*u*u,s.Z); tab[i]=v; if(Math.abs(v)>mx) mx=Math.abs(v); }
    for(i=0;i<NTAB;i++) tab[i]/=(mx||1);
    return tab;
  }
  /* the brightest line of sight of the time-averaged density, over three
     orthogonal views, with the same tables and the same Y the shader uses */
  function columnMax(parts, ext, quick){
    var G=quick?18:40, N=quick?56:100, best=0, ax, i, j, k, p;
    for(ax=0;ax<3;ax++) for(i=0;i<G;i++) for(j=0;j<G;j++){
      var a=ext*(2*(i+0.5)/G-1), b=ext*(2*(j+0.5)/G-1);
      if(a*a+b*b>=ext*ext) continue;
      var half=Math.sqrt(ext*ext-a*a-b*b), dt=2*half/N, acc=0;
      for(k=0;k<N;k++){ var c=-half+(k+0.5)*dt, x,y,z;
        if(ax===0){x=c;y=a;z=b;} else if(ax===1){x=a;y=c;z=b;} else {x=a;y=b;z=c;}
        var r=Math.sqrt(x*x+y*y+z*z)||1e-9;
        for(p=0;p<parts.length;p++){ var v=parts[p].amp*interp(parts[p].tab,ext,r)*Yc(parts[p].l,parts[p].m,x/r,y/r,z/r); acc+=v*v*dt; }
      }
      if(acc>best) best=acc;
    }
    return best||1;
  }

  function create(canvas, hooks, keep){
    var gl=null;
    /* keep: preserve the drawing buffer, so a host can repaint part of it a
       frame (the periodic table repaints a few squares at a time) */
    try{ gl=canvas.getContext("webgl2",{alpha:true, premultipliedAlpha:true, antialias:false,
                                         preserveDrawingBuffer:!!keep, powerPreference:"high-performance"}); }
    catch(e){ gl=null; }
    if(!gl || typeof gl.createShader!=="function" || typeof gl.createProgram!=="function") return null;
    var api={ ok:false, lost:false, ms:16, scale:1, info:"", cur:null, ext:1 };
    var prog, loc={}, vao, clouds=[];

    function makeTex(){ var t=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,t);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      return t; }
    function upload(tex, data){ gl.bindTexture(gl.TEXTURE_2D,tex); gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.R16F,NTAB,1,0,gl.RED,gl.FLOAT,data); }
    function init(){
      var vs=compile(gl, gl.VERTEX_SHADER, VS), fs=compile(gl, gl.FRAGMENT_SHADER, FS);
      prog=gl.createProgram(); gl.attachShader(prog,vs); gl.attachShader(prog,fs);
      gl.bindAttribLocation(prog,0,"p"); gl.linkProgram(prog);
      if(!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog)||"link");
      ["uRect","uPx","uEx","uEy","uEz","uOff","uC","uExt","uNorm","uGamma","uAlpha","uA1","uA2","uPh1","uPh2",
       "uMode","uL","uM","uL2","uM2","uSteps","uLight","uHue","uTwo","uTab","uTab2","uPos","uNeg","uPosInk","uNegInk"
      ].forEach(function(k){ loc[k]=gl.getUniformLocation(prog,k); });
      vao=gl.createVertexArray(); gl.bindVertexArray(vao);
      var vbo=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,vbo);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
      clouds.forEach(function(c){ c.tex=makeTex(); upload(c.tex,c.tab); if(c.tab2){ c.tex2=makeTex(); upload(c.tex2,c.tab2); } });
      api.ok=true;
      var dbg=gl.getExtension("WEBGL_debug_renderer_info");
      api.info=String(gl.getParameter(dbg?dbg.UNMASKED_RENDERER_WEBGL:gl.RENDERER));
    }
    try{ init(); }catch(err){ api.error=String(err&&err.message||err); return null; }
    canvas.addEventListener("webglcontextlost", function(e){ e.preventDefault(); api.lost=true; api.ok=false;
      if(hooks&&hooks.lost) hooks.lost(); }, false);
    canvas.addEventListener("webglcontextrestored", function(){
      try{ init(); api.lost=false; if(hooks&&hooks.restored) hooks.restored(); }catch(e){ api.ok=false; } }, false);

    /* makeCloud(spec, mode, R, mix) -> a cloud handle, tables computed once.
       spec  [{n,l,m,Z,w}]  the same spec the app's sampler uses
       mode  "single" | "shells"
       R     hydrogenR(n,l,r,Z), r in Bohr radii, passed in, never re-derived
       mix   optional {n,l,m,Z,amp}: a second state, superposed with the first
             at amplitudes sqrt(1-amp^2) and amp
       opt   optional {quick, sphere, range}: quick normalizes on a coarser grid (the
             periodic table builds 118 of these); sphere keeps R_nl but drops
             the angular part, which is exactly a FILLED subshell, since
             sum over m of |Y_lm|^2 = (2l+1)/4pi (Unsold's theorem); range
             (shells only) is the brightest-to-faintest ratio the glow shows */
    api.makeCloud=function(spec, mode, R, mix, opt){
      var c={ mode:mode==="shells"?1:0, ext:0 }, i, k;
      for(i=0;i<spec.length;i++) c.ext=Math.max(c.ext, extentOf(spec[i], R));
      if(mix) c.ext=Math.max(c.ext, extentOf(mix, R));
      var ext=c.ext;
      if(c.mode===0){
        var s=spec[0];
        c.n=s.n; c.l=s.l; c.m=s.m; c.Z=s.Z; c.tab=radialTable(s,R,ext);
        c.a1=1; c.a2=0;
        if(mix){ c.a2=Math.max(0,Math.min(1,mix.amp)); c.a1=Math.sqrt(1-c.a2*c.a2);
          c.n2=mix.n; c.l2=mix.l; c.m2=mix.m; c.Z2=mix.Z; c.tab2=radialTable(mix,R,ext); }
        if(opt&&opt.sphere){ c.l=0; c.m=0; c.sphere=s.l; }
        var parts=[{tab:c.tab,l:c.l,m:c.m,amp:c.a1}];
        if(mix) parts.push({tab:c.tab2,l:c.l2,m:c.m2,amp:c.a2});
        c.norm=1/(0.86*columnMax(parts, ext, opt&&opt.quick)); c.gamma=0.5;
      } else {
        /* spherical: rho(r) = sum_subshell w R^2 / 4pi, then the column
           I(b) = 2 int_0^sqrt(ext^2-b^2) rho(sqrt(b^2+s^2)) ds, tone-mapped
           logarithmically: a heavy atom's K shell is ~1e4 times denser than its
           valence shell, and under a power law the valence would vanish */
        var groups={}, key;
        for(i=0;i<spec.length;i++){ key=spec[i].n+","+spec[i].l+","+spec[i].Z.toFixed(5);
          if(!groups[key]) groups[key]={n:spec[i].n,l:spec[i].l,Z:spec[i].Z,w:0}; groups[key].w+=spec[i].w; }
        var gs=Object.keys(groups).map(function(k2){ return groups[k2]; });
        var rho=function(r){ var a=0; for(var g=0;g<gs.length;g++){ var v=R(gs[g].n,gs[g].l,r,gs[g].Z); a+=gs[g].w*v*v; } return a/(4*Math.PI); };
        var col=new Float32Array(NTAB), Imax=0, M=360, tab=new Float32Array(NTAB);
        for(i=0;i<NTAB;i++){
          var uu=i/(NTAB-1), b=ext*uu*uu, S=Math.sqrt(Math.max(0,ext*ext-b*b)), acc=0;
          for(k=0;k<M;k++){ var q0=k/M, q1=(k+1)/M, sm=S*((q0+q1)/2)*((q0+q1)/2), ds=S*(q1*q1-q0*q0);
            acc+=rho(Math.sqrt(b*b+sm*sm))*ds; }
          col[i]=2*acc; if(col[i]>Imax) Imax=col[i];
        }
        var I0=Imax/((opt&&opt.range)||400), den=Math.log(1+Imax/I0);   /* range: how many decades the glow spans */
        for(i=0;i<NTAB;i++) tab[i]=Math.pow(Math.min(1,Math.log(1+col[i]/I0)/den),0.85);
        c.tab=tab; c.norm=1; c.gamma=1; c.n=c.l=c.m=0;
      }
      if(api.ok){ c.tex=makeTex(); upload(c.tex,c.tab); if(c.tab2){ c.tex2=makeTex(); upload(c.tex2,c.tab2); } }
      clouds.push(c);
      return c;
    };
    api.freeCloud=function(c){ var i=clouds.indexOf(c); if(i>=0) clouds.splice(i,1);
      if(api.ok){ if(c.tex) gl.deleteTexture(c.tex); if(c.tex2) gl.deleteTexture(c.tex2); } };
    /* the one-cloud interface the app uses */
    api.setCloud=function(spec, mode, R, mix){
      if(api.cur) api.freeCloud(api.cur);
      api.cur=api.makeCloud(spec, mode, R, mix); api.ext=api.cur.ext;
    };

    /* size(w,h,dpr,budget) sets the backing store; draw() then renders one
       cloud into a rectangle of it, so one context can draw a whole gallery */
    var bufW=2, bufH=2, bufS=1;
    api.size=function(w,h,dpr,budget){
      var sc=Math.min(dpr, Math.sqrt((budget||650000)/Math.max(1,w*h)));
      sc=Math.max(0.35, sc*api.scale);
      bufW=Math.max(2,Math.round(w*sc)); bufH=Math.max(2,Math.round(h*sc)); bufS=bufW/w;
      if(canvas.width!==bufW||canvas.height!==bufH){ canvas.width=bufW; canvas.height=bufH; }
      gl.viewport(0,0,bufW,bufH);
      return bufS;
    };
    api.clear=function(){ if(api.ok&&!api.lost){ gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT); } };
    /* clear one rectangle, in CSS px from the top-left, before repainting it */
    api.clearRect=function(x,y,w,h){ if(!api.ok||api.lost) return;
      var X=Math.floor(x*bufS), Yb=Math.floor((bufH/bufS-y-h)*bufS), Wr=Math.ceil(w*bufS)+1, Hr=Math.ceil(h*bufS)+1;
      gl.enable(gl.SCISSOR_TEST); gl.scissor(Math.max(0,X),Math.max(0,Yb),Wr,Hr);
      gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT); gl.disable(gl.SCISSOR_TEST); };

    /* draw(cam)
       cam.yaw, cam.pitch   camera angles (the app's convention)
       cam.fov              half field of view, meters, across min(w,h) of the rect
       cam.off              focus offset [x,y,z], meters
       cam.a0               Bohr radius, meters
       cam.w,cam.h,cam.dpr  CSS size of the canvas (single-cloud use)
       cam.rect             [x,y,w,h] in CSS px from the top-left (gallery use; no clear)
       cam.time             seconds of display time; the phase turns at E_n
       cam.hue              1: color = complex phase (shells: distance); 0: two-tone sign
       cam.alpha, cam.light, cam.pos/neg/posInk/negInk  the look           */
    api.draw=function(cam){
      var c=cam.cloud||api.cur;
      if(!api.ok||api.lost||!c) return false;
      if(!cam.rect){ api.size(cam.w,cam.h,cam.dpr,cam.budget); api.clear(); }
      if(cam.alpha<=0.004) return true;
      var rw=cam.rect?cam.rect[2]:cam.w, rh=cam.rect?cam.rect[3]:cam.h;
      var rx=cam.rect?cam.rect[0]:0, ry=cam.rect?cam.rect[1]:0;
      var X=rx*bufS, Yb=(bufH/bufS-ry-rh)*bufS, Wr=rw*bufS, Hr=rh*bufS;
      var cy=Math.cos(cam.yaw), sy=Math.sin(cam.yaw), cp=Math.cos(cam.pitch), sp=Math.sin(cam.pitch);
      var ex=[cy,0,-sy], ey=[-sp*sy,cp,-sp*cy], ez=[cp*sy,sp,cp*cy];
      var a0=cam.a0, off=[cam.off[0]/a0,cam.off[1]/a0,cam.off[2]/a0];
      var pxA=(cam.fov/(Math.min(rw,rh)/2))/a0/bufS;
      var cx=-(off[0]*ex[0]+off[1]*ex[1]+off[2]*ex[2]), cyv=-(off[0]*ey[0]+off[1]*ey[1]+off[2]*ey[2]);
      var tm=cam.time||0;
      /* E_n = -Z^2/n^2 in Rydbergs: the phase of each state is -E t, and the
         visible rate is 0.9 rad/s for the ground state of hydrogen */
      var ph1=0.9*tm*(c.Z||1)*(c.Z||1)/((c.n||1)*(c.n||1)), ph2=c.tab2?0.9*tm*c.Z2*c.Z2/(c.n2*c.n2):0;
      gl.useProgram(prog); gl.bindVertexArray(vao);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,c.tex); gl.uniform1i(loc.uTab,0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D,c.tex2||c.tex); gl.uniform1i(loc.uTab2,1);
      gl.uniform4f(loc.uRect,X,Yb,Wr,Hr); gl.uniform1f(loc.uPx,pxA);
      gl.uniform3fv(loc.uEx,ex); gl.uniform3fv(loc.uEy,ey); gl.uniform3fv(loc.uEz,ez); gl.uniform3fv(loc.uOff,off);
      gl.uniform2f(loc.uC,cx,cyv); gl.uniform1f(loc.uExt,c.ext); gl.uniform1f(loc.uNorm,c.norm);
      gl.uniform1f(loc.uGamma,c.gamma); gl.uniform1f(loc.uAlpha,cam.alpha);
      gl.uniform1f(loc.uA1,c.a1||1); gl.uniform1f(loc.uA2,c.a2||0); gl.uniform1f(loc.uPh1,ph1); gl.uniform1f(loc.uPh2,ph2);
      gl.uniform1i(loc.uMode,c.mode); gl.uniform1i(loc.uL,c.l); gl.uniform1i(loc.uM,c.m);
      gl.uniform1i(loc.uL2,c.l2||0); gl.uniform1i(loc.uM2,c.m2||0); gl.uniform1i(loc.uTwo,c.tab2?1:0);
      gl.uniform1i(loc.uSteps, Math.round(cam.steps||(c.l>=2||c.tab2?120:96)));
      gl.uniform1i(loc.uLight, cam.light?1:0); gl.uniform1i(loc.uHue, cam.hue===0?0:1);
      gl.uniform3fv(loc.uPos,cam.pos); gl.uniform3fv(loc.uNeg,cam.neg);
      gl.uniform3fv(loc.uPosInk,cam.posInk); gl.uniform3fv(loc.uNegInk,cam.negInk);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
      /* a rectangle is scissored, not just discarded in the shader: the
         triangle covers the whole canvas, and without this every square of
         the periodic table would shade every pixel of it */
      if(cam.rect){ gl.enable(gl.SCISSOR_TEST); gl.scissor(Math.max(0,Math.floor(X)),Math.max(0,Math.floor(Yb)),Math.ceil(Wr)+1,Math.ceil(Hr)+1); }
      gl.drawArrays(gl.TRIANGLES,0,3);
      if(cam.rect) gl.disable(gl.SCISSOR_TEST);
      return true;
    };
    /* frame-time governor: the GPU work is the fragment count, so when a
       frame takes too long the buffer shrinks, and it grows back slowly */
    api.govern=function(frameMs){
      if(frameMs>24 && api.scale>0.55) api.scale*=0.92;
      else if(frameMs<14 && api.scale<1) api.scale=Math.min(1,api.scale*1.02);
    };
    return api;
  }

  /* The shader's Y and the app's YlmReal must be the same function, or the
     GPU picture and the Canvas fallback disagree about which lobe is which.
     Returns the worst absolute difference over a grid of directions. */
  function selfCheck(YlmReal){
    var worst=0, l, m, i, j;
    for(l=0;l<=3;l++) for(m=-l;m<=l;m++) for(i=1;i<24;i++) for(j=0;j<48;j++){
      var th=i*Math.PI/24, ph=j*2*Math.PI/48, st=Math.sin(th);
      var d=Math.abs(Yc(l,m,st*Math.cos(ph),st*Math.sin(ph),Math.cos(th))-YlmReal(l,m,th,ph));
      if(d>worst) worst=d;
    }
    return worst;
  }
  return { create:create, Yc:Yc, selfCheck:selfCheck };
})();

var AtomQCD = (function(){
  "use strict";
  /* Constants, each with where it comes from. Lengths in fm, energies in GeV.
     sigma   0.90 GeV/fm: the string tension. Phenomenological fits give
             sqrt(sigma) = 0.42-0.44 GeV, i.e. 0.89-0.98 GeV/fm; Takahashi et
             al. set their lattice scale with 0.89 GeV/fm.
     a3q     0.1366: the Coulomb coefficient of the three-quark potential
             (Takahashi et al. 2002, quenched SU(3), dimensionless, x hbar c),
             about half the quark-antiquark value, as one-gluon exchange says.
     rBreak  1.25 fm: where the quark-antiquark string breaks in lattice QCD
             with two flavors of sea quarks (Bali et al. 2005). For a baryon
             leg it is an approximation, and it is labeled as one.          */
  var C = { hbarc:0.1973269804, sigma:0.90, a3q:0.1366, rBreak:1.25,
            NperGeVfm:1.602176634e5, tonneForce:9806.65 };
  C.sqrtSigma = Math.sqrt(C.sigma*C.hbarc);           /* GeV */
  C.tonnes = C.sigma*C.NperGeVfm/C.tonneForce;         /* ~14.7 */

  function d2(a,b){ var dx=a[0]-b[0], dy=a[1]-b[1], dz=(a[2]||0)-(b[2]||0); return Math.sqrt(dx*dx+dy*dy+dz*dz); }
  /* The Fermat (Steiner) point: the junction that makes the total string
     length least. Where a corner of the triangle is 120 degrees or more, the
     junction sits on that quark; otherwise the three legs meet at 120 degrees. */
  function fermat(q){
    var i, a, b, c;
    for(i=0;i<3;i++){
      a=q[i]; b=q[(i+1)%3]; c=q[(i+2)%3];
      var ab=[b[0]-a[0],b[1]-a[1],(b[2]||0)-(a[2]||0)], ac=[c[0]-a[0],c[1]-a[1],(c[2]||0)-(a[2]||0)];
      var nb=Math.hypot(ab[0],ab[1],ab[2]), nc=Math.hypot(ac[0],ac[1],ac[2]);
      if(nb<1e-9||nc<1e-9) return [a[0],a[1],a[2]||0];
      var cos=(ab[0]*ac[0]+ab[1]*ac[1]+ab[2]*ac[2])/(nb*nc);
      if(cos<=-0.5) return [a[0],a[1],a[2]||0];
    }
    var J=[(q[0][0]+q[1][0]+q[2][0])/3,(q[0][1]+q[1][1]+q[2][1])/3,((q[0][2]||0)+(q[1][2]||0)+(q[2][2]||0))/3];
    for(var it=0; it<80; it++){                       /* Weiszfeld */
      var nx=0, ny=0, nz=0, den=0;
      for(i=0;i<3;i++){ var d=Math.max(1e-9,d2(q[i],J)); nx+=q[i][0]/d; ny+=q[i][1]/d; nz+=(q[i][2]||0)/d; den+=1/d; }
      J=[nx/den, ny/den, nz/den];
    }
    return J;
  }
  /* V_3Q = -a3q hbar c sum 1/r_ij + sigma L_min  (+ a constant, dropped) */
  function state(q){
    var J=fermat(q), legs=[d2(q[0],J), d2(q[1],J), d2(q[2],J)], L=legs[0]+legs[1]+legs[2];
    var coul=0;
    for(var i=0;i<3;i++) for(var j=i+1;j<3;j++) coul-=C.a3q*C.hbarc/Math.max(0.05,d2(q[i],q[j]));
    return { J:J, legs:legs, L:L, coul:coul, V:C.sigma*L+coul };
  }
  /* The meson potential, for the quark-antiquark pair left after a break:
     Cornell form, V = -(4/3) alpha_s hbar c / r + sigma r, with the
     Coulomb coefficient 2 x a3q (one-gluon exchange: a_QQbar = 2 a_3Q). */
  function mesonV(r){ return -2*C.a3q*C.hbarc/Math.max(0.05,r) + C.sigma*r; }

  var Q = { u:2/3, d:-1/3 };
  function baryonName(f){
    var nu=0, nd=0; f.forEach(function(x){ if(x==="u") nu++; else nd++; });
    return nu===2?"p":(nu===1?"n":(nu===3?"Δ⁺⁺":"Δ⁻"));
  }
  function mesonName(q, pair){ if(q===pair) return "π⁰"; return q==="u" ? "π⁺" : "π⁻"; }
  /* What a break makes. The vacuum supplies one quark and its antiquark, of
     flavor `pair`. The antiquark binds to the quark you were pulling (a
     meson); the new quark takes its place in the baryon. Charge and baryon
     number are conserved, and snap() checks that it says so. */
  function snap(flavors, pulled, pair){
    var before=baryonName(flavors), rest=flavors.slice(), pq=rest.splice(pulled,1)[0];
    var after=rest.concat([pair]);
    var qBefore=flavors.reduce(function(s,f){ return s+Q[f]; },0);
    var qAfter=after.reduce(function(s,f){ return s+Q[f]; },0) + (Q[pq]-Q[pair]);
    return { before:before, after:baryonName(after), meson:mesonName(pq,pair),
             mesonQuarks:pq+(pair==="u"?"ū":"d̄"), baryonQuarks:after.slice().sort().reverse().join(""),
             text:before+" → "+baryonName(after)+" + "+mesonName(pq,pair),
             chargeOK:Math.abs(qBefore-qAfter)<1e-9 };
  }
  return { C:C, fermat:fermat, state:state, mesonV:mesonV, snap:snap, baryonName:baryonName };
})();
/* ATOM-ENGINES END */
