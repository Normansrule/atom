/* ATOM-I18N BEGIN */
/* ----------------------------------------------------------------------------
   Languages. Every sentence Atom shows goes through TT(): the English text is
   the key, a language pack maps it to the translation, and placeholders are
   filled in afterwards so each language keeps its own word order.

     TT("{The_el} melts at {t} °C.", {z:26, t:fmt(1538,0)})
     TT("{n, plural, one {# electron} other {# electrons}}", {n:3})

   A pack is a file, i18n/<code>.js, that calls AtomI18N.load(code, {...}):
     meta   {name, dir, script, voice}
     el     the 118 element names in that language
     art    optional: the article each name takes ("el", "la", "der"...)
     t      English template -> translation
     s      English template -> a simpler telling (the "say it simpler" level)
     g      glossary: key -> {t: term, d: one-line definition, f: [forms]}
   English's own pack carries only s and g. A missing key falls back to
   English, so a half-finished pack is still usable.

   The pack is chosen from ?lang=, then the saved choice, then the browser's
   languages, and written into the page before any other script runs, so
   T() is right from the first line. Boot waits on AtomI18N.ready (the DOM).
   Switching stores the choice and reloads.
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
  /* the packs that ship; the rest of LANGS are coming and stay out of the menu */
  var AVAILABLE = ["en","es"];
  var W = typeof window!=="undefined" ? window : (typeof globalThis!=="undefined" ? globalThis : {}), D = typeof document!=="undefined" ? document : null;
  var lang = "en", pack = {meta:LANGS.en, el:null, art:null, t:{}, s:{}, g:{}}, level = "full", bilingual = false;
  var regs = [], missing = {};
  var ready, resolveReady;
  ready = new Promise(function(r){ resolveReady = r; });

  function store(k, v){ try{ if(v===null) localStorage.removeItem(k); else localStorage.setItem(k, v); }catch(e){} }
  function stored(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function param(name){ try{ var m=new RegExp("[?&]"+name+"=([^&#]*)").exec(W.location.search||""); return m?decodeURIComponent(m[1]):null; }catch(e){ return null; } }

  /* ------------------------------------------------------------ which language */
  function pick(){
    var q = param("lang"); if(q && LANGS[q]){ store("atom.lang", q); return q; }
    var s = stored("atom.lang"); if(s && LANGS[s]) return s;
    var pref = (navigator.languages||[navigator.language||"en"]);
    for(var i=0;i<pref.length;i++){ var c=String(pref[i]).toLowerCase().split("-")[0]; if(AVAILABLE.indexOf(c)>=0) return c; }
    return "en";
  }
  /* the site keeps packs beside its other assets (assets/i18n/); the app keeps
     them in i18n/ next to itself, and when the app is the site's own copy
     (docs/app/) that folder is the site's, one level up */
  var packBases = (D && D.currentScript && D.currentScript.src) ? [D.currentScript.src.replace(/[^\/]*$/, "") + "i18n/"]
                : (W.location && /\/app\/(index\.html)?$/.test(W.location.pathname) && /^https?:$/.test(W.location.protocol) ? ["../assets/i18n/"] : ["i18n/"]);
  function packUrl(code, i){ return packBases[i||0] + code + ".js"; }

  /* ------------------------------------------------------------ templates */
  var NF = {};
  /* the locale numbers are written in: the pack's meta.locale when it names one (Spanish
     for US classrooms is es-MX: point decimal, comma thousands), else the language */
  function numLocale(){ return (pack&&pack.meta&&pack.meta.locale)||(lang==="en"?"en-US":lang); }
  function nf(d, maxOnly){ var k=numLocale()+":"+d+(maxOnly?"m":""); if(!NF[k]) NF[k]=new Intl.NumberFormat(numLocale(), maxOnly?{maximumFractionDigits:d}:{maximumFractionDigits:d, minimumFractionDigits:d}); return NF[k]; }
  /* N(x, d): x with d decimals in the reader's notation (1 234,5 in French, १,२३४.५ in Hindi), a real minus sign;
     maxOnly: up to d decimals, trailing zeros dropped */
  function N(x, d, maxOnly){ if(x===null||x===undefined||isNaN(x)) return ""; return nf(d===undefined?0:d, maxOnly).format(+x).replace(/^-/, "−"); }
  var PR = null;
  function plural(n){ try{ if(!PR) PR=new Intl.PluralRules(numLocale()); return PR.select(n); }catch(e){ return n===1?"one":"other"; } }

  /* find the "}" that closes the "{" at i */
  function closer(s, i){ var d=0; for(var k=i;k<s.length;k++){ if(s[k]==="{") d++; else if(s[k]==="}"){ d--; if(!d) return k; } } return -1; }
  /* "one {..} other {..}" -> {one:"..", other:".."} */
  function options(s){
    var o={}, i=0; while(i<s.length){
      while(i<s.length&&/\s/.test(s[i])) i++;
      var j=i; while(j<s.length&&!/[\s{]/.test(s[j])) j++;
      var key=s.slice(i,j); while(j<s.length&&/\s/.test(s[j])) j++;
      if(s[j]!=="{"){ break; } var e=closer(s,j); if(e<0) break;
      o[key]=s.slice(j+1,e); i=e+1;
    }
    return o;
  }
  function fill(s, v){
    if(s.indexOf("{")<0) return s;
    var out="", i=0;
    while(i<s.length){
      var a=s.indexOf("{", i); if(a<0){ out+=s.slice(i); break; }
      var b=closer(s, a); if(b<0){ out+=s.slice(i); break; }
      out+=s.slice(i, a);
      var body=s.slice(a+1, b), c=body.indexOf(",");
      if(c<0){ var name=body.trim(); out+=(name in v)?str(v[name]):"{"+name+"}"; }
      else{
        var name2=body.slice(0,c).trim(), rest=body.slice(c+1), c2=rest.indexOf(","), kind=(c2<0?rest:rest.slice(0,c2)).trim(), opts=options(c2<0?"":rest.slice(c2+1));
        var val=v[name2];
        if(kind==="plural"){ var n=+val; var pick=opts["="+n]!==undefined?opts["="+n]:(opts[plural(n)]!==undefined?opts[plural(n)]:opts.other||""); out+=fill(pick.replace(/#/g, N(n, Number.isInteger(n)?0:1)), v); }
        else if(kind==="select"){ var k=String(val); out+=fill(opts[k]!==undefined?opts[k]:(opts.other||""), v); }
        else out+=str(val);
      }
      i=b+1;
    }
    return out;
  }
  /* a value is written the way "+" wrote it; numbers a reader should see in
     their own notation go through fmt()/N() before they get here */
  function str(x){ return x===undefined||x===null?"":String(x); }
  function cap(s){ return s?s.charAt(0).toUpperCase()+s.slice(1):s; }
  /* the element placeholders every template may use when it is handed z */
  function elVars(v){
    if(!v||!W.ELEMENTS) return v;
    var z=v.z;
    /* no z given but an element's name is: find it, so the pack may still use {the_el} and {The_el} */
    if(typeof z!=="number"){ var cand=v.El||v.el||v.Name||v.name||v.cap; if(typeof cand==="string"&&cand.length<=20) z=zByName(cand); }
    if(typeof z!=="number"||!z) return v;
    var e=W.ELEMENTS[z-1]; if(!e) return v;
    var name=elWord(z), art=pack.art&&pack.art[z-1]?pack.art[z-1]:"";
    var the=art?art+(/['’]$/.test(art)?"":" ")+name:name;
    var o={}; for(var k in v) o[k]=v[k];
    if(!("el" in o)) o.el=name; if(!("El" in o)) o.El=cap(name);
    if(!("the_el" in o)) o.the_el=the; if(!("The_el" in o)) o.The_el=cap(the);
    if(!("sym" in o)) o.sym=e[1]; if(!("Z" in o)) o.Z=z;
    return o;
  }
  function tr(key){
    if(level==="simple"&&pack.s[key]) return pack.s[key];
    var t=pack.t[key]; if(t) return t;
    if(lang!=="en"&&!missing[key]) missing[key]=1;
    return key;
  }
  /* contractions a filled template can produce: "de {the_el}" is "de el hierro" until the
     language's own rule makes it "del hierro". Keyed by language; the article is lowercase,
     so a proper name ("El Salvador") is never touched. */
  var CONTRACT={
    es:[[/\bde el\b/g,"del"],[/\ba el\b/g,"al"]],
    pt:[[/\bde o\b/g,"do"],[/\bde a\b/g,"da"],[/\bde os\b/g,"dos"],[/\bde as\b/g,"das"],[/\bem o\b/g,"no"],[/\bem a\b/g,"na"],[/\bem os\b/g,"nos"],[/\bem as\b/g,"nas"],[/\ba o\b/g,"ao"],[/\ba os\b/g,"aos"]]
  };
  function contract(s){ var rules=CONTRACT[(pack.meta&&pack.meta.contract)||lang.split("-")[0]]; if(!rules) return s; for(var i=0;i<rules.length;i++) s=s.replace(rules[i][0], rules[i][1]); return s; }
  function T(key, vars){ var s=tr(key); return s.indexOf("{")>=0?contract(fill(s, elVars(vars||{}))):s; }
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
  function elNames(){ var o=[]; for(var z=1;z<=118;z++) o.push(elName(z)); return o; }

  /* ------------------------------------------------------------ static markup */
  function norm(s){ return String(s).replace(/\s+/g, " ").trim(); }
  function apply(root){
    root=root||D; if(!root) return;
    var els=root.querySelectorAll("[data-i]");
    for(var i=0;i<els.length;i++){
      var el=els[i], key=norm(el.innerHTML), t=tr(key);
      if(t!==key) el.innerHTML=t;
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
     which the browser runs before any script after it: every T() in the app,
     data tables included, sees the translation from the first line. */
  var loaded=false;
  function load(code, p){
    if(code!==lang) return;      /* a stale pack from an earlier choice */
    pack.meta=p.meta||LANGS[code]; pack.el=p.el||null; pack.art=p.art||null; PR=null; NF={};
    pack.t=p.t||{}; pack.s=p.s||{}; pack.g=p.g||{}; loaded=true;
  }
  var finished=false;
  var EN_NAMES=null;
  /* the table's own names take the pack's: every e[2] in the app then shows
     the language's name, and a search still finds the English one */
  function localizeElements(){
    if(!W.ELEMENTS||!pack.el||EN_NAMES) return;
    EN_NAMES=W.ELEMENTS.map(function(e){ return e[2]; });
    for(var z=1;z<=118;z++){ if(pack.el[z-1]) W.ELEMENTS[z-1][2]=cap(pack.el[z-1]); }
  }
  function zByName(s){
    s=String(s||"").trim().toLowerCase(); if(!s||!W.ELEMENTS) return 0;
    for(var z=1;z<=118;z++){ var e=W.ELEMENTS[z-1]; if(!e) continue;
      if(e[1].toLowerCase()===s||e[2].toLowerCase()===s||(EN_NAMES&&EN_NAMES[z-1].toLowerCase()===s)||(pack.el&&pack.el[z-1]&&pack.el[z-1].toLowerCase()===s)) return z; }
    return 0;
  }
  function finish(){ if(finished) return; finished=true;
    localizeElements();
    if(D){ try{ apply(D); }catch(e){} }
    /* a page with no script of its own (the teacher guide, the handout) still gets the language menu */
    if(D){ try{ var h=D.getElementById("langHost"); if(h&&!h.firstChild) mountMenu(h, "langPick"); }catch(e){} }
    if(lang!=="en"&&!loaded){ try{ console.warn("Atom: no language pack for "+lang+", showing English"); }catch(e){} }
    resolveReady(lang); }
  function mark(){
    if(!D) return; var h=D.documentElement, m=LANGS[lang];
    h.lang=lang; h.dir=m.dir; h.className=h.className.replace(/\s*\b(lang|script)-[a-z]+\b/g, "")+" lang-"+lang+" script-"+m.script;
    if(m.dir==="rtl") h.classList.add("rtl"); else h.classList.remove("rtl");
  }
  function start(){
    lang=pick(); level=stored("atom.level")==="simple"?"simple":"full"; bilingual=stored("atom.bilingual")==="1";
    mark();
    var needPack = lang!=="en" || level==="simple" || bilingual;
    if(needPack&&D&&D.readyState==="loading"){
      /* parser-inserted, so it runs before the next script tag; same origin, so the page's policy allows it */
      D.write('<script src="'+packUrl(lang, 0).replace(/"/g, "")+'"><\/script>');
    }
    if(D){ if(D.readyState==="loading") D.addEventListener("DOMContentLoaded", finish); else finish(); } else finish();
  }
  function setLang(code){
    if(!LANGS[code]) return; store("atom.lang", code);
    try{ var u=new URL(W.location.href); if(u.searchParams.has("lang")){ u.searchParams.delete("lang"); W.history.replaceState(null, "", u.pathname+(u.search||"")+u.hash); } }catch(e){}
    W.location.reload();
  }
  function setLevel(l){ level=l==="simple"?"simple":"full"; store("atom.level", level==="simple"?"simple":null); W.location.reload(); }
  function setBilingual(on){ bilingual=!!on; store("atom.bilingual", on?"1":null); W.location.reload(); }

  /* the language menu, the same wherever it sits: a two-letter badge with the
     real <select> laid over it, so the closed control stays narrow and the
     open list shows every language in its own name */
  function menuHTML(id){
    var h='<span class="lang-wrap" data-code="'+lang.toUpperCase()+'"><select id="'+id+'" class="lang-pick" aria-label="'+TT("Language")+'">';
    AVAILABLE.forEach(function(c){ h+='<option value="'+c+'"'+(c===lang?' selected':'')+' lang="'+c+'">'+LANGS[c].name+'</option>'; });
    return h+'</select></span>';
  }
  function mountMenu(host, id){ if(!host) return null; host.innerHTML=menuHTML(id||"langPick"); var sel=host.querySelector("select"); wireMenu(sel); return sel; }
  function wireMenu(sel){ if(!sel) return; sel.addEventListener("change", function(){ setLang(sel.value); }); }

  /* ------------------------------------------------------------ read aloud */
  var speaking=null;
  function speak(text, onend){
    if(!W.speechSynthesis||!text) return false;
    stopSpeaking();
    var u=new SpeechSynthesisUtterance(String(text).replace(/\s+/g, " ").trim()); u.lang=pack.meta.voice||LANGS[lang].voice||lang;
    try{ var vs=W.speechSynthesis.getVoices(), want=u.lang.toLowerCase().split("-")[0], v=null;
      for(var i=0;i<vs.length;i++){ var vl=(vs[i].lang||"").toLowerCase(); if(vl===u.lang.toLowerCase()){ v=vs[i]; break; } if(!v&&vl.split("-")[0]===want) v=vs[i]; }
      if(v) u.voice=v; }catch(e){}
    u.onend=function(){ speaking=null; if(onend) onend(); }; u.onerror=u.onend;
    speaking=u; W.speechSynthesis.speak(u); return true;
  }
  function stopSpeaking(){ if(W.speechSynthesis){ try{ W.speechSynthesis.cancel(); }catch(e){} } speaking=null; }
  function canSpeak(){ return !!(W.speechSynthesis&&W.SpeechSynthesisUtterance); }

  if(D) start(); else finish();
  return {LANGS:LANGS, AVAILABLE:AVAILABLE, ready:ready, T:T, TD:TD, N:N, cap:cap, reg:reg, dumpData:dumpData, elName:elName, elWord:elWord, elEnglish:elEnglish, elNames:elNames, zByName:zByName, localizeElements:localizeElements,
    apply:apply, load:load, setLang:setLang, setLevel:setLevel, setBilingual:setBilingual, menuHTML:menuHTML, mountMenu:mountMenu, wireMenu:wireMenu,
    speak:speak, stopSpeaking:stopSpeaking, canSpeak:canSpeak, norm:norm,
    get lang(){ return lang; }, get dir(){ return LANGS[lang].dir; }, get level(){ return level; }, get bilingual(){ return bilingual; },
    get glossary(){ return pack.g; }, get meta(){ return pack.meta; }, get missing(){ return Object.keys(missing); }, get isEnglish(){ return lang==="en"; }};
})();
var TT=AtomI18N.T;   /* TT, not T: the labs use T for the theme inside their drawing code */
/* ATOM-I18N END */
