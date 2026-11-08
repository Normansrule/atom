/* ATOM-LABS BEGIN */
/* ----------------------------------------------------------------------------
   The labs: Atom you learn by doing. Shared by the website and the app.

     Build      put protons, neutrons, and electrons together by clicking,
                typing, or dragging, and see which element, isotope, and ion
                you made and what its nucleus does; or fill an element's
                orbital boxes by hand and check them against three rules.
     The math   ten steps through the element you pick, from Coulomb's law
                to quarks: the classical picture, why it fails, Bohr, waves,
                Schrödinger's orbitals, shielding, relativity, the nucleus,
                and the strong force, each worked through with that element's
                numbers, animated, with a question to try.
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
  function nm(z){ return AtomI18N.elName(z); }      /* "Iron", "Hierro": the name as a title */
  function lc(z){ return AtomI18N.elWord(z); }      /* "iron", "hierro", "Eisen": the name inside a sentence */
  function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;"); }
  function cap(s){ return s.charAt(0).toUpperCase()+s.slice(1); }
  function an(word){ return /^[aeio]/i.test(word)?TT("an {word}",{word:word}):TT("a {word}",{word:word}); }
  function fmt(x,d){ return AtomI18N.N(x,d); }   /* the reader's own digits and separators */
  function supNum(n){ return String(n).replace(/−/g,"-").split("").map(function(c){ var i="-0123456789+".indexOf(c); return i<0?c:"⁻⁰¹²³⁴⁵⁶⁷⁸⁹⁺".charAt(i); }).join(""); }
  function sci(x,dig){
    if(!isFinite(x)) return "—"; if(x===0) return "0";
    var s=x<0?"−":"", a=Math.abs(x), e=Math.floor(Math.log10(a));
    if(e>=-2&&e<6) return s+fmt(a, Math.max(0,Math.min(4,(dig||3)-1-e)));
    return s+fmt(a/Math.pow(10,e),(dig||3)-1)+" × 10"+supNum(e);
  }
  /* a plain number a number field can show (never "1.2 × 10⁹") */
  function plain(x){ return String(+(+x).toPrecision(4)); }
  function words(n){ return [TT("no",{}),TT("one",{}),TT("two",{}),TT("three",{}),TT("four",{}),TT("five",{}),TT("six",{}),TT("seven",{}),TT("eight",{}),TT("nine",{}),TT("ten",{})][n]||String(n); }
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
  var SYM=Object.create(null); ELEMENTS.forEach(function(e){ SYM[e[1]]=e[0]; SYM[e[1].toLowerCase()]=e[0]; SYM[e[2].toLowerCase()]=e[0]; });
  SYM.aluminum=13; SYM.cesium=55; SYM.sulphur=16;
  function zOf(s){ s=String(s||"").trim(); if(/^\d+$/.test(s)){ var n=+s; return n>=1&&n<=118?n:0; } return SYM[s]||SYM[s.toLowerCase()]||AtomI18N.zByName(s)||0; }
  function nameOnly(s){ s=String(s||"").trim(); return /^\d+$/.test(s)?0:(SYM[s]||SYM[s.toLowerCase()]||AtomI18N.zByName(s)||0); }
  function commonA(z){ var e=el(z); return e[16]||Math.round(e[3]); }
  /* the elements with no stable isotope, outside the two primordial ones, are
     represented by their longest-lived isotope, not a "most common" one */
  function synthetic(z){ return !(STABLE[z]||[]).length&&z!==83&&z!==90&&z!==92; }
  function isoWord(z){ return synthetic(z)?TT("longest-lived",{}):TT("most common"); }

  /* ------------------------------------------------------------ progress */
  var Progress=(function(){
    var KEY="atom.progress", subs=[], P=null;
    function blank(){ return {v:1, seen:{}, built:{}, heard:{}, calc:{}, learn:{}, mastered:{}, days:{}, daily:{}, badges:{}, goals:{}, orbitals:{}, challenges:{}, lessons:{},
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
      {id:"first",    name:TT("First atom"),     desc:TT("Build any atom."),                                   test:function(){ return count(P.built)>0; }},
      {id:"ion",      name:TT("Charged"),        desc:TT("Build an ion: more or fewer electrons than protons."),test:function(){ return !!P.ion; }},
      {id:"unstable", name:TT("Unstable"),       desc:TT("Build a radioactive isotope."),                      test:function(){ return !!P.unstable; }},
      {id:"isotopes", name:TT("Isotope hunter"), desc:TT("Build three isotopes of one element."),              test:function(){ for(var z in P.built) if(count(P.built[z])>=3) return true; return false; }},
      {id:"builder",  name:TT("Builder"),        desc:TT("Build ten different elements."),                     test:function(){ return count(P.built)>=10; }},
      {id:"goals",    name:TT("Workshop"),       desc:TT("Finish every Build challenge."),                     test:function(){ return count(P.goals)>=8; }},
      {id:"boxes",    name:TT("Box filler"),     desc:TT("Fill the orbital boxes of five elements correctly."), test:function(){ return count(P.orbitals)>=5; }},
      {id:"sharp",    name:TT("Sharp"),          desc:TT("Answer five questions right in a row."),             test:function(){ return P.best>=5; }},
      {id:"recall",   name:TT("Remembered"),     desc:TT("Get a question right that came back for review."),   test:function(){ return P.reviewed>=1; }},
      {id:"master",   name:TT("Master"),         desc:TT("Master five elements (three different right answers each)."), test:function(){ return count(P.mastered)>=5; }},
      {id:"challenge",name:TT("Challenger"),     desc:TT("Finish a challenge someone shared with you."),       test:function(){ return count(P.challenges)>=1; }},
      {id:"calc",     name:TT("Calculator"),     desc:TT("Use all four calculators."),                         test:function(){ return count(P.calc)>=4; }},
      {id:"listen",   name:TT("Listener"),       desc:TT("Hear the light of five elements."),                  test:function(){ return count(P.heard)>=5; }},
      {id:"ear",      name:TT("Good ear"),       desc:TT("Name three elements by the sound of their light."),  test:function(){ return P.ear>=3; }},
      {id:"explorer", name:TT("Explorer"),       desc:TT("Open 25 element cards."),                            test:function(){ return count(P.seen)>=25; }},
      {id:"regular",  name:TT("Regular"),        desc:TT("Explore on three different days."),                  test:function(){ return count(P.days)>=3; }},
      {id:"daily",    name:TT("Element of the day"), desc:TT("Finish all three of today's tasks."),            test:function(){ for(var k in P.daily) if(P.daily[k].done) return true; return false; }},
      {id:"collector",name:TT("Collector"),      desc:TT("Open all 118 element cards."),                       test:function(){ return count(P.seen)>=118; }}
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
      else if(kind==="lesson"){ P.lessons[x.id]=x.state; }
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
    /* progress travels as a file (everything) or as a turn-in code (a summary
       a teacher can read), so a shared Chromebook is not a dead end */
    function exportJSON(){ return JSON.stringify({atom:"progress", v:P.v||1, when:day(), data:P}); }
    function importJSON(text, merge){
      var d=null; try{ d=JSON.parse(String(text||"")); }catch(e){ return TT("That is not an Atom progress file."); }
      if(!d||d.atom!=="progress"||!d.data||typeof d.data!=="object") return TT("That is not an Atom progress file.");
      var b=blank(), inc=d.data, k;
      for(k in b) if(inc[k]==null||typeof inc[k]!==typeof b[k]) inc[k]=b[k];
      if(merge){ for(k in b){ if(typeof b[k]==="number") P[k]=Math.max(P[k]||0,inc[k]||0); else { var o=inc[k], kk; for(kk in o) if(Object.prototype.hasOwnProperty.call(o,kk)){
          if(k==="built"&&P.built[kk]){ var iso=o[kk], kkk; for(kkk in iso) P.built[kk][kkk]=iso[kkk]; }
          else if(k==="learn"&&P.learn[kk]&&P.learn[kk].due>o[kk].due) continue;
          else P[k][kk]=o[kk]; } } } }
      else P=inc;
      save(); emit("sync",{}); return "";
    }
    /* the turn-in code: a date, the counts, and three 118-bit maps (explored,
       built, mastered), with a check digit; no name and nothing private */
    var B64="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    function bits(o){ var out="", v=0, n=0, z; for(z=1;z<=120;z++){ v=(v<<1)|(o[z]?1:0); n++; if(n===6){ out+=B64[v]; v=0; n=0; } } return out; }
    function unbits(s){ var o={}, z=1, i, c, k; for(i=0;i<s.length;i++){ c=B64.indexOf(s[i]); if(c<0) return null; for(k=5;k>=0;k--){ if(z<=118&&((c>>k)&1)) o[z]=1; z++; } } return o; }
    function sum(s){ var h=2166136261, i; for(i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619)>>>0; } return (h.toString(36)+"000").slice(0,4); }
    /* the lessons finished, as one character: bit i = lesson i of the five */
    var LESSON_IDS=["empty","shells","light","nucleus","table"];
    function lessonBits(){ var v=0; LESSON_IDS.forEach(function(id,i){ if(P.lessons[id]&&P.lessons[id].complete) v|=(1<<i); }); return B64[v]; }
    function code(){ var s=stats(), body=[day(),s.seen,s.built,s.mastered,s.right,s.streak,s.orbitals,s.challenges,bits(P.seen),bits(P.built),bits(P.mastered),lessonBits()].join("."); return "A3."+body+"."+sum(body); }
    /* A2 (1.6) and A3 (1.7, with the lessons) are both read */
    function readCode(c){ c=String(c||"").trim(); var m=/^A([23])\.(.+)\.([a-z0-9]{4})$/.exec(c); if(!m||sum(m[2])!==m[3]) return null;
      var p=m[2].split("."), v=+m[1]; if(p.length!==(v===3?12:11)||!/^\d{4}-\d{2}-\d{2}$/.test(p[0])) return null;
      var seen=unbits(p[8]), built=unbits(p[9]), mast=unbits(p[10]); if(!seen||!built||!mast) return null;
      var lessons=[]; if(v===3){ var lb=B64.indexOf(p[11]); if(lb<0) return null; LESSON_IDS.forEach(function(id,i){ if(lb&(1<<i)) lessons.push(id); }); }
      return {date:p[0], seen:+p[1], built:+p[2], mastered:+p[3], right:+p[4], streak:+p[5], orbitals:+p[6], challenges:+p[7], mastList:Object.keys(mast).map(Number).sort(function(a,b){ return a-b; }), builtList:Object.keys(built).map(Number).sort(function(a,b){ return a-b; }), lessons:lessons}; }
    /* a second window on the same device sees the first window's progress */
    try{ window.addEventListener("storage",function(e){ if(e.key===KEY){ load(); emit("sync",{}); } }); }catch(e){}
    return {mark:mark, answer:answer, due:due, forget:forget, level:level, stats:stats, daily:daily, badges:BADGES, has:function(id){ return !!P.badges[id]; },
      goal:function(id){ return !!P.goals[id]; }, on:function(f){ subs.push(f); }, reset:reset, data:function(){ return P; },
      exportJSON:exportJSON, importJSON:importJSON, code:code, readCode:readCode};
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
  var ANION={1:[-1,TT("hydride",{})],6:[-4,TT("carbide",{})],7:[-3,TT("nitride",{})],8:[-2,TT("oxide",{})],9:[-1,TT("fluoride",{})],15:[-3,TT("phosphide",{})],16:[-2,TT("sulfide",{})],17:[-1,TT("chloride",{})],34:[-2,TT("selenide",{})],35:[-1,TT("bromide",{})],53:[-1,TT("iodide",{})]};
  function anionName(z,q){ return ANION[z]&&ANION[z][0]===q?ANION[z][1]:""; }
  function chargeStr(q){ return q===0?"0":(Math.abs(q)===1?"":Math.abs(q))+(q>0?"+":"−"); }
  function isoName(z,a){ if(z===1&&a===2) return TT("deuterium (hydrogen-2)"); if(z===1&&a===3) return TT("tritium (hydrogen-3)"); return lc(z)+"-"+a; }
  function hlWords(t){ return t.replace(/\b(\d+) (\d{3})\b/,"$1,$2").replace(/ ky$/,TT(" thousand years")).replace(/ My$/,TT(" million years")).replace(/ Gy$/,TT(" billion years")).replace(/ y$/,TT(" years",{})).replace(/ d$/,TT(" days",{})).replace(/ h$/,TT(" hours",{})).replace(/ min$/,TT(" minutes",{})); }
  function modeWords(m){ return m.split(/,\s*/).map(function(x){ return x.replace("beta-",TT("beta-minus decay")).replace("beta+",TT("beta-plus decay")).replace(/^EC$/,TT("electron capture")).replace(/^alpha$/,TT("alpha decay")).replace(/^SF$/,TT("spontaneous fission")); }).join(" or "); }
  /* isotopes that are radioactive but so slow that the ones made before Earth
     formed are still here (NUBASE2020; double-beta half-lives from the
     measurements it cites). [half-life in years, how it decays, what it makes] */
  var PRIMORDIAL={"19-40":null, "23-50":[2.7e17,"ec","titanium-50"], "20-48":[6.4e19,"bb","titanium-48"], "32-76":[2.0e21,"bb","selenium-76"], "34-82":[8.8e19,"bb","krypton-82"],
    "37-87":[4.97e10,"b","strontium-87"], "40-96":[2.3e19,"bb","molybdenum-96"], "42-100":[7.1e18,"bb","ruthenium-100"], "48-113":[8.0e15,"b","indium-113"], "48-116":[2.7e19,"bb","tin-116"],
    "49-115":[4.4e14,"b","tin-115"], "52-128":[2.2e24,"bb","xenon-128"], "52-130":[7.9e20,"bb","xenon-130"], "54-124":[1.8e22,"ecec","tellurium-124"], "54-136":[2.2e21,"bb","barium-136"],
    "56-130":[1e21,"ecec","xenon-130"], "57-138":[1.03e11,"ec","barium-138"], "60-144":[2.3e15,"a","cerium-140"], "60-150":[9.3e18,"bb","samarium-150"], "62-147":[1.06e11,"a","neodymium-143"],
    "62-148":[6.3e15,"a","neodymium-144"], "63-151":[4.6e18,"a","promethium-147"], "64-152":[1.08e14,"a","samarium-148"], "71-176":[3.7e10,"b","hafnium-176"], "72-174":[7.0e16,"a","ytterbium-170"],
    "74-180":[1.8e18,"a","hafnium-176"], "75-187":[4.3e10,"b","osmium-187"], "76-186":[2.0e15,"a","tungsten-182"], "78-190":[4.8e11,"a","osmium-186"]};
  var PMODE={b:TT("beta-minus decay (a neutron turns into a proton)"), ec:TT("electron capture (a proton captures an electron and becomes a neutron)"),
    bb:TT("double beta decay (two neutrons turn into two protons at once)"), ecec:TT("double electron capture (two protons capture two electrons at once)"), a:TT("alpha decay")};
  function ageCompare(y){ var r=y/1.38e10;
    return r>=1e9?TT("more than a billion times the age of the universe"):r>=1e6?TT("more than a million times the age of the universe"):r>=1e3?TT("thousands of times the age of the universe"):r>=10?TT("more than ten times the age of the universe"):TT("longer than the age of the universe"); }
  function nuclide(z,a){
    if(z<=0){
      if(a===0) return {kind:"none",tone:"",title:TT("Nothing yet"),text:TT("Add a proton and you have hydrogen. Every element is just a number of protons.")};
      if(a===1) return {kind:"radioactive",tone:"warn",title:TT("A free neutron"),text:TT("On its own a neutron lasts about 15 minutes on average, then turns into a proton, an electron, and an antineutrino.")};
      return {kind:"unbound",tone:"bad",title:TT("Falls apart"),text:TT("Neutrons alone don't hold together: without protons, this flies apart at once.")};
    }
    if(z>118) return {kind:"unknown",tone:"warn",title:TT("Not made yet"),text:TT("No one has made an element with {z} protons. The heaviest so far is oganesson, with 118.",{z:z})};
    var st=STABLE[z]||[], name=isoName(z,a);
    if(st.indexOf(a)>=0) return {kind:"stable",tone:"ok",title:TT("Stable"),
      text:TT("{cap}{st} It can last forever.",{cap:cap(name),st:(st.length>1?TT(" is one of {el}'s {words} stable isotopes.{a}",{el:lc(z),words:words(st.length),a:(a===commonA(z)?TT(" It is the most common one."):"")}):TT(" is {el}'s only stable isotope.",{el:lc(z)})),z:z})};
    if(z===83&&a===209) return {kind:"stable",tone:"ok",title:TT("Practically stable"),text:TT("Bismuth-209 does decay, but its half-life is about 2 × 10¹⁹ years, a billion times the age of the universe.")};
    var nb=(NOTABLE[z]||[]).filter(function(r){ return r[0]===a; })[0];
    if(nb) return {kind:"radioactive",tone:"warn",title:TT("Radioactive"),text:TT("{cap} decays by {modeWords}, with a half-life of {hlWords}. {cap2}.",{cap:cap(name),modeWords:modeWords(nb[2]),hlWords:hlWords(nb[1]),cap2:cap(nb[3])})};
    var pr=PRIMORDIAL[z+"-"+a];
    if(pr) return {kind:"radioactive",tone:"warn",title:TT("Radioactive, very slowly"),
      text:TT("{cap} is radioactive, but so slowly that the {el} made before Earth formed is still here. Its half-life is about {pr} years, {ageCompare}. It decays by {PMODE}, becoming {pr2}.",{cap:cap(name),el:lc(z),pr:sci(pr[0],2),ageCompare:ageCompare(pr[0]),PMODE:PMODE[pr[1]],pr2:pr[2],z:z})};
    /* the lightest nuclei are measured, not estimated: the liquid-drop model
       is far off for them, so their edges come from experiment (NUBASE2020;
       fluorine-31 and neon-34, Ahn et al. 2019; oxygen-28, Kondo et al. 2023) */
    if(z<=10){
      var rg=LIGHT_BOUND[z], gp=LIGHT_GAPS[z]||[];
      if(LIGHT_NOTE[z+"-"+a]) return {kind:"unbound",tone:"bad",title:TT("Falls apart"),text:LIGHT_NOTE[z+"-"+a]};
      if(a>rg[1]) return {kind:"unbound",tone:"bad",title:TT("Falls apart"),text:TT("With this many neutrons the last one isn't held at all; it leaves almost at once. Experiments find {iso} is the heaviest {el} that holds together. You have found the edge of the nuclear map.",{iso:isoName(z,rg[1]),el:lc(z),z:z})};
      if(a<rg[0]) return {kind:"unbound",tone:"bad",title:TT("Falls apart"),text:TT("With so few neutrons the protons push each other out, and one leaves almost at once. The lightest {el} that holds together is {iso}.",{el:lc(z),iso:isoName(z,rg[0]),z:z})};
      if(gp.indexOf(a)>=0) return {kind:"unbound",tone:"bad",title:TT("Falls apart"),text:TT("{cap} falls apart almost at once: a neutron leaves it, even though {el}-{a} and {el2}-{a2} hold together. Neutrons hold on better in pairs.",{cap:cap(name),el:lc(z),a:(a-1),el2:lc(z),a2:(a+1),z:z})};
    }
    /* where stable nuclei lie: the neutron excess grows as 0.4 A^2 / (A + 200)
       (Green's approximation). Heavier than neon, the edges are the
       liquid-drop model's, and the text says so. */
    var N=a-z, v=(a-0.4*a*a/(a+200))/2;
    if(z>10){
      var B=bindingSEMF(z,a), Sn=N>=1?B-bindingSEMF(z,a-1):Infinity, Sp=z>1?B-bindingSEMF(z-1,a-1):Infinity;
      if(B<=0||Sn<0||Sp<0){
        if(z>v) return {kind:"unbound",tone:"bad",title:TT("Falls apart"),text:TT("With so few neutrons the protons push each other out, and one would leave almost at once. (Estimated from the liquid-drop model.)")};
        return {kind:"unbound",tone:"bad",title:TT("Falls apart"),text:TT("With this many neutrons the last one isn't held at all; it would drip off almost at once. You have found the edge of the nuclear map. (Estimated from the liquid-drop model.)")};
      }
    }
    var none=st.length===0, why;
    if(z>=84) why=TT("Nuclei this heavy decay by shedding an alpha particle, two protons and two neutrons, which would make {lc}-{a}. One with extra neutrons may instead turn a neutron into a proton (beta-minus decay). Which wins depends on details this estimate can't settle.",{lc:lc(z-2),a:(a-4)});
    else if(z<v-0.5) why=TT("It has more neutrons than {el} can hold steadily, so a neutron will turn into a proton (beta-minus decay), making {lc}-{a}.",{el:lc(z),lc:lc(z+1),a:a,z:z});
    else if(z>v+0.5) why=TT("It has too few neutrons, so a proton will turn into a neutron (beta-plus decay or electron capture), making {z}.",{z:(z>1?lc(z-1)+"-"+a:TT("a neutron-rich nucleus"))});
    else why=TT("It sits right on the line where stable nuclei lie, but its neighbors with the same mass are more tightly bound, so it will turn into one of them by beta decay.");
    return {kind:"radioactive",tone:"warn",title:TT("Radioactive"),text:TT("{none}{why} (An estimate: this isotope isn't in Atom's list of measured ones.)",{none:(none?TT("No isotope of {el} is stable. ",{el:lc(z)}):""),why:why,z:z})};
  }
  var LIGHT_BOUND={1:[1,3],2:[3,8],3:[6,11],4:[7,14],5:[8,19],6:[9,22],7:[12,23],8:[13,24],9:[17,31],10:[17,34]};
  var LIGHT_GAPS={2:[5,7],3:[10],4:[13],5:[16,18],6:[21],9:[28,30],10:[33]};
  var MASS5=TT("No nucleus with five particles holds together, and none with eight lasts as long as a second. Those two gaps are a main reason the Big Bang made almost nothing heavier than lithium.");
  var LIGHT_NOTE={"2-5":TT("Helium-5 falls apart almost at once. {MASS5}",{MASS5:MASS5}), "3-5":TT("Lithium-5 falls apart almost at once. {MASS5}",{MASS5:MASS5}),
    "4-8":TT("Beryllium-8 splits into two helium-4 nuclei in about 10⁻¹⁶ seconds. Stars get past it only by catching a third helium nucleus before it splits, which is how the universe makes its carbon."),
    "5-9":TT("Boron-9 doesn't hold together: it sheds a proton almost at once, leaving beryllium-8, which then splits into two helium-4 nuclei.")};
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
    if(!s) throw new Error(TT("Type a formula, like H2O."));
    var tot={};
    function add(t,o,k){ for(var x in o) t[x]=(t[x]||0)+o[x]*k; }
    s.split(".").forEach(function(part){
      if(!part) throw new Error(TT("A dot needs a part of the formula on each side."));
      var i=0;
      function num(){ var m=/^\d+/.exec(part.slice(i)); if(!m) return 1; i+=m[0].length; if(+m[0]===0) throw new Error(TT("A count can't be zero.")); return +m[0]; }
      function group(close){
        var t={};
        while(i<part.length){
          var c=part[i];
          if(c==="("||c==="["){ i++; var inner=group(c==="("?")":"]"); add(t,inner,num()); }
          else if(c===")"||c==="]"){ if(c!==close) throw new Error(TT("A bracket doesn't match.")); i++; return t; }
          else if(/[A-Z]/.test(c)){ var m=/^[A-Z][a-z]?/.exec(part.slice(i)), sym=m[0];
            if(!SYM[sym]||el(SYM[sym])[1]!==sym){ if(sym.length===2&&SYM[sym[0]]&&el(SYM[sym[0]])[1]===sym[0]&&!/[a-z]/.test(part[i+2]||"")){ sym=sym[0]; } else throw new Error(TT("There is no element \"{sym}\".",{sym:sym})); }
            i+=sym.length; var n=num(); t[sym]=(t[sym]||0)+n; }
          else if(/[a-z]/.test(c)) throw new Error(TT("Element symbols start with a capital letter: \"{cap}\", not \"{part}\".",{cap:cap(part.slice(i,i+2).replace(/[^a-z]/g,"")),part:part.slice(i,i+2).replace(/[^a-z]/g,"")}));
          else throw new Error(TT("I can't read \"{c}\" here. Use element symbols, numbers, and brackets.",{c:c}));
        }
        if(close) throw new Error(TT("A bracket is never closed."));
        return t;
      }
      var lead=num(), g=group(null);
      if(!Object.keys(g).length) throw new Error(TT("Type a formula, like H2O."));
      add(tot,g,lead);
    });
    return tot;
  }
  /* one electron around a nucleus of charge Z (hydrogen, He+, Li2+): the Bohr
     levels with the reduced-mass correction, so hydrogen-alpha lands on its
     measured 656.47 nm (vacuum) */
  var HY={1:{n:"hydrogen",m:938.272},2:{n:TT("helium ion He⁺"),m:3727.379},3:{n:TT("lithium ion Li²⁺"),m:6533.833}};
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

  /* ------------------------------------------------------------ data for Explore and the molecule builder */
  /* Pauling electronegativity, the WebElements set as the Wikipedia data page
     lists it (Allred 1961; Huheey, Keiter and Keiter 1993). null where there is
     no reliable value: the lighter noble gases, promethium, europium and
     ytterbium (only a range, 1.1 to 1.2), radon, francium, and past nobelium. */
  var EN=[2.2,null,0.98,1.57,2.04,2.55,3.04,3.44,3.98,null,0.93,1.31,1.61,1.9,2.19,2.58,3.16,null,0.82,1,1.36,1.54,1.63,1.66,1.55,1.83,1.88,1.91,1.9,1.65,1.81,2.01,2.18,2.55,2.96,3,0.82,0.95,1.22,1.33,1.6,2.16,1.9,2.2,2.28,2.2,1.93,1.69,1.78,1.96,2.05,2.1,2.66,2.6,0.79,0.89,1.1,1.12,1.13,1.14,null,1.17,null,1.2,1.1,1.22,1.23,1.24,1.25,null,1.27,1.3,1.5,2.36,1.9,2.2,2.2,2.28,2.54,2,1.62,2.33,2.02,2,2.2,null,null,0.9,1.1,1.3,1.5,1.38,1.36,1.28,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null];
  /* first ionization energy in eV, from the NIST Atomic Spectra Database
     (Kramida, Ralchenko, Reader and NIST ASD Team), through hassium. IE_EST
     marks the values NIST gives as estimates or calculations. */
  var IE1=[13.5984,24.5874,5.3917,9.3227,8.298,11.2603,14.5341,13.6181,17.4228,21.5645,5.1391,7.6462,5.9858,8.1517,10.4867,10.36,12.9676,15.7596,4.3407,6.1132,6.5615,6.8281,6.7462,6.7665,7.434,7.9025,7.881,7.6399,7.7264,9.3942,5.9993,7.8994,9.7886,9.7524,11.8138,13.9996,4.1771,5.6949,6.2173,6.6341,6.7588,7.0924,7.1194,7.3605,7.4589,8.3368,7.5762,8.9938,5.7864,7.3439,8.6084,9.0098,10.4512,12.1298,3.8939,5.2117,5.5769,5.5386,5.4702,5.5248,5.5819,5.6437,5.6704,6.1498,5.8638,5.9391,6.0215,6.1077,6.1844,6.2542,5.4259,6.8251,7.5496,7.864,7.8335,8.4382,8.967,8.9588,9.2256,10.4375,6.1083,7.4167,7.2855,8.4181,9.3175,10.7485,4.0727,5.2784,5.3802,6.3067,5.89,6.194,6.2656,6.0258,5.9738,5.9922,6.1978,6.2819,6.3684,6.5,6.58,6.6262,4.96,6.02,6.8,7.8,7.7,7.6,null,null,null,null,null,null,null,null,null,null];
  var IE_EST={59:1,91:1,100:1,101:1,104:1,105:1,106:1,107:1,108:1};
  /* metals, for "together they make an alloy" */
  var METAL={ak:1,ae:1,tm:1,pt:1,ln:1,an:1};

  /* ------------------------------------------------------------ molecules
     Real geometry: bond lengths in angstroms and angles from experiment (the
     NIST Computational Chemistry Comparison and Benchmark Database, CCCBDB),
     built into coordinates here so the drawing and the stated angle can't
     disagree; the self-test measures the angle back off the coordinates. */
  function deg(a){ return a*Math.PI/180; }
  function molAtoms(id){
    var A=[], r, h, a;
    if(id==="h2")  return [["H",-0.3705,0,0],["H",0.3705,0,0]];
    if(id==="o2")  return [["O",-0.604,0,0],["O",0.604,0,0]];
    if(id==="n2")  return [["N",-0.549,0,0],["N",0.549,0,0]];
    if(id==="hcl") return [["H",-0.6375,0,0],["Cl",0.6375,0,0]];
    if(id==="h2o"){ r=0.958; h=deg(104.5)/2; return [["O",0,0.13,0],["H",-r*Math.sin(h),0.13-r*Math.cos(h),0],["H",r*Math.sin(h),0.13-r*Math.cos(h),0]]; }
    if(id==="co2") return [["C",0,0,0],["O",-1.16,0,0],["O",1.16,0,0]];
    if(id==="ch4"){ r=1.087/Math.sqrt(3); return [["C",0,0,0],["H",r,r,r],["H",r,-r,-r],["H",-r,r,-r],["H",-r,-r,r]]; }
    if(id==="nh3"){ r=1.012; var th=deg(106.7), ca=Math.sqrt((2*Math.cos(th)+1)/3), sa=Math.sqrt(1-ca*ca); A=[["N",0,0.12,0]];
      for(a=0;a<3;a++){ var ph=deg(90+120*a); A.push(["H",r*sa*Math.cos(ph),0.12-r*ca,r*sa*Math.sin(ph)]); } return A; }
    if(id==="bf3"){ r=1.307; A=[["B",0,0,0]]; for(a=0;a<3;a++){ var p2=deg(90+120*a); A.push(["F",r*Math.cos(p2),r*Math.sin(p2),0]); } return A; }
    if(id==="nacl"){ var d=2.82; for(var i=-1;i<=1;i++) for(var j=-1;j<=1;j++) for(var k=-1;k<=1;k++) A.push([(i+j+k+3)%2?"Cl":"Na",i*d,j*d,k*d]); return A; }
    return A;
  }
  /* the colors chemists use for atoms (CPK) */
  var CPK={H:"#f2f2f2",C:"#474747",N:"#3b5bdb",O:"#e03131",F:"#8ce99a",Cl:"#2f9e44",Na:"#9c36b5",B:"#ffa8a8",S:"#fcc419"};
  var COVR={H:0.31,B:0.84,C:0.76,N:0.71,O:0.66,F:0.57,Na:1.02,Cl:1.02,S:1.05};   /* covalent radii, Å (Cordero 2008); ionic for Na⁺ */
  var MOLS=[
    {id:"h2o", name:TT("Water"), f:"H2O", center:0, shape:TT("Bent"), angle:104.5, lp:2, lpDir:[[0,0.55,0.84],[0,0.55,-0.84]], polar:true,
      why:TT("Oxygen has four groups of electrons around it: two bonds and two lone pairs. They spread toward the corners of a tetrahedron, and the lone pairs push a little harder, closing the H–O–H angle from 109.5° to 104.5°. The two O–H pulls add up instead of canceling, so water has a negative end and a positive end, which is why it dissolves salt.")},
    {id:"co2", name:TT("Carbon dioxide"), f:"CO2", center:0, shape:TT("Linear"), angle:180, lp:0, polar:false,
      why:TT("Carbon has two double bonds and no lone pairs: two groups, as far apart as they can get, in a straight line. Each C=O bond is polar, but the two pull in opposite directions and cancel.")},
    {id:"ch4", name:TT("Methane"), f:"CH4", center:0, shape:TT("Tetrahedral"), angle:109.5, lp:0, polar:false,
      why:TT("Four bonds and no lone pairs: the four groups sit as far apart as they can, at the corners of a tetrahedron, 109.5° apart. The C–H pulls are small and point every way, so they cancel.")},
    {id:"nh3", name:TT("Ammonia"), f:"NH3", center:0, shape:TT("Trigonal pyramidal"), angle:106.7, lp:1, lpDir:[[0,1,0]], polar:true,
      why:TT("Nitrogen has three bonds and one lone pair. Four groups make a tetrahedron again, but one corner holds only the lone pair, so the atoms form a short pyramid with nitrogen on top.")},
    {id:"nacl", name:TT("Sodium chloride"), f:"NaCl", ionic:true, shape:TT("Cubic crystal"), lp:0, polar:false,
      why:TT("Table salt is not made of molecules. Sodium gives its one outer electron to chlorine, and the ions, Na⁺ and Cl⁻, stack in a cube, each surrounded by six of the other. NaCl only says the ratio is one to one.")},
    {id:"bf3", name:TT("Boron trifluoride"), f:"BF3", center:0, shape:TT("Trigonal planar"), angle:120, lp:0, polar:false,
      why:TT("Three bonds and no lone pairs on boron: three groups, flat, 120° apart, so the three pulls cancel. Boron has only six electrons around it, fewer than the usual eight, which makes BF₃ eager to take a pair from another molecule.")},
    {id:"hcl", name:TT("Hydrogen chloride"), f:"HCl", center:-1, shape:TT("Linear"), lp:0, polar:true,
      why:TT("Chlorine pulls the shared pair toward itself, so the molecule has a negative end and a positive end. Dissolved in water it is hydrochloric acid, the acid in your stomach.")},
    {id:"h2", name:TT("Hydrogen"), f:"H2", center:-1, shape:TT("Linear"), lp:0, polar:false,
      why:TT("Two hydrogen atoms share their two electrons in one bond. Two identical atoms pull equally, so the bond isn't polar at all.")},
    {id:"o2", name:TT("Oxygen"), f:"O2", center:-1, shape:TT("Linear"), lp:0, polar:false,
      why:TT("The simple drawing gives oxygen a double bond. The real molecule also has two unpaired electrons, which is why liquid oxygen sticks to a magnet.")},
    {id:"n2", name:TT("Nitrogen"), f:"N2", center:-1, shape:TT("Linear"), lp:0, polar:false,
      why:TT("A triple bond, one of the strongest in chemistry. That is why the nitrogen that makes up most of the air reacts with almost nothing.")}
  ];
  MOLS.forEach(function(m){ m.atoms=molAtoms(m.id);
    /* bonds: every pair closer than their covalent radii allow, plus a quarter;
       the order comes from the molecule (the double and triple ones) */
    var ord={co2:2,o2:2,n2:3}[m.id]||1, B=[], i, j;
    if(!m.ionic) for(i=0;i<m.atoms.length;i++) for(j=i+1;j<m.atoms.length;j++){ var p=m.atoms[i], q=m.atoms[j];
      if(Math.hypot(p[1]-q[1],p[2]-q[2],p[3]-q[3])<1.25*(COVR[p[0]]+COVR[q[0]])) B.push([i,j,ord]); }
    else for(i=0;i<m.atoms.length;i++) for(j=i+1;j<m.atoms.length;j++){ var p2=m.atoms[i], q2=m.atoms[j];
      if(Math.abs(Math.hypot(p2[1]-q2[1],p2[2]-q2[2],p2[3]-q2[3])-2.82)<0.01) B.push([i,j,0]); }
    m.bonds=B; });
  /* the angle the coordinates make at the center (for the self-test) */
  function molAngle(m){ if(m.center<0||!m.angle) return null; var c=m.atoms[m.center], n=m.bonds.filter(function(b){ return b[0]===m.center||b[1]===m.center; });
    if(n.length<2) return null; var a=m.atoms[n[0][0]===m.center?n[0][1]:n[0][0]], b=m.atoms[n[1][0]===m.center?n[1][1]:n[1][0]];
    var u=[a[1]-c[1],a[2]-c[2],a[3]-c[3]], v=[b[1]-c[1],b[2]-c[2],b[3]-c[3]];
    return Math.acos((u[0]*v[0]+u[1]*v[1]+u[2]*v[2])/Math.hypot(u[0],u[1],u[2])/Math.hypot(v[0],v[1],v[2]))*180/Math.PI; }

  /* ------------------------------------------------------------ the chart of nuclides
     The same decisions nuclide() makes, without the words, plus which way a
     radioactive nucleus decays: 0 doesn't hold together, 1 stable, 2 beta-minus,
     3 beta-plus or electron capture, 4 alpha, 5 beta (either way), 6 spontaneous
     fission. est is true where the answer is the liquid-drop estimate rather
     than a measured isotope. The self-test checks it against nuclide() for
     every nucleus on the chart. */
  function nmode(m){ m=String(m||"").split(/,\s*/)[0];
    return /^beta-$|^b$|^bb$/.test(m)?2:(/^beta\+$|^EC$|^ec$|^ecec$/.test(m)?3:(/^alpha$|^a$/.test(m)?4:(/^SF$/.test(m)?6:5))); }
  function nclass(z,a){
    if(z<=0) return {k:a===1?2:0, est:false};
    var st=STABLE[z]||[];
    if(st.indexOf(a)>=0||(z===83&&a===209)) return {k:1, est:false};
    var nb=(NOTABLE[z]||[]).filter(function(r){ return r[0]===a; })[0];
    if(nb) return {k:nmode(nb[2]), est:false};
    var pr=PRIMORDIAL[z+"-"+a];
    if(pr) return {k:nmode(pr[1]), est:false};
    if(z<=10){ var rg=LIGHT_BOUND[z], gp=LIGHT_GAPS[z]||[];
      if(LIGHT_NOTE[z+"-"+a]||a>rg[1]||a<rg[0]||gp.indexOf(a)>=0) return {k:0, est:false}; }
    var v=(a-0.4*a*a/(a+200))/2;
    if(z>10){ var B=bindingSEMF(z,a), N=a-z, Sn=N>=1?B-bindingSEMF(z,a-1):Infinity, Sp=z>1?B-bindingSEMF(z-1,a-1):Infinity;
      if(B<=0||Sn<0||Sp<0) return {k:0, est:true}; }
    return {k:z>=84?4:(z<v-0.5?2:(z>v+0.5?3:5)), est:true};
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
  function ppm(x){ return x>=10000?fmt(x/10000,x>=100000?0:1)+"%":x>=1?TT("{x} parts per million",{x:sci(x,2)}):x>=1e-3?TT("{x} parts per billion",{x:sci(x*1e3,2)}):TT("{x} parts per trillion",{x:sci(x*1e6,2)}); }
  function plainCfg(z){ return cfgText(configOf(z),false); }
  var QLABEL={n:TT("Neutrons"),q:TT("Charge"),z:TT("Atomic numbers"),r:TT("Atom size"),c:TT("Configurations"),g:TT("Name the configuration"),s:TT("Stable or radioactive"),d:TT("Density"),
    m:TT("Melting points"),b:TT("Blocks"),v:TT("Valence electrons"),i:TT("Ions"),o:TT("Where it was made"),y:TT("Discovery"),a:TT("Abundance"),w:TT("Common mistakes")};
  /* the mistakes students actually make, each asked with the element's own
     numbers: the empty atom, orbit against orbital, the sign of binding
     energy, where a proton's mass is, which electrons an ion loses first, and
     where an atom's mass sits */
  var MIS=[
    {ok:function(z){ return z<=96&&!!ARAD[z-1]; }, make:function(z){ var A=commonA(z), Rn=1.2*Math.pow(A,1/3), ratio=ARAD[z-1]*1000/Rn, km=ratio/1000;
        var right=km>=1?fmt(km,0)+" km":fmt(ratio,0)+" m", wrong=[fmt(ratio/1000,0)+" m", fmt(ratio/100,0)+" m", fmt(ratio/10,0)+" m"].map(function(s){ return s==="0 m"?"3 m":s; });
        return {text:TT("If {el}'s nucleus were a ball 1 meter across, how far out would its outer electrons be?",{el:lc(z),z:z}), choices:[wrong[0],wrong[1],wrong[2],right].map(function(s){ return {v:s,label:s}; }), tiles:[z],
          check:function(v){ return {ok:v===right, answer:right, right:right, why:TT("{El}'s atom is about {ARAD} pm across its radius and its nucleus about {Rn} fm: {ratio} times smaller. Scale the nucleus up to a meter and the electrons are {right} away, with nothing but field in between. An atom is almost entirely empty.",{El:cap(lc(z)),ARAD:fmt(ARAD[z-1],0),Rn:fmt(Rn,1),ratio:fmt(ratio,0),right:right,z:z})}; }}; }},
    {ok:function(z){ return true; }, make:function(z){ var c=configOf(z), last=c[c.length-1], orb=last[0]+OLET[last[1]];
        var ch=[TT("travels around the nucleus in a circle, like a planet"),TT("is a cloud of probability with no path and no position until it is measured"),TT("sits still at one fixed distance from the nucleus"),TT("bounces between the shells")];
        return {text:TT("An electron in {el}'s {orb} orbital…",{el:lc(z),orb:orb,z:z}), choices:ch.map(function(s,i){ return {v:String(i),label:s}; }), tiles:[z],
          check:function(v){ return {ok:v==="1", answer:ch[1], right:"1", why:TT("An orbital is not an orbit. It is the shape of the electron's wave, |ψ|², which says where the electron is likely to be found; the electron has no path, and a measurement finds it somewhere in that cloud. A circling charge would radiate and spiral in within picoseconds (The math, step 3).")}; }}; }},
    {ok:function(z){ return z>=2&&z<=94; }, make:function(z){ var A=commonA(z), N=A-z, B=BA_MEAS[z+"-"+A]!=null?BA_MEAS[z+"-"+A]*A:bindingSEMF(z,A);
        var ch=[TT("more than {z} protons and {N} neutrons weigh apart, by {B} MeV/c²",{z:z,N:N,B:fmt(B,0)}),TT("less than {z} protons and {N} neutrons weigh apart, by {B} MeV/c²",{z:z,N:N,B:fmt(B,0)}),TT("exactly what {z} protons and {N} neutrons weigh apart",{z:z,N:N}),TT("less, by {A} atomic mass units",{A:A})];
        return {text:TT("{iso}{iso2}'s binding energy is {B} MeV. Its nucleus weighs…",{iso:isoName(z,A).charAt(0).toUpperCase(),iso2:isoName(z,A).slice(1),B:fmt(B,0)}), choices:ch.map(function(s,i){ return {v:String(i),label:s}; }), tiles:[z],
          check:function(v){ return {ok:v==="1", answer:ch[1], right:"1", why:TT("Binding energy is energy that left when the nucleus formed, so the nucleus weighs less than its parts by B/c²: {B} MeV ÷ 931.5 MeV per u = {B2} u missing. That missing mass is what a reactor or a star gives back.",{B:fmt(B,0),B2:fmt(B/931.494,3)})}; }}; }},
    {ok:function(z){ return true; }, make:function(z){ var ch=[TT("the gluons, which are heavy"),TT("the energy of the quarks' motion and of the gluon field, E = mc²"),TT("electrons hidden inside the proton"),TT("the measurement is wrong")];
        return {text:TT("The three quarks in one of {el}'s protons have masses adding to about 9 MeV. The proton weighs 938 MeV. Where is the rest?",{el:lc(z),z:z}), choices:ch.map(function(s,i){ return {v:String(i),label:s}; }), tiles:[z],
          check:function(v){ return {ok:v==="1", answer:ch[1], right:"1", why:TT("Gluons have no mass at all. About 99 percent of a proton's mass is energy: the quarks moving at nearly the speed of light inside a femtometer, and the gluon field holding them, counted as mass by E = mc². Only about 1 percent is the quarks themselves.")}; }}; }},
    {ok:function(z){ return [21,22,23,25,26,27,28,30].indexOf(z)>=0; }, make:function(z){ var c=configOf(z), d=0; c.forEach(function(x){ if(x[0]===3&&x[1]===2) d=x[2]; });
        var ch=[TT("the two 4s electrons"),TT("two of the 3d electrons"),TT("one 4s and one 3d"),TT("the two electrons that were added last, from 3d")];
        return {text:TT("{El} is {cfg}. When it becomes {sym}²⁺, which electrons leave?",{El:cap(lc(z)),cfg:configStr(z,true),sym:el(z)[1],z:z}), choices:ch.map(function(s,i){ return {v:String(i),label:s}; }), tiles:[z],
          check:function(v){ return {ok:v==="0", answer:ch[0], right:"0", why:TT("The 4s electrons fill first but leave first: once the 3d orbitals hold electrons they sit lower in energy than 4s and shield the 4s from the nucleus. {sym}²⁺ is [Ar] 3d{sup}, with both 4s electrons gone.",{sym:el(z)[1],sup:supNum(d)})}; }}; }},
    {ok:function(z){ return true; }, make:function(z){ var me=z*0.00054858, mA=el(z)[3], pct=100*me/mA;
        var ch=[TT("in the electrons"),TT("in the nucleus"),TT("spread evenly through the atom"),TT("in the space between the nucleus and the electrons")];
        return {text:TT("Where is almost all of {el}'s mass?",{el:lc(z),z:z}), choices:ch.map(function(s,i){ return {v:String(i),label:s}; }), tiles:[z],
          check:function(v){ return {ok:v==="1", answer:ch[1], right:"1", why:TT("{El}'s {z, plural, one {# electron} other {# electrons}} together weigh {me} u, which is {pct} percent of its {mA} u. The rest is in the nucleus, in a space a hundred thousand times smaller than the atom.",{El:cap(lc(z)),z:z,me:fmt(me,4),pct:fmt(pct,2),mA:fmt(mA,2)})}; }}; }}
  ];
  var QTYPES={
    n:{ ok:function(z){ return (STABLE[z]||[]).length>0||(NOTABLE[z]||[]).length>0; },
        param:function(z,r){ var l=(STABLE[z]||[]).concat((NOTABLE[z]||[]).map(function(x){ return x[0]; })); return l[Math.floor(r()*l.length)]; },
        make:function(z,a){ return {text:TT("How many neutrons are in {iso}?",{iso:isoName(z,a)}), input:"numeric", hint:TT("Type a number"),
          check:function(v){ var ok=+normNum(v)===a-z; return {ok:ok, answer:String(a-z),
            why:TT("The mass number, {a}, counts protons and neutrons together. Every {el} atom has {z, plural, one {# proton} other {# protons}}, so {a2} − {z3} = {a3} neutron{a4}.",{a:a,el:lc(z),z:z,a2:a,z3:z,a3:(a-z),a4:(a-z===1?"":"s")})}; }}; }},
    q:{ ok:function(z){ return z<=56; },
        param:function(z,r){ var d=[1,2,-1,-2,3,-3][Math.floor(r()*6)]; return Math.max(0,z-d); },
        make:function(z,e){ return {text:TT("An atom has {z, plural, one {# proton} other {# protons}} and {e, plural, one {# electron} other {# electrons}}. What is its charge?",{z:z,e:e}), input:"text", hint:TT("For example +2, −1, or 0"),
          check:function(v){ var q=z-e, qs=q>0?"+"+q:(q<0?"−"+(-q):"0"), ok=chargeOf(v)===q, nmA=anionName(z,q); return {ok:ok, answer:qs,
            why:TT("Each proton carries +1 and each electron −1, so the charge is {z} − {e} = {qs}.{q}",{z:z,e:e,qs:qs,q:(q?TT(" {q} electrons makes {q2} ion{nmA}.",{q:(q>0?TT("Losing"):TT("Gaining")),q2:(q>0?TT("a positive"):TT("a negative")),nmA:(nmA?TT(", here {a_ion}",{a_ion:an(TT("{anion} ion",{anion:nmA}))}):"")}):TT(" Equal numbers make a neutral atom."))})}; }}; }},
    z:{ ok:function(){ return true; }, ident:true, param:function(){ return 0; },
        make:function(z){ return {text:TT("Which element has atomic number {z}?",{z:z}), input:"text", hint:TT("Type its name or symbol"), tiles:[],
          check:function(v){ var ok=nameOnly(v)===z; return {ok:ok, answer:nm(z)+" ("+el(z)[1]+")", why:TT("{v}The atomic number is the number of protons, and it alone decides the element: every atom with {z, plural, one {# proton} other {# protons}} is {el}.",{v:(/^\s*\d+\s*$/.test(v)?TT("Type the element's name or symbol, not the number. "):""),z:z,el:lc(z)})}; }}; }},
    r:{ ok:function(z){ return z<=96&&neighbors(z,true).length+neighbors(z,false).length>0; },
        param:function(z,r){ var l=neighbors(z,true).concat(neighbors(z,false)); return l[Math.floor(r()*l.length)]; },
        make:function(z,w){ var a=[z,w].sort(function(x,y){ return x-y; }); return {text:TT("Which atom is bigger?"), choices:a.map(function(k){ return {v:k, label:nm(k)}; }), tiles:a,
          check:function(v){ var big=ARAD[z-1]>ARAD[w-1]?z:w, small=big===z?w:z, sameGroup=el(z)[6]===el(w)[6];
            var trend=sameGroup?(el(big)[7]>el(small)[7]):(big<small);
            return {ok:+v===big, answer:nm(big), right:big,
              why:TT("{El} (about {ARAD} pm) beats {el} (about {ARAD2} pm). {trend}",{El:cap(lc(big)),ARAD:ARAD[big-1],el:lc(small),ARAD2:ARAD[small-1],trend:(trend?(sameGroup?TT("Going down a group adds a whole new shell of electrons, so atoms grow."):TT("Across a period each step adds a proton that pulls the same shell in tighter, so atoms shrink from left to right.")):TT("This pair runs against the usual trend, which happens where electron shells fill unevenly.")),z:big})}; }}; }},
    c:{ ok:function(z){ return z<=36; }, param:function(){ return 0; },
        make:function(z){ return {text:TT("Type the electron configuration of {el}.",{el:lc(z),z:z}), input:"text", hint:TT("For example 1s2 2s2 2p4, or [He] 2s2 2p4"),
          check:function(v){ var occ=occOf(v), want={}, ok=!!occ; configOf(z).forEach(function(x){ want[x[0]+","+x[1]]=x[2]; });
            if(ok){ for(var k in want) if(occ[k]!==want[k]) ok=false; for(k in occ) if(occ[k]&&!want[k]) ok=false; }
            return {ok:ok, answer:plainCfg(z), why:TT("Electrons fill the lowest-energy subshells first: 1s, 2s, 2p, 3s, 3p, 4s, 3d, 4p. An s subshell holds 2, p holds 6, and d holds 10.{EXCEPT}",{EXCEPT:(EXCEPT[z]?TT(" {El} is an exception: {EXCEPT_WHY}.",{El:cap(lc(z)),EXCEPT_WHY:(EXCEPT_WHY[z]||TT("its subshells are close in energy"))}):""),z:z})}; }}; }},
    g:{ ok:function(z){ return z<=36&&z>2; }, ident:true, param:function(){ return 0; },
        make:function(z){ return {text:TT("Which element has the electron configuration {cfg}?",{cfg:plainCfg(z)}), input:"text", hint:TT("Type its name or symbol"), tiles:[],
          check:function(v){ var ok=nameOnly(v)===z; return {ok:ok, answer:nm(z)+" ("+el(z)[1]+")",
            why:TT("Count the electrons: {configOf} = {z}. A neutral atom has as many electrons as protons, so this is element {z2}, {el}.",{configOf:configOf(z).map(function(x){ return x[2]; }).join(" + "),z:z,z2:z,el:lc(z)})}; }}; }},
    s:{ ok:function(z){ return z<=94&&((STABLE[z]||[]).length>0||(NOTABLE[z]||[]).length>0); },
        param:function(z,r){ var st=STABLE[z]||[], nb=(NOTABLE[z]||[]).map(function(x){ return x[0]; }), ca=commonA(z);
          var pool=st.concat(nb).concat([ca+3,Math.max(z,ca-3)]).filter(function(a){ return nuclide(z,a).kind!=="unbound"; }); return pool[Math.floor(r()*pool.length)]; },
        make:function(z,a){ var info=nuclide(z,a); return {text:TT("Is {iso} stable or radioactive?",{iso:isoName(z,a)}), choices:[{v:"stable",label:TT("Stable")},{v:"radioactive",label:TT("Radioactive")}],
          check:function(v){ var right=info.kind==="stable"?"stable":"radioactive"; return {ok:v===right, answer:(right==="stable"?TT("Stable"):TT("Radioactive")), right:right, why:info.text}; }}; }},
    d:{ ok:function(z){ return el(z)[8]!=="gas"&&el(z)[9]&&z<=94; },
        param:function(z,r){ var l=ELEMENTS.filter(function(f){ return f[0]!==z&&f[8]!=="gas"&&f[9]&&f[0]<=94&&Math.abs(f[9]-el(z)[9])/Math.max(f[9],el(z)[9])>0.15; }); return l[Math.floor(r()*l.length)][0]; },
        make:function(z,w){ var a=[z,w].sort(function(x,y){ return x-y; }); return {text:TT("Which is denser?"), choices:a.map(function(k){ return {v:k,label:nm(k)}; }), tiles:a,
          check:function(v){ var big=el(z)[9]>el(w)[9]?z:w, small=big===z?w:z; return {ok:+v===big, answer:nm(big), right:big,
            why:TT("{El} packs {field} grams into each cubic centimeter; {el}, {field2}. Density depends on how heavy the atoms are and how tightly they stack.",{El:cap(lc(big)),field:fmt(el(big)[9],2),el:lc(small),field2:fmt(el(small)[9],2),z:big})}; }}; }},
    /* not helium (it needs pressure to freeze), carbon or arsenic (they turn
       straight to gas), astatine, francium, or fermium and up (predicted) */
    m:{ ok:function(z){ return el(z)[10]>0&&z<100&&[2,6,33,85,87].indexOf(z)<0; }, param:function(){ return 0; },
        make:function(z){ return {text:TT("Estimate: at what temperature does {el} melt, in °C?",{el:lc(z),z:z}), input:"text", hint:TT("Within 15 percent or 50 degrees counts"),
          check:function(v){ var K=el(z)[10], C0=K-273.15, g=parseFloat(normNum(v)), ok=isFinite(g)&&g>-273.15&&Math.abs(g-C0)<=Math.max(50,0.15*Math.abs(C0)), bp=el(z)[11];
            return {ok:ok, answer:fmt(C0,0)+" °C", why:TT("{El} melts at {C0} °C ({K} K). {K2}{K3}",{El:cap(lc(z)),C0:fmt(C0,0),K:fmt(K,0),K2:(K<298?(bp&&bp<298?TT("It boils at {bp} °C too, so on a normal day it is a gas.",{bp:fmt(bp-273.15,0)}):TT("That is below room temperature, so on a normal day it is a liquid.")):TT("So on a normal day it is a solid.")),K3:(K>2500?TT(" Only a few elements hold together this hard; their atoms share many electrons with their neighbors."):""),z:z})}; }}; }},
    /* lanthanum, lutetium, actinium, and lawrencium sit where tables disagree,
       and helium is s-block by its electrons but sits over the p-block */
    b:{ ok:function(z){ return [2,57,71,89,103].indexOf(z)<0; }, param:function(){ return 0; },
        make:function(z){ var bk=blockOf(z); return {text:TT("Which block of the periodic table is {el} in?",{el:lc(z),z:z}), choices:["s","p","d","f"].map(function(k){ return {v:k,label:TT("{k}-block",{k:k})}; }), tiles:[z],
          check:function(v){ return {ok:v===bk, answer:TT("{bk}-block",{bk:bk}), right:bk, why:TT("A block is named for the subshell being filled across that part of the table. {El}'s configuration is {cfg}, and it sits in the {bk}-block.",{El:cap(lc(z)),cfg:configStr(z,true),bk:bk,z:z})}; }}; }},
    v:{ ok:function(z){ return z<=86&&mainGroup(z); }, param:function(){ return 0; },
        make:function(z){ var n=valence(z); return {text:TT("How many electrons does {el} have in its outer shell?",{el:lc(z),z:z}), input:"numeric", hint:TT("Type a number"),
          check:function(v){ return {ok:+normNum(v)===n, answer:String(n), why:TT("{z} Its configuration is {cfg}; the outer shell is the one with the highest number.",{z:(z===2?TT("Helium's only shell holds two electrons, and it is full."):TT("{El} is in group {el}, so it has {n} outer {n, plural, one {electron} other {electrons}}.",{El:cap(lc(z)),el:el(z)[6],n:n,z:z})),cfg:configStr(z,true)})}; }}; }},
    i:{ ok:function(z){ return ION[z]!=null; }, param:function(){ return 0; },
        make:function(z){ var q=ION[z]; return {text:TT("Which ion does {el} usually form?",{el:lc(z),z:z}), choices:[1,2,3,-1,-2,-3].map(function(k){ return {v:String(k), label:(k>0?"+":"−")+Math.abs(k)}; }), tiles:[z],
          check:function(v){ var ng=z-q, nmA=anionName(z,q), ion=nmA?an(TT("{anion} ion",{anion:nmA})):TT("a {el} ion",{el:lc(z)}); return {ok:+v===q, answer:(q>0?"+":"−")+Math.abs(q), right:String(q),
            why:TT("{El} {q} {words} {q_n, plural, one {electron} other {electrons}} to become {ion}, {sym}{sup}. That leaves it with the same arrangement as {el}, a noble gas: {cfg}.",{El:cap(lc(z)),q:(q>0?"loses":"gains"),words:words(Math.abs(q)),ion:ion,sym:el(z)[1],sup:supNum(chargeStr(q)),el:lc(ng),cfg:configStr(ng,true),q_n:q,z:z})}; }}; }},
    o:{ ok:function(z){ var m=ORIGIN[z-1]; if(!m||z>94) return false; var k=Object.keys(m).sort(function(a,b){ return m[b]-m[a]; }); return m[k[0]]>=0.5&&k[0]!=="h"; },
        param:function(z,r){ return Math.floor(r()*1e6); },
        make:function(z,seed){ var m=ORIGIN[z-1], top=Object.keys(m).sort(function(a,b){ return m[b]-m[a]; })[0], r=rng(seed+z), others=Object.keys(ORIGIN_KINDS).filter(function(k){ return k!==top&&k!=="h"; });
          var pick=[top]; while(pick.length<4&&others.length){ pick.push(others.splice(Math.floor(r()*others.length),1)[0]); }
          pick.sort(function(a,b){ return ORIGIN_KINDS[a].name<ORIGIN_KINDS[b].name?-1:1; });
          return {text:TT("Where was most of the Solar System's {el} made?",{el:lc(z),z:z}), choices:pick.map(function(k){ return {v:k,label:ORIGIN_KINDS[k].name}; }), tiles:[z],
          check:function(v){ return {ok:v===top, answer:ORIGIN_KINDS[top].name, right:top,
            why:TT("About {m} percent of it was made by {top}. Switch the table to the Origins lens to see every element's sources. (Shares after Johnson, 2019.)",{m:Math.round(m[top]*100),top:(top==="b"?TT("the Big Bang"):ORIGIN_KINDS[top].name.charAt(0).toLowerCase()+ORIGIN_KINDS[top].name.slice(1))})}; }}; }},
    y:{ ok:function(z){ return el(z)[12]>=1700&&z<=103; },
        param:function(z,r){ var y=el(z)[12], l=ELEMENTS.filter(function(f){ return f[0]!==z&&f[12]>=1700&&f[0]<=103&&Math.abs(f[12]-y)>=15; }); return l[Math.floor(r()*l.length)][0]; },
        make:function(z,w){ var a=[z,w].sort(function(x,y){ return x-y; }); return {text:TT("Which was discovered first?"), choices:a.map(function(k){ return {v:k,label:nm(k)}; }), tiles:a,
          check:function(v){ var first=el(z)[12]<el(w)[12]?z:w, later=first===z?w:z; return {ok:+v===first, answer:nm(first), right:first,
            why:TT("{El} was identified in {el}{el2}; {el3} in {el4}{el5}.",{El:cap(lc(first)),el:el(first)[12],el2:(el(first)[13]?" ("+el(first)[13]+")":""),el3:lc(later),el4:el(later)[12],el5:(el(later)[13]?" ("+el(later)[13]+")":""),z:first})}; }}; }},
    a:{ ok:function(z){ return el(z)[14]>0&&z<=92; },
        param:function(z,r){ var x=el(z)[14], l=ELEMENTS.filter(function(f){ return f[0]!==z&&f[14]>0&&f[0]<=92&&Math.max(f[14],x)/Math.min(f[14],x)>=10; }); return l[Math.floor(r()*l.length)][0]; },
        make:function(z,w){ var a=[z,w].sort(function(x,y){ return x-y; }); return {text:TT("Which is more common in Earth's crust?"), choices:a.map(function(k){ return {v:k,label:nm(k)}; }), tiles:a,
          check:function(v){ var more=el(z)[14]>el(w)[14]?z:w, less=more===z?w:z; return {ok:+v===more, answer:nm(more), right:more,
            why:TT("{El} makes up about {ppm} of Earth's crust by mass; {el}, about {ppm2}.",{El:cap(lc(more)),ppm:ppm(el(more)[14]),el:lc(less),ppm2:ppm(el(less)[14]),z:more})}; }}; }},
    w:{ ok:function(z){ return MIS.some(function(m){ return m.ok(z); }); },
        param:function(z,r){ var ks=[]; MIS.forEach(function(m,i){ if(m.ok(z)) ks.push(i); }); return ks[Math.floor(r()*ks.length)]; },
        make:function(z,i){ var m=MIS[i]; if(!m||!m.ok(z)) throw new Error(TT("no such question")); return m.make(z); }}
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

  /* ------------------------------------------------------------ the math: pure helpers */
  /* The physics behind the Math tab, outside the labs' mount so the labs'
   self-test can check it: constants, hydrogen-like levels and orbitals,
   Slater's shielding term by term, and MathML builders. */
  var MK={a0:52.9177210544, Ry:13.605693122990, alpha:7.2973525643e-3, mec2:0.51099895069, hc:1239.841984, ke2:1.43996448,
    c:299792458, re:2.8179403205e-15, me:9.1093837139e-31, e:1.602176634e-19, kC:8.9875517862e9, G:6.67430e-11, mpkg:1.67262192595e-27,
    mp:938.27208943, mn:939.56542194, u:931.49410372, mpi:139.57039, hbarc:197.3269804, h:6.62607015e-34, mu:2.16, md:4.70, r0:1.2, rp:0.84075};
  /* ---- MathML, written by hand: small helpers keep it legible */
  function mi(s){ return '<mi>'+s+'</mi>'; } function mn_(s){ return '<mn>'+s+'</mn>'; } function mo(s){ return '<mo>'+s+'</mo>'; }
  function mrow(){ return '<mrow>'+[].slice.call(arguments).join('')+'</mrow>'; }
  function mfrac(a,b){ return '<mfrac><mrow>'+a+'</mrow><mrow>'+b+'</mrow></mfrac>'; }
  function msup(a,b){ return '<msup><mrow>'+a+'</mrow><mrow>'+b+'</mrow></msup>'; }
  function msub(a,b){ return '<msub><mrow>'+a+'</mrow><mrow>'+b+'</mrow></msub>'; }
  function msubsup(a,b,c){ return '<msubsup><mrow>'+a+'</mrow><mrow>'+b+'</mrow><mrow>'+c+'</mrow></msubsup>'; }
  function msqrt(a){ return '<msqrt>'+a+'</msqrt>'; }
  function MM(x){ return '<math display="block">'+x+'</math>'; }
  var Zeff_=msub(mi("Z"),mi("eff")), hbar_=mi("ℏ"), eq_=mo("="), pi_=mi("π");
  /* ---- element numbers */
  function outerN(z){ var n=0; configOf(z).forEach(function(x){ if(x[0]>n) n=x[0]; }); return n; }
  /* the outermost electron: highest n, then highest l. Usually an s or p
     electron; palladium (4d¹⁰, no 5s) is the one atom where it is a d */
  function outerSub(z){ var c=configOf(z), b=null; c.forEach(function(x){ if(!b||x[0]>b[0]||(x[0]===b[0]&&x[1]>b[1])) b=x; }); return b||c[c.length-1]; }
  function ionName(z){ if(z===1) return "hydrogen"; return el(z)[1]+supNum(z-1)+"⁺"; }
  function ionWords(z){ return z===1?TT("hydrogen, with its one electron"):TT("{el} with all but one electron stripped away ({ionName})",{el:lc(z),ionName:ionName(z),z:z}); }
  function nucMass(z){ if(z<=3) return HY[z].m; return commonA(z)*MK.u; }
  function redF(z){ return 1/(1+MK.mec2/nucMass(z)); }
  function bohrE(z,n){ return -MK.Ry*z*z*redF(z)/(n*n); }
  function bohrLine(z,nu,nl){ var E=MK.Ry*z*z*redF(z)*(1/(nl*nl)-1/(nu*nu)); return {E:E, w:MK.hc/E}; }
  function lightWord(w){ return w<10?"X-rays":(w<380?"ultraviolet":(w<=750?"visible "+(w<450?"violet":w<495?"blue":w<570?"green":w<590?"yellow":w<620?"orange":"red"):(w<1e6?"infrared":"radio"))); }
  function timeWords(s){ var u=[[1e-15,"femtoseconds"],[1e-12,"picoseconds"],[1e-9,"nanoseconds"],[1e-6,"microseconds"],[1e-3,"milliseconds"],[1,"seconds"]], k=u[0];
    u.forEach(function(x){ if(s>=x[0]) k=x; }); return fmt(s/k[0],s/k[0]<10?2:1)+" "+k[1]; }
  /* Slater's shielding for one electron, term by term. It must sum to what
     zEff() returns, and the labs' self-test checks that for every element. */
  function slaterParts(z,n,l){
    var g=slaterGroups(z), gi=-1, target=(l<=1)?(n+"sp"):(n+LET[l]), isSP=l<=1, parts=[];
    g.forEach(function(o,i){ if(o.key===target) gi=i; });
    if(gi<0) return {S:0, Zeff:z, parts:[]};
    g.forEach(function(o,i){ var c=o.count, f=0, cnt=c, name=o.l<=1?(o.n===1?"1s":TT("{n}s and {n2}p",{n:o.n,n2:o.n})):o.n+LET[o.l];
      if(i===gi){ cnt=c-1; f=(n===1&&l===0)?0.30:0.35; name=TT("the other {sub} electrons",{sub:name}); }
      else if(isSP){ if(o.n===n) f=0.35; else if(o.n===n-1) f=0.85; else if(o.n<n-1) f=1.00; }
      else if(i<gi) f=1.00;
      if(cnt>0&&f>0) parts.push({name:name, cnt:cnt, f:f, s:cnt*f}); });
    var S=parts.reduce(function(a,p){ return a+p.s; },0);
    return {S:S, Zeff:Math.max(1,z-S), parts:parts};
  }
  /* hydrogen-like orbitals: exact radial functions and real angular parts */
  function lag(k,a,x){ if(k===0) return 1; var L0=1, L1=1+a-x; for(var i=1;i<k;i++){ var L2=((2*i+1+a-x)*L1-(i+a)*L0)/(i+1); L0=L1; L1=L2; } return L1; }
  function fac(n){ var f=1; for(var i=2;i<=n;i++) f*=i; return f; }
  function radial(n,l,zr,r){ /* r in units of a0 */ var rho=2*zr*r/n, N=Math.sqrt(Math.pow(2*zr/n,3)*fac(n-l-1)/(2*n*fac(n+l)));
    return N*Math.exp(-rho/2)*Math.pow(rho,l)*lag(n-l-1,2*l+1,rho); }
  function legendre(l,m,x){ m=Math.abs(m); var pmm=1, s=Math.sqrt(Math.max(0,1-x*x)), f=1, i;
    for(i=1;i<=m;i++){ pmm*=-f*s; f+=2; } if(l===m) return pmm;
    var pm1=x*(2*m+1)*pmm; if(l===m+1) return pm1; var pll=0;
    for(i=m+2;i<=l;i++){ pll=(x*(2*i-1)*pm1-(i+m-1)*pmm)/(i-m); pmm=pm1; pm1=pll; } return pll; }
  function angular(l,m,th,ph){ var P=legendre(l,m,Math.cos(th)); return m===0?P:(m>0?P*Math.cos(m*ph):P*Math.sin(-m*ph)); }
  var OLET="spdfgh";
  function orbName(n,l,m){ var nm2=n+OLET[l]; if(l===1) return nm2+["y","z","x"][m+1]; if(l===2) return nm2+["xy","yz","z²","xz","x²−y²"][m+2]; return nm2+(m?" (m = "+m+")":""); }
  function extentA0(n,l,zr){ var rmax=1, pmax=0, i, r, p, last=1;
    for(i=1;i<=600;i++){ r=i*(4*n*n+8)/(600*zr); p=r*r*Math.pow(radial(n,l,zr,r),2); if(p>pmax) pmax=p; }
    for(i=1;i<=600;i++){ r=i*(4*n*n+8)/(600*zr); p=r*r*Math.pow(radial(n,l,zr,r),2); if(p>pmax*0.004) last=r; }
    return last*1.08; }

  function mspace(){ return '<mspace width="0.6em"></mspace>'; }
  function mtext(s){ return '<mtext>'+esc(s)+'</mtext>'; }
  /* the orbital one shell up and one step of l up, same m: it is dipole-
   allowed from this one, and close enough in size to show the sloshing */
function mixPartner(n,l,m){ if(n<5) return [n+1,l+1,m]; if(l===0) return [n-1,1,0]; var l2=l-1; return [n-1,l2,Math.max(-l2,Math.min(l2,m))]; }
function sig(x,d){ if(!x) return 0; var e=Math.floor(Math.log10(Math.abs(x)))-d+1, p=Math.pow(10,e); return Math.round(x/p)*p; }
function subNum(n){ return String(n).split("").map(function(c){ return "₀₁₂₃₄₅₆₇₈₉".charAt(+c); }).join(""); }

  /* ------------------------------------------------------------ sharing */
  /* links point at the website when the page itself isn't on the web (the
     desktop apps), so a link someone sends always opens for the person who gets it */
  var SITE="https://normansrule.github.io/atom/";
  function linkBase(){ try{ if(/^https?:$/.test(location.protocol)) return location.origin+location.pathname; }catch(e){} return SITE; }
  function fromHash(h){
    h=String(h||"").replace(/^#/,"");
    var b=/^build=(\d{1,3})-(\d{1,3})-(\d{1,3})$/.exec(h); if(b) return {build:[Math.min(118,+b[1]),Math.min(200,+b[2]),Math.min(118,+b[3])]};
    var c=/^challenge=(.+)$/.exec(h); if(c&&challengeParse(c[1])) return {challenge:challengeParse(c[1]).code};
    /* #lab=math&z=79&step=8: any lab, with what to show in it. Numbers are
       bounded, words are matched against a short list, anything else is dropped */
    var m=/^lab=([a-z]+)(?:&(.*))?$/.exec(h);
    if(m){ var LABS_OK={build:1,boxes:1,molecule:1,compare:1,trends:1,nuclides:1,hear:1,pes:1,sun:1,math:1,predict:1,calc:1,bench:1,lessons:1,you:1}, a={}, lab=m[1];
      if(!LABS_OK[lab]) return null;
      if(lab==="boxes"){ lab="build"; a.boxes=true; }
      a.lab=lab;
      (m[2]||"").split("&").forEach(function(kv){ var p=kv.split("="), k=p[0], v=decodeURIComponent(p[1]||"");
        if(k==="z"||k==="e"){ var n=+v; if(n>=0&&n<=118&&n===Math.floor(n)) a[k]=n; }
        else if(k==="a"){ var A=+v; if(A>=1&&A<=300&&A===Math.floor(A)) a.a=A; }
        else if(k==="step"){ var st=+v; if(st>=1&&st<=10) a.step=st-1; }
        else if(k==="pair"){ var pr=v.split("-").map(Number); if(pr.length===2&&pr.every(function(x){ return x>=1&&x<=118&&x===Math.floor(x); })) a.pair=pr; }
        else if(k==="prop"||k==="mol"||k==="calc"||k==="preset"){ if(/^[a-z0-9_-]{1,24}$/i.test(v)) a[k]=v; }
        else if(k==="line"){ if(/^\d{1,2},\d{1,2}$/.test(v)) a.line=v; } });
      if(a.lab==="build"&&a.z&&a.e==null) a.e=a.z;
      return {act:a}; }
    return null;
  }
  /* the link that opens a lab the way it is now */
  function labLink(a){ var q=[]; Object.keys(a).forEach(function(k){ if(k==="lab"||a[k]==null||a[k]===false) return; q.push(k+"="+encodeURIComponent(k==="step"?a[k]+1:(k==="pair"?a[k].join("-"):a[k]))); });
    return linkBase()+"#lab="+a.lab+(q.length?"&"+q.join("&"):""); }
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
  /* seven tabs; Explore and Experiment hold more than one lab, on a rail under
     the tabs. A lab is still named by its own id everywhere (show("hear"),
     the "lab:hear" event), whichever tab holds it. */
  var GROUPS=[["build",TT("Build"),["build"]],["explore",TT("Explore"),["compare","trends","nuclides","hear","pes","sun"]],["math",TT("The math"),["math"]],["predict",TT("Predict"),["predict"]],
    ["experiment",TT("Experiment"),["calc","bench"]],["lessons",TT("Lessons"),["lessons"]],["you",TT("You"),["you"]]];
  var PANE_NAME={math:TT("The math"),compare:TT("Compare"),trends:TT("Trends"),nuclides:TT("Nuclides"),hear:TT("Hear"),pes:TT("Electron energies"),sun:TT("The Sun"),calc:TT("Calculate"),bench:TT("Workbench")};
  var TABS=[]; GROUPS.forEach(function(g){ g[2].forEach(function(p){ TABS.push([p,PANE_NAME[p]||g[1],g[0]]); }); });
  function groupOf(p){ for(var i=0;i<GROUPS.length;i++) if(GROUPS[i][0]===p||GROUPS[i][2].indexOf(p)>=0) return GROUPS[i]; return null; }
  var GOALS=[
    {id:"h",    text:TT("Make a hydrogen atom"),                              test:function(p,n,e){ return p===1&&e===1; }},
    {id:"he4",  text:TT("Make an alpha particle: helium-4 with no electrons"),test:function(p,n,e){ return p===2&&n===2&&e===0; }},
    {id:"c14",  text:TT("Make carbon-14, the radiocarbon clock"),             test:function(p,n){ return p===6&&n===8; }},
    {id:"f",    text:TT("Make a fluoride ion, F⁻, the one in toothpaste"),    test:function(p,n,e){ return p===9&&e===10; }},
    {id:"na",   text:TT("Make a sodium ion, Na⁺, the one in table salt"),     test:function(p,n,e){ return p===11&&e===10; }},
    {id:"fe56", text:TT("Make iron-56, among the most tightly bound nuclei"), test:function(p,n){ return p===26&&n===30; }},
    {id:"u235", text:TT("Make uranium-235, the fuel of nuclear reactors"),    test:function(p,n){ return p===92&&n===143; }},
    {id:"drip", text:TT("Find the edge: add neutrons to oxygen until one won't stay"), test:function(p,n){ return p===8&&n>8&&nuclide(8,8+n).kind==="unbound"; }}
  ];
  var CALCS=[["light",TT("Light from an atom")],["decay",TT("Radioactive decay")],["emc",TT("E = mc²")],["molar",TT("Molar mass")]];
  var RULES={aufbau:TT("Lowest energy first (the Aufbau principle): fill 1s, 2s, 2p, 3s, 3p, 4s, 3d, 4p, 5s, 4d, 5p, in that order."),
    pauli:TT("Two to a box, opposite spins (the Pauli exclusion principle). The boxes keep this rule for you."),
    hund:TT("Spread out before pairing up (Hund's rule): in a subshell, every box gets one electron before any box gets a second.")};

  function mount(host,opt){
    opt=opt||{};
    var th=function(){ return opt.theme(); };
    var cur="build", curG="build", lastIn={}, built={}, Z=opt.element?opt.element():1, api={}, COL={};
    function ev(e){ if(opt.onEvent) opt.onEvent(e); }
    /* particle and lab colors are CSS custom properties (--lb-p, --lb-e, ...),
       so the canvases use exactly the colors the buttons and labels use */
    function col(k){ if(!COL[k]) COL[k]=(getComputedStyle(host).getPropertyValue("--lb-"+k)||"").trim()||th().ink2; return COL[k]; }
    host.classList.add("lb");
    host.innerHTML="<div class=\"lb-tabs\" role=\"tablist\" aria-label=\""+(TT("Labs"))+"\">"+((GROUPS.map(function(g,i){
        return "<button type=\"button\" role=\"tab\" id=\"lbTab-"+(((((g[0])))))+"\" data-lg=\""+(((((g[0])))))+"\" aria-controls=\"lbGroup-"+(((((g[0])))))+"\" aria-selected=\""+((((((i?"false":"true"))))))+"\" tabindex=\""+((((((i?-1:0))))))+"\">"+(((((g[1])))))+((((((g[0]==="you"?' <span class="lb-due" hidden></span>':''))))))+"</button>"; }).join('')))+"</div>"+((GROUPS.map(function(g,i){ return "<div class=\"lb-group\" role=\"tabpanel\" id=\"lbGroup-"+(((((g[0])))))+"\" data-lgp=\""+(((((g[0])))))+"\" aria-labelledby=\"lbTab-"+(((((g[0])))))+"\""+((((((i?' hidden':''))))))+">"+((((((g[2].length>1?"<div class=\"lb-subtabs lb-rail\" role=\"group\" aria-label=\""+(((g[1])))+"\">"+(((g[2].map(function(p,j){ return "<button type=\"button\" id=\"lbTab-"+(((((p)))))+"\" data-lt=\""+(((((p)))))+"\" aria-pressed=\""+((((((j?"false":"true"))))))+"\">"+(((((PANE_NAME[p])))))+"</button>"; }).join(''))))+"</div>":''))))))+(((((g[2].map(function(p,j){ return "<div class=\"lb-pane\" id=\"lbPane-"+(((((p)))))+"\" data-lp=\""+(((((p)))))+"\""+((((((j?' hidden':''))))))+">"+"</div>"; }).join(''))))))+"</div>"; }).join('')))+"<div class=\"lb-toast\" role=\"status\" aria-live=\"polite\">"+"</div>";
    var $=function(s){ return host.querySelector(s); }, pane=function(t){ return host.querySelector('[data-lp="'+t+'"]'); };
    var tabsEl=$(".lb-tabs");
    /* t is a lab (hear) or a tab (explore: the lab you had open in it last) */
    function show(t){
      var g=groupOf(t); if(!g) return; if(t===g[0]&&g[2].indexOf(t)<0) t=lastIn[g[0]]||g[2][0];
      if(!pane(t)) return; if(t!=="calc"&&C.listen){ C.listen=false; if(built.calc) calcForm(); } cur=t; curG=g[0]; lastIn[g[0]]=t;
      [].forEach.call(tabsEl.querySelectorAll('[role="tab"]'),function(b){ var on=b.getAttribute("data-lg")===g[0]; b.setAttribute("aria-selected",on?"true":"false"); b.tabIndex=on?0:-1; });
      [].forEach.call(host.querySelectorAll(".lb-group"),function(p){ p.hidden=p.getAttribute("data-lgp")!==g[0]; });
      [].forEach.call(host.querySelectorAll(".lb-rail [data-lt]"),function(b){ b.setAttribute("aria-pressed",b.getAttribute("data-lt")===t?"true":"false"); });
      [].forEach.call(host.querySelectorAll(".lb-pane"),function(p){ p.hidden=p.getAttribute("data-lp")!==t; });
      host.setAttribute("data-tab",t); host.setAttribute("data-group",g[0]);
      if(!built[t]){ built[t]=true; BUILD[t](pane(t)); }
      if(REFRESH[t]) REFRESH[t]();
      dirty=true; ev("lab:"+t);
    }
    tabsEl.addEventListener("click",function(e){ var b=e.target.closest("[data-lg]"); if(b) show(b.getAttribute("data-lg")); });
    tabsEl.addEventListener("keydown",function(e){ var order=GROUPS.map(function(g){ return g[0]; }), i=order.indexOf(curG), n=null;
      if(e.key==="ArrowRight"||e.key==="ArrowLeft") n=order[(i+(e.key==="ArrowRight"?1:order.length-1))%order.length];
      else if(e.key==="Home") n=order[0]; else if(e.key==="End") n=order[order.length-1];
      if(n){ e.preventDefault(); show(n); $('[data-lg="'+n+'"]').focus(); } });
    host.addEventListener("click",function(e){ var r=e.target.closest(".lb-rail [data-lt]"); if(r) show(r.getAttribute("data-lt")); });
    var toastT=0;
    /* the toast is always in the page and only its words change, so screen
       readers hear every one */
    function toast(msg){ var t=$(".lb-toast"); t.textContent=msg; clearTimeout(toastT); toastT=setTimeout(function(){ t.textContent=""; },4200); }
    function celebrate(got){ if(got&&got.length){ toast(TT("Badge earned: {got}",{got:got.map(function(b){ return b.name; }).join(", ")})); if(navigator.vibrate) try{ navigator.vibrate(18); }catch(e){} } }
    function refreshDue(){ var n=Progress.stats().due, b=$(".lb-due"); if(b){ b.hidden=!n; b.textContent=n?TT("{n} to review",{n:n}):""; } }
    Progress.on(function(kind){ refreshDue(); if(cur==="you"&&built.you) REFRESH.you(); if(kind==="sync"||kind==="reset"){ if(built.build) readBuild(); } });
    var dirty=true;
    function catC(e){ return opt.catColor?opt.catColor(e[5]):CAT[e[5]][1]; }
    function tile(z,big){ var e=el(z); return "<span class=\"lb-tile"+((((((big?' big':''))))))+"\" style=\"--cat:"+(((((catC(e))))))+"\"><i>"+(((((z)))))+"</i><b>"+(((((e[1])))))+"</b><span>"+(((((e[2])))))+"</span></span>"; }
    function shareBlock(link,code,what){
      return "<div class=\"lb-sharebox\">"+"<p class=\"lb-note\">"+(((((what)))))+"</p>"+"<div class=\"lb-linkrow\">"+"<input class=\"lb-input\" readonly value=\""+(((((esc(link))))))+"\" aria-label=\"Link to share\">"+"<button type=\"button\" class=\"lb-btn go\" data-copy>"+((((TT("Copy link")))))+"</button>"+"</div>"+((((((code?"<p class=\"lb-note\">"+TT("Or have them type this code in Predict: <b class=\"lb-code\">{code}</b>",{code:esc(code)})+"</p>":''))))))+"</div>";
    }
    host.addEventListener("click",function(e){ var c=e.target.closest("[data-copy]"); if(!c) return;
      var box=c.closest(".lb-sharebox"), inp=box&&box.querySelector("input"); if(!inp) return;
      copyText(inp.value,inp,function(ok){ toast(ok?TT("Link copied."):TT("Select the link and copy it.")); if(!ok){ inp.focus(); inp.select(); } }); });

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
        g.lineWidth=1; g.strokeStyle=T.ink3; g.globalAlpha=0.45; g.beginPath(); g.arc(cx,cy,r,0,6.2832); g.stroke(); g.globalAlpha=1;
        var spin=opt.calm?0:now/1000*(0.6/(k+1)), er=Math.max(3,Math.min(6,gap*0.18)), ec=col("e");
        for(var i=0;i<cnt;i++){ var ang=spin+i*6.2832/cnt+k*0.4, x=cx+Math.cos(ang)*r, y=cy+Math.sin(ang)*r;
          /* a short trail behind each electron along its orbit, then the
             electron as a small lit sphere with a glow */
          if(!opt.calm){ g.strokeStyle=ec; g.lineWidth=er*0.9; g.lineCap="round"; for(var q=1;q<=5;q++){ g.globalAlpha=0.16*(1-q/6); g.beginPath(); g.arc(cx,cy,r,ang-0.09*q,ang-0.09*(q-1)); g.stroke(); } g.globalAlpha=1; g.lineCap="butt"; }
          var hg=g.createRadialGradient(x,y,er*0.5,x,y,er*2.6); hg.addColorStop(0,ec); hg.addColorStop(1,"rgba(0,0,0,0)"); g.globalAlpha=0.28; g.fillStyle=hg; g.beginPath(); g.arc(x,y,er*2.6,0,6.2832); g.fill(); g.globalAlpha=1;
          var eg=g.createRadialGradient(x-er*0.35,y-er*0.35,er*0.1,x,y,er); eg.addColorStop(0,"#ffffff"); eg.addColorStop(0.35,ec); eg.addColorStop(1,ec);
          g.fillStyle=eg; g.beginPath(); g.arc(x,y,er,0,6.2832); g.fill(); }
      });
      g.font="500 14px Archivo, sans-serif";
      shells.forEach(function(cnt,k){ if(cnt){ g.fillStyle=T.ink2; label(g,TT("Shell {k}: {cnt, plural, one {# electron} other {# electrons}}",{k:(k+1),cnt:cnt}),16,28+k*22,T,"left"); } });
      if(s.a>0&&s.p<=118&&s.n<=200){
        var pk=packNucleus(s.p,s.n), A=pk.A, pos=pk.pos, ord=[], k, sc=0;
        for(k=0;k<A;k++){ ord.push(k); sc=Math.max(sc,Math.hypot(pos[3*k],pos[3*k+1])); }
        sc=sc>0?(nucR-5)/sc:0; ord.sort(function(i,j){ return pos[3*i+2]-pos[3*j+2]; });
        var r=Math.max(3,Math.min(13,(nucR-2)/Math.max(1,Math.pow(A,1/3))*0.95));
        /* the nucleons back to front: a lit sphere, the far ones shaded darker,
           and the shadow each nearer one casts where they touch */
        var zmin=1e9, zmax=-1e9; ord.forEach(function(i){ zmin=Math.min(zmin,pos[3*i+2]); zmax=Math.max(zmax,pos[3*i+2]); });
        var P2=ord.map(function(i){ return [cx+pos[3*i]*sc, cy+pos[3*i+1]*sc, pos[3*i+2], pk.kind[i]===1]; });
        P2.forEach(function(q,oi){ var x=q[0], y=q[1], pr=q[3], gr=g.createRadialGradient(x-r*0.35,y-r*0.4,r*0.08,x-r*0.1,y-r*0.1,r*1.1);
          gr.addColorStop(0,"#ffffff"); gr.addColorStop(0.18,pr?T.pF[0]:T.nF[0]); gr.addColorStop(0.7,pr?T.pF[1]:T.nF[1]); gr.addColorStop(1,T.rim||"rgba(0,0,0,.6)");
          g.fillStyle=gr; g.beginPath(); g.arc(x,y,r,0,6.2832); g.fill();
          if(zmax>zmin){ var sh=0.35*(1-(q[2]-zmin)/(zmax-zmin)); if(sh>0.02){ g.globalAlpha=sh; g.fillStyle="#000"; g.beginPath(); g.arc(x,y,r,0,6.2832); g.fill(); g.globalAlpha=1; } }
          if(r>4){ g.save(); g.beginPath(); g.arc(x,y,r,0,6.2832); g.clip();
            for(var oj=oi+1;oj<P2.length;oj++){ var t=P2[oj], dd=Math.hypot(t[0]-x,t[1]-y); if(dd>r*2.1) continue;
              var sg=g.createRadialGradient(t[0],t[1],r*0.9,t[0],t[1],r*1.45); sg.addColorStop(0,"rgba(0,0,0,0.38)"); sg.addColorStop(1,"rgba(0,0,0,0)");
              g.fillStyle=sg; g.beginPath(); g.arc(t[0],t[1],r*1.45,0,6.2832); g.fill(); }
            g.restore(); } });
      }
      g.fillStyle=T.ink2;
      if(s.p===0&&s.n===0&&s.e===0){ g.font="500 15px Archivo, sans-serif"; label(g,TT("Add a proton to begin"),cx,cy,T); }
      else if(s.p===0&&s.e>0){ label(g,TT("Electrons need a nucleus with protons to hold them"),cx,h-16,T); }
      else if(s.a+s.e<5){ label(g,TT("Drag a particle onto the atom, or press one below"),cx,h-16,T); }
      return !opt.calm&&s.e>0&&s.p>0;
    }
    function ionTitle(s){ var e=el(s.p), nmA=anionName(s.p,s.q); return s.q?(nmA?cap(TT("{anion} ion",{anion:nmA})):TT("{Name} ion",{Name:e[2]})):TT("{Name} atom",{Name:e[2]}); }
    function chargeText(q){ return q>0?"+"+q:(q<0?"−"+(-q):TT("0, neutral")); }
    /* everything a sighted reader sees updates at once; the one line a screen
       reader hears is written once the clicking stops */
    function readBuild(){
      var P=pane("build"); if(!P) return;
      var s=buildState(), info=s.info, p=s.p;
      [["p",p],["n",s.n],["e",s.e]].forEach(function(x){ var i=$('[data-in="'+x[0]+'"]'); if(i&&D.activeElement!==i) i.value=x[1]; });
      var tw=$(".lb-tilewrap"), h3=$(".lb-idt h3");
      if(p>=1&&p<=118){ var e=el(p), sym=e[1]+(s.q?supNum(chargeStr(s.q)):"");
        tw.innerHTML=tile(p,true); h3.innerHTML=esc(ionTitle(s))+' <span class="lb-sym">'+supNum(s.a)+esc(sym)+'</span>'; }
      else { tw.innerHTML=''; h3.textContent=TT("No element yet"); }
      var cvA=host.querySelector('[data-c="atom"]'); if(cvA) cvA.setAttribute("aria-label",TT("{p}: {p2, plural, one {# proton} other {# protons}}, {n} neutron{s}, {e} electron{s2}. {title}.",{p:(p>=1?cap(isoName(p,s.a)):TT("Particles")),p2:p,n:s.n,s:(s.n===1?"":"s"),e:s.e,s2:(s.e===1?"":"s"),title:info.title}));
      $(".lb-facts").innerHTML=
        "<div>"+"<dt>"+((TT("Mass number")))+"</dt>"+"<dd>"+(((s.a)))+"</dd>"+"</div>"+"<div>"+"<dt>"+((TT("Charge")))+"</dt>"+"<dd>"+(((chargeText(s.q))))+"</dd>"+"</div>"+"<div class=\"lb-tone-"+((((info.tone||"none"))))+"\">"+"<dt>"+((TT("Nucleus")))+"</dt>"+"<dd>"+(((esc(info.title))))+"</dd>"+"</div>"+"<div>"+"<dt>"+((TT("Electrons by shell")))+"</dt>"+"<dd>"+((((s.cfg.length?shellsFrom(s.cfg).join(", "):"none"))))+"</dd>"+"</div>";
      $(".lb-bsay").innerHTML=esc(info.text)+(s.cfg.length?' <span class="lb-cfg">'+(s.q?TT("The ion's electrons"):TT("Its electrons"))+': '+cfgText(s.cfg,true)+'.'+(s.q>0&&s.cfg.length&&p>20&&p<31?TT(" A positive ion gives up its outermost electrons first, so a transition metal loses its 4s electrons before any 3d ones."):"")+'</span>':'')+
        (Math.abs(s.q)>3&&p>0?TT(" <span class=\"lb-cfg\">Real atoms rarely gain or lose more than three electrons.</span>"):'');
      var cb=$('[data-b="common"]'); if(cb){ cb.textContent=p>=1&&p<=118?cap(TT("{isoWord} isotope",{isoWord:isoWord(p)})):TT("Most common isotope"); cb.disabled=!(p>=1&&p<=118); }
      [].forEach.call(P.querySelectorAll('[data-b="card"],[data-b="fall"],[data-b="share"]'),function(b){ b.disabled=!(p>=1&&p<=118); });
      /* the challenges fold away: the one to try next is always in view */
      var nDone=GOALS.filter(function(g){ return Progress.goal(g.id); }).length, nextG=GOALS.filter(function(g){ return !Progress.goal(g.id); })[0];
      $(".lb-goals").innerHTML="<summary>"+TT("<b>Challenges</b> <span>{nDone} of {length} done</span>{nextG}",{nDone:nDone,length:GOALS.length,nextG:(nextG?TT("<em>Next: {nextG}</em>",{nextG:esc(nextG.text)}):TT("<em>All done.</em>"))})+"</summary>"+"<ul>"+(GOALS.map(function(g){ var done=Progress.goal(g.id); return "<li class=\""+((((((done?"done":""))))))+"\"><span class=\"lb-mark\" role=\"img\" aria-label=\""+((((((done?"done":TT("not yet")))))))+"\">"+((((((done?"✓":"○"))))))+"</span> "+(((((esc(g.text))))))+"</li>"; }).join(''))+"</ul>";
      dirty=true;
    }
    function summary(){ var s=buildState(); return s.p>=1?TT("{ionTitle}, {iso}: {s}, charge {charge}.",{ionTitle:ionTitle(s),iso:isoName(s.p,s.a),s:s.info.title.toLowerCase(),charge:chargeText(s.q)}):(s.n||s.e?TT("{n} neutrons and {e} electrons, no element.",{n:s.n,e:s.e}):TT("Nothing built.")); }
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
      GOALS.forEach(function(g){ if(!Progress.goal(g.id)&&g.test(s.p,s.n,s.e)){ got=got.concat(Progress.mark("goal",s.p,g.id)); toast(TT("Challenge done: {g}",{g:g.text.replace(/^Make /,"").replace(/^./,function(c){ return c.toUpperCase(); })})); } });
      celebrate(got); readBuild();
    }
    function changed(){ B.touched=true; readBuild(); clearTimeout(buildTimer); buildTimer=setTimeout(settle,500); }
    function setB(k,v){ var max={p:118,n:200,e:118}[k]; B[k]=Math.max(0,Math.min(max,Math.round(+v||0))); changed(); }
    var BUILD={}, REFRESH={};
    BUILD.build=function(P){
      P.innerHTML="<div class=\"lb-subtabs\" role=\"group\" aria-label=\""+((TT("What to build")))+"\">"+"<button type=\"button\" data-bm=\"atom\" aria-pressed=\"true\">"+((TT("An atom")))+"</button>"+"<button type=\"button\" data-bm=\"boxes\" aria-pressed=\"false\">"+((TT("Orbital boxes")))+"</button>"+"<button type=\"button\" data-bm=\"molecule\" aria-pressed=\"false\">"+((TT("A molecule")))+"</button>"+"</div>"+"<div data-bmode=\"atom\">"+"<div class=\"lb-cols\">"+"<div class=\"lb-stagewrap\">"+"<canvas class=\"lb-cv lb-atomcv\" data-c=\"atom\" role=\"img\" aria-label=\""+((TT("The atom you are building")))+"\">"+"</canvas>"+"<div class=\"lb-tray\" role=\"group\" aria-label=\""+((TT("Particles: press one to add it, or drag it onto the atom")))+"\">"+"<button type=\"button\" class=\"lb-tok p\" data-add=\"p\">"+((TT("<b aria-hidden=\"true\">p⁺</b><span>+ proton</span>")))+"</button>"+"<button type=\"button\" class=\"lb-tok n\" data-add=\"n\">"+((TT("<b aria-hidden=\"true\">n</b><span>+ neutron</span>")))+"</button>"+"<button type=\"button\" class=\"lb-tok e\" data-add=\"e\">"+((TT("<b aria-hidden=\"true\">e⁻</b><span>+ electron</span>")))+"</button>"+"</div>"+"<details class=\"lb-goals\">"+"</details>"+"</div>"+"<div class=\"lb-side\">"+"<div class=\"lb-id\">"+"<span class=\"lb-tilewrap\"></span>"+"<div class=\"lb-idt\">"+"<h3>"+"</h3>"+"<p class=\"lb-sum\" role=\"status\">"+"</p>"+"<p class=\"lb-idlinks\">"+"<button type=\"button\" class=\"lb-link\" data-b=\"card\">"+((TT("Open its card")))+"</button>"+((((opt.fall?"<button type=\"button\" class=\"lb-link\" data-b=\"fall\">"+TT("Fall into it")+"</button>":''))))+"<button type=\"button\" class=\"lb-link\" data-b=\"share\" aria-expanded=\"false\">"+((TT("Share this atom")))+"</button>"+"</p>"+"</div>"+"</div>"+"<div class=\"lb-bshare\" hidden>"+"</div>"+"<div class=\"lb-counters\">"+((([["p",TT("Protons"),TT("decide the element")],["n",TT("Neutrons"),TT("decide the isotope")],["e",TT("Electrons"),TT("decide the charge")]].map(function(x){
            return "<div class=\"lb-ctr "+(((((x[0])))))+"\"><label for=\"lbIn-"+(((((x[0])))))+"\"><b>"+(((((x[1])))))+"</b><span>"+(((((x[2])))))+"</span>"+"</label>"+"<div class=\"lb-step\">"+"<button type=\"button\" data-step=\""+(((((x[0])))))+"\" data-d=\"-1\" aria-label=\"One fewer "+(((((x[1].toLowerCase().replace(/s$/,""))))))+"\">−"+"</button>"+"<input id=\"lbIn-"+(((((x[0])))))+"\" type=\"number\" inputmode=\"numeric\" min=\"0\" max=\""+((((((x[0]==="n"?200:118))))))+"\" data-in=\""+(((((x[0])))))+"\"><button type=\"button\" data-step=\""+(((((x[0])))))+"\" data-d=\"1\" aria-label=\"One more "+(((((x[1].toLowerCase().replace(/s$/,""))))))+"\">+"+"</button>"+"</div>"+"</div>"; }).join(''))))+"</div>"+"<dl class=\"lb-facts\">"+"</dl>"+"<p class=\"lb-say lb-bsay\">"+"</p>"+"<div class=\"lb-row\">"+"<button type=\"button\" class=\"lb-btn sm\" data-b=\"common\">"+((TT("Most common isotope")))+"</button>"+"<button type=\"button\" class=\"lb-btn sm\" data-b=\"neutral\">"+((TT("Make it neutral")))+"</button>"+"<button type=\"button\" class=\"lb-btn sm ghost\" data-b=\"clear\">"+((TT("Start over")))+"</button>"+"</div>"+"</div>"+"</div>"+"</div>"+"<div data-bmode=\"boxes\" hidden>"+"</div>"+"<div data-bmode=\"molecule\" hidden>"+"</div>";
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
            if(open) sb.innerHTML=shareBlock(TT("{linkBase}#build={p}-{n}-{e}",{linkBase:linkBase(),p:B.p,n:B.n,e:B.e}),"",TT("Anyone who opens this link gets this same atom in the Build lab: {summary}",{summary:summary()})); } }
      });
      P.addEventListener("input",function(e){ var i=e.target.closest("[data-in]"); if(i&&i.value!=="") setB(i.getAttribute("data-in"),i.value); });
      P.addEventListener("change",function(e){ var i=e.target.closest("[data-in]"); if(i) setB(i.getAttribute("data-in"),i.value); });
      /* drag a particle from the tray onto the atom: the main button or one
         finger only, and a cancelled touch leaves nothing behind */
      var drag=null, dragMoved=false;
      function endDrag(){ if(drag&&drag.ghost) drag.ghost.remove(); if(drag&&drag.raf) cancelAnimationFrame(drag.raf); drag=null; setTimeout(function(){ dragMoved=false; },0); }
      P.addEventListener("pointerdown",function(e){ var t=e.target.closest("[data-add]"); if(!t||!e.isPrimary||e.button>0) return; drag={k:t.getAttribute("data-add"),x:e.clientX,y:e.clientY,ghost:null}; dragMoved=false; });
      window.addEventListener("pointermove",function(e){ if(!drag||!e.isPrimary) return;
        if(!drag.ghost&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>6){ dragMoved=true; var gh=D.createElement("div"); gh.className="lb-ghost "+drag.k; gh.setAttribute("aria-hidden","true"); gh.textContent={p:"p⁺",n:"n",e:"e⁻"}[drag.k]; D.body.appendChild(gh); drag.ghost=gh; }
        if(drag.ghost){ drag.tx=e.clientX; drag.ty=e.clientY; if(opt.calm){ drag.ghost.style.left=e.clientX+"px"; drag.ghost.style.top=e.clientY+"px"; } else if(!drag.raf) ghostStep(); } });
      /* the particle you drag has a little mass: it follows the pointer on a
         spring, leaning into the direction of motion, and settles when you stop */
      function ghostStep(){ var d=drag; if(!d||!d.ghost){ return; }
        if(d.gx===undefined){ d.gx=d.tx; d.gy=d.ty; d.vx=0; d.vy=0; }
        d.vx=d.vx*0.72+(d.tx-d.gx)*0.22; d.vy=d.vy*0.72+(d.ty-d.gy)*0.22; d.gx+=d.vx; d.gy+=d.vy;
        var sp=Math.hypot(d.vx,d.vy), sq=Math.min(0.18,sp*0.012), ang=Math.atan2(d.vy,d.vx);
        d.ghost.style.left=d.gx+"px"; d.ghost.style.top=d.gy+"px";
        d.ghost.style.transform=TT("translate(-50%,-50%) rotate({ang}rad) scale({v},{v2}) rotate({v3}rad)",{ang:ang.toFixed(3),v:(1+sq).toFixed(3),v2:(1-sq).toFixed(3),v3:(-ang).toFixed(3)});
        if(sp>0.05||Math.hypot(d.tx-d.gx,d.ty-d.gy)>0.5) d.raf=requestAnimationFrame(ghostStep); else d.raf=0; }
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
      else if(m==="molecule"){ if(!MOL.built){ MOL.built=true; buildMol(P.querySelector('[data-bmode="molecule"]')); } }
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
    var SPIN=["empty",TT("one electron, spin up"),TT("two electrons, opposite spins")];
    function renderBoxes(){
      var P=pane("build").querySelector('[data-bmode="boxes"]'); if(!P||!OB.built) return;
      var rows=boxRows(OB.z).slice().reverse();
      P.querySelector(".lb-board").innerHTML=rows.map(function(r){ var k=r[0]+","+r[1], a=OB.occ[k];
        return "<div class=\"lb-orow\" data-l=\""+((((("spdf"[r[1]])))))+"\"><span class=\"lb-olab\">"+(((((subName(r))))))+"</span><div class=\"lb-oboxes\" role=\"group\" aria-label=\""+(((((subName(r))))))+" subshell\">"+(((((a.map(function(v,i){ return "<button type=\"button\" class=\"lb-box s"+(((((v)))))+"\" data-o=\""+(((((k)))))+","+(((((i)))))+"\" aria-label=\""+(((((subName(r))))))+" box "+((((((i+1))))))+": "+(((((SPIN[v])))))+"\"><span aria-hidden=\"true\">"+(((((["","↑","↑↓"][v])))))+"</span>"+"</button>"; }).join(''))))))+"</div>"+"</div>"; }).join('');
      P.querySelector(".lb-oid").innerHTML=(tile(OB.z,true))+"<div class=\"lb-idt\">"+"<h3>"+TT("Fill the boxes for {esc}",{esc:esc(lc(OB.z))})+"</h3>"+"<p class=\"lb-ocount\">"+TT("{placed} of {z} electrons placed",{placed:placed(),z:OB.z})+"</p>"+"</div>";
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
      if(!rCount) msg.push(tot<z?TT("You have placed {tot} electrons; a neutral {el} atom has {z}.",{tot:tot,el:lc(z),z:z}):TT("You have placed {tot} electrons, {tot2} more than a neutral {el} atom has.",{tot:tot,tot2:(tot-z),el:lc(z),z:z}));
      if(rCount&&!rFill) msg.push((firstGap?TT("The {firstGap} subshell should hold more before electrons go higher. ",{firstGap:firstGap}):TT("Some electrons are in the wrong subshell. "))+(EXCEPT[z]?TT("{El} is one of the exceptions to the filling order: {EXCEPT_WHY}.",{El:cap(lc(z)),EXCEPT_WHY:(EXCEPT_WHY[z]||TT("two of its subshells are very close in energy")),z:z}):""));
      if(!rHund){ var hb=hundBad.split(","); msg.push(TT("In {hb}{v}, one box has a pair while another is still empty. Give each box one electron first.",{hb:hb[0],v:"spdf"[+hb[1]]}));
        if(rCount&&rFill) msg.push(TT("The counts are right, so only Hund's rule is left.")); }
      return {ok:ok, rules:[[TT("Right number of electrons"),rCount],[TT("Lowest energy first"),rFill],[TT("Spread out before pairing up"),rHund]], msg:msg};
    }
    function buildBoxes(P){
      P.innerHTML="<div class=\"lb-cols boxes\">"+"<div class=\"lb-boardwrap\">"+"<div class=\"lb-board\">"+"</div>"+"<p class=\"lb-note\">"+TT("Higher boxes have more energy. Press a box to add an electron: once for one, twice for a pair, three times to empty it.")+"</p>"+"</div>"+"<div class=\"lb-side\">"+"<div class=\"lb-id lb-oid\">"+"</div>"+"<ul class=\"lb-rules\">"+"<li data-r=\"aufbau\">"+(esc(RULES.aufbau))+"</li>"+"<li data-r=\"pauli\">"+(esc(RULES.pauli))+"</li>"+"<li data-r=\"hund\">"+(esc(RULES.hund))+"</li>"+"</ul>"+"<div class=\"lb-row\">"+"<button type=\"button\" class=\"lb-btn go\" data-ob=\"check\">"+TT("Check my boxes")+"</button>"+"<button type=\"button\" class=\"lb-btn\" data-ob=\"show\">"+TT("Show me")+"</button>"+"<button type=\"button\" class=\"lb-btn\" data-ob=\"next\">"+TT("Another element")+"</button>"+"<button type=\"button\" class=\"lb-btn\" data-ob=\"mine\">"+TT("Use the atom I built")+"</button>"+"<button type=\"button\" class=\"lb-btn ghost\" data-ob=\"clear\">"+TT("Clear")+"</button>"+"</div>"+"<div class=\"lb-fb lb-ofb\" role=\"status\">"+"</div>"+"</div>"+"</div>";
      P.addEventListener("click",function(e){
        var bx=e.target.closest("[data-o]"), b=e.target.closest("[data-ob]");
        if(bx){ var p=bx.getAttribute("data-o").split(","), k=p[0]+","+p[1], i=+p[2]; OB.occ[k][i]=(OB.occ[k][i]+1)%3;
          var v=OB.occ[k][i]; bx.className="lb-box s"+v; bx.firstChild.textContent=["","↑","↑↓"][v]; bx.setAttribute("aria-label",TT("{subName} box {i}: {SPIN}",{subName:subName([+p[0],+p[1]]),i:(i+1),SPIN:SPIN[v]}));
          P.querySelector(".lb-ocount").textContent=TT("{placed} of {z} electrons placed",{placed:placed(),z:OB.z}); var fb=P.querySelector(".lb-ofb"); fb.className="lb-fb lb-ofb"; fb.innerHTML=""; }
        if(!b) return; var k2=b.getAttribute("data-ob");
        if(k2==="check"){ var r=boxCheck(), fb2=P.querySelector(".lb-ofb");
          fb2.className="lb-fb lb-ofb "+(r.ok?"ok":"bad");
          fb2.innerHTML='<p class="lb-verdict"><span aria-hidden="true">'+(r.ok?"✓":"✗")+'</span> '+(r.ok?TT("Right. {esc} is {esc2}.",{esc:esc(cap(lc(OB.z))),esc2:esc(configStr(OB.z,true))}):TT("Not yet."))+'</p>'+
            '<ul class="lb-rulecheck">'+r.rules.map(function(x){ return "<li class=\""+((((((x[1]?"ok":"bad"))))))+"\"><span class=\"lb-mark\" role=\"img\" aria-label=\""+((((((x[1]?"kept":"broken"))))))+"\">"+((((((x[1]?"✓":"✗"))))))+"</span> "+(((((esc(x[0]))))))+"</li>"; }).join('')+'</ul>'+
            r.msg.map(function(m){ return '<p>'+esc(m)+'</p>'; }).join('');
          if(r.ok){ var got=Progress.mark("orbital",OB.z); celebrate(got); ev("orbital:"+OB.z); } }
        if(k2==="show"){ boxTarget(OB.z); configOf(OB.z).forEach(function(x){ var a=OB.occ[x[0]+","+x[1]]; if(!a) return; var m=a.length, c=x[2];
            for(var i=0;i<m;i++) a[i]=c>=m+i+1?2:(c>i?1:0); }); renderBoxes(); }
        if(k2==="clear") boxTarget(OB.z);
        if(k2==="next"){ var nz=OB.z; while(nz===OB.z) nz=1+Math.floor(Math.random()*36); boxTarget(nz); }
        if(k2==="mine"){ if(B.p>=1&&B.p<=54) boxTarget(B.p); else toast(TT("Build an element up to xenon (54) first; past it the boxes get too many to fill by hand.")); }
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
      var m=[["mix",TT("Mixed")],["this",TT("About {Name}",{Name:nm(Z),z:Z})],["review",TT("Review{st}",{st:(st.due?" ("+st.due+")":"")})]];
      if(CH) m.push(["challenge",TT("Challenge")]);
      return m.map(function(x){ return "<button type=\"button\" data-qm=\""+(((((x[0])))))+"\" aria-pressed=\""+((((((Qs.mode===x[0]))))))+"\""+((((((x[0]==="review"&&!st.due?' disabled':''))))))+">"+(((((esc(x[1]))))))+"</button>"; }).join('')+
        '<span class="lb-score">'+(Qs.mode==="challenge"?TT("Question {v} of {CH} · {CH2} right",{v:Math.min(CH.i+1,CH.keys.length),CH:CH.keys.length,CH2:CH.results.filter(function(r){ return r.ok; }).length}):TT("{Qs}{right} right so far",{Qs:(Qs.streak?TT("Streak {streak} · ",{streak:Qs.streak}):""),right:st.right}))+'</span>';
    }
    function renderModes(){ var P=pane("predict"); if(P) P.querySelector(".lb-qmodes").innerHTML=modesHTML(); }
    function renderQ(focus){
      var P=pane("predict"), q=Qs.q; renderModes(); P.querySelector(".lb-qcard").hidden=false; P.querySelector(".lb-qsum").hidden=true;
      if(!q){ P.querySelector(".lb-qtext").textContent=TT("No question fits those choices. Try Mixed."); P.querySelector(".lb-qans").innerHTML=""; P.querySelector(".lb-qvis").innerHTML=""; return; }
      P.querySelector(".lb-qtext").textContent=q.text;
      P.querySelector(".lb-qvis").innerHTML=(q.tiles||[q.z]).map(function(z){ return tile(z,false); }).join('');
      var a=P.querySelector(".lb-qans");
      if(q.choices) a.innerHTML='<div class="lb-choices">'+q.choices.map(function(c){ return "<button type=\"button\" class=\"lb-choice\" data-ch=\""+(((esc(c.v))))+"\">"+(((esc(c.label))))+"</button>"; }).join('')+'</div>';
      else a.innerHTML="<form class=\"lb-qform\">"+"<input id=\"lbAns\" class=\"lb-input\" aria-label=\"Your answer\" autocomplete=\"off\" autocapitalize=\"off\" spellcheck=\"false\" inputmode=\""+((((((q.input==="numeric"?"numeric":"text"))))))+"\" placeholder=\""+(((((esc(q.hint||""))))))+"\">"+"<button type=\"submit\" class=\"lb-btn go\">"+((((TT("Check")))))+"</button>"+"</form>";
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
      fb.innerHTML='<p class="lb-verdict"><span aria-hidden="true">'+(r.ok?"✓":"✗")+'</span> '+(r.ok?TT("Right."):TT("Not quite. The answer is {r}.",{r:esc(r.answer)}))+'</p><p>'+esc(r.why)+'</p>'+
        (r.ok||Qs.mode==="challenge"?'':"<p class=\"lb-later\">"+TT("This question will come back in a few minutes, then later in the week.")+"</p>");
      [].forEach.call(P.querySelectorAll("[data-ch]"),function(b){ var cv=b.getAttribute("data-ch"); b.disabled=true;
        if(cv===String(r.right)) b.classList.add("ok"); else if(cv===String(v)) b.classList.add("bad"); });
      var inp=P.querySelector("#lbAns"); if(inp) inp.readOnly=true;
      var nx=P.querySelector(".lb-next"); nx.textContent=Qs.mode==="challenge"&&CH.i>=CH.keys.length?TT("See my score"):TT("Next question"); nx.hidden=false; nx.focus({preventScroll:true});
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
      return ((forPrint?"<h1>"+TT("Atom challenge")+"</h1>"+"<p>"+TT("Code {CH} · {esc}",{CH:esc(CH.ch.code),esc:esc(new Date().toLocaleDateString())})+"</p>":''))+"<p class=\"lb-tscore\">"+TT("<b>{right} of {CH}</b> right",{right:right,CH:CH.results.length})+"</p>"+"<ol class=\"lb-results\">"+(CH.results.map(function(r){
          return "<li class=\""+((((((r.ok?"ok":"bad"))))))+"\"><span class=\"lb-mark\" role=\"img\" aria-label=\""+((((((r.ok?"right":"wrong"))))))+"\">"+((((((r.ok?"✓":"✗"))))))+"</span> "+(((((esc(r.text))))))+((((((r.ok?'':TT(" <i>The answer: {r}</i>",{r:esc(r.answer)})))))))+"</li>"; }).join(''))+"</ol>";
    }
    function renderSummary(focus){
      var P=pane("predict"), right=CH.results.filter(function(r){ return r.ok; }).length, s=P.querySelector(".lb-qsum");
      var got=Progress.mark("challenge",0,{code:CH.ch.code, score:right, n:CH.results.length}); celebrate(got); ev("challenge:done");
      P.querySelector(".lb-qcard").hidden=true; s.hidden=false;
      s.innerHTML="<h3 class=\"lb-h\" tabindex=\"-1\">"+TT("Challenge finished")+"</h3>"+(resultsHTML(false))+"<div class=\"lb-row\">"+"<button type=\"button\" class=\"lb-btn go\" data-qx=\"print\">"+TT("Print my results")+"</button>"+"<button type=\"button\" class=\"lb-btn\" data-qx=\"again\">"+TT("Try it again")+"</button>"+"<button type=\"button\" class=\"lb-btn ghost\" data-qx=\"leave\">"+TT("Back to practice")+"</button>"+"</div>";
      renderModes(); if(focus) try{ s.querySelector("h3").focus({preventScroll:true}); }catch(e){}
    }
    function makerHTML(){
      var allTypes=Object.keys(QLABEL);
      return "<h3 class=\"lb-h\">"+((TT("Make a challenge")))+"</h3>"+"<p class=\"lb-note\">"+((TT("Pick the elements and the kinds of questions. Everyone who opens the link, or types the code, gets the same questions in the same order. Nothing is sent anywhere: the questions are rebuilt from the code itself.")))+"</p>"+"<label class=\"lb-field\">"+((TT("Elements")))+"<input class=\"lb-input\" data-mk=\"els\" value=\"H He Li C N O Na Fe\" autocomplete=\"off\" spellcheck=\"false\" placeholder=\""+((TT("Symbols or names, with spaces or commas between them")))+"\">"+"</label>"+"<div class=\"lb-chips\">"+"<button type=\"button\" data-mkf=\"first20\">"+((TT("The first 20")))+"</button>"+"<button type=\"button\" data-mkf=\"row2\">"+((TT("Lithium to neon")))+"</button>"+"<button type=\"button\" data-mkf=\"explored\">"+((TT("Ones I have explored")))+"</button>"+"<button type=\"button\" data-mkf=\"metals\">"+((TT("Metals you use every day")))+"</button>"+"</div>"+"<label class=\"lb-field\">"+((TT("Number of questions")))+"<select data-mk=\"n\">"+((([5,10,15,20].map(function(n){ return "<option"+((((n===10?' selected':''))))+">"+(((n)))+"</option>"; }).join(''))))+"</select>"+"</label>"+"<fieldset class=\"lb-types\">"+"<legend>"+((TT("Kinds of questions")))+"</legend>"+(((allTypes.map(function(k){ return "<label>"+"<input type=\"checkbox\" data-mkt=\""+(((k)))+"\""+(((("nqcsbvi".indexOf(k)>=0?' checked':''))))+"> "+(((esc(QLABEL[k]))))+"</label>"; }).join(''))))+"</fieldset>"+"<div class=\"lb-row\">"+"<button type=\"button\" class=\"lb-btn go\" data-mk=\"make\">"+((TT("Make the challenge")))+"</button>"+"</div>"+"<div class=\"lb-mkout\">"+"</div>"+"<form class=\"lb-codeform\">"+"<label class=\"lb-field\">"+((TT("Have a code or a link?<span class=\"lb-pair\">")))+"<input class=\"lb-input\" data-mk=\"code\" autocomplete=\"off\" spellcheck=\"false\" autocapitalize=\"off\" placeholder=\"A1. ...\">"+"<button type=\"submit\" class=\"lb-btn\">"+((TT("Start it")))+"</button>"+"</span>"+"</label>"+"</form>";
    }
    BUILD.predict=function(P){
      P.innerHTML="<div class=\"lb-quiz\">"+"<div class=\"lb-qmodes\" role=\"group\" aria-label=\""+((TT("Which questions")))+"\">"+"</div>"+"<div class=\"lb-qcard\">"+"<div class=\"lb-qvis\">"+"</div>"+"<p class=\"lb-qtext\" aria-live=\"polite\">"+"</p>"+"<div class=\"lb-qans\">"+"</div>"+"<div class=\"lb-fb\" aria-live=\"polite\">"+"</div>"+"<button type=\"button\" class=\"lb-btn go lb-next\" hidden>"+((TT("Next question")))+"</button>"+"</div>"+"<div class=\"lb-qsum\" hidden>"+"</div>"+"<div class=\"lb-row\">"+"<button type=\"button\" class=\"lb-btn ghost\" data-qx=\"make\" aria-expanded=\"false\">"+((TT("Make a challenge, or enter a code")))+"</button>"+"</div>"+"<div class=\"lb-maker\" hidden>"+(((makerHTML())))+"</div>"+"<p class=\"lb-note\">"+((TT("Questions you miss come back after ten minutes, then a day later, then less and less often as you keep getting them right. Get three different questions right about one element and you have mastered it.")))+"</p>"+"</div>";
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
          if(which==="explored"){ list=Object.keys(Progress.data().seen).map(Number).sort(function(a,b){ return a-b; }); if(!list.length){ toast(TT("Open a few element cards first.")); return; } }
          inp.value=list.map(function(z){ return el(z)[1]; }).join(" "); }
        if(mk){ var raw=P.querySelector('[data-mk="els"]').value.split(/[\s,;]+/).filter(Boolean), zs=[], bad=[];
          raw.forEach(function(s){ var z=nameOnly(s); if(z&&zs.indexOf(z)<0) zs.push(z); else if(!z) bad.push(s); });
          var types=[].map.call(P.querySelectorAll("[data-mkt]:checked"),function(b){ return b.getAttribute("data-mkt"); }), out=P.querySelector(".lb-mkout");
          if(bad.length){ out.innerHTML="<p class=\"lb-say lb-err\">"+TT("I don't know {esc}. Use element symbols or names.",{esc:esc(bad.join(", "))})+"</p>"; return; }
          if(!zs.length||!types.length){ out.innerHTML="<p class=\"lb-say lb-err\">"+TT("Pick at least one element and one kind of question.")+"</p>"; return; }
          var code=challengeMake(zs,+P.querySelector('[data-mk="n"]').value,types), ch=challengeParse(code), keys=challengeKeys(ch);
          if(!keys.length){ out.innerHTML="<p class=\"lb-say lb-err\">"+TT("None of those kinds of questions fit those elements. Add elements or kinds.")+"</p>"; return; }
          out.innerHTML=(shareBlock(linkBase()+"#challenge="+code,code,TT("{length} questions about {length2} element{zs}. Send the link, or read out the code.",{length:keys.length,length2:zs.length,zs:(zs.length>1?"s":"")})))+"<div class=\"lb-row\">"+TT("<button type=\"button\" class=\"lb-btn\" data-mk=\"start\" data-code=\"{code}\">Try it here",{code:esc(code)})+"</button>"+"</div>"; }
        var st=e.target.closest('[data-mk="start"]'); if(st) challengeStart(st.getAttribute("data-code"));
      });
      P.addEventListener("submit",function(e){ e.preventDefault();
        if(e.target.closest(".lb-codeform")){ var ci=P.querySelector('[data-mk="code"]'); if(!challengeStart(ci.value)){ ci.setAttribute("aria-invalid","true"); toast(TT("That isn't a challenge code Atom can read. Codes start with A1.")); } else ci.removeAttribute("aria-invalid"); return; }
        var i=P.querySelector("#lbAns"); if(i&&i.value.trim()) answerQ(i.value); });
      nextQuestion();
    };
    REFRESH.predict=function(){ renderModes(); };

    /* ======================================================== Explore: shared */
    function grpOf(z){ return el(z)[6]; }
    function perOf(z){ return el(z)[7]; }
    function isMetal(z){ return !!METAL[el(z)[5]]; }
    function enOf(z){ return EN[z-1]; }
    function radOf(z){ return z<=96?ARAD[z-1]:null; }
    /* Slater's charge felt by the outermost electron (s and p share a value in
       his rules; palladium's is a 4d), which sets size and how tightly the
       atom holds on */
    function zeffOf(z){ var b=outerSub(z); return zEff(z,b[0],b[1]); }
    function cK(K){ return K==null?null:K; }
    function tempTxt(K,z){ if(z===2) return TT("never freezes at normal pressure"); if(z===6||z===33) return TT("turns straight to gas at {field} °C",{field:fmt(el(z)[11]-273.15,0)}); return K==null?"unknown":fmt(K-273.15,0)+" °C"; }
    var dlId="lbEls"+Math.floor(Math.random()*1e6);
    function elDatalist(){ return "<datalist id=\""+(((dlId)))+"\">"+(((ELEMENTS.map(function(e){ return "<option value=\""+(((esc(e[2]))))+"\">"+(((e[1])))+" · "+(((e[0])))+"</option>"; }).join(''))))+"</datalist>"; }

    /* ======================================================== Compare */
    var CMP={a:0,b:0,follow:true};
    /* the natural partner: the element below in the same column, else above, else the next one */
    function partner(z){ var g=grpOf(z), p=perOf(z), i;
      if(g){ for(i=1;i<=118;i++) if(grpOf(i)===g&&perOf(i)===p+1) return i; for(i=1;i<=118;i++) if(grpOf(i)===g&&perOf(i)===p-1) return i; }
      return z<118?z+1:z-1; }
    var CROWS=[
      {k:"place", label:TT("Place in the table"), txt:function(z){ var e=el(z); return TT("{e}, period {e2}",{e:(e[6]?TT("Group {e}",{e:e[6]}):(e[5]==="ln"?TT("Lanthanides"):TT("Actinides"))),e2:e[7]}); }},
      {k:"cat",   label:TT("Family"), txt:function(z){ return CAT[el(z)[5]][0]; }},
      {k:"cfg",   label:TT("Electrons"), html:function(z){ return configStr(z).replace(/([spdf])(\d+)/g,"$1<sup>$2</sup>"); }},
      {k:"mass",  label:TT("Atomic mass"), v:function(z){ return el(z)[3]; }, txt:function(z){ var e=el(z); return (e[4]?"["+e[3]+"]":fmt(e[3],3))+" u"; }},
      {k:"rad",   label:TT("Atomic radius"), v:radOf, txt:function(z){ var r=radOf(z); return r?r+" pm":TT("not measured"); }},
      {k:"zeff",  label:TT("Pull on the outer electron"), v:zeffOf, html:function(z){ return TT("Z<sub>eff</sub> = {fmt}",{fmt:fmt(zeffOf(z),2)}); }},
      {k:"en",    label:TT("Electronegativity"), v:enOf, txt:function(z){ var v=enOf(z); return v==null?TT("no value"):fmt(v,2); }},
      {k:"ie",    label:TT("Energy to remove an electron"), v:function(z){ return IE1[z-1]; }, txt:function(z){ var v=IE1[z-1]; return v==null?TT("not measured"):(IE_EST[z]?"about ":"")+fmt(v,2)+" eV"; }},
      {k:"dens",  label:TT("Density"), v:function(z){ return el(z)[9]; }, txt:function(z){ var d=el(z)[9]; return d==null?"unknown":TT("{d} g/cm³",{d:sci(d,3)}); }},
      {k:"melt",  label:TT("Melts at"), v:function(z){ return z===2||z===6||z===33?null:el(z)[10]; }, txt:function(z){ return tempTxt(el(z)[10],z); }},
      {k:"boil",  label:TT("Boils at"), v:function(z){ return z===6||z===33?null:el(z)[11]; }, txt:function(z){ return z===6||z===33?TT("(no liquid at normal pressure)"):tempTxt(el(z)[11]); }},
      {k:"crust", label:TT("In Earth's crust"), v:function(z){ var c=el(z)[14]; return c>0?c:null; }, log:true, txt:function(z){ var c=el(z)[14]; return c>0?sci(c,2)+" ppm":TT("almost none"); }},
      {k:"year",  label:TT("Discovered"), txt:function(z){ var e=el(z), y=e[12]; return y==null||y<0?TT("in ancient times"):String(y); }}
    ];
    /* the one-paragraph reading of the pair: how they sit, what that means */
    function rowsWord(n){ return n===1?TT("one row"):TT("{n} rows",{n:words(n)}); }
    function shellsWord(n){ return n===1?TT("a shell"):TT("{n} shells",{n:words(n)}); }
    function cmpSay(a,b){
      var A=el(a), Bb=el(b), s=[], ng=A[5]==="ng"||Bb[5]==="ng";
      if(a===b) return TT("That is the same element twice. Pick a different second element.");
      var ia=IE1[a-1], ib=IE1[b-1];
      if(A[6]&&A[6]===Bb[6]){
        var up=A[7]<Bb[7]?a:b, lo=up===a?b:a, dp=Math.abs(A[7]-Bb[7]), H=a===1||b===1, He=a===2||b===2;
        if(H) s.push(TT("Hydrogen sits at the top of group 1 because it has one outer electron, like {el}, but it is a nonmetal and behaves very differently from the alkali metals.",{el:lc(lo),z:lo}));
        else if(He) s.push(TT("Helium sits with the noble gases because its only shell is full, though it has two outer electrons where {el} has eight.",{el:lc(lo),z:lo}));
        else s.push(TT("{El} and {el} are in the same column, group {A}, so they have the same number of outer electrons and tend to react alike.",{El:cap(lc(a)),el:lc(b),A:A[6],z:a}));
        var li=IE1[lo-1], ui=IE1[up-1];
        s.push(TT("{El} is {rowsWord} lower, so its outer electrons are {shellsWord} farther out{li}",{El:cap(lc(lo)),rowsWord:rowsWord(dp),shellsWord:shellsWord(dp),li:(li!=null&&ui!=null?(li<ui?TT(", and they are held less tightly."):TT(". Even so, {el} holds its outer electron more tightly ({li} eV against {ui} eV): in heavy atoms the poorly shielding inner d and f electrons, and the effects of relativity, pull the outer ones in.",{el:lc(lo),li:fmt(li,2),ui:fmt(ui,2)})):"."),z:lo}));
      } else if(A[7]===Bb[7]){
        var left=A[6]&&Bb[6]?(A[6]<Bb[6]?a:b):(a<b?a:b), right=left===a?b:a, rl=radOf(left), rr=radOf(right), il=IE1[left-1], ir=IE1[right-1];
        s.push(TT("{El} and {el} are in the same row, period {A}, so their outer electrons fill the same shell, and {el2}, farther along, has more protons pulling on it.",{El:cap(lc(a)),el:lc(b),A:A[7],el2:lc(right),z:a}));
        var bits=[], dd=el(left)[5]==="tm"&&el(right)[5]==="tm", easier=il!=null&&ir!=null&&ir<il;
        if(rl&&rr&&!ng) bits.push(rr<rl?TT("its atoms are smaller"):(rr===rl?TT("its atoms are about the same size"):TT("its atoms are a little larger")));
        if(il!=null&&ir!=null) bits.push(ir>il?TT("it holds its outer electron tighter"):TT("its outer electron is easier to remove"));
        /* why the outer electron of the one farther along can be easier to remove */
        var why="";
        if(easier&&!dd){ var pc=0, pn=0; configOf(right).forEach(function(x){ if(x[1]===1&&x[0]>=pn){ pn=x[0]; pc=x[2]; } });
          why=pc===1?TT(": that electron is the first in a new p subshell, a little higher in energy"):(pc===4?TT(": that electron shares a p orbital with another, and their repulsion makes it easier to pull off"):TT(": a quirk of how its subshells fill")); }
        if(bits.length) s.push(TT("Here {bits}{dd}",{bits:bits.join(easier&&!dd?TT(", but "):TT(" and ",{})),dd:(dd?TT(". Across the transition metals the new electrons go into an inner d shell, so size and grip change only a little."):why+".")}));
      } else s.push(TT("{El} and {el} share neither a row nor a column.",{El:cap(lc(a)),el:lc(b),z:a}));
      var ra=radOf(a), rb=radOf(b), lanth=A[6]&&A[6]===Bb[6]&&A[6]>=3&&A[6]<=12&&Math.min(A[7],Bb[7])===5&&Math.max(A[7],Bb[7])===6;
      /* noble gas radii are calculated, the rest come from bonds, so they aren't compared */
      if(lanth){ var hv=A[7]>Bb[7]?a:b; s.push(TT("Despite the extra shell, {el}'s atoms are about the same size: the 14 lanthanides before it pull the shells in, the lanthanide contraction.",{el:lc(hv),z:hv})); }
      else if(ra&&rb&&ra!==rb&&!ng){ var big=ra>rb?a:b, r=Math.max(ra,rb)/Math.min(ra,rb); s.push(TT("{El}'s atoms are {r}.",{El:cap(lc(big)),r:(r<1.15?TT("slightly wider"):(r<1.6?TT("about {v} percent wider",{v:Math.round((r-1)*100)}):TT("about {r} times as wide",{r:fmt(r,1)}))),z:big})); }
      var ea=enOf(a), eb=enOf(b), mA=isMetal(a), mB=isMetal(b);
      var pr2=Math.min(a,b)*1000+Math.max(a,b);
      if(pr2===55079||pr2===37079) s.push(TT("Both are metals, yet gold is electronegative enough to take {lc}'s electron: together they make a salt, {pr2}.",{lc:lc(Math.min(a,b)),pr2:(pr2===55079?TT("cesium auride, CsAu"):TT("rubidium auride, RbAu"))}));
      else if(mA&&mB) s.push(TT("Both are metals: if they combine, it is usually as an alloy, a mixture of metal atoms, rather than a compound."));
      else if(ng){ var nob=A[5]==="ng"?a:b, oth=nob===a?b:a;
        s.push((nob===54||nob===36)&&(oth===9||oth===8)?TT("{El} is a noble gas, yet it does bond to {el}: {nob}.",{El:cap(lc(nob)),el:lc(oth),nob:(nob===54?TT("xenon fluorides and oxides exist"):TT("krypton difluoride exists")),z:nob}):TT("A noble gas has a full outer shell, so it bonds with almost nothing."));
      }
      else if(ea!=null&&eb!=null){ var d=Math.round(Math.abs(ea-eb)*100)/100, hi2=ea>eb?a:b, ionic=(mA!==mB)&&d>1.7;
        s.push(TT("Their electronegativities differ by {d}. A bond between them would be {d2} (a rule of thumb).",{d:fmt(d,2),d2:(d<0.4?TT("shared almost evenly"):(ionic?TT("mostly ionic: {el} would take the electrons{pr2}",{el:lc(hi2),pr2:(pr2===11017?TT(", which is what table salt is"):TT(", the way chlorine takes sodium's in table salt"))}):(d<1.0?TT("polar, with {el} holding the shared electrons closer",{el:lc(hi2)}):TT("very polar, with {el} holding the shared electrons much closer",{el:lc(hi2)})))),z:hi2}));
      }
      return s.join(" ");
    }
    function renderCompare(){
      var P=pane("compare"); if(!P||!built.compare) return; var a=CMP.a, b=CMP.b;
      [["a",a],["b",b]].forEach(function(x){ var i=P.querySelector('[data-cz="'+x[0]+'"]'); if(i&&D.activeElement!==i) i.value=nm(x[1]); i.removeAttribute("aria-invalid"); });
      P.querySelector(".lb-cmpids").innerHTML=[a,b].map(function(z){ return TT("<button type=\"button\" class=\"lb-cmpid\" data-cpick=\"{z}\">{tile}<span><b>{esc}</b><i>{esc2}</i><em>Open its card</em></span>",{z:z,tile:tile(z,true).replace('<span class="lb-tile','<span aria-hidden="true" class="lb-tile'),esc:esc(nm(z)),esc2:esc(CAT[el(z)[5]][0])})+"</button>"; }).join('<span class="lb-vs" aria-hidden="true">'+TT("and",{})+'</span>');
      P.querySelector(".lb-cmpsay").textContent=cmpSay(a,b);
      var colA=catC(el(a)), colB=catC(el(b));
      P.querySelector(".lb-ctable").innerHTML="<thead>"+"<tr>"+"<th scope=\"col\">"+TT("Property")+"</th>"+"<th scope=\"col\">"+(esc(nm(a)))+"</th>"+"<th scope=\"col\">"+(esc(nm(b)))+"</th>"+"</tr>"+"</thead>"+"<tbody>"+(CROWS.map(function(r){
          var va=r.v?r.v(a):null, vb=r.v?r.v(b):null, mx=null;
          if(va!=null&&vb!=null&&va>0&&vb>0) mx=r.log?Math.max(Math.log10(va),Math.log10(vb))-Math.min(0,Math.log10(Math.min(va,vb)))+1:Math.max(va,vb);
          function w(v){ if(mx==null||v==null) return 0; return r.log?Math.max(4,100*(Math.log10(v)-Math.min(0,Math.log10(Math.min(va,vb)))+1)/mx):Math.max(2,100*v/mx); }
          function cell(z,v,c){ return '<td>'+(r.html?r.html(z):esc(r.txt(z)))+(mx!=null?"<i class=\"lb-cbar\" style=\"--w:"+(((((w(v).toFixed(1))))))+"%;--cat:"+(((((c)))))+"\" aria-hidden=\"true\"></i>":'')+'</td>'; }
          return '<tr><th scope="row">'+esc(r.label)+'</th>'+cell(a,va,colA)+cell(b,vb,colB)+'</tr>'; }).join(''))+"</tbody>";
      P.querySelector(".lb-ctable").setAttribute("aria-label",TT("{Name} and {Name2}, side by side",{Name:nm(a),Name2:nm(b),z:a}));
    }
    var PAIRS=[[11,17,TT("Sodium and chlorine")],[6,14,TT("Carbon and silicon")],[79,47,TT("Gold and silver")],[2,10,TT("Helium and neon")],[26,13,TT("Iron and aluminum")],[8,16,TT("Oxygen and sulfur")],[3,55,TT("Lithium and cesium")]];
    BUILD.compare=function(P){
      if(!CMP.a){ CMP.a=Z||26; CMP.b=partner(CMP.a); }
      P.innerHTML=(((elDatalist())))+"<div class=\"lb-cmp\">"+"<form class=\"lb-cmpform\">"+"<label class=\"lb-field\">"+(((TT("First element"))+"<input class=\"lb-input\" data-cz=\"a\" list=\""+((dlId))+"\" autocomplete=\"off\" spellcheck=\"false\">"))+"</label>"+"<button type=\"button\" class=\"lb-btn sm ghost\" data-cx=\"swap\">"+((TT("Swap them")))+"</button>"+"<label class=\"lb-field\">"+(((TT("Second element"))+"<input class=\"lb-input\" data-cz=\"b\" list=\""+((dlId))+"\" autocomplete=\"off\" spellcheck=\"false\">"))+"</label>"+"</form>"+"<div class=\"lb-chips lb-pairs\" role=\"group\" aria-label=\""+((TT("Pairs worth comparing")))+"\">"+(((PAIRS.map(function(p){ return "<button type=\"button\" data-cpair=\""+(((p[0])))+","+(((p[1])))+"\">"+(((esc(p[2]))))+"</button>"; }).join(''))))+"</div>"+"<div class=\"lb-cmpids\">"+"</div>"+"<p class=\"lb-say lb-cmpsay\" aria-live=\"polite\">"+"</p>"+"<div class=\"lb-twrap\">"+"<table class=\"lb-ctable\">"+"</table>"+"</div>"+"<p class=\"lb-note\">"+((TT("Electronegativity: Pauling scale. Energy to remove an electron: the first ionization energy, from the NIST Atomic Spectra Database. Pull on the outer electron: Slater's estimate of the charge it feels.")))+"</p>"+"</div>";
      function setFrom(i){ var z=zOf(i.value); if(!z){ if(i.value.trim()) i.setAttribute("aria-invalid","true"); return; }
        if(i.getAttribute("data-cz")==="a"){ CMP.a=z; CMP.follow=false; } else CMP.b=z; renderCompare(); ev("compare:"+Math.min(CMP.a,CMP.b)+"-"+Math.max(CMP.a,CMP.b)); }
      P.addEventListener("change",function(e){ var i=e.target.closest("[data-cz]"); if(i) setFrom(i); });
      P.addEventListener("keydown",function(e){ var i=e.target.closest("[data-cz]"); if(i&&e.key==="Enter"){ e.preventDefault(); setFrom(i); } });
      P.addEventListener("submit",function(e){ e.preventDefault(); });
      P.addEventListener("click",function(e){ var sw=e.target.closest('[data-cx="swap"]'), pr=e.target.closest("[data-cpair]"), pk=e.target.closest("[data-cpick]");
        if(sw){ var t=CMP.a; CMP.a=CMP.b; CMP.b=t; CMP.follow=false; renderCompare(); }
        if(pr){ var v=pr.getAttribute("data-cpair").split(","); CMP.a=+v[0]; CMP.b=+v[1]; CMP.follow=false; renderCompare(); ev("compare:"+Math.min(CMP.a,CMP.b)+"-"+Math.max(CMP.a,CMP.b)); }
        if(pk&&opt.card) opt.card(+pk.getAttribute("data-cpick")); });
      renderCompare();
    };
    REFRESH.compare=function(){ renderCompare(); };

    /* ======================================================== Trends */
    var TR={p:"en", line:"period", built:false};
    var TPROPS={
      en:{name:TT("Electronegativity"), unit:"", d:2, get:enOf,
        period:TT("Across a row it rises: each step adds a proton, and the new electron goes into the same shell, so the pull on shared electrons grows. Helium, neon and argon have no value because they form no stable compounds; krypton and xenon bond to fluorine, so they have one."),
        group:TT("Down a column of the main groups it falls: each step adds a shell, so the outer electrons sit farther from the nucleus, behind more inner electrons. Among the heavy transition metals it often rises instead (gold is more electronegative than copper), because poorly shielding 4f electrons pull the outer ones in: the lanthanide contraction.")},
      ie:{name:TT("Energy to remove an electron"), unit:" eV", d:2, get:function(z){ return IE1[z-1]; },
        period:TT("Across a row it climbs, from an alkali metal that gives up its lone outer electron easily to a noble gas that holds on hard. The small dips are real. Where a new p subshell starts (boron, aluminum, gallium) the first p electron is easier to remove, and where a p orbital first holds two electrons (oxygen, sulfur, selenium) their repulsion makes one easier to remove. The biggest drop is from zinc to gallium."),
        group:TT("Down a column of the main groups it falls: the outer electron is shells farther out and easier to pull away. That is why cesium reacts more violently than lithium. In the heavy transition metals it can rise instead: gold holds on tighter than silver.")},
      rad:{name:TT("Atomic radius"), unit:" pm", d:0, get:radOf,
        period:TT("Across a row atoms shrink: the same shell, pulled in by more and more protons. Across the transition metals they hardly change, because the new electrons go into an inner shell. (Atomic radii here are Slater's, from bond lengths; the noble gases' are calculated, so compare them with care.)"),
        group:TT("Down a column of the main groups atoms grow: every row adds a shell of electrons. After the lanthanides they barely grow at all: hafnium is no bigger than zirconium, the lanthanide contraction.")},
      zeff:{name:TT("Pull on the outer electron"), unit:"", d:2, get:zeffOf,
        period:TT("Slater's estimate of the charge the outermost electron feels. Across a row it climbs: each new proton is only partly hidden by the electron added with it, and across the transition metals it climbs slowly, because the new d electrons hide more of it. It goes a long way toward explaining the shrinking radius and the rising electronegativity."),
        group:TT("Down a column it rises only a little: the extra protons are mostly hidden by the extra inner shells. The outer electron is farther away, so it is usually held less tightly.")},
      dens:{name:TT("Density"), unit:" g/cm³", d:3, log:true, get:function(z){ return el(z)[9]; },
        period:TT("Density depends on how atoms pack in a solid as well as how heavy they are. It peaks in the middle of each row (boron and aluminum in the short rows, the transition metals in the long ones), and drops to the gases at the end. Osmium and iridium are the densest ever measured; the row 7 values are predictions."),
        group:TT("Down a column, heavier atoms usually make denser stuff, but packing matters: potassium is less dense than sodium.")},
      melt:{name:TT("Melting point"), unit:" K", d:0, get:function(z){ return el(z)[10]; },
        period:TT("Melting depends on bonding, not just on the atom. It peaks where atoms make the most bonds with each other: carbon in row 2, silicon in row 3, vanadium, molybdenum and tungsten among the metals, then drops away to the noble gases."),
        group:TT("Down a column the trend runs either way. The alkali metals melt more easily as they get bigger, and so does carbon's group, from carbon to lead. The halogens go the other way: fluorine melts at −220 °C and iodine at 114 °C, as bigger molecules attract each other more.")},
      boil:{name:TT("Boiling point"), unit:" K", d:0, get:function(z){ return el(z)[11]; },
        period:TT("Like melting, boiling tracks how strongly atoms bond together: highest in the middle of a row, lowest at the noble gases."),
        group:TT("Down the noble gases and the halogens it rises: bigger, softer electron clouds attract each other more strongly (London forces).")},
      mass:{name:TT("Atomic mass"), unit:" u", d:2, get:function(z){ return el(z)[3]; },
        period:TT("Mass rises with atomic number, with a few famous swaps where the table goes by protons, not mass: argon is heavier than potassium, cobalt than nickel, and tellurium than iodine."),
        group:TT("Down a column mass rises fast: each row adds 8, 18 or 32 protons, and at least as many neutrons.")},
      crust:{name:TT("Abundance in Earth's crust"), unit:" ppm", d:0, log:true, get:function(z){ var c=el(z)[14]; return c>0?c:null; },
        period:TT("Abundance doesn't follow the rows. Four elements make up most of the crust (oxygen, silicon, aluminum and iron), and the rocks sort elements by chemistry. Across the lanthanides you can see the Oddo–Harkins rule: elements with an even atomic number are more common than their odd neighbors, so cerium beats praseodymium and neodymium beats both of its neighbors."),
        group:TT("Down a column abundance mostly falls past row 3: heavier nuclei are harder for stars to make. Row 2 is the exception: lithium, beryllium and boron are rare because stars destroy them, so sodium, magnesium and aluminum are far more common.")}
    };
    /* a perceptual color scale, dark to light, that reads in both themes */
    var HEAT=[[68,1,84],[59,82,139],[33,145,140],[94,201,98],[253,231,37]];
    function heat(t){ t=Math.max(0,Math.min(1,t)); var x=t*(HEAT.length-1), i=Math.min(HEAT.length-2,Math.floor(x)), f=x-i, a=HEAT[i], b=HEAT[i+1];
      return "rgb("+[0,1,2].map(function(k){ return Math.round(a[k]+(b[k]-a[k])*f); }).join(",")+")"; }
    function trRange(pr){ var lo=Infinity, hi=-Infinity; for(var z=1;z<=118;z++){ var v=pr.get(z); if(v==null||!(v>0||!pr.log)) continue; v=pr.log?Math.log10(v):v; if(v<lo) lo=v; if(v>hi) hi=v; } return [lo,hi]; }
    function trT(pr,rg,v){ if(v==null||(pr.log&&!(v>0))) return null; v=pr.log?Math.log10(v):v; return (v-rg[0])/((rg[1]-rg[0])||1); }
    function trVal(pr,v){ if(v==null) return TT("no value"); return (pr.log?sci(v,3):fmt(v,pr.d))+pr.unit; }
    /* where the model breaks: Slater's estimate of the energy to remove the
       outer electron, drawn against NIST's measured value for every element */
    function ieEstOf(z){ var b=outerSub(z), sp=slaterParts(z,b[0],b[1]); return MK.Ry*Math.pow(sp.Zeff/(NSTAR[b[0]]||b[0]),2); }
    function trLine(z){ var e=el(z), out=[], i;
      if(TR.line==="group"&&e[6]){ for(i=1;i<=118;i++) if(el(i)[6]===e[6]) out.push(i); return {zs:out, name:TT("down group {e}",{e:e[6]})}; }
      for(i=1;i<=118;i++) if(el(i)[7]===e[7]) out.push(i); return {zs:out, name:TT("across period {e}",{e:e[7]})}; }
    function renderTrends(){
      var P=pane("trends"); if(!P||!built.trends) return; var pr=TPROPS[TR.p], rg=trRange(pr), z=Z||1, e=el(z);
      P.querySelector(".lb-heat").innerHTML=ELEMENTS.map(function(f){ var p=PTable.pos(f[0]), v=pr.get(f[0]), t=trT(pr,rg,v);
        return "<button type=\"button\" data-tz=\""+(((((f[0])))))+"\" class=\""+((((((t==null?"nd":""))))))+((((((f[0]===z?" on":""))))))+"\" style=\""+((((((t==null?'':'--h:'+heat(t)+';'))))))+"grid-row:"+(((((p.r)))))+";grid-column:"+(((((p.c)))))+"\" aria-label=\""+(((((f[1])))))+", "+(((((esc(f[2]))))))+": "+(((((esc(trVal(pr,v)))))))+"\""+((((((f[0]===z?" aria-pressed=\"true\"":" aria-pressed=\"false\""))))))+"><span>"+(((((f[1])))))+"</span>"+"</button>"; }).join('');
      P.querySelector(".lb-hkey").innerHTML=TT("<span>{esc}</span><i style=\"background:linear-gradient(90deg,{HEAT})\" aria-hidden=\"true\"></i><span>{esc2}</span><span class=\"lb-hnd\">No value</span>{pr}",{esc:esc(pr.log?sci(Math.pow(10,rg[0]),2):fmt(rg[0],pr.d)),HEAT:HEAT.map(function(c,i){ return heat(i/(HEAT.length-1))+' '+(100*i/(HEAT.length-1))+'%'; }).join(','),esc2:esc((pr.log?sci(Math.pow(10,rg[1]),2):fmt(rg[1],pr.d))+pr.unit),pr:(pr.log?TT("<span class=\"lb-hlog\">Colors on a log scale</span>"):'')});
      var gb=P.querySelector('[data-tl="group"]'); gb.disabled=!e[6]; gb.textContent=e[6]?TT("Down group {e}",{e:e[6]}):TT("No group for {el}",{el:lc(z),z:z});
      P.querySelector('[data-tl="period"]').textContent=TT("Across period {e}",{e:e[7]});
      if(TR.line==="group"&&!e[6]) TR.line="period";
      [].forEach.call(P.querySelectorAll("[data-tl]"),function(b){ b.setAttribute("aria-pressed",b.getAttribute("data-tl")===TR.line?"true":"false"); });
      var L=trLine(z), vals=L.zs.map(function(x){ return pr.get(x); }), have=vals.filter(function(v){ return v!=null; });
      var modelSay="";
      if(TR.p==="ie"&&pr.get(z)!=null){ var est=ieEstOf(z), rel=(est-pr.get(z))/pr.get(z), ob=outerSub(z);
        modelSay=TT(" Slater's rules estimate {est} eV, {v}{ob}",{est:fmt(est,2),v:(Math.abs(rel)<0.005?TT("on the nose"):(rel>0?"+":"−")+Math.round(Math.abs(rel)*100)+"%"),ob:(ob[1]===1?TT(": a p electron, where his rules break."):".")}); }
      P.querySelector(".lb-tsay").innerHTML='<b>'+esc(nm(z))+': '+esc(trVal(pr,pr.get(z)))+(TR.p==="ie"&&IE_EST[z]?TT(" (an estimate)"):'')+'.</b> '+esc(pr[TR.line==="group"&&e[6]?"group":"period"])+esc(modelSay);
      var cv=P.querySelector('[data-c="trend"]');
      cv.setAttribute("aria-label",pr.name+" "+L.name+": "+(have.length?TT("from {trVal} to {trVal2}",{trVal:trVal(pr,Math.min.apply(null,have)),trVal2:trVal(pr,Math.max.apply(null,have))}):TT("no values"))+".");
      dirty=true;
    }
    function drawTrend(now){
      var c=host.querySelector('[data-c="trend"]'); if(!c||!c.offsetParent) return false;
      var f=fit(c), g=f.g, w=f.w, h=f.h, T=th(), pr=TPROPS[TR.p], z=Z||1, L=trLine(z);
      g.clearRect(0,0,w,h); g.font="500 14px Archivo, sans-serif";
      var pts=L.zs.map(function(x){ var v=pr.get(x); return {z:x, v:(v==null||(pr.log&&!(v>0)))?null:(pr.log?Math.log10(v):v)}; }), have=pts.filter(function(p){ return p.v!=null; });
      var x0=56, x1=w-24, y0=28, y1=h-44;
      g.strokeStyle=T.ink3; g.lineWidth=1; g.beginPath(); g.moveTo(x0,y0); g.lineTo(x0,y1); g.lineTo(x1,y1); g.stroke();
      if(!have.length){ g.fillStyle=T.ink2; label(g,TT("No values {name}",{name:L.name}),(x0+x1)/2,(y0+y1)/2,T); return false; }
      var lo=Math.min.apply(null,have.map(function(p){ return p.v; })), hi=Math.max.apply(null,have.map(function(p){ return p.v; })), pad=(hi-lo)*0.12||1;
      var model=TR.p==="ie", epts=model?L.zs.map(function(x){ return pr.get(x)==null?null:ieEstOf(x); }):[];
      if(model){ var ehi=Math.max.apply(null,epts.filter(function(v){ return v!=null; })); if(ehi>hi) hi=ehi; }
      lo-=pad; hi+=pad;
      var X=function(i){ return pts.length>1?x0+16+(x1-x0-32)*i/(pts.length-1):(x0+x1)/2; }, Y=function(v){ return y1-(y1-y0)*(v-lo)/(hi-lo); };
      g.fillStyle=T.ink2; g.textAlign="right";
      [lo+pad,hi-pad].forEach(function(v){ var s=pr.log?sci(Math.pow(10,v),2):fmt(v,pr.d); label(g,s,x0-8,Y(v)+5,T,"right"); g.strokeStyle=T.ink3; g.globalAlpha=0.4; g.beginPath(); g.moveTo(x0,Y(v)); g.lineTo(x1,Y(v)); g.stroke(); g.globalAlpha=1; });
      /* for the energy to remove an electron, Slater's estimate rides along as
         a dashed line, so the eye sees where the rule of thumb holds (outer s
         electrons) and where it does not (p electrons, two to four times too high) */
      if(model){ g.strokeStyle=T.ink2; g.lineWidth=1.5; g.setLineDash([5,4]); g.beginPath(); var es=false;
        epts.forEach(function(v,i){ if(v==null){ es=false; return; } if(!es){ g.moveTo(X(i),Y(v)); es=true; } else g.lineTo(X(i),Y(v)); }); g.stroke(); g.setLineDash([]); }
      g.strokeStyle=col("explore")||T.ink; g.lineWidth=2; g.beginPath(); var started=false;
      pts.forEach(function(p,i){ if(p.v==null){ started=false; return; } if(!started){ g.moveTo(X(i),Y(p.v)); started=true; } else g.lineTo(X(i),Y(p.v)); }); g.stroke();
      var every=Math.max(1,Math.ceil(pts.length*28/Math.max(1,x1-x0-32)));
      pts.forEach(function(p,i){ var x=X(i);
        if(p.v!=null){ g.fillStyle=p.z===z?T.ink:(col("explore")||T.ink); g.beginPath(); g.arc(x,Y(p.v),p.z===z?6:4,0,6.2832); g.fill(); if(p.z===z){ g.strokeStyle=T.plate; g.lineWidth=2; g.stroke(); } }
        if(i%every===0||p.z===z){ g.fillStyle=p.z===z?T.ink:T.ink2; label(g,el(p.z)[1],x,y1+22,T); } });
      g.fillStyle=T.ink2; label(g,pr.name+(pr.log?TT(" (log scale)"):"")+(model?TT(" · solid: measured (NIST) · dashed: Slater's estimate"):""),x0,16,T,"left");
      return false;
    }
    BUILD.trends=function(P){
      P.innerHTML="<div class=\"lb-trend\">"+"<div class=\"lb-row lb-tbar\">"+"<label class=\"lb-field\">"+((TT("Color the table by")))+"<select data-tp>"+(((Object.keys(TPROPS).map(function(k){ return "<option value=\""+(((k)))+"\""+((((k===TR.p?' selected':''))))+">"+(((esc(TPROPS[k].name))))+"</option>"; }).join(''))))+"</select>"+"</label>"+"<div class=\"lb-subtabs\" role=\"group\" aria-label=\""+((TT("Graph it")))+"\">"+"<button type=\"button\" data-tl=\"period\" aria-pressed=\"true\">"+((TT("Across the period")))+"</button>"+"<button type=\"button\" data-tl=\"group\" aria-pressed=\"false\">"+((TT("Down the group")))+"</button>"+"</div>"+"</div>"+"<div class=\"lb-cols trend\">"+"<div>"+"<div class=\"lb-heat\" role=\"group\" aria-label=\""+((TT("The table, colored by the property. Pick an element to graph its row or column.")))+"\">"+"</div>"+"<div class=\"lb-hkey\">"+"</div>"+"</div>"+"<div class=\"lb-side\">"+"<div class=\"lb-stagewrap trend\">"+"<canvas class=\"lb-cv\" data-c=\"trend\" role=\"img\">"+"</canvas>"+"</div>"+"<p class=\"lb-say lb-tsay\" aria-live=\"polite\">"+"</p>"+"</div>"+"</div>"+"</div>";
      P.addEventListener("change",function(e){ if(e.target.matches("[data-tp]")){ TR.p=e.target.value; renderTrends(); ev("trends:"+TR.p); } });
      P.addEventListener("click",function(e){ var t=e.target.closest("[data-tz]"), l=e.target.closest("[data-tl]");
        if(t){ Z=+t.getAttribute("data-tz"); if(opt.select) opt.select(Z); renderTrends(); var nb=P.querySelector('[data-tz="'+Z+'"]'); if(nb) nb.focus(); ev("trends:pick:"+Z); }
        if(l&&!l.disabled){ TR.line=l.getAttribute("data-tl"); renderTrends(); } });
      renderTrends();
    };
    REFRESH.trends=function(){ renderTrends(); };

    /* ======================================================== Nuclides */
    var NU={z:0, n:0, follow:true, map:null, maxN:0, off:null, hover:null};
    var NKIND=[[TT("Doesn't hold together"),""],[TT("Stable"),"stable"],[TT("Beta-minus decay"),"bm"],[TT("Beta-plus decay or electron capture"),"bp"],[TT("Alpha decay"),"al"],[TT("Beta decay"),"b"],[TT("Spontaneous fission"),"sf"]];
    var MAGIC=[2,8,20,28,50,82,126];
    function nuColor(k,T){ return [null,T.ink,col("e"),col("bad"),col("warn"),T.ink3,T.ink2][k]; }
    function nuMap(){
      if(NU.map) return; var mx=0, z, n, M=[];
      for(z=0;z<=118;z++){ var row=new Uint8Array(201); for(n=0;n<=200;n++){ var c=nclass(z,z+n); row[n]=c.k; if(c.k&&n>mx) mx=n; } M.push(row); }
      NU.map=M; NU.maxN=Math.min(200,mx+2);
    }
    function nuSet(z,n,follow){ NU.z=Math.max(0,Math.min(118,z)); NU.n=Math.max(0,Math.min(NU.maxN,n)); if(!follow) NU.follow=false; renderNuc(); }
    function nuName(z,a){ return z===0?(a===1?TT("a free neutron"):a+" neutrons"):isoName(z,a); }
    function renderNuc(){
      var P=pane("nuclides"); if(!P||!built.nuclides) return; var z=NU.z, n=NU.n, a=z+n, k=NU.map[z][n], info=z?nuclide(z,a):nuclide(0,n);
      var iz=P.querySelector('[data-nu="z"]'), inn=P.querySelector('[data-nu="n"]'); if(D.activeElement!==iz) iz.value=z; if(D.activeElement!==inn) inn.value=n;
      P.querySelector(".lb-nid").innerHTML=((((((z?tile(z,true):''))))))+"<div class=\"lb-idt\">"+"<h3>"+(((((esc(cap(nuName(z,a))))))))+"</h3>"+"<p class=\"lb-nk\">"+"<span class=\"lb-nkdot k"+(((((k)))))+"\" aria-hidden=\"true\"></span>"+(((((esc(z===83&&a===209?TT("Practically stable"):(k?NKIND[k][0]:TT("Falls apart at once"))))))))+((((((NU.map[z][n]&&nclass(z,a).est?TT(" (an estimate)"):''))))))+"</p>"+"</div>";
      P.querySelector(".lb-nsay").textContent=info.text;
      P.querySelector('[data-nx="build"]').disabled=!(z>=1&&z<=118);
      var cv=P.querySelector('[data-c="nuc"]'); cv.setAttribute("aria-label",TT("The chart of nuclides. Across: neutrons, 0 to {maxN}. Up: protons, 0 to 118. Selected: {nuName}, {k}. Use the arrow keys to move.",{maxN:NU.maxN,nuName:nuName(z,a),k:(k?NKIND[k][0].toLowerCase():TT("doesn't hold together"))}));
      dirty=true; ev("nuclide:"+z+":"+a);
    }
    function nuGeom(w,h){ var cols=NU.maxN+1, rows=119, cs=Math.max(1,Math.min((w-48)/cols,(h-40)/rows)); return {cs:cs, x0:36, y0:h-28, cols:cols, rows:rows}; }
    function drawNuc(now){
      var c=host.querySelector('[data-c="nuc"]'); if(!c||!c.offsetParent) return false;
      var f=fit(c), g=f.g, w=f.w, h=f.h, T=th(), G=nuGeom(w,h), cs=G.cs, z, n;
      g.clearRect(0,0,w,h);
      /* the map is painted once per theme at one pixel per nucleus, then scaled
         up without smoothing, so every square is crisp and none is skipped */
      var key=[T.ink,col("e"),col("bad"),col("warn"),T.ink3].join();
      if(!NU.off||NU.offKey!==key){ var o=D.createElement("canvas"); o.width=NU.maxN+1; o.height=119; var og=o.getContext("2d"), id=og.createImageData(o.width,o.height), rgbs={};
        function rgb(c){ if(rgbs[c]) return rgbs[c]; var t=D.createElement("canvas").getContext("2d"); t.fillStyle=c; t.fillRect(0,0,1,1); return (rgbs[c]=t.getImageData(0,0,1,1).data); }
        for(z=0;z<=118;z++) for(n=0;n<=NU.maxN;n++){ var k=NU.map[z][n]; if(!k) continue; var px=rgb(nuColor(k,T)), q=((118-z)*o.width+n)*4; id.data[q]=px[0]; id.data[q+1]=px[1]; id.data[q+2]=px[2]; id.data[q+3]=255; }
        og.putImageData(id,0,0); NU.off=o; NU.offKey=key; }
      g.imageSmoothingEnabled=false; g.drawImage(NU.off,G.x0,G.y0-119*cs,(NU.maxN+1)*cs,119*cs); g.imageSmoothingEnabled=true;
      /* the magic numbers: closed shells of protons or neutrons */
      g.strokeStyle=T.ink3; g.lineWidth=1; g.setLineDash([3,3]); g.globalAlpha=0.7;
      MAGIC.forEach(function(m){ if(m<=118){ g.beginPath(); g.moveTo(G.x0,G.y0-m*cs-cs/2); g.lineTo(G.x0+(NU.maxN+1)*cs,G.y0-m*cs-cs/2); g.stroke(); }
        if(m<=NU.maxN){ g.beginPath(); g.moveTo(G.x0+m*cs+cs/2,G.y0); g.lineTo(G.x0+m*cs+cs/2,G.y0-119*cs); g.stroke(); } });
      g.setLineDash([]); g.globalAlpha=1;
      /* the line N = Z, where the lightest stable nuclei sit */
      g.strokeStyle=T.ink2; g.globalAlpha=0.5; g.beginPath(); g.moveTo(G.x0,G.y0); g.lineTo(G.x0+Math.min(118,NU.maxN)*cs,G.y0-Math.min(118,NU.maxN)*cs); g.stroke(); g.globalAlpha=1;
      /* the selection, with crosshairs */
      var sx=G.x0+NU.n*cs+cs/2, sy=G.y0-NU.z*cs-cs/2;
      g.strokeStyle=T.ink; g.lineWidth=1; g.globalAlpha=0.5; g.beginPath(); g.moveTo(G.x0,sy); g.lineTo(sx-6,sy); g.moveTo(sx,G.y0); g.lineTo(sx,sy+6); g.stroke(); g.globalAlpha=1;
      g.lineWidth=2; g.strokeRect(sx-6,sy-6,12,12);
      g.font="500 14px Archivo, sans-serif"; g.fillStyle=T.ink2;
      label(g,TT("Neutrons →"),G.x0+(NU.maxN+1)*cs/2,h-6,T);
      g.save(); g.translate(14,G.y0-60*cs); g.rotate(-Math.PI/2); label(g,TT("Protons →"),0,0,T); g.restore();
      MAGIC.forEach(function(m){ if(m>=20&&m<=NU.maxN) label(g,String(m),G.x0+m*cs+cs/2,G.y0+16,T); });
      drawNucZoom();
      return false;
    }
    function drawNucZoom(){
      var c=host.querySelector('[data-c="nucz"]'); if(!c||!c.offsetParent) return;
      var f=fit(c), g=f.g, w=f.w, h=f.h, T=th(), C=7, R=5, cw=w/C, ch=h/R, z0=NU.z, n0=NU.n;
      g.clearRect(0,0,w,h); g.textAlign="center";
      for(var i=0;i<C;i++) for(var j=0;j<R;j++){ var n=n0+i-3, z=z0+2-j; if(z<0||z>118||n<0||n>NU.maxN) continue;
        var k=NU.map[z][n], x=i*cw, y=j*ch;
        if(k){ g.globalAlpha=0.24; g.fillStyle=nuColor(k,T); g.fillRect(x+2,y+2,cw-4,ch-4); g.globalAlpha=1; g.fillStyle=nuColor(k,T); g.fillRect(x+2,y+2,4,ch-4); }
        else { g.strokeStyle=T.ink3; g.globalAlpha=0.35; g.strokeRect(x+2.5,y+2.5,cw-5,ch-5); g.globalAlpha=1; }
        if(k){ g.fillStyle=T.ink; g.font=TT("{k}{v}px Archivo, sans-serif",{k:(k===1?"700 ":"500 "),v:Math.max(12,Math.min(15,Math.floor(cw/4.2)))}); g.fillText(z?el(z)[1]+"-"+(z+n):"n",x+cw/2+2,y+ch/2+5); }
        if(i===3&&j===2){ g.strokeStyle=T.ink; g.lineWidth=2; g.strokeRect(x+1,y+1,cw-2,ch-2); g.lineWidth=1; } }
    }
    BUILD.nuclides=function(P){
      nuMap(); if(!NU.z){ NU.z=Z||6; NU.n=commonA(NU.z)-NU.z; }
      P.innerHTML="<div class=\"lb-cols nuc\">"+"<div>"+"<div class=\"lb-stagewrap nuc\">"+"<canvas class=\"lb-cv\" data-c=\"nuc\" role=\"img\" tabindex=\"0\">"+"</canvas>"+"</div>"+"<ul class=\"lb-nlegend\">"+((([1,2,3,4,5].map(function(k){ return "<li>"+"<span class=\"lb-nkdot k"+(((((k)))))+"\" aria-hidden=\"true\"></span>"+(((((NKIND[k][0])))))+"</li>"; }).join(''))))+"<li>"+((TT("<span class=\"lb-nkmagic\" aria-hidden=\"true\"></span>Magic numbers: closed shells")))+"</li>"+"</ul>"+"</div>"+"<div class=\"lb-side\">"+"<div class=\"lb-row lb-nin\">"+"<label class=\"lb-field\">"+((TT("Protons")))+"<input type=\"number\" min=\"0\" max=\"118\" data-nu=\"z\" inputmode=\"numeric\">"+"</label>"+"<label class=\"lb-field\">"+((TT("Neutrons")))+"<input type=\"number\" min=\"0\" max=\"200\" data-nu=\"n\" inputmode=\"numeric\">"+"</label>"+"</div>"+"<div class=\"lb-stagewrap nucz\">"+"<canvas class=\"lb-cv\" data-c=\"nucz\" role=\"img\" aria-label=\""+((TT("The nuclei around the one you picked")))+"\">"+"</canvas>"+"</div>"+"<div class=\"lb-id lb-nid\">"+"</div>"+"<p class=\"lb-say lb-nsay\" aria-live=\"polite\">"+"</p>"+"<div class=\"lb-row\">"+"<button type=\"button\" class=\"lb-btn go\" data-nx=\"build\">"+((TT("Build this nucleus")))+"</button>"+"<button type=\"button\" class=\"lb-btn\" data-nx=\"common\">"+((TT("Back to the most common isotope")))+"</button>"+"</div>"+"<p class=\"lb-note\">"+((TT("Each square is one nucleus: a number of protons and a number of neutrons. Stable nuclei and the isotopes Atom lists are measured. The rest of the map, where nuclei stop holding together and which way they decay, is the liquid-drop model's estimate, rough at the edges.")))+"</p>"+"</div>"+"</div>";
      var cv=P.querySelector('[data-c="nuc"]'), cz=P.querySelector('[data-c="nucz"]');
      function at(e,cnv){ var r=cnv.getBoundingClientRect(), G=nuGeom(r.width,r.height); return {n:Math.floor((e.clientX-r.left-G.x0)/G.cs), z:Math.floor((G.y0-(e.clientY-r.top))/G.cs)}; }
      cv.addEventListener("click",function(e){ var p=at(e,cv); if(p.n>=0&&p.n<=NU.maxN&&p.z>=0&&p.z<=118) nuSet(p.z,p.n); });
      cz.addEventListener("click",function(e){ var r=cz.getBoundingClientRect(), i=Math.floor((e.clientX-r.left)/(r.width/7)), j=Math.floor((e.clientY-r.top)/(r.height/5)); nuSet(NU.z+2-j,NU.n+i-3); });
      cv.addEventListener("keydown",function(e){ var d={ArrowRight:[0,1],ArrowLeft:[0,-1],ArrowUp:[1,0],ArrowDown:[-1,0]}[e.key]; if(!d) return; e.preventDefault(); nuSet(NU.z+d[0],NU.n+d[1]); });
      P.addEventListener("change",function(e){ var i=e.target.closest("[data-nu]"); if(!i) return; var v=Math.round(+i.value||0); if(i.getAttribute("data-nu")==="z") nuSet(v,NU.n); else nuSet(NU.z,v); });
      P.addEventListener("click",function(e){ var b=e.target.closest("[data-nx]"); if(!b||b.disabled) return; var k=b.getAttribute("data-nx");
        if(k==="build"){ B.p=NU.z; B.n=NU.n; B.e=NU.z; show("build"); setBMode("atom"); changed(); }
        if(k==="common"&&NU.z>=1) nuSet(NU.z,commonA(NU.z)-NU.z); });
      renderNuc();
    };
    REFRESH.nuclides=function(){ renderNuc(); };

    /* ======================================================== Build: a molecule */
    var MOL={built:false, m:null, bag:{}, yaw:0.5, pitch:0.35, drag:null, last:0};
    var PALETTE=["H","B","C","N","O","F","Na","Cl"];
    function bagHill(bag){ var s="", ks=Object.keys(bag).filter(function(k){ return bag[k]>0; });
      if(!ks.length) return ""; var c={}; ks.forEach(function(k){ c[k]=bag[k]; }); return hill(c); }
    function molOfBag(){ var h=bagHill(MOL.bag); for(var i=0;i<MOLS.length;i++) if(hill(parseFormula(MOLS[i].f))===h) return MOLS[i]; return null; }
    function sub(f){ return esc(f).replace(/(\d+)/g,"<sub>$1</sub>"); }
    function fSub(f){ return String(f).replace(/\d/g,function(d){ return "₀₁₂₃₄₅₆₇₈₉".charAt(+d); }); }
    function molHint(){
      var bag=MOL.bag, n=0, k; for(k in bag) n+=bag[k]; if(!n) return TT("Add atoms from the tray, or pick a molecule below.");
      var c=MOLS.map(function(m){ var need=parseFormula(m.f), add=[], ok=true, more=0;
        for(var a in bag){ if(bag[a]>(need[a]||0)) ok=false; }
        for(var b in need){ var d=need[b]-(bag[b]||0); if(d>0){ add.push(d+" "+b); more+=d; } }
        return ok?{m:m,add:add,more:more}:null; }).filter(Boolean).sort(function(x,y){ return x.more-y.more; });
      if(!c.length) return TT("None of Atom's molecules uses that mix of atoms. Take one away, or start over.");
      return c.slice(0,2).map(function(x){ return TT("Add {x} to make {x2}, {fSub}.",{x:x.add.join(TT(" and ",{})),x2:x.m.name.toLowerCase(),fSub:fSub(x.m.f)}); }).join(TT(" Or ",{}));
    }
    function bondWord(d){ return d<0.4?TT("shared almost evenly"):(d<1.0?"polar":TT("very polar")); }   /* the same words Compare uses for two nonmetals */
    function renderMol(){
      var P=pane("build").querySelector('[data-bmode="molecule"]'); if(!P||!MOL.built) return;
      var m=molOfBag(), h=bagHill(MOL.bag); MOL.m=m;
      P.querySelector(".lb-mbag").innerHTML=TT("<span class=\"lb-mlabel\">Your atoms</span> <b>{m}</b>",{m:(m?sub(m.f):(h?sub(h):TT("none yet")))});
      [].forEach.call(P.querySelectorAll("[data-mp]"),function(b){ b.setAttribute("aria-pressed",m&&b.getAttribute("data-mp")===m.id?"true":"false"); });
      var out=P.querySelector(".lb-mout"), hint=P.querySelector(".lb-mhint");
      if(!m){ out.hidden=true; hint.textContent=molHint(); dirty=true; return; }
      hint.textContent=""; out.hidden=false;
      var c=parseFormula(m.f), mm=molar(m.f), pairs={};
      m.bonds.forEach(function(b){ var A=m.atoms[b[0]][0], Bq=m.atoms[b[1]][0], key=[A,Bq].sort().join("–")+b[2]; if(!pairs[key]) pairs[key]={a:A,b:Bq,o:b[2],n:0}; pairs[key].n++; });
      var bonds=m.ionic?[TT("Ionic: each Na⁺ is held by the six Cl⁻ around it (difference in electronegativity {fmt})",{fmt:fmt(Math.abs(EN[16]-EN[10]),2)})]:
        Object.keys(pairs).map(function(k){ var p=pairs[k], d=Math.abs(EN[zOf(p.a)-1]-EN[zOf(p.b)-1]);
          return TT("{n} {v} bond{p}, {a}{p2}{b}: {p3}",{n:p.n,v:["","single","double","triple"][p.o],p:(p.n>1?"s":""),a:p.a,p2:(p.o===2?"=":(p.o===3?"≡":"–")),b:p.b,p3:(p.a===p.b?TT("shared evenly"):TT("{bondWord} (difference {d})",{bondWord:bondWord(d),d:fmt(d,2)}))}); });
      P.querySelector(".lb-mname").innerHTML=esc(m.name)+' <span class="lb-sym">'+sub(m.f)+'</span>';
      P.querySelector(".lb-mfacts").innerHTML=
        "<div>"+"<dt>"+(((TT("Molar mass"))))+"</dt>"+"<dd>"+((((fmt(mm,3)))))+" g/mol"+"</dd>"+"</div>"+"<div>"+"<dt>"+(((TT("Shape"))))+"</dt>"+"<dd>"+((((esc(m.shape)))))+(((((m.angle&&m.angle!==180?', '+fmt(m.angle,1)+'°':(m.angle===180?', 180°':''))))))+"</dd>"+"</div>"+(((((m.ionic?'':"<div>"+"<dt>"+TT("Lone pairs on the center")+"</dt>"+"<dd>"+((m.center<0?TT("no center atom"):m.lp))+"</dd>"+"</div>")))))+"<div>"+"<dt>"+(((((m.ionic?TT("Overall"):TT("Polar molecule"))))))+"</dt>"+"<dd>"+(((((m.ionic?TT("An ionic crystal"):(m.polar?TT("Yes"):"No"))))))+"</dd>"+"</div>";
      P.querySelector(".lb-mbonds").innerHTML=bonds.map(function(b){ return '<li>'+esc(b)+'</li>'; }).join('');
      P.querySelector(".lb-mwhy").textContent=m.why;
      P.querySelector(".lb-mkey").innerHTML=Object.keys(c).map(function(s){ return "<li>"+"<i style=\"--c:"+(((((CPK[s])))))+"\" aria-hidden=\"true\"></i>"+(((((s)))))+" "+(((((esc(lc(zOf(s))))))))+((((((m.ionic?(s==="Na"?TT(" ion, Na⁺"):TT(" ion, Cl⁻")):""))))))+"</li>"; }).join('');
      P.querySelector('[data-c="mol"]').setAttribute("aria-label",TT("{name}, {fSub}: {m}{m2}. Drag to turn it.",{name:m.name,fSub:fSub(m.f),m:m.shape.toLowerCase(),m2:(m.angle&&!m.ionic?TT(", {angle} degrees",{angle:m.angle}):"")}));
      dirty=true;
    }
    function drawMol(now){
      var c=host.querySelector('[data-c="mol"]'); if(!c||!c.offsetParent) return false;
      var f=fit(c), g=f.g, w=f.w, h=f.h, T=th(), m=MOL.m, dt=MOL.last?Math.min(100,now-MOL.last):16; MOL.last=now;
      if(!opt.calm&&!MOL.drag) MOL.yaw+=dt*0.00035;
      g.clearRect(0,0,w,h);
      var atoms, bonds=[];
      if(m){ atoms=m.atoms.map(function(a){ return [a[0],a[1],a[2],a[3]]; }); bonds=m.bonds; }
      else { atoms=[]; var list=[]; for(var k in MOL.bag) for(var i=0;i<MOL.bag[k];i++) list.push(k);
        list.forEach(function(s,i){ var an2=i/Math.max(1,list.length)*6.2832; atoms.push([s,Math.cos(an2)*1.6,Math.sin(an2*2)*0.3,Math.sin(an2)*1.6]); }); }
      if(!atoms.length){ g.fillStyle=T.ink2; g.font="500 15px Archivo, sans-serif"; label(g,TT("Add an atom to begin"),w/2,h/2,T); return false; }
      var cy=Math.cos(MOL.yaw), sy=Math.sin(MOL.yaw), cp=Math.cos(MOL.pitch), sp=Math.sin(MOL.pitch), R=0;
      var P3=atoms.map(function(a){ var x=a[1]*cy+a[3]*sy, z1=-a[1]*sy+a[3]*cy, y=a[2]*cp-z1*sp, z=a[2]*sp+z1*cp; R=Math.max(R,Math.hypot(a[1],a[2],a[3])+(COVR[a[0]]||0.7)*0.6); return {s:a[0],x:x,y:y,z:z}; });
      var sc=Math.min(w,h)*0.40/Math.max(1.2,R), cx=w/2, cyy=h/2;
      /* a little perspective: what is nearer is drawn a little larger */
      function psc(p){ return 1/(1-p.z/(R*6+1e-6)); }
      function sxy(p){ var k=psc(p); return [cx+p.x*sc*k, cyy-p.y*sc*k]; }
      function rad(p){ return Math.max(8,(COVR[p.s]||0.7)*sc*0.55*psc(p)); }
      function shade(hex,f){ var n=parseInt(hex.slice(1),16), r=(n>>16)&255, gg=(n>>8)&255, b=n&255;
        return "rgb("+Math.round(r*f)+","+Math.round(gg*f)+","+Math.round(b*f)+")"; }
      var LIGHT=[-0.45,-0.55];
      /* bonds first, then atoms back to front */
      /* bonds as rods: each half in its atom's color, lit along the top
         edge like a cylinder; a dashed line for an ionic contact */
      bonds.forEach(function(b){ var p=P3[b[0]], q=P3[b[1]], A=sxy(p), Bq=sxy(q), dx=Bq[0]-A[0], dy=Bq[1]-A[1], L=Math.hypot(dx,dy)||1, nx=-dy/L, ny=dx/L;
        if(b[2]===0){ g.strokeStyle=T.ink3; g.lineWidth=1.5; g.setLineDash([4,4]); g.beginPath(); g.moveTo(A[0],A[1]); g.lineTo(Bq[0],Bq[1]); g.stroke(); g.setLineDash([]); return; }
        var wdt=Math.max(3,sc*0.11), offs=b[2]===2?[-wdt*1.1,wdt*1.1]:(b[2]===3?[-wdt*1.6,0,wdt*1.6]:[0]), M=[(A[0]+Bq[0])/2,(A[1]+Bq[1])/2];
        offs.forEach(function(o){ [[A,M,CPK[p.s]||"#999"],[M,Bq,CPK[q.s]||"#999"]].forEach(function(seg){
          var gr=g.createLinearGradient(seg[0][0]+nx*wdt*0.6,seg[0][1]+ny*wdt*0.6,seg[0][0]-nx*wdt*0.6,seg[0][1]-ny*wdt*0.6);
          gr.addColorStop(0,shade(seg[2],1)); gr.addColorStop(0.3,shade(seg[2],0.98)); gr.addColorStop(1,shade(seg[2],0.45));
          g.strokeStyle=gr; g.lineWidth=wdt; g.lineCap="butt"; g.beginPath(); g.moveTo(seg[0][0]+nx*o,seg[0][1]+ny*o); g.lineTo(seg[1][0]+nx*o,seg[1][1]+ny*o); g.stroke(); }); });
        g.lineCap="butt"; });
      /* lone pairs on the center atom: two dots each, pointing where the pair sits */
      /* (drawn just outside the atom, along where the pair points) */
      if(m&&m.lpDir&&m.center>=0){ var cc=P3[m.center], c2=sxy(cc), rc=rad(cc);
        m.lpDir.forEach(function(d){ var x=d[0]*cy+d[2]*sy, z1=-d[0]*sy+d[2]*cy, y=d[1]*cp-z1*sp, L2=Math.hypot(x,y); if(L2<0.25) return;
          var ux=x/L2, uy=-y/L2, px=c2[0]+ux*(rc+12), py=c2[1]+uy*(rc+12);
          g.fillStyle=T.ink2; [-1,1].forEach(function(o){ g.beginPath(); g.arc(px-uy*5*o,py+ux*5*o,3,0,6.2832); g.fill(); }); }); }
      var order=P3.map(function(p,i){ return i; }).sort(function(i,j){ return P3[i].z-P3[j].z; });
      /* atoms back to front: a lit sphere (bright toward the light, dark at
         the far limb, a small specular glint), then the shadow each nearer
         atom casts on it where they touch, which is what makes two spheres
         read as touching rather than as two discs */
      order.forEach(function(i,oi){ var p=P3[i], s=sxy(p), r=rad(p), base=CPK[p.s]||"#999";
        var gr=g.createRadialGradient(s[0]+LIGHT[0]*r*0.6,s[1]+LIGHT[1]*r*0.6,r*0.05,s[0]+LIGHT[0]*r*0.15,s[1]+LIGHT[1]*r*0.15,r*1.15);
        gr.addColorStop(0,"#ffffff"); gr.addColorStop(0.12,shade(base,1)); gr.addColorStop(0.6,shade(base,0.78)); gr.addColorStop(1,shade(base,0.38));
        g.fillStyle=gr; g.beginPath(); g.arc(s[0],s[1],r,0,6.2832); g.fill();
        /* the glint */
        g.fillStyle="rgba(255,255,255,0.55)"; g.beginPath(); g.ellipse(s[0]+LIGHT[0]*r*0.5,s[1]+LIGHT[1]*r*0.5,r*0.22,r*0.14,Math.atan2(LIGHT[1],LIGHT[0])+1.5708,0,6.2832); g.fill();
        /* contact shadows from the atoms in front */
        g.save(); g.beginPath(); g.arc(s[0],s[1],r,0,6.2832); g.clip();
        for(var oj=oi+1;oj<order.length;oj++){ var q=P3[order[oj]], t=sxy(q), rq=rad(q), dd=Math.hypot(t[0]-s[0],t[1]-s[1]);
          if(dd>r+rq*1.1) continue;
          var sg=g.createRadialGradient(t[0],t[1],rq*0.9,t[0],t[1],rq*1.45); sg.addColorStop(0,"rgba(0,0,0,0.42)"); sg.addColorStop(1,"rgba(0,0,0,0)");
          g.fillStyle=sg; g.beginPath(); g.arc(t[0],t[1],rq*1.45,0,6.2832); g.fill(); }
        g.restore();
        g.strokeStyle="rgba(0,0,0,0.35)"; g.lineWidth=1; g.beginPath(); g.arc(s[0],s[1],r,0,6.2832); g.stroke(); });
      if(!(m&&m.ionic)){ g.font="600 14px Archivo, sans-serif"; g.fillStyle=T.ink;
        /* a label only for an atom you can see: one hidden behind another gets none */
        order.forEach(function(i){ var p=P3[i], s=sxy(p), r=rad(p);
          var hid=P3.some(function(q,j){ if(j===i||q.z<=p.z) return false; var t=sxy(q), rq=rad(q); return Math.hypot(t[0]-s[0],t[1]-s[1])<rq*0.8; });
          if(!hid) label(g,p.s,s[0]+r*0.8,s[1]-r*0.8,T); }); }
      return !opt.calm||!!MOL.drag;
    }
    function buildMol(P){
      P.innerHTML="<div class=\"lb-cols mol\">"+"<div class=\"lb-stagewrap mol\">"+"<canvas class=\"lb-cv\" data-c=\"mol\" role=\"img\" tabindex=\"0\">"+"</canvas>"+"<div class=\"lb-tray lb-mtray\" role=\"group\" aria-label=\""+((TT("Atoms: press one to add it")))+"\">"+(((PALETTE.map(function(s){ return "<button type=\"button\" class=\"lb-atok\" data-ma=\""+(((((s)))))+"\" aria-label=\""+(((((s)))))+": "+(TT("add an atom of {el}",{el:lc(zOf(s))}))+"\"><i style=\"--c:"+(((((CPK[s])))))+"\" aria-hidden=\"true\"></i>"+(((((s)))))+"</button>"; }).join(''))))+"</div>"+"</div>"+"<div class=\"lb-side\">"+"<div class=\"lb-row lb-mbagrow\">"+"<p class=\"lb-mbag\">"+"</p>"+"<button type=\"button\" class=\"lb-btn sm\" data-mx=\"undo\">"+((TT("Take one away")))+"</button>"+"<button type=\"button\" class=\"lb-btn sm ghost\" data-mx=\"clear\">"+((TT("Start over")))+"</button>"+"</div>"+"<p class=\"lb-say lb-mhint\" role=\"status\">"+"</p>"+"<div class=\"lb-mout\">"+"<h3 class=\"lb-mname\">"+"</h3>"+"<dl class=\"lb-facts lb-mfacts\">"+"</dl>"+"<ul class=\"lb-mbonds\">"+"</ul>"+"<p class=\"lb-say lb-mwhy\">"+"</p>"+"<ul class=\"lb-mkey\">"+"</ul>"+"</div>"+"<h3 class=\"lb-h\">"+((TT("Or pick one")))+"</h3>"+"<div class=\"lb-chips lb-mpick\" role=\"group\" aria-label=\""+((TT("Molecules")))+"\">"+(((MOLS.map(function(m){ return "<button type=\"button\" data-mp=\""+(((((m.id)))))+"\" aria-pressed=\"false\">"+(((((esc(m.name))))))+" <span>"+(((((fSub(m.f))))))+"</span>"+"</button>"; }).join(''))))+"</div>"+"</div>"+"</div>";
      var hist=[];
      function setBag(f){ MOL.bag={}; var c=parseFormula(f); for(var k in c) MOL.bag[k]=c[k]; }
      P.addEventListener("click",function(e){ var a=e.target.closest("[data-ma]"), x=e.target.closest("[data-mx]"), pk=e.target.closest("[data-mp]");
        var before=MOL.m;
        if(a){ var s=a.getAttribute("data-ma"); hist.push(s); MOL.bag[s]=(MOL.bag[s]||0)+1; }
        if(x){ var k=x.getAttribute("data-mx"); if(k==="clear"){ MOL.bag={}; hist=[]; } if(k==="undo"){ var last=hist.pop(); if(!last){ for(var q in MOL.bag) if(MOL.bag[q]>0) last=q; } if(last&&MOL.bag[last]>0) MOL.bag[last]--; } }
        if(pk){ var m=MOLS.filter(function(z){ return z.id===pk.getAttribute("data-mp"); })[0]; setBag(m.f); hist=[]; }
        if(a||x||pk){ renderMol(); if(MOL.m&&MOL.m!==before){ ev("mol:"+MOL.m.id); if(a) toast(TT("You made {MOL}, {fSub}.",{MOL:MOL.m.name.toLowerCase(),fSub:fSub(MOL.m.f)})); } } });
      var cv=P.querySelector('[data-c="mol"]');
      cv.addEventListener("pointerdown",function(e){ if(!e.isPrimary) return; MOL.drag={x:e.clientX,y:e.clientY,yaw:MOL.yaw,pitch:MOL.pitch}; try{ cv.setPointerCapture(e.pointerId); }catch(er){} dirty=true; });
      cv.addEventListener("pointermove",function(e){ if(!MOL.drag) return; MOL.yaw=MOL.drag.yaw+(e.clientX-MOL.drag.x)*0.01; MOL.pitch=Math.max(-1.4,Math.min(1.4,MOL.drag.pitch+(e.clientY-MOL.drag.y)*0.01)); dirty=true; });
      ["pointerup","pointercancel"].forEach(function(t){ cv.addEventListener(t,function(){ MOL.drag=null; dirty=true; }); });
      cv.addEventListener("keydown",function(e){ var d={ArrowLeft:[-0.2,0],ArrowRight:[0.2,0],ArrowUp:[0,-0.2],ArrowDown:[0,0.2]}[e.key]; if(!d) return; e.preventDefault(); MOL.yaw+=d[0]; MOL.pitch=Math.max(-1.4,Math.min(1.4,MOL.pitch+d[1])); dirty=true; });
      setBag("H2O"); renderMol();
    }

    /* ======================================================== Electron energies (photoelectron spectroscopy)
       Shine X-rays on the atoms and count the electrons that fly out by the
       energy it took to free them: one peak per subshell, as tall as the
       number of electrons in it. The energies here are Slater's estimates
       (the same the rest of Atom uses), and the lab says so: the pattern is
       the lesson, the exact numbers are not. 1 eV = 0.0964853 MJ/mol. */
    var PE={z:0, follow:true, guess:null, right:0, tries:0};
    var EV_MJ=0.0964853;
    function pesPeaks(z){
      var c=configOf(z), out=[];
      c.forEach(function(x){ var sp=slaterParts(z,x[0],x[1]), E=MK.Ry*Math.pow(sp.Zeff/(NSTAR[x[0]]||x[0]),2); out.push({n:x[0],l:x[1],name:x[0]+OLET[x[1]],count:x[2],eV:E,mj:E*EV_MJ}); });
      return out.sort(function(a,b){ return b.eV-a.eV; });
    }
    function pesZ(){ return PE.guess?PE.guess.z:(PE.z||Z||1); }
    function drawPes(now){
      var c=host.querySelector('[data-c="pes"]'); if(!c||!c.offsetParent) return false;
      var f=fit(c), g=f.g, w=f.w, h=f.h, T=th(), z=pesZ(), peaks=pesPeaks(z), hidden=PE.guess&&!PE.guess.done;
      g.clearRect(0,0,w,h); g.font="500 14px Archivo, sans-serif";
      var x0=48, x1=w-20, y0=34, y1=h-52, lo=Math.log10(0.1), hi=Math.log10(Math.max(2000,peaks[0].mj*1.6));
      var X=function(mj){ return x1-(x1-x0)*(Math.log10(mj)-lo)/(hi-lo); };   /* the convention: the most tightly bound on the left */
      var mx=Math.max.apply(null,peaks.map(function(p){ return p.count; }));
      g.strokeStyle=T.ink3; g.lineWidth=1; g.beginPath(); g.moveTo(x0,y1); g.lineTo(x1,y1); g.stroke();
      [0.1,1,10,100,1000,10000].forEach(function(t){ if(Math.log10(t)>hi) return; var x=X(t); g.strokeStyle=T.ink3; g.globalAlpha=0.35; g.beginPath(); g.moveTo(x,y0); g.lineTo(x,y1); g.stroke(); g.globalAlpha=1; g.fillStyle=T.ink2; label(g,String(t),x,y1+20,T); });
      g.fillStyle=T.ink2; label(g,TT("energy to remove the electron, MJ/mol (log scale)"),(x0+x1)/2,h-8,T);
      peaks.forEach(function(p){ var x=X(p.mj), ph=(y1-y0-26)*p.count/mx, k=col(["s","p","d","f"][p.l])||T.ink;
        g.fillStyle=k; g.fillRect(x-4,y1-ph,8,ph);
        g.fillStyle=T.ink; label(g,hidden?String(p.count):p.name+" ×"+p.count,x,y1-ph-8,T); });
      g.fillStyle=T.ink; label(g,hidden?TT("A mystery element: read its shells, then name it"):nm(z)+": "+configStr(z,true).replace(/<sup>(\d+)<\/sup>/g,function(m0,d){ return supNum(d); }).replace(/<[^>]+>/g,""),(x0+x1)/2,y0-14,T);
      return false;
    }
    function pesSay(){
      var P=pane("pes"), z=pesZ(), peaks=pesPeaks(z), top=peaks[0], last=peaks[peaks.length-1];
      P.querySelector(".lb-psay").innerHTML=TT("<b>{esc}:</b> {length} peak{peaks}, one per subshell. The tallest-energy peak is {name} at about {top} MJ/mol ({top2} eV): its {count} electron{top3} sit{top4} closest to the nucleus. The easiest to remove is {name2} at about {last} MJ/mol{IE1}. A peak’s height is how many electrons share that energy; its position is how tightly they are held.",{esc:esc(nm(z)),length:peaks.length,peaks:(peaks.length>1?'s':''),name:top.name,top:fmt(top.mj,top.mj>=10?0:1),top2:fmt(top.eV,0),count:top.count,top3:(top.count>1?'s':''),top4:(top.count>1?'':'s'),name2:last.name,last:fmt(last.mj,2),IE1:(IE1[z-1]?TT(" (measured: {IE1} MJ/mol)",{IE1:fmt(IE1[z-1]*EV_MJ,2)}):'')});
    }
    function pesGuessNew(){
      var pool=[], z, opts; for(z=3;z<=36;z++) pool.push(z);
      z=pool[Math.floor(Math.random()*pool.length)]; opts=[z];
      while(opts.length<4){ var o=pool[Math.floor(Math.random()*pool.length)]; if(opts.indexOf(o)<0&&configOf(o).length===configOf(z).length) opts.push(o); if(opts.length<4&&Math.random()<0.02) opts.push(pool[Math.floor(Math.random()*pool.length)]); }
      opts=opts.filter(function(v,i,a){ return a.indexOf(v)===i; }).slice(0,4); while(opts.length<4){ var o2=pool[Math.floor(Math.random()*pool.length)]; if(opts.indexOf(o2)<0) opts.push(o2); }
      opts.sort(function(a,b){ return a-b; }); PE.guess={z:z, opts:opts, done:false}; pesRenderGuess(); dirty=true; ev("pes:guess");
    }
    function pesRenderGuess(){
      var P=pane("pes"), g=P.querySelector(".lb-pguess"), G=PE.guess;
      if(!G){ g.innerHTML=''; return; }
      g.innerHTML="<p class=\"lb-qtext\">"+TT("Count the electrons in each peak, from the left. Which element is it?")+"</p>"+"<div class=\"lb-choices\">"+(G.opts.map(function(z){ return "<button type=\"button\" class=\"lb-choice\" data-pgz=\""+(((z)))+"\""+((((G.done?' disabled':''))))+">"+(((esc(nm(z)))))+"</button>"; }).join(''))+"</div>"+((G.done?"<div class=\"lb-row\">"+"<button type=\"button\" class=\"lb-btn go\" data-pp=\"guess\">"+TT("Another one")+"</button>"+TT("<span class=\"lb-score\">{right} of {tries} right</span>",{right:PE.right,tries:PE.tries})+"</div>":''));
    }
    BUILD.pes=function(P){
      PE.z=PE.z||Z||1;
      P.innerHTML=(((elDatalist())))+"<div class=\"lb-pes\">"+"<p class=\"lb-note\">"+((TT("Photoelectron spectroscopy: X-rays knock electrons out of the atoms, and each one leaves with the X-ray’s energy minus the energy that held it. Count the electrons by that energy and the shells appear as peaks: one per subshell, as tall as the number of electrons in it, farther left the more tightly they are held. It is how the shell structure of the table was confirmed, and a core skill in AP Chemistry (Unit 1.6).")))+"</p>"+"<div class=\"lb-row\">"+"<label class=\"lb-field\">"+(((TT("Element"))+"<input class=\"lb-input\" data-pz list=\""+((dlId))+"\" autocomplete=\"off\" spellcheck=\"false\">"))+"</label>"+"<button type=\"button\" class=\"lb-btn\" data-pp=\"guess\">"+((TT("Mystery element")))+"</button>"+"<button type=\"button\" class=\"lb-btn ghost\" data-pp=\"follow\" hidden>"+((TT("Follow the table")))+"</button>"+"</div>"+"<div class=\"lb-stagewrap pes\">"+"<canvas class=\"lb-cv\" data-c=\"pes\" role=\"img\" aria-label=\""+((TT("The element’s photoelectron spectrum: one peak per subshell")))+"\">"+"</canvas>"+"</div>"+"<div class=\"lb-pguess\" aria-live=\"polite\">"+"</div>"+"<p class=\"lb-say lb-psay\" aria-live=\"polite\">"+"</p>"+"<p class=\"lb-note\">"+((TT("The energies are Slater’s estimates, the same rule of thumb the rest of Atom uses, so they are only roughly right: good for the inner shells and for outer s electrons, two to four times too high for outer p electrons (Trends, under Explore, shows that gap). Read the pattern: how many peaks, how tall, in what order.")))+"</p>"+"</div>";
      var zi=P.querySelector("[data-pz]");
      function setZ(){ var z=zOf(zi.value); if(!z){ if(zi.value.trim()) zi.setAttribute("aria-invalid","true"); return; } PE.follow=false; PE.guess=null; pesRenderGuess(); PE.z=z; REFRESH.pes(); ev("pes:z:"+z); }
      zi.addEventListener("change",setZ); zi.addEventListener("keydown",function(e){ zi.removeAttribute("aria-invalid"); if(e.key==="Enter"){ e.preventDefault(); setZ(); } });
      P.addEventListener("click",function(e){ var p=e.target.closest("[data-pp]"), gz=e.target.closest("[data-pgz]");
        if(gz&&PE.guess&&!PE.guess.done){ var G=PE.guess, pick=+gz.getAttribute("data-pgz"), ok=pick===G.z; G.done=true; PE.tries++; if(ok) PE.right++;
          pesRenderGuess(); [].forEach.call(P.querySelectorAll("[data-pgz]"),function(b){ var v=+b.getAttribute("data-pgz"); if(v===G.z) b.classList.add("ok"); else if(v===pick) b.classList.add("bad"); });
          P.querySelector(".lb-psay").textContent=TT("{ok}{lc}{ok2} Its peaks, from the left, hold {pesPeaks}: {z} electrons in all.",{ok:(ok?TT("Right: "):TT("It was ")),lc:lc(G.z),ok2:(ok?".":TT(", not {el}.",{el:lc(pick)})),pesPeaks:pesPeaks(G.z).map(function(q){ return q.count+" ("+q.name+")"; }).join(", "),z:G.z});
          if(ok){ var got=Progress.mark("seen",G.z); celebrate(got); } ev("pes:guess:"+(ok?"right":"wrong")); dirty=true; return; }
        if(!p) return; var k=p.getAttribute("data-pp");
        if(k==="guess") pesGuessNew();
        if(k==="follow"){ PE.follow=true; PE.z=Z; REFRESH.pes(); } });
      REFRESH.pes();
    };
    REFRESH.pes=function(){ var P=pane("pes"); if(!P||!built.pes) return; var z=pesZ(), inp=P.querySelector("[data-pz]"); if(inp&&D.activeElement!==inp) inp.value=nm(z);
      var fb=P.querySelector("[data-pp='follow']"); if(fb) fb.hidden=!!PE.follow; if(!PE.guess) pesSay(); dirty=true; };

    /* ======================================================== The Sun
       The Sun's light, with its dark lines: light that the atoms in the Sun's
       atmosphere take out on the way up. Overlay an element's own bright
       lines and see whether they land on dark ones. That is how, by 1860,
       people knew what the Sun is made of without going there, and how helium
       was found there before it was found on Earth. */
    var FRAUN=[["K",393.366,20],["H",396.847,20],["h",410.174,1],["G",430.790,26],["Hγ",434.047,1],["e",438.355,26],["d",466.814,26],["F",486.134,1],["c",495.761,26],["b4",516.733,12],["b2",517.270,12],["b1",518.362,12],["E",527.039,26],["D2",588.995,11],["D1",589.592,11],["C",656.281,1],["B",686.719,0],["A",759.370,0]];
    var SUN_POOL=[1,2,3,11,12,19,20,26,10];   /* the candidates: five are in the Sun's dark lines, helium is the famous exception */
    var SN={pick:0, found:{}, tried:{}};
    function vacNm(wAir){ var s=1000/wAir, s2=s*s; return wAir*(1+0.0000834254+0.02406147/(130-s2)+0.00015998/(38.9-s2)); }   /* Edlen's air to vacuum */
    function sunMatches(z){ var L=PTable.lineList(z); if(!L) return {lines:[],hits:[]}; var hits=[];
      L.lines.forEach(function(p){ FRAUN.forEach(function(fr){ if(fr[2]===z&&Math.abs(vacNm(fr[1])-p[0])<0.35) hits.push(fr); }); });
      return {lines:L.lines, hits:hits.filter(function(v,i,a){ return a.indexOf(v)===i; })}; }
    function drawSun(now){
      var c=host.querySelector('[data-c="sun"]'); if(!c||!c.offsetParent) return false;
      var f=fit(c), g=f.g, w=f.w, h=f.h, T=th(); g.clearRect(0,0,w,h); g.font="500 14px Archivo, sans-serif";
      var x0=16, x1=w-16, y0=28, y1=Math.round(h*0.52), y2=y1+18, y3=h-40, span=VIS1+10-VIS0, X=function(wl){ return x0+(x1-x0)*(wl-VIS0)/span; };
      /* the Sun's continuum, then the dark lines cut into it */
      for(var x=x0;x<x1;x++){ var wl=VIS0+(x-x0)*span/(x1-x0); g.fillStyle=wlRGB(wl); g.fillRect(x,y0,1,y1-y0); }
      var lastLx=-99, groups={b:"b (Mg)",D:"D (Na)"};
      FRAUN.forEach(function(fr){ var x=X(fr[1]); g.fillStyle="#000"; g.globalAlpha=fr[2]?0.92:0.6; g.fillRect(x-1,y0,fr[2]===11||fr[2]===12||fr[2]===20||fr[2]===1?2.5:1.5,y1-y0); g.globalAlpha=1; });
      FRAUN.forEach(function(fr){ var x=X(fr[1]), key=fr[0].charAt(0), name=groups[key]&&/^[bD]\d$/.test(fr[0])?groups[key]:fr[0];
        if(x-lastLx<16){ if(groups[key]&&/^[bD]\d$/.test(fr[0])) return; } /* one name per cluster */
        g.fillStyle=T.ink2; g.font="500 11px Archivo, sans-serif"; g.textAlign="center"; g.fillText(name,x,x-lastLx<30?y0-18:y0-6); lastLx=x; });
      g.font="500 14px Archivo, sans-serif";
      /* the chosen element's bright lines, underneath, on black */
      g.fillStyle="#000"; g.fillRect(x0,y2,x1-x0,y3-y2);
      if(SN.pick){ var M=sunMatches(SN.pick);
        M.lines.forEach(function(p){ if(p[0]<VIS0||p[0]>VIS1+10) return; var x=X(p[0]), hit=M.hits.some(function(fr){ return Math.abs(vacNm(fr[1])-p[0])<0.35; });
          g.fillStyle=wlRGB(p[0]); g.globalAlpha=0.5+0.5*Math.min(1,p[1]); g.fillRect(x-1.5,y2,3,y3-y2); g.globalAlpha=1;
          if(hit){ g.strokeStyle=T.light?"#111":"#fff"; g.lineWidth=1.5; g.beginPath(); g.moveTo(x,y1); g.lineTo(x,y2); g.stroke(); } });
        g.fillStyle=T.ink; label(g,TT("{nm}'s own light",{nm:nm(SN.pick)}),(x0+x1)/2,y3+20,T); }
      else { g.fillStyle=T.ink2; label(g,TT("Pick an element below to lay its lines under the Sun's"),(x0+x1)/2,y3+20,T); }
      g.fillStyle=T.ink2; g.textAlign="left"; g.fillText(VIS0+" nm",x0,y1+13); g.textAlign="right"; g.fillText((VIS1+10)+" nm",x1,y1+13);
      return false;
    }
    function sunSay(){
      var P=pane("sun"), z=SN.pick, say=P.querySelector(".lb-ssay"), foundN=Object.keys(SN.found).length, inSun=[1,11,12,20,26];
      if(!z){ say.textContent=""; return; }
      var M=sunMatches(z), own=FRAUN.filter(function(fr){ return fr[2]===z; });
      if(z===2) say.innerHTML=TT("<b>Helium:</b> no dark line. Its strongest yellow line, D3 at 587.6 nm, sits right beside sodium's pair but the Sun's quiet surface is too cool to take it out of the light. Helium was found in 1868 as a <i>bright</i> line in the Sun's chromosphere during an eclipse, 27 years before it was found on Earth, and named for the Sun (helios).");
      else if(own.length) say.innerHTML=TT("<b>{esc}: in the Sun.</b> {M} of its line{M2} land{M3} on dark lines: {M4}. {esc2} atoms in the Sun's atmosphere absorb exactly the colors they would emit.",{esc:esc(nm(z)),M:M.hits.length,M2:(M.hits.length>1?"s":""),M3:(M.hits.length>1?"":"s"),M4:M.hits.map(function(fr){ return (((fr[0])))+" ("+(((fmt(fr[1],1))))+" nm)"; }).join(", "),esc2:esc(nm(z))});
      else say.innerHTML=TT("<b>{esc}:</b> none of its lines land on the Sun's dark lines{M}. That does not prove it is absent, only that it is too rare or too cool here to leave a mark.",{esc:esc(nm(z)),M:(M.lines.length?"":TT(" (and Atom has no measured spectrum for it)"))});
      P.querySelector(".lb-sfound").textContent=TT("Found in the Sun so far: {foundN} ({foundN2} of {length}).",{foundN:(foundN?inSun.filter(function(k){ return SN.found[k]; }).map(function(k){ return nm(k); }).join(", "):TT("nothing yet")),foundN2:foundN,length:inSun.length});
      if(foundN===inSun.length&&!SN.doneSaid){ SN.doneSaid=true; toast(TT("All five found. That is the Sun's recipe, read from its light.")); ev("sun:all"); }
    }
    BUILD.sun=function(P){
      P.innerHTML="<div class=\"lb-sun\">"+"<p class=\"lb-note\">"+TT("Spread the Sun’s light into a rainbow and it is cut by thin dark lines: colors that atoms in the Sun’s atmosphere swallow on the way out. Fraunhofer mapped them in 1814 and gave them letters. Pick an element and its own bright lines appear underneath; where they line up with dark lines, that element is in the Sun. (A and B are oxygen in Earth’s air, not the Sun.)")+"</p>"+"<div class=\"lb-stagewrap sun\">"+"<canvas class=\"lb-cv\" data-c=\"sun\" role=\"img\" aria-label=\""+(((TT("The Sun’s spectrum with its dark lines, and the chosen element’s bright lines beneath"))))+"\">"+"</canvas>"+"</div>"+"<div class=\"lb-chips lb-schips\">"+((((SUN_POOL.map(function(z){ return "<button type=\"button\" data-sz=\""+(((((z)))))+"\" aria-pressed=\"false\">"+(((((el(z)[1])))))+" <span>"+(((((nm(z))))))+"</span>"+"</button>"; }).join('')))))+"</div>"+"<p class=\"lb-say lb-ssay\" aria-live=\"polite\">"+"</p>"+"<p class=\"lb-note lb-sfound\">"+(((TT("Found in the Sun so far: nothing yet (0 of 5)."))))+"</p>"+"</div>";
      P.addEventListener("click",function(e){ var b=e.target.closest("[data-sz]"); if(!b) return; var z=+b.getAttribute("data-sz"); SN.pick=z; SN.tried[z]=1;
        if(sunMatches(z).hits.length) SN.found[z]=1;
        [].forEach.call(P.querySelectorAll("[data-sz]"),function(x){ x.setAttribute("aria-pressed",+x.getAttribute("data-sz")===z?"true":"false"); });
        sunSay(); dirty=true; ev("sun:"+z); if(sunMatches(z).hits.length){ var got=Progress.mark("heard",z); celebrate(got); } });
      sunSay();
    };
    REFRESH.sun=function(){ dirty=true; };

    /* ======================================================== The math */
    /* Ten steps through the atom you pick, from the outside in, each with the
       classical picture or the quantum one, the equations, the numbers for
       that element worked through, a picture that moves, and a question to
       try. Every number is computed here from Atom's own data (Slater's rules,
       the measured ionization energies, the liquid-drop model the rest of the
       app uses); the constants are CODATA 2022, the same set the rest of Atom uses. Equations are MathML, so they
       read as math, scale with the text, and can be spoken. */
    var MA={z:0, follow:true, ch:0, r:0, nu:3, nl:2, waves:3, on:2, ol:1, om:0, mix:false, sub:"", zr:0, nn:-1, qr:1.0, nucleon:"p", play:true, t0:0};
    function mz(){ return MA.z||Z||1; }
    function rAtom(z){ var r=radOf(z); if(r) return r; var n=outerN(z), ns=NSTAR[n]||n; return Math.round(MK.a0*ns*ns/zeffOf(z)); }
    /* ---- the ten steps */
    var MCH=[
      {id:"pull", kind:TT("Classical"), short:TT("The pull")},
      {id:"orbit", kind:TT("Classical"), short:TT("An orbit")},
      {id:"collapse", kind:TT("Classical"), short:TT("The crisis")},
      {id:"bohr", kind:TT("Quantum"), short:TT("Bohr's rule")},
      {id:"waves", kind:TT("Quantum"), short:TT("Matter waves")},
      {id:"cloud", kind:TT("Quantum"), short:TT("Schrödinger")},
      {id:"many", kind:TT("Quantum"), short:TT("Many electrons")},
      {id:"rel", kind:TT("Relativity"), short:TT("Relativity")},
      {id:"nucleus", kind:TT("Nuclear"), short:TT("The nucleus")},
      {id:"quarks", kind:TT("Particle"), short:TT("Quarks")}
    ];
    function mathNums(){
      var z=mz(), o={z:z};
      var zf=zeffOf(z), r=MA.r||rAtom(z), rm=r*1e-12;
      o.zf=zf; o.r=r; o.F=MK.kC*zf*MK.e*MK.e/(rm*rm); o.U=-MK.ke2*zf/(r/1000);
      o.Fg=MK.G*MK.me*(nucMass(z)/MK.mp*MK.mpkg)/(rm*rm);   /* gravity from the whole nucleus: mass is never shielded */
      o.v=Math.sqrt(MK.kC*zf*MK.e*MK.e/(MK.me*rm)); o.T=2*Math.PI*rm/o.v; o.Eo=o.U/2;
      var ie=IE1[z-1]; o.ie=ie; o.rmatch=ie?MK.ke2*zf/(2*ie)*1000:null;
      o.tc=Math.pow(rm,3)/(4*zf*MK.re*MK.re*MK.c);
      o.acc=MK.kC*zf*MK.e*MK.e/(MK.me*rm*rm); o.P=2/3*MK.kC*MK.e*MK.e*o.acc*o.acc/Math.pow(MK.c,3);
      var nu=MA.nu, nl=MA.nl; o.rn=function(n){ return n*n*MK.a0/z; }; o.En=function(n){ return bohrE(z,n); };
      o.line=bohrLine(z,nu,nl); o.v1c=z*MK.alpha;
      o.lam=function(n){ return 2*Math.PI*o.rn(n)/n; };
      o.sub=MA.sub||((function(b){ return b[0]+","+b[1]; })(outerSub(z)));
      var sp=o.sub.split(","); o.sn=+sp[0]; o.sl=+sp[1]; o.sl_=slaterParts(z,o.sn,o.sl);
      o.nstar=NSTAR[o.sn]||o.sn; o.ieEst=MK.Ry*Math.pow(o.sl_.Zeff/o.nstar,2);
      var zr=MA.zr||z; o.zr=zr; o.za=zr*MK.alpha; o.gam=o.za<1?1/Math.sqrt(1-o.za*o.za):Infinity;
      o.eB=-MK.Ry*zr*zr; o.eD=o.za<1?MK.mec2*1e6*(Math.sqrt(1-o.za*o.za)-1):null;
      var N=MA.nn>=0?MA.nn:commonA(z)-z, A=z+N; o.N=N; o.A=A; o.R=MK.r0*Math.pow(A,1/3);
      o.vol=SEMF.aV*A; o.surf=-SEMF.aS*Math.pow(A,2/3); o.coul=-SEMF.aC*z*(z-1)/Math.pow(A,1/3); o.asym=-SEMF.aA*(A-2*z)*(A-2*z)/A;
      o.pair=(z%2===0&&N%2===0)?SEMF.aP/Math.sqrt(A):((z%2===1&&N%2===1)?-SEMF.aP/Math.sqrt(A):0);
      /* the formula's answer, the measured one where Atom has it (AME2020), and
         the one the later numbers use: measured first, then the formula, and
         nothing for a lone proton or a nucleus the formula says flies apart */
      var bm=(typeof BA_MEAS!=="undefined"&&BA_MEAS[z+"-"+A]!=null)?BA_MEAS[z+"-"+A]*A:null;
      o.Bf=bindingSEMF(z,A); o.Bm=A===1?0:bm; o.Bsrc=A===1?"none":(bm!=null?"measured":"formula");
      o.B=o.Bm!=null?o.Bm:Math.max(0,o.Bf); o.BA=o.B/A; o.dm=o.B/MK.u; o.M=z*MK.mp+N*MK.mn-o.B;
      o.barrier=MK.ke2*z/(o.R+MK.rp); o.ratio=rAtom(z)*1000/o.R;
      o.ups=2*z+N; o.downs=z+2*N; o.qm=o.ups*MK.mu+o.downs*MK.md; o.qfrac=o.qm/o.M;
      o.lamY=MK.hbarc/MK.mpi; o.Vc=MK.ke2/MA.qr;
      return o;
    }
    function nf(x,d){ return fmt(x,d); }
    function sciT(x,d){ return sci(x,d||3); }
    /* what each step says, shows and asks; returns {title,q,idea,eqs:[[mathml,plugged]],facts:[[dt,dd]],check:{q,a,tol,unit,why},limit,alt} */
    function mathText(id,o){
      var z=o.z, E=lc(z), Ecap=nm(z);
      if(id==="pull"){
        var F2=o.F/4;
        return {title:TT("How hard the nucleus pulls on {E}'s outer electron",{E:E}), q:TT("If the electron were a tiny charged ball and nothing else, how strong is the pull?"),
          idea:TT("{z} Then it is Coulomb's law, the same law that makes a balloon stick to a wall.",{z:(z===1?TT("Hydrogen's nucleus is one proton, and its one electron feels all of its charge; there is nothing in between."):
                z===2?TT("Helium's nucleus carries 2 positive charges, and each electron feels a little less than both: the other electron spends part of its time between it and the nucleus. Slater's rules estimate what is left, the effective charge."):
                TT("{cap}'s nucleus carries {z} positive charges, but its outer electron doesn't feel all of them: the electrons in the inner shells sit between and cancel part of it. Slater's rules estimate what is left, the effective charge.",{cap:cap(E),z:z}))}),
          eqs:[[MM(mi("F")+eq_+mfrac(mi("k")+mo("⁢")+msub(mi("q"),mn_(1))+mo("⁢")+msub(mi("q"),mn_(2)),msup(mi("r"),mn_(2)))),TT("Coulomb's law: the pull grows with both charges and falls with the square of the distance.")],
            [MM(Zeff_+eq_+mi("Z")+mo("−")+mi("S")+eq_+mn_(z)+mo("−")+mn_(nf(z-o.zf,2))+eq_+mn_(nf(o.zf,2))),TT("The charge the outer electron feels, after the inner electrons shield S of it.")],
            [MM(mi("F")+eq_+mfrac(mi("k")+mo("⁢")+Zeff_+mo("⁢")+msup(mi("e"),mn_(2)),msup(mi("r"),mn_(2)))),TT("= (8.988 × 10⁹ N·m²/C²) × {nf} × (1.602 × 10⁻¹⁹ C)² ÷ ({sciT} m)² = {nf2} nanonewtons",{nf:nf(o.zf,2),sciT:sciT(o.r*1e-12,3),nf2:nf(o.F*1e9,2)})],
            [MM(mi("U")+eq_+mo("−")+mfrac(mi("k")+mo("⁢")+Zeff_+mo("⁢")+msup(mi("e"),mn_(2)),mi("r"))),TT("= −1.440 eV·nm × {nf} ÷ {nf2} nm = {nf3} eV, the energy it would take to pull it free if this picture were right",{nf:nf(o.zf,2),nf2:nf(o.r/1000,4),nf3:nf(o.U,2)})]],
          facts:[[TT("Effective charge"),nf(o.zf,2)],[TT("Distance"),nf(o.r,0)+" pm"],[TT("Pull"),nf(o.F*1e9,2)+" nN"],[TT("Electric against the whole nucleus's gravity"),TT("{sciT} times stronger",{sciT:sciT(o.F/o.Fg,2)})]],
          check:{q:TT("Move the electron to twice this distance. What is the pull now, in nanonewtons?"), a:F2*1e9, tol:0.03, unit:"nN",
            why:TT("Double the distance and the pull falls to a quarter, because of the r² below the line: {nf} ÷ 4 = {nf2} nN.",{nf:nf(o.F*1e9,2),nf2:nf(F2*1e9,2)})},
          limit:TT("An electron is not a tiny ball sitting at one distance; the cloud spreads over a range. This step uses {E}'s {radOf} as the distance.",{E:E,radOf:(radOf(z)?TT("measured atomic radius"):TT("atomic radius estimated from Slater's rules (none has been measured)"))}),
          alt:TT("The nucleus of {E} with the outer electron {nf} picometers away and an arrow for the pull.",{E:E,nf:nf(o.r,0)})};
      }
      if(id==="orbit"){
        var v4=o.v/2;
        return {title:TT("If the electron orbited like a planet"), q:TT("What speed would keep it in a circle, the way gravity keeps the Moon?"),
          idea:TT("Set the electric pull equal to what a circle needs, m v²/r, just as you would for a satellite. The answer is fast: hundreds or thousands of kilometers a second, going around a few thousand trillion times a second."),
          eqs:[[MM(mfrac(mi("m")+mo("⁢")+msup(mi("v"),mn_(2)),mi("r"))+eq_+mfrac(mi("k")+mo("⁢")+Zeff_+mo("⁢")+msup(mi("e"),mn_(2)),msup(mi("r"),mn_(2)))),TT("The pull supplies exactly the force a circle needs.")],
            [MM(mi("v")+eq_+msqrt(mfrac(mi("k")+mo("⁢")+Zeff_+mo("⁢")+msup(mi("e"),mn_(2)),mi("m")+mo("⁢")+mi("r")))),TT("= {nf} km/s, which is {nf2} percent of the speed of light",{nf:nf(o.v/1000,0),nf2:nf(o.v/MK.c*100,2)})],
            [MM(mi("T")+eq_+mfrac(mn_(2)+pi_+mo("⁢")+mi("r"),mi("v"))),TT("= {sciT} s for one lap, or {sciT2} laps a second",{sciT:sciT(o.T,3),sciT2:sciT(1/o.T,3)})],
            [MM(mi("E")+eq_+mfrac(mi("U"),mn_(2))+eq_+mo("−")+mfrac(mi("k")+mo("⁢")+Zeff_+mo("⁢")+msup(mi("e"),mn_(2)),mn_(2)+mi("r"))),"= "+nf(o.Eo,2)+" eV. "+(o.ie?TT("The measured energy to remove the electron is {nf} eV; a classical orbit would match it at r = {nf2} pm.",{nf:nf(o.ie,2),nf2:nf(o.rmatch,0)}):"")]],
          facts:[[TT("Speed"),nf(o.v/1000,0)+" km/s"],[TT("Laps a second"),sciT(1/o.T,3)],[TT("Orbit energy"),nf(o.Eo,2)+" eV"],[TT("Measured energy to remove it"),o.ie?nf(o.ie,2)+" eV":TT("not measured")]],
          check:{q:TT("Put the orbit four times farther out. What speed keeps it circling, in km/s?"), a:v4/1000, tol:0.03, unit:"km/s",
            why:TT("v goes as 1/√r, so four times the distance halves the speed: {nf} ÷ 2 = {nf2} km/s.",{nf:nf(o.v/1000,0),nf2:nf(v4/1000,0)})},
          limit:TT("Nothing in this picture says which orbits are allowed, so it can't explain why every {E} atom is the same size. The next step shows it is worse than that.",{E:E}),
          alt:TT("An electron circling {E}'s nucleus, slowed down about ten thousand trillion times so you can see it.",{E:E})};
      }
      if(id==="collapse"){
        return {title:TT("Why the planet picture can't be right"), q:TT("A charge moving in a circle is accelerating, and accelerating charges give off light. How long would the orbit last?"),
          idea:TT("Every radio antenna works because accelerated charges radiate. An orbiting electron would radiate too, lose energy, and spiral into the nucleus. Work out how fast, and atoms would not last the blink of an eye. They last billions of years, so something in classical physics has to give."),
          eqs:[[MM(mi("P")+eq_+mfrac(mn_(2)+mo("⁢")+mi("k")+mo("⁢")+msup(mi("e"),mn_(2))+mo("⁢")+msup(mi("a"),mn_(2)),mn_(3)+mo("⁢")+msup(mi("c"),mn_(3)))),TT("Larmor's formula: the power an accelerated charge radiates. At the start that is {sciT} watts, from one electron.",{sciT:sciT(o.P,3)})],
            [MM(mfrac(mi("dE"),mi("dt"))+eq_+mo("−")+mi("P")+mo("⇒")+mfrac(mi("dr"),mi("dt"))+eq_+mo("−")+mfrac(mn_(4)+mo("⁢")+Zeff_+mo("⁢")+msubsup(mi("r"),mi("e"),mn_(2))+mo("⁢")+mi("c"),mn_(3)+mo("⁢")+msup(mi("r"),mn_(2)))),TT("Losing energy means falling inward, faster and faster (rₑ is the classical electron radius, 2.818 × 10⁻¹⁵ m).")],
            [MM(mi("t")+eq_+mfrac(msubsup(mi("r"),mn_(0),mn_(3)),mn_(4)+mo("⁢")+Zeff_+mo("⁢")+msubsup(mi("r"),mi("e"),mn_(2))+mo("⁢")+mi("c"))),"= ("+sciT(o.r*1e-12,3)+" m)³ ÷ (4 × "+nf(o.zf,2)+" × (2.818 × 10⁻¹⁵ m)² × 2.998 × 10⁸ m/s) = "+timeWords(o.tc)]],
          facts:[[TT("Starting distance"),nf(o.r,0)+" pm"],[TT("Time to fall in"),timeWords(o.tc)],[TT("Light given off at the start"),sciT(o.P,3)+" W"],[TT("How long real atoms last"),TT("billions of years")]],
          check:{q:TT("Start the orbit at twice the distance. How long would the fall take, in picoseconds?"), a:o.tc*8*1e12, tol:0.03, unit:"ps",
            why:TT("The time goes as r³, so twice the distance takes 2³ = 8 times as long: {timeWords} × 8 = {timeWords2}.",{timeWords:timeWords(o.tc),timeWords2:timeWords(o.tc*8)})},
          limit:TT("This is the crisis physicists faced around 1911, after Rutherford found the nucleus. Classical physics predicts collapse; real atoms are stable. The rest of this tab is how that was fixed."),
          alt:TT("The electron spiraling into {E}'s nucleus as it radiates, the whole fall stretched to a few seconds.",{E:E})};
      }
      if(id==="bohr"){
        var nu2=MA.nu<8?MA.nu+1:MA.nu, nl2=MA.nu<8?MA.nl:Math.max(1,MA.nl-1), L2=bohrLine(z,nu2,nl2);
        if(nu2===MA.nu&&nl2===MA.nl){ nl2=MA.nl===1?2:1; if(nl2>=nu2) nl2=nu2-1; L2=bohrLine(z,nu2,nl2); }
        return {title:TT("Bohr's rule: only some orbits are allowed"), q:TT("What if the electron's angular momentum can only come in whole steps of ℏ?"),
          idea:TT("In 1913 Niels Bohr simply declared it: the orbit's angular momentum must be a whole number times ℏ, and an electron in an allowed orbit does not radiate. Light comes out only when it jumps down from one orbit to another. The rule is exact for one electron, so this step uses {ionWords}.",{ionWords:ionWords(z)}),
          eqs:[[MM(mi("m")+mo("⁢")+mi("v")+mo("⁢")+mi("r")+eq_+mi("n")+mo("⁢")+hbar_+mo(",")+mspace()+mi("n")+eq_+mn_(1)+mo(",")+mn_(2)+mo(",")+mn_(3)+mo("…")),TT("The one new rule. Combine it with the circular orbit from step 2.")],
            [MM(msub(mi("r"),mi("n"))+eq_+mfrac(msup(mi("n"),mn_(2))+mo("⁢")+msub(mi("a"),mn_(0)),mi("Z"))),TT("r₁ = {nf} pm; r{subNum} = {nf2} pm (a₀ = 52.918 pm, the Bohr radius)",{nf:nf(o.rn(1),3),subNum:subNum(MA.nu),nf2:nf(o.rn(MA.nu),2)})],
            [MM(msub(mi("E"),mi("n"))+eq_+mo("−")+mfrac(mn_("13.606 eV")+mo("⁢")+msup(mi("Z"),mn_(2)),msup(mi("n"),mn_(2)))),TT("E₁ = {nf} eV; E{subNum} = {nf2} eV; E{subNum2} = {nf3} eV (with the small correction for the nucleus recoiling)",{nf:nf(o.En(1),z>9?0:2),subNum:subNum(MA.nu),nf2:nf(o.En(MA.nu),2),subNum2:subNum(MA.nl),nf3:nf(o.En(MA.nl),2)})],
            [MM(mi("λ")+eq_+mfrac(mi("h")+mo("⁢")+mi("c"),msub(mi("E"),mi("upper"))+mo("−")+msub(mi("E"),mi("lower")))),TT("= 1239.84 eV·nm ÷ {nf} eV = {nf2} nm, {lightWord}",{nf:nf(o.line.E,3),nf2:nf(o.line.w,o.line.w<10?4:2),lightWord:lightWord(o.line.w)})]],
          facts:[[TT("Atom"),cap(ionName(z))],[TT("Innermost orbit"),nf(o.rn(1),3)+" pm"],[TT("Jump {nu} → {nl}",{nu:MA.nu,nl:MA.nl}),nf(o.line.w,o.line.w<10?4:2)+" nm"],[TT("Speed in orbit 1"),TT("{nf}% of light",{nf:nf(o.v1c*100,2)})]],
          check:{q:TT("What wavelength comes out when the electron falls from {nu2} to {nl2}, in nanometers?",{nu2:nu2,nl2:nl2}), a:L2.w, tol:0.01, unit:"nm",
            why:TT("ΔE = 13.606 eV × {z}² × (1/{nl2}² − 1/{nu2}²) × {nf} = {nf2} eV, and λ = 1239.84 ÷ that = {nf3} nm.",{z:z,nl2:nl2,nu2:nu2,nf:nf(redF(z),6),nf2:nf(L2.E,3),nf3:nf(L2.w,L2.w<10?4:2)})},
          limit:TT("Bohr's rule gets one-electron atoms right and fails for everything else, and it can't say why the rule holds. Step 5 gives the reason; step 7 deals with many electrons."),
          alt:TT("The allowed orbits of {ionName}, with the electron jumping from orbit {nu} to orbit {nl} and giving off light.",{ionName:ionName(z),nu:MA.nu,nl:MA.nl})};
      }
      if(id==="waves"){
        var l2=o.lam(2), n_=Math.round(MA.waves), frac=Math.abs(MA.waves-n_);
        return {title:TT("The electron as a wave"), q:TT("Why would only whole steps of ℏ be allowed?"),
          idea:TT("Louis de Broglie's answer, in 1924: an electron is also a wave, with wavelength λ = h/p. A wave running around a loop only survives if it meets itself in step, so a whole number of wavelengths must fit around the orbit. That is Bohr's rule, explained. Slide the number of waves and watch what happens when it isn't whole."),
          eqs:[[MM(mi("λ")+eq_+mfrac(mi("h"),mi("p"))+eq_+mfrac(mi("h"),mi("m")+mo("⁢")+mi("v"))),TT("de Broglie's relation: every particle has a wavelength.")],
            [MM(mn_(2)+pi_+mo("⁢")+mi("r")+eq_+mi("n")+mo("⁢")+mi("λ")+mo("⇔")+mi("m")+mo("⁢")+mi("v")+mo("⁢")+mi("r")+eq_+mi("n")+mo("⁢")+hbar_),TT("Fitting n waves around the loop is the same statement as Bohr's rule.")],
            [MM(msub(mi("λ"),mi("n"))+eq_+mfrac(mn_(2)+pi_+mo("⁢")+msub(mi("r"),mi("n")),mi("n"))),TT("For {ionName}: λ₁ = {nf} pm, λ{subNum} = {nf2} pm",{ionName:ionName(z),nf:nf(o.lam(1),2),subNum:subNum(n_),nf2:nf(o.lam(n_),2)})]],
          facts:[[TT("Waves around the loop"),nf(MA.waves,2)],[TT("Closes on itself?"),frac<0.02?TT("Yes: it reinforces"):TT("No: it cancels itself")],[TT("Wavelength in orbit 1"),nf(o.lam(1),2)+" pm"],[TT("Electron's momentum"),sciT(MK.h/(o.lam(1)*1e-12),3)+" kg·m/s"]],
          check:{q:TT("What is the electron's wavelength in orbit 2 of {ionName}, in picometers?",{ionName:ionName(z)}), a:l2, tol:0.02, unit:"pm",
            why:TT("λ₂ = 2π r₂ / 2 = π × {nf} pm = {nf2} pm.",{nf:nf(o.rn(2),3),nf2:nf(l2,2)})},
          limit:TT("A wave on a circle is still a picture. The full wave equation, next, gives clouds rather than rings."),
          alt:TT("{nf} wavelengths around an orbit; {frac}",{nf:nf(MA.waves,2),frac:(frac<0.02?TT("the wave meets itself in step."):TT("the ends don't meet, so the wave cancels itself."))})};
      }
      if(id==="cloud"){
        var n=MA.on, l=MA.ol, m=MA.om, rm=MK.a0/(2*z)*(3*n*n-l*(l+1)), nodes=n-l-1, Eb=bohrE(z,n), pb=mixPartner(n,l,m), L=bohrLine(z,Math.max(n,pb[0]),Math.min(n,pb[0])), pair=orbName(n,l,m)+TT(" and ",{})+orbName(pb[0],pb[1],pb[2]);
        return {title:TT("Schrödinger's equation: the electron as a cloud"), q:TT("What shape does the electron's wave take in three dimensions?"),
          idea:TT("Erwin Schrödinger wrote the equation the wave obeys, in 1926. Its solutions for {v} are the orbitals: clouds whose brightness is the chance of finding the electron there. Two colors mark where the wave is positive and negative. A single orbital is still: the cloud doesn't move. Turn on the mix and the electron is in two orbitals at once, so the cloud sloshes back and forth; that sloshing charge is what gives off light.",{v:(((ionWords(z))))}),
          eqs:[[MM(mo("−")+mfrac(msup(hbar_,mn_(2)),mn_(2)+mi("m"))+msup(mo("∇"),mn_(2))+mi("ψ")+mo("−")+mfrac(mi("k")+mo("⁢")+mi("Z")+mo("⁢")+msup(mi("e"),mn_(2)),mi("r"))+mi("ψ")+eq_+mi("E")+mo("⁢")+mi("ψ")),TT("Kinetic energy plus the nucleus's pull, acting on the wave ψ, gives back the energy times ψ.")],
            [MM(mi("ψ")+eq_+msub(mi("R"),mrow(mi("n"),mi("l")))+mo("(")+mi("r")+mo(")")+mo("⁢")+msub(mi("Y"),mrow(mi("l"),mi("m")))+mo("(")+mi("θ")+mo(",")+mi("φ")+mo(")")),TT("The solutions split into a part that depends on distance and a part that depends on direction. n = {n}, l = {l}, m = {m}: the {orbName} orbital.",{n:n,l:l,m:m,orbName:orbName(n,l,m)})],
            [MM(mo("⟨")+mi("r")+mo("⟩")+eq_+mfrac(msub(mi("a"),mn_(0)),mn_(2)+mi("Z"))+mo("[")+mn_(3)+msup(mi("n"),mn_(2))+mo("−")+mi("l")+mo("(")+mi("l")+mo("+")+mn_(1)+mo(")")+mo("]")),TT("= {nf} pm on average. It has {nw} spherical {nodes_n, plural, one {node} other {nodes}} (n − l − 1) and {nw2} flat or conical {l_n, plural, one {one} other {ones}} (l).",{nf:nf(rm,rm<10?3:2),nw:words(nodes),nw2:words(l),nodes_n:nodes,l_n:l})],
            [MM(mi("f")+eq_+mfrac(msub(mi("E"),mi("upper"))+mo("−")+msub(mi("E"),mi("lower")),mi("h"))),TT("Mixing {pair} (one shell apart, one step of l apart), the cloud sloshes {sciT} times a second, exactly the frequency of the light this jump gives off: {nf} nm, {lightWord}.",{pair:pair,sciT:sciT(L.E/4.135667696e-15,3),nf:nf(L.w,L.w<10?4:2),lightWord:lightWord(L.w)})]],
          facts:[[TT("Orbital"),orbName(n,l,m)],[TT("Energy"),nf(Eb,z>9?1:3)+" eV"],[TT("Average distance"),nf(rm,rm<10?3:2)+" pm"],[TT("Nodes"),TT("{nodes} ({nodes2} spherical, {l} angular)",{nodes:(nodes+l),nodes2:nodes,l:l})]],
          check:{q:TT("How many spherical nodes does a {n}{OLET} orbital have?",{n:(n+1),OLET:OLET[Math.min(l,n)]}), a:(n+1)-Math.min(l,n)-1, tol:0, unit:"",
            why:TT("Spherical (radial) nodes number n − l − 1 = {n} − {v} − 1 = {v2}.",{n:(n+1),v:Math.min(l,n),v2:((n+1)-Math.min(l,n)-1)})},
          limit:TT("Exact for one electron. For more than one, the electrons repel each other and no exact solution exists; step 7 shows the standard estimate."),
          alt:TT("A slice through the {orbName} orbital of {ionName}{MA}",{orbName:orbName(n,l,m),ionName:ionName(z),MA:(MA.mix?TT(", mixed with another orbital so the cloud sloshes back and forth."):".")})};
      }
      if(id==="many"){
        var sl=o.sl_, sub=o.sn+OLET[o.sl], err=o.ie?(o.ieEst-o.ie)/o.ie*100:null;
        return {title:TT("Many electrons: who shields whom"), q:TT("How does a real, neutral {E} atom hold its electrons?",{E:E}),
          idea:TT("{z} fill the orbitals in order (Pauli lets two share each), then let each electron feel the nucleus minus the electrons that shield it. Slater's rules put numbers on the shielding: inner electrons hide almost all of a proton each, electrons in the same shell only about a third.",{z:(z===1?TT("Hydrogen, with one electron, is the one neutral atom solved exactly (step 5). Add a second electron and each one is pushed by the other as well as pulled by the nucleus, and from there on no exact formula exists. The standard shortcut:"):
                z===2?TT("With 2 electrons, each one is pulled by the nucleus and pushed by the other, and no exact formula exists. The standard shortcut:"):
                TT("With {z} electrons, each one is pulled by the nucleus and pushed by all the others, and no exact formula exists. The standard shortcut:",{z:z}))}),
          eqs:[[MM(mtext(configStr(z).replace(/([spdf])(\d+)/g,function(m0,a,b){ return a+supNum(b); }))),TT("How {E}'s electrons fill the shells, lowest energy first.",{E:E})],
            [MM(mi("S")+eq_+mo("∑")+mi("count")+mo("×")+mi("share")+eq_+mn_(nf(sl.S,2))),sl.parts.length?sl.parts.map(function(p){ return p.cnt+" × "+nf(p.f,2)+" ("+p.name+")"; }).join(" + ")+" = "+nf(sl.S,2):TT("Nothing to shield it: it is the only electron.")],
            [MM(Zeff_+eq_+mi("Z")+mo("−")+mi("S")+eq_+mn_(nf(sl.Zeff,2))),TT("A {sub} electron in {E} feels about {nf} of the nucleus's {z} charges.",{sub:sub,E:E,nf:nf(sl.Zeff,2),z:z})],
            [MM(mi("E")+mo("≈")+mo("−")+mn_("13.606 eV")+mo("⁢")+msup(mrow(mo("("),mfrac(Zeff_,msup(mi("n"),mo("*"))),mo(")")),mn_(2))),TT("= 13.606 × ({nf} ÷ {nf2})² = {nf3} eV to remove it{o}. n* is Slater's effective n.",{nf:nf(sl.Zeff,2),nf2:nf(o.nstar,1),nf3:nf(o.ieEst,2),o:(o.ie&&sub===((function(b){ return b[0]+OLET[b[1]]; })(outerSub(z)))?TT("; measured: {nf} eV ({err}{nf2}%)",{nf:nf(o.ie,2),err:(err>=0?"+":"−"),nf2:nf(Math.abs(err),0)}):"")})]],
          facts:[[TT("Electron"),sub],[TT("Shielding S"),nf(sl.S,2)],[TT("Charge it feels"),TT("{nf} of {z}",{nf:nf(sl.Zeff,2),z:z})],[TT("Estimate to remove it"),nf(o.ieEst,2)+" eV"]],
          check:{q:TT("Use n = {sn} instead of Slater's n* = {nf}. What does the estimate to remove a {sub} electron become, in eV?",{sn:o.sn,nf:nf(o.nstar,1),sub:sub}), a:MK.Ry*Math.pow(sl.Zeff/o.sn,2), tol:0.02, unit:"eV",
            why:"13.606 × ("+nf(sl.Zeff,2)+" ÷ "+o.sn+")² = "+nf(MK.Ry*Math.pow(sl.Zeff/o.sn,2),2)+" eV. "+(o.nstar<o.sn?TT("Slater shrank n to n* = {nf} because his estimates came out too small for big shells.",{nf:nf(o.nstar,1)}):TT("For n up to 3, n* is n, so the estimate does not change."))},
          limit:(o.sl===1?TT("Slater's rules are a rule of thumb from 1930, and this is where they break: for a p electron the estimate comes out two to four times too high, because his rules give s and p electrons of the same shell one shielding value, as if a p electron were held as tightly as an s. For the outer s electrons of most elements they land within about 20 percent. Trends, under Explore, draws the estimate against the measured value for every element."):
                 TT("Slater's rules are a rule of thumb from 1930: for an outer s electron like this one, the estimate usually lands within about 20 percent of the measured value (p electrons come out far worse). Modern calculations (Hartree–Fock and beyond) solve for all the electrons together. Trends, under Explore, draws the estimate against the measured value for every element."))+"",
          alt:TT("{cap}'s electrons in their shells, with the {sub} electrons highlighted and the inner electrons shielding the nucleus.",{cap:cap(E),sub:sub})};
      }
      if(id==="rel"){
        var zh=0.5/MK.alpha;
        return {title:TT("Near a heavy nucleus, relativity matters"), q:TT("How fast is the innermost electron going, and what does that change?"),
          idea:TT("In Bohr's picture the innermost electron moves at Z × α times the speed of light, where α ≈ 1/137 is the fine-structure constant. For light atoms that is slow. For heavy ones it is a large fraction of light speed: the electron gets heavier, its orbit pulls in, and the outer s orbits follow. That is why gold is yellow and mercury is a liquid. Slide Z to see where the simple formula breaks."),
          eqs:[[MM(mfrac(mi("v"),mi("c"))+mo("≈")+mi("Z")+mo("⁢")+mi("α")+mo(",")+mspace()+mi("α")+eq_+mfrac(msup(mi("e"),mn_(2)),mn_(4)+pi_+msub(mi("ε"),mn_(0))+hbar_+mi("c"))+mo("≈")+mfrac(mn_(1),mn_("137.036"))),TT("For Z = {zr}: v/c ≈ {nf}",{zr:o.zr,nf:nf(o.za,3)})],
            [MM(mi("γ")+eq_+mfrac(mn_(1),msqrt(mn_(1)+mo("−")+msup(mrow(mi("Z"),mi("α")),mn_(2))))),o.za<1?TT("γ = {nf}: the electron is {nf2}% heavier, and its orbit about {nf3}% smaller",{nf:nf(o.gam,3),nf2:nf((o.gam-1)*100,1),nf3:nf((1-1/o.gam)*100,1)}):TT("Zα ≥ 1: the square root fails")],
            [MM(msub(mi("E"),mi("1s"))+eq_+mi("m")+msup(mi("c"),mn_(2))+mo("(")+msqrt(mn_(1)+mo("−")+msup(mrow(mi("Z"),mi("α")),mn_(2)))+mo("−")+mn_(1)+mo(")")),o.eD!=null?TT("Dirac's exact one-electron energy: {nf} eV, against Bohr's {nf2} eV ({nf3}% deeper)",{nf:nf(o.eD,0),nf2:nf(o.eB,0),nf3:nf((o.eD/o.eB-1)*100,1)}):TT("Undefined past Z = 137 for a point nucleus. Real nuclei have size, which pushes the limit to about Z = 170.")]],
          facts:[["Z",String(o.zr)],[TT("Innermost speed"),TT("{nf}% of light",{nf:nf(o.za*100,1)})],[TT("Heavier by"),o.za<1?nf((o.gam-1)*100,1)+"%":"—"],[TT("Orbit smaller by"),o.za<1?nf((1-1/o.gam)*100,1)+"%":"—"]],
          check:{q:TT("At what Z does the innermost electron reach half the speed of light (v/c = Zα = 0.5)?"), a:zh, tol:0.008, unit:"",
            why:TT("Z = 0.5 ÷ α = 0.5 × 137.036 = {nf}, so around element 68 or 69, erbium and thulium.",{nf:nf(zh,1)})},
          limit:TT("These are one-electron estimates for the innermost electron. Real heavy atoms need the Dirac equation for all their electrons together."),
          alt:TT("The innermost electron's orbit for Z = {zr}, drawn smaller than the dashed nonrelativistic orbit by the relativistic contraction.",{zr:o.zr})};
      }
      if(id==="nucleus"){
        var A=o.A, st=nuclide(z,A);
        return {title:TT("The nucleus: tiny, dense, and held together"), q:TT("How big is {iso}'s nucleus, and what holds it together?",{iso:isoName(z,A)}),
          idea:TT("Nuclei are made of protons and neutrons packed like drops of liquid, so the volume grows with the number of nucleons, A. The liquid-drop model counts the glue: every nucleon bonds to its neighbors, the ones on the surface have fewer neighbors, the protons push each other apart, and nature prefers equal numbers of protons and neutrons, in pairs. The total, the binding energy, is mass that disappeared when the nucleus formed: E = mc²."),
          eqs:[[MM(mi("R")+eq_+msub(mi("r"),mn_(0))+mo("⁢")+msup(mi("A"),mfrac(mn_(1),mn_(3)))),TT("= 1.2 fm × {A}^⅓ = {nf} fm. The atom is about {nf2} times wider.",{A:A,nf:nf(o.R,2),nf2:nf(sig(o.ratio,2),0)})],
            [MM(mi("B")+eq_+msub(mi("a"),mi("V"))+mi("A")+mo("−")+msub(mi("a"),mi("S"))+msup(mi("A"),mfrac(mn_(2),mn_(3)))+mo("−")+msub(mi("a"),mi("C"))+mfrac(mi("Z")+mo("(")+mi("Z")+mo("−")+mn_(1)+mo(")"),msup(mi("A"),mfrac(mn_(1),mn_(3))))+mo("−")+msub(mi("a"),mi("A"))+mfrac(msup(mrow(mo("("),mi("A"),mo("−"),mn_(2),mi("Z"),mo(")")),mn_(2)),mi("A"))+mo("±")+mi("δ")),
              "= "+nf(o.vol,0)+" − "+nf(-o.surf,0)+" − "+nf(-o.coul,0)+" − "+nf(-o.asym,1)+(o.pair?(o.pair>0?" + ":" − ")+nf(Math.abs(o.pair),2):" + 0")+" = "+nf(o.Bf,1)+" MeV"+(o.Bsrc==="none"?TT(". A lone proton has nothing to bind to, so its real binding energy is 0; the formula is built for nuclei of many nucleons and means nothing here"):(o.Bf<0?TT(", a negative number: the formula says this nucleus would fly apart"):TT(", or {nf} MeV per nucleon",{nf:nf(o.Bf/A,3)}))+(o.Bm!=null?TT(". Measured (AME2020): {nf} MeV",{nf:nf(o.Bm,1)}):""))],
            [MM(mi("Δ")+mi("m")+eq_+mfrac(mi("B"),msup(mi("c"),mn_(2)))),TT("= {nf} MeV ÷ 931.494 MeV per u = {nf2} u missing{o}{o2}",{nf:nf(o.B,1),nf2:nf(o.dm,4),o:(o.Bsrc==="none"?TT(": nothing, because one proton is its own nucleus"):TT(": the nucleus weighs that much less than its parts")),o2:(o.Bsrc==="measured"?TT(" (using the measured B)"):"")})],
            [MM(msub(mi("V"),mi("barrier"))+eq_+mfrac(mi("k")+mo("⁢")+mi("Z")+mo("⁢")+msup(mi("e"),mn_(2)),mi("R")+mo("+")+msub(mi("r"),mi("p")))),TT("= 1.440 MeV·fm × {z} ÷ ({nf} + 0.84) fm = {nf2} MeV for a proton to touch it",{z:z,nf:nf(o.R,2),nf2:nf(o.barrier,2)})]],
          facts:[[TT("Nucleus"),cap(isoName(z,A))+": "+st.title.toLowerCase()],[TT("Radius"),nf(o.R,2)+" fm"],[TT("Binding energy"),nf(o.B,1)+" MeV"+(o.Bsrc==="measured"?TT(", measured"):(o.Bsrc==="formula"?TT(", formula"):""))],[TT("Per nucleon"),nf(o.BA,3)+" MeV"]],
          check:{q:TT("A nucleus with eight times as many nucleons: what is its radius, in femtometers?"), a:2*o.R, tol:0.02, unit:"fm",
            why:TT("R goes as A^⅓, and 8^⅓ = 2, so the radius doubles: 2 × {nf} = {nf2} fm.",{nf:nf(o.R,2),nf2:nf(2*o.R,2)})},
          limit:TT("The liquid-drop model misses the magic numbers (2, 8, 20, 28, 50, 82, 126), where nuclei are extra stable. Its coefficients here are Rohlf's (1994), the same ones Atom uses everywhere."),
          alt:TT("{cap}: {z} protons and {N} neutrons packed together, with the five pieces of its binding energy as bars.",{cap:cap(isoName(z,A)),z:z,N:o.N})};
      }
      /* quarks */
      var V1=MK.ke2/1.0;
      return {title:TT("Inside the nucleons: quarks and the strong force"), q:TT("What holds protons together when their charges push them apart?"),
        idea:TT("Two protons touching repel with millions of electron-volts. Something stronger and very short-ranged must hold them: the strong force. Yukawa's 1935 idea gives its range from the mass of the particle that carries it, the pion. Look deeper and each proton and neutron is three quarks bound by gluons, and almost all of their mass is the energy of the quarks' motion and of the gluon field, not the quarks' own masses."),
        eqs:[[MM(msub(mi("V"),mi("C"))+eq_+mfrac(mi("k")+mo("⁢")+msup(mi("e"),mn_(2)),mi("r"))),TT("= 1.440 MeV·fm ÷ {nf} fm = {nf2} MeV pushing two protons apart",{nf:nf(MA.qr,2),nf2:nf(o.Vc,2)})],
          [MM(mi("λ")+eq_+mfrac(hbar_,msub(mi("m"),mi("π"))+mo("⁢")+mi("c"))+eq_+mfrac(mn_("197.33 MeV·fm"),mn_("139.57 MeV"))),TT("= {nf} fm: the strong force fades within about this distance, like e^(−r/λ)/r",{nf:nf(o.lamY,3)})],
          [MM(mi("p")+eq_+mi("u")+mi("u")+mi("d")+mo(":")+mfrac(mn_(2),mn_(3))+mo("+")+mfrac(mn_(2),mn_(3))+mo("−")+mfrac(mn_(1),mn_(3))+eq_+mn_(1)+mo(",")+mspace()+mi("n")+eq_+mi("u")+mi("d")+mi("d")+mo(":")+mn_(0)),TT("The charges of the quarks add up to the proton's and neutron's.")],
          [MM(mfrac(mrow(mi(TT("quark",{})),mspace(),mi(TT("masses",{}))),mrow(mi(TT("nucleus",{})),mspace(),mi(TT("mass",{}))))+eq_+mfrac(mn_(o.ups+" × 2.16 + "+o.downs+" × 4.70 MeV"),mn_(nf(o.M,0)+" MeV"))),TT("= {nf}%: the rest of {iso}'s mass is the energy of the quarks and gluons moving inside, E = mc²",{nf:nf(o.qfrac*100,2),iso:isoName(z,o.A)})]],
        facts:[[TT("Up quarks"),String(o.ups)],[TT("Down quarks"),String(o.downs)],[TT("Quark rest mass"),nf(o.qm,0)+" MeV"],[TT("Share of the mass"),nf(o.qfrac*100,2)+"%"]],
        check:{q:TT("Add one neutron to {iso}. How many down quarks does the nucleus hold now?",{iso:isoName(z,o.A)}), a:o.downs+2, tol:0, unit:"",
          why:TT("A neutron is up, down, down, so it brings two: {downs} + 2 = {o}.",{downs:o.downs,o:(o.downs+2)})},
        limit:TT("Quark masses are the running masses from the Particle Data Group (about 2.2 and 4.7 MeV) and are only known to a few percent. The strong-force curve shows its shape and range, not a fitted strength."),
        alt:TT("A {MA} as three quarks joined by gluons, and the electric and strong forces between two protons {nf} femtometers apart.",{MA:(MA.nucleon==="p"?TT("proton",{}):TT("neutron",{})),nf:nf(MA.qr,2)})};
    }

    /* ---- controls each step offers */
    function mathCtl(id,o){
      var z=o.z, h='';
      function rng(key,label,min,max,step,val,out){ return "<label class=\"lb-mslider\">"+"<span>"+(((((label)))))+" <output data-mo=\""+(((((key)))))+"\">"+(((((out)))))+"</output>"+"</span><input type=\"range\" data-mv=\""+(((((key)))))+"\" min=\""+(((((min)))))+"\" max=\""+(((((max)))))+"\" step=\""+(((((step)))))+"\" value=\""+(((((val)))))+"\">"+"</label>"; }
      function sel(key,label,opts,val){ return "<label class=\"lb-field\">"+(((label)))+"<select data-mv=\""+(((key)))+"\">"+(((opts.map(function(x){ return "<option value=\""+(((x[0])))+"\""+((((String(x[0])===String(val)?' selected':''))))+">"+(((esc(x[1]))))+"</option>"; }).join(''))))+"</select>"+"</label>"; }
      if(id==="pull"||id==="orbit"||id==="collapse") h=(rng("r",TT("Distance from the nucleus"),5,400,1,Math.round(o.r),nf(o.r,0)+" pm"))+"<button type=\"button\" class=\"lb-btn sm ghost\" data-mx=\"r0\">"+TT("Back to {esc}'s radius",{esc:esc(lc(z))})+"</button>";
      else if(id==="bohr"){ var ns=[]; for(var i=1;i<=8;i++) ns.push([i,"n = "+i]); h='<div class="lb-row">'+sel("nu",TT("Jump from"),ns.slice(1),MA.nu)+sel("nl",TT("down to"),ns.slice(0,MA.nu-1),MA.nl)+'</div>'; }
      else if(id==="waves") h=(rng("waves",TT("Waves around the loop"),1,6,0.05,MA.waves,nf(MA.waves,2)))+"<div class=\"lb-chips\" role=\"group\" aria-label=\""+TT("Snap to a whole number")+"\">"+([1,2,3,4,5].map(function(k){ return "<button type=\"button\" data-mw=\""+(((k)))+"\">"+(((k)))+"</button>"; }).join(''))+"</div>";
      else if(id==="cloud"){ var nO=[],lO=[],mO=[],k;
        for(k=1;k<=5;k++) nO.push([k,"n = "+k]); for(k=0;k<MA.on;k++) lO.push([k,"l = "+k+" ("+OLET[k]+")"]); for(k=-MA.ol;k<=MA.ol;k++) mO.push([k,"m = "+k]);
        h="<div class=\"lb-row\">"+(((((sel("on",TT("Shell"),nO,MA.on))))))+(((((sel("ol",TT("Shape"),lO,MA.ol))))))+(((((sel("om",TT("Tilt"),mO,MA.om))))))+"</div>"+"<div class=\"lb-row\">"+"<button type=\"button\" class=\"lb-btn sm"+((((((MA.mix?' go':''))))))+"\" data-mx=\"mix\" aria-pressed=\""+((((((MA.mix?"true":"false"))))))+"\">"+((((((MA.mix?TT("Mixing with {function}",{function:(function(b){ return orbName(b[0],b[1],b[2]); })(mixPartner(MA.on,MA.ol,MA.om))}):TT("Mix with the next orbital up")))))))+"</button>"+"<div class=\"lb-chips\" role=\"group\" aria-label=\""+((((TT("Orbitals to try")))))+"\">"+((((([["1,0,0","1s"],["2,1,0","2pz"],["3,2,0","3dz²"],["3,2,2",TT("3dx²−y²")],["4,3,0","4fz³"]].map(function(x){ return "<button type=\"button\" data-mo3=\""+(((x[0])))+"\">"+(((x[1])))+"</button>"; }).join(''))))))+"</div>"+"</div>"; }
      else if(id==="many"){ var cfg=configOf(z), seen={};
        h="<div class=\"lb-chips\" role=\"group\" aria-label=\""+(TT("Pick an electron"))+"\">"+((cfg.filter(function(x){ var k2=x[0]+","+x[1]; if(seen[k2]) return false; seen[k2]=1; return true; }).map(function(x){ var k2=x[0]+","+x[1];
          return "<button type=\"button\" data-msub=\""+(((((k2)))))+"\" aria-pressed=\""+((((((k2===o.sub?"true":"false"))))))+"\">"+(((((x[0])))))+(((((OLET[x[1]])))))+" <span>"+(((((x[2])))))+" e⁻</span>"+"</button>"; }).join('')))+"</div>"; }
      else if(id==="rel") h=(rng("zr",TT("Nuclear charge Z"),1,140,1,o.zr,String(o.zr)))+"<button type=\"button\" class=\"lb-btn sm ghost\" data-mx=\"zr0\">"+TT("Back to {esc}",{esc:esc(lc(z))})+"</button>";
      else if(id==="nucleus"){ var lo=Math.max(0,Math.round(o.N*0.6)-2), hi=Math.round(o.N*1.4)+4; h=(rng("nn",TT("Neutrons"),lo,hi,1,o.N,o.N+" ("+isoName(z,o.A)+")"))+"<button type=\"button\" class=\"lb-btn sm ghost\" data-mx=\"nn0\">"+TT("Back to {esc}",{esc:esc(isoName(z,commonA(z)))})+"</button>"; }
      else h=rng("qr",TT("Distance between two protons"),0.5,4,0.05,MA.qr,nf(MA.qr,2)+" fm")+'<div class="lb-row">'+sel("nucleon",TT("Look inside a"),[["p",TT("proton",{})],["n",TT("neutron",{})]],MA.nucleon)+'</div>';
      return (((h)))+"<button type=\"button\" class=\"lb-btn sm ghost\" data-mx=\"play\" aria-pressed=\""+((((MA.play?"true":"false"))))+"\">"+((((MA.play?TT("Pause"):TT("Play")))))+"</button>";
    }

    function mathRender(full){
      var P=pane("math"); if(!P||!built.math) return;
      var o=mathNums(), ch=MCH[MA.ch], t=mathText(ch.id,o), z=o.z;
      var inp=P.querySelector("[data-mz]"); if(inp&&D.activeElement!==inp){ inp.value=nm(z); inp.removeAttribute("aria-invalid"); }
      P.querySelector(".lb-mtile").innerHTML=tile(z,true);
      var zn=P.querySelector(".lb-mzname"); if(zn) zn.textContent=lc(z);
      [].forEach.call(P.querySelectorAll("[data-mch]"),function(b,i){ if(i===MA.ch) b.setAttribute("aria-current","step"); else b.removeAttribute("aria-current"); });
      P.querySelector(".lb-mkind").textContent=TT("Step {MA} of {length} · {kind}",{MA:(MA.ch+1),length:MCH.length,kind:ch.kind});
      /* steps 4 to 6 are worked on the one-electron ion (Fe²⁵⁺ for iron): the
         badge says so where the eye lands, not only in the text */
      var ion=P.querySelector(".lb-mion"), oneE=(ch.id==="bohr"||ch.id==="waves"||ch.id==="cloud")&&z>1;
      ion.hidden=!oneE; if(oneE) ion.textContent=TT("Worked on {ionName}, {el} with one electron",{ionName:ionName(z),el:lc(z),z:z});
      var fb=P.querySelector("[data-mfollow]"); if(fb) fb.hidden=!!MA.follow;
      P.querySelector(".lb-mkind").setAttribute("data-kind",ch.kind.toLowerCase());
      P.querySelector(".lb-mtitle").textContent=t.title;
      P.querySelector(".lb-mq").textContent=t.q;
      P.querySelector(".lb-midea").textContent=t.idea;
      P.querySelector(".lb-meqs").innerHTML=t.eqs.map(function(e){ return '<li><div class="lb-mwide">'+e[0]+'</div><p>'+esc(e[1])+'</p></li>'; }).join('');
      /* an equation wider than the column scrolls sideways; then it must be
         reachable from the keyboard, so it becomes a focusable region */
      requestAnimationFrame(function(){ [].forEach.call(P.querySelectorAll(".lb-mwide"),function(x){ var over=x.scrollWidth>x.clientWidth+2;
        if(over){ x.tabIndex=0; x.setAttribute("role","region"); x.setAttribute("aria-label",TT("Equation (scrolls sideways)")); } else { x.removeAttribute("tabindex"); x.removeAttribute("role"); x.removeAttribute("aria-label"); } }); });
      P.querySelector(".lb-mfacts").innerHTML=t.facts.map(function(f){ return '<div><dt>'+esc(f[0])+'</dt><dd>'+esc(f[1])+'</dd></div>'; }).join('');
      P.querySelector(".lb-mlimit").textContent=t.limit;
      P.querySelector("[data-c='math']").setAttribute("aria-label",t.alt);
      var cq=P.querySelector(".lb-mcq"); if(full||cq.getAttribute("data-q")!==t.check.q){ cq.textContent=t.check.q; cq.setAttribute("data-q",t.check.q); P.querySelector(".lb-mfb").textContent=""; P.querySelector("[data-mans]").value=""; }
      P.querySelector(".lb-munit").textContent=t.check.unit;
      MA.check=t.check;
      if(full) P.querySelector(".lb-mctl").innerHTML=mathCtl(ch.id,o);
      else { [].forEach.call(P.querySelectorAll("[data-mo]"),function(x){ var k=x.getAttribute("data-mo");
        x.textContent=k==="r"?nf(o.r,0)+" pm":k==="waves"?nf(MA.waves,2):k==="zr"?String(o.zr):k==="nn"?o.N+" ("+isoName(z,o.A)+")":k==="qr"?nf(MA.qr,2)+" fm":x.textContent; }); }
      P.querySelector("[data-mnav='-1']").disabled=MA.ch===0;
      var nx=P.querySelector("[data-mnav='1']"); nx.textContent=MA.ch===MCH.length-1?TT("Back to step 1"):TT("Next: {MCH}",{MCH:MCH[MA.ch+1].short});
      dirty=true;
    }
    function mathGo(i){ MA.ch=Math.max(0,Math.min(MCH.length-1,i)); MA.t0=0; mathRender(true); ev("math:"+MCH[MA.ch].id); }
    function mathSetZ(z){ if(!z) return; MA.z=z; MA.r=0; MA.sub=""; MA.zr=0; MA.nn=-1; mathRender(true); }
    BUILD.math=function(P){
      MA.z=MA.z||Z||1;
      P.innerHTML=(((elDatalist())))+"<div class=\"lb-math\">"+"<div class=\"lb-mtop\">"+"<div class=\"lb-mpick\">"+"<span class=\"lb-mtile\" aria-hidden=\"true\"></span>"+"<label class=\"lb-field\">"+(((TT("Element"))+"<input class=\"lb-input\" data-mz list=\""+((dlId))+"\" autocomplete=\"off\" spellcheck=\"false\">"))+"</label>"+"<button type=\"button\" class=\"lb-btn ghost\" data-mfollow hidden title=\""+((TT("Go back to the element picked in the table")))+"\">"+((TT("Follow the table")))+"</button>"+"<button type=\"button\" class=\"lb-btn ghost\" data-mlink title=\""+((TT("A link that opens this element at this step")))+"\">"+((TT("Copy link")))+"</button>"+"<button type=\"button\" class=\"lb-btn ghost\" data-msheet title=\""+((TT("A printable worksheet: the ten questions for this element, with the answer key on its own page")))+"\">"+((TT("Worksheet")))+"</button>"+"</div>"+"<ol class=\"lb-msteps\" aria-label=\""+((TT("Steps")))+"\">"+(((MCH.map(function(c,i){ return "<li>"+"<button type=\"button\" data-mch=\""+(((((i)))))+"\" data-kind=\""+(((((c.kind.toLowerCase())))))+"\"><b>"+((((((i+1))))))+"</b> <span>"+(((((esc(c.short))))))+"</span>"+"</button>"+"</li>"; }).join(''))))+"</ol>"+"</div>"+"<div class=\"lb-cols lb-mcols\">"+"<div class=\"lb-mleft\">"+"<div class=\"lb-stagewrap lb-mstage\">"+"<canvas class=\"lb-cv\" data-c=\"math\" role=\"img\" aria-label=\"\">"+"</canvas>"+"</div>"+"<div class=\"lb-mctl\">"+"</div>"+"</div>"+"<div class=\"lb-mright\">"+"<p class=\"lb-mkind\">"+"</p>"+"<p class=\"lb-mion\" hidden>"+"</p>"+"<h3 class=\"lb-mtitle\">"+"</h3>"+"<p class=\"lb-mq\">"+"</p>"+"<p class=\"lb-say lb-midea\">"+"</p>"+"<h4 class=\"lb-h\">"+((TT("The math, with <span class=\"lb-mzname\"></span>'s numbers")))+"</h4>"+"<ol class=\"lb-meqs\">"+"</ol>"+"<dl class=\"lb-facts lb-mfacts\">"+"</dl>"+"<section class=\"lb-mcheck\" aria-label=\""+((TT("Try it")))+"\">"+"<h4 class=\"lb-h\">"+((TT("Try it")))+"</h4>"+"<p class=\"lb-mcq\">"+"</p>"+"<form class=\"lb-qform lb-mform\">"+"<input class=\"lb-input\" type=\"number\" step=\"any\" inputmode=\"decimal\" data-mans aria-label=\""+((TT("Your answer")))+"\"><span class=\"lb-munit\"></span>"+"<button type=\"submit\" class=\"lb-btn go\">"+((TT("Check")))+"</button>"+"<button type=\"button\" class=\"lb-btn ghost\" data-mshow>"+((TT("Show me")))+"</button>"+"</form>"+"<p class=\"lb-mfb\" aria-live=\"polite\">"+"</p>"+"</section>"+"<p class=\"lb-note lb-mlimit\">"+"</p>"+"<div class=\"lb-row lb-mnav\">"+"<button type=\"button\" class=\"lb-btn\" data-mnav=\"-1\">"+((TT("Previous step")))+"</button>"+"<button type=\"button\" class=\"lb-btn go\" data-mnav=\"1\">"+((TT("Next")))+"</button>"+"</div>"+"</div>"+"</div>"+"</div>";
      var zi=P.querySelector("[data-mz]");
      function setZ(){ var z=zOf(zi.value); if(!z){ if(zi.value.trim()) zi.setAttribute("aria-invalid","true"); return; } MA.follow=false; mathSetZ(z); ev("math:z:"+z); }
      zi.addEventListener("change",setZ);
      zi.addEventListener("keydown",function(e){ zi.removeAttribute("aria-invalid"); if(e.key==="Enter"){ e.preventDefault(); setZ(); } });
      P.addEventListener("input",function(e){ var r=e.target.closest("input[data-mv]"); if(!r) return; var k=r.getAttribute("data-mv"), v=+r.value;
        if(k==="r") MA.r=v; else if(k==="waves") MA.waves=v; else if(k==="zr") MA.zr=v; else if(k==="nn") MA.nn=v; else if(k==="qr") MA.qr=v;
        mathRender(false); });
      P.addEventListener("change",function(e){ var s=e.target.closest("select[data-mv]"); if(!s) return; var k=s.getAttribute("data-mv"), v=s.value;
        if(k==="nu"){ MA.nu=+v; if(MA.nl>=MA.nu) MA.nl=MA.nu-1; } else if(k==="nl") MA.nl=+v;
        else if(k==="on"){ MA.on=+v; if(MA.ol>=MA.on) MA.ol=MA.on-1; if(Math.abs(MA.om)>MA.ol) MA.om=0; MA.cache=null; }
        else if(k==="ol"){ MA.ol=+v; if(Math.abs(MA.om)>MA.ol) MA.om=0; MA.cache=null; } else if(k==="om"){ MA.om=+v; MA.cache=null; }
        else if(k==="nucleon") MA.nucleon=v;
        mathRender(true); var again=pane("math").querySelector('select[data-mv="'+k+'"]'); if(again) again.focus(); });
      P.addEventListener("click",function(e){
        var c=e.target.closest("[data-mch]"), nv=e.target.closest("[data-mnav]"), x=e.target.closest("[data-mx]"), w=e.target.closest("[data-mw]"), o3=e.target.closest("[data-mo3]"), sb=e.target.closest("[data-msub]"), sh=e.target.closest("[data-mshow]"),
          lk=e.target.closest("[data-mlink]"), fo=e.target.closest("[data-mfollow]");
        if(c){ mathGo(+c.getAttribute("data-mch")); return; }
        if(lk){ var url=labLink({lab:"math",z:mz(),step:MA.ch}); copyText(url,null,function(ok){ toast(ok?TT("Link copied: {url}",{url:url}):TT("Could not copy. The link is {url}",{url:url})); }); ev("math:link"); return; }
        if(e.target.closest("[data-msheet]")){ printHTML(mathSheetHTML()); ev("math:sheet"); return; }
        if(fo){ MA.follow=true; mathSetZ(Z); ev("math:follow"); return; }
        if(nv){ var dn=+nv.getAttribute("data-mnav"); mathGo(dn>0&&MA.ch===MCH.length-1?0:MA.ch+dn); var tgt=pane("math").querySelector(".lb-mright"); if(tgt) try{ tgt.scrollIntoView({block:"nearest",behavior:opt.calm?"auto":"smooth"}); }catch(er){} return; }
        if(w){ MA.waves=+w.getAttribute("data-mw"); var rr=pane("math").querySelector('input[data-mv="waves"]'); if(rr) rr.value=MA.waves; mathRender(false); return; }
        if(o3){ var p=o3.getAttribute("data-mo3").split(","); MA.on=+p[0]; MA.ol=+p[1]; MA.om=+p[2]; MA.cache=null; mathRender(true); return; }
        if(sb){ MA.sub=sb.getAttribute("data-msub"); mathRender(true); var b2=pane("math").querySelector('[data-msub="'+MA.sub+'"]'); if(b2) b2.focus(); return; }
        if(sh){ var ck=MA.check; pane("math").querySelector(".lb-mfb").innerHTML=TT("<b>Answer: {esc}.</b> {ck}",{esc:esc(ckAns(ck)),ck:esc(ck.why)}); return; }
        if(x){ var k=x.getAttribute("data-mx");
          if(k==="r0") MA.r=0; else if(k==="zr0") MA.zr=0; else if(k==="nn0") MA.nn=-1;
          else if(k==="mix") MA.mix=!MA.mix; else if(k==="play") MA.play=!MA.play;
          mathRender(true); var b3=pane("math").querySelector('[data-mx="'+k+'"]'); if(b3) b3.focus(); }
      });
      P.querySelector(".lb-mform").addEventListener("submit",function(e){ e.preventDefault(); var ck=MA.check, a=P.querySelector("[data-mans]"), v=parseFloat(String(a.value).replace(/,/g,"")), fb=P.querySelector(".lb-mfb");
        if(!isFinite(v)){ fb.textContent=TT("Type a number first."); a.focus(); return; }
        var ok=ck.tol===0?Math.abs(v-ck.a)<0.5:Math.abs(v-ck.a)<=Math.abs(ck.a)*ck.tol;
        fb.innerHTML=(ok?TT("<b class=\"lb-ok\">Right.</b> "):TT("<b class=\"lb-err\">Not quite.</b> "))+esc(ok?ck.why:mathHint(v,ck));
        ev("math:check:"+MCH[MA.ch].id+":"+(ok?"right":"wrong")); });
      mathRender(true);
      MA.pending=false;
    };
    /* a wrong answer gets a hint about what kind of wrong it is: a unit slip
       (off by 1,000 or a million), a sign, a factor of 2 or 4, a square root
       not taken, or just far off */
    function mathHint(v,ck){
      var a=ck.a, tol=Math.max(ck.tol,0.02);
      function near(x,y){ return y!==0&&Math.abs(x-y)<=Math.abs(y)*tol; }
      if(a!==0&&v!==0&&(v<0)!==(a<0)&&near(-v,a)) return TT("Right size, wrong sign. Which way does this quantity point?");
      if(near(v*1000,a)||near(v/1000,a)) return TT("Off by a factor of 1,000: check the unit the question asks for{ck}.",{ck:(ck.unit?" ("+ck.unit+")":"")});
      if(near(v*1e6,a)||near(v/1e6,a)) return TT("Off by a factor of a million: check the unit the question asks for{ck}.",{ck:(ck.unit?" ("+ck.unit+")":"")});
      if(near(v*2,a)) return TT("Half the answer. Something in the step is twice what you used.");
      if(near(v/2,a)) return TT("Twice the answer. Something in the step is half what you used.");
      if(near(v*4,a)||near(v/4,a)) return TT("Off by a factor of 4. Is there a square in this step?");
      if(a>0&&v>0&&(near(v*v,a)||near(Math.sqrt(v),a))) return TT("That is the square (or the root) of the answer. Check which one the step wants.");
      if(a!==0&&Math.abs(v-a)<=Math.abs(a)*0.12) return TT("Close: within 12 percent. Carry more digits through, or reread which value the step uses.");
      if(a!==0&&(Math.abs(v)>Math.abs(a)*100||Math.abs(v)<Math.abs(a)/100)) return TT("Far off, by more than a hundred times. Start again from the equation above.");
      return TT("Try again, or press Show me.");
    }
    /* a worksheet: the ten questions for the element on the screen, each with
       the step's key equation and the numbers it needs, an answer line, and
       the answer key with the working on a page of its own, so a teacher can
       print the first pages for the class and keep the last */
    function mathSheetHTML(){
      var o=mathNums(), z=o.z, E=nm(z), rows=[], key=[];
      MCH.forEach(function(ch,i){ var t=mathText(ch.id,o);
        rows.push("<section class=\"lb-sheet-q\">"+"<h2>"+((i+1))+". "+(esc(t.title))+"</h2>"+"<p>"+(esc(t.idea))+"</p>"+"<p class=\"lb-sheet-eq\">"+(t.eqs[0][0])+"</p>"+"<p>"+TT("<i>Given:</i> {t}",{t:t.facts.map(function(f2){ return esc(f2[0])+' = '+esc(f2[1]); }).join(' · ')})+"</p>"+"<p>"+"<b>Q"+((i+1))+".</b> "+(esc(t.check.q))+"</p>"+"<p class=\"lb-sheet-ans\">"+TT("Answer: ______________________ {t}",{t:esc(t.check.unit)})+"</p>"+"</section>");
        key.push('<li><b>Q'+(i+1)+'.</b> '+esc(ckAns(t.check))+'. '+esc(t.check.why)+'</li>'); });
      return "<h1>"+(TT("Atom: the math of {E}",{E:esc(E)}))+"</h1>"+"<p>"+(TT("Name: ______________________ &nbsp; Date: ______________"))+"</p>"+"<p>"+(TT("Ten steps from the outside of the atom in. Each question uses the step's equation and the numbers given; work it on paper, then check it in Atom at {esc}.",{esc:esc(labLink({lab:"math",z:z,step:0}))}))+"</p>"+((rows.join('')))+"<section class=\"lb-sheet-key\">"+"<h1>"+(TT("Answer key: the math of {E}",{E:esc(E)}))+"</h1>"+"<ol>"+((key.join('')))+"</ol>"+"<p>"+TT("Answers within 1 to 3 percent count; the working in Atom shows the exact figures. Constants: CODATA 2022; binding energies: AME2020; ionization energies: NIST.")+"</p>"+"</section>";
    }
    function ckAns(ck){ var a=ck.a; return (ck.tol===0?String(Math.round(a)):(Math.abs(a)>=100?nf(a,0):(Math.abs(a)>=10?nf(a,1):nf(a,Math.abs(a)>=1?2:3))))+(ck.unit?" "+ck.unit:""); }
    REFRESH.math=function(){ var P=pane("math"); if(P){ var s=P.querySelector(".lb-mzname"); if(s) s.textContent=lc(mz()); } mathRender(false); };

    /* ---- the pictures */
    function arrow(g,x0,y0,x1,y1,c,wd){ var a=Math.atan2(y1-y0,x1-x0), hl=Math.min(12,Math.hypot(x1-x0,y1-y0)*0.4);
      g.strokeStyle=c; g.fillStyle=c; g.lineWidth=wd||2; g.beginPath(); g.moveTo(x0,y0); g.lineTo(x1,y1); g.stroke();
      g.beginPath(); g.moveTo(x1,y1); g.lineTo(x1-hl*Math.cos(a-0.4),y1-hl*Math.sin(a-0.4)); g.lineTo(x1-hl*Math.cos(a+0.4),y1-hl*Math.sin(a+0.4)); g.closePath(); g.fill(); }
    function nucleusDot(g,x,y,r,z,T){ var t="+"+z; r=Math.max(r,7+4*t.length); g.fillStyle=col("p"); g.beginPath(); g.arc(x,y,r,0,6.2832); g.fill();
      var fs=Math.max(10,Math.min(15,(2*r-4)/(0.62*t.length))); g.fillStyle=T.plate; g.font="700 "+fs.toFixed(1)+"px Archivo, sans-serif"; g.textAlign="center"; g.fillText(t,x,y+fs*0.36); g.font="500 14px Archivo, sans-serif"; }
    function eDot(g,x,y,r){ g.fillStyle=col("e"); g.beginPath(); g.arc(x,y,r,0,6.2832); g.fill(); }
    function drawMath(now){
      var c=host.querySelector('[data-c="math"]'); if(!c||!c.offsetParent) return false;
      var f=fit(c), g=f.g, w=f.w, h=f.h, T=th(), o=mathNums(), id=MCH[MA.ch].id, z=o.z, cx=w/2, cy=h/2, R=Math.min(w,h)/2-28;
      if(!MA.t0) MA.t0=now; var t=MA.play&&!opt.calm?(now-MA.t0)/1000:0;
      g.clearRect(0,0,w,h); g.font="500 14px Archivo, sans-serif"; g.textAlign="center";
      var anim=MA.play&&!opt.calm, k;
      if(id==="pull"||id==="orbit"||id==="collapse"){
        var rr=Math.max(4,Math.min(1,o.r/400)*R), ang=id==="pull"?-0.6:t*1.4, ex, ey;
        /* inner electrons as a soft shield around the nucleus */
        if(z>1){ var sg=g.createRadialGradient(cx,cy,0,cx,cy,Math.max(10,rr*0.75)); sg.addColorStop(0,"rgba(120,160,220,0.30)"); sg.addColorStop(1,"rgba(120,160,220,0)"); g.fillStyle=sg; g.beginPath(); g.arc(cx,cy,Math.max(10,rr*0.75),0,6.2832); g.fill(); }
        if(id==="collapse"){
          var T0=4.5, ph=(t%(T0+1.2))/T0, fr=Math.min(1,ph), rt=rr*Math.cbrt(Math.max(0,1-fr)), th2=0, steps=240, i;
          g.strokeStyle=T.ink3; g.lineWidth=1; g.globalAlpha=0.6; g.beginPath();
          for(i=0;i<=steps;i++){ var q=i/steps*fr, r2=rr*Math.cbrt(Math.max(0,1-q)); th2=q*28+q*q*40; var px=cx+r2*Math.cos(th2), py=cy+r2*Math.sin(th2); if(i) g.lineTo(px,py); else g.moveTo(px,py); }
          g.stroke(); g.globalAlpha=1; ex=cx+rt*Math.cos(th2); ey=cy+rt*Math.sin(th2);
          if(fr<1){ g.setLineDash([3,4]); g.lineWidth=1; for(k=1;k<=3;k++){ var rw=((t*60+k*30)%90); g.strokeStyle=col("math")||col("e"); g.globalAlpha=Math.max(0,0.45-rw/200); g.beginPath(); g.arc(ex,ey,rw,0,6.2832); g.stroke(); } g.setLineDash([]); g.globalAlpha=1; }
          nucleusDot(g,cx,cy,13,z,T); eDot(g,ex,ey,6);
          g.fillStyle=T.ink2; label(g,fr>=1?TT("Collapsed after {timeWords}",{timeWords:timeWords(o.tc)}):TT("Elapsed: {timeWords}",{timeWords:timeWords(o.tc*fr)}),cx,h-14,T);
          return anim;
        }
        g.strokeStyle=T.ink3; g.setLineDash([4,5]); g.lineWidth=1; g.beginPath(); g.arc(cx,cy,rr,0,6.2832); g.stroke(); g.setLineDash([]);
        ex=cx+rr*Math.cos(ang); ey=cy+rr*Math.sin(ang);
        nucleusDot(g,cx,cy,13,z,T); eDot(g,ex,ey,7);
        var al=Math.max(18,Math.min(rr-20,14*Math.log10(o.F*1e12+1)+8)), ux=(cx-ex)/rr, uy=(cy-ey)/rr;
        arrow(g,ex+ux*10,ey+uy*10,ex+ux*(10+al),ey+uy*(10+al),col("math")||T.ink,2.5);
        if(id==="orbit"){ var tx=-Math.sin(ang), ty=Math.cos(ang); arrow(g,ex+tx*10,ey+ty*10,ex+tx*46,ey+ty*46,col("e"),2); g.fillStyle=T.ink2; label(g,TT("v = {nf} km/s",{nf:nf(o.v/1000,0)}),ex+tx*58,ey+ty*58+5,T); label(g,TT("Slowed about {sciT} times",{sciT:sciT(1/o.T/0.22,1)}),cx,h-14,T); }
        else { g.fillStyle=T.ink2; label(g,"F = "+nf(o.F*1e9,2)+" nN",cx,cy-rr-12>20?cy-rr-12:h-14,T); }
        g.strokeStyle=T.ink3; g.lineWidth=1; g.beginPath(); g.moveTo(cx,cy+16); g.lineTo(cx,cy+rr); g.stroke();
        g.fillStyle=T.ink2; label(g,TT("r = {nf} pm",{nf:nf(o.r,0)}),cx,Math.min(h-36,cy+rr+22),T);
        return id==="orbit"&&anim;
      }
      if(id==="bohr"){
        var nmax=Math.max(MA.nu,4), sc=R/(nmax*nmax), pr=1.2, cyc=t%pr, jumping=cyc<0.5;
        for(k=1;k<=nmax;k++){ var rk=k*k*sc; g.strokeStyle=(k===MA.nu||k===MA.nl)?(col("math")||T.ink):T.ink3; g.lineWidth=(k===MA.nu||k===MA.nl)?2:1; g.beginPath(); g.arc(cx,cy,Math.max(3,rk),0,6.2832); g.stroke();
          if(rk>20){ g.fillStyle=T.ink2; label(g,"n = "+k,cx+rk*Math.cos(0.5)+18,cy+rk*Math.sin(0.5)+6,T); } }
        nucleusDot(g,cx,cy,9,z,T);
        var fromR=MA.nu*MA.nu*sc, toR=MA.nl*MA.nl*sc, prog=jumping?Math.min(1,cyc/0.35):1, rNow=fromR+(toR-fromR)*(anim?prog:1), a0=-0.9;
        eDot(g,cx+rNow*Math.cos(a0),cy+rNow*Math.sin(a0),6);
        if(!anim||cyc>0.3){ var pc=o.line.w>=380&&o.line.w<=750?wlRGB(o.line.w):T.ink2, ph0=anim?(cyc-0.3)*220:120, sx=cx+toR*Math.cos(a0), sy=cy+toR*Math.sin(a0);
          g.strokeStyle=pc; g.lineWidth=2.5; g.beginPath();
          for(k=0;k<=60;k++){ var d=ph0*k/60, yy=Math.sin(d/6)*6, px2=sx+d*0.92, py2=sy-d*0.38+yy; if(k) g.lineTo(px2,py2); else g.moveTo(px2,py2); } g.stroke();
          g.fillStyle=T.ink2; label(g,nf(o.line.w,o.line.w<10?3:1)+" nm, "+lightWord(o.line.w),cx,h-14,T); }
        return anim;
      }
      if(id==="waves"){
        var Rw=R*0.62, amp=Math.min(26,R*0.12), kk=MA.waves, i2, N2=360;
        g.strokeStyle=T.ink3; g.setLineDash([4,5]); g.lineWidth=1; g.beginPath(); g.arc(cx,cy,Rw,0,6.2832); g.stroke(); g.setLineDash([]);
        nucleusDot(g,cx,cy,9,z,T);
        var good=Math.abs(kk-Math.round(kk))<0.02;
        g.strokeStyle=good?(col("e")):(col("bad")||T.ink); g.lineWidth=2.5; g.beginPath();
        for(i2=0;i2<=N2;i2++){ var th3=i2/N2*6.2832, rr3=Rw+amp*Math.sin(kk*th3-(good?t*2:0))*(good?Math.cos(t*2.2):1); var px3=cx+rr3*Math.cos(th3-1.5708), py3=cy+rr3*Math.sin(th3-1.5708); if(i2) g.lineTo(px3,py3); else g.moveTo(px3,py3); }
        g.stroke();
        if(!good){ var endR=Rw+amp*Math.sin(kk*6.2832); g.fillStyle=col("bad")||T.ink; g.beginPath(); g.arc(cx,cy-endR,5,0,6.2832); g.fill(); g.beginPath(); g.arc(cx,cy-Rw,5,0,6.2832); g.fill(); }
        g.fillStyle=T.ink2; label(g,good?TT("A whole number of waves: it meets itself in step and survives"):TT("Not whole: the ends don't meet, and it cancels itself out"),cx,h-14,T);
        return anim&&good;
      }
      if(id==="cloud") return mathCloud(g,w,h,T,o,t,anim);
      if(id==="many"){
        var cfg=configOf(z), shells=shellsFrom(cfg), ns2=shells.length, gap=(R-20)/Math.max(ns2,1), sn=o.sn;
        for(k=0;k<ns2;k++){ var rk2=24+gap*(k+0.7), cnt=shells[k], hl=(k+1)===sn;
          g.strokeStyle=hl?(col("math")||T.ink):T.ink3; g.lineWidth=hl?2:1; g.beginPath(); g.arc(cx,cy,rk2,0,6.2832); g.stroke();
          var spin=anim?t*0.5/(k+1):0, sub=configOf(z).filter(function(x){ return x[0]===k+1; }), idx=0;
          sub.forEach(function(x){ for(var j=0;j<x[2];j++){ var a2=spin+idx/cnt*6.2832; idx++; var hit=(x[0]+","+x[1])===o.sub;
            g.globalAlpha=hit?1:0.55; eDot(g,cx+rk2*Math.cos(a2),cy+rk2*Math.sin(a2),hit?5:3.2); } }); g.globalAlpha=1; }
        nucleusDot(g,cx,cy,14,z,T);
        g.fillStyle=T.ink2; label(g,TT("The {sn}{OLET} electrons feel about {nf} of {z} charges",{sn:sn,OLET:OLET[o.sl],nf:nf(o.sl_.Zeff,2),z:z}),cx,h-14,T);
        return anim;
      }
      if(id==="rel"){
        var x0=48, x1=w-20, y0=24, y1=h*0.52, X=function(Zv){ return x0+(x1-x0)*(Zv-1)/139; }, Y=function(v){ return y1-(y1-y0)*v; };
        g.strokeStyle=T.ink3; g.lineWidth=1; g.beginPath(); g.moveTo(x0,y0); g.lineTo(x0,y1); g.lineTo(x1,y1); g.stroke();
        g.strokeStyle=col("math")||T.ink; g.lineWidth=2; g.beginPath(); for(k=1;k<=140;k++){ var vv=Math.min(1,k*MK.alpha); if(k===1) g.moveTo(X(k),Y(vv)); else g.lineTo(X(k),Y(vv)); } g.stroke();
        g.setLineDash([4,4]); g.strokeStyle=col("bad")||T.ink2; g.beginPath(); g.moveTo(X(137),y0); g.lineTo(X(137),y1); g.stroke(); g.setLineDash([]);
        g.fillStyle=T.ink2; g.textAlign="left"; label(g,TT("v/c of the innermost electron"),x0+6,y0+12,T,"left"); label(g,"Z = 137",X(137)-56,y1-8,T,"left"); g.textAlign="center";
        [1,79,118].forEach(function(zz){ if(zz<=118){ g.fillStyle=T.ink3; g.beginPath(); g.arc(X(zz),Y(zz*MK.alpha),3,0,6.2832); g.fill(); } });
        g.fillStyle=col("e"); g.beginPath(); g.arc(X(o.zr),Y(Math.min(1,o.za)),6,0,6.2832); g.fill();
        /* the orbit, contracted */
        var oc=cx, oy=h*0.78, Rn=Math.min(h*0.17,(w-40)/5), Rr=o.za<1?Rn/o.gam:Rn*0.2, sp=anim?t*(1+o.za*4):0;
        g.strokeStyle=T.ink3; g.setLineDash([4,5]); g.beginPath(); g.arc(oc,oy,Rn,0,6.2832); g.stroke(); g.setLineDash([]);
        g.strokeStyle=col("e"); g.lineWidth=2; g.beginPath(); g.arc(oc,oy,Rr,0,6.2832); g.stroke();
        nucleusDot(g,oc,oy,8,o.zr,T); eDot(g,oc+Rr*Math.cos(sp),oy+Rr*Math.sin(sp),5);
        g.fillStyle=T.ink2; label(g,o.za<1?TT("Orbit {nf}% smaller than without relativity",{nf:nf((1-1/o.gam)*100,1)}):TT("Zα ≥ 1: no solution for a point nucleus"),oc,h-10,T);
        return anim;
      }
      if(id==="nucleus") return mathNucleus(g,w,h,T,o,t,anim);
      return mathQuarks(g,w,h,T,o,t,anim);
    }
    function mathCloud(g,w,h,T,o,t,anim){
      var z=o.z, n=MA.on, l=MA.ol, m=MA.om, mix=MA.mix, b=mixPartner(n,l,m), S=Math.min(w,h)-40, N=120, key=[z,n,l,m,mix].join("|");
      var ext=Math.max(extentA0(n,l,1),mix?extentA0(b[0],b[1],1):0); /* in a0/Z */
      if(!MA.cache||MA.cache.key!==key){
        var ph0=m<0?Math.PI/(2*Math.abs(m)):0, A1=new Float32Array(N*N), A2=new Float32Array(N*N), mx=0, i, j;
        for(j=0;j<N;j++) for(i=0;i<N;i++){ var x=(i/(N-1)*2-1)*ext, y=(1-j/(N-1)*2)*ext, r=Math.hypot(x,y)||1e-6, th=Math.acos(Math.max(-1,Math.min(1,y/r))), ph=x>=0?ph0:ph0+Math.PI;
          var v1=radial(n,l,1,r)*angular(l,m,th,ph); A1[j*N+i]=v1; if(mix){ var v2=radial(b[0],b[1],1,r)*angular(b[1],b[2],th,ph); A2[j*N+i]=v2; } }
        for(i=0;i<N*N;i++){ var d0=mix?Math.max(A1[i]*A1[i],A2[i]*A2[i])+Math.abs(A1[i]*A2[i]):A1[i]*A1[i]; if(d0>mx) mx=d0; }
        var oc=D.createElement("canvas"); oc.width=N; oc.height=N;
        MA.cache={key:key, A1:A1, A2:A2, mx:mx||1, img:oc.getContext("2d").createImageData(N,N), cv:oc};
      }
      var C=MA.cache, P1=hexRGB(col("e")), P2=hexRGB(col("p")), cs=mix?Math.cos(t*2.4):0, data=C.img.data;
      for(var q=0;q<N*N;q++){ var a=C.A1[q], psi=mix?(a+C.A2[q]*1)/Math.SQRT2:a, dens=mix?(a*a+C.A2[q]*C.A2[q]+2*a*C.A2[q]*cs)/2:a*a;
        var s=Math.pow(Math.max(0,dens/C.mx),0.45), cc=psi>=0?P1:P2; data[q*4]=cc[0]; data[q*4+1]=cc[1]; data[q*4+2]=cc[2]; data[q*4+3]=Math.round(255*Math.min(1,s*1.5)); }
      C.cv.getContext("2d").putImageData(C.img,0,0);
      var ox=(w-S)/2, oy=(h-S)/2-8; g.imageSmoothingEnabled=true; g.drawImage(C.cv,ox,oy,S,S);
      g.strokeStyle=T.ink3; g.lineWidth=1; g.globalAlpha=0.5; g.beginPath(); g.moveTo(w/2,oy); g.lineTo(w/2,oy+S); g.moveTo(ox,oy+S/2); g.lineTo(ox+S,oy+S/2); g.stroke(); g.globalAlpha=1;
      g.fillStyle=T.ink2; label(g,"z",w/2+10,oy+14,T);
      var span=2*ext*MK.a0/z; label(g,TT("Width shown: {span}",{span:(span<1?nf(span*1000,0)+" fm":nf(span,span<10?2:0)+" pm")}),w/2,h-12,T);
      label(g,orbName(n,l,m)+(mix?" + "+orbName(b[0],b[1],b[2]):""),w/2,oy+S-8,T);
      return anim&&mix;
    }
    function hexRGB(s){ s=String(s||"").trim(); var m=/^#([0-9a-f]{6})$/i.exec(s); if(m){ var v=parseInt(m[1],16); return [v>>16&255,v>>8&255,v&255]; }
      m=/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(s); return m?[+m[1],+m[2],+m[3]]:[120,170,255]; }
    function mathNucleus(g,w,h,T,o,t,anim){
      var z=o.z, A=o.A, narrow=w<480, cx=narrow?w*0.5:w*0.27, cy=narrow?h*0.27:h*0.46,
        Rn=(narrow?Math.min(w*0.28,h*0.2):Math.min(w*0.22,h*0.36))*Math.min(1,0.45+Math.cbrt(A)/12), rN=Math.max(2.2,Rn/Math.cbrt(A)*0.92), i;
      var golden=Math.PI*(3-Math.sqrt(5)), pts=[];
      for(i=0;i<A;i++){ var yy=1-(i+0.5)/A*2, rad=Math.sqrt(1-yy*yy), th=golden*i, x=Math.cos(th)*rad, zz=Math.sin(th)*rad; pts.push([x,yy,zz,i]); }
      var rs=rng(z*1000+A), isP={}, ids=pts.map(function(p){ return p[3]; }); for(i=ids.length-1;i>0;i--){ var j=Math.floor(rs()*(i+1)), tmp=ids[i]; ids[i]=ids[j]; ids[j]=tmp; } ids.slice(0,z).forEach(function(k){ isP[k]=1; });
      pts.sort(function(a,b){ return a[2]-b[2]; });
      pts.forEach(function(p){ var jx=anim?Math.sin(t*3+p[3]*1.7)*0.6:0, jy=anim?Math.cos(t*2.6+p[3]*2.3)*0.6:0, s=0.82+0.18*(p[2]+1)/2;
        var px=cx+(p[0]*Rn*0.92)+jx, py=cy+(p[1]*Rn*0.92)+jy;
        g.fillStyle=isP[p[3]]?col("p"):col("n"); g.globalAlpha=0.55+0.45*(p[2]+1)/2; g.beginPath(); g.arc(px,py,rN*s,0,6.2832); g.fill(); });
      g.globalAlpha=1; g.fillStyle=T.ink2; g.font="500 14px Archivo, sans-serif";
      if(!narrow) label(g,TT("{cap}: {nf} fm across the radius",{cap:cap(isoName(z,A)),nf:nf(o.R,2)}),cx,Math.min(h-14,cy+Rn+28),T);
      /* the five terms as bars, sized so the longest label still fits */
      var terms=[[TT("Volume"),o.vol],[TT("Surface"),o.surf],[TT("Coulomb"),o.coul],[TT("Asymmetry"),o.asym],[TT("Pairing"),o.pair]],
        mx=Math.max(1,Math.abs(o.vol),Math.abs(o.surf),Math.abs(o.coul),Math.abs(o.asym));   /* in the lightest nuclei a loss term outgrows the volume term */
      var txt=terms.map(function(tm){ return tm[0]+" "+(tm[1]>=0?"+":"−")+nf(Math.abs(tm[1]),tm[1]&&Math.abs(tm[1])<10?2:0)+" MeV"; });
      g.font="500 13px Archivo, sans-serif"; var tw=Math.max.apply(null,txt.map(function(x){ return g.measureText(x).width; }));
      var bx=narrow?16:w*0.54, by=narrow?h*0.52:34, bh=narrow?11:Math.min(26,(h-120)/6), gap=narrow?7:10, barMax=Math.max(12,Math.min((w-bx)*0.62,w-bx-tw-20));
      g.textAlign="left";
      terms.forEach(function(tm,k){ var y=by+k*(bh+gap), len=Math.max(1,Math.abs(tm[1])/mx*barMax);
        g.fillStyle=tm[1]>=0?(col("ok")||T.ink):(col("bad")||T.ink2); g.fillRect(bx,y,len,bh);
        g.fillStyle=T.ink; g.fillText(txt[k],bx+len+8,y+bh*0.5+4.5); });
      var yB=by+5*(bh+gap)+6; g.fillStyle=T.ink; g.font="700 14px Archivo, sans-serif"; g.fillText(TT("Formula: {nf} MeV{o}",{nf:nf(o.Bf,1),o:(o.Bm!=null&&o.Bsrc!=="none"?TT("; measured {nf}",{nf:nf(o.Bm,1)}):(o.Bsrc==="none"?TT("; a lone proton: 0"):""))}),bx,yB+14);
      g.textAlign="center"; g.font="500 14px Archivo, sans-serif";
      return anim;
    }
    function mathQuarks(g,w,h,T,o,t,anim){
      var cx=w*0.3, cy=h*0.42, Rb=Math.min(w*0.22,h*0.32), qs=MA.nucleon==="p"?["u","u","d"]:["u","d","d"], cols=["#ff5d5d","#4fd36b","#5c8dff"], i, pos=[];
      g.strokeStyle=T.ink3; g.lineWidth=1.5; g.beginPath(); g.arc(cx,cy,Rb,0,6.2832); g.stroke();
      for(i=0;i<3;i++){ var a=i*2.0944+(anim?t*0.7:0), rr=Rb*0.45*(1+0.18*(anim?Math.sin(t*2.3+i*2):0)); pos.push([cx+rr*Math.cos(a),cy+rr*Math.sin(a)]); }
      for(i=0;i<3;i++){ var p=pos[i], q=pos[(i+1)%3], len=Math.hypot(q[0]-p[0],q[1]-p[1]), nx=-(q[1]-p[1])/len, ny=(q[0]-p[0])/len;
        g.strokeStyle=col("math")||T.ink2; g.lineWidth=2; g.beginPath();
        for(var k=0;k<=40;k++){ var f=k/40, wv=Math.sin(f*Math.PI*8+(anim?t*8:0))*4; var x=p[0]+(q[0]-p[0])*f+nx*wv, y=p[1]+(q[1]-p[1])*f+ny*wv; if(k) g.lineTo(x,y); else g.moveTo(x,y); } g.stroke(); }
      for(i=0;i<3;i++){ g.fillStyle=cols[i]; g.beginPath(); g.arc(pos[i][0],pos[i][1],14,0,6.2832); g.fill(); g.fillStyle="#141005"; g.font="700 15px Archivo, sans-serif"; g.fillText(qs[i],pos[i][0],pos[i][1]+5); }
      g.font="500 14px Archivo, sans-serif"; g.fillStyle=T.ink2; label(g,(MA.nucleon==="p"?TT("Proton: up, up, down = +1"):TT("Neutron: up, down, down = 0")),cx,cy+Rb+26,T);
      /* forces between two protons */
      var x0=w*0.56, x1=w-18, y0=30, y1=h-46, rmin=0.5, rmax=4, X=function(r){ return x0+(x1-x0)*(r-rmin)/(rmax-rmin); }, lam=o.lamY, Vmax=3.2, Y=function(v){ return (y0+y1)/2-v/Vmax*(y1-y0)/2; };
      g.strokeStyle=T.ink3; g.lineWidth=1; g.beginPath(); g.moveTo(x0,y0); g.lineTo(x0,y1); g.moveTo(x0,Y(0)); g.lineTo(x1,Y(0)); g.stroke();
      function curve(fn,c){ g.strokeStyle=c; g.lineWidth=2; g.beginPath(); for(var k2=0;k2<=80;k2++){ var r=rmin+(rmax-rmin)*k2/80, v=Math.max(-Vmax,Math.min(Vmax,fn(r))); if(k2) g.lineTo(X(r),Y(v)); else g.moveTo(X(r),Y(v)); } g.stroke(); }
      curve(function(r){ return MK.ke2/r; },col("p"));
      curve(function(r){ return -3.0*Math.exp(-(r-0.5)/lam)*0.5/r; },col("math")||T.ink);
      g.setLineDash([4,4]); g.strokeStyle=T.ink2; g.beginPath(); g.moveTo(X(MA.qr),y0); g.lineTo(X(MA.qr),y1); g.stroke(); g.setLineDash([]);
      g.textAlign="left"; g.fillStyle=T.ink2; label(g,TT("electric push (MeV)"),x0+6,y0+12,T,"left"); label(g,TT("strong pull (shape only)"),x0+6,y1-6,T,"left"); g.textAlign="center";
      label(g,nf(MA.qr,2)+" fm",X(MA.qr),y1+18,T);
      return anim;
    }

    /* ======================================================== learning helps (1.7)
       Four things for a classroom, all inside the labs:
         Lessons     five 45-minute paths through the labs, each ending in an
                     exit check (a fixed challenge) and a turn-in code
         Listen      a button that reads an explanation aloud in the page's
                     language, with the browser's own voices; only on press
         Term help   the glossary: terms underlined in the text, with a
                     one-line definition on hover or tap, and the English
                     word beside it when the page is in another language
         Simpler     a second telling of the long explanations, in shorter
                     sentences, from the language pack's "s" table
       The settings live in the labs' tab bar and reload the page, because
       the text they change is everywhere. */
    var LESSONS=[
      {id:"empty", title:TT("Atoms are mostly empty"), min:45, std:"HS-PS1-1 · AP 1.5",
       blurb:TT("Build an atom, measure how empty it is, and meet the questions people get wrong."),
       steps:[
         {say:TT("Build iron: 26 protons, 30 neutrons, 26 electrons. Watch the shells fill as you add electrons."), act:{lab:"build",z:26,a:56}},
         {say:TT("Open The math on iron at step 1 and write down the radius of the atom, in picometers."), act:{lab:"math",z:26,step:0}},
         {say:TT("Go to step 9 and write down the radius of the nucleus, in femtometers. Divide: how many times smaller is it?"), act:{lab:"math",z:26,step:8}},
         {say:TT("Scale it: if the nucleus were a 1-meter ball, how far away would the outer electrons be? Check your answer against the Predict question."), act:{lab:"predict",z:26}},
         {say:TT("Exit check: six questions about iron. Your score goes into your turn-in code."), exit:"A1.empty.6.w.Fe"}]},
      {id:"shells", title:TT("Where the electrons live"), min:45, std:"HS-PS1-1 · AP 1.5, 1.6",
       blurb:TT("Orbital boxes, the photoelectron spectrum, and reading a configuration off the peaks."),
       steps:[
         {say:TT("Fill oxygen's orbital boxes by hand, then check them against the three rules."), act:{lab:"build",z:8,boxes:true}},
         {say:TT("Open Electron energies on sodium. Count the electrons in each peak from the left and write the configuration."), act:{lab:"pes",z:11}},
         {say:TT("Press Mystery element and name three elements from their spectra alone."), act:{lab:"pes",z:11}},
         {say:TT("Open Trends on the energy to remove an electron. Where does the dashed estimate leave the measured line, and why?"), act:{lab:"trends",prop:"ie"}},
         {say:TT("Exit check: configurations and which element they belong to."), exit:"A1.shells.6.cg.O-Na-Mg-Cl"}]},
      {id:"light", title:TT("Light from atoms"), min:40, std:"HS-PS4-3 · HS-ESS1-3 · AP 1.5",
       blurb:TT("Hear hydrogen's lines, compute one, and find five elements in the Sun's light."),
       steps:[
         {say:TT("Play hydrogen's light. Each tone is one spectral line, 40 octaves below the light itself."), act:{lab:"hear",z:1}},
         {say:TT("Calculate the red line: an electron falling from level 3 to level 2. Note its wavelength and its energy."), act:{lab:"calc",calc:"light",line:"3,2"}},
         {say:TT("Open The math on hydrogen at step 4: Bohr's rule, and the light each jump gives off."), act:{lab:"math",z:1,step:3}},
         {say:TT("Open The Sun and try the elements until you have found all five in its dark lines. Why does helium show none?"), act:{lab:"sun"}},
         {say:TT("Exit check: where electrons are and what they do."), exit:"A1.light.6.cgw.H-He-Na"}]},
      {id:"nucleus", title:TT("The nucleus and the mass that disappears"), min:45, std:"HS-PS1-8",
       blurb:TT("Carbon-14 on the chart of the nuclides, binding energy in iron, radioactive decay, and fusion."),
       steps:[
         {say:TT("Find carbon-14 on the chart of the nuclides. Which way does it decay, and into what?"), act:{lab:"nuclides",z:6,a:14}},
         {say:TT("Open The math on iron-56 at step 9: the five pieces of its binding energy, and the mass that went missing."), act:{lab:"math",z:26,step:8}},
         {say:TT("Run the decay calculator with carbon-14 and find how much is left after 11,460 years."), act:{lab:"calc",calc:"decay",preset:"6,14"}},
         {say:TT("Fuse deuterium and tritium on the workbench. Note the energy released and the barrier the nuclei had to tunnel through."), act:{lab:"bench"}},
         {say:TT("Exit check: neutrons, stability, and what binding energy does to mass."), exit:"A1.nucleus.6.nsw.C-U-Fe-H"}]},
      {id:"table", title:TT("The table predicts"), min:40, std:"HS-PS1-1 · AP 1.7, 1.8",
       blurb:TT("Size, ions, and reactivity, read off the table before you look them up."),
       steps:[
         {say:TT("Open Trends on atomic radius and run across period 3, then down group 1. State the two rules in your own words."), act:{lab:"trends",prop:"rad"}},
         {say:TT("Compare lithium and cesium. Why do they react alike, and which reacts harder?"), act:{lab:"compare",pair:[3,55]}},
         {say:TT("Build a sodium ion (10 electrons) and a chloride ion (18 electrons). Which noble gas does each now resemble?"), act:{lab:"build",z:11,e:10}},
         {say:TT("Predict: a few questions about iron before the exit check."), act:{lab:"predict",z:26}},
         {say:TT("Exit check: size, density, valence electrons, ions, and blocks."), exit:"A1.table.8.rdvib.Na-Cl-K-Ca-Fe-Au"}]}
    ];
    var LS={open:null};
    function lessonOf(id){ for(var i=0;i<LESSONS.length;i++) if(LESSONS[i].id===id) return LESSONS[i]; return null; }
    function lessonState(id){ return (Progress.data().lessons||{})[id]||{done:{},complete:0}; }
    function lessonSave(id,st){ Progress.mark("lesson",0,{id:id,state:st}); }
    function lessonSteps(L){ return L.steps.length; }
    function lessonDoneCount(L){ var st=lessonState(L.id), n=0; L.steps.forEach(function(s,i){ if(st.done[i]) n++; }); return n; }
    function exitCode(L){ for(var i=0;i<L.steps.length;i++) if(L.steps[i].exit) return L.steps[i].exit; return null; }
    BUILD.lessons=function(P){
      P.innerHTML='<div class="lb-lessons"></div>';
      P.addEventListener("click",function(e){
        var b=e.target.closest("[data-ls]"); if(!b) return; var k=b.getAttribute("data-ls"), id=b.getAttribute("data-lid"), i=+b.getAttribute("data-li");
        if(k==="open"){ LS.open=id; renderLessons(); ev("lesson:open"); }
        else if(k==="back"){ LS.open=null; renderLessons(); }
        else if(k==="go"){ var L=lessonOf(id), s=L&&L.steps[i]; if(!s) return;
          if(s.exit){ api.open({challenge:s.exit}); }
          else api.act(s.act);
          var st=lessonState(id); if(!st.started) st.started=1; lessonSave(id,st); }
        else if(k==="done"){ var st2=lessonState(id); st2.done[i]=st2.done[i]?0:1; lessonSave(id,st2); renderLessons(); }
        else if(k==="code"){ copyText(Progress.code()); toast(TT("Turn-in code copied.")); }
      });
    };
    REFRESH.lessons=function(){ renderLessons(); };
    function renderLessons(){
      var P=pane("lessons"); if(!P||!built.lessons) return; var box=P.querySelector(".lb-lessons"), L=LS.open&&lessonOf(LS.open);
      if(!L){
        box.innerHTML='<p class="lb-note">'+TT("Five lessons of about 45 minutes each. Every step opens the lab it needs; tick it when you are done. The last step is an exit check whose score goes into your turn-in code.")+'</p>'+
          '<div class="lb-lslist">'+LESSONS.map(function(L){ var st=lessonState(L.id), n=lessonDoneCount(L), tot=lessonSteps(L);
            return '<div class="lb-lscard'+(st.complete?' done':'')+'"><h3>'+esc(L.title)+'</h3><p class="lb-lsmeta">'+TT("{min} minutes",{min:L.min})+' · '+esc(L.std)+'</p><p>'+esc(L.blurb)+'</p>'+
              '<p class="lb-lsprog">'+(st.complete?TT("Complete"):TT("{n} of {tot} steps done",{n:n,tot:tot}))+'</p>'+
              '<button type="button" class="lb-btn sm" data-ls="open" data-lid="'+L.id+'">'+(st.complete?TT("Open again"):(n?TT("Continue"):TT("Start")))+'</button></div>'; }).join('')+'</div>';
        return;
      }
      var st=lessonState(L.id);
      box.innerHTML='<div class="lb-lshead"><button type="button" class="lb-link" data-ls="back">'+TT("All lessons")+'</button><h3>'+esc(L.title)+'</h3><p class="lb-lsmeta">'+TT("{min} minutes",{min:L.min})+' · '+esc(L.std)+'</p></div>'+
        '<ol class="lb-lssteps">'+L.steps.map(function(s,i){ var done=!!st.done[i];
          return "<li class=\""+(((done?'done':'')))+"\"><span class=\"lb-lsn\">"+(((i+1)))+"</span>"+"<p>"+((esc(s.say)))+"</p>"+"<div class=\"lb-lsacts\">"+"<button type=\"button\" class=\"lb-btn sm\" data-ls=\"go\" data-lid=\""+((L.id))+"\" data-li=\""+((i))+"\">"+(((s.exit?TT("Take the exit check"):TT("Open it"))))+"</button>"+(((s.exit?'':"<button type=\"button\" class=\"lb-btn sm ghost\" data-ls=\"done\" data-lid=\""+((L.id))+"\" data-li=\""+((i))+"\" aria-pressed=\""+(((done?'true':'false')))+"\">"+(((done?TT("Done"):TT("Mark done"))))+"</button>")))+"</div>"+"</li>"; }).join('')+'</ol>'+
        (st.complete?'<div class="lb-lsdone"><p><b>'+TT("Lesson complete.")+'</b> '+TT("Your exit check is in your turn-in code.")+'</p><button type="button" class="lb-btn" data-ls="code">'+TT("Copy my turn-in code")+'</button></div>':
          '<p class="lb-note">'+TT("The exit check is a fixed set of questions, the same for everyone in the class. Finish it and the lesson is marked complete.")+'</p>');
      decorate(box);
    }
    /* a finished challenge that is a lesson's exit check completes the lesson */
    Progress.on(function(kind,info){
      if(kind!=="challenge"||!info||!info.x) return;
      LESSONS.forEach(function(L){ if(exitCode(L)===info.x.code){ var st=lessonState(L.id); st.complete=1; L.steps.forEach(function(s,i){ st.done[i]=1; }); lessonSave(L.id,st); if(cur==="lessons") renderLessons(); toast(TT("Lesson complete: {L}",{L:L.title})); } });
    });

    /* ------------------------------------------------------------ listen, term help */
    var SPEAK_SEL=".lb-say, .lb-note, .lb-qtext, .lb-why, .lb-mq, .lb-mcq, .lb-mlimit, .pd-story p, .lb-lssteps li p, .lb-verdict";
    var TERM_SEL=SPEAK_SEL+", .lb-meqs li, .lb-mfacts dd, .lb-cmpsay, .lb-tsay, .lb-goals li";
    var speakOn=AtomI18N.canSpeak(), termOn=AtomI18N.bilingual;
    function speakLabel(on){ return on?TT("Stop"):TT("Listen"); }
    function addSpeakers(root){
      if(!speakOn) return;
      [].forEach.call(root.querySelectorAll(SPEAK_SEL),function(el){
        if(el.querySelector(".lb-speak")||!el.textContent.trim()||el.closest("button")) return;
        if(el.textContent.trim().split(/\s+/).length<8) return;      /* a label or a one-liner needs no reader */
        var b=document.createElement("button"); b.type="button"; b.className="lb-speak"; b.textContent=speakLabel(false); b.title=TT("Read this aloud");
        el.appendChild(b);
      });
    }
    host.addEventListener("click",function(e){
      var b=e.target.closest(".lb-speak"); if(!b) return;
      var el=b.parentNode, on=b.getAttribute("data-on")==="1";
      [].forEach.call(host.querySelectorAll(".lb-speak[data-on]"),function(x){ x.removeAttribute("data-on"); x.textContent=speakLabel(false); });
      if(on){ AtomI18N.stopSpeaking(); return; }
      var text=[].map.call(el.childNodes,function(n){ return n.nodeType===3?n.textContent:(n.classList&&n.classList.contains("lb-speak")?"":n.textContent); }).join("");
      b.setAttribute("data-on","1"); b.textContent=speakLabel(true);
      AtomI18N.speak(text,function(){ b.removeAttribute("data-on"); b.textContent=speakLabel(false); });
      ev("speak");
    });
    /* the glossary: the pack's g table, {key:{t:term, f:[other forms], d:definition}} */
    var TERM_RX=null, TERM_MAP=null;
    function termTable(){
      if(TERM_RX!==null) return TERM_RX;
      var g=AtomI18N.glossary||{}, forms=[], map={};
      Object.keys(g).forEach(function(k){ var e=g[k]; if(!e||!e.t) return; [e.t].concat(e.f||[]).forEach(function(f){ if(f&&!map[f.toLowerCase()]){ map[f.toLowerCase()]=k; forms.push(f); } }); });
      if(!forms.length){ TERM_RX=false; return false; }
      forms.sort(function(a,b){ return b.length-a.length; });
      var esc2=function(s){ return s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"); };
      var hasLatin=/[a-z]/i.test(forms.join(""));
      TERM_RX=new RegExp((hasLatin?"(^|[^\\p{L}\\p{N}])":"()")+"("+forms.map(esc2).join("|")+")"+(hasLatin?"(?![\\p{L}\\p{N}])":""),"iu");
      TERM_MAP=map; return TERM_RX;
    }
    function wrapTerms(root){
      if(!termOn) return; var rx=termTable(); if(!rx) return;
      var g=AtomI18N.glossary, seen={};
      [].forEach.call(root.querySelectorAll(TERM_SEL),function(el){
        if(el.getAttribute("data-terms")==="1") return; el.setAttribute("data-terms","1");
        var walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT,null), nodes=[], n;
        while((n=walker.nextNode())) if(n.parentNode&&!n.parentNode.closest("button, dfn, input, code, kbd, a")) nodes.push(n);
        nodes.forEach(function(tn){
          var txt=tn.nodeValue, m, out=document.createDocumentFragment(), pos=0, guard=0;
          while((m=rx.exec(txt.slice(pos)))&&guard++<40){
            var start=pos+m.index+m[1].length, word=m[2], key=TERM_MAP[word.toLowerCase()];
            if(seen[key]){ out.appendChild(document.createTextNode(txt.slice(pos,start+word.length))); pos=start+word.length; continue; }   /* once per paragraph set; the text itself is kept */
            seen[key]=1;
            out.appendChild(document.createTextNode(txt.slice(pos,start)));
            var d=document.createElement("dfn"); d.className="lb-term"; d.textContent=word;
            var e=g[key]||{}, en=(e.en||key), tip=(AtomI18N.isEnglish?"":en+" · ")+(e.d||"");
            d.setAttribute("title",tip); d.setAttribute("tabindex","0"); d.setAttribute("data-en",en); d.setAttribute("data-def",e.d||"");
            out.appendChild(d); pos=start+word.length;
          }
          if(pos){ out.appendChild(document.createTextNode(txt.slice(pos))); tn.parentNode.replaceChild(out,tn); }
        });
      });
    }
    function decorate(root){ root=root||host; try{ addSpeakers(root); wrapTerms(root); }catch(e){} }
    /* every render in the labs goes through innerHTML; a debounced observer
       decorates whatever changed */
    var decoT=null;
    try{ new MutationObserver(function(){ clearTimeout(decoT); decoT=setTimeout(function(){ decorate(host); },120); }).observe(host,{childList:true,subtree:true}); }catch(e){}
    /* a term's definition, for a tap on a touch screen: a small card under it */
    host.addEventListener("click",function(e){
      var d=e.target.closest("dfn.lb-term"); var old=host.querySelector(".lb-termcard"); if(old) old.remove();
      if(!d) return;
      var card=document.createElement("div"); card.className="lb-termcard"; card.setAttribute("role","note");
      card.innerHTML=(AtomI18N.isEnglish?"":"<b>"+esc(d.getAttribute("data-en"))+"</b> · ")+esc(d.getAttribute("data-def"));
      d.insertAdjacentElement("afterend",card); setTimeout(function(){ card.remove(); },6000);
    });
    /* the vocabulary of the pane that is open, in both languages, for printing */
    function vocabHTML(){
      var g=AtomI18N.glossary||{}, P=pane(cur); if(!P) return "";
      var keys={}; [].forEach.call(P.querySelectorAll("dfn.lb-term"),function(d){ var k=TERM_MAP&&TERM_MAP[d.textContent.toLowerCase()]; if(k) keys[k]=1; });
      var list=Object.keys(keys); if(!list.length) return "";
      return "<h2>"+esc(TT("Vocabulary: {pane}",{pane:PANE_NAME[cur]||(groupOf(cur)||[])[1]||cur}))+"</h2><table class=\"lb-vocab\"><tbody>"+list.map(function(k){ var e=g[k]; return "<tr><td><b>"+esc(e.t)+"</b></td>"+(AtomI18N.isEnglish?"":"<td>"+esc(e.en||k)+"</td>")+"<td>"+esc(e.d||"")+"</td></tr>"; }).join("")+"</tbody></table>";
    }

    /* ------------------------------------------------------------ the settings in the tab bar */
    (function(){
      var bar=host.querySelector(".lb-tabs"); if(!bar) return;
      var box=document.createElement("div"); box.className="lb-learnset"; box.setAttribute("role","group"); box.setAttribute("aria-label",TT("Learning settings"));
      var simple=AtomI18N.level==="simple";
      box.innerHTML="<button type=\"button\" class=\"lb-set\" data-set=\"simple\" aria-pressed=\""+(((simple?'true':'false')))+"\" title=\""+((TT("Shorter sentences and plainer words in the explanations")))+"\">"+((TT("Simpler")))+"</button>"+"<button type=\"button\" class=\"lb-set\" data-set=\"terms\" aria-pressed=\""+(((termOn?'true':'false')))+"\" title=\""+(((AtomI18N.isEnglish?TT("Underline the science words, with a one-line meaning"):TT("Underline the science words, with the English word and a one-line meaning"))))+"\">"+((TT("Term help")))+"</button>"+(((termOn?'<button type="button" class="lb-set" data-set="vocab" title="'+TT("Print the words on this page in both languages")+'">'+TT("Vocabulary")+'</button>':'')));
      /* beside the tab list, not inside it: a tablist may hold only tabs */
      var row=document.createElement("div"); row.className="lb-tabrow"; bar.parentNode.insertBefore(row,bar); row.appendChild(bar); row.appendChild(box);
      box.addEventListener("click",function(e){ var b=e.target.closest("[data-set]"); if(!b) return; var k=b.getAttribute("data-set");
        if(k==="simple") AtomI18N.setLevel(AtomI18N.level==="simple"?"full":"simple");
        else if(k==="terms") AtomI18N.setBilingual(!AtomI18N.bilingual);
        else if(k==="vocab"){ var h=vocabHTML(); if(h) printHTML(h); else toast(TT("No glossary words on this page yet.")); } });
    })();

    /* ======================================================== Calculate */
    var C={tab:"light", nu:3, nl:2, cz:1, hl:"6,14", t:5700, tu:"y", n0:100, half:5700*31557600, listen:false, lastFrame:0, mass:1, mu:"g", formula:"C6H12O6"};
    var PRESETS=[];
    for(var pz in NOTABLE) NOTABLE[pz].forEach(function(r){ PRESETS.push({id:pz+","+r[0], label:nm(+pz)+"-"+r[0]+" ("+hlWords(r[1])+")", s:halfLifeSeconds(r[1])}); });
    PRESETS.push({id:"43,99m",label:TT("Technetium-99m (6.01 hours)"),s:6.01*3600},{id:"9,18",label:TT("Fluorine-18 (109.8 minutes)"),s:109.8*60});
    PRESETS=PRESETS.filter(function(p){ return p.s>0; }).sort(function(a,b){ return a.s-b.s; });
    (function(){ var c14=PRESETS.filter(function(p){ return p.id==="6,14"; })[0]; if(c14){ C.half=c14.s; } })();
    var UNITS=[["s",1,TT("seconds",{})],["min",60,TT("minutes",{})],["h",3600,TT("hours",{})],["d",86400,TT("days",{})],["y",31557600,TT("years",{})],["ky",31557600e3,TT("thousand years")],["My",31557600e6,TT("million years")],["Gy",31557600e9,TT("billion years")]];
    function unitS(u){ for(var i=0;i<UNITS.length;i++) if(UNITS[i][0]===u) return UNITS[i][1]; return 1; }
    function unitW(u){ for(var i=0;i<UNITS.length;i++) if(UNITS[i][0]===u) return UNITS[i][2]; return u; }
    function bestUnit(s){ var u=UNITS[0]; UNITS.forEach(function(x){ if(s>=x[1]*0.999) u=x; }); return u; }
    function unitOptions(sel){ return UNITS.map(function(u){ return "<option value=\""+(((u[0])))+"\""+((((u[0]===sel?' selected':''))))+">"+(((u[2])))+"</option>"; }).join(''); }
    function lightCalc(){ var L=lineOf(C.cz,C.nu,C.nl), E=L.E, w=L.w;
      /* the series names belong to hydrogen; He+ and Li2+ have their own */
      var series=C.cz===1?([TT("Lyman"),TT("Balmer"),TT("Paschen"),TT("Brackett"),TT("Pfund"),TT("Humphreys")][C.nl-1]||""):"";
      return {E:E,w:w,series:series,region:w<VIS0?"ultraviolet":(w<=VIS1?"visible":"infrared")}; }
    function calcState(){ var t=C.t*unitS(C.tu); return {k:t/C.half}; }
    function calcOut(){
      var P=pane("calc"), o=P.querySelector(".lb-cout"), vis=P.querySelector(".lb-cvis"), c;
      vis.innerHTML="";
      if(C.tab==="light"){ c=lightCalc(); ev("calc:line:"+C.cz+":"+C.nu+"-"+C.nl);
        o.innerHTML="<dl class=\"lb-big\">"+"<div>"+"<dt>"+(((TT("Photon energy"))))+"</dt>"+"<dd>"+((((fmt(c.E,3)))))+" eV"+"</dd>"+"</div>"+"<div>"+"<dt>"+(((TT("Wavelength"))))+"</dt>"+"<dd>"+((((fmt(c.w,c.w<100?2:1)))))+" nm"+"</dd>"+"</div>"+"<div>"+"<dt>"+(((TT("Kind of light"))))+"</dt>"+"<dd>"+((((c.region))))+"</dd>"+"</div>"+"</dl>"+"<p class=\"lb-say\">"+(((TT("{c}{c2} E = 13.6 eV × Z² × (1/{nl}² − 1/{nu}²), then λ = hc / E.",{c:(c.series?TT("This line belongs to the {series} series, the lines that end on level {nl}. ",{series:c.series,nl:C.nl}):""),c2:(c.region==="visible"?TT("Your eye sees it as {c}.",{c:(c.w<450?"violet":c.w<495?"blue":c.w<570?"green":c.w<590?"yellow":c.w<620?"orange":"red")}):TT("Your eye can't see it: it is {c}",{c:(c.region==="ultraviolet"?TT("beyond violet."):TT("beyond red."))})),nl:C.nl,nu:C.nu}))))+"</p>"; }
      else if(C.tab==="decay"){ var k=calcState().k, rem=C.n0*Math.pow(0.5,k), bu=bestUnit(C.half);
        ev("calc:decay:half:"+Math.floor(k+1e-6));
        o.innerHTML="<dl class=\"lb-big\">"+"<div>"+"<dt>"+(((TT("Left after {C} {unitW}",{C:fmt(C.t,C.t<10?2:0),unitW:unitW(C.tu)}))))+"</dt>"+"<dd>"+((((sci(rem,4)))))+"</dd>"+"</div>"+"<div>"+"<dt>"+(((TT("Fraction left"))))+"</dt>"+"<dd>"+(((((rem/C.n0*100<0.01?sci(rem/C.n0*100,3):fmt(rem/C.n0*100,2))))))+"%"+"</dd>"+"</div>"+"<div>"+"<dt>"+(((TT("Half-lives passed"))))+"</dt>"+"<dd>"+((((fmt(k,2)))))+"</dd>"+"</div>"+"</dl>"+"<p class=\"lb-say\">"+TT("Every half-life, half of what is left decays: N = N₀ × ½<sup>t / t½</sup>. With a half-life of {v} {v2}, no single atom knows when it will go; only the crowd is predictable.",{v:(((sci(C.half/bu[1],3)))),v2:(((bu[2])))})+"</p>"; }
      else if(C.tab==="emc"){ var kg=C.mass*{u:1.66053906892e-27,mg:1e-6,g:1e-3,kg:1,t:1000}[C.mu], E=kg*299792458*299792458;
        o.innerHTML="<dl class=\"lb-big\">"+"<div>"+"<dt>"+(((TT("Energy"))))+"</dt>"+"<dd>"+((((sci(E,3)))))+" J"+"</dd>"+"</div>"+"<div>"+"<dt>"+(((TT("In electricity"))))+"</dt>"+"<dd>"+((((sci(E/3.6e6,3)))))+" kWh"+"</dd>"+"</div>"+"<div>"+"<dt>"+"As TNT"+"</dt>"+"<dd>"+((((sci(E/4.184e9,3)))))+" tons"+"</dd>"+"</div>"+"</dl>"+"<p class=\"lb-say\">"+(((TT("That is enough to power a typical U.S. home, which uses roughly 10,500 kWh of electricity a year, for {E} years. But only matter meeting antimatter turns all of its mass into energy.",{E:sci(E/3.6e6/10500,3)}))))+"</p>";
        vis.innerHTML="<h3 class=\"lb-h\">"+TT("How much of the fuel's mass each reaction turns into energy")+"</h3>"+"<ul class=\"lb-bars\">"+([[TT("Matter meets antimatter"),1],[TT("Hydrogen fusing to helium in the Sun"),0.0071],[TT("Deuterium and tritium fusing"),0.00375],[TT("Uranium-235 splitting"),0.00091],[TT("Burning gasoline"),5.1e-10]].map(function(x){
            var wv=Math.max(2,100+Math.log10(x[1])*10); return "<li>"+"<span>"+(((((x[0])))))+"</span><i style=\"--w:"+(((((wv.toFixed(1))))))+"%\"></i><b>"+((((((x[1]>=0.001?fmt(x[1]*100,x[1]>=0.01?1:3):sci(x[1]*100,2)))))))+"%</b>"+"</li>"; }).join(''))+"</ul>"+"<p class=\"lb-note\">"+TT("Bars use a logarithmic scale: each step is ten times smaller.")+"</p>"; }
      else if(C.tab==="molar"){
        try{ var counts=parseFormula(C.formula), tot=0, rows=[];
          ev("calc:molar:"+hill(counts));
          for(var s in counts){ var zz=SYM[s], m=el(zz)[3]*counts[s]; tot+=m; rows.push([zz,counts[s],m]); }
          rows.sort(function(a,b){ return b[2]-a[2]; });
          o.innerHTML="<dl class=\"lb-big\">"+"<div>"+"<dt>"+(((TT("Molar mass"))))+"</dt>"+"<dd>"+((((fmt(tot,tot<100?3:2)))))+" g/mol"+"</dd>"+"</div>"+"<div>"+"<dt>"+(((TT("Atoms in one unit"))))+"</dt>"+"<dd>"+((((rows.reduce(function(a,r){ return a+r[1]; },0)))))+"</dd>"+"</div>"+"</dl>"+"<p class=\"lb-say\">"+(((TT("One mole of it, 6.022 × 10²³ units, weighs {tot} grams. Each element's share of the mass is its atomic mass times how many of its atoms there are.",{tot:fmt(tot,2)}))))+"</p>";
          vis.innerHTML="<h3 class=\"lb-h\">"+((TT("Where the mass is")))+"</h3>"+"<div class=\"lb-stack\" role=\"img\" aria-label=\""+(((esc(rows.map(function(r){ return (((nm(r[0]))))+" "+(((fmt(r[2]/tot*100,1))))+" percent"; }).join(", ")))))+"\">"+(((rows.map(function(r){ return "<i style=\"flex-basis:"+((((r[2]/tot*100).toFixed(2))))+"%;--cat:"+(((catC(el(r[0])))))+"\"></i>"; }).join(''))))+"</div>"+"<ul class=\"lb-comp\">"+(((rows.map(function(r){ var e=el(r[0]); return "<li>"+TT("<button type=\"button\" data-pick=\"{r}\" style=\"--cat:{catC}\"><b>{e}</b><span>{e2} × {r2}</span><i style=\"--w:{r3}%\"></i><em>{r4}% of the mass</em>",{r:r[0],catC:catC(e),e:e[1],e2:e[2],r2:r[1],r3:(r[2]/tot*100).toFixed(1),r4:fmt(r[2]/tot*100,1)})+"</button>"+"</li>"; }).join(''))))+"</ul>"+"<p class=\"lb-note\">"+((TT("Pick an element to open its card.")))+"</p>";
        }catch(err){ o.innerHTML='<p class="lb-say lb-err">'+esc(err.message)+'</p>'; }
      }
      dirty=true;
    }
    /* a preset isotope starts the clock at one half-life */
    function setPreset(id){ var p=PRESETS.filter(function(x){ return x.id===id; })[0]; if(!p) return;
      C.hl=id; C.half=p.s; var u=bestUnit(p.s); C.t=+(p.s/u[1]).toPrecision(4); C.tu=u[0]; calcForm(); ev("calc:decay:"+id); }
    function calcForm(){
      var P=pane("calc"), f=P.querySelector(".lb-cform"), hu=bestUnit(C.half);
      if(C.tab==="light") f.innerHTML="<label>"+TT("Atom")+"<select data-cv=\"cz\">"+([1,2,3].map(function(z){ return "<option value=\""+(((z)))+"\""+((((C.cz===z?' selected':''))))+">"+(((cap(HY[z].n))))+"</option>"; }).join(''))+"</select>"+"</label>"+"<label>"+TT("Electron falls from level")+"<input type=\"number\" min=\"2\" max=\"9\" data-cv=\"nu\" value=\""+(C.nu)+"\">"+"</label>"+"<label>"+TT("down to level")+"<input type=\"number\" min=\"1\" max=\"8\" data-cv=\"nl\" value=\""+(C.nl)+"\">"+"</label>"+"<div class=\"lb-chips\">"+([[3,2,TT("Hydrogen-alpha (red)")],[4,2,TT("Hydrogen-beta")],[2,1,TT("Lyman-alpha (ultraviolet)")],[4,3,TT("Paschen-alpha (infrared)")]].map(function(x){ return "<button type=\"button\" data-lpre=\""+(((x[0])))+","+(((x[1])))+"\">"+(((x[2])))+"</button>"; }).join(''))+"</div>"+"<button type=\"button\" class=\"lb-btn\" data-tone=\"1\">"+TT("Hear this line")+"</button>";
      else if(C.tab==="decay") f.innerHTML="<label>"+((TT("Isotope")))+"<select data-cv=\"preset\">"+"<option value=\"\">"+((TT("Your own half-life")))+"</option>"+(((PRESETS.map(function(p){ return "<option value=\""+(((p.id)))+"\""+((((C.hl===p.id?' selected':''))))+">"+(((esc(p.label))))+"</option>"; }).join(''))))+"</select>"+"</label>"+"<label>"+((TT("Starting amount")+"<input type=\"number\" min=\"0\" step=\"any\" data-cv=\"n0\" value=\""+(plain(C.n0))+"\">"))+"</label>"+"<label>"+((TT("Half-life")+"<span class=\"lb-pair\">"+"<input type=\"number\" min=\"0\" step=\"any\" data-cv=\"hv\" value=\""+(plain(C.half/hu[1]))+"\">"))+"<select data-cv=\"hu\" aria-label=\""+((TT("Half-life unit")))+"\">"+(((unitOptions(hu[0]))))+"</select>"+"</span>"+"</label>"+"<label>"+((TT("Time passed")+"<span class=\"lb-pair\">"+"<input type=\"number\" min=\"0\" step=\"any\" data-cv=\"t\" value=\""+(plain(C.t))+"\">"))+"<select data-cv=\"tu\" aria-label=\""+((TT("Time unit")))+"\">"+(((unitOptions(C.tu))))+"</select>"+"</span>"+"</label>"+"<label>"+((TT("Or slide through time")+"<input type=\"range\" min=\"0\" max=\"500\" data-cv=\"slide\" value=\""+(Math.round(Math.min(500,C.t*unitS(C.tu)/C.half*100)))+"\">"))+"</label>"+"<button type=\"button\" class=\"lb-btn\" data-listen aria-pressed=\""+(((C.listen)))+"\">"+((((C.listen?TT("Stop the counter"):TT("Listen like a Geiger counter")))))+"</button>";
      else if(C.tab==="emc") f.innerHTML="<label>"+((TT("Mass")+"<span class=\"lb-pair\">"+"<input type=\"number\" min=\"0\" step=\"any\" data-cv=\"mass\" value=\""+(plain(C.mass))+"\">"))+"<select data-cv=\"mu\" aria-label=\""+((TT("Mass unit")))+"\">"+((([["u",TT("atomic mass units")],["mg",TT("milligrams",{})],["g",TT("grams",{})],["kg",TT("kilograms",{})],["t",TT("tonnes",{})]].map(function(u){ return "<option value=\""+(((u[0])))+"\""+((((u[0]===C.mu?' selected':''))))+">"+(((u[1])))+"</option>"; }).join(''))))+"</select>"+"</span>"+"</label>"+"<div class=\"lb-chips\">"+((([[1,"g",TT("A paper clip, about 1 g")],[0.5,"g",TT("A raisin")],[4.3e9,"kg",TT("What the Sun turns to light each second")],[1,"u",TT("One atomic mass unit")]].map(function(x){ return "<button type=\"button\" data-em=\""+(((x[0])))+","+(((x[1])))+"\">"+(((x[2])))+"</button>"; }).join(''))))+"</div>";
      else f.innerHTML="<label>"+(TT("Type a chemical formula"))+"<input class=\"lb-input\" data-cv=\"formula\" value=\""+((esc(C.formula)))+"\" autocomplete=\"off\" autocapitalize=\"off\" spellcheck=\"false\" placeholder=\""+(TT("For example H2O or Ca(OH)2"))+"\">"+"</label>"+"<div class=\"lb-chips\">"+((["H2O","CO2","NaCl","C6H12O6","CaCO3","Fe2O3","C8H10N4O2","CuSO4·5H2O"].map(function(x){ return "<button type=\"button\" data-fm=\""+(((x)))+"\">"+(((x.replace(/([A-Za-z)])(\d+)/g,"$1<sub>$2</sub>"))))+"</button>"; }).join('')))+"</div>";
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
        if(c0.region!=="visible"){ g.fillStyle=T.ink; label(g,c0.w<VIS0?TT("beyond violet"):TT("beyond red"),sx+sw/2,c0.w<VIS0?sy+16:sy+sh-6,T); }
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
      P.innerHTML="<div class=\"lb-subtabs\" role=\"group\" aria-label=\""+(TT("Calculator"))+"\">"+((CALCS.map(function(c){ return "<button type=\"button\" data-ct=\""+(((((c[0])))))+"\" aria-pressed=\""+((((((C.tab===c[0]))))))+"\">"+(((((c[1])))))+"</button>"; }).join('')))+"</div>"+"<div class=\"lb-cols calc\">"+"<div class=\"lb-cside\">"+"<form class=\"lb-cform\">"+"</form>"+"<div class=\"lb-cout\" aria-live=\"polite\">"+"</div>"+"</div>"+"<div class=\"lb-cright\">"+"<div class=\"lb-stagewrap\">"+"<canvas class=\"lb-cv\" data-c=\"calc\" role=\"img\" aria-label=\""+(TT("A drawing of the calculation"))+"\">"+"</canvas>"+"</div>"+"<div class=\"lb-cvis\">"+"</div>"+"</div>"+"</div>";
      P.querySelector(".lb-cform").addEventListener("submit",function(e){ e.preventDefault(); });
      function setTab(t){ C.tab=t; [].forEach.call(P.querySelectorAll("[data-ct]"),function(b){ b.setAttribute("aria-pressed",b.getAttribute("data-ct")===t?"true":"false"); });
        P.setAttribute("data-calc",t); calcForm(); calcOut(); Progress.mark("calc",0,t); ev("calc:"+t); if(t==="decay"&&C.hl) ev("calc:decay:"+C.hl); }
      P.addEventListener("click",function(e){ var t=e.target.closest("[data-ct]"), lp=e.target.closest("[data-lpre]"), em=e.target.closest("[data-em]"), fm=e.target.closest("[data-fm]"), pk=e.target.closest("[data-pick]");
        if(t) setTab(t.getAttribute("data-ct"));
        if(lp){ var v=lp.getAttribute("data-lpre").split(","); C.nu=+v[0]; C.nl=+v[1]; C.cz=1; calcForm(); calcOut(); }
        if(em){ var m=em.getAttribute("data-em").split(","); C.mass=+m[0]; C.mu=m[1]; calcForm(); calcOut(); }
        if(fm){ C.formula=fm.getAttribute("data-fm"); calcForm(); calcOut(); }
        if(pk){ Z=+pk.getAttribute("data-pick"); if(opt.card) opt.card(Z); else if(opt.select) opt.select(Z); }
        if(e.target.closest("[data-tone]")){ var c0=lightCalc(); if(c0.w>=250&&c0.w<=1500){ Sound.tone(lightHz(c0.w),Sound.now()+0.02,1.2,0.3); toast(TT("A tone 40 octaves below this light: {fmt} Hz.",{fmt:fmt(lightHz(c0.w),0)})); } else toast(TT("This line is far outside visible light, so its tone would be out of hearing range.")); }
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
      if(typeof AtomSims==="undefined"){ P.innerHTML="<p class=\"lb-say\">"+TT("The workbench is not available here.")+"</p>"; return; }
      P.innerHTML="<p class=\"lb-note\">"+TT("Three experiments with the physics running live: fuse two nuclei, bond two protons with one electron, or build a battery from its electrodes.")+"</p>"+"<div class=\"lb-sims\">"+"</div>";
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
      if(!PTable.lineList(z)){ toast(TT("Atom has no measured spectrum for {el} yet.",{el:lc(z),z:z})); return; }
      H.z=z; var n=chord(z); if(!n){ toast(TT("{El}'s strongest lines are outside visible light.",{El:cap(lc(z)),z:z})); return; }
      var got=Progress.mark("heard",z); celebrate(got); ev("hear:"+z);
      var say=pane("hear").querySelector(".lb-hsay"); if(say) say.textContent=TT("{El}: {n} visible {n, plural, one {line} other {lines}}, played from red to violet, then all together.",{El:cap(lc(z)),n:n,z:z});
    }
    function playShells(z){
      var c=fillOrder(configOf(z)), t=Sound.now()+0.05, scale=[0,2,4,7,9,12,14,16,19,21,24,26,28,31,33,36,38,40,43], nowMs=performance.now();
      H.z=z; H.playing=[];
      c.forEach(function(sub,si){ for(var k=0;k<sub[2];k++){ Sound.tone(196*Math.pow(2,scale[Math.min(si,scale.length-1)]/12),t,0.18,0.18,"triangle"); t+=0.09; } t+=0.18; });
      H.until=nowMs+(t-Sound.now())*1000; dirty=true;
      var say=pane("hear").querySelector(".lb-hsay"); if(say) say.textContent=TT("{v}'s {v2} electron{v3}, one note each, in the order they fill: {v4}. Each new subshell plays a step higher; the pauses are where one subshell ends.",{v:(((cap(lc(z))))),v2:(((z))),v3:((((z>1?"s":"")))),v4:(((c.map(function(x){ return x[0]+"spdf"[x[1]]+x[2]; }).join(" "))))});
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
      g.innerHTML="<p class=\"lb-qtext\">"+TT("Which element made that light?")+"</p>"+"<div class=\"lb-choices\">"+(G.opts.map(function(z){ return "<button type=\"button\" class=\"lb-choice\" data-gz=\""+(((z)))+"\""+((((G.done?' disabled':''))))+">"+(((esc(nm(z)))))+"</button>"; }).join(''))+"</div>"+"<div class=\"lb-row\">"+"<button type=\"button\" class=\"lb-btn\" data-hp=\"replay\""+((G.done?' hidden':''))+">"+TT("Play it again")+"</button>"+TT("{G}<span class=\"lb-score\">{right} of {tries} by ear</span>",{G:(G.done?"<button type=\"button\" class=\"lb-btn go\" data-hp=\"guess\">"+TT("Another one")+"</button>":''),right:H.right,tries:H.tries})+"</div>";
    }
    function drawHear(now){
      var c=host.querySelector('[data-c="hear"]'); if(!c||!c.offsetParent) return false;
      var f=fit(c), g=f.g, w=f.w, h=f.h, T=th(), G=H.guess, hidden=G&&!G.done, z=G?G.z:(H.z||Z), L=PTable.lineList(z); g.clearRect(0,0,w,h);
      var x0=16, x1=w-16, y0=26, y1=h-36, span=VIS1-VIS0;
      g.fillStyle=T.light?"#fff":"#000"; g.fillRect(x0,y0,x1-x0,y1-y0);
      if(L&&!hidden) L.lines.forEach(function(p){ if(p[0]<VIS0||p[0]>VIS1) return; var x=x0+(x1-x0)*(p[0]-VIS0)/span, hot=0;
        H.playing.forEach(function(q){ if(Math.abs(q.w-p[0])<0.01&&now>=q.t&&now<=q.t+q.d) hot=1-(now-q.t)/q.d; });
        g.globalAlpha=Math.min(1,0.45+0.55*Math.min(1,p[1])+hot*0.4); g.fillStyle=T.light?"#111":wlRGB(p[0]); g.fillRect(x-1.5-hot*3,y0,3+hot*6,y1-y0); g.globalAlpha=1; });
      g.fillStyle=T.ink2; g.font="500 14px Archivo, sans-serif"; label(g,TT("{VIS0} nm violet",{VIS0:VIS0}),x0+48,y1+22,T); label(g,TT("red {VIS1} nm",{VIS1:VIS1}),x1-44,y1+22,T);
      g.fillStyle=T.ink; label(g,hidden?TT("A mystery element: listen, then guess"):(L?nm(z)+(L.computed?TT(" (computed)"):TT(" (measured)")):TT("No spectrum for {Name}",{Name:nm(z),z:z})),(x0+x1)/2,y0-8,T);
      return now<H.until;
    }
    BUILD.hear=function(P){
      P.innerHTML="<p class=\"lb-note\">"+TT("Sound plays only when you press a button. Each line in an element's light becomes a tone exactly 40 octaves below the light itself, so redder light plays lower, violet light higher, and every element has its own chord with the light's real proportions.")+"</p>"+"<div class=\"lb-stagewrap hear\">"+"<canvas class=\"lb-cv\" data-c=\"hear\" role=\"img\" aria-label=\"The element's visible spectrum\">"+"</canvas>"+"</div>"+"<div class=\"lb-row\">"+"<button type=\"button\" class=\"lb-btn go\" data-hp=\"light\">"+TT("<span>Play <span class=\"lb-hname\"></span>’s light</span>")+"</button>"+"<button type=\"button\" class=\"lb-btn\" data-hp=\"shells\">"+TT("Play its electrons filling in")+"</button>"+"<button type=\"button\" class=\"lb-btn\" data-hp=\"guess\">"+TT("Guess by ear")+"</button>"+"<button type=\"button\" class=\"lb-btn ghost\" data-hp=\"stop\">"+TT("Stop")+"</button>"+"<label class=\"lb-vol\">"+TT("Volume")+"<input type=\"range\" min=\"0\" max=\"100\" value=\"50\" data-vol>"+"</label>"+"</div>"+"<div class=\"lb-guess\" aria-live=\"polite\">"+"</div>"+"<p class=\"lb-say lb-hsay\" aria-live=\"polite\">"+"</p>"+"<h3 class=\"lb-h\">"+TT("Elements with measured light")+"</h3>"+"<div class=\"lb-chips lb-hchips\">"+(lineEls().map(function(z){ return "<button type=\"button\" data-hz=\""+(((z)))+"\">"+(((el(z)[1])))+" <span>"+(((nm(z))))+"</span>"+"</button>"; }).join(''))+"</div>"+((Sound.ok()?'':"<p class=\"lb-say lb-err\">"+TT("This browser can't play sound.")+"</p>"));
      P.addEventListener("click",function(e){ var p=e.target.closest("[data-hp]"), hz=e.target.closest("[data-hz]"), gz=e.target.closest("[data-gz]");
        if(hz){ H.guess=null; renderGuess(); H.z=+hz.getAttribute("data-hz"); H.chosen=true; REFRESH.hear(); playLight(H.z); }
        if(gz&&H.guess&&!H.guess.done){ var G=H.guess, pick=+gz.getAttribute("data-gz"), ok=pick===G.z; G.done=true; H.tries++; if(ok) H.right++;
          renderGuess(); [].forEach.call(P.querySelectorAll("[data-gz]"),function(b){ var v=+b.getAttribute("data-gz"); if(v===G.z) b.classList.add("ok"); else if(v===pick) b.classList.add("bad"); });
          var say=P.querySelector(".lb-hsay"); say.textContent=TT("{ok}{lc}{ok2} Its strongest visible lines are {visLines}.",{ok:(ok?TT("Right: "):TT("It was ")),lc:lc(G.z),ok2:(ok?".":TT(", not {el}.",{el:lc(pick)})),visLines:visLines(G.z).slice().sort(function(a,b){ return b[1]-a[1]; }).slice(0,3).map(function(x){ return fmt(x[0],0)+" nm"; }).join(", "),z:pick});
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
      var s=Progress.stats(), Pd=Progress.data(), names=function(o){ return Object.keys(o).map(Number).sort(function(a,b){ return a-b; }).map(function(z){ return nm(z); }).join(", ")||TT("none yet"); };
      var ch=Object.keys(Pd.challenges).map(function(k){ var c=Pd.challenges[k]; return "<li>"+TT("{k}: best {score} of {n}",{k:esc(k),score:c.score,n:c.n})+"</li>"; }).join('');
      return "<h1>"+TT("Atom: my progress")+"</h1>"+"<p>"+(esc(new Date().toLocaleDateString()))+"</p>"+"<ul>"+"<li>"+TT("Elements explored: {seen} of 118",{seen:s.seen})+"</li>"+"<li>"+TT("Elements built: {built}",{built:s.built})+"</li>"+"<li>"+TT("Elements mastered: {mastered}",{mastered:s.mastered})+"</li>"+"<li>"+TT("Orbital boxes filled: {orbitals}",{orbitals:s.orbitals})+"</li>"+"<li>"+TT("Right answers: {right} (best streak {best})",{right:s.right,best:s.best})+"</li>"+"<li>"+TT("Days explored: {days} (current streak {streak})",{days:s.days,streak:s.streak})+"</li>"+"</ul>"+"<h2>"+TT("Mastered")+"</h2>"+"<p>"+(esc(names(Pd.mastered)))+"</p>"+"<h2>"+TT("Built")+"</h2>"+"<p>"+(esc(names(Pd.built)))+"</p>"+"<h2>"+TT("Badges")+"</h2>"+"<ul>"+(Progress.badges.filter(function(b){ return Progress.has(b.id); }).map(function(b){ return '<li>'+esc(b.name)+': '+esc(b.desc)+'</li>'; }).join(''))+"</ul>"+((ch?"<h2>"+TT("Challenges")+"</h2>"+"<ul>"+(ch)+"</ul>":''))+"<p>"+TT("Kept on this device by Atom (normansrule.github.io/atom). Nothing was sent anywhere.")+"</p>";
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
          if(k==="reset-yes"){ askReset=false; Progress.reset(); toast(TT("Your progress on this device is erased.")); }
          if(k==="export"){ var ta=P.querySelector("[data-yexport]"); ta.hidden=false; ta.value=Progress.exportJSON(); ta.focus(); ta.select();
            try{ var blob=new Blob([ta.value],{type:TT("application/json")}), a2=D.createElement("a"); a2.href=URL.createObjectURL(blob); a2.download=TT("atom-progress-{v}.json",{v:new Date().toISOString().slice(0,10)}); D.body.appendChild(a2); a2.click(); setTimeout(function(){ URL.revokeObjectURL(a2.href); a2.remove(); },2000); }catch(e){}
            copyText(ta.value,ta,function(ok){ toast(ok?TT("Your progress is copied, and a file was offered. Paste or open it in Atom on another device."):TT("Select the text and copy it, or use the file.")); }); }
          if(k==="import"){ var ti=P.querySelector("[data-yimport]"); ti.hidden=false; ti.focus(); }
          if(k==="import-go"){ var tv=P.querySelector("[data-yimport]").value, err=Progress.importJSON(tv,true); toast(err||TT("Progress merged in. Nothing you had here was lost.")); if(!err) REFRESH.you(); }
          if(k==="code"){ var cd=Progress.code(); copyText(cd,null,function(ok){ toast(ok?TT("Turn-in code copied: {cd}",{cd:cd}):TT("Your code is {cd}",{cd:cd})); }); }
          if(k==="read"){ var rt=P.querySelector("[data-yread]"), rows=rt.value.split(/\s+/).filter(Boolean).map(function(c){ return [c,Progress.readCode(c)]; });
            P.querySelector(".lb-ytable").innerHTML=rows.length?"<table class=\"lb-table\">"+"<thead>"+"<tr>"+"<th>"+TT("Code from")+"</th>"+"<th>"+TT("Explored")+"</th>"+"<th>"+TT("Built")+"</th>"+"<th>"+TT("Mastered")+"</th>"+"<th>"+TT("Right")+"</th>"+"<th>"+TT("Streak")+"</th>"+"<th>"+TT("Mastered elements")+"</th>"+"<th>"+TT("Lessons")+"</th>"+"</tr>"+"</thead>"+"<tbody>"+(rows.map(function(r){ var s=r[1]; return s?'<tr><td>'+esc(s.date)+'</td><td>'+s.seen+'</td><td>'+s.built+'</td><td>'+s.mastered+'</td><td>'+s.right+'</td><td>'+s.streak+'</td><td>'+esc(s.mastList.map(function(z){ return el(z)[1]; }).join(" ")||"none")+'</td><td>'+esc((s.lessons||[]).length?(s.lessons||[]).map(function(id){ return {empty:"1",shells:"2",light:"3",nucleus:"4",table:"5"}[id]||id; }).join(" "):"—")+'</td></tr>':"<tr>"+"<td colspan=\"8\">"+TT("Not a valid code: {esc}",{esc:esc(r[0].slice(0,24))})+"</td>"+"</tr>"; }).join(''))+"</tbody>"+"</table>":''; } } });
      P.addEventListener("change",function(e){ var fi=e.target.closest("[data-yfile]"); if(!fi||!fi.files||!fi.files[0]) return;
        var rd=new FileReader(); rd.onload=function(){ var err=Progress.importJSON(rd.result,true); toast(err||TT("Progress merged in from the file.")); if(!err) REFRESH.you(); }; rd.readAsText(fi.files[0]); });
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
      var mini="<div class=\"lb-mini\" role=\"group\" aria-label=\""+(TT("Your table. Use the arrow keys to move between elements."))+"\">"+((ELEMENTS.map(function(f){ var lv=Progress.level(f[0]), pos=PTable.pos(f[0]);
        return "<button type=\"button\" class=\"l"+(((((lv)))))+"\" data-yz=\""+(((((f[0])))))+"\" tabindex=\""+((((((f[0]===focusZ?0:-1))))))+"\" style=\"--cat:"+(((((catC(f))))))+";grid-row:"+(((((pos.r)))))+";grid-column:"+(((((pos.c)))))+"\" title=\""+(((((esc(f[2]))))))+"\" aria-label=\""+(((((f[1])))))+", "+(((((esc(f[2]))))))+": "+((((([TT("not yet explored"),"explored","built","mastered"][lv])))))+"\">"+(((((f[1])))))+"</button>"; }).join('')))+"</div>";
      var chs=Object.keys(Pd.challenges).sort(function(a,b){ return Pd.challenges[b].when-Pd.challenges[a].when; }).slice(0,4);
      P.innerHTML=
        "<section class=\"lb-today\">"+"<h3>"+((((TT("Today's element")))))+"</h3>"+"<div class=\"lb-trow\">"+(((((tile(d.z,true))))))+"<div>"+"<p class=\"lb-tname\">"+(((((esc(e[2]))))))+"</p>"+"<p>"+(((((esc(cap(USES[d.z-1][1])))))))+((((((USES[d.z-1][2]?' · '+esc(USES[d.z-1][2]):''))))))+"</p>"+"</div>"+"</div>"+"<ol class=\"lb-tasks\">"+((((([["card",TT("Open its card"),d.card,TT("Open card")],["build",TT("Build its {isoWord} isotope, {e}-{commonA}",{isoWord:isoWord(d.z),e:e[2].toLowerCase(),commonA:commonA(d.z)}),d.build,TT("Build it")],["quiz",TT("Get a question about it right"),d.quiz,TT("Ask me")]].map(function(t){
            return "<li class=\""+((((((t[2]?"done":""))))))+"\"><span class=\"lb-mark\" role=\"img\" aria-label=\""+((((((t[2]?TT("done",{}):TT("not yet")))))))+"\">"+((((((t[2]?"✓":"○"))))))+"</span> "+(((((esc(t[1]))))))+((((((t[2]?'':" <button type=\"button\" class=\"lb-btn sm\" data-ya=\""+(((t[0])))+"\">"+(((t[3])))+"</button>"))))))+"</li>"; }).join(''))))))+"</ol>"+((((((d.done?"<p class=\"lb-say\">"+TT("All three done. A new element arrives tomorrow.")+"</p>":''))))))+((((((chs.length?"<h3 class=\"lb-h lb-chh\">"+TT("Challenges")+"</h3>"+"<ul class=\"lb-chl\">"+(chs.map(function(k){ var c=Pd.challenges[k]; return "<li>"+"<b>"+TT("{a} of {b}",{a:c.score,b:c.n})+"</b> <span>"+((esc(k)))+"</span>"+"</li>"; }).join(''))+"</ul>":''))))))+"</section>"+"<section class=\"lb-stats\">"+"<dl class=\"lb-big\">"+"<div>"+"<dt>"+((((TT("Explored")))))+"</dt>"+"<dd>"+(TT("{n} <small>of 118</small>",{n:s.seen}))+"</dd>"+"</div>"+"<div>"+"<dt>"+((((TT("Built")))))+"</dt>"+"<dd>"+(((((s.built)))))+"</dd>"+"</div>"+"<div>"+"<dt>"+((((TT("Mastered")))))+"</dt>"+"<dd>"+(((((s.mastered)))))+"</dd>"+"</div>"+"<div>"+"<dt>"+((((TT("Boxes filled")))))+"</dt>"+"<dd>"+(((((s.orbitals)))))+"</dd>"+"</div>"+"<div>"+"<dt>"+((((TT("Days in a row")))))+"</dt>"+"<dd>"+(((((s.streak)))))+"</dd>"+"</div>"+"<div>"+"<dt>"+((((TT("Right answers")))))+"</dt>"+"<dd>"+(((((s.right)))))+"</dd>"+"</div>"+"</dl>"+((((((s.due?"<p class=\"lb-say\">"+TT("{due} question{s} ready to review. ",{due:s.due,s:(s.due>1?TT("s are"):' is')})+"<button type=\"button\" class=\"lb-btn sm go\" data-ya=\"review\">"+TT("Review now")+"</button>"+"</p>":''))))))+"<h3 class=\"lb-h\">"+((((TT("Your table")))))+"</h3>"+"<p class=\"lb-legend\">"+((((TT("<span class=\"l1\">Explored</span><span class=\"l2\">Built</span><span class=\"l3\">Mastered</span>")))))+"</p>"+(((((mini)))))+"</section>"+"<section class=\"lb-badges\">"+"<h3 class=\"lb-h\">"+((((TT("Badges, {badges} of {Progress}",{badges:s.badges,Progress:Progress.badges.length})))))+"</h3>"+"<ul>"+(((((Progress.badges.map(function(b){ var has=Progress.has(b.id);
          return "<li class=\""+((((has?"has":""))))+"\"><b>"+((((has?'<span role="img" aria-label="earned">★</span> ':''))))+(((esc(b.name))))+"</b><span>"+(((esc(b.desc))))+"</span>"+"</li>"; }).join(''))))))+"</ul>"+"<div class=\"lb-row lb-youfoot\">"+"<button type=\"button\" class=\"lb-btn\" data-ya=\"print\">"+((((TT("Print my progress")))))+"</button>"+((((((askReset?TT("<span class=\"lb-confirm\" role=\"group\" aria-label=\"Erase your progress?\"><b>Erase everything on this device? This can't be undone.</b> ")+"<button type=\"button\" class=\"lb-btn sm\" data-ya=\"reset-yes\">"+TT("Yes, erase it")+"</button>"+"<button type=\"button\" class=\"lb-btn sm go\" data-ya=\"reset-no\">"+TT("Keep it")+"</button>"+"</span>":
            "<button type=\"button\" class=\"lb-btn ghost\" data-ya=\"reset\">"+TT("Erase my progress")+"</button>"))))))+"</div>"+"<p class=\"lb-note\">"+((((TT("Your progress stays on this device. Nothing is sent anywhere.")))))+"</p>"+"</section>"+"<section class=\"lb-carry\">"+"<h3 class=\"lb-h\">"+((((TT("Take it with you")))))+"</h3>"+"<p class=\"lb-note\">"+((((TT("On a shared computer, save your progress before you leave and bring it back next time. A turn-in code is a one-line summary, with no name, that a teacher can read in this same tab.")))))+"</p>"+"<div class=\"lb-row\">"+"<button type=\"button\" class=\"lb-btn\" data-ya=\"export\">"+((((TT("Save my progress")))))+"</button>"+"<button type=\"button\" class=\"lb-btn\" data-ya=\"import\">"+((((TT("Bring progress back")))))+"</button>"+"<button type=\"button\" class=\"lb-btn go\" data-ya=\"code\">"+((((TT("Copy my turn-in code")))))+"</button>"+"</div>"+"<textarea class=\"lb-input lb-yta\" data-yexport hidden readonly aria-label=\""+((((TT("Your progress as text, to copy or save")))))+"\" rows=\"3\">"+"</textarea>"+"<div data-yimport-wrap>"+"<textarea class=\"lb-input lb-yta\" data-yimport hidden aria-label=\""+((((TT("Paste a saved progress file here")))))+"\" rows=\"3\" placeholder=\""+((((TT("Paste a saved progress file here, or choose the file")))))+"\">"+"</textarea>"+"<div class=\"lb-row lb-yimp\">"+"<button type=\"button\" class=\"lb-btn sm go\" data-ya=\"import-go\">"+((((TT("Merge it in")))))+"</button>"+"<label class=\"lb-btn sm\">"+((((TT("Choose a file")))))+"<input type=\"file\" accept=\".json,application/json\" data-yfile hidden>"+"</label>"+"</div>"+"</div>"+"<h4 class=\"lb-h\">"+((((TT("For teachers: read turn-in codes")))))+"</h4>"+"<textarea class=\"lb-input lb-yta\" data-yread aria-label=\""+((((TT("Paste turn-in codes, one per line")))))+"\" rows=\"3\" placeholder=\""+((((TT("Paste codes here, one per line")))))+"\">"+"</textarea>"+"<div class=\"lb-row\">"+"<button type=\"button\" class=\"lb-btn sm\" data-ya=\"read\">"+((((TT("Read the codes")))))+"</button>"+"</div>"+"<div class=\"lb-ytable\">"+"</div>"+"</section>";
      refreshDue();
    };

    /* ======================================================== frame and API */
    var anim=false;
    api.frame=function(now){
      if(cur==="bench"&&sims) sims.frame(now);
      if(!dirty&&!anim) return;
      dirty=false;
      anim=cur==="build"?(bmode==="atom"?drawBuild(now):(bmode==="molecule"?drawMol(now):false)):(cur==="calc"?drawCalc(now):(cur==="hear"?drawHear(now):
        (cur==="trends"?drawTrend(now):(cur==="nuclides"?drawNuc(now):(cur==="math"?drawMath(now):(cur==="pes"?drawPes(now):(cur==="sun"?drawSun(now):false)))))));
    };
    api.show=function(t,z){ if(z) api.setElement(z); if(t==="compare"&&z){ CMP.a=z; if(!CMP.b||CMP.b===z) CMP.b=partner(z); CMP.follow=true; } show(t||cur); };
    /* the table picked an element: the labs follow it, except where you chose
       something yourself (a built atom, a played element) */
    api.setElement=function(z){ if(!z||z===Z) return; Z=z;
      if(built.predict){ if(Qs.mode==="this"&&!Qs.answered) nextQuestion(false); else renderModes(); }
      if(built.hear&&!H.guess){ H.z=z; REFRESH.hear(); }
      if(CMP.follow&&CMP.a){ CMP.a=z; if(CMP.b===z) CMP.b=partner(z); if(built.compare) renderCompare(); }
      if(built.trends) renderTrends();
      if(NU.follow&&NU.map){ NU.z=z; NU.n=commonA(z)-z; if(built.nuclides) renderNuc(); }
      if(MA.follow){ if(built.math) mathSetZ(z); else MA.z=z; }
      if(PE.follow&&!PE.guess){ PE.z=z; if(built.pes) REFRESH.pes(); }
      dirty=true; };
    api.build=function(z){ B.p=z; B.n=commonA(z)-z; B.e=z; show("build"); setBMode("atom"); changed(); };
    api.quiz=function(z){ if(z) Z=z; Qs.mode="this"; show("predict"); nextQuestion(true); };
    api.hear=function(z){ H.z=z; H.guess=null; show("hear"); renderGuess(); REFRESH.hear(); };
    /* a shared link: #build=6-8-6 or #challenge=A1... */
    api.open=function(spec){ if(!spec) return false;
      if(spec.build){ B.p=spec.build[0]; B.n=spec.build[1]; B.e=spec.build[2]; show("build"); setBMode("atom"); changed(); toast(TT("Here is the atom you were sent.")); return true; }
      if(spec.challenge){ show("predict"); if(challengeStart(spec.challenge)){ toast(TT("Challenge loaded: {CH} questions.",{CH:CH.keys.length})); return true; } }
      if(spec.act){ api.act(spec.act); toast(TT("Opened from a shared link.")); return true; }
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
      if(t==="compare"&&a.pair){ CMP.a=a.pair[0]; CMP.b=a.pair[1]; CMP.follow=false; show("compare"); renderCompare(); return; }
      if(t==="trends"&&a.prop){ if(TPROPS[a.prop]) TR.p=a.prop; if(a.line==="period"||a.line==="group") TR.line=a.line; show("trends"); var sel=pane("trends").querySelector("[data-tp]"); if(sel) sel.value=TR.p; renderTrends(); return; }
      if(t==="nuclides"&&a.z!=null){ show("nuclides"); nuSet(a.z,(a.a||commonA(a.z))-a.z); return; }
      if(t==="math"){ if(a.z){ MA.follow=false; MA.z=a.z; } show("math"); if(a.step!=null){ MA.ch=a.step; } if(built.math) mathRender(true); else MA.pending=true; return; }
      if(t==="pes"){ if(a.z){ PE.follow=false; PE.z=a.z; PE.guess=null; } show("pes"); if(built.pes) REFRESH.pes(); return; }
      if(t==="molecule"){ show("build"); setBMode("molecule"); if(a.mol){ var mb=pane("build").querySelector('[data-mp="'+a.mol+'"]'); if(mb) mb.click(); } return; }
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
    dl.innerHTML=ELEMENTS.map(function(e){ return "<option value=\""+(((esc(e[2]))))+"\">"+(((e[1])))+" · "+(((e[0])))+"</option>"; }).join('');
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
    return "<section class=\"pd-acts\" aria-label=\""+((TT("Try it yourself")))+"\">"+"<div>"+"<button type=\"button\" data-la=\"build\">"+((TT("Build {esc}",{esc:esc(lc(z))})))+"</button>"+"<button type=\"button\" data-la=\"quiz\">"+((TT("Quiz me on it")))+"</button>"+((((vis?"<button type=\"button\" data-la=\"hear\">"+TT("Hear its light")+"</button>":''))))+"<button type=\"button\" data-la=\"compare\">"+((TT("Compare it")))+"</button>"+"</div>"+"<p class=\"pd-mine\">"+((TT("<span class=\"on\">Explored</span><span{nb}>{nb2}</span><span{P}>{P2}</span>",{nb:(nb?" class=\"on\"":''),nb2:(nb?TT("Built {nb} isotope{nb2}",{nb:nb,nb2:(nb>1?'s':'')}):TT("Not built yet")),P:(P.mastered[z]?" class=\"on\"":''),P2:(P.mastered[z]?TT("Mastered"):TT("{v} of 3 right answers toward mastery",{v:Math.min(ok,3)}))})))+"</p>"+"</section>";
  }

  /* ------------------------------------------------------------ the labs' own checks, run with the app's self-test */
  function molar(f){ var c=parseFormula(f), m=0; for(var k in c) m+=el(SYM[k])[3]*c[k]; return m; }
  /* i18n:off */   /* the self-test speaks to the console, not to a reader */
  /* i18n:off */
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
    /* Explore and the molecule builder */
    var mis=[];
    for(var z=1;z<=118;z++) for(var a=z;a<=z+200;a++){ var nk=nclass(z,a).k, kind=nuclide(z,a).kind; if((nk===0)!==(kind==="unbound")||(nk===1)!==(kind==="stable")) mis.push(z+"-"+a); }
    t("labs: the chart of nuclides agrees with what a built nucleus does, nucleus by nucleus", mis.length===0, mis.slice(0,6).join(", "));
    var nb=nclass(6,14).k===2&&nclass(92,238).k===4&&nclass(19,40).k===2&&nclass(11,22).k===3&&nclass(26,56).k===1&&nclass(0,1).k===2&&nclass(82,208).k===1;
    t("labs: decay directions on the chart (C-14 beta-minus, U-238 alpha, Na-22 beta-plus, Fe-56 stable)", nb, [nclass(6,14).k,nclass(92,238).k,nclass(19,40).k,nclass(11,22).k].join(","));
    var ang=MOLS.filter(function(m){ return m.angle; }).map(function(m){ var g=molAngle(m); return [m.id,g==null?m.angle:g,m.angle]; }), angBad=ang.filter(function(x){ return Math.abs(x[1]-x[2])>0.6; });
    t("labs: each molecule's drawing makes the angle it states (water 104.5°, methane 109.5°, ammonia 106.7°)", angBad.length===0&&ang.length>=5, JSON.stringify(angBad));
    var fm=MOLS.every(function(m){ var c={}; m.atoms.forEach(function(x){ c[x[0]]=(c[x[0]]||0)+1; }); return m.ionic?(c.Na>0&&c.Na+c.Cl===27):hill(c)===hill(parseFormula(m.f)); });
    var mm=[["H2O",18.015,0.01],["CO2",44.009,0.01],["CH4",16.043,0.01],["NaCl",58.44,0.01]].every(function(x){ return Math.abs(molar(x[0])-x[1])<x[2]; });
    t("labs: molecules have the atoms their formulas say, and the right molar masses", fm&&mm, [molar("H2O"),molar("CO2"),molar("CH4"),molar("NaCl")].map(function(x){ return x.toFixed(3); }).join(" "));
    var tr=EN[8]===3.98&&EN[54]===0.79&&IE1[1]>24&&IE1[54]<4&&EN.length===118&&IE1.length===118&&EN[5]>EN[4]&&IE1[9]>IE1[10];
    t("labs: trend data (F most electronegative, He hardest to ionize, Cs easiest)", tr, [EN[8],EN[54],IE1[1],IE1[54]].join(" "));
    /* The math tab: its physics, checked against the rest of Atom */
    var sbad=[];
    for(var zz=1;zz<=118;zz++){ var seen2={}; configOf(zz).forEach(function(x){ var k2=x[0]+","+x[1]; if(seen2[k2]) return; seen2[k2]=1;
      var sp=slaterParts(zz,x[0],x[1]).Zeff, ze=zEff(zz,x[0],x[1]); if(Math.abs(sp-ze)>1e-9) sbad.push(zz+":"+x[0]+OLET[x[1]]+" "+sp.toFixed(3)+"/"+ze.toFixed(3)); }); }
    t("math: Slater's shielding, term by term, adds up to the Zeff Atom uses everywhere (every element, every subshell)", sbad.length===0, sbad.slice(0,4).join(", "));
    var bh=bohrLine(1,3,2).w, bl=bohrLine(1,2,1).w;
    t("math: Bohr's levels give the same hydrogen lines as the Calculate lab (656.47 and 121.57 nm)", Math.abs(bh-lineOf(1,3,2).w)<0.02&&Math.abs(bl-lineOf(1,2,1).w)<0.01, bh.toFixed(3)+" "+bl.toFixed(3));
    var normBad=[], nodeBad=[];
    [[1,0],[2,0],[2,1],[3,2],[4,3],[5,1]].forEach(function(q){ var s2=0, dr=0.002*q[0]*q[0], R; for(var r=dr/2;r<q[0]*q[0]*12+20;r+=dr){ R=radial(q[0],q[1],1,r); s2+=r*r*R*R*dr; } if(Math.abs(s2-1)>2e-3) normBad.push(q.join("")+":"+s2.toFixed(4)); });
    t("math: every hydrogen-like orbital is normalized (the electron is somewhere, with certainty)", normBad.length===0, normBad.join(" "));
    [[3,0],[4,1],[5,2],[2,1]].forEach(function(q){ var c=0, prev=radial(q[0],q[1],1,0.01); for(var r=0.02;r<80;r+=0.01){ var v=radial(q[0],q[1],1,r); if(v*prev<0) c++; if(v!==0) prev=v; } if(c!==q[0]-q[1]-1) nodeBad.push(q.join("")+":"+c); });
    t("math: the orbitals have n − l − 1 spherical nodes", nodeBad.length===0, nodeBad.join(" "));
    var tcH=Math.pow(MK.a0*1e-12,3)/(4*MK.re*MK.re*MK.c);
    t("math: a classical hydrogen atom would collapse in about 16 picoseconds (Larmor)", Math.abs(tcH-1.56e-11)<0.02e-11, tcH.toExponential(3));
    var semfOk=[[26,56],[8,16],[92,238],[50,120],[79,197]].every(function(q){ var z0=q[0], A0=q[1], N0=A0-z0, d=(z0%2===0&&N0%2===0)?SEMF.aP/Math.sqrt(A0):((z0%2===1&&N0%2===1)?-SEMF.aP/Math.sqrt(A0):0);
      var sum=SEMF.aV*A0-SEMF.aS*Math.pow(A0,2/3)-SEMF.aC*z0*(z0-1)/Math.pow(A0,1/3)-SEMF.aA*(A0-2*z0)*(A0-2*z0)/A0+d; return Math.abs(sum-bindingSEMF(z0,A0))<1e-9; });
    t("math: the five liquid-drop terms it shows add up to Atom's binding energy", semfOk, "");
    var lamY=MK.hbarc/MK.mpi, au=79*MK.alpha;
    t("math: Yukawa's range is 1.41 fm, and gold's innermost electron moves at 58% of light speed", Math.abs(lamY-1.414)<0.002&&Math.abs(au-0.5765)<0.001, lamY.toFixed(4)+" "+au.toFixed(4));
    /* the outermost electron is the highest shell's highest subshell: 4d for
       palladium, which has no 5s; s or p everywhere else */
    var pd=outerSub(46), spBad=[]; for(var zo=1;zo<=118;zo++){ if(zo===46) continue; var ob=outerSub(zo); if(ob[1]>1) spBad.push(zo); }
    t("math: the outer electron is palladium's 4d, and an s or p electron for the other 117", pd[0]===4&&pd[1]===2&&spBad.length===0, pd.slice(0,2).join(",")+" "+spBad.join(" "));
    /* the liquid-drop formula is wrong for the lightest nuclei: Atom shows the
       measured value where it has one, and a lone proton binds nothing */
    t("math: the liquid-drop formula fails for hydrogen and deuterium, and the measured values it shows instead are right (2.22 MeV for deuterium)",
      bindingSEMF(1,1)<0&&bindingSEMF(1,2)<0&&Math.abs(BA_MEAS["1-2"]*2-2.2246)<0.001, bindingSEMF(1,1).toFixed(2)+" "+(BA_MEAS["1-2"]*2).toFixed(4));
    t("math: names that are not elements, like \"constructor\", are not elements", zOf("constructor")===0&&zOf("toString")===0&&zOf("Pd")===46, "");
    /* links into the labs: read back exactly, and nothing unexpected gets through */
    var l1=fromHash("#lab=math&z=79&step=8"), l2=fromHash("#lab=compare&pair=79-47"), l3=fromHash("#lab=math&z=999&step=0&prop=<b>"), l4=fromHash("#lab=nothing&z=1");
    t("links: #lab=math&z=79&step=8 opens gold at step 8, a bad z, step, or lab is dropped",
      l1&&l1.act.lab==="math"&&l1.act.z===79&&l1.act.step===7&&l2&&l2.act.pair.join("-")==="79-47"&&l3&&l3.act.z==null&&l3.act.step==null&&l3.act.prop==null&&l4===null,
      JSON.stringify([l1,l2,l3,l4]));
    /* against outside data, not the code against itself: NIST's measured
       first ionization energies (eV), typed here from the NIST Atomic Spectra
       Database, and the AME2020 binding energies the app carries */
    var NIST={1:13.598434,2:24.587389,3:5.391715,10:21.564540,11:5.139077,26:7.902468,55:3.893906,79:9.225554};
    var nistBad=Object.keys(NIST).filter(function(z){ return Math.abs(IE1[z-1]-NIST[z])>0.0006; });
    t("data: the stored first ionization energies match NIST for H, He, Li, Ne, Na, Fe, Cs, and Au to 0.0005 eV", nistBad.length===0, nistBad.join(" "));
    /* the liquid-drop formula against every measured binding energy Atom has:
       within 3 percent from oxygen-16 up, and useless below lithium-6 */
    var semfMax=0, semfLight=1e9;
    Object.keys(BA_MEAS).forEach(function(k){ var p=k.split("-"), z0=+p[0], A0=+p[1], e=Math.abs(bindingSEMF(z0,A0)/A0-BA_MEAS[k])/BA_MEAS[k];
      if(A0>=16) semfMax=Math.max(semfMax,e); if(A0<=6) semfLight=Math.min(semfLight,e); });
    t("data: the liquid-drop formula is within 3 percent of AME2020 for every nucleus from oxygen-16 up, and off by 9 percent or more for every one up to lithium-6", semfMax<0.03&&semfLight>0.09, (semfMax*100).toFixed(2)+"% "+(semfLight*100).toFixed(1)+"%");
    /* Slater's estimate of the energy to remove the outer electron against
       NIST: the median s-electron estimate within 25 percent, every p-electron
       estimate at least twice the measured value, which is what step 7 warns */
    var sErr=[], pLow=[];
    for(var zs=1;zs<=118;zs++){ var ie0=IE1[zs-1]; if(!ie0) continue; var ob=outerSub(zs), sp=slaterParts(zs,ob[0],ob[1]), est=MK.Ry*Math.pow(sp.Zeff/(NSTAR[ob[0]]||ob[0]),2), rel=(est-ie0)/ie0;
      if(ob[1]===0) sErr.push(Math.abs(rel)); else if(ob[1]===1&&zs<=86&&rel<1) pLow.push(zs); }   /* lawrencium's lone 7p is the one exception, and its value is a single 2015 measurement */
    sErr.sort(function(a,b){ return a-b; });
    t("data: Slater's estimate lands within 25 percent (median) for outer s electrons and at least twice too high for every outer p electron up to radon, as step 7 says", sErr[Math.floor(sErr.length/2)]<0.25&&pLow.length===0, (sErr[Math.floor(sErr.length/2)]*100).toFixed(0)+"% "+pLow.join(" "));
    /* the common-mistake questions: for every element each claims, it builds,
       and exactly one of its choices is right */
    var misBad=[]; for(var zq=1;zq<=118&&misBad.length<5;zq++) for(var qi=0;qi<6;qi++){ var qq=makeQ("w:"+zq+":"+qi); if(!qq){ if(QTYPES.w.ok(zq)&&MIS[qi].ok(zq)) misBad.push("w:"+zq+":"+qi+" did not build"); continue; }
      var okN=qq.choices.filter(function(c){ return qq.check(c.v).ok; }).length; if(okN!==1) misBad.push("w:"+zq+":"+qi+" has "+okN+" right choices"); }
    t("predict: every common-mistake question builds for every element it claims, with exactly one right choice", misBad.length===0, misBad.join("; "));
    t("links: the link The math copies reads back as the same element and step", (function(){ var u=labLink({lab:"math",z:26,step:3}), h=u.slice(u.indexOf("#")), r=fromHash(h); return r&&r.act.z===26&&r.act.step===3; })(), labLink({lab:"math",z:26,step:3}));
    return out;
  }
  /* i18n:on */

  return {mount:mount, progress:Progress, search:search, nuclide:nuclide, parseFormula:parseFormula, zOf:zOf, sound:Sound, cardActions:cardActions, selfTest:selfTest,
    fromHash:fromHash, challengeParse:challengeParse, makeQ:makeQ, qtypes:QTYPES, newKey:newKey};
})();

/* ATOM-LABS END */
