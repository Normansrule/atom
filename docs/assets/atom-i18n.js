/* ATOM-I18N BEGIN */
/* ----------------------------------------------------------------------------
   Languages. Every sentence Atom shows goes through the function TT: the
   English text is the key, a language pack maps it to the translation, and
   placeholders are filled in afterwards so each language keeps its own word
   order. (The examples are spaced so the catalog extractor does not take them
   for sentences.)

     TT ("{The_el} melts at {t} °C.", {z:26, t:fmt(1538,0)})
     TT ("{n, plural, one {# electron} other {# electrons}}", {n:3})

   A pack is written by people as i18n/<code>.json (English sentence ->
   translation) and served as small generated files that call
   AtomI18N.load(code, {...}):
     meta   {name, dir, script, voice, locale, salt}
     el     the 118 element names in that language
     art    optional: the article each name takes ("el", "la", "der"...)
     forms  optional: other forms of the names ({gen:[118]} gives {el_gen})
     t      hash of the English template -> translation (0: same as English)
     s      hash -> a simpler telling (the "say it simpler" level)
     g      glossary: key -> {t: term, d: one-line definition, f: [forms], x: [exact-case forms]}
   The keys are hashed (FNV-1a, 32 bits, salted so no two collide) because
   half of a pack would otherwise be the English repeated. A page asks for a
   slice of the pack (the site's first screen does not need the labs' text);
   the app, one file, takes the whole pack. English's own pack carries only s
   and g and is fetched only when Simpler or Term help is on.

   The language comes from ?lang=, then the saved choice, then the browser's
   languages, and only a language that ships is ever accepted. The pack is
   written into the page before any other script runs, so every sentence is right from
   the first line. If it cannot be loaded the page says so and stays English.
   ---------------------------------------------------------------------------- */
var AtomI18N = (function(){
  var LANGS = {
    en:{name:"English",            dir:"ltr", script:"latin",      voice:"en-US"},
    es:{name:"Español",            dir:"ltr", script:"latin",      voice:"es-MX"},
    zh:{name:"中文（简体）",         dir:"ltr", script:"cjk",        voice:"zh-CN"},
    hi:{name:"हिन्दी",              dir:"ltr", script:"devanagari", voice:"hi-IN"},
    ar:{name:"العربية",            dir:"rtl", script:"arabic",     voice:"ar"},
    fr:{name:"Français",           dir:"ltr", script:"latin",      voice:"fr-FR"},
    bn:{name:"বাংলা",               dir:"ltr", script:"bengali",    voice:"bn-IN"},
    pt:{name:"Português (Brasil)", dir:"ltr", script:"latin",      voice:"pt-BR"},
    ru:{name:"Русский",            dir:"ltr", script:"cyrillic",   voice:"ru-RU"},
    ur:{name:"اردو",               dir:"rtl", script:"arabic",     voice:"ur-PK"},
    id:{name:"Bahasa Indonesia",   dir:"ltr", script:"latin",      voice:"id-ID"},
    de:{name:"Deutsch",            dir:"ltr", script:"latin",      voice:"de-DE"},
    ja:{name:"日本語",              dir:"ltr", script:"japanese",   voice:"ja-JP"},
    tr:{name:"Türkçe",             dir:"ltr", script:"latin",      voice:"tr-TR"},
    vi:{name:"Tiếng Việt",         dir:"ltr", script:"latin",      voice:"vi-VN"},
    ko:{name:"한국어",              dir:"ltr", script:"korean",     voice:"ko-KR"},
    it:{name:"Italiano",           dir:"ltr", script:"latin",      voice:"it-IT"},
    ta:{name:"தமிழ்",               dir:"ltr", script:"tamil",      voice:"ta-IN"},
    te:{name:"తెలుగు",              dir:"ltr", script:"telugu",     voice:"te-IN"},
    mr:{name:"मराठी",               dir:"ltr", script:"devanagari", voice:"mr-IN"},
    sw:{name:"Kiswahili",          dir:"ltr", script:"latin",      voice:"sw"}
  };
  /* the packs that ship; the rest of LANGS are coming and are refused everywhere until they do */
  var AVAILABLE = ["en","es"];
  var W = typeof window!=="undefined" ? window : (typeof globalThis!=="undefined" ? globalThis : {}), D = typeof document!=="undefined" ? document : null;
  var own = Object.prototype.hasOwnProperty;
  function table(){ return Object.create(null); }
  var lang = "en", pack = {meta:LANGS.en, el:null, art:null, forms:null, t:table(), s:table(), g:table()}, level = "full", bilingual = false, failed = null;
  var regs = [], missing = table();
  var ready, resolveReady;
  ready = new Promise(function(r){ resolveReady = r; });

  function store(k, v){ try{ if(v===null) localStorage.removeItem(k); else localStorage.setItem(k, v); return (v===null?localStorage.getItem(k)===null:localStorage.getItem(k)===v); }catch(e){ return false; } }
  function stored(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function param(name){ try{ var m=new RegExp("[?&]"+name+"=([^&#]*)").exec(W.location.search||""); return m?decodeURIComponent(m[1]):null; }catch(e){ return null; } }
  function esc(s){ return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }

  /* ------------------------------------------------------------ which language */
  function known(c){ return typeof c==="string" && AVAILABLE.indexOf(c)>=0; }
  function tidy(c){ return String(c||"").toLowerCase().replace(/_/g, "-").split("-")[0]; }   /* ES, es-MX, es_419 -> es */
  function pick(){
    var q = tidy(param("lang")); if(known(q)){ store("atom.lang", q); return q; }
    var s = stored("atom.lang"); if(known(s)) return s;
    if(s) store("atom.lang", null);                   /* a language this release does not ship */
    var pref = (navigator.languages||[navigator.language||"en"]);
    for(var i=0;i<pref.length;i++){ var c=tidy(pref[i]); if(known(c)) return c; }
    return "en";
  }
  /* the site keeps packs beside its other assets (assets/i18n/); the app keeps
     them in i18n/ next to itself, and when the app is the site's own copy
     (docs/app/) that folder is the site's, one level up. A page names the
     slice it wants on this script's tag: data-pack="site". */
  var me = D && D.currentScript;
  var SLICE = (me && me.getAttribute && me.getAttribute("data-pack")) || "";
  var packBase = (me && me.src) ? me.src.replace(/[^\/]*$/, "") + "i18n/"
               : (W.location && /\/app\/(index\.html)?$/.test(W.location.pathname) && /^https?:$/.test(W.location.protocol) ? "../assets/i18n/" : "i18n/");
  function packUrl(code, slice){ return packBase + code + (slice?"."+slice:"") + ".js"; }

  /* ------------------------------------------------------------ keys */
  var SALT = 0, HK = table();
  function hk(s){ var h=(0x811c9dc5^SALT)>>>0; for(var i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h, 0x01000193); } return (h>>>0).toString(36); }
  function keyOf(s){ return HK[s]||(HK[s]=hk(s)); }

  /* ------------------------------------------------------------ templates */
  var NF = {};
  /* the locale numbers are written in: the pack's meta.locale when it names one (Spanish
     for US classrooms is es-MX: point decimal, comma thousands), else the language. Digits
     stay 0-9 unless the pack asks for its own (meta.digits "native"), because the formulas,
     the canvases, and the answer boxes are all in 0-9. */
  function numLocale(){ var l=(pack&&pack.meta&&pack.meta.locale)||(lang==="en"?"en-US":lang); return (pack&&pack.meta&&pack.meta.digits==="native")||/-u-/.test(l)?l:l+"-u-nu-latn"; }
  function nf(d, maxOnly){
    var k=numLocale()+":"+d+(maxOnly?"m":"");
    if(!NF[k]){ var o=maxOnly?{maximumFractionDigits:d}:{maximumFractionDigits:d, minimumFractionDigits:d};
      try{ NF[k]=new Intl.NumberFormat(numLocale(), o); }catch(e){ NF[k]=new Intl.NumberFormat("en-US", o); } }
    return NF[k];
  }
  /* N(x, d): x with d decimals in the reader's notation (1 234,5 in French), a real minus sign;
     maxOnly: up to d decimals, trailing zeros dropped */
  function N(x, d, maxOnly){
    if(x===null||x===undefined||x===""||isNaN(x)) return "";
    var f=nf(d===undefined?0:d, maxOnly);
    if(f.formatToParts) return f.formatToParts(+x).map(function(p){ return p.type==="minusSign"?"−":p.value; }).join("");
    return f.format(+x).replace(/^-/, "−");
  }
  /* Nmm(x, min, max): between min and max decimals, for a caller that keeps a couple and drops the rest */
  function Nmm(x, min, max){
    if(x===null||x===undefined||x===""||isNaN(x)) return "";
    var k=numLocale()+":"+min+"-"+max, f=NF[k];
    if(!f){ var o={minimumFractionDigits:min, maximumFractionDigits:Math.max(min,max)}; try{ f=new Intl.NumberFormat(numLocale(), o); }catch(e){ f=new Intl.NumberFormat("en-US", o); } NF[k]=f; }
    if(f.formatToParts) return f.formatToParts(+x).map(function(p){ return p.type==="minusSign"?"−":p.value; }).join("");
    return f.format(+x).replace(/^-/, "−");
  }
  /* list(["2 H","1 O"]): "2 H and 1 O"; list([...], "or"): "a or b"; joined the way the reader's language joins a list */
  function list(a, or){ a=(a||[]).map(str); try{ return new Intl.ListFormat(numLocale().replace(/-u-.*$/, ""), {style:"long", type:or?"disjunction":"conjunction"}).format(a); }catch(e){ return a.join(", "); } }
  var PR = null;
  function plural(n){ try{ if(!PR) PR=new Intl.PluralRules(numLocale().replace(/-u-.*$/, "")); return PR.select(n); }catch(e){ return n===1?"one":"other"; } }

  /* find the "}" that closes the "{" at i */
  function closer(s, i){ var d=0; for(var k=i;k<s.length;k++){ if(s[k]==="{") d++; else if(s[k]==="}"){ d--; if(!d) return k; } } return -1; }
  /* "one {..} other {..}" -> {one:"..", other:".."} */
  function options(s){
    var o=table(), i=0; while(i<s.length){
      while(i<s.length&&/\s/.test(s[i])) i++;
      var j=i; while(j<s.length&&!/[\s{]/.test(s[j])) j++;
      var key=s.slice(i,j); while(j<s.length&&/\s/.test(s[j])) j++;
      if(s[j]!=="{"){ break; } var e=closer(s,j); if(e<0) break;
      o[key]=s.slice(j+1,e); i=e+1;
    }
    return o;
  }
  /* "#" stands for the number, but only at this plural's own level, not inside a nested one */
  function sharp(s, shown){ var out="", d=0; for(var i=0;i<s.length;i++){ var c=s[i]; if(c==="{") d++; else if(c==="}") d--; out+=(c==="#"&&d===0)?shown:c; } return out; }
  /* in a right-to-left sentence a spliced value (a number, a formula, a Latin name) keeps its own direction */
  var RTL = false;
  function iso(x){ x=str(x); return RTL&&x&&x.charAt(0)!=="<"?"⁨"+x+"⁩":x; }
  function fill(s, v){
    if(s.indexOf("{")<0) return s;
    var out="", i=0;
    while(i<s.length){
      var a=s.indexOf("{", i); if(a<0){ out+=s.slice(i); break; }
      var b=closer(s, a); if(b<0){ out+=s.slice(i); break; }
      out+=s.slice(i, a);
      var body=s.slice(a+1, b), c=body.indexOf(",");
      if(c<0){ var name=body.trim(); out+=own.call(v, name)?iso(v[name]):"{"+name+"}"; }
      else{
        var name2=body.slice(0,c).trim(), rest=body.slice(c+1), c2=rest.indexOf(","), kind=(c2<0?rest:rest.slice(0,c2)).trim();
        var val=own.call(v, name2)?v[name2]:undefined;
        if(kind==="plural"){
          var opts=options(c2<0?"":rest.slice(c2+1));
          /* a count that arrives already written ("1,234") still chooses its form and is shown as it came */
          var n=typeof val==="number"?val:parseFloat(String(val).replace(/[^\d.\-−]/g, "").replace("−", "-")), shown=typeof val==="number"?N(n, Number.isInteger(n)?0:1):str(val);
          var cat=plural(n), pk=opts["="+n]!==undefined?opts["="+n]:(opts[cat]!==undefined?opts[cat]:(opts.other||""));
          out+=fill(sharp(pk, shown), v);
        }
        else if(kind==="select"){ var opts2=options(c2<0?"":rest.slice(c2+1)), k=String(val); out+=fill(opts2[k]!==undefined?opts2[k]:(opts2.other||""), v); }
        else out+="{"+body+"}";                          /* not ours ("the set {1, 2, 3}"): leave it as written */
      }
      i=b+1;
    }
    return out;
  }
  /* a value is written the way "+" wrote it; numbers a reader should see in
     their own notation go through fmt()/N() before they get here */
  function str(x){ return x===undefined||x===null?"":String(x); }
  function cap(s){ if(!s) return s; try{ return s.charAt(0).toLocaleUpperCase(lang)+s.slice(1); }catch(e){ return s.charAt(0).toUpperCase()+s.slice(1); } }
  /* a title used inside a sentence ("Stable" -> "it is stable"): the first letter by the language's own
     rule, and not at all where nouns keep their capital (a pack says so with meta.keepCase) */
  function low(s){ if(!s||(pack.meta&&pack.meta.keepCase)) return s; try{ return s.charAt(0).toLocaleLowerCase(lang)+s.slice(1); }catch(e){ return s.charAt(0).toLowerCase()+s.slice(1); } }
  /* the element placeholders every template may use when it is handed z */
  function elVars(v){
    if(!v||!W.ELEMENTS) return v;
    var z=v.z;
    /* no z given but an element's name is: find it, so the pack may still use {the_el} and {The_el} */
    if(typeof z!=="number"){ var cand=v.El||v.el||v.Name||v.name||v.cap; if(typeof cand==="string"&&cand.length<=40) z=zByName(cand); }
    if(typeof z!=="number"||!z) return v;
    var e=W.ELEMENTS[z-1]; if(!e) return v;
    var name=elWord(z), art=pack.art&&pack.art[z-1]?pack.art[z-1]:"";
    var the=art?art+(/['’]$/.test(art)?"":" ")+name:name;
    var o={}; for(var k in v) if(own.call(v, k)) o[k]=v[k];
    if(!own.call(o, "el")) o.el=name; if(!own.call(o, "El")) o.El=cap(name);
    if(!own.call(o, "the_el")) o.the_el=the; if(!own.call(o, "The_el")) o.The_el=cap(the);
    if(!own.call(o, "sym")) o.sym=e[1]; if(!own.call(o, "Z")) o.Z=z;
    /* a language that bends its nouns brings the bent forms: forms.gen[25] is used as {el_gen} */
    if(pack.forms) for(var f in pack.forms) if(own.call(pack.forms, f)&&!own.call(o, "el_"+f)) o["el_"+f]=(pack.forms[f]&&pack.forms[f][z-1])||name;
    return o;
  }
  function tr(key){
    var h=keyOf(key);
    if(level==="simple"){ var sv=pack.s[h]; if(sv!==undefined) return sv; }
    var t=pack.t[h]; if(t===0) return key; if(t!==undefined) return t;
    if(lang!=="en"&&!missing[key]) missing[key]=1;
    return key;
  }
  /* contractions a filled template can produce: "de {the_el}" is "de el hierro" until the
     language's own rule makes it "del hierro". A pack may bring its own rules in
     meta.contract ([["de le","du"], ...]). The edges are letter-aware: "Envía el enlace"
     is not "a el", and the article is lowercase, so "El Salvador" is never touched. */
  var CONTRACT={ es:[["de el","del"],["a el","al"]],
    pt:[["de o","do"],["de a","da"],["de os","dos"],["de as","das"],["em o","no"],["em a","na"],["em os","nos"],["em as","nas"],["a o","ao"],["a os","aos"]] }, CRX=null;
  function contract(s){
    if(CRX===null){ var rules=(pack.meta&&Array.isArray(pack.meta.contract))?pack.meta.contract:CONTRACT[lang]; CRX=[];
      if(rules){ try{ CRX=rules.map(function(r){ return [new RegExp("(^|[^\\p{L}\\p{N}])"+r[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")+"(?![\\p{L}\\p{N}])", "gu"), "$1"+r[1]]; }); }catch(e){ CRX=[]; } } }
    for(var i=0;i<CRX.length;i++) s=s.replace(CRX[i][0], CRX[i][1]);
    return s;
  }
  function T(key, vars){ var s=tr(key); return s.indexOf("{")>=0?contract(fill(s, elVars(vars||{}))):s; }
  var TT=T;   /* the name the catalog extractor looks for, for the two sentences this file owns */
  /* for a sentence that lives in a data table: same lookup, and the table is
     registered so the extractor can list every sentence it holds */
  function TD(s, vars){ return T(s, vars); }
  function reg(name, arr, cols){ regs.push({name:name, arr:arr, cols:cols}); }
  function dumpData(){
    var out=[]; regs.forEach(function(r){
      function walk(x){ if(typeof x==="string"){ if(x&&/[A-Za-z]{2}/.test(x)) out.push(x); } else if(Array.isArray(x)) x.forEach(walk); else if(x&&typeof x==="object") Object.keys(x).forEach(function(k){ walk(x[k]); }); }
      if(r.cols){ (Array.isArray(r.arr)?r.arr:Object.keys(r.arr).map(function(k){ return r.arr[k]; })).forEach(function(row){ r.cols.forEach(function(c){ if(row&&row[c]!==undefined) walk(row[c]); }); }); }
      else walk(r.arr);
    });
    return out;
  }
  /* elWord: the name as it sits inside a sentence ("iron", "hierro", "Eisen");
     elName: the name as a title, on a tile or a card ("Iron", "Hierro") */
  function elWord(z){ var e=W.ELEMENTS&&W.ELEMENTS[z-1]; if(!e) return ""; return (pack.el&&pack.el[z-1])||(EN_NAMES?EN_NAMES[z-1]:e[2]).toLowerCase(); }
  function elEnglish(z){ var e=W.ELEMENTS&&W.ELEMENTS[z-1]; if(!e) return ""; return EN_NAMES?EN_NAMES[z-1]:e[2]; }
  function elName(z){ return cap(elWord(z)); }
  /* the name with its article where the language uses one: "el hierro", "la plata", "iron" */
  function theEl(z){ var v=elVars({z:z}); return (v&&v.the_el)||elWord(z); }
  function elNames(){ var o=[]; for(var z=1;z<=118;z++) o.push(elName(z)); return o; }

  /* ------------------------------------------------------------ static markup */
  function norm(s){ return String(s).replace(/\s+/g, " ").trim(); }
  function apply(root){
    root=root||D; if(!root) return;
    var els=root.querySelectorAll("[data-i]");
    for(var i=0;i<els.length;i++){
      /* one English word can be two things ("Atom" the name, "Atom" the scale): data-i-ctx tells them apart,
         and the catalog files the second as "Atom [[depth gauge]]" */
      var el=els[i], text=norm(el.innerHTML), ctx=el.getAttribute("data-i-ctx"), key=ctx?text+" [["+ctx+"]]":text, h=keyOf(key), t=tr(key);
      if(t!==key) el.innerHTML=t;
      /* a sentence the pack does not have stays English, and says so to a screen reader */
      else if(lang!=="en"&&pack.t[h]!==0&&/[A-Za-z]{3}/.test(key)&&el.nodeName!=="TITLE"){ el.setAttribute("lang", "en"); el.setAttribute("dir", "ltr"); }
    }
    var at=root.querySelectorAll("[data-i-attr]");
    for(var j=0;j<at.length;j++){
      var a=at[j]; a.getAttribute("data-i-attr").split(",").forEach(function(name){
        name=name.trim(); var v=a.getAttribute(name); if(v){ var t2=tr(norm(v)); if(t2!==norm(v)) a.setAttribute(name, t2); }
      });
    }
  }

  /* ------------------------------------------------------------ loading
     The pack is written into the page with document.write from this script,
     which the browser runs before any script after it: every sentence in the app,
     data tables included, sees the translation from the first line. A slice
     asked for later (the labs' text, when the labs load) arrives by a script
     tag and need() resolves when it is in. */
  var loaded=false, got=table(), waiting=table();
  function merge(into, from){ if(from) for(var k in from) if(own.call(from, k)) into[k]=from[k]; }
  function load(code, p){
    if(code!==lang||!p) return;      /* a stale pack from an earlier choice */
    if(p.meta){ pack.meta=p.meta; if(typeof p.meta.salt==="number"&&p.meta.salt!==SALT){ SALT=p.meta.salt; HK=table(); } PR=null; NF={}; CRX=null; }
    if(p.el) pack.el=p.el; if(p.art) pack.art=p.art; if(p.forms) pack.forms=p.forms;
    merge(pack.t, p.t); merge(pack.s, p.s); merge(pack.g, p.g);
    loaded=true; got[p.slice||""]=1;
  }
  function wantsPack(){ return lang!=="en" || level==="simple" || bilingual; }
  function inject(url, done){
    if(!D){ done(false); return; }
    var s=D.createElement("script"); s.src=url; s.onload=function(){ done(true); }; s.onerror=function(){ done(false); };
    (D.head||D.documentElement).appendChild(s);
  }
  /* need("labs"): the labs' slice of the pack, for a page that started with a smaller one */
  function need(slice){
    if(!wantsPack()||!SLICE||got[slice]||got[""]||failed) return Promise.resolve(true);
    if(!waiting[slice]) waiting[slice]=new Promise(function(res){ inject(packUrl(lang, slice), function(ok){ if(!ok){ try{ console.warn("Atom: the "+slice+" part of the "+lang+" pack did not load"); }catch(e){} } res(ok); }); });
    return waiting[slice];
  }
  /* the files this page's language is made of, for the service worker to keep */
  function packFiles(){ if(!wantsPack()) return []; return SLICE?[packUrl(lang, SLICE), packUrl(lang, "labs")]:[packUrl(lang, "")]; }
  var finished=false;
  var EN_NAMES=null;
  /* the table's own names take the pack's: every e[2] in the app then shows
     the language's name, and a search still finds the English one */
  function localizeElements(){
    if(!W.ELEMENTS||!pack.el||EN_NAMES) return;
    EN_NAMES=W.ELEMENTS.map(function(e){ return e[2]; });
    for(var z=1;z<=118;z++){ if(pack.el[z-1]) W.ELEMENTS[z-1][2]=cap(pack.el[z-1]); }
  }
  function low(s){ return String(s||"").toLowerCase(); }
  function lowL(s){ try{ return String(s||"").toLocaleLowerCase(lang); }catch(e){ return low(s); } }
  function zByName(s){
    s=String(s||"").trim(); if(!s||!W.ELEMENTS) return 0; var a=low(s), b=lowL(s);
    for(var z=1;z<=118;z++){ var e=W.ELEMENTS[z-1]; if(!e) continue;
      if(low(e[1])===a||low(e[2])===a||lowL(e[2])===b||(EN_NAMES&&low(EN_NAMES[z-1])===a)||(pack.el&&pack.el[z-1]&&(low(pack.el[z-1])===a||lowL(pack.el[z-1])===b))) return z; }
    return 0;
  }
  function finish(){ if(finished) return; finished=true;
    if(!loaded&&wantsPack()){
      /* the pack is not here (offline and never fetched, or the single file without its i18n folder):
         say so and be English honestly, in name, direction, numbers, and voice. The saved choice
         stays, so the next visit tries again. */
      failed=lang; if(lang!=="en"){ lang="en"; PR=null; NF={}; CRX=null; mark(); }
      level="full"; bilingual=false;
      try{ console.warn("Atom: the language pack for "+failed+" did not load; showing English"); }catch(e){}
    }
    localizeElements();
    if(D){ try{ apply(D); }catch(e){} }
    if(D){ try{ D.documentElement.classList.remove("i18n-wait"); }catch(e){} }
    /* a page with no script of its own (the teacher guide, the handout) still gets the language menu */
    if(D){ try{ var h=D.getElementById("langHost"); if(h&&!h.firstChild) mountMenu(h, "langPick"); }catch(e){} }
    resolveReady(lang); }
  function mark(){
    if(!D) return; var h=D.documentElement, m=LANGS[lang];
    h.lang=lang; h.dir=m.dir; h.className=h.className.replace(/\s*\b(lang|script)-[a-z]+\b/g, "")+" lang-"+lang+" script-"+m.script;
    RTL=m.dir==="rtl"; if(RTL) h.classList.add("rtl"); else h.classList.remove("rtl");
  }
  function start(){
    lang=pick();
    /* the two reading settings, from the address when storage is blocked, else from storage */
    var pl=param("level"), pt=param("terms");
    level=(pl==="simple"||(pl===null&&stored("atom.level")==="simple"))?"simple":"full";
    bilingual=(pt==="1"||(pt===null&&stored("atom.bilingual")==="1"));
    mark();
    if(!wantsPack()){ if(D&&D.readyState==="loading") D.addEventListener("DOMContentLoaded", finish); else finish(); return; }
    /* the page's own words stay hidden until they are in the reader's language (three seconds at most) */
    if(D&&lang!=="en"){ try{ D.documentElement.classList.add("i18n-wait"); setTimeout(function(){ D.documentElement.classList.remove("i18n-wait"); }, 3000); }catch(e){} }
    if(D&&D.readyState==="loading"){
      /* parser-inserted, so it runs before the next script tag; same origin, so the page's policy allows it */
      D.write('<script src="'+esc(packUrl(lang, SLICE))+'"><\/script>');
      D.addEventListener("DOMContentLoaded", finish);
    }
    else inject(packUrl(lang, SLICE), function(){ finish(); });   /* this script was deferred or added late: the pack follows by a tag */
  }
  /* a choice is saved when the device lets us and carried in the address when it does not */
  function go(set){
    try{ var u=new URL(W.location.href); set(u.searchParams); var next=u.pathname+u.search+u.hash;
      if(next!==W.location.pathname+W.location.search+W.location.hash){ W.location.assign(next); return; } }catch(e){}
    W.location.reload();
  }
  function hrefFor(code){ try{ var u=new URL(W.location.href); u.searchParams.set("lang", code); return u.pathname+u.search+u.hash; }catch(e){ return "?lang="+code; } }
  function setLang(code){ if(!known(code)) return; var kept=store("atom.lang", code); go(function(q){ if(kept) q.delete("lang"); else q.set("lang", code); }); }
  function setLevel(l){ var simple=l==="simple", kept=store("atom.level", simple?"simple":null); go(function(q){ if(kept) q.delete("level"); else q.set("level", simple?"simple":"full"); }); }
  function setBilingual(on){ var kept=store("atom.bilingual", on?"1":null); go(function(q){ if(kept) q.delete("terms"); else q.set("terms", on?"1":"0"); }); }

  /* the language menu, the same wherever it sits: a two-letter badge that opens
     a short list of links, each language in its own name. Links, not a select:
     an arrow key on a closed select changes the page under a keyboard user. */
  function menuHTML(id){
    var h='<details class="lang-menu" id="'+esc(id)+'"><summary class="lang-sum" aria-label="'+esc(lang.toUpperCase()+", "+TT("Language")+": "+LANGS[lang].name)+'"><span>'+lang.toUpperCase()+'</span></summary><ul class="lang-list">';
    AVAILABLE.forEach(function(c){ h+='<li><a href="'+esc(hrefFor(c))+'" data-lang="'+c+'" lang="'+c+'" hreflang="'+c+'"'+(c===lang?' aria-current="true"':'')+'>'+LANGS[c].name+'</a></li>'; });
    return h+'</ul>'+(failed?'<p class="lang-note" role="status">'+esc(LANGS[failed]?LANGS[failed].name:failed)+": "+esc(TT("this language could not be loaded here."))+'</p>':'')+'</details>';
  }
  function mountMenu(host, id){ if(!host) return null; host.innerHTML=menuHTML(id||"langPick"); var d=host.querySelector("details"); wireMenu(d); return d; }
  function wireMenu(d){
    if(!d||!D) return;
    d.addEventListener("click", function(e){ var a=e.target&&e.target.closest?e.target.closest("a[data-lang]"):null; if(!a) return; e.preventDefault(); setLang(a.getAttribute("data-lang")); });
    d.addEventListener("keydown", function(e){ if(e.key==="Escape"&&d.open){ d.open=false; var s=d.querySelector("summary"); if(s) s.focus(); } });
    D.addEventListener("click", function(e){ if(d.open&&!d.contains(e.target)) d.open=false; });
  }

  /* ------------------------------------------------------------ read aloud
     Only with a voice that runs on this device. A browser's network voices
     send the text to their maker's servers, and Atom sends nothing anywhere:
     where the device has no voice of its own for the language, Listen is not
     offered. */
  var speaking=null;
  function voiceTag(){ return (pack.meta&&pack.meta.voice)||LANGS[lang].voice||lang; }
  function localVoice(){
    var vs=[]; try{ vs=W.speechSynthesis.getVoices()||[]; }catch(e){}
    var want=String(voiceTag()).toLowerCase().replace(/_/g, "-"), base=want.split("-")[0], near=null;
    for(var i=0;i<vs.length;i++){ var v=vs[i]; if(!v||v.localService!==true) continue;
      var vl=String(v.lang||"").toLowerCase().replace(/_/g, "-");      /* Android writes es_ES */
      if(vl===want) return v; if(!near&&vl.split("-")[0]===base) near=v; }
    return near;
  }
  function canSpeak(){ return !!(W.speechSynthesis&&W.SpeechSynthesisUtterance&&localVoice()); }
  function speak(text, onend){
    if(!W.speechSynthesis||!W.SpeechSynthesisUtterance||!text) return false;
    var v=localVoice(); if(!v) return false;          /* say nothing rather than let the browser pick a network voice */
    stopSpeaking();
    var u=new SpeechSynthesisUtterance(String(text).replace(/\s+/g, " ").trim()); u.voice=v; u.lang=v.lang;
    u.onend=u.onerror=function(){ if(speaking===u){ speaking=null; if(onend) onend(); } };
    speaking=u; W.speechSynthesis.speak(u); return true;
  }
  function stopSpeaking(){ var was=speaking; speaking=null; if(W.speechSynthesis){ try{ W.speechSynthesis.cancel(); }catch(e){} } return !!was; }
  if(W.speechSynthesis){
    try{ W.speechSynthesis.getVoices();      /* Chrome fills the list late: ask once now, and tell the labs when it arrives */
      if(W.speechSynthesis.addEventListener) W.speechSynthesis.addEventListener("voiceschanged", function(){ try{ W.dispatchEvent(new Event("atom:voices")); }catch(e){} });
      if(W.addEventListener) W.addEventListener("pagehide", function(){ stopSpeaking(); }); }catch(e){}
  }

  if(D) start(); else finish();
  return {LANGS:LANGS, AVAILABLE:AVAILABLE, ready:ready, T:T, TD:TD, N:N, Nmm:Nmm, list:list, cap:cap, low:low, esc:esc, reg:reg, dumpData:dumpData, elName:elName, elWord:elWord, theEl:theEl, elEnglish:elEnglish, elNames:elNames, zByName:zByName, localizeElements:localizeElements,
    apply:apply, load:load, need:need, packFiles:packFiles, known:known, setLang:setLang, setLevel:setLevel, setBilingual:setBilingual, menuHTML:menuHTML, mountMenu:mountMenu, wireMenu:wireMenu,
    speak:speak, stopSpeaking:stopSpeaking, canSpeak:canSpeak, norm:norm, hash:hk,
    get lang(){ return lang; }, get dir(){ return LANGS[lang].dir; }, get level(){ return level; }, get bilingual(){ return bilingual; }, get failed(){ return failed; }, get slice(){ return SLICE; },
    get glossary(){ return pack.g; }, get meta(){ return pack.meta; }, get missing(){ return Object.keys(missing); }, get isEnglish(){ return lang==="en"; }};
})();
var TT=AtomI18N.T;   /* TT, not T: the labs use T for the theme inside their drawing code */
/* ATOM-I18N END */
